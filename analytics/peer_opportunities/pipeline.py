from __future__ import annotations

import argparse
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Any

import duckdb

from .artifact import build_artifact, source_fingerprint, write_artifact
from .queries import (
    fetch_dataset_metadata,
    fetch_period_metrics,
    fetch_sample_rows,
    fetch_time_windows,
    load_normalized_sessions,
)



@dataclass(frozen=True, slots=True)
class PeriodWindow:
    from_date: str
    to_exclusive: str

    def __post_init__(self) -> None:
        start = date.fromisoformat(self.from_date)
        end = date.fromisoformat(self.to_exclusive)
        if start >= end:
            raise ValueError("period start must be before the exclusive end")

    @property
    def contract_period(self) -> dict[str, str]:
        inclusive_end = date.fromisoformat(self.to_exclusive) - timedelta(days=1)
        return {"from": self.from_date, "to": inclusive_end.isoformat()}


DEFAULT_CURRENT_PERIOD = PeriodWindow("2026-06-01", "2026-07-01")
DEFAULT_COMPARISON_PERIOD = PeriodWindow("2026-05-01", "2026-06-01")


def run_pipeline(
    source: Path,
    destination: Path,
    target_key: str = "M275",
    current_period: PeriodWindow = DEFAULT_CURRENT_PERIOD,
    comparison_period: PeriodWindow = DEFAULT_COMPARISON_PERIOD,
) -> dict[str, Any]:
    connection = duckdb.connect(":memory:")
    try:
        load_normalized_sessions(connection, source)
        current_metrics = fetch_period_metrics(
            connection,
            current_period.from_date,
            current_period.to_exclusive,
        )
        previous_metrics = fetch_period_metrics(
            connection,
            comparison_period.from_date,
            comparison_period.to_exclusive,
        )
        windows = fetch_time_windows(
            connection,
            target_key,
            current_period.from_date,
            current_period.to_exclusive,
        )
        artifact = build_artifact(
            target_key=target_key,
            current_metrics=current_metrics,
            previous_metrics=previous_metrics,
            time_windows=windows,
            dataset_metadata=fetch_dataset_metadata(connection),
            dataset_fingerprint=source_fingerprint(source),
            sample_rows=fetch_sample_rows(connection, target_key),
            current_period=current_period.contract_period,
            comparison_period=comparison_period.contract_period,
        )
        write_artifact(artifact, destination)
        return artifact
    finally:
        connection.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate Member D peer-opportunities artifact")
    parser.add_argument(
        "--source",
        type=Path,
        default=Path("data/fixtures/peer-opportunities-sessions.csv"),
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/analysis/peer-opportunities.json"),
    )
    parser.add_argument("--merchant", default="M275")
    parser.add_argument("--current-from", default=DEFAULT_CURRENT_PERIOD.from_date)
    parser.add_argument("--current-to-exclusive", default=DEFAULT_CURRENT_PERIOD.to_exclusive)
    parser.add_argument("--comparison-from", default=DEFAULT_COMPARISON_PERIOD.from_date)
    parser.add_argument(
        "--comparison-to-exclusive",
        default=DEFAULT_COMPARISON_PERIOD.to_exclusive,
    )
    args = parser.parse_args()
    run_pipeline(
        args.source,
        args.output,
        args.merchant,
        PeriodWindow(args.current_from, args.current_to_exclusive),
        PeriodWindow(args.comparison_from, args.comparison_to_exclusive),
    )
    print(args.output)


if __name__ == "__main__":
    main()

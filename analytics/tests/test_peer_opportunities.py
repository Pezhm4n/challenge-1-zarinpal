from __future__ import annotations

import csv
from copy import deepcopy
import json
from pathlib import Path

import duckdb
import pytest

from analytics.peer_opportunities.artifact import (
    build_peer_benchmarks,
    select_time_windows,
    validate_artifact,
)
from analytics.peer_opportunities.formulas import (
    MerchantMetrics,
    UndefinedMetricError,
    is_peer_sufficient,
    midrank_percentile,
    shapley_decomposition,
    window_lift_pct,
)
from analytics.peer_opportunities.generate_fixture import FIELDS, build_fixture
from analytics.peer_opportunities.pipeline import PeriodWindow, run_pipeline
from analytics.peer_opportunities.queries import (
    PeriodMetrics,
    TimeWindowAggregate,
    load_normalized_sessions,
)


def test_shapley_contributions_preserve_exact_volume_delta() -> None:
    previous = MerchantMetrics(sessions=120, verified_sessions=72, verified_volume_rial=72_000)
    current = MerchantMetrics(sessions=144, verified_sessions=72, verified_volume_rial=79_200)

    result = shapley_decomposition(previous, current)
    contributions = {item.driver: item.contribution_rial for item in result}

    assert sum(contributions.values()) == 7_200
    assert contributions["traffic"] > 0
    assert contributions["conversion"] < 0
    assert contributions["ticket"] > 0


@pytest.mark.parametrize(
    ("previous", "current", "expected_driver"),
    [
        (
            MerchantMetrics(100, 50, 50_000),
            MerchantMetrics(120, 60, 60_000),
            "traffic",
        ),
        (
            MerchantMetrics(100, 50, 50_000),
            MerchantMetrics(100, 60, 60_000),
            "conversion",
        ),
        (
            MerchantMetrics(100, 50, 50_000),
            MerchantMetrics(100, 50, 60_000),
            "ticket",
        ),
    ],
)
def test_single_driver_change_is_not_double_counted(
    previous: MerchantMetrics,
    current: MerchantMetrics,
    expected_driver: str,
) -> None:
    result = shapley_decomposition(previous, current)
    changed = {item.driver for item in result if item.contribution_rial != 0}
    assert changed == {expected_driver}


def test_zero_verified_orders_is_explicitly_undefined() -> None:
    with pytest.raises(UndefinedMetricError):
        shapley_decomposition(
            MerchantMetrics(100, 0, 0),
            MerchantMetrics(100, 50, 50_000),
        )
    assert window_lift_pct(20, 0) is None


def test_midrank_percentile_is_deterministic_with_ties_and_outlier() -> None:
    assert midrank_percentile(50, [30, 40, 50, 50, 10_000]) == 60.0


def test_peer_guards_have_exact_boundaries() -> None:
    assert not is_peer_sufficient(target_sessions=99, peer_count=10)
    assert not is_peer_sufficient(target_sessions=100, peer_count=9)
    assert is_peer_sufficient(target_sessions=100, peer_count=10)


def test_peer_group_excludes_target_and_other_categories() -> None:
    target = PeriodMetrics("M275", "SHOES", "کیف و کفش", 100, 50, 50_000)
    peers = (
        target,
        *(
            PeriodMetrics(f"P{index}", "SHOES", "کیف و کفش", 100, 50, 50_000)
            for index in range(10)
        ),
        PeriodMetrics("OTHER", "EDU", "آموزش", 100, 90, 90_000),
    )
    benchmarks = build_peer_benchmarks(target, peers)
    assert all(item["peerCount"] == 10 for item in benchmarks)
    assert all(item["sufficient"] for item in benchmarks)


def test_time_window_threshold_excludes_24_and_keeps_25() -> None:
    windows = (
        TimeWindowAggregate(1, 10, 24, 20, 20_000),
        TimeWindowAggregate(2, 11, 25, 20, 20_000),
    )
    selected = select_time_windows(windows, baseline_rate_pct=50)
    assert [(item["weekday"], item["hour"]) for item in selected] == [(2, 11)]


def test_member_d_loader_rejects_attempt_grain_duplicates(tmp_path: Path) -> None:
    source = tmp_path / "duplicate-sessions.csv"
    with source.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        base = {
            "session_key": "S-1",
            "merchant_key": "M275",
            "category_id": "C-SHOES",
            "category_title": "کیف و کفش",
            "amount_rial": 1_000,
            "created_at": "2026-06-01T10:00:00",
            "eventual_verified": "true",
        }
        writer.writerow(base)
        writer.writerow({**base, "created_at": "2026-06-01T10:01:00"})

    connection = duckdb.connect(":memory:")
    try:
        with pytest.raises(ValueError, match="duplicate session_key"):
            load_normalized_sessions(connection, source)
    finally:
        connection.close()


def test_period_window_is_parameterized_and_uses_inclusive_contract_end() -> None:
    window = PeriodWindow("2026-04-01", "2026-05-01")
    assert window.contract_period == {"from": "2026-04-01", "to": "2026-04-30"}
    with pytest.raises(ValueError, match="period start"):
        PeriodWindow("2026-05-01", "2026-05-01")


def test_fixture_pipeline_builds_contract_safe_artifact(tmp_path: Path) -> None:
    source = build_fixture(tmp_path / "peer-opportunities-sessions.csv")
    output = tmp_path / "peer-opportunities.json"

    artifact = run_pipeline(source, output)
    validate_artifact(artifact)
    persisted = json.loads(output.read_text(encoding="utf-8"))
    payload = persisted["merchants"]["M275"]

    assert persisted["dataset"]["rowCount"] == 1_464
    assert sum(item["contributionRial"] for item in payload["decomposition"]) == 7_200
    assert all(item["peerCount"] == 12 for item in payload["peerBenchmarks"])
    assert all(item["sufficient"] for item in payload["peerBenchmarks"])
    assert all(item["sessions"] >= 25 for item in payload["timeWindows"])
    assert len({row["sessionKey"] for row in payload["evidence"][0]["sampleRows"]}) == 4
    assert "adjusted_fee" not in output.read_text(encoding="utf-8")

    non_finite = deepcopy(persisted)
    non_finite["merchants"]["M275"]["decomposition"][0]["current"] = float("inf")
    with pytest.raises(ValueError, match="non-finite"):
        validate_artifact(non_finite)

    dangling_evidence = deepcopy(persisted)
    dangling_evidence["merchants"]["M275"]["insights"][0]["evidenceId"] = "missing"
    with pytest.raises(ValueError, match="existing evidence"):
        validate_artifact(dangling_evidence)

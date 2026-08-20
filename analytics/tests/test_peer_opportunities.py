from __future__ import annotations

import csv
from copy import deepcopy
from datetime import datetime
import json
from pathlib import Path

import duckdb
import pytest

from analytics.peer_opportunities.artifact import (
    build_artifact,
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
    assert PeriodMetrics("M0", "C1", "آزمایشی", 100, 0, 0).average_ticket_rial is None


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
    assert select_time_windows(windows, baseline_rate_pct=0) == []


def test_zero_denominator_omits_invalid_metrics_and_keeps_evidence() -> None:
    target = PeriodMetrics("M275", "SHOES", "کیف و کفش", 100, 0, 0)
    peers = tuple(
        PeriodMetrics(f"P{index}", "SHOES", "کیف و کفش", 100, 50, 50_000)
        for index in range(10)
    )
    artifact = build_artifact(
        target_key="M275",
        current_metrics=(target, *peers),
        previous_metrics=(
            PeriodMetrics("M275", "SHOES", "کیف و کفش", 100, 50, 50_000),
        ),
        time_windows=(TimeWindowAggregate(1, 10, 25, 0, 0),),
        dataset_metadata={
            "rowCount": 1,
            "sessionCount": 1,
            "minCreatedAt": "2026-05-01T00:00:00",
            "maxCreatedAt": "2026-06-30T23:59:59",
        },
        dataset_fingerprint="test-fingerprint",
        sample_rows=[],
        current_period={"from": "2026-06-01", "to": "2026-06-30"},
        comparison_period={"from": "2026-05-01", "to": "2026-05-31"},
        development_fixture=False,
    )
    validate_artifact(artifact)
    payload = artifact["merchants"]["M275"]
    growth = next(item for item in payload["insights"] if item["feature"] == "growth")
    timing = next(item for item in payload["insights"] if item["feature"] == "timing")
    quality_codes = {
        note["code"]
        for record in payload["evidence"]
        for note in record["dataQuality"]
    }

    assert payload["decomposition"] == []
    assert all(item["metric"] != "averageVerifiedTicketRial" for item in payload["peerBenchmarks"])
    assert payload["timeWindows"] == []
    assert growth["status"] == "insufficient-data" and growth["impact"] is None
    assert timing["status"] == "insufficient-data" and timing["impact"] is None
    assert timing["evidenceId"] == "timing-window-m275"
    assert "timing-window-m275" in {record["id"] for record in payload["evidence"]}
    assert "ZERO_DENOMINATOR_DECOMPOSITION" in quality_codes
    assert "ZERO_BASELINE_RATE" in quality_codes
    assert "FULL_CHALLENGE_DATASET" in quality_codes


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


def test_member_d_loader_uses_common_retry_normalization() -> None:
    source = Path("data/fixtures/session-normalization.csv")
    connection = duckdb.connect(":memory:")
    try:
        load_normalized_sessions(connection, source)
        row_count, distinct_sessions = connection.execute(
            "SELECT count(*), count(DISTINCT session_key) FROM normalized_sessions"
        ).fetchone()
        recovered = connection.execute(
            """
            SELECT eventual_verified
            FROM normalized_sessions
            WHERE session_key = 'S2'
            """
        ).fetchone()
    finally:
        connection.close()

    assert row_count == distinct_sessions == 4
    assert recovered == (True,)


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
    timing_insight = next(item for item in payload["insights"] if item["feature"] == "timing")
    strongest_window = max(
        payload["timeWindows"],
        key=lambda window: window["liftVsBaselinePct"],
    )
    assert timing_insight["evidenceId"] == (
        f"timing-window-{strongest_window['weekday']}-{strongest_window['hour']}-m275"
    )
    assert "timing-window-m275" not in {record["id"] for record in payload["evidence"]}
    assert len({row["sessionKey"] for row in payload["evidence"][0]["sampleRows"]}) == 4
    assert all(record.get("numerator") for record in payload["evidence"])
    assert all(record.get("denominator") for record in payload["evidence"])
    assert "adjusted_fee" not in output.read_text(encoding="utf-8")

    non_finite = deepcopy(persisted)
    non_finite["merchants"]["M275"]["decomposition"][0]["current"] = float("inf")
    with pytest.raises(ValueError, match="non-finite"):
        validate_artifact(non_finite)

    dangling_evidence = deepcopy(persisted)
    dangling_evidence["merchants"]["M275"]["insights"][0]["evidenceId"] = "missing"
    with pytest.raises(ValueError, match="existing evidence"):
        validate_artifact(dangling_evidence)


def test_deployable_artifact_uses_full_june_data() -> None:
    artifact = json.loads(
        Path("public/analysis/peer-opportunities.json").read_text(encoding="utf-8")
    )
    validate_artifact(artifact)
    payload = artifact["merchants"]["M275"]
    benchmarks = {item["metric"]: item for item in payload["peerBenchmarks"]}
    quality_codes = {
        note["code"]
        for record in payload["evidence"]
        for note in record["dataQuality"]
    }

    assert artifact["dataset"]["sessionCount"] == 2_062_839
    assert payload["selection"]["period"] == {
        "from": "2026-06-01",
        "to": "2026-06-30",
    }
    assert payload["decomposition"][0]["previous"] == 2_730
    assert payload["decomposition"][0]["current"] == 3_183
    assert benchmarks["verificationRate"]["merchantValue"] == 36.76
    assert benchmarks["verificationRate"]["percentile"] == 13.3
    assert benchmarks["verifiedVolumeRial"]["percentile"] == 83.3
    assert benchmarks["averageVerifiedTicketRial"]["percentile"] == 6.9
    assert benchmarks["averageVerifiedTicketRial"]["peerCount"] == 29
    assert "FULL_CHALLENGE_DATASET" in quality_codes
    assert "DEVELOPMENT_FIXTURE" not in quality_codes
    timing_insight = next(item for item in payload["insights"] if item["feature"] == "timing")
    strongest_window = max(
        payload["timeWindows"],
        key=lambda window: window["liftVsBaselinePct"],
    )
    assert timing_insight["evidenceId"] == (
        f"timing-window-{strongest_window['weekday']}-{strongest_window['hour']}-m275"
    )
    assert "timing-window-m275" not in {record["id"] for record in payload["evidence"]}
    evidence_scopes = {
        item["value"]
        for record in payload["evidence"]
        for item in record["filters"]
        if item["field"] == "evidence_scope"
    }
    expected_scopes = {
        *(f"growth:{item['driver']}" for item in payload["decomposition"]),
        *(f"peer:{item['metric']}" for item in payload["peerBenchmarks"]),
        *(
            f"timing:{item['weekday']}:{item['hour']}"
            for item in payload["timeWindows"]
        ),
    }
    assert evidence_scopes == expected_scopes
    latin_digits = str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")
    for record in payload["evidence"]:
        timing_scope = next(
            (
                item["value"]
                for item in record["filters"]
                if item["field"] == "evidence_scope"
                and str(item["value"]).startswith("timing:")
            ),
            None,
        )
        if timing_scope is None:
            continue
        _, weekday, hour = str(timing_scope).split(":")
        for row in record["sampleRows"]:
            date_text, time_text = row["createdAt"].translate(latin_digits).split("، ")
            created_at = datetime.fromisoformat(
                f"{date_text.replace('/', '-')}T{time_text}"
            )
            assert created_at.isoweekday() == int(weekday)
            assert created_at.hour == int(hour)
    assert all(
        row["createdAt"].startswith("۲۰۲۶/۰۶/")
        and "T" not in row["createdAt"]
        and row["sessionKey"].translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")).isdigit()
        for record in payload["evidence"]
        for row in record["sampleRows"]
    )

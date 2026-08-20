from __future__ import annotations

from pathlib import Path

import pytest

from analytics.common import CsvDatasetLoader, normalize_attempts_to_sessions
from analytics.conversion_recovery.formulas import (
    AmountBandThresholds,
    assess_psp_sample,
    classify_amount_band,
    compute_no_attempt_recovery,
    compute_retry_recovery_rate,
    safe_percentage,
)


ROOT = Path(__file__).resolve().parents[2]
FIXTURE_PATH = ROOT / "data" / "fixtures" / "conversion-recovery-attempts.csv"
QUERY_PATH = ROOT / "analytics" / "conversion_recovery" / "queries.sql"


def _connection_with_recovery_sessions() -> CsvDatasetLoader:
    loader = CsvDatasetLoader(FIXTURE_PATH)
    loader.register_attempts()
    normalize_attempts_to_sessions(loader.connection)
    loader.connection.execute(QUERY_PATH.read_text(encoding="utf-8"))
    return loader


def test_feature_view_preserves_session_grain_and_stage_semantics() -> None:
    loader = _connection_with_recovery_sessions()
    try:
        rows = loader.connection.execute(
            """
            SELECT
                session_key,
                amount_rial,
                no_attempt,
                entered_bank,
                eventual_verified,
                first_try_non_verified,
                recovered_after_retry
            FROM conversion_recovery_sessions
            WHERE merchant_key = 'MTEST'
            ORDER BY session_key
            """
        ).fetchall()
    finally:
        loader.close()

    assert rows == [
        ("R1", 1_000, True, False, False, False, False),
        ("R2", 2_000, False, True, True, False, False),
        ("R3", 3_000, False, False, False, True, False),
        ("R4", 4_000, False, True, True, True, True),
        ("R5", 5_000, False, True, False, True, False),
        ("R6", 6_000, False, True, False, True, False),
    ]


def test_funnel_counts_amounts_and_rates_are_hand_computable() -> None:
    loader = _connection_with_recovery_sessions()
    try:
        row = loader.connection.execute(
            """
            SELECT
                count(*) AS sessions,
                sum(amount_rial) AS session_amount,
                count(*) FILTER (WHERE NOT no_attempt) AS attempted,
                sum(amount_rial) FILTER (WHERE NOT no_attempt) AS attempted_amount,
                count(*) FILTER (WHERE entered_bank) AS in_bank,
                sum(amount_rial) FILTER (WHERE entered_bank) AS in_bank_amount,
                count(*) FILTER (WHERE eventual_verified) AS verified,
                sum(amount_rial) FILTER (WHERE eventual_verified) AS verified_amount
            FROM conversion_recovery_sessions
            WHERE merchant_key = 'MTEST'
            """
        ).fetchone()
    finally:
        loader.close()

    assert row == (6, 21_000, 5, 20_000, 4, 17_000, 2, 6_000)
    assert safe_percentage(5, 6).value == 83.3333
    assert safe_percentage(4, 5).value == 80.0
    assert safe_percentage(2, 4).value == 50.0


def test_no_attempt_share_and_requested_amount_use_session_grain() -> None:
    loader = _connection_with_recovery_sessions()
    try:
        row = loader.connection.execute(
            """
            SELECT
                count(*) FILTER (WHERE no_attempt),
                count(*),
                sum(amount_rial) FILTER (WHERE no_attempt)
            FROM conversion_recovery_sessions
            WHERE merchant_key = 'MTEST'
            """
        ).fetchone()
    finally:
        loader.close()

    assert row == (1, 6, 1_000)
    assert safe_percentage(row[0], row[1]).value == 16.6667


def test_retry_formula_uses_all_attempted_first_try_non_verified_sessions() -> None:
    loader = _connection_with_recovery_sessions()
    try:
        row = loader.connection.execute(
            """
            SELECT
                count(*) FILTER (WHERE first_try_non_verified),
                count(*) FILTER (
                    WHERE first_try_non_verified AND recovered_after_retry
                )
            FROM conversion_recovery_sessions
            WHERE merchant_key = 'MTEST'
            """
        ).fetchone()
    finally:
        loader.close()

    assert row == (4, 1)
    result = compute_retry_recovery_rate(
        first_try_non_verified_sessions=row[0],
        recovered_sessions=row[1],
    )
    assert result.value == 25.0
    assert result.data_quality_code is None


def test_retry_zero_denominator_is_null_with_quality_code() -> None:
    result = compute_retry_recovery_rate(
        first_try_non_verified_sessions=0,
        recovered_sessions=0,
    )

    assert result.value is None
    assert result.data_quality_code == "ZERO_DENOMINATOR"


def test_paid_reaches_in_bank_but_is_not_verified_revenue() -> None:
    loader = _connection_with_recovery_sessions()
    try:
        row = loader.connection.execute(
            """
            SELECT entered_bank, eventual_verified, eventual_status
            FROM conversion_recovery_sessions
            WHERE session_key = 'R6'
            """
        ).fetchone()
    finally:
        loader.close()

    assert row == (True, False, "Paid")


def test_m275_scenario_matches_full_dataset_arithmetic() -> None:
    result = compute_no_attempt_recovery(
        current_sessions=3_183,
        current_no_attempt_sessions=1_257,
        current_attempted_sessions=1_926,
        current_verified_sessions=1_170,
        current_verified_volume_rial=10_421_270_000,
        comparison_sessions=2_730,
        comparison_no_attempt_sessions=300,
    )

    assert result.baseline_no_attempt_share_pct == 10.989
    assert result.attempted_conversion_pct == 60.7477
    assert result.estimated_orders == 551
    assert result.estimated_volume_rial == 4_908_817_383
    assert result.data_quality_code is None


def test_scenario_zero_denominator_has_no_numeric_recommendation() -> None:
    result = compute_no_attempt_recovery(
        current_sessions=0,
        current_no_attempt_sessions=0,
        current_attempted_sessions=0,
        current_verified_sessions=0,
        current_verified_volume_rial=0,
        comparison_sessions=0,
        comparison_no_attempt_sessions=0,
    )

    assert result.estimated_orders is None
    assert result.estimated_volume_rial is None
    assert result.data_quality_code == "ZERO_DENOMINATOR"


@pytest.mark.parametrize(
    ("overall_sessions", "cell_sessions", "eligible", "expected_codes"),
    [
        (100, 25, True, ()),
        (99, 25, False, ("PSP_BELOW_MIN_SAMPLE",)),
        (100, 24, False, ("PSP_AMOUNT_BAND_BELOW_MIN_SAMPLE",)),
        (
            99,
            24,
            False,
            ("PSP_BELOW_MIN_SAMPLE", "PSP_AMOUNT_BAND_BELOW_MIN_SAMPLE"),
        ),
    ],
)
def test_psp_sample_thresholds(
    overall_sessions: int,
    cell_sessions: int,
    eligible: bool,
    expected_codes: tuple[str, ...],
) -> None:
    assessment = assess_psp_sample(
        overall_sessions=overall_sessions,
        amount_band_sessions=cell_sessions,
    )

    assert assessment.eligible is eligible
    assert assessment.data_quality_codes == expected_codes


@pytest.mark.parametrize(
    ("amount_rial", "expected"),
    [
        (0, "low"),
        (100, "low"),
        (101, "lower-middle"),
        (200, "lower-middle"),
        (201, "upper-middle"),
        (300, "upper-middle"),
        (301, "high"),
    ],
)
def test_amount_band_boundaries_are_stable(
    amount_rial: int,
    expected: str,
) -> None:
    thresholds = AmountBandThresholds(q1=100, q2=200, q3=300)

    assert classify_amount_band(amount_rial, thresholds) == expected


def test_invalid_subset_counts_are_rejected() -> None:
    with pytest.raises(ValueError, match="subset"):
        compute_retry_recovery_rate(
            first_try_non_verified_sessions=1,
            recovered_sessions=2,
        )

    with pytest.raises(ValueError, match="subset"):
        safe_percentage(2, 1)

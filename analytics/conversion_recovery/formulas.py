from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Literal


ZERO_DENOMINATOR = "ZERO_DENOMINATOR"
PSP_BELOW_MIN_SAMPLE = "PSP_BELOW_MIN_SAMPLE"
PSP_AMOUNT_BAND_BELOW_MIN_SAMPLE = "PSP_AMOUNT_BAND_BELOW_MIN_SAMPLE"
MIN_PSP_SESSIONS = 100
MIN_PSP_AMOUNT_BAND_SESSIONS = 25

AmountBand = Literal["low", "lower-middle", "upper-middle", "high"]


@dataclass(frozen=True)
class RateResult:
    value: float | None
    data_quality_code: str | None


@dataclass(frozen=True)
class RecoveryScenarioResult:
    baseline_no_attempt_share_pct: float | None
    attempted_conversion_pct: float | None
    estimated_orders: int | None
    estimated_volume_rial: int | None
    data_quality_code: str | None


@dataclass(frozen=True)
class PspSampleAssessment:
    eligible: bool
    data_quality_codes: tuple[str, ...]


@dataclass(frozen=True)
class AmountBandThresholds:
    q1: int
    q2: int
    q3: int

    def __post_init__(self) -> None:
        for name, value in (("q1", self.q1), ("q2", self.q2), ("q3", self.q3)):
            _require_non_negative_integer(name, value)
        if not self.q1 <= self.q2 <= self.q3:
            raise ValueError("Amount band thresholds must be ordered")


def _require_non_negative_integer(name: str, value: int) -> None:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"{name} must be a non-negative integer")


def _round_decimal(value: Decimal, precision: int) -> float:
    quantizer = Decimal(1).scaleb(-precision)
    return float(value.quantize(quantizer, rounding=ROUND_HALF_UP))


def safe_percentage(
    numerator: int,
    denominator: int,
    *,
    precision: int = 4,
) -> RateResult:
    _require_non_negative_integer("numerator", numerator)
    _require_non_negative_integer("denominator", denominator)
    _require_non_negative_integer("precision", precision)
    if numerator > denominator:
        raise ValueError("numerator must be a subset of denominator")
    if denominator == 0:
        return RateResult(value=None, data_quality_code=ZERO_DENOMINATOR)

    percentage = Decimal(numerator) * Decimal(100) / Decimal(denominator)
    return RateResult(
        value=_round_decimal(percentage, precision),
        data_quality_code=None,
    )


def compute_retry_recovery_rate(
    *,
    first_try_non_verified_sessions: int,
    recovered_sessions: int,
) -> RateResult:
    return safe_percentage(
        recovered_sessions,
        first_try_non_verified_sessions,
    )


def assess_psp_sample(
    *,
    overall_sessions: int,
    amount_band_sessions: int,
) -> PspSampleAssessment:
    _require_non_negative_integer("overall_sessions", overall_sessions)
    _require_non_negative_integer("amount_band_sessions", amount_band_sessions)
    if amount_band_sessions > overall_sessions:
        raise ValueError("amount-band sessions must be a subset of PSP sessions")

    codes: list[str] = []
    if overall_sessions < MIN_PSP_SESSIONS:
        codes.append(PSP_BELOW_MIN_SAMPLE)
    if amount_band_sessions < MIN_PSP_AMOUNT_BAND_SESSIONS:
        codes.append(PSP_AMOUNT_BAND_BELOW_MIN_SAMPLE)
    return PspSampleAssessment(
        eligible=not codes,
        data_quality_codes=tuple(codes),
    )


def classify_amount_band(
    amount_rial: int,
    thresholds: AmountBandThresholds,
) -> AmountBand:
    _require_non_negative_integer("amount_rial", amount_rial)
    if amount_rial <= thresholds.q1:
        return "low"
    if amount_rial <= thresholds.q2:
        return "lower-middle"
    if amount_rial <= thresholds.q3:
        return "upper-middle"
    return "high"


def compute_no_attempt_recovery(
    *,
    current_sessions: int,
    current_no_attempt_sessions: int,
    current_attempted_sessions: int,
    current_verified_sessions: int,
    current_verified_volume_rial: int,
    comparison_sessions: int,
    comparison_no_attempt_sessions: int,
) -> RecoveryScenarioResult:
    values = {
        "current_sessions": current_sessions,
        "current_no_attempt_sessions": current_no_attempt_sessions,
        "current_attempted_sessions": current_attempted_sessions,
        "current_verified_sessions": current_verified_sessions,
        "current_verified_volume_rial": current_verified_volume_rial,
        "comparison_sessions": comparison_sessions,
        "comparison_no_attempt_sessions": comparison_no_attempt_sessions,
    }
    for name, value in values.items():
        _require_non_negative_integer(name, value)

    if current_no_attempt_sessions > current_sessions:
        raise ValueError("current NoAttempt sessions must be a subset of sessions")
    if current_attempted_sessions > current_sessions:
        raise ValueError("current attempted sessions must be a subset of sessions")
    if current_verified_sessions > current_attempted_sessions:
        raise ValueError("current verified sessions must be a subset of attempted sessions")
    if comparison_no_attempt_sessions > comparison_sessions:
        raise ValueError("comparison NoAttempt sessions must be a subset of sessions")
    if current_no_attempt_sessions + current_attempted_sessions != current_sessions:
        raise ValueError("current sessions must partition into NoAttempt and attempted")

    if (
        current_sessions == 0
        or comparison_sessions == 0
        or current_attempted_sessions == 0
        or current_verified_sessions == 0
    ):
        return RecoveryScenarioResult(
            baseline_no_attempt_share_pct=None,
            attempted_conversion_pct=None,
            estimated_orders=None,
            estimated_volume_rial=None,
            data_quality_code=ZERO_DENOMINATOR,
        )

    baseline_share = Decimal(comparison_no_attempt_sessions) / Decimal(
        comparison_sessions
    )
    attempted_conversion = Decimal(current_verified_sessions) / Decimal(
        current_attempted_sessions
    )
    average_verified_ticket = Decimal(current_verified_volume_rial) / Decimal(
        current_verified_sessions
    )
    excess_no_attempt_sessions = max(
        Decimal(0),
        Decimal(current_no_attempt_sessions)
        - Decimal(current_sessions) * baseline_share,
    )
    estimated_orders_exact = excess_no_attempt_sessions * attempted_conversion
    estimated_volume_exact = estimated_orders_exact * average_verified_ticket

    return RecoveryScenarioResult(
        baseline_no_attempt_share_pct=_round_decimal(
            baseline_share * Decimal(100),
            4,
        ),
        attempted_conversion_pct=_round_decimal(
            attempted_conversion * Decimal(100),
            4,
        ),
        estimated_orders=int(
            estimated_orders_exact.to_integral_value(rounding=ROUND_HALF_UP)
        ),
        estimated_volume_rial=int(
            estimated_volume_exact.to_integral_value(rounding=ROUND_HALF_UP)
        ),
        data_quality_code=None,
    )

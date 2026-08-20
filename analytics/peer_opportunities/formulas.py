from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from itertools import permutations
from statistics import median
from typing import Iterable, Literal, Sequence


Driver = Literal["traffic", "conversion", "ticket"]
DRIVER_ORDER: tuple[Driver, ...] = ("traffic", "conversion", "ticket")


class UndefinedMetricError(ValueError):
    """Raised when a denominator makes a scoring metric undefined."""


@dataclass(frozen=True, slots=True)
class MerchantMetrics:
    sessions: int
    verified_sessions: int
    verified_volume_rial: int

    @property
    def verification_rate(self) -> Decimal:
        if self.sessions <= 0:
            raise UndefinedMetricError("verification rate requires sessions > 0")
        return Decimal(self.verified_sessions) / Decimal(self.sessions)

    @property
    def average_verified_ticket_rial(self) -> Decimal:
        if self.verified_sessions <= 0:
            raise UndefinedMetricError("average ticket requires verified sessions > 0")
        return Decimal(self.verified_volume_rial) / Decimal(self.verified_sessions)


@dataclass(frozen=True, slots=True)
class DecompositionResult:
    driver: Driver
    current: float
    previous: float
    change_pct: float | None
    contribution_rial: int


def _factor_values(metrics: MerchantMetrics) -> dict[Driver, Decimal]:
    return {
        "traffic": Decimal(metrics.sessions),
        "conversion": metrics.verification_rate,
        "ticket": metrics.average_verified_ticket_rial,
    }


def _change_pct(previous: Decimal, current: Decimal) -> float | None:
    if previous == 0:
        return None
    return float(((current - previous) / previous * Decimal(100)).quantize(Decimal("0.0001")))


def shapley_decomposition(
    previous: MerchantMetrics,
    current: MerchantMetrics,
) -> tuple[DecompositionResult, ...]:
    """Decompose an exact volume delta without double-counting interactions."""

    previous_factors = _factor_values(previous)
    current_factors = _factor_values(current)
    contribution = {driver: Decimal(0) for driver in DRIVER_ORDER}
    all_orders = tuple(permutations(DRIVER_ORDER))

    for order in all_orders:
        state = previous_factors.copy()
        before = state["traffic"] * state["conversion"] * state["ticket"]
        for driver in order:
            state[driver] = current_factors[driver]
            after = state["traffic"] * state["conversion"] * state["ticket"]
            contribution[driver] += after - before
            before = after

    divisor = Decimal(len(all_orders))
    unrounded = {driver: contribution[driver] / divisor for driver in DRIVER_ORDER}
    rounded = {
        driver: int(unrounded[driver].to_integral_value(rounding=ROUND_HALF_UP))
        for driver in DRIVER_ORDER
    }

    exact_delta = current.verified_volume_rial - previous.verified_volume_rial
    residual = exact_delta - sum(rounded.values())
    if residual:
        priority = min(
            DRIVER_ORDER,
            key=lambda driver: (
                -abs(unrounded[driver] - Decimal(rounded[driver])),
                DRIVER_ORDER.index(driver),
            ),
        )
        rounded[priority] += residual

    results: list[DecompositionResult] = []
    for driver in DRIVER_ORDER:
        previous_value = previous_factors[driver]
        current_value = current_factors[driver]
        display_multiplier = Decimal(100) if driver == "conversion" else Decimal(1)
        results.append(
            DecompositionResult(
                driver=driver,
                current=float(current_value * display_multiplier),
                previous=float(previous_value * display_multiplier),
                change_pct=_change_pct(previous_value, current_value),
                contribution_rial=rounded[driver],
            )
        )

    if sum(result.contribution_rial for result in results) != exact_delta:
        raise AssertionError("decomposition contributions must equal the exact volume delta")
    return tuple(results)


def midrank_percentile(target: float, peer_values: Sequence[float]) -> float:
    if not peer_values:
        raise UndefinedMetricError("percentile requires at least one peer")
    below = sum(value < target for value in peer_values)
    equal = sum(value == target for value in peer_values)
    return round(100 * (below + 0.5 * equal) / len(peer_values), 1)


def robust_median(values: Iterable[float]) -> float:
    prepared = tuple(values)
    if not prepared:
        raise UndefinedMetricError("median requires at least one peer")
    return float(median(prepared))


def window_lift_pct(segment_rate: float, baseline_rate: float) -> float | None:
    if baseline_rate == 0:
        return None
    return round((segment_rate - baseline_rate) / baseline_rate * 100, 2)


def is_peer_sufficient(target_sessions: int, peer_count: int) -> bool:
    return target_sessions >= 100 and peer_count >= 10


def is_time_window_eligible(session_count: int) -> bool:
    return session_count >= 25


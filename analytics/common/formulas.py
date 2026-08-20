from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FormulaDefinition:
    formula_id: str
    grain: str
    definition: str


FORMULA_REGISTRY: dict[str, FormulaDefinition] = {
    "session.verify_rate.v1": FormulaDefinition(
        formula_id="session.verify_rate.v1",
        grain="session",
        definition="verified sessions / all sessions",
    ),
    "funnel.no_attempt_share.v1": FormulaDefinition(
        formula_id="funnel.no_attempt_share.v1",
        grain="session",
        definition="max try_seq = 0 / all sessions",
    ),
    "funnel.retry_recovery.v1": FormulaDefinition(
        formula_id="funnel.retry_recovery.v1",
        grain="session",
        definition=(
            "first try non-verified and eventual verified / first try non-verified"
        ),
    ),
    "growth.revenue_decomposition.v1": FormulaDefinition(
        formula_id="growth.revenue_decomposition.v1",
        grain="merchant-period",
        definition=(
            "volume delta decomposed by traffic, conversion and average ticket "
            "using ordered/Shapley-safe method documented in Evidence"
        ),
    ),
    "scenario.no_attempt_recovery.v1": FormulaDefinition(
        formula_id="scenario.no_attempt_recovery.v1",
        grain="merchant-period",
        definition=(
            "excess NoAttempt sessions × attempted conversion × average ticket"
        ),
    ),
    "customer.repeat_pair_rate.v1": FormulaDefinition(
        formula_id="customer.repeat_pair_rate.v1",
        grain="merchant-card",
        definition="card pairs with >=2 verified sessions / card pairs",
    ),
    "customer.returning_share.v1": FormulaDefinition(
        formula_id="customer.returning_share.v1",
        grain="merchant-period",
        definition="active cards first seen before period / active cards",
    ),
    "peer.robust_percentile.v1": FormulaDefinition(
        formula_id="peer.robust_percentile.v1",
        grain="peer-group",
        definition=(
            "percentile among same category after eligibility and sample controls"
        ),
    ),
    "time.window_lift.v1": FormulaDefinition(
        formula_id="time.window_lift.v1",
        grain="merchant-period",
        definition=(
            "segment rate or volume vs merchant-period baseline with minimum sample"
        ),
    ),
}


def get_formula_definition(formula_id: str) -> FormulaDefinition:
    try:
        return FORMULA_REGISTRY[formula_id]
    except KeyError as error:
        raise KeyError(f"Unknown formula ID: {formula_id}") from error

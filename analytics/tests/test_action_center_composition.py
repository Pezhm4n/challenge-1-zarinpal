from __future__ import annotations

from copy import deepcopy

import pytest

from analytics.action_center import (
    ActionCenterCompositionError,
    compose_action_center_artifact,
)
from analytics.common import serialize_artifact


FINGERPRINT = "fixture-fingerprint"
SELECTION = {
    "merchantKey": "M275",
    "period": {"from": "2026-06-01", "to": "2026-06-30"},
    "comparison": {"from": "2026-05-01", "to": "2026-05-31"},
}


def metric(value: int, unit: str = "count", kind: str = "actual") -> dict[str, object]:
    return {
        "value": value,
        "unit": unit,
        "labelFa": "مقدار تست",
        "kind": kind,
        "displayPrecision": 0,
    }


def evidence(
    evidence_id: str,
    value: int = 1,
    unit: str = "count",
) -> dict[str, object]:
    return {
        "id": evidence_id,
        "formulaId": "session.verify_rate.v1",
        "titleFa": "مدرک تست",
        "explanationFa": "توضیح قابل ردیابی تست",
        "grain": "session",
        "sourceColumns": ["session_key"],
        "filters": [{"field": "merchant_key", "operator": "=", "value": "M275"}],
        "period": SELECTION["period"],
        "comparisonPeriod": SELECTION["comparison"],
        "numerator": {"labelFa": "صورت", "value": value},
        "denominator": {"labelFa": "مخرج", "value": 100},
        "formulaFa": "صورت تقسیم بر مخرج",
        "result": metric(value, unit),
        "controls": ["Session grain"],
        "assumptions": [],
        "limitations": [],
        "dataQuality": [],
        "sampleRows": [],
        "datasetFingerprint": FINGERPRINT,
    }


def insight(
    insight_id: str,
    evidence_id: str,
    *,
    value: int,
    unit: str,
    confidence: str,
) -> dict[str, object]:
    return {
        "id": insight_id,
        "feature": "recovery",
        "priority": 1,
        "status": "opportunity",
        "titleFa": "Insight تست",
        "findingFa": "یافته تست",
        "actionFa": "اقدام تست",
        "impact": metric(value, unit),
        "confidence": confidence,
        "confidenceReasonFa": "دلیل اطمینان تست",
        "evidenceId": evidence_id,
        "destination": "/recovery",
    }


def base_artifact() -> dict[str, object]:
    return {
        "schemaVersion": "1.0",
        "generatedAt": "2026-07-01T00:00:00Z",
        "dataset": {
            "fingerprint": FINGERPRINT,
            "rowCount": 10,
            "sessionCount": 8,
            "minCreatedAt": "2026-01-01T00:00:00Z",
            "maxCreatedAt": "2026-06-30T23:59:59Z",
        },
        "feature": "action-center",
        "merchants": {
            "M275": {
                "merchant": {
                    "merchantKey": "M275",
                    "categoryId": "56610001",
                    "categoryTitleFa": "کیف و کفش فروشی",
                    "availablePeriods": [
                        {
                            "from": "2026-06-01",
                            "to": "2026-06-30",
                            "labelFa": "ژوئن ۲۰۲۶",
                        }
                    ],
                    "dataCoverage": {
                        "sessions": 8,
                        "verifiedSessions": 4,
                        "firstCreatedAt": "2026-06-01T00:00:00Z",
                        "lastCreatedAt": "2026-06-30T00:00:00Z",
                        "quality": "sufficient",
                    },
                },
                "selection": SELECTION,
                "headlineMetrics": [
                    {
                        "id": "headline",
                        "value": metric(1),
                        "evidenceId": "e-headline",
                    }
                ],
                "prioritizedInsights": [],
                "evidenceIndex": {},
            }
        },
    }


def recovery_artifact() -> dict[str, object]:
    evidence_records = [
        evidence("e-headline"),
        evidence("e-count-low", 10),
        evidence("e-percent", 999, "percent"),
        evidence("e-count-high", 20),
    ]
    insights = [
        insight(
            "a-count-low",
            "e-count-low",
            value=10,
            unit="count",
            confidence="high",
        ),
        insight(
            "b-percent",
            "e-percent",
            value=999,
            unit="percent",
            confidence="high",
        ),
        insight(
            "c-count-high",
            "e-count-high",
            value=20,
            unit="count",
            confidence="low",
        ),
    ]
    return {
        "schemaVersion": "1.0",
        "generatedAt": "2026-07-01T00:00:00Z",
        "dataset": deepcopy(base_artifact()["dataset"]),
        "feature": "conversion-recovery",
        "merchants": {
            "M275": {
                "selection": SELECTION,
                "funnel": [],
                "noAttempt": {"sessions": 0, "sharePct": 0, "requestedAmountRial": 0},
                "retry": {"retriedSessions": 0, "recoveredSessions": 0, "recoveryPct": 0},
                "segments": [],
                "scenarios": [],
                "insights": insights,
                "evidence": evidence_records,
            }
        },
    }


def test_composition_merges_contract_payloads_and_preserves_tie_rules() -> None:
    result = compose_action_center_artifact(base_artifact(), [recovery_artifact()])
    payload = result["merchants"]["M275"]

    assert [item["id"] for item in payload["prioritizedInsights"]] == [
        "c-count-high",
        "b-percent",
        "a-count-low",
    ]
    assert set(payload["evidenceIndex"]) == {
        "e-headline",
        "e-count-low",
        "e-percent",
        "e-count-high",
    }
    assert serialize_artifact(result)


def test_composition_rejects_dataset_fingerprint_mismatch() -> None:
    contribution = recovery_artifact()
    contribution["dataset"]["fingerprint"] = "different"

    with pytest.raises(ActionCenterCompositionError, match="fingerprint mismatch"):
        compose_action_center_artifact(base_artifact(), [contribution])


def test_composition_rejects_duplicate_evidence_ids() -> None:
    contribution = recovery_artifact()

    with pytest.raises(ActionCenterCompositionError, match="Duplicate evidence ID"):
        compose_action_center_artifact(base_artifact(), [contribution, contribution])


def test_composition_rejects_insight_without_local_evidence() -> None:
    contribution = recovery_artifact()
    contribution["merchants"]["M275"]["insights"][0]["evidenceId"] = "missing"

    with pytest.raises(ActionCenterCompositionError, match="Insight evidence is missing"):
        compose_action_center_artifact(base_artifact(), [contribution])


def test_composition_rejects_merchant_period_mismatch() -> None:
    contribution = recovery_artifact()
    contribution["merchants"]["M275"]["selection"] = {
        **SELECTION,
        "period": {"from": "2026-05-01", "to": "2026-05-31"},
    }

    with pytest.raises(ActionCenterCompositionError, match="Selection mismatch"):
        compose_action_center_artifact(base_artifact(), [contribution])


def test_composition_rejects_metric_evidence_mismatch() -> None:
    contribution = recovery_artifact()
    contribution["merchants"]["M275"]["insights"][0]["impact"]["value"] = 999

    with pytest.raises(ActionCenterCompositionError, match="impact does not match"):
        compose_action_center_artifact(base_artifact(), [contribution])


def test_composition_rejects_duplicate_insight_ids() -> None:
    contribution = recovery_artifact()
    contribution["merchants"]["M275"]["insights"][1]["id"] = "a-count-low"

    with pytest.raises(ActionCenterCompositionError, match="Duplicate insight ID"):
        compose_action_center_artifact(base_artifact(), [contribution])

from __future__ import annotations

from copy import deepcopy
from typing import Mapping, Sequence

from .compose import ActionCenterCompositionError


_REQUIRED_FEATURES = {"conversion-recovery", "peer-opportunities"}


def _mapping(value: object, path: str) -> Mapping[str, object]:
    if not isinstance(value, Mapping):
        raise ActionCenterCompositionError(f"{path} must be an object")
    return value


def _string(value: object, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ActionCenterCompositionError(f"{path} must be a non-empty string")
    return value


def _feature_index(
    feature_artifacts: Sequence[Mapping[str, object]],
) -> dict[str, Mapping[str, object]]:
    indexed: dict[str, Mapping[str, object]] = {}
    for artifact in feature_artifacts:
        feature = _string(artifact.get("feature"), "feature")
        if feature in indexed:
            raise ActionCenterCompositionError(f"Duplicate feature artifact: {feature}")
        indexed[feature] = artifact
    missing = _REQUIRED_FEATURES.difference(indexed)
    if missing:
        raise ActionCenterCompositionError(
            f"Missing feature artifacts for base: {', '.join(sorted(missing))}"
        )
    return indexed


def _merchant_payload(
    artifact: Mapping[str, object],
    merchant_key: str,
) -> Mapping[str, object]:
    merchants = _mapping(artifact.get("merchants"), "artifact.merchants")
    return _mapping(
        merchants.get(merchant_key),
        f"artifact.merchants.{merchant_key}",
    )


def _evidence(
    payload: Mapping[str, object],
    evidence_id: str,
) -> Mapping[str, object]:
    records = payload.get("evidence")
    if not isinstance(records, list):
        raise ActionCenterCompositionError("payload.evidence must be an array")
    for raw_record in records:
        record = _mapping(raw_record, "evidence")
        if record.get("id") == evidence_id:
            return record
    raise ActionCenterCompositionError(f"Required evidence is missing: {evidence_id}")


def _metric_from_evidence(
    payload: Mapping[str, object],
    evidence_id: str,
) -> dict[str, object]:
    result = _evidence(payload, evidence_id).get("result")
    if result is None:
        raise ActionCenterCompositionError(
            f"Headline evidence cannot have a null result: {evidence_id}"
        )
    return deepcopy(dict(_mapping(result, f"evidence.{evidence_id}.result")))


def build_m275_action_center_base(
    feature_artifacts: Sequence[Mapping[str, object]],
) -> dict[str, object]:
    """Build the real M275 shell from feature-owned artifacts without recomputation."""

    indexed = _feature_index(feature_artifacts)
    recovery = indexed["conversion-recovery"]
    opportunities = indexed["peer-opportunities"]
    reference_dataset = _mapping(recovery.get("dataset"), "recovery.dataset")
    reference_fingerprint = _string(
        reference_dataset.get("fingerprint"),
        "recovery.dataset.fingerprint",
    )

    for feature, artifact in indexed.items():
        dataset = _mapping(artifact.get("dataset"), f"{feature}.dataset")
        if dataset != reference_dataset:
            raise ActionCenterCompositionError(
                f"Dataset metadata mismatch while building base: {feature}"
            )

    recovery_payload = _merchant_payload(recovery, "M275")
    opportunities_payload = _merchant_payload(opportunities, "M275")
    selection = _mapping(recovery_payload.get("selection"), "recovery.selection")
    if _mapping(
        opportunities_payload.get("selection"),
        "opportunities.selection",
    ) != selection:
        raise ActionCenterCompositionError("M275 selection mismatch while building base")

    generated_values = [
        _string(artifact.get("generatedAt"), f"{feature}.generatedAt")
        for feature, artifact in indexed.items()
    ]
    session_metric = _metric_from_evidence(
        recovery_payload,
        "recovery-M275-funnel-session-count",
    )
    verified_metric = _metric_from_evidence(
        recovery_payload,
        "recovery-M275-funnel-verified-count",
    )

    return {
        "schemaVersion": "1.0",
        "generatedAt": max(generated_values),
        "dataset": deepcopy(dict(reference_dataset)),
        "feature": "action-center",
        "merchants": {
            "M275": {
                "merchant": {
                    "merchantKey": "M275",
                    "categoryId": "56610001",
                    "categoryTitleFa": "کیف و کفش فروشی",
                    "availablePeriods": [
                        {
                            **deepcopy(dict(_mapping(selection.get("period"), "selection.period"))),
                            "labelFa": "ژوئن ۲۰۲۶ (داده تا ۲۲ ژوئن)",
                        }
                    ],
                    "dataCoverage": {
                        "sessions": session_metric["value"],
                        "verifiedSessions": verified_metric["value"],
                        "firstCreatedAt": "2026-06-01T00:05:54",
                        "lastCreatedAt": "2026-06-22T10:28:19",
                        "quality": "limited",
                    },
                },
                "selection": deepcopy(dict(selection)),
                "headlineMetrics": [
                    {
                        "id": "verified-sales-change",
                        "value": _metric_from_evidence(
                            opportunities_payload,
                            "peer-growth-decomposition-m275",
                        ),
                        "evidenceId": "peer-growth-decomposition-m275",
                    },
                    {
                        "id": "sessions",
                        "value": session_metric,
                        "evidenceId": "recovery-M275-funnel-session-count",
                    },
                    {
                        "id": "no-attempt-share",
                        "value": _metric_from_evidence(
                            recovery_payload,
                            "recovery-M275-no-attempt-share",
                        ),
                        "evidenceId": "recovery-M275-no-attempt-share",
                    },
                ],
                "prioritizedInsights": [],
                "evidenceIndex": {},
            }
        },
    }

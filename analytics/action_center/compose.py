from __future__ import annotations

from copy import deepcopy
from typing import Mapping, Sequence


class ActionCenterCompositionError(ValueError):
    """Raised when feature artifacts cannot form one contract-safe action center."""


_CONTRIBUTION_FEATURES = {
    "conversion-recovery",
    "customer-growth",
    "peer-opportunities",
}
_CONFIDENCE_ORDER = {"high": 0, "medium": 1, "low": 2}


def _mapping(value: object, path: str) -> Mapping[str, object]:
    if not isinstance(value, Mapping):
        raise ActionCenterCompositionError(f"{path} must be an object")
    return value


def _list(value: object, path: str) -> list[object]:
    if not isinstance(value, list):
        raise ActionCenterCompositionError(f"{path} must be an array")
    return value


def _string(value: object, path: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ActionCenterCompositionError(f"{path} must be a non-empty string")
    return value


def _confidence_then_id(insight: Mapping[str, object]) -> tuple[int, str]:
    confidence = _string(insight.get("confidence"), "insight.confidence")
    if confidence not in _CONFIDENCE_ORDER:
        raise ActionCenterCompositionError("insight.confidence is invalid")
    return _CONFIDENCE_ORDER[confidence], _string(insight.get("id"), "insight.id")


def _impact_unit(insight: Mapping[str, object]) -> str | None:
    impact = insight.get("impact")
    if impact is None:
        return None
    return _string(_mapping(impact, "insight.impact").get("unit"), "insight.impact.unit")


def _impact_value(insight: Mapping[str, object]) -> float:
    impact = _mapping(insight.get("impact"), "insight.impact")
    value = impact.get("value")
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ActionCenterCompositionError("insight.impact.value must be numeric")
    return float(value)


def _sort_priority_group(
    group: Sequence[Mapping[str, object]],
) -> list[Mapping[str, object]]:
    sorted_group = sorted(group, key=_confidence_then_id)
    units = list(
        dict.fromkeys(
            unit for insight in sorted_group if (unit := _impact_unit(insight)) is not None
        )
    )

    for unit in units:
        positions = [
            index
            for index, insight in enumerate(sorted_group)
            if _impact_unit(insight) == unit
        ]
        same_unit = sorted(
            (sorted_group[position] for position in positions),
            key=lambda insight: (-_impact_value(insight), *_confidence_then_id(insight)),
        )
        for position, insight in zip(positions, same_unit, strict=True):
            sorted_group[position] = insight

    return sorted_group


def _prioritize(
    insights: Sequence[Mapping[str, object]],
    *,
    limit: int,
) -> list[Mapping[str, object]]:
    if not isinstance(limit, int) or isinstance(limit, bool) or limit < 0:
        raise ActionCenterCompositionError("limit must be a non-negative integer")

    grouped: dict[int, list[Mapping[str, object]]] = {}
    for insight in insights:
        priority = insight.get("priority")
        if not isinstance(priority, int) or isinstance(priority, bool) or priority not in range(1, 6):
            raise ActionCenterCompositionError("insight.priority must be between 1 and 5")
        grouped.setdefault(priority, []).append(insight)

    prioritized: list[Mapping[str, object]] = []
    for priority in sorted(grouped):
        prioritized.extend(_sort_priority_group(grouped[priority]))
    return prioritized[:limit]


def _dataset_fingerprint(artifact: Mapping[str, object], path: str) -> str:
    dataset = _mapping(artifact.get("dataset"), f"{path}.dataset")
    return _string(dataset.get("fingerprint"), f"{path}.dataset.fingerprint")


def _validate_envelope(
    artifact: Mapping[str, object],
    *,
    path: str,
    fingerprint: str,
) -> Mapping[str, object]:
    if artifact.get("schemaVersion") != "1.0":
        raise ActionCenterCompositionError(f"{path}.schemaVersion must be 1.0")
    if _dataset_fingerprint(artifact, path) != fingerprint:
        raise ActionCenterCompositionError(
            "Dataset fingerprint mismatch between action center contributions"
        )
    return _mapping(artifact.get("merchants"), f"{path}.merchants")


def compose_action_center_artifact(
    base_artifact: Mapping[str, object],
    feature_artifacts: Sequence[Mapping[str, object]],
    *,
    limit: int = 3,
) -> dict[str, object]:
    """Merge B/C/D contract payloads without recomputing their analytics.

    `base_artifact` owns the envelope, merchant catalog, selection and headline
    metrics. Feature artifacts contribute only their contract `insights` and
    `evidence` arrays. The result is ready for common JSON serialization and the
    TypeScript boundary validator.
    """

    if base_artifact.get("schemaVersion") != "1.0":
        raise ActionCenterCompositionError("base.schemaVersion must be 1.0")
    if base_artifact.get("feature") != "action-center":
        raise ActionCenterCompositionError("base.feature must be action-center")

    fingerprint = _dataset_fingerprint(base_artifact, "base")
    output = deepcopy(dict(base_artifact))
    output_merchants = _mapping(output.get("merchants"), "base.merchants")

    contribution_merchants: list[Mapping[str, object]] = []
    for index, artifact in enumerate(feature_artifacts):
        feature = artifact.get("feature")
        if feature not in _CONTRIBUTION_FEATURES:
            raise ActionCenterCompositionError(
                f"contribution[{index}].feature is not an approved feature"
            )
        contribution_merchants.append(
            _validate_envelope(
                artifact,
                path=f"contribution[{index}]",
                fingerprint=fingerprint,
            )
        )

    composed_merchants: dict[str, object] = {}
    for merchant_key, raw_payload in output_merchants.items():
        payload = deepcopy(dict(_mapping(raw_payload, f"base.merchants.{merchant_key}")))
        selection = _mapping(payload.get("selection"), f"base.merchants.{merchant_key}.selection")
        evidence_index: dict[str, object] = {}
        insights: list[Mapping[str, object]] = []

        for evidence_id, raw_evidence in _mapping(
            payload.get("evidenceIndex", {}),
            f"base.merchants.{merchant_key}.evidenceIndex",
        ).items():
            evidence = _mapping(raw_evidence, f"base evidence {evidence_id}")
            resolved_id = _string(evidence.get("id"), "evidence.id")
            if resolved_id != evidence_id:
                raise ActionCenterCompositionError("Evidence index key does not match evidence.id")
            if evidence.get("datasetFingerprint") != fingerprint:
                raise ActionCenterCompositionError("Evidence dataset fingerprint mismatch")
            evidence_index[evidence_id] = deepcopy(dict(evidence))

        for raw_insight in _list(
            payload.get("prioritizedInsights", []),
            f"base.merchants.{merchant_key}.prioritizedInsights",
        ):
            insights.append(_mapping(raw_insight, "base insight"))

        for artifact_index, merchants in enumerate(contribution_merchants):
            contribution_payload_value = merchants.get(merchant_key)
            if contribution_payload_value is None:
                continue
            contribution_payload = _mapping(
                contribution_payload_value,
                f"contribution[{artifact_index}].merchants.{merchant_key}",
            )
            if _mapping(
                contribution_payload.get("selection"),
                f"contribution[{artifact_index}].selection",
            ) != selection:
                raise ActionCenterCompositionError(
                    f"Selection mismatch for merchant {merchant_key}"
                )

            contribution_evidence_ids: set[str] = set()
            for raw_evidence in _list(
                contribution_payload.get("evidence"),
                f"contribution[{artifact_index}].evidence",
            ):
                evidence = _mapping(raw_evidence, "contribution evidence")
                evidence_id = _string(evidence.get("id"), "evidence.id")
                if evidence_id in evidence_index:
                    raise ActionCenterCompositionError(f"Duplicate evidence ID: {evidence_id}")
                if evidence.get("datasetFingerprint") != fingerprint:
                    raise ActionCenterCompositionError("Evidence dataset fingerprint mismatch")
                contribution_evidence_ids.add(evidence_id)
                evidence_index[evidence_id] = deepcopy(dict(evidence))

            for raw_insight in _list(
                contribution_payload.get("insights"),
                f"contribution[{artifact_index}].insights",
            ):
                insight = _mapping(raw_insight, "contribution insight")
                evidence_id = _string(insight.get("evidenceId"), "insight.evidenceId")
                if evidence_id not in contribution_evidence_ids:
                    raise ActionCenterCompositionError(
                        f"Insight evidence is missing from its contribution: {evidence_id}"
                    )
                insights.append(insight)

        insight_ids: set[str] = set()
        for insight in insights:
            insight_id = _string(insight.get("id"), "insight.id")
            if insight_id in insight_ids:
                raise ActionCenterCompositionError(f"Duplicate insight ID: {insight_id}")
            insight_ids.add(insight_id)
            evidence_id = _string(insight.get("evidenceId"), "insight.evidenceId")
            if evidence_id not in evidence_index:
                raise ActionCenterCompositionError(f"Missing insight evidence: {evidence_id}")
            impact = insight.get("impact")
            evidence_result = _mapping(
                _mapping(evidence_index[evidence_id], "evidence").get("result"),
                "evidence.result",
            )
            if impact is not None and _mapping(impact, "insight.impact") != evidence_result:
                raise ActionCenterCompositionError(
                    f"Insight impact does not match evidence result: {evidence_id}"
                )

        for raw_metric in _list(
            payload.get("headlineMetrics"),
            f"base.merchants.{merchant_key}.headlineMetrics",
        ):
            metric = _mapping(raw_metric, "headline metric")
            evidence_id = _string(metric.get("evidenceId"), "headlineMetric.evidenceId")
            if evidence_id not in evidence_index:
                raise ActionCenterCompositionError(
                    f"Missing headline metric evidence: {evidence_id}"
                )
            evidence_result = _mapping(
                _mapping(evidence_index[evidence_id], "evidence").get("result"),
                "evidence.result",
            )
            if _mapping(metric.get("value"), "headlineMetric.value") != evidence_result:
                raise ActionCenterCompositionError(
                    f"Headline metric does not match evidence result: {evidence_id}"
                )

        payload["prioritizedInsights"] = [
            deepcopy(dict(insight)) for insight in _prioritize(insights, limit=limit)
        ]
        payload["evidenceIndex"] = evidence_index
        composed_merchants[str(merchant_key)] = payload

    output["merchants"] = composed_merchants
    return output

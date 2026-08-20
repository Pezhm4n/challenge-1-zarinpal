from __future__ import annotations

import json
from pathlib import Path

from analytics.action_center import (
    build_m275_action_center_base,
    compose_action_center_artifact,
)


def _read_artifact(name: str) -> dict[str, object]:
    value = json.loads(
        Path(f"public/analysis/{name}.json").read_text(encoding="utf-8")
    )
    assert isinstance(value, dict)
    return value


def test_real_feature_artifacts_compose_without_mock_data() -> None:
    artifacts = [
        _read_artifact("conversion-recovery"),
        _read_artifact("customer-growth"),
        _read_artifact("peer-opportunities"),
    ]
    base = build_m275_action_center_base(artifacts)
    result = compose_action_center_artifact(base, artifacts)
    payload = result["merchants"]["M275"]

    assert [item["id"] for item in payload["prioritizedInsights"]] == [
        "recovery-no-attempt-M275",
        "growth-driver-m275",
        "customers-returning-change-M275",
    ]
    assert len(payload["evidenceIndex"]) == 59
    assert payload["headlineMetrics"][0]["evidenceId"] == (
        "peer-growth-decomposition-m275"
    )
    assert result["dataset"]["rowCount"] == 2_213_289
    assert result["dataset"]["sessionCount"] == 2_062_839

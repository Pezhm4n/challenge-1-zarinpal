from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path

import pytest

from analytics.common import compute_dataset_fingerprint
from analytics.conversion_recovery.build_artifact import build_artifact


ROOT = Path(__file__).resolve().parents[2]
FIXTURE_PATH = ROOT / "data" / "fixtures" / "conversion-recovery-artifact.csv"
FULL_DATASET_PATH = ROOT / "data" / "raw" / "challenge_data.csv"
PERIOD_START = date(2026, 6, 1)
PERIOD_END = date(2026, 7, 1)
COMPARISON_START = date(2026, 5, 1)
COMPARISON_END = date(2026, 6, 1)
GENERATED_AT = datetime(2026, 7, 1, tzinfo=timezone.utc)


def _build_fixture(tmp_path: Path) -> dict[str, object]:
    return build_artifact(
        FIXTURE_PATH,
        tmp_path / "conversion-recovery.json",
        current_start=PERIOD_START,
        current_end=PERIOD_END,
        comparison_start=COMPARISON_START,
        comparison_end=COMPARISON_END,
        merchants={"MBUILD", "MZERO"},
        generated_at=GENERATED_AT,
    )


def test_builder_emits_hand_computable_session_funnel(tmp_path: Path) -> None:
    artifact = _build_fixture(tmp_path)
    payload = artifact["merchants"]["MBUILD"]

    assert payload["funnel"] == [
        {
            "stage": "session",
            "count": 6,
            "amountRial": 21_000,
            "rateFromPrevious": None,
            "evidenceIds": {
                "count": "recovery-MBUILD-funnel-session-count",
                "amount": "recovery-MBUILD-funnel-session-amount",
                "rate": None,
            },
        },
        {
            "stage": "attempted",
            "count": 3,
            "amountRial": 15_000,
            "rateFromPrevious": 50.0,
            "evidenceIds": {
                "count": "recovery-MBUILD-funnel-attempted-count",
                "amount": "recovery-MBUILD-funnel-attempted-amount",
                "rate": "recovery-MBUILD-funnel-attempted-rate",
            },
        },
        {
            "stage": "in-bank",
            "count": 2,
            "amountRial": 10_000,
            "rateFromPrevious": 66.6667,
            "evidenceIds": {
                "count": "recovery-MBUILD-funnel-in-bank-count",
                "amount": "recovery-MBUILD-funnel-in-bank-amount",
                "rate": "recovery-MBUILD-funnel-in-bank-rate",
            },
        },
        {
            "stage": "verified",
            "count": 2,
            "amountRial": 10_000,
            "rateFromPrevious": 100.0,
            "evidenceIds": {
                "count": "recovery-MBUILD-funnel-verified-count",
                "amount": "recovery-MBUILD-funnel-verified-amount",
                "rate": "recovery-MBUILD-funnel-verified-rate",
            },
        },
    ]


def test_retry_no_attempt_and_scenario_are_exact(tmp_path: Path) -> None:
    payload = _build_fixture(tmp_path)["merchants"]["MBUILD"]
    evidence = {row["id"]: row for row in payload["evidence"]}

    assert payload["noAttempt"] == {
        "sessions": 3,
        "sharePct": 50.0,
        "requestedAmountRial": 6_000,
        "evidenceIds": {
            "sessions": "recovery-MBUILD-no-attempt-count",
            "share": "recovery-MBUILD-no-attempt-share",
            "amount": "recovery-MBUILD-no-attempt-amount",
        },
    }
    assert payload["retry"] == {
        "firstTryNonVerifiedSessions": 2,
        "recoveredSessions": 1,
        "recoveryPct": 50.0,
        "evidenceIds": {
            "eligible": "recovery-MBUILD-retry-eligible-count",
            "recovered": "recovery-MBUILD-retry-recovered-count",
            "rate": "recovery-MBUILD-retry-rate",
        },
    }
    assert payload["scenarios"] == [
        {
            "id": "recovery-MBUILD-no-attempt-scenario",
            "titleFa": "بازگشت NoAttempt به خط مبنای دوره قبل",
            "lever": "checkout-to-gateway-entry",
            "baseline": 50.0,
            "target": 25.0,
            "estimatedOrders": 1,
            "estimatedVolumeRial": 5_000,
            "confidence": "medium",
            "isCausalClaim": False,
            "evidenceId": "recovery-MBUILD-scenario-volume",
            "evidenceIds": {
                "orders": "recovery-MBUILD-scenario-orders",
                "volume": "recovery-MBUILD-scenario-volume",
            },
        }
    ]
    insight = payload["insights"][0]
    assert insight["impact"] == evidence[insight["evidenceId"]]["result"]


def test_low_sample_psp_cells_are_not_ranked_or_recommended(tmp_path: Path) -> None:
    payload = _build_fixture(tmp_path)["merchants"]["MBUILD"]
    psp_segments = [row for row in payload["segments"] if row["dimension"] == "psp"]

    assert psp_segments
    assert all(row["quality"] == "insufficient-data" for row in psp_segments)
    assert all(row["verifyPct"] is None for row in psp_segments)
    assert all(row["peerOrBaselinePct"] is None for row in psp_segments)
    assert all("rank" not in row and "winner" not in row for row in psp_segments)
    assert not any("PSP" in insight["titleFa"] for insight in payload["insights"])


def test_zero_denominators_emit_null_evidence_and_no_scenario(tmp_path: Path) -> None:
    payload = _build_fixture(tmp_path)["merchants"]["MZERO"]
    evidence = {row["id"]: row for row in payload["evidence"]}

    assert payload["funnel"][2]["rateFromPrevious"] is None
    assert payload["funnel"][3]["rateFromPrevious"] is None
    assert payload["retry"]["recoveryPct"] is None
    assert payload["scenarios"] == []
    assert payload["insights"][0]["status"] == "insufficient-data"
    assert payload["insights"][0]["impact"] is None
    assert evidence["recovery-MZERO-funnel-in-bank-rate"]["result"] is None
    assert evidence["recovery-MZERO-retry-rate"]["result"] is None
    assert any(
        note["code"] == "ZERO_DENOMINATOR"
        for note in evidence["recovery-MZERO-retry-rate"]["dataQuality"]
    )


def test_evidence_is_resolved_masked_and_documents_stage_limits(tmp_path: Path) -> None:
    output_path = tmp_path / "conversion-recovery.json"
    artifact = build_artifact(
        FIXTURE_PATH,
        output_path,
        current_start=PERIOD_START,
        current_end=PERIOD_END,
        comparison_start=COMPARISON_START,
        comparison_end=COMPARISON_END,
        merchants={"MBUILD"},
        generated_at=GENERATED_AT,
    )
    payload = artifact["merchants"]["MBUILD"]
    evidence = {row["id"]: row for row in payload["evidence"]}

    assert output_path.read_text(encoding="utf-8").endswith("\n")
    assert json.loads(output_path.read_text(encoding="utf-8")) == artifact
    assert artifact["dataset"]["fingerprint"] == compute_dataset_fingerprint(FIXTURE_PATH)
    assert all(row["datasetFingerprint"] == artifact["dataset"]["fingerprint"] for row in evidence.values())
    assert all(insight["evidenceId"] in evidence for insight in payload["insights"])
    assert all(scenario["evidenceId"] in evidence for scenario in payload["scenarios"])
    assert all(
        "Reversed" in " ".join(row["limitations"])
        for row in evidence.values()
        if row["formulaId"] == "funnel.stage_progression.v1"
    )

    serialized = output_path.read_text(encoding="utf-8")
    assert "CARD-BUILD-000" not in serialized
    assert "payer_card_key" not in serialized
    assert "NaN" not in serialized
    assert "Infinity" not in serialized


@pytest.mark.skipif(
    not FULL_DATASET_PATH.is_file(),
    reason="Raw challenge dataset is intentionally local and Git-ignored",
)
def test_m275_real_artifact_matches_approved_reference(tmp_path: Path) -> None:
    artifact = build_artifact(
        FULL_DATASET_PATH,
        tmp_path / "conversion-recovery.json",
        current_start=PERIOD_START,
        current_end=PERIOD_END,
        comparison_start=COMPARISON_START,
        comparison_end=COMPARISON_END,
        merchants={"M275"},
        generated_at=GENERATED_AT,
    )
    payload = artifact["merchants"]["M275"]

    assert [
        (stage["count"], stage["amountRial"])
        for stage in payload["funnel"]
    ] == [
        (3_183, 27_489_740_003),
        (1_926, 17_157_870_003),
        (1_835, 16_294_400_003),
        (1_170, 10_421_270_000),
    ]
    assert payload["noAttempt"]["sessions"] == 1_257
    assert payload["noAttempt"]["sharePct"] == 39.491
    assert payload["retry"] == {
        "firstTryNonVerifiedSessions": 786,
        "recoveredSessions": 30,
        "recoveryPct": 3.8168,
        "evidenceIds": {
            "eligible": "recovery-M275-retry-eligible-count",
            "recovered": "recovery-M275-retry-recovered-count",
            "rate": "recovery-M275-retry-rate",
        },
    }
    assert payload["scenarios"][0]["estimatedOrders"] == 551
    assert payload["scenarios"][0]["estimatedVolumeRial"] == 4_908_817_383
    assert all(
        later["count"] <= earlier["count"]
        for earlier, later in zip(payload["funnel"], payload["funnel"][1:])
    )

import json
from datetime import date
from pathlib import Path

from analytics.customer_growth.build_artifact import build_artifact


PROJECT_ROOT = Path(__file__).resolve().parents[2]
FIXTURE = PROJECT_ROOT / "data" / "fixtures" / "customer-growth-sessions.csv"


def _build(tmp_path: Path) -> dict:
    return build_artifact(
        FIXTURE,
        tmp_path / "customer-growth.json",
        current_start=date(2026, 3, 1),
        current_end=date(2026, 4, 1),
        comparison_start=date(2026, 2, 1),
        comparison_end=date(2026, 3, 1),
        min_cohort_size=2,
        merchants={"MTEST"},
    )


def _build_merchant(tmp_path: Path, merchant_key: str) -> dict:
    return build_artifact(
        FIXTURE,
        tmp_path / f"customer-growth-{merchant_key}.json",
        current_start=date(2026, 3, 1),
        current_end=date(2026, 4, 1),
        comparison_start=date(2026, 2, 1),
        comparison_end=date(2026, 3, 1),
        min_cohort_size=2,
        merchants={merchant_key},
    )["merchants"][merchant_key]


def test_customer_mix_repeat_and_dedupe(tmp_path: Path) -> None:
    payload = _build(tmp_path)["merchants"]["MTEST"]

    assert payload["activeCards"] == 4
    assert payload["returningCards"] == 2
    assert payload["newCards"] == 2
    assert payload["returningSharePct"] == 50.0
    assert payload["repeatPairPct"] == 40.0
    assert payload["repeatRevenueSharePct"] == 5.1724


def test_cohort_retention_is_hand_checkable(tmp_path: Path) -> None:
    cohorts = _build(tmp_path)["merchants"]["MTEST"]["cohorts"]

    assert cohorts == [
        {"cohort": "2026-01", "periodIndex": 0, "customers": 2, "retentionPct": 100.0},
        {"cohort": "2026-01", "periodIndex": 1, "customers": 1, "retentionPct": 50.0},
        {"cohort": "2026-01", "periodIndex": 2, "customers": 2, "retentionPct": 100.0},
        {"cohort": "2026-03", "periodIndex": 0, "customers": 2, "retentionPct": 100.0},
    ]


def test_concentration_uses_non_overlapping_buckets(tmp_path: Path) -> None:
    concentration = _build(tmp_path)["merchants"]["MTEST"]["concentration"]

    assert concentration == [
        {
            "bucket": "پرتراکنش‌ترین کارت",
            "customerSharePct": 25.0,
            "revenueSharePct": 86.2069,
        },
        {
            "bucket": "کارت‌های رتبه ۲ تا ۵",
            "customerSharePct": 75.0,
            "revenueSharePct": 13.7931,
        },
    ]


def test_card_keys_are_masked_before_serialization(tmp_path: Path) -> None:
    output = tmp_path / "customer-growth.json"
    artifact = build_artifact(
        FIXTURE,
        output,
        current_start=date(2026, 3, 1),
        current_end=date(2026, 4, 1),
        comparison_start=date(2026, 2, 1),
        comparison_end=date(2026, 3, 1),
        min_cohort_size=2,
        merchants={"MTEST"},
    )
    serialized = output.read_text(encoding="utf-8")

    assert artifact["schemaVersion"] == "1.0"
    assert artifact["feature"] == "customer-growth"
    assert "card-a" not in serialized
    assert "card-b" not in serialized
    sample = artifact["merchants"]["MTEST"]["evidence"][0]["sampleRows"][0]
    assert sample["payerCardMasked"].startswith("کارت-ناشناس-")
    json.loads(serialized)


def test_evidence_samples_contribute_to_each_formula_numerator(tmp_path: Path) -> None:
    evidence = {
        row["formulaId"]: row
        for row in _build(tmp_path)["merchants"]["MTEST"]["evidence"]
    }

    assert {row["sessionKey"] for row in evidence["customer.returning_share.v1"]["sampleRows"]} == {
        "S6",
        "S7",
    }
    assert {row["sessionKey"] for row in evidence["customer.repeat_revenue_share.v1"]["sampleRows"]} == {
        "S6",
        "S7",
    }
    assert {row["sessionKey"] for row in evidence["customer.repeat_pair_rate.v1"]["sampleRows"]}.issubset(
        {"S1", "S2", "S3", "S6", "S7"}
    )
    assert {row["sessionKey"] for row in evidence["customer.cohort_retention.v1"]["sampleRows"]} == {
        "S6",
        "S7",
    }
    assert {row["sessionKey"] for row in evidence["customer.revenue_concentration.v1"]["sampleRows"]} == {
        "S9"
    }


def test_elapsed_zero_cohort_cells_are_materialized_not_omitted(tmp_path: Path) -> None:
    payload = _build_merchant(tmp_path, "MZERO")

    assert payload["cohorts"] == [
        {"cohort": "2026-01", "periodIndex": 0, "customers": 2, "retentionPct": 100.0},
        {"cohort": "2026-01", "periodIndex": 1, "customers": 0, "retentionPct": 0.0},
        {"cohort": "2026-01", "periodIndex": 2, "customers": 0, "retentionPct": 0.0},
    ]
    assert all(row["periodIndex"] < 3 for row in payload["cohorts"])
    cohort_evidence = next(
        row for row in payload["evidence"] if row["formulaId"] == "customer.cohort_retention.v1"
    )
    assert cohort_evidence["numerator"]["value"] == 0
    assert cohort_evidence["result"]["value"] == 0.0
    assert cohort_evidence["sampleRows"] == []


def test_zero_denominators_are_null_in_payload_and_evidence(tmp_path: Path) -> None:
    payload = _build_merchant(tmp_path, "MNULL")
    evidence = {row["formulaId"]: row for row in payload["evidence"]}

    assert payload["returningSharePct"] is None
    assert payload["repeatPairPct"] is None
    assert payload["repeatRevenueSharePct"] is None
    expected = {
        "customer.returning_share.v1": "RETURNING_SHARE_ZERO_DENOMINATOR",
        "customer.repeat_pair_rate.v1": "REPEAT_PAIR_ZERO_DENOMINATOR",
        "customer.repeat_revenue_share.v1": "REPEAT_REVENUE_ZERO_DENOMINATOR",
    }
    for formula_id, quality_code in expected.items():
        record = evidence[formula_id]
        assert record["denominator"]["value"] == 0
        assert record["result"]["value"] is None
        assert quality_code in {note["code"] for note in record["dataQuality"]}
        assert record["sampleRows"] == []

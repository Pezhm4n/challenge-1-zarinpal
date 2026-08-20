from __future__ import annotations

import json
from pathlib import Path

import pytest

from analytics.common import (
    FORMULA_REGISTRY,
    CsvDatasetLoader,
    DatasetNotFoundError,
    DatasetSchemaError,
    SessionInvariantError,
    UnsafeArtifactError,
    build_evidence_sample,
    compute_dataset_coverage,
    compute_dataset_fingerprint,
    get_formula_definition,
    mask_payer_card_key,
    normalize_attempts_to_sessions,
    serialize_artifact,
    write_artifact_json,
)
from analytics.common.loader import validate_identifier


ROOT = Path(__file__).resolve().parents[2]
FIXTURE_PATH = ROOT / "data" / "fixtures" / "session-normalization.csv"


def test_loader_validates_and_registers_explicit_schema() -> None:
    with CsvDatasetLoader(FIXTURE_PATH) as loader:
        header = loader.validate_schema()
        view_name = loader.register_attempts()
        row_count = loader.connection.execute(
            f"SELECT COUNT(*) FROM {view_name}"
        ).fetchone()

    assert len(header) == 22
    assert row_count == (5,)


def test_loader_reports_missing_dataset(tmp_path: Path) -> None:
    with CsvDatasetLoader(tmp_path / "missing.csv") as loader:
        with pytest.raises(DatasetNotFoundError):
            loader.validate_schema()


def test_loader_rejects_missing_column(tmp_path: Path) -> None:
    invalid_path = tmp_path / "invalid.csv"
    header = FIXTURE_PATH.read_text(encoding="utf-8").splitlines()[0]
    invalid_path.write_text(header.replace(",expire_in", "") + "\n", encoding="utf-8")

    with CsvDatasetLoader(invalid_path) as loader:
        with pytest.raises(DatasetSchemaError) as error:
            loader.validate_schema()

    assert error.value.missing_columns == ("expire_in",)


def test_session_normalization_prevents_retry_double_count() -> None:
    with CsvDatasetLoader(FIXTURE_PATH) as loader:
        loader.register_attempts()
        normalize_attempts_to_sessions(loader.connection)
        sessions = loader.connection.execute(
            """
            SELECT
                session_key,
                amount_rial,
                attempt_count,
                eventual_status,
                no_attempt,
                retried,
                recovered_after_retry
            FROM normalized_sessions
            ORDER BY session_key
            """
        ).fetchall()
        verified_volume = loader.connection.execute(
            """
            SELECT SUM(amount_rial)
            FROM normalized_sessions
            WHERE eventual_verified
            """
        ).fetchone()

    assert sessions == [
        ("S1", 1_000, 1, "Verified", False, False, False),
        ("S2", 2_000, 2, "Verified", False, True, True),
        ("S3", 3_000, 0, "NoAttempt", True, False, False),
        ("S4", 4_000, 1, "Failed", False, False, False),
    ]
    assert verified_volume == (3_000,)


def test_normalization_rejects_inconsistent_session_fields(tmp_path: Path) -> None:
    invalid_path = tmp_path / "inconsistent.csv"
    fixture = FIXTURE_PATH.read_text(encoding="utf-8")
    invalid_path.write_text(
        fixture.replace("S2,2,T1,M1,C1,Test Category,2000", "S2,2,T1,M1,C1,Test Category,2001"),
        encoding="utf-8",
    )

    with CsvDatasetLoader(invalid_path) as loader:
        loader.register_attempts()
        with pytest.raises(SessionInvariantError) as error:
            normalize_attempts_to_sessions(loader.connection)

    assert error.value.session_keys == ("S2",)


def test_fixture_coverage_is_hand_computable() -> None:
    with CsvDatasetLoader(FIXTURE_PATH) as loader:
        loader.register_attempts()
        normalize_attempts_to_sessions(loader.connection)
        coverage = compute_dataset_coverage(loader.connection)

    assert coverage.row_count == 5
    assert coverage.session_count == 4
    assert coverage.verified_session_count == 2
    assert coverage.min_created_at.isoformat() == "2026-01-01T10:00:00"
    assert coverage.max_created_at.isoformat() == "2026-01-02T10:00:00"


def test_dataset_fingerprint_is_stable_and_content_sensitive(tmp_path: Path) -> None:
    copied_path = tmp_path / "fixture.csv"
    copied_path.write_bytes(FIXTURE_PATH.read_bytes())

    first = compute_dataset_fingerprint(FIXTURE_PATH, chunk_size=17)
    second = compute_dataset_fingerprint(copied_path, chunk_size=31)
    copied_path.write_bytes(copied_path.read_bytes() + b"\n")
    changed = compute_dataset_fingerprint(copied_path)

    assert first == second
    assert len(first) == 64
    assert changed != first


def test_card_masking_never_returns_complete_identifier() -> None:
    assert mask_payer_card_key(None) is None
    assert mask_payer_card_key("") is None
    assert mask_payer_card_key("SHORT") == "********"
    assert mask_payer_card_key("CARD-TEST-0002") == "CARD********0002"

    sample = build_evidence_sample(
        {
            "session_key": "S2",
            "try_seq": 2,
            "created_at": "2026-01-01T11:00:00",
            "amount_rial": 2_000,
            "session_status": "Verified",
            "try_status": "Verified",
            "psp_code": "PSP-01",
            "payer_card_key": "CARD-TEST-0002",
        }
    )

    assert sample["payerCardMasked"] == "CARD********0002"
    assert "payer_card_key" not in sample


def test_artifact_serialization_is_stable_and_rejects_unsafe_values(
    tmp_path: Path,
) -> None:
    artifact = {"schemaVersion": "1.0", "dataset": {"rowCount": 5}}
    first = serialize_artifact(artifact)
    second = serialize_artifact({"dataset": {"rowCount": 5}, "schemaVersion": "1.0"})
    destination = write_artifact_json(artifact, tmp_path / "artifact.json")

    assert first == second
    assert json.loads(destination.read_text(encoding="utf-8")) == artifact
    with pytest.raises(ValueError):
        serialize_artifact({"value": float("nan")})
    with pytest.raises(UnsafeArtifactError):
        serialize_artifact({"payer_card_key": "CARD-TEST-0002"})


def test_formula_registry_contains_only_contract_formula_ids() -> None:
    assert set(FORMULA_REGISTRY) == {
        "session.verify_rate.v1",
        "funnel.no_attempt_share.v1",
        "funnel.retry_recovery.v1",
        "growth.revenue_decomposition.v1",
        "scenario.no_attempt_recovery.v1",
        "customer.repeat_pair_rate.v1",
        "customer.returning_share.v1",
        "peer.robust_percentile.v1",
        "time.window_lift.v1",
    }
    assert get_formula_definition("session.verify_rate.v1").grain == "session"
    with pytest.raises(KeyError):
        get_formula_definition("invented.formula.v1")


def test_sql_identifiers_are_restricted() -> None:
    assert validate_identifier("normalized_sessions") == "normalized_sessions"
    with pytest.raises(ValueError):
        validate_identifier("sessions; DROP TABLE raw_attempts")

from __future__ import annotations

from pathlib import Path

import pytest

from analytics.common import (
    CsvDatasetLoader,
    compute_dataset_coverage,
    compute_dataset_fingerprint,
    normalize_attempts_to_sessions,
)


ROOT = Path(__file__).resolve().parents[2]
FULL_DATASET_PATH = ROOT / "data" / "raw" / "challenge_data.csv"


@pytest.mark.skipif(
    not FULL_DATASET_PATH.is_file(),
    reason="Raw challenge dataset is intentionally local and Git-ignored",
)
def test_full_dataset_normalization_matches_profile() -> None:
    with CsvDatasetLoader(FULL_DATASET_PATH) as loader:
        loader.register_attempts()
        normalize_attempts_to_sessions(loader.connection)
        coverage = compute_dataset_coverage(loader.connection)
        session_flags = loader.connection.execute(
            """
            SELECT
                COUNT(*) FILTER (WHERE no_attempt),
                COUNT(*) FILTER (WHERE retried),
                COUNT(*) FILTER (WHERE recovered_after_retry),
                COUNT(DISTINCT session_key)
            FROM normalized_sessions
            """
        ).fetchone()

    assert coverage.row_count == 2_213_289
    assert coverage.session_count == 2_062_839
    assert coverage.verified_session_count == 1_025_627
    assert session_flags == (263_936, 74_685, 39_654, 2_062_839)


@pytest.mark.skipif(
    not FULL_DATASET_PATH.is_file(),
    reason="Raw challenge dataset is intentionally local and Git-ignored",
)
def test_full_dataset_fingerprint_is_sha256() -> None:
    fingerprint = compute_dataset_fingerprint(FULL_DATASET_PATH)

    assert len(fingerprint) == 64
    assert fingerprint.isascii()
    assert fingerprint.isalnum()

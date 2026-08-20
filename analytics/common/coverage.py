from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

import duckdb

from .loader import validate_identifier


@dataclass(frozen=True)
class DatasetCoverage:
    row_count: int
    session_count: int
    verified_session_count: int
    min_created_at: datetime
    max_created_at: datetime

    def to_dataset_metadata(self, fingerprint: str) -> dict[str, object]:
        return {
            "fingerprint": fingerprint,
            "rowCount": self.row_count,
            "sessionCount": self.session_count,
            "minCreatedAt": self.min_created_at.isoformat(),
            "maxCreatedAt": self.max_created_at.isoformat(),
        }


def compute_dataset_coverage(
    connection: duckdb.DuckDBPyConnection,
    *,
    attempt_view: str = "raw_attempts",
    session_view: str = "normalized_sessions",
) -> DatasetCoverage:
    safe_attempt_view = validate_identifier(attempt_view)
    safe_session_view = validate_identifier(session_view)
    row = connection.execute(
        f"""
        SELECT
            (SELECT COUNT(*) FROM {safe_attempt_view}) AS row_count,
            COUNT(*) AS session_count,
            COUNT(*) FILTER (WHERE eventual_verified) AS verified_session_count,
            MIN(created_at) AS min_created_at,
            MAX(created_at) AS max_created_at
        FROM {safe_session_view}
        """
    ).fetchone()

    if row is None or row[3] is None or row[4] is None:
        raise ValueError("Cannot compute coverage for an empty dataset")

    return DatasetCoverage(
        row_count=int(row[0]),
        session_count=int(row[1]),
        verified_session_count=int(row[2]),
        min_created_at=row[3],
        max_created_at=row[4],
    )

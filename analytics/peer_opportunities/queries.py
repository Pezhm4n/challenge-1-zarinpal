from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import duckdb


@dataclass(frozen=True, slots=True)
class PeriodMetrics:
    merchant_key: str
    category_id: str
    category_title: str
    sessions: int
    verified_sessions: int
    verified_volume_rial: int

    @property
    def verification_rate_pct(self) -> float:
        return round(self.verified_sessions / self.sessions * 100, 4) if self.sessions else 0.0

    @property
    def average_ticket_rial(self) -> float:
        return self.verified_volume_rial / self.verified_sessions if self.verified_sessions else 0.0


@dataclass(frozen=True, slots=True)
class TimeWindowAggregate:
    weekday: int
    hour: int
    sessions: int
    verified_sessions: int
    volume_rial: int

    @property
    def verification_rate_pct(self) -> float:
        return round(self.verified_sessions / self.sessions * 100, 4) if self.sessions else 0.0


def load_normalized_sessions(connection: duckdb.DuckDBPyConnection, source: Path) -> None:
    """Load Member A's normalized shape and reject attempt-grain duplicates."""

    connection.execute(
        """
        CREATE OR REPLACE TABLE normalized_sessions AS
        SELECT
            CAST(session_key AS VARCHAR) AS session_key,
            CAST(merchant_key AS VARCHAR) AS merchant_key,
            CAST(category_id AS VARCHAR) AS category_id,
            CAST(category_title AS VARCHAR) AS category_title,
            CAST(amount_rial AS BIGINT) AS amount_rial,
            CAST(created_at AS TIMESTAMP) AS created_at,
            CAST(eventual_verified AS BOOLEAN) AS eventual_verified
        FROM read_csv_auto(?, header = true)
        """,
        [str(source.resolve())],
    )
    row_count, distinct_sessions, invalid_rows = connection.execute(
        """
        SELECT
            count(*) AS row_count,
            count(DISTINCT session_key) AS distinct_sessions,
            count(*) FILTER (
                WHERE session_key IS NULL
                   OR trim(session_key) = ''
                   OR merchant_key IS NULL
                   OR trim(merchant_key) = ''
                   OR category_id IS NULL
                   OR amount_rial IS NULL
                   OR amount_rial < 0
                   OR created_at IS NULL
                   OR eventual_verified IS NULL
            ) AS invalid_rows
        FROM normalized_sessions
        """
    ).fetchone()
    if row_count != distinct_sessions:
        raise ValueError(
            "normalized session input contains duplicate session_key values; "
            "attempt-grain rows must be collapsed by analytics/common first"
        )
    if invalid_rows:
        raise ValueError("normalized session input contains null or invalid required fields")


def fetch_period_metrics(
    connection: duckdb.DuckDBPyConnection,
    period_from: str,
    period_to_exclusive: str,
) -> tuple[PeriodMetrics, ...]:
    rows = connection.execute(
        """
        SELECT
            merchant_key,
            category_id,
            any_value(category_title) AS category_title,
            count(*)::BIGINT AS sessions,
            count(*) FILTER (WHERE eventual_verified)::BIGINT AS verified_sessions,
            coalesce(sum(amount_rial) FILTER (WHERE eventual_verified), 0)::HUGEINT
                AS verified_volume_rial
        FROM normalized_sessions
        WHERE created_at >= CAST(? AS TIMESTAMP)
          AND created_at < CAST(? AS TIMESTAMP)
        GROUP BY merchant_key, category_id
        ORDER BY merchant_key
        """,
        [period_from, period_to_exclusive],
    ).fetchall()
    return tuple(
        PeriodMetrics(
            merchant_key=str(row[0]),
            category_id=str(row[1]),
            category_title=str(row[2]),
            sessions=int(row[3]),
            verified_sessions=int(row[4]),
            verified_volume_rial=int(row[5]),
        )
        for row in rows
    )


def fetch_time_windows(
    connection: duckdb.DuckDBPyConnection,
    merchant_key: str,
    period_from: str,
    period_to_exclusive: str,
) -> tuple[TimeWindowAggregate, ...]:
    rows = connection.execute(
        """
        SELECT
            extract(isodow FROM created_at)::INTEGER AS weekday,
            extract(hour FROM created_at)::INTEGER AS hour,
            count(*)::BIGINT AS sessions,
            count(*) FILTER (WHERE eventual_verified)::BIGINT AS verified_sessions,
            coalesce(sum(amount_rial) FILTER (WHERE eventual_verified), 0)::HUGEINT
                AS volume_rial
        FROM normalized_sessions
        WHERE merchant_key = ?
          AND created_at >= CAST(? AS TIMESTAMP)
          AND created_at < CAST(? AS TIMESTAMP)
        GROUP BY weekday, hour
        ORDER BY weekday, hour
        """,
        [merchant_key, period_from, period_to_exclusive],
    ).fetchall()
    return tuple(
        TimeWindowAggregate(
            weekday=int(row[0]),
            hour=int(row[1]),
            sessions=int(row[2]),
            verified_sessions=int(row[3]),
            volume_rial=int(row[4]),
        )
        for row in rows
    )


def fetch_dataset_metadata(connection: duckdb.DuckDBPyConnection) -> dict[str, Any]:
    row = connection.execute(
        """
        SELECT count(*), min(created_at), max(created_at)
        FROM normalized_sessions
        """
    ).fetchone()
    return {
        "rowCount": int(row[0]),
        "sessionCount": int(row[0]),
        "minCreatedAt": row[1].isoformat(),
        "maxCreatedAt": row[2].isoformat(),
    }


def fetch_sample_rows(
    connection: duckdb.DuckDBPyConnection,
    merchant_key: str,
    limit: int = 4,
) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT session_key, created_at, amount_rial, eventual_verified
        FROM normalized_sessions
        WHERE merchant_key = ?
        ORDER BY created_at, session_key
        LIMIT ?
        """,
        [merchant_key, limit],
    ).fetchall()
    return [
        {
            "sessionKey": str(row[0]),
            "createdAt": row[1].isoformat(),
            "amountRial": int(row[2]),
            "sessionStatus": "Verified" if row[3] else "NotVerified",
        }
        for row in rows
    ]

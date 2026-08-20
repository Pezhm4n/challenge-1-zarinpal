from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import duckdb

from analytics.common.loader import CsvDatasetLoader
from analytics.common.sessions import normalize_attempts_to_sessions

def _format_evidence_datetime(value: Any) -> str:
    return value.isoformat()


@dataclass(frozen=True, slots=True)
class PeriodMetrics:
    merchant_key: str
    category_id: str
    category_title: str
    sessions: int
    verified_sessions: int
    verified_volume_rial: int

    @property
    def verification_rate_pct(self) -> float | None:
        if self.sessions <= 0:
            return None
        return round(self.verified_sessions / self.sessions * 100, 4)

    @property
    def average_ticket_rial(self) -> float | None:
        if self.verified_sessions <= 0:
            return None
        return self.verified_volume_rial / self.verified_sessions


@dataclass(frozen=True, slots=True)
class TimeWindowAggregate:
    weekday: int
    hour: int
    sessions: int
    verified_sessions: int
    volume_rial: int

    @property
    def verification_rate_pct(self) -> float | None:
        if self.sessions <= 0:
            return None
        return round(self.verified_sessions / self.sessions * 100, 4)


def load_normalized_sessions(connection: duckdb.DuckDBPyConnection, source: Path) -> None:
    """Load a session fixture or normalize the shared attempt-grain dataset."""

    loader = CsvDatasetLoader(source, connection=connection)
    source_columns = set(loader.read_header())
    normalized_columns = {
        "session_key",
        "merchant_key",
        "category_id",
        "category_title",
        "amount_rial",
        "created_at",
        "eventual_verified",
    }

    if not normalized_columns.issubset(source_columns):
        loader.register_attempts("peer_raw_attempts")
        connection.execute(
            """
            CREATE OR REPLACE TEMP TABLE peer_source_metadata AS
            SELECT count(*)::BIGINT AS row_count
            FROM peer_raw_attempts
            """
        )
        normalize_attempts_to_sessions(
            connection,
            attempt_view="peer_raw_attempts",
            session_view="peer_common_sessions",
        )
        connection.execute(
            """
            CREATE OR REPLACE TABLE normalized_sessions AS
            SELECT
                session_key,
                merchant_key,
                category_id,
                category_title,
                amount_rial,
                created_at,
                eventual_verified
            FROM peer_common_sessions
            """
        )
        return

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
    connection.execute(
        """
        CREATE OR REPLACE TEMP TABLE peer_source_metadata AS
        SELECT count(*)::BIGINT AS row_count
        FROM normalized_sessions
        """
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
    # created_at is confirmed as Iran local time; no UTC shift is applied.
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
        SELECT
            (SELECT row_count FROM peer_source_metadata),
            count(*),
            min(created_at),
            max(created_at)
        FROM normalized_sessions
        """
    ).fetchone()
    return {
        "rowCount": int(row[0]),
        "sessionCount": int(row[1]),
        "minCreatedAt": row[2].isoformat(),
        "maxCreatedAt": row[3].isoformat(),
    }


def fetch_sample_rows(
    connection: duckdb.DuckDBPyConnection,
    merchant_key: str,
    period_from: str,
    period_to_exclusive: str,
    limit: int = 4,
) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT session_key, created_at, amount_rial, eventual_verified
        FROM normalized_sessions
        WHERE merchant_key = ?
          AND created_at >= CAST(? AS TIMESTAMP)
          AND created_at < CAST(? AS TIMESTAMP)
        ORDER BY created_at, session_key
        LIMIT ?
        """,
        [merchant_key, period_from, period_to_exclusive, limit],
    ).fetchall()
    return [
        {
            "sessionKey": str(row[0]),
            "createdAt": _format_evidence_datetime(row[1]),
            "amountRial": int(row[2]),
            "sessionStatus": "موفق" if row[3] else "ناموفق",
        }
        for row in rows
    ]


def fetch_time_window_sample_rows(
    connection: duckdb.DuckDBPyConnection,
    merchant_key: str,
    period_from: str,
    period_to_exclusive: str,
    weekday: int,
    hour: int,
    limit: int = 4,
) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT session_key, created_at, amount_rial, eventual_verified
        FROM normalized_sessions
        WHERE merchant_key = ?
          AND created_at >= CAST(? AS TIMESTAMP)
          AND created_at < CAST(? AS TIMESTAMP)
          AND extract(isodow FROM created_at)::INTEGER = ?
          AND extract(hour FROM created_at)::INTEGER = ?
        ORDER BY created_at, session_key
        LIMIT ?
        """,
        [
            merchant_key,
            period_from,
            period_to_exclusive,
            weekday,
            hour,
            limit,
        ],
    ).fetchall()
    return [
        {
            "sessionKey": str(row[0]),
            "createdAt": _format_evidence_datetime(row[1]),
            "amountRial": int(row[2]),
            "sessionStatus": "موفق" if row[3] else "ناموفق",
        }
        for row in rows
    ]

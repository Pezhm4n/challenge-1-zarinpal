from __future__ import annotations

import duckdb

from .errors import SessionInvariantError
from .loader import validate_identifier


def normalize_attempts_to_sessions(
    connection: duckdb.DuckDBPyConnection,
    *,
    attempt_view: str = "raw_attempts",
    session_view: str = "normalized_sessions",
) -> str:
    """Create one deterministic row per session_key without counting retries twice."""

    safe_attempt_view = validate_identifier(attempt_view)
    safe_session_view = validate_identifier(session_view)
    inconsistent_rows = connection.execute(
        f"""
        SELECT session_key
        FROM {safe_attempt_view}
        GROUP BY session_key
        HAVING
            COUNT(DISTINCT merchant_key) != 1
            OR COUNT(DISTINCT terminal_key) != 1
            OR COUNT(DISTINCT category_id) != 1
            OR COUNT(DISTINCT category_title) != 1
            OR COUNT(DISTINCT amount) != 1
            OR COUNT(*) FILTER (
                WHERE merchant_key IS NULL
                    OR terminal_key IS NULL
                    OR category_id IS NULL
                    OR amount IS NULL
                    OR created_at IS NULL
            ) > 0
        ORDER BY session_key
        LIMIT 10
        """
    ).fetchall()

    if inconsistent_rows:
        raise SessionInvariantError(
            tuple(str(row[0]) for row in inconsistent_rows)
        )

    connection.execute(
        f"""
        CREATE OR REPLACE TEMP VIEW {safe_session_view} AS
        WITH rolled_up AS (
            SELECT
                session_key,
                MIN(terminal_key) AS terminal_key,
                MIN(merchant_key) AS merchant_key,
                MIN(category_id) AS category_id,
                MIN(category_title) AS category_title,
                MIN(amount)::BIGINT AS amount_rial,
                MIN(created_at) AS created_at,
                MAX(COALESCE(try_created_at, created_at)) AS last_try_created_at,
                MIN(verified_at) FILTER (WHERE try_status = 'Verified') AS verified_at,
                MIN(try_seq) AS first_try_seq,
                MAX(try_seq) AS max_try_seq,
                COUNT(*) FILTER (WHERE try_seq > 0) AS attempt_count,
                ARG_MIN(try_status, try_seq) AS first_try_status,
                ARG_MAX(try_status, try_seq) AS last_try_status,
                BOOL_OR(try_status = 'Verified') AS eventual_verified,
                BOOL_OR(try_status = 'NoAttempt') AS has_no_attempt_status,
                ARG_MAX(psp_code, try_seq) FILTER (WHERE psp_code IS NOT NULL) AS psp_code,
                ARG_MAX(payer_card_key, try_seq)
                    FILTER (WHERE payer_card_key IS NOT NULL) AS payer_card_key
            FROM {safe_attempt_view}
            GROUP BY session_key
        )
        SELECT
            session_key,
            terminal_key,
            merchant_key,
            category_id,
            category_title,
            amount_rial,
            created_at,
            last_try_created_at,
            verified_at,
            first_try_seq,
            max_try_seq,
            attempt_count,
            first_try_status,
            CASE
                WHEN eventual_verified THEN 'Verified'
                WHEN max_try_seq = 0 AND has_no_attempt_status THEN 'NoAttempt'
                ELSE last_try_status
            END AS eventual_status,
            eventual_verified,
            max_try_seq = 0 AND has_no_attempt_status AS no_attempt,
            attempt_count > 1 AS retried,
            attempt_count > 1
                AND first_try_status != 'Verified'
                AND eventual_verified AS recovered_after_retry,
            psp_code,
            payer_card_key
        FROM rolled_up
        """
    )
    return safe_session_view

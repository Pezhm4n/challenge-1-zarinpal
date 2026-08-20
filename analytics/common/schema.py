from __future__ import annotations


ATTEMPT_COLUMN_TYPES: dict[str, str] = {
    "session_key": "VARCHAR",
    "try_seq": "INTEGER",
    "terminal_key": "VARCHAR",
    "merchant_key": "VARCHAR",
    "category_id": "VARCHAR",
    "category_title": "VARCHAR",
    "amount": "BIGINT",
    "adjusted_fee": "BIGINT",
    "session_status": "VARCHAR",
    "try_status": "VARCHAR",
    "switch_response_code": "VARCHAR",
    "psp_code": "VARCHAR",
    "issuer_bank_code": "VARCHAR",
    "payer_card_key": "VARCHAR",
    "verify_type": "VARCHAR",
    "init_time_ms": "BIGINT",
    "verify_time_ms": "BIGINT",
    "created_at": "TIMESTAMP",
    "try_created_at": "TIMESTAMP",
    "verified_at": "TIMESTAMP",
    "settled_at": "TIMESTAMP",
    "expire_in": "INTEGER",
}

ATTEMPT_COLUMNS: tuple[str, ...] = tuple(ATTEMPT_COLUMN_TYPES)

REQUIRED_SESSION_COLUMNS: tuple[str, ...] = (
    "session_key",
    "try_seq",
    "terminal_key",
    "merchant_key",
    "category_id",
    "category_title",
    "amount",
    "session_status",
    "try_status",
    "psp_code",
    "payer_card_key",
    "created_at",
    "try_created_at",
    "verified_at",
)

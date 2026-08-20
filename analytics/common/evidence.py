from __future__ import annotations

from datetime import date, datetime
from typing import Mapping


def mask_payer_card_key(value: object) -> str | None:
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return None
    if len(text) <= 8:
        return "********"
    return f"{text[:4]}********{text[-4:]}"


def _iso_timestamp(value: object) -> str:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    text = str(value).strip()
    if not text:
        raise ValueError("created_at is required for an evidence sample")
    return text


def build_evidence_sample(row: Mapping[str, object]) -> dict[str, object]:
    required = ("session_key", "created_at", "amount_rial")
    missing = tuple(key for key in required if row.get(key) is None)
    if missing:
        raise ValueError(f"Missing evidence sample fields: {','.join(missing)}")

    sample: dict[str, object] = {
        "sessionKey": str(row["session_key"]),
        "createdAt": _iso_timestamp(row["created_at"]),
        "amountRial": int(row["amount_rial"]),
    }

    optional_fields = {
        "try_seq": "trySeq",
        "session_status": "sessionStatus",
        "try_status": "tryStatus",
        "psp_code": "pspCode",
    }
    for source, target in optional_fields.items():
        if row.get(source) is not None:
            sample[target] = row[source]

    sample["payerCardMasked"] = mask_payer_card_key(row.get("payer_card_key"))
    return sample

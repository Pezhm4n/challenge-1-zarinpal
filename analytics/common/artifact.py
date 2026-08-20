from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Mapping

from .errors import UnsafeArtifactError


_FORBIDDEN_ARTIFACT_KEYS = {
    "payer_card_key",
    "payerCardKey",
    "issuer_bank_code",
    "issuerBankCode",
}


def _assert_artifact_safe(value: object) -> None:
    if isinstance(value, Mapping):
        forbidden = _FORBIDDEN_ARTIFACT_KEYS.intersection(value.keys())
        if forbidden:
            raise UnsafeArtifactError(
                "Artifact contains forbidden sensitive fields: "
                + ",".join(sorted(str(key) for key in forbidden))
            )
        for nested in value.values():
            _assert_artifact_safe(nested)
    elif isinstance(value, (list, tuple)):
        for nested in value:
            _assert_artifact_safe(nested)


def serialize_artifact(value: object) -> str:
    _assert_artifact_safe(value)
    return json.dumps(
        value,
        allow_nan=False,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def write_artifact_json(value: object, destination: str | Path) -> Path:
    output_path = Path(destination).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = output_path.with_suffix(output_path.suffix + ".tmp")
    temporary_path.write_text(serialize_artifact(value) + "\n", encoding="utf-8")
    os.replace(temporary_path, output_path)
    return output_path

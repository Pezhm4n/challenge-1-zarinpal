from __future__ import annotations

import hashlib
from pathlib import Path

from .errors import DatasetNotFoundError


def compute_dataset_fingerprint(
    dataset_path: str | Path,
    *,
    chunk_size: int = 1024 * 1024,
) -> str:
    """Return a stable SHA-256 digest of the exact immutable source bytes."""

    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")

    path = Path(dataset_path).resolve()
    if not path.is_file():
        raise DatasetNotFoundError(path)

    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()

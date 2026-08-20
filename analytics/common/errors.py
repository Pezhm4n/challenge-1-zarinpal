from __future__ import annotations

from pathlib import Path


class AnalyticsCommonError(Exception):
    """Base error for deterministic common analytics operations."""


class DatasetNotFoundError(AnalyticsCommonError):
    def __init__(self, path: Path) -> None:
        self.path = path
        super().__init__(f"Dataset file does not exist: {path}")


class DatasetSchemaError(AnalyticsCommonError):
    def __init__(
        self,
        *,
        missing_columns: tuple[str, ...] = (),
        unexpected_columns: tuple[str, ...] = (),
    ) -> None:
        self.missing_columns = missing_columns
        self.unexpected_columns = unexpected_columns
        details: list[str] = []
        if missing_columns:
            details.append(f"missing={','.join(missing_columns)}")
        if unexpected_columns:
            details.append(f"unexpected={','.join(unexpected_columns)}")
        super().__init__("Invalid dataset schema: " + "; ".join(details))


class SessionInvariantError(AnalyticsCommonError):
    def __init__(self, session_keys: tuple[str, ...]) -> None:
        self.session_keys = session_keys
        super().__init__(
            "Session fields merchant/category/amount must remain constant: "
            + ",".join(session_keys)
        )


class UnsafeArtifactError(AnalyticsCommonError):
    """Raised when generated artifact data contains forbidden sensitive fields."""

from __future__ import annotations

import csv
import re
from pathlib import Path

import duckdb

from .errors import DatasetNotFoundError, DatasetSchemaError
from .schema import ATTEMPT_COLUMNS, ATTEMPT_COLUMN_TYPES


_IDENTIFIER_PATTERN = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def validate_identifier(identifier: str) -> str:
    if not _IDENTIFIER_PATTERN.fullmatch(identifier):
        raise ValueError(f"Unsafe SQL identifier: {identifier}")
    return identifier


class CsvDatasetLoader:
    """Registers the immutable attempt-level CSV with an explicit DuckDB schema."""

    def __init__(
        self,
        csv_path: str | Path,
        *,
        connection: duckdb.DuckDBPyConnection | None = None,
    ) -> None:
        self.csv_path = Path(csv_path).resolve()
        self.connection = connection or duckdb.connect()
        self._owns_connection = connection is None

    def __enter__(self) -> "CsvDatasetLoader":
        return self

    def __exit__(self, exc_type: object, exc: object, traceback: object) -> None:
        self.close()

    def close(self) -> None:
        if self._owns_connection:
            self.connection.close()

    def read_header(self) -> tuple[str, ...]:
        if not self.csv_path.is_file():
            raise DatasetNotFoundError(self.csv_path)

        with self.csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.reader(handle)
            try:
                return tuple(next(reader))
            except StopIteration as error:
                raise DatasetSchemaError(missing_columns=ATTEMPT_COLUMNS) from error

    def validate_schema(self) -> tuple[str, ...]:
        header = self.read_header()
        expected = set(ATTEMPT_COLUMNS)
        actual = set(header)
        missing = tuple(column for column in ATTEMPT_COLUMNS if column not in actual)
        unexpected = tuple(column for column in header if column not in expected)

        if missing or unexpected or len(header) != len(actual):
            raise DatasetSchemaError(
                missing_columns=missing,
                unexpected_columns=unexpected,
            )
        return header

    def register_attempts(self, view_name: str = "raw_attempts") -> str:
        safe_view_name = validate_identifier(view_name)
        self.validate_schema()
        relation = self.connection.read_csv(
            str(self.csv_path),
            header=True,
            columns=ATTEMPT_COLUMN_TYPES,
            auto_detect=False,
            timestamp_format="%Y-%m-%d %H:%M:%S",
        )
        relation.create_view(safe_view_name, replace=True)
        return safe_view_name

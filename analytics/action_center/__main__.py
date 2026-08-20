from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Mapping

from analytics.common import write_artifact_json

from .compose import compose_action_center_artifact


def _read_object(path: Path) -> Mapping[str, object]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, Mapping):
        raise ValueError(f"Artifact root must be an object: {path}")
    return value


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compose validated feature artifacts into action-center.json",
    )
    parser.add_argument("--base", required=True, type=Path)
    parser.add_argument(
        "--feature",
        required=True,
        action="append",
        type=Path,
        help="Feature artifact path; repeat for B/C/D artifacts",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("public/analysis/action-center.json"),
    )
    parser.add_argument("--limit", type=int, default=3)
    args = parser.parse_args()

    artifact = compose_action_center_artifact(
        _read_object(args.base),
        [_read_object(path) for path in args.feature],
        limit=args.limit,
    )
    write_artifact_json(artifact, args.output)


if __name__ == "__main__":
    main()

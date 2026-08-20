from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Mapping

from analytics.common import write_artifact_json

from .base import build_m275_action_center_base
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
    parser.add_argument(
        "--base",
        type=Path,
        help="Optional prebuilt Action Center base; omitted for the real M275 base",
    )
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

    feature_artifacts = [_read_object(path) for path in args.feature]
    base_artifact = (
        _read_object(args.base)
        if args.base is not None
        else build_m275_action_center_base(feature_artifacts)
    )
    artifact = compose_action_center_artifact(
        base_artifact,
        feature_artifacts,
        limit=args.limit,
    )
    write_artifact_json(artifact, args.output)


if __name__ == "__main__":
    main()

from __future__ import annotations

import csv
from datetime import datetime, timedelta
from pathlib import Path


FIELDS = (
    "session_key",
    "merchant_key",
    "category_id",
    "category_title",
    "amount_rial",
    "created_at",
    "eventual_verified",
)


def _row(
    session_key: str,
    merchant_key: str,
    amount_rial: int,
    created_at: datetime,
    verified: bool,
) -> dict[str, str | int]:
    return {
        "session_key": session_key,
        "merchant_key": merchant_key,
        "category_id": "C-SHOES",
        "category_title": "کیف و کفش",
        "amount_rial": amount_rial,
        "created_at": created_at.isoformat(),
        "eventual_verified": str(verified).lower(),
    }


def build_fixture(destination: Path) -> Path:
    rows: list[dict[str, str | int]] = []

    may_start = datetime(2026, 5, 1, 9)
    for index in range(120):
        rows.append(
            _row(
                session_key=f"M275-MAY-{index:03d}",
                merchant_key="M275",
                amount_rial=1_000,
                created_at=may_start + timedelta(hours=index * 3),
                verified=index < 72,
            )
        )

    current_groups = (
        (datetime(2026, 6, 1, 10), 30, 24),
        (datetime(2026, 6, 2, 14), 30, 6),
        (datetime(2026, 6, 3, 18), 30, 15),
        (datetime(2026, 6, 4, 12), 30, 15),
        (datetime(2026, 6, 5, 9), 24, 12),
    )
    session_index = 0
    for created_at, session_count, verified_count in current_groups:
        for offset in range(session_count):
            rows.append(
                _row(
                    session_key=f"M275-JUN-{session_index:03d}",
                    merchant_key="M275",
                    amount_rial=1_100,
                    created_at=created_at + timedelta(minutes=offset),
                    verified=offset < verified_count,
                )
            )
            session_index += 1

    peer_verified_counts = (30, 40, 45, 50, 50, 55, 60, 65, 70, 75, 80, 90)
    peer_tickets = (900, 950, 1_000, 1_050, 1_100, 1_150, 1_200, 1_250, 1_300, 1_350, 1_400, 100_000)
    for peer_index, (verified_count, ticket) in enumerate(
        zip(peer_verified_counts, peer_tickets, strict=True),
        start=1,
    ):
        merchant_key = f"P{peer_index:03d}"
        peer_start = datetime(2026, 6, 6 + (peer_index % 10), 8 + (peer_index % 8))
        for offset in range(100):
            rows.append(
                _row(
                    session_key=f"{merchant_key}-JUN-{offset:03d}",
                    merchant_key=merchant_key,
                    amount_rial=ticket,
                    created_at=peer_start + timedelta(minutes=offset),
                    verified=offset < verified_count,
                )
            )

    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    return destination


if __name__ == "__main__":
    output = Path("data/fixtures/peer-opportunities-sessions.csv")
    print(build_fixture(output))

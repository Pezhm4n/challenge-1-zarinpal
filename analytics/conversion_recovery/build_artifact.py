from __future__ import annotations

import argparse
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

import duckdb

from analytics.common import (
    CsvDatasetLoader,
    build_evidence_sample,
    compute_dataset_coverage,
    compute_dataset_fingerprint,
    normalize_attempts_to_sessions,
    write_artifact_json,
)

from .formulas import (
    ZERO_DENOMINATOR,
    assess_psp_sample,
    compute_no_attempt_recovery,
    compute_retry_recovery_rate,
    safe_percentage,
)


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = PROJECT_ROOT / "data" / "raw" / "challenge_data.csv"
DEFAULT_OUTPUT = PROJECT_ROOT / "public" / "analysis" / "conversion-recovery.json"
DEFAULT_CURRENT_START = date(2026, 6, 1)
DEFAULT_CURRENT_END = date(2026, 7, 1)
DEFAULT_COMPARISON_START = date(2026, 5, 1)
DEFAULT_COMPARISON_END = date(2026, 6, 1)
DEFAULT_PUBLIC_MERCHANTS = {"M275"}
QUERY_PATH = Path(__file__).with_name("queries.sql")
STAGE_FORMULA_ID = "funnel.stage_progression.v1"

STAGE_ORDER = ("session", "attempted", "in-bank", "verified")
STAGE_LABELS = {
    "session": "Session",
    "attempted": "شروع تلاش پرداخت",
    "in-bank": "ورود به درگاه یا بانک",
    "verified": "پرداخت Verified",
}
STAGE_FILTERS: dict[str, list[dict[str, object]]] = {
    "session": [],
    "attempted": [
        {"field": "try_seq", "operator": ">", "value": 0},
    ],
    "in-bank": [
        {"field": "try_seq", "operator": ">", "value": 0},
        {
            "field": "try_status",
            "operator": "IN",
            "value": "InBank|Paid|Verified",
        },
    ],
    "verified": [
        {"field": "try_seq", "operator": ">", "value": 0},
        {"field": "try_status", "operator": "=", "value": "Verified"},
    ],
}


def _query_rows(
    connection: duckdb.DuckDBPyConnection,
    query: str,
    parameters: Iterable[object] = (),
) -> list[dict[str, Any]]:
    cursor = connection.execute(query, list(parameters))
    columns = [item[0] for item in cursor.description]
    return [dict(zip(columns, row, strict=True)) for row in cursor.fetchall()]


def _merchant_filter(
    merchants: set[str] | None,
    *,
    column: str = "merchant_key",
) -> tuple[str, list[str]]:
    if merchants is None:
        return "", []
    ordered = sorted(merchants)
    placeholders = ", ".join("?" for _ in ordered)
    return f" AND {column} IN ({placeholders})", ordered


def _period_rows(
    connection: duckdb.DuckDBPyConnection,
    period_start: date,
    period_end: date,
    merchants: set[str] | None,
) -> list[dict[str, Any]]:
    merchant_sql, merchant_parameters = _merchant_filter(merchants)
    return _query_rows(
        connection,
        f"""
        SELECT
            merchant_key,
            min(category_id) AS category_id,
            min(category_title) AS category_title,
            count(*)::BIGINT AS session_count,
            coalesce(sum(amount_rial), 0)::BIGINT AS session_amount_rial,
            count(*) FILTER (WHERE attempt_count > 0)::BIGINT AS attempted_count,
            coalesce(
                sum(amount_rial) FILTER (WHERE attempt_count > 0),
                0
            )::BIGINT AS attempted_amount_rial,
            count(*) FILTER (WHERE entered_bank)::BIGINT AS in_bank_count,
            coalesce(
                sum(amount_rial) FILTER (WHERE entered_bank),
                0
            )::BIGINT AS in_bank_amount_rial,
            count(*) FILTER (WHERE eventual_verified)::BIGINT AS verified_count,
            coalesce(
                sum(amount_rial) FILTER (WHERE eventual_verified),
                0
            )::BIGINT AS verified_amount_rial,
            count(*) FILTER (WHERE no_attempt)::BIGINT AS no_attempt_count,
            coalesce(
                sum(amount_rial) FILTER (WHERE no_attempt),
                0
            )::BIGINT AS no_attempt_amount_rial,
            count(*) FILTER (WHERE first_try_non_verified)::BIGINT
                AS first_try_non_verified_count,
            count(*) FILTER (
                WHERE first_try_non_verified AND eventual_verified
            )::BIGINT AS recovered_count,
            count(*) FILTER (
                WHERE attempt_count > 0 AND psp_code IS NULL
            )::BIGINT AS missing_psp_count,
            count(*) FILTER (WHERE eventual_status = 'Reversed')::BIGINT
                AS reversed_count
        FROM conversion_recovery_sessions
        WHERE created_at >= ? AND created_at < ?{merchant_sql}
        GROUP BY merchant_key
        ORDER BY merchant_key
        """,
        [period_start, period_end, *merchant_parameters],
    )


def _segment_rows(
    connection: duckdb.DuckDBPyConnection,
    period_start: date,
    period_end: date,
    merchants: set[str] | None,
) -> list[dict[str, Any]]:
    merchant_sql, merchant_parameters = _merchant_filter(merchants, column="s.merchant_key")
    return _query_rows(
        connection,
        f"""
        WITH attempted AS (
            SELECT s.*
            FROM conversion_recovery_sessions AS s
            WHERE
                s.created_at >= ?
                AND s.created_at < ?
                AND s.attempt_count > 0{merchant_sql}
        ),
        thresholds AS (
            SELECT
                merchant_key,
                quantile_disc(amount_rial, 0.25)::BIGINT AS q1,
                quantile_disc(amount_rial, 0.50)::BIGINT AS q2,
                quantile_disc(amount_rial, 0.75)::BIGINT AS q3
            FROM attempted
            GROUP BY merchant_key
        ),
        banded AS (
            SELECT
                a.*,
                t.q1,
                t.q2,
                t.q3,
                CASE
                    WHEN a.amount_rial <= t.q1 THEN 'low'
                    WHEN a.amount_rial <= t.q2 THEN 'lower-middle'
                    WHEN a.amount_rial <= t.q3 THEN 'upper-middle'
                    ELSE 'high'
                END AS amount_band,
                CASE
                    WHEN a.amount_rial <= t.q1 THEN 1
                    WHEN a.amount_rial <= t.q2 THEN 2
                    WHEN a.amount_rial <= t.q3 THEN 3
                    ELSE 4
                END AS band_order,
                coalesce(a.psp_code, 'UNKNOWN') AS controlled_psp_code
            FROM attempted AS a
            INNER JOIN thresholds AS t USING (merchant_key)
        ),
        band_baselines AS (
            SELECT
                merchant_key,
                amount_band,
                count(*)::BIGINT AS baseline_sessions,
                count(*) FILTER (WHERE eventual_verified)::BIGINT
                    AS baseline_verified
            FROM banded
            GROUP BY merchant_key, amount_band
        ),
        psp_totals AS (
            SELECT
                merchant_key,
                controlled_psp_code,
                count(*)::BIGINT AS overall_psp_sessions
            FROM banded
            GROUP BY merchant_key, controlled_psp_code
        ),
        amount_segments AS (
            SELECT
                b.merchant_key,
                'amount-band' AS dimension,
                b.amount_band AS segment_key,
                b.amount_band,
                min(b.band_order)::INTEGER AS band_order,
                count(*)::BIGINT AS sessions,
                count(*) FILTER (WHERE b.eventual_verified)::BIGINT AS verified,
                NULL::BIGINT AS overall_psp_sessions,
                count(*)::BIGINT AS baseline_sessions,
                count(*) FILTER (WHERE b.eventual_verified)::BIGINT
                    AS baseline_verified,
                min(b.q1)::BIGINT AS q1,
                min(b.q2)::BIGINT AS q2,
                min(b.q3)::BIGINT AS q3
            FROM banded AS b
            GROUP BY b.merchant_key, b.amount_band
        ),
        psp_segments AS (
            SELECT
                b.merchant_key,
                'psp' AS dimension,
                b.controlled_psp_code || '|' || b.amount_band AS segment_key,
                b.amount_band,
                min(b.band_order)::INTEGER AS band_order,
                count(*)::BIGINT AS sessions,
                count(*) FILTER (WHERE b.eventual_verified)::BIGINT AS verified,
                max(p.overall_psp_sessions)::BIGINT AS overall_psp_sessions,
                max(base.baseline_sessions)::BIGINT AS baseline_sessions,
                max(base.baseline_verified)::BIGINT AS baseline_verified,
                min(b.q1)::BIGINT AS q1,
                min(b.q2)::BIGINT AS q2,
                min(b.q3)::BIGINT AS q3
            FROM banded AS b
            INNER JOIN psp_totals AS p
                ON p.merchant_key = b.merchant_key
                AND p.controlled_psp_code = b.controlled_psp_code
            INNER JOIN band_baselines AS base
                ON base.merchant_key = b.merchant_key
                AND base.amount_band = b.amount_band
            GROUP BY b.merchant_key, b.controlled_psp_code, b.amount_band
        )
        SELECT * FROM amount_segments
        UNION ALL
        SELECT * FROM psp_segments
        ORDER BY merchant_key, dimension, band_order, segment_key
        """,
        [period_start, period_end, *merchant_parameters],
    )


def _sample_rows(
    connection: duckdb.DuckDBPyConnection,
    period_start: date,
    period_end: date,
    merchants: set[str] | None,
) -> dict[str, dict[str, list[dict[str, object]]]]:
    merchant_sql, merchant_parameters = _merchant_filter(merchants)
    rows = _query_rows(
        connection,
        f"""
        SELECT
            merchant_key,
            session_key,
            created_at,
            amount_rial,
            eventual_status AS session_status,
            eventual_status AS try_status,
            psp_code,
            payer_card_key,
            no_attempt,
            attempt_count,
            entered_bank,
            eventual_verified,
            first_try_non_verified
        FROM conversion_recovery_sessions
        WHERE created_at >= ? AND created_at < ?{merchant_sql}
        ORDER BY merchant_key, created_at, session_key
        """,
        [period_start, period_end, *merchant_parameters],
    )

    samples: dict[str, dict[str, list[dict[str, object]]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for row in rows:
        merchant_key = str(row["merchant_key"])
        scopes = ["session"]
        if bool(row["no_attempt"]):
            scopes.append("no-attempt")
        if int(row["attempt_count"]) > 0:
            scopes.append("attempted")
        if bool(row["entered_bank"]):
            scopes.append("in-bank")
        if bool(row["eventual_verified"]):
            scopes.append("verified")
        if bool(row["first_try_non_verified"]):
            scopes.append("retry")
        if str(row["session_status"]) == "Reversed":
            scopes.append("reversed")

        sample = build_evidence_sample(row)
        for scope in scopes:
            if len(samples[merchant_key][scope]) < 3:
                samples[merchant_key][scope].append(sample)
    return samples


def _metric(
    value: int | float,
    unit: str,
    label_fa: str,
    *,
    kind: str = "actual",
    precision: int = 0,
) -> dict[str, object]:
    return {
        "value": value,
        "unit": unit,
        "labelFa": label_fa,
        "kind": kind,
        "displayPrecision": precision,
    }


def _selection(
    merchant_key: str,
    current_start: date,
    current_end: date,
    comparison_start: date,
    comparison_end: date,
) -> dict[str, object]:
    return {
        "merchantKey": merchant_key,
        "period": {
            "from": current_start.isoformat(),
            "to": (current_end - timedelta(days=1)).isoformat(),
        },
        "comparison": {
            "from": comparison_start.isoformat(),
            "to": (comparison_end - timedelta(days=1)).isoformat(),
        },
    }


def _base_filters(
    merchant_key: str,
    current_start: date,
    current_end: date,
) -> list[dict[str, object]]:
    return [
        {"field": "merchant_key", "operator": "=", "value": merchant_key},
        {
            "field": "created_at",
            "operator": ">=",
            "value": current_start.isoformat(),
        },
        {
            "field": "created_at",
            "operator": "<",
            "value": current_end.isoformat(),
        },
    ]


def _zero_quality(denominator: int) -> list[dict[str, str]]:
    if denominator != 0:
        return []
    return [
        {
            "severity": "warning",
            "code": ZERO_DENOMINATOR,
            "messageFa": "مخرج این نرخ صفر است؛ مقدار نرخ عمداً خالی نمایش داده می‌شود.",
        }
    ]


def _evidence(
    *,
    evidence_id: str,
    formula_id: str,
    title_fa: str,
    explanation_fa: str,
    grain: str,
    source_columns: list[str],
    filters: list[dict[str, object]],
    selection: dict[str, object],
    formula_fa: str,
    result: dict[str, object] | None,
    fingerprint: str,
    sample_rows: list[dict[str, object]],
    numerator: tuple[str, int | float] | None = None,
    denominator: tuple[str, int | float] | None = None,
    baseline: dict[str, object] | None = None,
    controls: list[str] | None = None,
    assumptions: list[str] | None = None,
    limitations: list[str] | None = None,
    data_quality: list[dict[str, str]] | None = None,
) -> dict[str, object]:
    record: dict[str, object] = {
        "id": evidence_id,
        "formulaId": formula_id,
        "titleFa": title_fa,
        "explanationFa": explanation_fa,
        "grain": grain,
        "sourceColumns": source_columns,
        "filters": filters,
        "period": selection["period"],
        "comparisonPeriod": selection["comparison"],
        "formulaFa": formula_fa,
        "result": result,
        "controls": controls or [],
        "assumptions": assumptions or [],
        "limitations": limitations or [],
        "dataQuality": data_quality or [],
        "sampleRows": sample_rows,
        "datasetFingerprint": fingerprint,
    }
    if numerator is not None:
        record["numerator"] = {"labelFa": numerator[0], "value": numerator[1]}
    if denominator is not None:
        record["denominator"] = {
            "labelFa": denominator[0],
            "value": denominator[1],
        }
    if baseline is not None:
        record["baseline"] = baseline
    return record


def _stage_evidence(
    *,
    merchant_key: str,
    funnel: list[dict[str, object]],
    selection: dict[str, object],
    fingerprint: str,
    samples: dict[str, list[dict[str, object]]],
    current_start: date,
    current_end: date,
) -> list[dict[str, object]]:
    common_limitations = [
        "Paid فقط عبور از Stage درگاه/بانک است و Verified یا فروش موفق محسوب نمی‌شود.",
        "از Reversed هیچ موفقیت یا Stage جدیدی استنباط نشده است.",
    ]
    records: list[dict[str, object]] = []
    previous: dict[str, object] | None = None
    for stage in funnel:
        stage_key = str(stage["stage"])
        stage_label = STAGE_LABELS[stage_key]
        filters = [
            *_base_filters(merchant_key, current_start, current_end),
            *STAGE_FILTERS[stage_key],
        ]
        count = int(stage["count"])
        amount = int(stage["amountRial"])
        stage_samples = samples.get(stage_key, [])
        records.append(
            _evidence(
                evidence_id=f"recovery-{merchant_key}-funnel-{stage_key}-count",
                formula_id=STAGE_FORMULA_ID,
                title_fa=f"تعداد {stage_label}",
                explanation_fa=(
                    "پس از Deduplicate کردن Retryها، هر session_key حداکثر یک‌بار "
                    "در این Stage شمرده شده است."
                ),
                grain="session",
                source_columns=["session_key", "try_seq", "try_status", "created_at"],
                filters=filters,
                selection=selection,
                formula_fa="COUNT(DISTINCT session_key) پس از اعمال فیلتر Stage",
                result=_metric(count, "count", f"تعداد {stage_label}"),
                fingerprint=fingerprint,
                sample_rows=stage_samples,
                controls=["Session-level deduplication", "Nested stage invariant"],
                limitations=common_limitations,
            )
        )
        records.append(
            _evidence(
                evidence_id=f"recovery-{merchant_key}-funnel-{stage_key}-amount",
                formula_id=STAGE_FORMULA_ID,
                title_fa=f"مبلغ درخواستی {stage_label}",
                explanation_fa=(
                    "amount_rial از normalized_sessions گرفته شده و برای هر Session "
                    "در این Stage دقیقاً یک‌بار جمع شده است."
                ),
                grain="session",
                source_columns=["session_key", "amount", "try_seq", "try_status", "created_at"],
                filters=filters,
                selection=selection,
                formula_fa="SUM(normalized_sessions.amount_rial) پس از فیلتر Stage",
                result=_metric(amount, "rial", f"مبلغ {stage_label}"),
                fingerprint=fingerprint,
                sample_rows=stage_samples,
                controls=["Amount once per unique session_key"],
                assumptions=["واحد amount ریال است."],
                limitations=common_limitations,
            )
        )
        if previous is not None:
            denominator = int(previous["count"])
            rate = safe_percentage(count, denominator)
            records.append(
                _evidence(
                    evidence_id=f"recovery-{merchant_key}-funnel-{stage_key}-rate",
                    formula_id=STAGE_FORMULA_ID,
                    title_fa=f"نرخ عبور به {stage_label}",
                    explanation_fa=(
                        f"Sessionهای Stage {stage_label} بر Sessionهای Stage "
                        f"{STAGE_LABELS[str(previous['stage'])]} تقسیم شده‌اند."
                    ),
                    grain="session",
                    source_columns=["session_key", "try_seq", "try_status", "created_at"],
                    filters=filters,
                    selection=selection,
                    numerator=(f"Sessionهای {stage_label}", count),
                    denominator=(
                        f"Sessionهای {STAGE_LABELS[str(previous['stage'])]}",
                        denominator,
                    ),
                    formula_fa="Stage جاری ÷ Stage قبلی × ۱۰۰",
                    result=(
                        _metric(rate.value, "percent", f"نرخ عبور به {stage_label}", precision=2)
                        if rate.value is not None
                        else None
                    ),
                    fingerprint=fingerprint,
                    sample_rows=stage_samples,
                    controls=["Nested stage invariant", "Session-level deduplication"],
                    limitations=common_limitations,
                    data_quality=_zero_quality(denominator),
                )
            )
        previous = stage
    return records


def _empty_period_row(merchant_key: str) -> dict[str, object]:
    return {
        "merchant_key": merchant_key,
        "session_count": 0,
        "session_amount_rial": 0,
        "attempted_count": 0,
        "attempted_amount_rial": 0,
        "in_bank_count": 0,
        "in_bank_amount_rial": 0,
        "verified_count": 0,
        "verified_amount_rial": 0,
        "no_attempt_count": 0,
        "no_attempt_amount_rial": 0,
        "first_try_non_verified_count": 0,
        "recovered_count": 0,
        "missing_psp_count": 0,
        "reversed_count": 0,
    }


def _validate_funnel(funnel: list[dict[str, object]]) -> None:
    counts = [int(stage["count"]) for stage in funnel]
    amounts = [int(stage["amountRial"]) for stage in funnel]
    if any(later > earlier for earlier, later in zip(counts, counts[1:])):
        raise ValueError("Funnel stages must be nested by session count")
    if any(later > earlier for earlier, later in zip(amounts, amounts[1:])):
        raise ValueError("Funnel stages must be nested by session amount")


def _merchant_payload(
    *,
    current: dict[str, Any],
    comparison: dict[str, Any],
    segment_rows: list[dict[str, Any]],
    samples: dict[str, list[dict[str, object]]],
    fingerprint: str,
    current_start: date,
    current_end: date,
    comparison_start: date,
    comparison_end: date,
) -> dict[str, object]:
    merchant_key = str(current["merchant_key"])
    selection = _selection(
        merchant_key,
        current_start,
        current_end,
        comparison_start,
        comparison_end,
    )

    stage_values = [
        ("session", int(current["session_count"]), int(current["session_amount_rial"])),
        ("attempted", int(current["attempted_count"]), int(current["attempted_amount_rial"])),
        ("in-bank", int(current["in_bank_count"]), int(current["in_bank_amount_rial"])),
        ("verified", int(current["verified_count"]), int(current["verified_amount_rial"])),
    ]
    funnel: list[dict[str, object]] = []
    previous_count: int | None = None
    for stage_key, count, amount in stage_values:
        rate = safe_percentage(count, previous_count) if previous_count is not None else None
        funnel.append(
            {
                "stage": stage_key,
                "count": count,
                "amountRial": amount,
                "rateFromPrevious": rate.value if rate is not None else None,
                "evidenceIds": {
                    "count": f"recovery-{merchant_key}-funnel-{stage_key}-count",
                    "amount": f"recovery-{merchant_key}-funnel-{stage_key}-amount",
                    "rate": (
                        f"recovery-{merchant_key}-funnel-{stage_key}-rate"
                        if previous_count is not None
                        else None
                    ),
                },
            }
        )
        previous_count = count
    _validate_funnel(funnel)

    no_attempt_sessions = int(current["no_attempt_count"])
    session_count = int(current["session_count"])
    no_attempt_rate = safe_percentage(no_attempt_sessions, session_count)
    first_try_non_verified = int(current["first_try_non_verified_count"])
    recovered_sessions = int(current["recovered_count"])
    retry_rate = compute_retry_recovery_rate(
        first_try_non_verified_sessions=first_try_non_verified,
        recovered_sessions=recovered_sessions,
    )

    scenario_result = compute_no_attempt_recovery(
        current_sessions=session_count,
        current_no_attempt_sessions=no_attempt_sessions,
        current_attempted_sessions=int(current["attempted_count"]),
        current_verified_sessions=int(current["verified_count"]),
        current_verified_volume_rial=int(current["verified_amount_rial"]),
        comparison_sessions=int(comparison["session_count"]),
        comparison_no_attempt_sessions=int(comparison["no_attempt_count"]),
    )

    evidence = _stage_evidence(
        merchant_key=merchant_key,
        funnel=funnel,
        selection=selection,
        fingerprint=fingerprint,
        samples=samples,
        current_start=current_start,
        current_end=current_end,
    )
    base_filters = _base_filters(merchant_key, current_start, current_end)
    no_attempt_filters = [
        *base_filters,
        {"field": "max(try_seq)", "operator": "=", "value": 0},
        {"field": "try_status", "operator": "=", "value": "NoAttempt"},
    ]
    no_attempt_samples = samples.get("no-attempt", [])
    evidence.extend(
        [
            _evidence(
                evidence_id=f"recovery-{merchant_key}-no-attempt-count",
                formula_id="funnel.no_attempt_share.v1",
                title_fa="تعداد Session بدون شروع پرداخت",
                explanation_fa="NoAttempt در سطح Session و پس از بررسی max(try_seq)=0 محاسبه شده است.",
                grain="session",
                source_columns=["session_key", "try_seq", "try_status", "created_at"],
                filters=no_attempt_filters,
                selection=selection,
                formula_fa="COUNT(DISTINCT session_key) برای NoAttempt",
                result=_metric(no_attempt_sessions, "count", "Sessionهای NoAttempt"),
                fingerprint=fingerprint,
                sample_rows=no_attempt_samples,
            ),
            _evidence(
                evidence_id=f"recovery-{merchant_key}-no-attempt-share",
                formula_id="funnel.no_attempt_share.v1",
                title_fa="سهم NoAttempt از Sessionها",
                explanation_fa="Sessionهای بدون تلاش پرداخت بر تمام Sessionهای دوره تقسیم شده‌اند.",
                grain="session",
                source_columns=["session_key", "try_seq", "try_status", "created_at"],
                filters=no_attempt_filters,
                selection=selection,
                numerator=("Sessionهای NoAttempt", no_attempt_sessions),
                denominator=("تمام Sessionها", session_count),
                formula_fa="NoAttempt Session ÷ تمام Session × ۱۰۰",
                result=(
                    _metric(no_attempt_rate.value, "percent", "سهم NoAttempt", precision=2)
                    if no_attempt_rate.value is not None
                    else None
                ),
                fingerprint=fingerprint,
                sample_rows=no_attempt_samples,
                data_quality=_zero_quality(session_count),
            ),
            _evidence(
                evidence_id=f"recovery-{merchant_key}-no-attempt-amount",
                formula_id="funnel.no_attempt_share.v1",
                title_fa="مبلغ درخواستی Sessionهای NoAttempt",
                explanation_fa="مبلغ هر Session بدون تلاش پرداخت فقط یک‌بار جمع شده است.",
                grain="session",
                source_columns=["session_key", "amount", "try_seq", "try_status", "created_at"],
                filters=no_attempt_filters,
                selection=selection,
                formula_fa="SUM(normalized_sessions.amount_rial) برای NoAttempt",
                result=_metric(
                    int(current["no_attempt_amount_rial"]),
                    "rial",
                    "مبلغ درخواستی NoAttempt",
                ),
                fingerprint=fingerprint,
                sample_rows=no_attempt_samples,
                assumptions=["واحد amount ریال است."],
            ),
        ]
    )

    retry_filters = [
        *base_filters,
        {"field": "try_seq", "operator": ">", "value": 0},
        {"field": "first_try_status", "operator": "!=", "value": "Verified"},
    ]
    retry_samples = samples.get("retry", [])
    evidence.extend(
        [
            _evidence(
                evidence_id=f"recovery-{merchant_key}-retry-eligible-count",
                formula_id="funnel.retry_recovery.v1",
                title_fa="Sessionهای واجد بازیابی Retry",
                explanation_fa="تمام Sessionهای attempted که نخستین تلاش آن‌ها Verified نبوده است.",
                grain="session",
                source_columns=["session_key", "try_seq", "try_status", "created_at"],
                filters=retry_filters,
                selection=selection,
                formula_fa="COUNT(DISTINCT session_key) با first try غیرVerified",
                result=_metric(first_try_non_verified, "count", "Sessionهای واجد Retry"),
                fingerprint=fingerprint,
                sample_rows=retry_samples,
            ),
            _evidence(
                evidence_id=f"recovery-{merchant_key}-retry-recovered-count",
                formula_id="funnel.retry_recovery.v1",
                title_fa="Sessionهای بازیابی‌شده پس از تلاش اول",
                explanation_fa="زیرمجموعه Sessionهای واجد Retry که در نهایت Verified شده‌اند.",
                grain="session",
                source_columns=["session_key", "try_seq", "try_status", "verified_at", "created_at"],
                filters=[
                    *retry_filters,
                    {"field": "try_status", "operator": "ANY=", "value": "Verified"},
                ],
                selection=selection,
                formula_fa="COUNT(DISTINCT session_key) با first try غیرVerified و eventual Verified",
                result=_metric(recovered_sessions, "count", "Sessionهای بازیابی‌شده"),
                fingerprint=fingerprint,
                sample_rows=retry_samples,
                limitations=["فقط Verified موفقیت است؛ Paid و Reversed بازیابی محسوب نمی‌شوند."],
            ),
            _evidence(
                evidence_id=f"recovery-{merchant_key}-retry-rate",
                formula_id="funnel.retry_recovery.v1",
                title_fa="نرخ بازیابی پس از تلاش اول ناموفق",
                explanation_fa="بازیابی‌شده‌ها زیرمجموعه همه Sessionهای first-try-non-verified هستند.",
                grain="session",
                source_columns=["session_key", "try_seq", "try_status", "verified_at", "created_at"],
                filters=retry_filters,
                selection=selection,
                numerator=("Sessionهای بازیابی‌شده", recovered_sessions),
                denominator=("Sessionهای first-try-non-verified", first_try_non_verified),
                formula_fa="Recovered Session ÷ first-try-non-verified Session × ۱۰۰",
                result=(
                    _metric(retry_rate.value, "percent", "نرخ بازیابی Retry", precision=2)
                    if retry_rate.value is not None
                    else None
                ),
                fingerprint=fingerprint,
                sample_rows=retry_samples,
                limitations=["فقط Verified موفقیت است؛ Paid و Reversed بازیابی محسوب نمی‌شوند."],
                data_quality=_zero_quality(first_try_non_verified),
            ),
        ]
    )

    segments: list[dict[str, object]] = []
    for segment in segment_rows:
        dimension = str(segment["dimension"])
        key = str(segment["segment_key"])
        sessions = int(segment["sessions"])
        verified = int(segment["verified"])
        raw_rate = safe_percentage(verified, sessions)
        quality_codes: tuple[str, ...] = ()
        eligible = True
        baseline_rate = None
        if dimension == "psp":
            assessment = assess_psp_sample(
                overall_sessions=int(segment["overall_psp_sessions"]),
                amount_band_sessions=sessions,
            )
            quality_codes = assessment.data_quality_codes
            eligible = assessment.eligible and not key.startswith("UNKNOWN|")
            if key.startswith("UNKNOWN|"):
                quality_codes = (*quality_codes, "MISSING_PSP")
            baseline_rate = safe_percentage(
                int(segment["baseline_verified"]),
                int(segment["baseline_sessions"]),
            )

        verify_pct = raw_rate.value if eligible else None
        peer_or_baseline = (
            baseline_rate.value
            if eligible and baseline_rate is not None
            else None
        )
        evidence_id = f"recovery-{merchant_key}-segment-{dimension}-{key}"
        quality_notes = [
            {
                "severity": "warning",
                "code": code,
                "messageFa": (
                    "این مقایسه به حداقل نمونه PSP=100 و cell=25 نرسیده یا PSP مفقود است؛ "
                    "بنابراین نرخ، رتبه و پیشنهاد عددی نمایش داده نمی‌شود."
                ),
            }
            for code in quality_codes
        ]
        filters = [
            *base_filters,
            {"field": "try_seq", "operator": ">", "value": 0},
            {"field": "amount_band", "operator": "=", "value": str(segment["amount_band"])},
        ]
        if dimension == "psp":
            filters.append(
                {"field": "psp_code", "operator": "=", "value": key.split("|", 1)[0]}
            )
        controls = [
            (
                "Amount bands are merchant-period quartiles: "
                f"q1={int(segment['q1'])}, q2={int(segment['q2'])}, q3={int(segment['q3'])} rial"
            )
        ]
        if dimension == "psp":
            controls.append("Minimum 100 attempted sessions per PSP and 25 per PSP×amount-band")
        evidence.append(
            _evidence(
                evidence_id=evidence_id,
                formula_id="session.verify_rate.v1",
                title_fa=(
                    f"نرخ Verified در سگمنت PSP و مبلغ {key}"
                    if dimension == "psp"
                    else f"نرخ Verified در بازه مبلغ {key}"
                ),
                explanation_fa=(
                    "مقایسه PSP فقط پس از کنترل بازه مبلغ و حداقل نمونه معتبر است."
                    if dimension == "psp"
                    else "این نرخ، baseline همان بازه مبلغ برای PSPها را می‌سازد."
                ),
                grain="session",
                source_columns=["session_key", "amount", "psp_code", "try_status", "created_at"],
                filters=filters,
                selection=selection,
                numerator=("Sessionهای Verified", verified),
                denominator=("Sessionهای attempted سگمنت", sessions),
                formula_fa="Verified Session ÷ attempted Session در cell × ۱۰۰",
                result=(
                    _metric(verify_pct, "percent", "نرخ Verified سگمنت", precision=2)
                    if verify_pct is not None
                    else None
                ),
                baseline=(
                    {
                        "type": "same-amount-band",
                        "value": peer_or_baseline,
                        "sampleSize": int(segment["baseline_sessions"]),
                    }
                    if peer_or_baseline is not None
                    else None
                ),
                fingerprint=fingerprint,
                sample_rows=[],
                controls=controls,
                limitations=["این مقایسه توصیفی است و رابطه علّی PSP با موفقیت را اثبات نمی‌کند."],
                data_quality=quality_notes,
            )
        )
        segments.append(
            {
                "dimension": dimension,
                "key": key,
                "sessions": sessions,
                "verifyPct": verify_pct,
                "peerOrBaselinePct": peer_or_baseline,
                "quality": "sufficient" if eligible else "insufficient-data",
                "dataQualityCodes": list(quality_codes),
                "evidenceId": evidence_id,
            }
        )

    scenarios: list[dict[str, object]] = []
    if scenario_result.data_quality_code is None:
        assert scenario_result.baseline_no_attempt_share_pct is not None
        assert scenario_result.attempted_conversion_pct is not None
        assert scenario_result.estimated_orders is not None
        assert scenario_result.estimated_volume_rial is not None
        current_share = no_attempt_rate.value
        assert current_share is not None
        scenario_id = f"recovery-{merchant_key}-no-attempt-scenario"
        order_evidence_id = f"recovery-{merchant_key}-scenario-orders"
        volume_evidence_id = f"recovery-{merchant_key}-scenario-volume"
        scenarios.append(
            {
                "id": scenario_id,
                "titleFa": "بازگشت NoAttempt به خط مبنای دوره قبل",
                "lever": "checkout-to-gateway-entry",
                "baseline": current_share,
                "target": scenario_result.baseline_no_attempt_share_pct,
                "estimatedOrders": scenario_result.estimated_orders,
                "estimatedVolumeRial": scenario_result.estimated_volume_rial,
                "confidence": "medium",
                "isCausalClaim": False,
                "evidenceId": volume_evidence_id,
                "evidenceIds": {
                    "orders": order_evidence_id,
                    "volume": volume_evidence_id,
                },
            }
        )
        scenario_quality = [
            {
                "severity": "info",
                "code": "NON_CAUSAL_SCENARIO",
                "messageFa": "این خروجی سناریوی برآوردی است؛ رابطه علّی یا تضمین فروش نیست.",
            }
        ]
        scenario_controls = [
            "Baseline is the comparison-period NoAttempt share",
            "Attempted conversion is fixed at the current-period observed rate",
            "Average ticket uses current-period Verified sessions only",
        ]
        scenario_assumptions = [
            "NoAttempt مازاد تا خط مبنای دوره قبل کاهش می‌یابد.",
            "نرخ تبدیل attempted و متوسط مبلغ Verified ثابت فرض می‌شوند.",
        ]
        scenario_limitations = [
            "سناریو غیرعلّی، غیرتضمینی و بدون کنترل مداخله‌های هم‌زمان است.",
            "فروش و مبلغ موفق فقط از try_status=Verified محاسبه شده‌اند.",
        ]
        baseline = {
            "type": "comparison-period-no-attempt-share",
            "value": scenario_result.baseline_no_attempt_share_pct,
            "sampleSize": int(comparison["session_count"]),
        }
        scenario_filters = [*base_filters]
        evidence.extend(
            [
                _evidence(
                    evidence_id=order_evidence_id,
                    formula_id="scenario.no_attempt_recovery.v1",
                    title_fa="سفارش بالقوه در سناریوی کاهش NoAttempt",
                    explanation_fa="NoAttempt مازاد بر خط مبنای دوره قبل در نرخ تبدیل attempted جاری ضرب شده است.",
                    grain="merchant-period",
                    source_columns=["session_key", "try_seq", "try_status", "amount", "created_at"],
                    filters=scenario_filters,
                    selection=selection,
                    formula_fa="MAX(0, NoAttempt جاری − Session جاری × سهم مبنا) × نرخ تبدیل attempted",
                    result=_metric(
                        scenario_result.estimated_orders,
                        "count",
                        "سفارش بالقوه",
                        kind="estimate",
                    ),
                    baseline=baseline,
                    fingerprint=fingerprint,
                    sample_rows=no_attempt_samples,
                    controls=scenario_controls,
                    assumptions=scenario_assumptions,
                    limitations=scenario_limitations,
                    data_quality=scenario_quality,
                ),
                _evidence(
                    evidence_id=volume_evidence_id,
                    formula_id="scenario.no_attempt_recovery.v1",
                    title_fa="حجم بالقوه در سناریوی کاهش NoAttempt",
                    explanation_fa="سفارش بالقوه در متوسط مبلغ Sessionهای Verified دوره جاری ضرب شده است.",
                    grain="merchant-period",
                    source_columns=["session_key", "try_seq", "try_status", "amount", "created_at"],
                    filters=scenario_filters,
                    selection=selection,
                    numerator=("سفارش بالقوه گرد‌شده", scenario_result.estimated_orders),
                    formula_fa="سفارش بالقوه دقیق × متوسط amount Sessionهای Verified جاری",
                    result=_metric(
                        scenario_result.estimated_volume_rial,
                        "rial",
                        "پتانسیل برآوردی و غیرتضمینی",
                        kind="estimate",
                    ),
                    baseline=baseline,
                    fingerprint=fingerprint,
                    sample_rows=no_attempt_samples,
                    controls=scenario_controls,
                    assumptions=scenario_assumptions,
                    limitations=scenario_limitations,
                    data_quality=scenario_quality,
                ),
            ]
        )

    current_conversion = safe_percentage(
        int(current["verified_count"]),
        session_count,
    )
    comparison_conversion = safe_percentage(
        int(comparison["verified_count"]),
        int(comparison["session_count"]),
    )
    comparison_no_attempt = safe_percentage(
        int(comparison["no_attempt_count"]),
        int(comparison["session_count"]),
    )
    if scenario_result.data_quality_code is not None:
        insight = {
            "id": f"recovery-no-attempt-{merchant_key}",
            "feature": "recovery",
            "priority": 1,
            "status": "insufficient-data",
            "titleFa": "برای برآورد فرصت بازیابی داده کافی نیست",
            "findingFa": "حداقل یکی از مخرج‌های Session، attempted، Verified یا دوره مقایسه صفر است.",
            "actionFa": "پس از تکمیل یک دوره جاری و یک دوره مقایسه معتبر، تحلیل را دوباره اجرا کنید.",
            "impact": None,
            "confidence": "low",
            "confidenceReasonFa": "ZERO_DENOMINATOR مانع ساخت Recommendation عددی شده است.",
            "evidenceId": f"recovery-{merchant_key}-no-attempt-share",
            "destination": "/recovery",
        }
    else:
        assert no_attempt_rate.value is not None
        assert comparison_no_attempt.value is not None
        assert current_conversion.value is not None
        assert comparison_conversion.value is not None
        assert scenario_result.estimated_volume_rial is not None
        insight = {
            "id": f"recovery-no-attempt-{merchant_key}",
            "feature": "recovery",
            "priority": 1,
            "status": (
                "opportunity"
                if no_attempt_rate.value > comparison_no_attempt.value
                else "stable"
            ),
            "titleFa": (
                "افت اصلی پیش از شروع پرداخت دیده می‌شود"
                if no_attempt_rate.value > comparison_no_attempt.value
                else "NoAttempt از خط مبنای دوره قبل بالاتر نیست"
            ),
            "findingFa": (
                f"سهم NoAttempt از {comparison_no_attempt.value:.2f}٪ به "
                f"{no_attempt_rate.value:.2f}٪ و Conversion از "
                f"{comparison_conversion.value:.2f}٪ به {current_conversion.value:.2f}٪ رسیده است."
            ),
            "actionFa": "مسیر Checkout تا آغاز درگاه را پایش و نرخ NoAttempt دوره بعد را با همین خط مبنا مقایسه کنید.",
            "impact": _metric(
                scenario_result.estimated_volume_rial,
                "rial",
                "پتانسیل برآوردی و غیرتضمینی",
                kind="estimate",
            ),
            "confidence": "medium",
            "confidenceReasonFa": "محاسبه قطعی است، اما سناریوی بازیابی ادعای علّی یا تضمین فروش نیست.",
            "evidenceId": f"recovery-{merchant_key}-scenario-volume",
            "destination": "/recovery",
        }

    evidence_ids = [str(row["id"]) for row in evidence]
    if len(evidence_ids) != len(set(evidence_ids)):
        raise ValueError(f"Duplicate evidence ID for merchant {merchant_key}")

    return {
        "selection": selection,
        "funnel": funnel,
        "noAttempt": {
            "sessions": no_attempt_sessions,
            "sharePct": no_attempt_rate.value,
            "requestedAmountRial": int(current["no_attempt_amount_rial"]),
            "evidenceIds": {
                "sessions": f"recovery-{merchant_key}-no-attempt-count",
                "share": f"recovery-{merchant_key}-no-attempt-share",
                "amount": f"recovery-{merchant_key}-no-attempt-amount",
            },
        },
        "retry": {
            "firstTryNonVerifiedSessions": first_try_non_verified,
            "recoveredSessions": recovered_sessions,
            "recoveryPct": retry_rate.value,
            "evidenceIds": {
                "eligible": f"recovery-{merchant_key}-retry-eligible-count",
                "recovered": f"recovery-{merchant_key}-retry-recovered-count",
                "rate": f"recovery-{merchant_key}-retry-rate",
            },
        },
        "segments": segments,
        "scenarios": scenarios,
        "insights": [insight],
        "evidence": evidence,
        "diagnostics": {
            "missingPspAttemptedSessions": int(current["missing_psp_count"]),
            "reversedSessionsExcludedFromSuccess": int(current["reversed_count"]),
        },
    }


def build_artifact(
    input_path: Path,
    output_path: Path,
    *,
    current_start: date = DEFAULT_CURRENT_START,
    current_end: date = DEFAULT_CURRENT_END,
    comparison_start: date = DEFAULT_COMPARISON_START,
    comparison_end: date = DEFAULT_COMPARISON_END,
    merchants: set[str] | None = None,
    generated_at: datetime | None = None,
) -> dict[str, object]:
    input_path = input_path.resolve()
    output_path = output_path.resolve()
    if current_start >= current_end or comparison_start >= comparison_end:
        raise ValueError("Period start must be earlier than period end")
    if merchants is not None and not merchants:
        raise ValueError("merchants must be None or a non-empty set")

    with CsvDatasetLoader(input_path) as loader:
        loader.register_attempts()
        normalize_attempts_to_sessions(loader.connection)
        loader.connection.execute(QUERY_PATH.read_text(encoding="utf-8"))
        coverage = compute_dataset_coverage(loader.connection)
        current_rows = _period_rows(
            loader.connection,
            current_start,
            current_end,
            merchants,
        )
        comparison_rows = _period_rows(
            loader.connection,
            comparison_start,
            comparison_end,
            merchants,
        )
        all_segment_rows = _segment_rows(
            loader.connection,
            current_start,
            current_end,
            merchants,
        )
        all_samples = _sample_rows(
            loader.connection,
            current_start,
            current_end,
            merchants,
        )

    fingerprint = compute_dataset_fingerprint(input_path)
    comparison_by_merchant = {
        str(row["merchant_key"]): row for row in comparison_rows
    }
    segments_by_merchant: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in all_segment_rows:
        segments_by_merchant[str(row["merchant_key"])].append(row)

    merchant_payloads: dict[str, object] = {}
    for current in current_rows:
        merchant_key = str(current["merchant_key"])
        comparison = comparison_by_merchant.get(
            merchant_key,
            _empty_period_row(merchant_key),
        )
        merchant_payloads[merchant_key] = _merchant_payload(
            current=current,
            comparison=comparison,
            segment_rows=segments_by_merchant[merchant_key],
            samples=all_samples.get(merchant_key, {}),
            fingerprint=fingerprint,
            current_start=current_start,
            current_end=current_end,
            comparison_start=comparison_start,
            comparison_end=comparison_end,
        )

    if merchants is not None:
        missing = sorted(merchants.difference(merchant_payloads))
        if missing:
            raise ValueError(
                "Requested merchants have no current-period sessions: "
                + ", ".join(missing)
            )

    timestamp = generated_at or datetime.now(timezone.utc)
    if timestamp.tzinfo is None:
        raise ValueError("generated_at must be timezone-aware")
    artifact: dict[str, object] = {
        "schemaVersion": "1.0",
        "generatedAt": timestamp.isoformat(),
        "dataset": coverage.to_dataset_metadata(fingerprint),
        "feature": "conversion-recovery",
        "merchants": merchant_payloads,
    }
    write_artifact_json(artifact, output_path)
    return artifact


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build the conversion recovery analysis artifact."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--current-from", type=_parse_date, default=DEFAULT_CURRENT_START)
    parser.add_argument("--current-to-exclusive", type=_parse_date, default=DEFAULT_CURRENT_END)
    parser.add_argument(
        "--comparison-from",
        type=_parse_date,
        default=DEFAULT_COMPARISON_START,
    )
    parser.add_argument(
        "--comparison-to-exclusive",
        type=_parse_date,
        default=DEFAULT_COMPARISON_END,
    )
    parser.add_argument("--merchant", action="append", dest="merchants")
    args = parser.parse_args()
    artifact = build_artifact(
        args.input,
        args.output,
        current_start=args.current_from,
        current_end=args.current_to_exclusive,
        comparison_start=args.comparison_from,
        comparison_end=args.comparison_to_exclusive,
        merchants=(
            set(args.merchants)
            if args.merchants
            else set(DEFAULT_PUBLIC_MERCHANTS)
        ),
    )
    print(f"Wrote {len(artifact['merchants'])} merchant payloads to {args.output}")


if __name__ == "__main__":
    main()

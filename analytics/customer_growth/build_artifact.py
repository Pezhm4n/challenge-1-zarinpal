from __future__ import annotations

import argparse
import hashlib
import json
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

import duckdb


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT = PROJECT_ROOT / "data" / "raw" / "challenge_data.csv"
DEFAULT_OUTPUT = PROJECT_ROOT / "public" / "analysis" / "customer-growth.json"
DEFAULT_CURRENT_START = date(2026, 6, 1)
DEFAULT_CURRENT_END = date(2026, 7, 1)
DEFAULT_COMPARISON_START = date(2026, 5, 1)
DEFAULT_COMPARISON_END = date(2026, 6, 1)
DEFAULT_MIN_COHORT_SIZE = 20


def _query_rows(
    connection: duckdb.DuckDBPyConnection,
    query: str,
    parameters: Iterable[object] = (),
) -> list[dict[str, Any]]:
    cursor = connection.execute(query, list(parameters))
    columns = [item[0] for item in cursor.description]
    return [dict(zip(columns, row, strict=True)) for row in cursor.fetchall()]


def _percent(numerator: int | float, denominator: int | float) -> float | None:
    if denominator == 0:
        return None
    return round(100 * float(numerator) / float(denominator), 4)


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while chunk := stream.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


def _mask_card(card_key: str) -> str:
    digest = hashlib.sha256(card_key.encode("utf-8")).hexdigest()[:8]
    return f"کارت-ناشناس-{digest}"


def _metric(
    value: int | float | None,
    unit: str,
    label_fa: str,
    *,
    kind: str = "actual",
    precision: int = 0,
) -> dict[str, Any]:
    return {
        "value": value,
        "unit": unit,
        "labelFa": label_fa,
        "kind": kind,
        "displayPrecision": precision,
    }


def _iso(value: datetime | date) -> str:
    return value.isoformat()


def _selection(
    current_start: date,
    current_end: date,
    comparison_start: date,
    comparison_end: date,
    merchant_key: str,
) -> dict[str, Any]:
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


def _load_sql(connection: duckdb.DuckDBPyConnection) -> None:
    sql_path = Path(__file__).with_name("queries.sql")
    connection.execute(sql_path.read_text(encoding="utf-8"))


def _metric_rows(
    connection: duckdb.DuckDBPyConnection,
    period_start: date,
    period_end: date,
) -> list[dict[str, Any]]:
    return _query_rows(
        connection,
        """
        WITH period_cards AS (
            SELECT
                v.merchant_key,
                v.payer_card_key,
                min(f.first_seen_at) AS first_seen_at,
                count(*)::BIGINT AS period_sessions,
                sum(v.amount_rial)::BIGINT AS period_volume_rial
            FROM verified_card_sessions v
            JOIN card_first_seen f USING (merchant_key, payer_card_key)
            WHERE v.created_at >= ? AND v.created_at < ?
            GROUP BY v.merchant_key, v.payer_card_key
        ),
        period_metrics AS (
            SELECT
                merchant_key,
                count(*)::BIGINT AS active_cards,
                count(*) FILTER (WHERE first_seen_at >= ?)::BIGINT AS new_cards,
                count(*) FILTER (WHERE first_seen_at < ?)::BIGINT AS returning_cards,
                sum(period_volume_rial)::BIGINT AS card_known_volume_rial,
                coalesce(sum(period_volume_rial) FILTER (WHERE first_seen_at < ?), 0)::BIGINT
                    AS returning_volume_rial
            FROM period_cards
            GROUP BY merchant_key
        ),
        pair_metrics AS (
            SELECT
                merchant_key,
                count(*)::BIGINT AS pair_count,
                count(*) FILTER (WHERE verified_sessions >= 2)::BIGINT AS repeat_pair_count
            FROM (
                SELECT
                    merchant_key,
                    payer_card_key,
                    count(*)::BIGINT AS verified_sessions
                FROM verified_card_sessions
                WHERE created_at < ?
                GROUP BY merchant_key, payer_card_key
            ) pairs
            GROUP BY merchant_key
        ),
        coverage AS (
            SELECT
                merchant_key,
                count(*) FILTER (WHERE is_verified)::BIGINT AS verified_sessions,
                count(*) FILTER (WHERE is_verified AND payer_card_key IS NOT NULL)::BIGINT
                    AS card_known_sessions
            FROM normalized_sessions
            WHERE created_at >= ? AND created_at < ?
            GROUP BY merchant_key
        ),
        merchants AS (
            SELECT DISTINCT merchant_key FROM normalized_sessions
        )
        SELECT
            m.merchant_key,
            coalesce(p.active_cards, 0)::BIGINT AS active_cards,
            coalesce(p.new_cards, 0)::BIGINT AS new_cards,
            coalesce(p.returning_cards, 0)::BIGINT AS returning_cards,
            coalesce(p.card_known_volume_rial, 0)::BIGINT AS card_known_volume_rial,
            coalesce(p.returning_volume_rial, 0)::BIGINT AS returning_volume_rial,
            coalesce(r.pair_count, 0)::BIGINT AS pair_count,
            coalesce(r.repeat_pair_count, 0)::BIGINT AS repeat_pair_count,
            coalesce(c.verified_sessions, 0)::BIGINT AS verified_sessions,
            coalesce(c.card_known_sessions, 0)::BIGINT AS card_known_sessions
        FROM merchants m
        LEFT JOIN period_metrics p USING (merchant_key)
        LEFT JOIN pair_metrics r USING (merchant_key)
        LEFT JOIN coverage c USING (merchant_key)
        ORDER BY m.merchant_key
        """,
        [
            period_start,
            period_end,
            period_start,
            period_start,
            period_start,
            period_end,
            period_start,
            period_end,
        ],
    )


def _cohort_rows(
    connection: duckdb.DuckDBPyConnection,
    current_end: date,
    min_cohort_size: int,
) -> list[dict[str, Any]]:
    return _query_rows(
        connection,
        """
        WITH activity AS (
            SELECT DISTINCT
                merchant_key,
                payer_card_key,
                date_trunc('month', created_at)::DATE AS activity_month
            FROM verified_card_sessions
            WHERE created_at < ?
        ),
        cohorts AS (
            SELECT
                merchant_key,
                payer_card_key,
                date_trunc('month', first_seen_at)::DATE AS cohort_month
            FROM card_first_seen
            WHERE first_seen_at < ?
        ),
        cohort_sizes AS (
            SELECT merchant_key, cohort_month, count(*)::BIGINT AS cohort_size
            FROM cohorts
            GROUP BY merchant_key, cohort_month
        ),
        eligible_cohorts AS (
            SELECT *
            FROM cohort_sizes
            WHERE cohort_size >= ?
        ),
        cohort_grid AS (
            SELECT
                e.merchant_key,
                e.cohort_month,
                e.cohort_size,
                unnest(
                    generate_series(
                        e.cohort_month,
                        date_trunc('month', ?::DATE - INTERVAL '1 day')::DATE,
                        INTERVAL '1 month'
                    )
                )::DATE AS activity_month
            FROM eligible_cohorts e
        ),
        retained AS (
            SELECT
                c.merchant_key,
                c.cohort_month,
                a.activity_month,
                count(DISTINCT c.payer_card_key)::BIGINT AS retained_customers
            FROM cohorts c
            JOIN activity a USING (merchant_key, payer_card_key)
            WHERE a.activity_month >= c.cohort_month
            GROUP BY c.merchant_key, c.cohort_month, a.activity_month
        )
        SELECT
            g.merchant_key,
            strftime(g.cohort_month, '%Y-%m') AS cohort,
            date_diff('month', g.cohort_month, g.activity_month)::INTEGER AS period_index,
            coalesce(r.retained_customers, 0)::BIGINT AS customers,
            g.cohort_size,
            round(
                100.0 * coalesce(r.retained_customers, 0) / nullif(g.cohort_size, 0),
                4
            ) AS retention_pct
        FROM cohort_grid g
        LEFT JOIN retained r USING (merchant_key, cohort_month, activity_month)
        ORDER BY g.merchant_key, g.cohort_month, g.activity_month
        """,
        [current_end, current_end, min_cohort_size, current_end],
    )


def _concentration_rows(
    connection: duckdb.DuckDBPyConnection,
    period_start: date,
    period_end: date,
) -> list[dict[str, Any]]:
    return _query_rows(
        connection,
        """
        WITH card_volume AS (
            SELECT
                merchant_key,
                payer_card_key,
                sum(amount_rial)::BIGINT AS revenue_rial
            FROM verified_card_sessions
            WHERE created_at >= ? AND created_at < ?
            GROUP BY merchant_key, payer_card_key
        ),
        ranked AS (
            SELECT
                *,
                row_number() OVER (
                    PARTITION BY merchant_key
                    ORDER BY revenue_rial DESC, payer_card_key
                ) AS card_rank,
                count(*) OVER (PARTITION BY merchant_key) AS total_cards,
                sum(revenue_rial) OVER (PARTITION BY merchant_key) AS total_revenue_rial
            FROM card_volume
        ),
        bucketed AS (
            SELECT
                *,
                CASE
                    WHEN card_rank = 1 THEN 'top-1'
                    WHEN card_rank <= 5 THEN 'rank-2-5'
                    ELSE 'remaining'
                END AS bucket,
                CASE
                    WHEN card_rank = 1 THEN 1
                    WHEN card_rank <= 5 THEN 2
                    ELSE 3
                END AS bucket_order
            FROM ranked
        )
        SELECT
            merchant_key,
            bucket,
            bucket_order,
            count(*)::BIGINT AS bucket_cards,
            max(total_cards)::BIGINT AS total_cards,
            sum(revenue_rial)::BIGINT AS bucket_revenue_rial,
            max(total_revenue_rial)::BIGINT AS total_revenue_rial,
            round(100.0 * count(*) / nullif(max(total_cards), 0), 4) AS customer_share_pct,
            round(100.0 * sum(revenue_rial) / nullif(max(total_revenue_rial), 0), 4)
                AS revenue_share_pct
        FROM bucketed
        GROUP BY merchant_key, bucket, bucket_order
        ORDER BY merchant_key, bucket_order
        """,
        [period_start, period_end],
    )


def _evidence_sample_rows(
    connection: duckdb.DuckDBPyConnection,
    period_start: date,
    period_end: date,
    cohort_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    focus_by_merchant: dict[str, dict[str, Any]] = {}
    for row in cohort_rows:
        if int(row["period_index"]) <= 0:
            continue
        merchant_key = str(row["merchant_key"])
        current_focus = focus_by_merchant.get(merchant_key)
        row_key = (str(row["cohort"]), int(row["period_index"]))
        current_key = (
            (str(current_focus["cohort"]), int(current_focus["period_index"]))
            if current_focus is not None
            else ("", -1)
        )
        if row_key > current_key:
            focus_by_merchant[merchant_key] = row

    connection.execute(
        """
        CREATE OR REPLACE TEMP TABLE evidence_cohort_focus (
            merchant_key VARCHAR,
            cohort_month DATE,
            activity_month DATE
        )
        """
    )
    focus_values: list[tuple[str, date, date]] = []
    for merchant_key, row in focus_by_merchant.items():
        cohort_month = date.fromisoformat(f"{row['cohort']}-01")
        period_index = int(row["period_index"])
        month_offset = cohort_month.month - 1 + period_index
        activity_month = date(
            cohort_month.year + month_offset // 12,
            month_offset % 12 + 1,
            1,
        )
        focus_values.append((merchant_key, cohort_month, activity_month))
    if focus_values:
        connection.executemany(
            "INSERT INTO evidence_cohort_focus VALUES (?, ?, ?)",
            focus_values,
        )

    return _query_rows(
        connection,
        """
        WITH returning_samples AS (
            SELECT
                'returning' AS sample_scope,
                merchant_key,
                session_key,
                created_at,
                amount_rial,
                psp_code,
                payer_card_key,
                row_number() OVER (
                    PARTITION BY merchant_key
                    ORDER BY created_at DESC, session_key
                ) AS sample_rank
            FROM verified_card_sessions v
            JOIN card_first_seen f USING (merchant_key, payer_card_key)
            WHERE v.created_at >= ? AND v.created_at < ? AND f.first_seen_at < ?
        ),
        repeat_pairs AS (
            SELECT merchant_key, payer_card_key
            FROM verified_card_sessions
            WHERE created_at < ?
            GROUP BY merchant_key, payer_card_key
            HAVING count(*) >= 2
        ),
        repeat_samples AS (
            SELECT
                'repeat-pair' AS sample_scope,
                v.merchant_key,
                v.session_key,
                v.created_at,
                v.amount_rial,
                v.psp_code,
                v.payer_card_key,
                row_number() OVER (
                    PARTITION BY v.merchant_key
                    ORDER BY v.created_at DESC, v.session_key
                ) AS sample_rank
            FROM verified_card_sessions v
            JOIN repeat_pairs r USING (merchant_key, payer_card_key)
            WHERE v.created_at < ?
        ),
        card_volume AS (
            SELECT merchant_key, payer_card_key, sum(amount_rial)::BIGINT AS revenue_rial
            FROM verified_card_sessions
            WHERE created_at >= ? AND created_at < ?
            GROUP BY merchant_key, payer_card_key
        ),
        top_cards AS (
            SELECT merchant_key, payer_card_key
            FROM card_volume
            QUALIFY row_number() OVER (
                PARTITION BY merchant_key
                ORDER BY revenue_rial DESC, payer_card_key
            ) = 1
        ),
        concentration_samples AS (
            SELECT
                'concentration' AS sample_scope,
                v.merchant_key,
                v.session_key,
                v.created_at,
                v.amount_rial,
                v.psp_code,
                v.payer_card_key,
                row_number() OVER (
                    PARTITION BY v.merchant_key
                    ORDER BY v.created_at DESC, v.session_key
                ) AS sample_rank
            FROM verified_card_sessions v
            JOIN top_cards t USING (merchant_key, payer_card_key)
            WHERE v.created_at >= ? AND v.created_at < ?
        ),
        cohort_samples AS (
            SELECT
                'cohort' AS sample_scope,
                v.merchant_key,
                v.session_key,
                v.created_at,
                v.amount_rial,
                v.psp_code,
                v.payer_card_key,
                row_number() OVER (
                    PARTITION BY v.merchant_key
                    ORDER BY v.created_at DESC, v.session_key
                ) AS sample_rank
            FROM verified_card_sessions v
            JOIN card_first_seen f USING (merchant_key, payer_card_key)
            JOIN evidence_cohort_focus c ON c.merchant_key = v.merchant_key
            WHERE date_trunc('month', f.first_seen_at)::DATE = c.cohort_month
              AND date_trunc('month', v.created_at)::DATE = c.activity_month
        ),
        all_samples AS (
            SELECT * FROM returning_samples
            UNION ALL
            SELECT * FROM repeat_samples
            UNION ALL
            SELECT * FROM concentration_samples
            UNION ALL
            SELECT * FROM cohort_samples
        )
        SELECT * EXCLUDE sample_rank
        FROM all_samples
        WHERE sample_rank <= 3
        ORDER BY sample_scope, merchant_key, created_at DESC, session_key
        """,
        [
            period_start,
            period_end,
            period_start,
            period_end,
            period_end,
            period_start,
            period_end,
            period_start,
            period_end,
        ],
    )


def _bucket_title(bucket: str) -> str:
    return {
        "top-1": "پرتراکنش‌ترین کارت",
        "rank-2-5": "کارت‌های رتبه ۲ تا ۵",
        "remaining": "سایر کارت‌ها",
    }[bucket]


def _evidence(
    *,
    evidence_id: str,
    formula_id: str,
    title_fa: str,
    explanation_fa: str,
    grain: str,
    source_columns: list[str],
    selection: dict[str, Any],
    numerator_label: str,
    numerator: int | float,
    denominator_label: str,
    denominator: int | float,
    formula_fa: str,
    result: dict[str, Any] | None,
    fingerprint: str,
    sample_rows: list[dict[str, Any]],
    data_quality: list[dict[str, str]],
    assumptions: list[str],
    limitations: list[str],
    baseline: dict[str, Any] | None = None,
) -> dict[str, Any]:
    record: dict[str, Any] = {
        "id": evidence_id,
        "formulaId": formula_id,
        "titleFa": title_fa,
        "explanationFa": explanation_fa,
        "grain": grain,
        "sourceColumns": source_columns,
        "filters": [
            {"field": "merchant_key", "operator": "=", "value": selection["merchantKey"]},
            {"field": "try_status", "operator": "=", "value": "Verified"},
            {"field": "payer_card_key", "operator": "is not", "value": "null"},
        ],
        "period": selection["period"],
        "comparisonPeriod": selection["comparison"],
        "numerator": {"labelFa": numerator_label, "value": numerator},
        "denominator": {"labelFa": denominator_label, "value": denominator},
        "formulaFa": formula_fa,
        "result": result,
        "controls": ["محاسبه فقط در همان پذیرنده", "Deduplicate در سطح Session"],
        "assumptions": assumptions,
        "limitations": limitations,
        "dataQuality": data_quality,
        "sampleRows": sample_rows,
        "datasetFingerprint": fingerprint,
    }
    if baseline is not None:
        record["baseline"] = baseline
    return record


def _merchant_payload(
    *,
    current: dict[str, Any],
    comparison: dict[str, Any],
    cohorts: list[dict[str, Any]],
    concentration: list[dict[str, Any]],
    samples: dict[str, list[dict[str, Any]]],
    fingerprint: str,
    current_start: date,
    current_end: date,
    comparison_start: date,
    comparison_end: date,
    min_cohort_size: int,
) -> dict[str, Any]:
    merchant_key = str(current["merchant_key"])
    selection = _selection(
        current_start,
        current_end,
        comparison_start,
        comparison_end,
        merchant_key,
    )
    active_cards = int(current["active_cards"])
    new_cards = int(current["new_cards"])
    returning_cards = int(current["returning_cards"])
    returning_share = _percent(returning_cards, active_cards)
    comparison_active = int(comparison["active_cards"])
    comparison_returning = int(comparison["returning_cards"])
    comparison_share = _percent(comparison_returning, comparison_active)
    repeat_pairs = int(current["repeat_pair_count"])
    pair_count = int(current["pair_count"])
    repeat_pair_pct = _percent(repeat_pairs, pair_count)
    returning_volume = int(current["returning_volume_rial"])
    card_known_volume = int(current["card_known_volume_rial"])
    repeat_revenue_pct = _percent(returning_volume, card_known_volume)
    verified_sessions = int(current["verified_sessions"])
    card_known_sessions = int(current["card_known_sessions"])
    coverage_pct = _percent(card_known_sessions, verified_sessions)

    if coverage_pct is None:
        coverage_note = {
            "severity": "warning",
            "code": "CUSTOMER_CARD_COVERAGE_UNAVAILABLE",
            "messageFa": "در این بازه Session موفقی برای سنجش پوشش Card وجود ندارد.",
        }
    else:
        coverage_note = {
            "severity": "warning" if coverage_pct < 80 else "info",
            "code": "CUSTOMER_CARD_COVERAGE",
            "messageFa": (
                f"{coverage_pct:.1f}٪ از Sessionهای موفق این بازه شناسه کارت ناشناس "
                "قابل استفاده دارند؛ KPIهای مشتری فقط بر همین پوشش متکی‌اند."
            ),
        }

    def metric_quality(denominator: int | float, code: str, label_fa: str) -> list[dict[str, str]]:
        notes = [coverage_note]
        if denominator == 0:
            notes.append(
                {
                    "severity": "warning",
                    "code": code,
                    "messageFa": f"{label_fa} صفر است؛ نتیجه این شاخص قابل محاسبه نیست.",
                }
            )
        return notes

    def serialize_samples(scope: str) -> list[dict[str, Any]]:
        return [
            {
                "sessionKey": str(row["session_key"]),
                "createdAt": _iso(row["created_at"]),
                "amountRial": int(row["amount_rial"]),
                "sessionStatus": "Verified",
                "tryStatus": "Verified",
                "pspCode": row["psp_code"],
                "payerCardMasked": _mask_card(str(row["payer_card_key"])),
            }
            for row in samples.get(scope, [])
        ]
    common_limitations = [
        "Card ناشناس معادل هویت کامل مشتری یا راه تماس نیست.",
        "رفتار Card در پذیرنده‌های دیگر بررسی یا نمایش داده نمی‌شود.",
        "Sessionهای موفق فاقد payer_card_key در Customer denominatorها وارد نمی‌شوند.",
    ]

    returning_evidence_id = f"customers-returning-{merchant_key}-current"
    returning_change_evidence_id = f"customers-returning-change-{merchant_key}"
    repeat_pair_evidence_id = f"customers-repeat-pair-{merchant_key}-current"
    repeat_revenue_evidence_id = f"customers-repeat-revenue-{merchant_key}-current"
    cohort_evidence_id = f"customers-cohort-{merchant_key}-current"
    concentration_evidence_id = f"customers-concentration-{merchant_key}-current"

    evidence_records = [
        _evidence(
            evidence_id=returning_evidence_id,
            formula_id="customer.returning_share.v1",
            title_fa="سهم کارت‌های بازگشتی",
            explanation_fa=(
                "از Cardهای فعال این دوره، Cardهایی بازگشتی‌اند که اولین خرید موفقشان "
                "برای همین پذیرنده پیش از شروع دوره ثبت شده است."
            ),
            grain="merchant-card",
            source_columns=["merchant_key", "session_key", "try_status", "payer_card_key", "created_at"],
            selection=selection,
            numerator_label="کارت بازگشتی",
            numerator=returning_cards,
            denominator_label="کارت فعال دارای شناسه",
            denominator=active_cards,
            formula_fa="کارت‌های بازگشتی ÷ کارت‌های فعال دارای شناسه × ۱۰۰",
            result=_metric(returning_share, "percent", "سهم کارت بازگشتی", precision=2),
            fingerprint=fingerprint,
            sample_rows=serialize_samples("returning"),
            data_quality=metric_quality(
                active_cards,
                "RETURNING_SHARE_ZERO_DENOMINATOR",
                "تعداد Card فعال دارای شناسه",
            ),
            assumptions=["اولین خرید بر اساس اولین خرید موفق همان فروشگاه/کارت تعیین می‌شود."],
            limitations=common_limitations,
            baseline=(
                {
                    "type": "comparison-returning-share",
                    "value": comparison_share,
                    "sampleSize": comparison_active,
                }
                if comparison_share is not None
                else None
            ),
        ),
        _evidence(
            evidence_id=repeat_pair_evidence_id,
            formula_id="customer.repeat_pair_rate.v1",
            title_fa="نرخ زوج‌های تکرارشونده",
            explanation_fa=(
                "این نرخ سابقه خرید تا پایان دوره را می‌سنجد و با سهم Card بازگشتی فعال "
                "در خود دوره متفاوت است."
            ),
            grain="merchant-card",
            source_columns=["merchant_key", "session_key", "try_status", "payer_card_key", "created_at"],
            selection=selection,
            numerator_label="خریدارانی که در این فروشگاه دوباره خرید کرده‌اند",
            numerator=repeat_pairs,
            denominator_label="تمام خریداران دارای خرید موفق",
            denominator=pair_count,
            formula_fa="خریداران دارای حداقل ۲ خرید موفق ÷ تمام خریداران × ۱۰۰",
            result=_metric(repeat_pair_pct, "percent", "نرخ زوج تکرارشونده", precision=2),
            fingerprint=fingerprint,
            sample_rows=serialize_samples("repeat-pair"),
            data_quality=metric_quality(
                pair_count,
                "REPEAT_PAIR_ZERO_DENOMINATOR",
                "تعداد خریداران بازگشتی",
            ),
            assumptions=["هر Session موفق فقط یک بار شمرده می‌شود."],
            limitations=common_limitations,
        ),
        _evidence(
            evidence_id=repeat_revenue_evidence_id,
            formula_id="customer.repeat_revenue_share.v1",
            title_fa="سهم مبلغ کارت‌های بازگشتی",
            explanation_fa="سهم حجم موفق این دوره که از Cardهای دیده‌شده پیش از دوره آمده است.",
            grain="merchant-card",
            source_columns=["merchant_key", "session_key", "amount", "try_status", "payer_card_key", "created_at"],
            selection=selection,
            numerator_label="حجم موفق Cardهای بازگشتی (ریال)",
            numerator=returning_volume,
            denominator_label="کل حجم موفق card-known دوره (ریال)",
            denominator=card_known_volume,
            formula_fa="حجم موفق Cardهای بازگشتی ÷ کل حجم موفق دارای شناسه Card × ۱۰۰",
            result=_metric(repeat_revenue_pct, "percent", "سهم مبلغ بازگشتی", precision=2),
            fingerprint=fingerprint,
            sample_rows=serialize_samples("returning"),
            data_quality=metric_quality(
                card_known_volume,
                "REPEAT_REVENUE_ZERO_DENOMINATOR",
                "حجم موفق دارای شناسه Card",
            ),
            assumptions=["Amount در سطح Session ثابت و به ریال است."],
            limitations=common_limitations,
        ),
    ]

    mature_cohorts = [row for row in cohorts if int(row["period_index"]) > 0]
    if mature_cohorts:
        cohort_focus = max(mature_cohorts, key=lambda row: (row["cohort"], row["period_index"]))
        cohort_size = int(cohort_focus["cohort_size"])
        retained = int(cohort_focus["customers"])
        retention_pct = float(cohort_focus["retention_pct"])
        evidence_records.append(
            _evidence(
                evidence_id=cohort_evidence_id,
                formula_id="customer.cohort_retention.v1",
                title_fa="Retention ماهانه Cohort",
                explanation_fa=(
                    f"از Cohort {cohort_focus['cohort']}، تعداد Cardهایی که در ماه "
                    f"شماره {int(cohort_focus['period_index']) + 1} دوباره خرید کرده‌اند."
                ),
                grain="merchant-card",
                source_columns=["merchant_key", "session_key", "try_status", "payer_card_key", "created_at"],
                selection=selection,
                numerator_label="Cardهای بازگشته در ماه",
                numerator=retained,
                denominator_label="اندازه Cohort اولیه",
                denominator=cohort_size,
                formula_fa="Cardهای فعال Cohort در ماه موردنظر ÷ اندازه اولیه Cohort × ۱۰۰",
                result=_metric(retention_pct, "percent", "Retention Cohort", precision=2),
                fingerprint=fingerprint,
                sample_rows=serialize_samples("cohort"),
                data_quality=[coverage_note],
                assumptions=[f"فقط Cohortهای حداقل {min_cohort_size} Card نمایش داده می‌شوند."],
                limitations=common_limitations,
            )
        )

    top_bucket = next((row for row in concentration if row["bucket"] == "top-1"), None)
    if top_bucket is not None:
        evidence_records.append(
            _evidence(
                evidence_id=concentration_evidence_id,
                formula_id="customer.revenue_concentration.v1",
                title_fa="تمرکز مبلغ روی پرتراکنش‌ترین Card",
                explanation_fa=(
                    "Cardها بر اساس حجم موفق همین دوره مرتب شده‌اند؛ این شاخص ریسک وابستگی "
                    "را نشان می‌دهد و هویت مشتری را آشکار نمی‌کند."
                ),
                grain="merchant-card",
                source_columns=["merchant_key", "session_key", "amount", "try_status", "payer_card_key", "created_at"],
                selection=selection,
                numerator_label="حجم موفق پرتراکنش‌ترین Card (ریال)",
                numerator=int(top_bucket["bucket_revenue_rial"]),
                denominator_label="کل حجم موفق card-known دوره (ریال)",
                denominator=int(top_bucket["total_revenue_rial"]),
                formula_fa="حجم موفق پرتراکنش‌ترین Card ÷ کل حجم موفق دارای شناسه Card × ۱۰۰",
                result=_metric(
                    float(top_bucket["revenue_share_pct"]),
                    "percent",
                    "تمرکز مبلغ Card اول",
                    precision=2,
                ),
                fingerprint=fingerprint,
                sample_rows=serialize_samples("concentration"),
                data_quality=[coverage_note],
                assumptions=["Bucketها غیرهم‌پوشان‌اند: Card اول، رتبه ۲ تا ۵ و سایر Cardها."],
                limitations=common_limitations,
            )
        )

    delta_pp = (
        round(returning_share - comparison_share, 4)
        if returning_share is not None and comparison_share is not None
        else None
    )
    change_quality = metric_quality(
        active_cards,
        "RETURNING_CHANGE_CURRENT_ZERO_DENOMINATOR",
        "تعداد Card فعال دوره جاری",
    )
    if comparison_active == 0:
        change_quality.append(
            {
                "severity": "warning",
                "code": "RETURNING_CHANGE_COMPARISON_ZERO_DENOMINATOR",
                "messageFa": "تعداد Card فعال دوره مقایسه صفر است؛ تغییر سهم بازگشتی قابل محاسبه نیست.",
            }
        )
    evidence_records.append(
        _evidence(
            evidence_id=returning_change_evidence_id,
            formula_id="customer.returning_share.v1",
            title_fa="تغییر سهم کارت‌های بازگشتی",
            explanation_fa=(
                "سهم کارت‌های بازگشتی دوره جاری از سهم همان شاخص در دوره مقایسه کم شده است."
            ),
            grain="merchant-card",
            source_columns=[
                "merchant_key",
                "session_key",
                "try_status",
                "payer_card_key",
                "created_at",
            ],
            selection=selection,
            numerator_label="سهم کارت بازگشتی دوره جاری",
            numerator=returning_share or 0,
            denominator_label="سهم کارت بازگشتی دوره مقایسه",
            denominator=comparison_share or 0,
            formula_fa="سهم دوره جاری منهای سهم دوره مقایسه",
            result=(
                _metric(
                    delta_pp,
                    "percentage-point",
                    "تغییر سهم بازگشتی",
                    precision=2,
                )
                if delta_pp is not None
                else None
            ),
            fingerprint=fingerprint,
            sample_rows=serialize_samples("returning"),
            data_quality=change_quality,
            assumptions=[
                "تعریف کارت بازگشتی و پوشش کارت در هر دو دوره یکسان است."
            ],
            limitations=common_limitations,
            baseline=(
                {
                    "type": "comparison-returning-share",
                    "value": comparison_share,
                    "sampleSize": comparison_active,
                }
                if comparison_share is not None
                else None
            ),
        )
    )
    insufficient = active_cards < min_cohort_size or returning_share is None
    if insufficient:
        status = "insufficient-data"
        title = "برای سنجش بازگشت مشتری داده کافی نیست"
        finding = f"تنها {active_cards} خریدار فعال دارای کارت در این دوره ثبت شد."
        action = "پس از کامل‌شدن نمونه دوره بعد، نرخ بازگشت را دوباره بررسی کنید."
        confidence = "low"
        confidence_reason = "تعداد خریداران فعال کمتر از حداقل نمونه آماری است."
    elif comparison_share is None:
        status = "insufficient-data"
        title = "خط مبنای دوره قبل در دسترس نیست"
        finding = f"سهم خریداران بازگشتی این دوره {returning_share:.2f}٪ است، اما دوره قبل جامعه آماری معتبر ندارد."
        action = "پس از ثبت یک دوره مقایسه معتبر، تغییر نرخ بازگشت را اندازه‌گیری کنید."
        confidence = "low"
        confidence_reason = "شاخص جاری معتبر است اما تغییر دوره‌ای بدون خط مبنا گزارش نمی‌شود."
    elif delta_pp is not None and delta_pp < -1:
        status = "warning"
        title = "سهم مشتریان بازگشتی کاهش یافته است"
        finding = (
            f"سهم خریداران بازگشتی از {comparison_share:.2f}٪ به {returning_share:.2f}٪ رسیده؛ "
            f"تغییر {delta_pp:.2f} واحد درصد است."
        )
        action = "یک کمپین بازگشت مشتریان (مانند پیامک یا تخفیف) اجرا و این شاخص را در دوره بعد مقایسه کنید."
        confidence = "medium"
        confidence_reason = "محاسبه دقیق است اما صرفاً رفتار کارت‌های بانکی خریداران را تحلیل می‌کند."
    else:
        status = "stable"
        title = "سهم مشتریان بازگشتی پایدار است"
        finding = (
            f"سهم خریداران بازگشتی {returning_share:.2f}٪ است؛ نسبت به دوره قبل "
            f"{delta_pp:+.2f} واحد درصد تغییر کرده است."
        )
        action = "همین گروه خریداران را در دوره بعد پایش و پیشنهاد وفاداری فعلی را اندازه‌گیری کنید."
        confidence = "medium"
        confidence_reason = "محاسبه بر اساس سفارش‌هاست و محدودیت پوشش کارت صریح نمایش داده می‌شود."

    insights = [
        {
            "id": f"customers-returning-change-{merchant_key}",
            "feature": "customers",
            "priority": 2,
            "status": status,
            "titleFa": title,
            "findingFa": finding,
            "actionFa": action,
            "impact": (
                _metric(delta_pp, "percentage-point", "تغییر سهم بازگشتی", precision=2)
                if delta_pp is not None
                else None
            ),
            "confidence": confidence,
            "confidenceReasonFa": confidence_reason,
            "evidenceId": returning_change_evidence_id,
            "destination": "/customers",
        }
    ]
    if top_bucket is not None:
        top_share = float(top_bucket["revenue_share_pct"])
        insights.append(
            {
                "id": f"customers-concentration-{merchant_key}",
                "feature": "customers",
                "priority": 4,
                "status": "warning" if top_share >= 40 else "stable",
                "titleFa": (
                    "وابستگی مبلغ به یک خریدار بالاست"
                    if top_share >= 40
                    else "تمرکز مبلغ روی خریداران اصلی کنترل‌شده است"
                ),
                "findingFa": f"پرتراکنش‌ترین خریدار {top_share:.2f}٪ از کل مبلغ دارای کارت دوره را ایجاد کرده است.",
                "actionFa": "ریسک وابستگی به خریداران عمده را بسنجید؛ فهرست تماس یا هویت مشتری از این داده استخراج نمی‌شود.",
                "impact": _metric(top_share, "percent", "تمرکز مبلغ Card اول", precision=2),
                "confidence": "medium",
                "confidenceReasonFa": "مبلغ واقعی است اما کارت بانکی معادل هویت مشتری نیست.",
                "evidenceId": concentration_evidence_id,
                "destination": "/customers",
            }
        )

    return {
        "selection": selection,
        "activeCards": active_cards,
        "newCards": new_cards,
        "returningCards": returning_cards,
        "returningSharePct": returning_share,
        "repeatPairPct": repeat_pair_pct,
        "repeatRevenueSharePct": repeat_revenue_pct,
        "cohorts": [
            {
                "cohort": str(row["cohort"]),
                "periodIndex": int(row["period_index"]),
                "customers": int(row["customers"]),
                "retentionPct": float(row["retention_pct"]),
            }
            for row in cohorts
        ],
        "concentration": [
            {
                "bucket": _bucket_title(str(row["bucket"])),
                "customerSharePct": float(row["customer_share_pct"]),
                "revenueSharePct": float(row["revenue_share_pct"]),
            }
            for row in concentration
        ],
        "insights": insights,
        "evidence": evidence_records,
    }


def build_artifact(
    input_path: Path,
    output_path: Path,
    *,
    current_start: date = DEFAULT_CURRENT_START,
    current_end: date = DEFAULT_CURRENT_END,
    comparison_start: date = DEFAULT_COMPARISON_START,
    comparison_end: date = DEFAULT_COMPARISON_END,
    min_cohort_size: int = DEFAULT_MIN_COHORT_SIZE,
    merchants: set[str] | None = None,
) -> dict[str, Any]:
    input_path = input_path.resolve()
    if not input_path.is_file():
        raise FileNotFoundError(f"Customer growth input CSV was not found: {input_path}")
    if current_start >= current_end or comparison_start >= comparison_end:
        raise ValueError("Period start must be earlier than period end.")
    if min_cohort_size < 1:
        raise ValueError("min_cohort_size must be positive.")

    connection = duckdb.connect()
    try:
        connection.read_csv(str(input_path), header=True, auto_detect=True).create_view("raw_attempts")
        _load_sql(connection)
        dataset_stats = _query_rows(
            connection,
            """
            SELECT
                (SELECT count(*)::BIGINT FROM raw_attempts) AS row_count,
                count(*)::BIGINT AS session_count,
                min(created_at) AS min_created_at,
                max(created_at) AS max_created_at
            FROM normalized_sessions
            """,
        )[0]
        current_rows = _metric_rows(connection, current_start, current_end)
        comparison_by_merchant = {
            str(row["merchant_key"]): row
            for row in _metric_rows(connection, comparison_start, comparison_end)
        }
        cohort_rows = _cohort_rows(connection, current_end, min_cohort_size)
        cohorts_by_merchant: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in cohort_rows:
            cohorts_by_merchant[str(row["merchant_key"])].append(row)
        concentration_by_merchant: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in _concentration_rows(connection, current_start, current_end):
            concentration_by_merchant[str(row["merchant_key"])].append(row)
        samples_by_merchant: dict[
            str,
            dict[str, list[dict[str, Any]]],
        ] = defaultdict(lambda: defaultdict(list))
        for row in _evidence_sample_rows(
            connection,
            current_start,
            current_end,
            cohort_rows,
        ):
            samples_by_merchant[str(row["merchant_key"])][
                str(row["sample_scope"])
            ].append(row)
    finally:
        connection.close()

    fingerprint = _sha256(input_path)
    merchant_payloads: dict[str, Any] = {}
    for current in current_rows:
        merchant_key = str(current["merchant_key"])
        if merchants is not None and merchant_key not in merchants:
            continue
        comparison = comparison_by_merchant[merchant_key]
        merchant_payloads[merchant_key] = _merchant_payload(
            current=current,
            comparison=comparison,
            cohorts=cohorts_by_merchant[merchant_key],
            concentration=concentration_by_merchant[merchant_key],
            samples=samples_by_merchant[merchant_key],
            fingerprint=fingerprint,
            current_start=current_start,
            current_end=current_end,
            comparison_start=comparison_start,
            comparison_end=comparison_end,
            min_cohort_size=min_cohort_size,
        )

    artifact = {
        "schemaVersion": "1.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "fingerprint": fingerprint,
            "rowCount": int(dataset_stats["row_count"]),
            "sessionCount": int(dataset_stats["session_count"]),
            "minCreatedAt": _iso(dataset_stats["min_created_at"]),
            "maxCreatedAt": _iso(dataset_stats["max_created_at"]),
        },
        "feature": "customer-growth",
        "merchants": merchant_payloads,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return artifact


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


def main() -> None:
    parser = argparse.ArgumentParser(description="Build the customer growth analysis artifact.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--current-from", type=_parse_date, default=DEFAULT_CURRENT_START)
    parser.add_argument("--current-to-exclusive", type=_parse_date, default=DEFAULT_CURRENT_END)
    parser.add_argument("--comparison-from", type=_parse_date, default=DEFAULT_COMPARISON_START)
    parser.add_argument("--comparison-to-exclusive", type=_parse_date, default=DEFAULT_COMPARISON_END)
    parser.add_argument("--min-cohort-size", type=int, default=DEFAULT_MIN_COHORT_SIZE)
    parser.add_argument("--merchant", action="append", dest="merchants")
    args = parser.parse_args()
    artifact = build_artifact(
        args.input,
        args.output,
        current_start=args.current_from,
        current_end=args.current_to_exclusive,
        comparison_start=args.comparison_from,
        comparison_end=args.comparison_to_exclusive,
        min_cohort_size=args.min_cohort_size,
        merchants=set(args.merchants) if args.merchants else None,
    )
    print(f"Wrote {len(artifact['merchants'])} merchant payloads to {args.output}")


if __name__ == "__main__":
    main()

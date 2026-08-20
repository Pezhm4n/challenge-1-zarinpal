from __future__ import annotations

import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from .formulas import (
    MerchantMetrics,
    is_peer_sufficient,
    is_time_window_eligible,
    midrank_percentile,
    robust_median,
    shapley_decomposition,
    window_lift_pct,
)
from .queries import PeriodMetrics, TimeWindowAggregate


def _metric_value(
    value: float | int,
    unit: str,
    label_fa: str,
    kind: str,
    precision: int,
) -> dict[str, Any]:
    return {
        "value": value,
        "unit": unit,
        "labelFa": label_fa,
        "kind": kind,
        "displayPrecision": precision,
    }


def _period_metric(metrics: PeriodMetrics) -> MerchantMetrics:
    return MerchantMetrics(
        sessions=metrics.sessions,
        verified_sessions=metrics.verified_sessions,
        verified_volume_rial=metrics.verified_volume_rial,
    )


def build_peer_benchmarks(
    target: PeriodMetrics,
    period_metrics: Iterable[PeriodMetrics],
) -> list[dict[str, Any]]:
    peers = tuple(
        metrics
        for metrics in period_metrics
        if metrics.merchant_key != target.merchant_key
        and metrics.category_id == target.category_id
        and metrics.sessions >= 100
    )
    definitions = (
        (
            "verificationRate",
            target.verification_rate_pct,
            [peer.verification_rate_pct for peer in peers],
        ),
        (
            "verifiedVolumeRial",
            float(target.verified_volume_rial),
            [float(peer.verified_volume_rial) for peer in peers],
        ),
        (
            "averageVerifiedTicketRial",
            target.average_ticket_rial,
            [peer.average_ticket_rial for peer in peers],
        ),
    )
    controls = [
        f"صنف یکسان: {target.category_title}",
        "دوره کامل و یکسان",
        "حداقل ۱۰۰ پرداخت یکتا برای هر پذیرنده",
        "حذف پذیرندهٔ مورد بررسی از گروه هم‌صنفان",
        "نمایش جداگانهٔ مبلغ کل و میانگین مبلغ برای تفسیر منصفانه",
    ]
    benchmarks: list[dict[str, Any]] = []
    for metric, merchant_value, raw_peer_values in definitions:
        if merchant_value is None:
            continue
        peer_values = [value for value in raw_peer_values if value is not None]
        if not peer_values:
            continue
        percentile = midrank_percentile(merchant_value, peer_values)
        peer_median = robust_median(peer_values)
        benchmarks.append(
            {
                "metric": metric,
                "merchantValue": round(merchant_value, 2),
                "peerMedian": round(peer_median, 2),
                "percentile": percentile,
                "peerCount": len(peer_values),
                "controls": controls,
                "sufficient": is_peer_sufficient(target.sessions, len(peer_values)),
            }
        )
    return benchmarks


def select_time_windows(
    windows: Iterable[TimeWindowAggregate],
    baseline_rate_pct: float | None,
) -> list[dict[str, Any]]:
    if baseline_rate_pct is None or baseline_rate_pct == 0:
        return []

    eligible: list[dict[str, Any]] = []
    for window in windows:
        if not is_time_window_eligible(window.sessions):
            continue
        window_rate = window.verification_rate_pct
        if window_rate is None:
            continue
        lift = window_lift_pct(window_rate, baseline_rate_pct)
        if lift is None:
            continue
        eligible.append(
            {
                "weekday": window.weekday,
                "hour": window.hour,
                "sessions": window.sessions,
                "verifyPct": round(window_rate, 2),
                "volumeRial": window.volume_rial,
                "liftVsBaselinePct": lift,
            }
        )

    ranked = sorted(
        eligible,
        key=lambda item: (-item["liftVsBaselinePct"], -item["sessions"], item["weekday"], item["hour"]),
    )
    selected = ranked[:3] + list(reversed(ranked[-3:]))
    unique: list[dict[str, Any]] = []
    seen: set[tuple[int, int]] = set()
    for item in selected:
        key = (item["weekday"], item["hour"])
        if key not in seen:
            unique.append(item)
            seen.add(key)
    return unique


def _source_quality_note(development_fixture: bool) -> dict[str, str]:
    if development_fixture:
        return {
            "severity": "info",
            "code": "DEVELOPMENT_FIXTURE",
            "messageFa": "این خروجی با دادهٔ آزمایشیِ پرداخت‌های یکتا تولید شده است.",
        }
    return {
        "severity": "info",
        "code": "FULL_CHALLENGE_DATASET",
        "messageFa": "این خروجی از کل دادهٔ چالش، پس از تبدیل تلاش‌های تکراری به پرداخت‌های یکتا، تولید شده است.",
    }


def _warning(code: str, message_fa: str) -> dict[str, str]:
    return {"severity": "warning", "code": code, "messageFa": message_fa}


def build_artifact(
    *,
    target_key: str,
    current_metrics: tuple[PeriodMetrics, ...],
    previous_metrics: tuple[PeriodMetrics, ...],
    time_windows: tuple[TimeWindowAggregate, ...],
    dataset_metadata: dict[str, Any],
    dataset_fingerprint: str,
    sample_rows: list[dict[str, Any]],
    time_window_sample_rows: dict[str, list[dict[str, Any]]] | None = None,
    current_period: dict[str, str],
    comparison_period: dict[str, str],
    development_fixture: bool = True,
) -> dict[str, Any]:
    time_window_sample_rows = time_window_sample_rows or {}
    current_by_key = {metrics.merchant_key: metrics for metrics in current_metrics}
    previous_by_key = {metrics.merchant_key: metrics for metrics in previous_metrics}
    if target_key not in current_by_key or target_key not in previous_by_key:
        raise ValueError("target merchant requires both current and comparison periods")

    current = current_by_key[target_key]
    previous = previous_by_key[target_key]
    decomposition_available = (
        previous.sessions > 0
        and current.sessions > 0
        and previous.verified_sessions > 0
        and current.verified_sessions > 0
        and previous.verified_volume_rial > 0
    )
    decomposition = (
        shapley_decomposition(_period_metric(previous), _period_metric(current))
        if decomposition_available
        else ()
    )
    decomposition_payload = [
        {
            "driver": result.driver,
            "current": round(result.current, 4),
            "previous": round(result.previous, 4),
            "changePct": result.change_pct,
            "contributionRial": result.contribution_rial,
        }
        for result in decomposition
    ]
    peer_benchmarks = build_peer_benchmarks(current, current_metrics)
    baseline_rate_pct = current.verification_rate_pct
    timing_payload = select_time_windows(time_windows, baseline_rate_pct)

    negative_driver = min(
        decomposition,
        key=lambda result: result.contribution_rial,
        default=None,
    )
    driver_fa = {
        "traffic": "تعداد پرداخت‌های یکتا",
        "conversion": "نرخ پرداخت موفق",
        "ticket": "میانگین مبلغ پرداخت موفق",
    }
    peer_verification = next(
        (
            benchmark
            for benchmark in peer_benchmarks
            if benchmark["metric"] == "verificationRate"
        ),
        None,
    )
    strongest_window = max(
        timing_payload,
        key=lambda window: window["liftVsBaselinePct"],
        default=None,
    )

    growth_evidence_id = "peer-growth-decomposition-m275"
    peer_evidence_id = "peer-benchmark-m275"
    timing_summary_evidence_id = "timing-window-m275"
    timing_evidence_id = (
        f"timing-window-{strongest_window['weekday']}-{strongest_window['hour']}-{target_key.lower()}"
        if strongest_window
        else timing_summary_evidence_id
    )
    growth_evidence_result = _metric_value(
        current.verified_volume_rial - previous.verified_volume_rial,
        "rial",
        "تغییر حجم موفق",
        "actual",
        0,
    )
    timing_insight_impact = (
        _metric_value(
            strongest_window["liftVsBaselinePct"],
            "percent",
            "تغییر نرخ این بازه نسبت به نرخ مبنا",
            "benchmark",
            1,
        )
        if strongest_window
        else None
    )
    growth_insight = {
        "id": "growth-driver-m275",
        "feature": "growth",
        "priority": 1,
        "status": (
            "insufficient-data"
            if negative_driver is None
            else "warning" if negative_driver.contribution_rial < 0 else "stable"
        ),
        "titleFa": (
            f"بیشترین فشار منفی از {driver_fa[negative_driver.driver]} آمده است"
            if negative_driver
            else "تفکیک عامل‌های تغییر فروش ممکن نیست"
        ),
        "findingFa": (
            "سهم تعداد پرداخت‌ها، نرخ موفقیت و میانگین مبلغ جداگانه محاسبه شده است."
            if negative_driver
            else "در یکی از دوره‌ها پرداخت موفقی وجود ندارد؛ بنابراین میانگین مبلغ و سهم عامل‌ها تعریف نمی‌شود."
        ),
        "actionFa": (
            "ابتدا عامل کاهشی را بررسی کنید و تغییر فروش را به‌تنهایی نشانهٔ افت تقاضا ندانید."
            if negative_driver
            else "ابتدا نبود پرداخت موفق یا پوشش دادهٔ دوره را بررسی کنید."
        ),
        "impact": growth_evidence_result if negative_driver else None,
        "confidence": "high" if negative_driver else "low",
        "confidenceReasonFa": (
            "هر پرداخت یکتا یک‌بار شمرده شده و سهم عوامل بدون هم‌پوشانی محاسبه شده است."
            if negative_driver
            else "برای جلوگیری از نمایش عدد ساختگی، تفکیک دارای مخرج صفر منتشر نشده است."
        ),
        "evidenceId": growth_evidence_id,
        "destination": "/opportunities",
    }
    peer_is_sufficient = bool(peer_verification and peer_verification["sufficient"])
    peer_insight = {
        "id": "peer-position-m275",
        "feature": "peers",
        "priority": 2,
        "status": (
            "insufficient-data"
            if not peer_is_sufficient
            else "warning" if peer_verification["percentile"] < 50 else "stable"
        ),
        "titleFa": "جایگاه نرخ پرداخت موفق میان هم‌صنفان",
        "findingFa": (
            "نرخ پرداخت موفق شما در مقایسه با کسب‌وکارهای مشابه قابل بهبود است؛ جزئیات مقایسه را پایین‌تر ببینید."
            if peer_is_sufficient
            else "برای رتبه‌بندی معتبر، حداقل ۱۰ کسب‌وکار مشابه و ۱۰۰ پرداخت یکتا برای پذیرنده لازم است."
        ),
        "actionFa": "هم‌زمان نرخ موفقیت، حجم و متوسط مبلغ را ببینید؛ رتبه حجم به‌تنهایی کافی نیست.",
        "impact": (
            _metric_value(
                peer_verification["percentile"],
                "percent",
                "درصد کسب‌وکارهای مشابه با عملکرد پایین‌تر",
                "benchmark",
                1,
            )
            if peer_is_sufficient
            else None
        ),
        "confidence": "medium" if peer_is_sufficient else "low",
        "confidenceReasonFa": (
            "کسب‌وکارهای مقایسه‌شده هم‌صنف، هم‌دوره و دارای حداقل دادهٔ لازم هستند."
            if peer_is_sufficient
            else "نتیجه رتبه‌ای تا رسیدن نمونه به حداقل قرارداد نمایش داده نمی‌شود."
        ),
        "evidenceId": peer_evidence_id,
        "destination": "/opportunities",
    }
    timing_insight = {
        "id": "timing-opportunity-m275",
        "feature": "timing",
        "priority": 3,
        "status": "opportunity" if strongest_window else "insufficient-data",
        "titleFa": "یک بازه زمانی قابل بررسی پیدا شد" if strongest_window else "داده کافی برای بازه زمانی نیست",
        "findingFa": (
            f"نرخ پرداخت موفق در این بازه {strongest_window['liftVsBaselinePct']:.1f}٪ بالاتر از نرخ مبنای همان دوره است."
            if strongest_window
            else (
                "نرخ مبنا صفر است؛ تغییر نسبی محاسبه نمی‌شود."
                if baseline_rate_pct == 0
                else "هیچ بازه‌ای با حداقل ۲۵ پرداخت یکتا وجود ندارد."
            )
        ),
        "actionFa": "مسیر پرداخت و فعالیت‌های بازاریابی این زمان را بررسی کنید؛ این الگو علت قطعی را نشان نمی‌دهد.",
        "impact": timing_insight_impact,
        "confidence": "medium" if strongest_window else "low",
        "confidenceReasonFa": (
            "فقط زمان‌هایی با حداقل ۲۵ پرداخت یکتا وارد مقایسه شده‌اند."
            if strongest_window
            else "عدد نامعتبر، صفر جعلی یا مقدار نامتناهی تولید نشده است."
        ),
        "evidenceId": timing_evidence_id,
        "destination": "/opportunities",
    }

    source_quality = [_source_quality_note(development_fixture)]
    growth_quality = [*source_quality]
    if not decomposition_available:
        growth_quality.append(
            _warning(
                "ZERO_DENOMINATOR_DECOMPOSITION",
                "در یکی از دوره‌ها تعداد پرداخت یا پرداخت موفق صفر است؛ درصد تغییر و تفکیک عامل‌ها منتشر نشده است.",
            )
        )

    peer_quality = [*source_quality]
    if not peer_is_sufficient:
        peer_quality.append(
            _warning(
                "INSUFFICIENT_PEER_SAMPLE",
                "رتبه هم‌صنف به‌دلیل کمتر بودن نمونه از حداقل قرارداد منتشر نشده است.",
            )
        )

    timing_quality = [*source_quality]
    if baseline_rate_pct is None or baseline_rate_pct == 0:
        timing_quality.append(
            _warning(
                "ZERO_BASELINE_RATE",
                "نرخ مبنا صفر یا تعریف‌نشده است؛ تغییر نسبی بازه‌ها منتشر نشده است.",
            )
        )
    elif not strongest_window:
        timing_quality.append(
            _warning(
                "INSUFFICIENT_TIME_WINDOW_SAMPLE",
                "هیچ بازه‌ای حداقل ۲۵ پرداخت یکتا برای مقایسه ندارد.",
            )
        )

    target_verification_rate = current.verification_rate_pct
    eligible_peer_verification_rates = [
        value
        for metrics in current_metrics
        if metrics.merchant_key != current.merchant_key
        and metrics.category_id == current.category_id
        and metrics.sessions >= 100
        and (value := metrics.verification_rate_pct) is not None
    ]
    peer_rank_numerator = (
        sum(value < target_verification_rate for value in eligible_peer_verification_rates)
        + 0.5
        * sum(value == target_verification_rate for value in eligible_peer_verification_rates)
        if target_verification_rate is not None and eligible_peer_verification_rates
        else None
    )
    peer_count = peer_verification["peerCount"] if peer_verification else 0
    growth_operands = (
        {
            "numerator": {
                "labelFa": "فروش موفق دوره جاری",
                "value": current.verified_volume_rial,
            },
            "denominator": {
                "labelFa": "فروش موفق دوره مقایسه",
                "value": previous.verified_volume_rial,
            },
        }
        if decomposition_available
        else {}
    )
    peer_controls = (
        peer_verification["controls"]
        if peer_verification
        else [
            f"صنف یکسان: {current.category_title}",
            "دوره کامل و یکسان",
            "حداقل ۱۰۰ پرداخت یکتا برای هر پذیرنده",
            "حذف پذیرندهٔ مورد بررسی از گروه هم‌صنفان",
        ]
    )
    peer_evidence_result = (
        _metric_value(
            peer_verification["percentile"],
            "percent",
            "درصد کسب‌وکارهای مشابه با عملکرد پایین‌تر",
            "benchmark",
            1,
        )
        if peer_is_sufficient
        else _metric_value(
            peer_count,
            "count",
            "تعداد کسب‌وکارهای مشابه واجد شرایط",
            "actual",
            0,
        )
    )
    peer_operands = (
        {
            "numerator": {
                "labelFa": "امتیاز رتبه‌ای با احتساب نصف رتبه‌های مساوی",
                "value": peer_rank_numerator,
            },
            "denominator": {
                "labelFa": "تعداد کسب‌وکارهای مشابه واجد شرایط",
                "value": peer_count,
            },
        }
        if peer_rank_numerator is not None and peer_count > 0
        else {}
    )
    peer_baseline = (
        {
            "baseline": {
                "type": "same-category-peer-median",
                "value": peer_verification["peerMedian"],
                "sampleSize": peer_count,
            }
        }
        if peer_verification and peer_count > 0
        else {}
    )
    timing_evidence_result = (
        _metric_value(
            strongest_window["liftVsBaselinePct"],
            "percent",
            "بیشترین تغییر مشاهده‌شده",
            "benchmark",
            1,
        )
        if strongest_window
        else _metric_value(
            baseline_rate_pct or 0,
            "percent",
            "نرخ مبنای پرداخت موفق",
            "actual",
            1,
        )
    )
    timing_operands = (
        {
            "numerator": {
                "labelFa": "اختلاف نرخ بازه و نرخ مبنا",
                "value": round(
                    strongest_window["verifyPct"] - baseline_rate_pct,
                    2,
                ),
            },
            "denominator": {
                "labelFa": "نرخ مبنای همان پذیرنده و دوره",
                "value": baseline_rate_pct,
            },
        }
        if strongest_window and baseline_rate_pct is not None
        else {}
    )
    timing_baseline = (
        {
            "baseline": {
                "type": "merchant-period-verification-rate",
                "value": baseline_rate_pct,
                "sampleSize": current.sessions,
            }
        }
        if baseline_rate_pct is not None
        else {}
    )

    common_evidence = {
        "sourceColumns": [
            "session_key",
            "merchant_key",
            "category_id",
            "amount_rial",
            "created_at",
            "eventual_verified",
        ],
        "period": current_period,
        "comparisonPeriod": comparison_period,
        "sampleRows": sample_rows,
        "datasetFingerprint": dataset_fingerprint,
    }
    evidence = [
        {
            "id": growth_evidence_id,
            "formulaId": "growth.revenue_decomposition.v1",
            "titleFa": "تفکیک تغییر حجم موفق",
            "explanationFa": "اثر هر عامل در همهٔ حالت‌های ممکنِ ترکیب تغییرات محاسبه شده تا سهم‌ها دوباره‌شماری نشوند.",
            "grain": "merchant-period",
            "filters": [{"field": "merchant_key", "operator": "=", "value": target_key}],
            "formulaFa": "فروش موفق = پرداخت‌های یکتا × نرخ پرداخت موفق × میانگین مبلغ پرداخت موفق",
            "result": growth_evidence_result,
            **growth_operands,
            "controls": ["دوره‌های هم‌اندازه", "هر پرداخت یکتا فقط یک‌بار شمرده شده است", "تفکیک سهم عوامل بدون دوباره‌شماری"],
            "assumptions": ["eventual_verified از Loader مشترک معتبر دریافت می‌شود"],
            "limitations": ["این تفکیک توصیفی است و ادعای علیت ندارد"],
            "dataQuality": growth_quality,
            **common_evidence,
        },
        {
            "id": peer_evidence_id,
            "formulaId": "peer.robust_percentile.v1",
            "titleFa": "جایگاه در گروه هم‌صنف",
            "explanationFa": "درصد مقایسه‌ای با درنظرگرفتن رتبه‌های مساوی و میانه با مقاومت در برابر مقدارهای بسیار دور از معمول محاسبه شده است.",
            "grain": "peer-group",
            "filters": [
                {"field": "category_id", "operator": "=", "value": current.category_id},
                {"field": "sessions", "operator": ">=", "value": 100},
            ],
            "formulaFa": "۱۰۰ × (تعداد کمتر + نصف تعداد مساوی) ÷ تعداد کسب‌وکارهای مشابه",
            "result": peer_evidence_result,
            **peer_operands,
            **peer_baseline,
            "controls": peer_controls,
            "assumptions": ["در این نسخه، سیاست پایهٔ هم‌صنف و حداقل نمونه اعمال شده است"],
            "limitations": [
                "رتبهٔ مبلغ کل، به‌تنهایی نشانهٔ عملکرد بهتر نیست",
                "تا تصویب سیاست تکمیلی، فیلتر مستقل اندازه یا میانگین مبلغ روی گروه هم‌صنف اعمال نشده است",
            ],
            "dataQuality": peer_quality,
            **common_evidence,
        },
        *(
            [{
            "id": timing_summary_evidence_id,
            "formulaId": "time.window_lift.v1",
            "titleFa": "مقایسه بازه‌های زمانی",
            "explanationFa": "نرخ هر بازهٔ واجد شرایط با نرخ مبنای همان پذیرنده و دوره مقایسه شده است.",
            "grain": "merchant-period",
            "filters": [
                {"field": "merchant_key", "operator": "=", "value": target_key},
                {"field": "sessions", "operator": ">=", "value": 25},
            ],
            "formulaFa": "(نرخ بازه − نرخ مبنا) ÷ نرخ مبنا",
            "result": timing_evidence_result,
            **timing_operands,
            **timing_baseline,
            "controls": [
                "حداقل ۲۵ پرداخت یکتا در هر بازه",
                "نرخ مبنای همان پذیرنده و دوره",
            ],
            "assumptions": [],
            "limitations": ["الگوی زمانی مشاهده‌ای است و اثر علّی نیست"],
            "dataQuality": timing_quality,
            **common_evidence,
            }]
            if strongest_window is None
            else []
        ),
    ]

    merchant_suffix = target_key.lower()
    driver_units = {
        "traffic": ("count", "تعداد پرداخت یکتا", 0),
        "conversion": ("percent", "نرخ پرداخت موفق", 1),
        "ticket": ("rial", "میانگین مبلغ پرداخت موفق", 0),
    }
    for item in decomposition_payload:
        driver = item["driver"]
        _unit, value_label, precision = driver_units[driver]
        evidence.append(
            {
                "id": f"growth-driver-{driver}-{merchant_suffix}",
                "formulaId": "growth.revenue_decomposition.v1",
                "titleFa": f"مدرک {driver_fa[driver]}",
                "explanationFa": (
                    f"مقدار {value_label} در دوره جاری با دوره مقایسه سنجیده شده و "
                    "سهم آن از تغییر فروش موفق با روش شاپلی محاسبه شده است."
                ),
                "grain": "merchant-period",
                "filters": [
                    {"field": "merchant_key", "operator": "=", "value": target_key},
                    {
                        "field": "evidence_scope",
                        "operator": "=",
                        "value": f"growth:{driver}",
                    },
                ],
                "formulaFa": "درصد تغییر = (مقدار جاری − مقدار مقایسه) ÷ مقدار مقایسه؛ سهم عامل با میانگین اثر آن در همه ترتیب‌های تغییر محاسبه می‌شود",
                "result": _metric_value(
                    item["contributionRial"],
                    "rial",
                    f"سهم {driver_fa[driver]} از تغییر فروش موفق",
                    "actual",
                    0,
                ),
                "numerator": {
                    "labelFa": f"{value_label} دوره جاری",
                    "value": item["current"],
                },
                "denominator": {
                    "labelFa": f"{value_label} دوره مقایسه",
                    "value": item["previous"],
                },
                "baseline": {
                    "type": f"previous-period-{driver}",
                    "value": item["previous"],
                    "sampleSize": previous.sessions,
                },
                "controls": [
                    "دوره‌های هم‌اندازه",
                    "هر پرداخت یکتا فقط یک‌بار شمرده شده است",
                    "جمع سهم سه عامل با تغییر فروش موفق برابر است",
                ],
                "assumptions": [
                    f"مقدار جاری و مقایسه با دقت نمایشی {precision} رقم گزارش می‌شوند",
                ],
                "limitations": ["این تفکیک توصیفی است و ادعای علیت ندارد"],
                "dataQuality": growth_quality,
                **common_evidence,
            }
        )

    peer_metric_labels = {
        "verificationRate": ("نرخ پرداخت موفق", "percent", 1),
        "verifiedVolumeRial": ("فروش موفق", "rial", 0),
        "averageVerifiedTicketRial": ("میانگین مبلغ پرداخت موفق", "rial", 0),
    }

    def peer_metric_value(metrics: PeriodMetrics, metric: str) -> float | None:
        if metric == "verificationRate":
            return metrics.verification_rate_pct
        if metric == "verifiedVolumeRial":
            return float(metrics.verified_volume_rial)
        if metric == "averageVerifiedTicketRial":
            return metrics.average_ticket_rial
        return None

    eligible_peers = tuple(
        metrics
        for metrics in current_metrics
        if metrics.merchant_key != current.merchant_key
        and metrics.category_id == current.category_id
        and metrics.sessions >= 100
    )
    for benchmark in peer_benchmarks:
        metric = benchmark["metric"]
        label, _unit, precision = peer_metric_labels[metric]
        target_value = peer_metric_value(current, metric)
        peer_values = [
            value
            for metrics in eligible_peers
            if (value := peer_metric_value(metrics, metric)) is not None
        ]
        rank_numerator = (
            sum(value < target_value for value in peer_values)
            + 0.5 * sum(value == target_value for value in peer_values)
            if target_value is not None and peer_values
            else 0
        )
        evidence.append(
            {
                "id": f"peer-metric-{metric}-{merchant_suffix}",
                "formulaId": "peer.robust_percentile.v1",
                "titleFa": f"مدرک جایگاه {label}",
                "explanationFa": (
                    f"{label} این پذیرنده با میانه {benchmark['peerCount']} کسب‌وکار هم‌صنف "
                    "مقایسه شده است؛ درصد نشان می‌دهد چه سهمی از هم‌صنفان مقدار پایین‌تری دارند."
                ),
                "grain": "peer-group",
                "filters": [
                    {"field": "category_id", "operator": "=", "value": current.category_id},
                    {"field": "sessions", "operator": ">=", "value": 100},
                    {"field": "metric", "operator": "=", "value": metric},
                    {
                        "field": "evidence_scope",
                        "operator": "=",
                        "value": f"peer:{metric}",
                    },
                ],
                "formulaFa": "۱۰۰ × (تعداد مقادیر کمتر + نصف تعداد مقادیر مساوی) ÷ تعداد کسب‌وکارهای هم‌صنف",
                "result": _metric_value(
                    benchmark["percentile"],
                    "percent",
                    f"درصد هم‌صنفان با {label} پایین‌تر",
                    "benchmark",
                    1,
                ),
                "numerator": {
                    "labelFa": "امتیاز رتبه‌ای با احتساب نصف مقادیر مساوی",
                    "value": rank_numerator,
                },
                "denominator": {
                    "labelFa": "تعداد کسب‌وکارهای هم‌صنف واجد شرایط",
                    "value": benchmark["peerCount"],
                },
                "baseline": {
                    "type": f"same-category-peer-median-{metric}",
                    "value": benchmark["peerMedian"],
                    "sampleSize": benchmark["peerCount"],
                },
                "controls": benchmark["controls"],
                "assumptions": [
                    f"مقدار {label} با دقت نمایشی {precision} رقم گزارش می‌شود",
                ],
                "limitations": [
                    "رتبه یک معیار به‌تنهایی تصویر کامل عملکرد را نشان نمی‌دهد",
                    "سیاست تکمیلی کنترل اندازه یا مبلغ هنوز اعمال نشده است",
                ],
                "dataQuality": peer_quality,
                **common_evidence,
            }
        )

    for window in timing_payload:
        scope = f"timing:{window['weekday']}:{window['hour']}"
        evidence.append(
            {
                "id": f"timing-window-{window['weekday']}-{window['hour']}-{merchant_suffix}",
                "formulaId": "time.window_lift.v1",
                "titleFa": "مدرک نرخ پرداخت موفق این بازه",
                "explanationFa": (
                    f"در این بازه {window['sessions']} پرداخت یکتا ثبت شده است. نرخ بازه "
                    f"{window['verifyPct']} درصد و نرخ مبنای کل دوره {baseline_rate_pct} درصد است؛ "
                    f"بنابراین تغییر نسبی {window['liftVsBaselinePct']} درصد گزارش می‌شود."
                ),
                "grain": "merchant-period",
                "filters": [
                    {"field": "merchant_key", "operator": "=", "value": target_key},
                    {"field": "sessions", "operator": ">=", "value": 25},
                    {"field": "weekday", "operator": "=", "value": window["weekday"]},
                    {"field": "hour", "operator": "=", "value": window["hour"]},
                    {"field": "evidence_scope", "operator": "=", "value": scope},
                ],
                "formulaFa": "۱۰۰ × (نرخ پرداخت موفق بازه − نرخ مبنای کل دوره) ÷ نرخ مبنای کل دوره",
                "result": _metric_value(
                    window["liftVsBaselinePct"],
                    "percent",
                    "تغییر نرخ این بازه نسبت به نرخ مبنا",
                    "benchmark",
                    1,
                ),
                "numerator": {
                    "labelFa": "اختلاف نرخ بازه و نرخ مبنا",
                    "value": round(window["verifyPct"] - baseline_rate_pct, 2),
                },
                "denominator": {
                    "labelFa": "نرخ مبنای پرداخت موفق در کل دوره",
                    "value": baseline_rate_pct,
                },
                "baseline": {
                    "type": "merchant-period-verification-rate",
                    "value": baseline_rate_pct,
                    "sampleSize": current.sessions,
                },
                "controls": [
                    "حداقل ۲۵ پرداخت یکتا در بازه",
                    "مقایسه با نرخ مبنای همان پذیرنده و دوره",
                ],
                "assumptions": [],
                "limitations": ["الگوی زمانی مشاهده‌ای است و اثر علّی را ثابت نمی‌کند"],
                "dataQuality": timing_quality,
                **common_evidence,
                "sampleRows": time_window_sample_rows.get(scope, sample_rows),
            }
        )

    payload = {
        "selection": {
            "merchantKey": target_key,
            "period": current_period,
            "comparison": comparison_period,
        },
        "decomposition": decomposition_payload,
        "peerBenchmarks": peer_benchmarks,
        "timeWindows": timing_payload,
        "insights": [growth_insight, peer_insight, timing_insight],
        "evidence": evidence,
    }
    return {
        "schemaVersion": "1.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "dataset": {**dataset_metadata, "fingerprint": dataset_fingerprint},
        "feature": "peer-opportunities",
        "merchants": {target_key: payload},
    }


def validate_artifact(artifact: dict[str, Any]) -> None:
    if artifact.get("schemaVersion") != "1.0" or artifact.get("feature") != "peer-opportunities":
        raise ValueError("artifact envelope is invalid")
    if not isinstance(artifact.get("merchants"), dict) or not artifact["merchants"]:
        raise ValueError("artifact requires at least one merchant payload")

    def assert_finite(value: Any, path: str) -> None:
        if isinstance(value, float) and not math.isfinite(value):
            raise ValueError(f"artifact contains a non-finite number at {path}")
        if isinstance(value, dict):
            for key, item in value.items():
                assert_finite(item, f"{path}.{key}")
        elif isinstance(value, list):
            for index, item in enumerate(value):
                assert_finite(item, f"{path}[{index}]")

    assert_finite(artifact, "artifact")
    for payload in artifact["merchants"].values():
        evidence_by_id = {record["id"]: record for record in payload["evidence"]}
        evidence_ids = set(evidence_by_id)
        if len(evidence_ids) != len(payload["evidence"]):
            raise ValueError("evidence record ids must be unique")
        evidence_scopes = [
            item["value"]
            for record in payload["evidence"]
            for item in record["filters"]
            if item["field"] == "evidence_scope"
        ]
        if len(evidence_scopes) != len(set(evidence_scopes)):
            raise ValueError("evidence scopes must map to exactly one record")
        for insight in payload["insights"]:
            if insight["evidenceId"] not in evidence_ids:
                raise ValueError("every insight must reference an existing evidence record")
            if (
                insight["impact"] is not None
                and insight["impact"] != evidence_by_id[insight["evidenceId"]]["result"]
            ):
                raise ValueError("insight impact must match its evidence result")
        timing_insight = next(
            insight
            for insight in payload["insights"]
            if insight["feature"] == "timing"
        )
        if payload["timeWindows"]:
            strongest_window = max(
                payload["timeWindows"],
                key=lambda window: window["liftVsBaselinePct"],
            )
            expected_timing_evidence_id = (
                f"timing-window-{strongest_window['weekday']}-{strongest_window['hour']}-"
                f"{payload['selection']['merchantKey'].lower()}"
            )
            if timing_insight["evidenceId"] != expected_timing_evidence_id:
                raise ValueError(
                    "timing insight must reference the strongest time-window evidence"
                )
        growth_evidence = next(
            record for record in payload["evidence"]
            if record["formulaId"] == "growth.revenue_decomposition.v1"
        )
        if payload["decomposition"]:
            expected_delta = sum(
                item["contributionRial"] for item in payload["decomposition"]
            )
            if expected_delta != growth_evidence["result"]["value"]:
                raise ValueError(
                    "decomposition contribution sum does not match evidence result"
                )
        else:
            growth_insight = next(
                insight
                for insight in payload["insights"]
                if insight["feature"] == "growth"
            )
            if (
                growth_insight["status"] != "insufficient-data"
                or growth_insight["impact"] is not None
            ):
                raise ValueError(
                    "missing decomposition requires an insufficient-data insight"
                )


def source_fingerprint(source: Path) -> str:
    digest = hashlib.sha256()
    with source.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_artifact(artifact: dict[str, Any], destination: Path) -> None:
    validate_artifact(artifact)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

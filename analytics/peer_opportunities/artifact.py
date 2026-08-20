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
    sufficient = is_peer_sufficient(target.sessions, len(peers))
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
        "حداقل ۱۰۰ Session برای هر پذیرنده",
        "حذف پذیرنده هدف از گروه peer",
        "نمایش جداگانه حجم و متوسط مبلغ برای کنترل تفسیر size/ticket",
    ]
    benchmarks: list[dict[str, Any]] = []
    for metric, merchant_value, peer_values in definitions:
        percentile = midrank_percentile(merchant_value, peer_values) if peer_values else 0.0
        peer_median = robust_median(peer_values) if peer_values else 0.0
        benchmarks.append(
            {
                "metric": metric,
                "merchantValue": round(merchant_value, 2),
                "peerMedian": round(peer_median, 2),
                "percentile": percentile,
                "peerCount": len(peer_values),
                "controls": controls,
                "sufficient": sufficient,
            }
        )
    return benchmarks


def select_time_windows(
    windows: Iterable[TimeWindowAggregate],
    baseline_rate_pct: float,
) -> list[dict[str, Any]]:
    eligible: list[dict[str, Any]] = []
    for window in windows:
        if not is_time_window_eligible(window.sessions):
            continue
        lift = window_lift_pct(window.verification_rate_pct, baseline_rate_pct)
        if lift is None:
            continue
        eligible.append(
            {
                "weekday": window.weekday,
                "hour": window.hour,
                "sessions": window.sessions,
                "verifyPct": round(window.verification_rate_pct, 2),
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


def _data_quality_note() -> dict[str, str]:
    return {
        "severity": "info",
        "code": "DEVELOPMENT_FIXTURE",
        "messageFa": "این Artifact فعلاً از Fixture سطح Session تولید شده و باید با خروجی کامل analytics/common جایگزین شود.",
    }


def build_artifact(
    *,
    target_key: str,
    current_metrics: tuple[PeriodMetrics, ...],
    previous_metrics: tuple[PeriodMetrics, ...],
    time_windows: tuple[TimeWindowAggregate, ...],
    dataset_metadata: dict[str, Any],
    dataset_fingerprint: str,
    sample_rows: list[dict[str, Any]],
    current_period: dict[str, str],
    comparison_period: dict[str, str],
) -> dict[str, Any]:
    current_by_key = {metrics.merchant_key: metrics for metrics in current_metrics}
    previous_by_key = {metrics.merchant_key: metrics for metrics in previous_metrics}
    if target_key not in current_by_key or target_key not in previous_by_key:
        raise ValueError("target merchant requires both current and comparison periods")

    current = current_by_key[target_key]
    previous = previous_by_key[target_key]
    decomposition = shapley_decomposition(_period_metric(previous), _period_metric(current))
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
    timing_payload = select_time_windows(time_windows, current.verification_rate_pct)

    negative_driver = min(decomposition, key=lambda result: result.contribution_rial)
    driver_fa = {"traffic": "تعداد Session", "conversion": "نرخ موفقیت", "ticket": "متوسط مبلغ"}
    peer_verification = next(
        benchmark for benchmark in peer_benchmarks if benchmark["metric"] == "verificationRate"
    )
    strongest_window = max(
        timing_payload,
        key=lambda window: window["liftVsBaselinePct"],
        default=None,
    )

    growth_evidence_id = "peer-growth-decomposition-m275"
    peer_evidence_id = "peer-benchmark-m275"
    timing_evidence_id = "timing-window-m275"
    growth_insight = {
        "id": "growth-driver-m275",
        "feature": "growth",
        "priority": 1,
        "status": "warning" if negative_driver.contribution_rial < 0 else "stable",
        "titleFa": f"بیشترین فشار منفی از {driver_fa[negative_driver.driver]} آمده است",
        "findingFa": "اثر Traffic، Conversion و Ticket بدون دوباره‌شماری interaction از هم جدا شده است.",
        "actionFa": "ابتدا Driver منفی را بررسی کنید و تغییر حجم را به‌تنهایی نشانه افت تقاضا ندانید.",
        "impact": _metric_value(
            negative_driver.contribution_rial,
            "rial",
            "سهم Driver از تغییر حجم موفق",
            "actual",
            0,
        ),
        "confidence": "high",
        "confidenceReasonFa": "محاسبه روی Session grain و با Shapley identity انجام شده است.",
        "evidenceId": growth_evidence_id,
        "destination": "/opportunities",
    }
    peer_insight = {
        "id": "peer-position-m275",
        "feature": "peers",
        "priority": 2,
        "status": (
            "insufficient-data"
            if not peer_verification["sufficient"]
            else "warning" if peer_verification["percentile"] < 50 else "stable"
        ),
        "titleFa": "جایگاه نرخ موفقیت نسبت به هم‌صنف",
        "findingFa": (
            f"نرخ موفقیت در صدک {peer_verification['percentile']:.1f} میان "
            f"{peer_verification['peerCount']} پذیرنده واجد شرایط قرار دارد."
        ),
        "actionFa": "هم‌زمان نرخ موفقیت، حجم و متوسط مبلغ را ببینید؛ رتبه حجم به‌تنهایی کافی نیست.",
        "impact": _metric_value(
            peer_verification["percentile"],
            "percent",
            "صدک نرخ موفقیت",
            "benchmark",
            1,
        ) if peer_verification["sufficient"] else None,
        "confidence": "medium" if peer_verification["sufficient"] else "low",
        "confidenceReasonFa": "گروه peer هم‌صنف، هم‌دوره و دارای حداقل sample است.",
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
            f"این بازه {strongest_window['liftVsBaselinePct']:.1f}٪ بالاتر از baseline همان دوره است."
            if strongest_window else "هیچ cell با حداقل ۲۵ Session وجود ندارد."
        ),
        "actionFa": "الگوی Checkout و کمپین‌های این بازه را بررسی کنید؛ این مشاهده ادعای علّی نیست.",
        "impact": _metric_value(
            strongest_window["liftVsBaselinePct"],
            "percent",
            "Lift نسبت به baseline",
            "benchmark",
            1,
        ) if strongest_window else None,
        "confidence": "medium" if strongest_window else "low",
        "confidenceReasonFa": "فقط cellهای دارای حداقل ۲۵ Session وارد مقایسه شده‌اند.",
        "evidenceId": timing_evidence_id,
        "destination": "/opportunities",
    }

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
        "dataQuality": [_data_quality_note()],
    }
    evidence = [
        {
            "id": growth_evidence_id,
            "formulaId": "growth.revenue_decomposition.v1",
            "titleFa": "تفکیک تغییر حجم موفق",
            "explanationFa": "میانگین اثر حاشیه‌ای سه Driver در تمام شش ترتیب Shapley محاسبه شده است.",
            "grain": "merchant-period",
            "filters": [{"field": "merchant_key", "operator": "=", "value": target_key}],
            "formulaFa": "حجم موفق = Session × نرخ موفقیت × متوسط مبلغ موفق",
            "result": _metric_value(
                current.verified_volume_rial - previous.verified_volume_rial,
                "rial",
                "تغییر حجم موفق",
                "actual",
                0,
            ),
            "controls": ["دوره‌های هم‌اندازه", "Session grain", "Shapley interaction allocation"],
            "assumptions": ["eventual_verified از Loader مشترک معتبر دریافت می‌شود"],
            "limitations": ["این تفکیک توصیفی است و ادعای علیت ندارد"],
            **common_evidence,
        },
        {
            "id": peer_evidence_id,
            "formulaId": "peer.robust_percentile.v1",
            "titleFa": "جایگاه در گروه هم‌صنف",
            "explanationFa": "Percentile با mid-rank و median مقاوم در برابر outlier محاسبه شده است.",
            "grain": "peer-group",
            "filters": [
                {"field": "category_id", "operator": "=", "value": current.category_id},
                {"field": "sessions", "operator": ">=", "value": 100},
            ],
            "formulaFa": "۱۰۰ × (تعداد کمتر + نصف تعداد مساوی) ÷ تعداد peer",
            "result": _metric_value(
                peer_verification["percentile"],
                "percent",
                "صدک نرخ موفقیت",
                "benchmark",
                1,
            ),
            "baseline": {
                "type": "same-category-peer-median",
                "value": peer_verification["peerMedian"],
                "sampleSize": peer_verification["peerCount"],
            },
            "controls": peer_verification["controls"],
            "assumptions": ["تعریف دقیق size/ticket cohort در انتظار تأیید Human Lead است"],
            "limitations": ["Volume rank و performance rank معادل نیستند"],
            **common_evidence,
        },
        {
            "id": timing_evidence_id,
            "formulaId": "time.window_lift.v1",
            "titleFa": "مقایسه بازه‌های زمانی",
            "explanationFa": "نرخ هر cell واجد شرایط با baseline همان پذیرنده و دوره مقایسه شده است.",
            "grain": "merchant-period",
            "filters": [
                {"field": "merchant_key", "operator": "=", "value": target_key},
                {"field": "sessions", "operator": ">=", "value": 25},
            ],
            "formulaFa": "(نرخ cell − نرخ baseline) ÷ نرخ baseline",
            "result": _metric_value(
                strongest_window["liftVsBaselinePct"] if strongest_window else 0,
                "percent",
                "بیشترین Lift مشاهده‌شده",
                "benchmark",
                1,
            ),
            "baseline": {
                "type": "merchant-period-verification-rate",
                "value": current.verification_rate_pct,
                "sampleSize": current.sessions,
            },
            "controls": ["حداقل ۲۵ Session در cell", "baseline همان merchant و period"],
            "assumptions": ["timestamp بدون تبدیل timezone مصرف شده است"],
            "limitations": ["الگوی زمانی مشاهده‌ای است و اثر علّی نیست"],
            **common_evidence,
        },
    ]

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
        evidence_ids = {record["id"] for record in payload["evidence"]}
        for insight in payload["insights"]:
            if insight["evidenceId"] not in evidence_ids:
                raise ValueError("every insight must reference an existing evidence record")
        expected_delta = sum(item["contributionRial"] for item in payload["decomposition"])
        growth_evidence = next(
            record for record in payload["evidence"]
            if record["formulaId"] == "growth.revenue_decomposition.v1"
        )
        if expected_delta != growth_evidence["result"]["value"]:
            raise ValueError("decomposition contribution sum does not match evidence result")


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


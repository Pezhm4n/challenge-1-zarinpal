"use client"

import { useMemo, useState } from "react"
import { CircleGauge, Database, FlaskConical, TrendingDown, TrendingUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ActionCenterPayload, AnalysisArtifact } from "@/contracts"
import { resolveActionCenterSelection } from "@/contracts"
import { InsightCard } from "@/entities/insight/insight-card"
import { formatMetricValue } from "@/entities/insight/metric-value"
import { MerchantSelector } from "@/entities/merchant/merchant-selector"
import { cn } from "@/lib/utils"

import { prioritizeInsights } from "./model"
import { PeriodSelector } from "./period-selector"


function periodKey(period: { from: string; to: string }): string {
  return `${period.from}|${period.to}`
}


function coverageLabel(quality: ActionCenterPayload["merchant"]["dataCoverage"]["quality"]): string {
  const labels = {
    sufficient: "پوشش کافی",
    limited: "پوشش محدود",
    insufficient: "پوشش ناکافی",
  } as const
  return labels[quality]
}


function HeadlineMetric({
  metric,
}: {
  metric: ActionCenterPayload["headlineMetrics"][number]
}) {
  const change = metric.change
  const isPositive = change ? change.value > 0 : false
  const isNegative = change ? change.value < 0 : false
  const DirectionIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <div className="min-w-0 rounded-lg border bg-card p-4">
      <p className="text-xs leading-5 text-muted-foreground">{metric.value.labelFa}</p>
      <p className="mt-2 break-words text-lg font-bold tabular-nums sm:text-xl">
        {formatMetricValue(metric.value)}
      </p>
      {change ? (
        <div
          className={cn(
            "mt-3 flex items-center gap-1.5 text-xs font-medium",
            isPositive && "text-success-foreground",
            isNegative && "text-destructive",
            !isPositive && !isNegative && "text-muted-foreground",
          )}
        >
          <DirectionIcon aria-hidden="true" className="size-4" />
          <span>
            {isPositive ? "افزایش" : isNegative ? "کاهش" : "بدون تغییر"}: {formatMetricValue(change)}
          </span>
        </div>
      ) : null}
    </div>
  )
}


export function ActionCenter({
  artifact,
  showDevelopmentFixture = false,
}: {
  artifact: AnalysisArtifact<ActionCenterPayload>
  showDevelopmentFixture?: boolean
}) {
  const merchantKeys = Object.keys(artifact.merchants)
  const [merchantKey, setMerchantKey] = useState(merchantKeys[0] ?? "")
  const initialPayload = artifact.merchants[merchantKey]
  const [selectedPeriodKey, setSelectedPeriodKey] = useState(
    initialPayload ? periodKey(initialPayload.selection.period) : "",
  )

  const merchantOptions = merchantKeys.map((key) => {
    const merchant = artifact.merchants[key].merchant
    return {
      value: key,
      label: key,
      description: merchant.categoryTitleFa,
    }
  })
  const availablePeriods = artifact.merchants[merchantKey]?.merchant.availablePeriods ?? []
  const periodOptions = availablePeriods.map((period) => ({
    value: periodKey(period),
    label: period.labelFa,
  }))
  const selectedPeriod =
    availablePeriods.find((period) => periodKey(period) === selectedPeriodKey) ??
    availablePeriods[0]

  const resolution = selectedPeriod
    ? resolveActionCenterSelection(artifact, {
        merchantKey,
        period: { from: selectedPeriod.from, to: selectedPeriod.to },
      })
    : null
  const payload = resolution?.success ? resolution.data : null
  const insights = useMemo(
    () =>
      payload
        ? prioritizeInsights(payload.prioritizedInsights, payload.evidenceIndex)
        : [],
    [payload],
  )
  const headlineInsight =
    insights.find((insight) => insight.feature === "growth") ?? insights[0]

  function handleMerchantChange(nextMerchantKey: string) {
    const nextPayload = artifact.merchants[nextMerchantKey]
    setMerchantKey(nextMerchantKey)
    setSelectedPeriodKey(
      nextPayload ? periodKey(nextPayload.selection.period) : "",
    )
  }

  if (!payload) {
    return (
      <section aria-labelledby="action-center-title" className="rounded-xl border bg-card p-6">
        <h1 id="action-center-title" className="text-xl font-semibold">
          گزارش قابل نمایش نیست
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          پذیرنده یا دوره دیگری را انتخاب کنید.
        </p>
      </section>
    )
  }

  return (
    <div className="grid gap-6 lg:gap-8">
      <section
        aria-labelledby="action-center-title"
        className="grid gap-5 rounded-xl border bg-card p-4 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <CircleGauge aria-hidden="true" data-icon="inline-start" />
              مرکز اقدام
            </Badge>
            <Badge variant="outline">
              <Database aria-hidden="true" data-icon="inline-start" />
              {coverageLabel(payload.merchant.dataCoverage.quality)}
            </Badge>
            {showDevelopmentFixture ? (
              <Badge variant="outline" className="border-dashed">
                <FlaskConical aria-hidden="true" data-icon="inline-start" />
                Fixture توسعه
              </Badge>
            ) : null}
          </div>
          <h1 id="action-center-title" className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            سه اقدام مهم برای {payload.merchant.merchantKey}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            ابتدا مهم‌ترین فرصت را بررسی کنید. اثر مالی، اقدام بعدی و سطح اطمینان هر تحلیل جدا نمایش داده شده است.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end">
          <MerchantSelector
            value={merchantKey}
            options={merchantOptions}
            onValueChange={handleMerchantChange}
          />
          <PeriodSelector
            value={selectedPeriodKey}
            options={periodOptions}
            onValueChange={setSelectedPeriodKey}
          />
        </div>
      </section>

      <section aria-labelledby="headline-title" className="grid gap-4">
        <div>
          <p className="text-xs font-semibold text-info-foreground">خلاصه دوره</p>
          <h2 id="headline-title" className="mt-1 text-xl font-bold sm:text-2xl">
            {headlineInsight?.titleFa ?? "خلاصه قابل اتکا برای این دوره موجود نیست"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            {headlineInsight?.findingFa ??
              "برای این انتخاب هنوز Insight دارای مدرک کافی تولید نشده است."}
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {payload.headlineMetrics.map((metric) => (
            <HeadlineMetric key={metric.id} metric={metric} />
          ))}
        </div>
      </section>

      <section aria-labelledby="insights-title" className="grid gap-4">
        <div>
          <p className="text-xs font-semibold text-info-foreground">اولویت‌بندی اقدام‌ها</p>
          <h2 id="insights-title" className="mt-1 text-xl font-bold sm:text-2xl">
            از اقدام اول شروع کنید
          </h2>
        </div>

        {insights[0] ? <InsightCard insight={insights[0]} rank={1} featured /> : null}
        {insights.length > 1 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {insights.slice(1).map((insight, index) => (
              <InsightCard key={insight.id} insight={insight} rank={index + 2} />
            ))}
          </div>
        ) : null}
      </section>

      <Card className="gap-3 bg-secondary/50">
        <CardHeader>
          <CardTitle className="text-sm">مبنای این گزارش</CardTitle>
        </CardHeader>
        <CardContent className="text-xs leading-6 text-muted-foreground">
          {new Intl.NumberFormat("fa-IR").format(payload.merchant.dataCoverage.sessions)} Session بررسی شده است. مبلغ‌ها ریال‌اند و Retryها پیش از محاسبه فروش روی Session تجمیع شده‌اند.
        </CardContent>
      </Card>
    </div>
  )
}

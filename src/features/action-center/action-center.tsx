"use client"

import { useMemo, useRef, useState } from "react"
import {
  Calculator,
  CircleGauge,
  CircleMinus,
  Database,
  FlaskConical,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type {
  ActionCenterPayload,
  AnalysisArtifact,
  ArtifactError,
  EvidenceRecord,
} from "@/contracts"
import {
  parseActionCenterArtifact,
  resolveActionCenterSelection,
} from "@/contracts"
import { EvidenceSheet } from "@/entities/evidence/evidence-sheet"
import {
  resolveEvidenceRecord,
  type EvidenceResolution,
} from "@/entities/evidence/model"
import { InsightCard } from "@/entities/insight/insight-card"
import { formatMetricValue } from "@/entities/insight/metric-value"
import { MerchantSelector } from "@/entities/merchant/merchant-selector"
import { cn } from "@/lib/utils"

import {
  ActionCenterEmptyState,
  ActionCenterErrorState,
  InsufficientDataNotice,
} from "./action-center-state"
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
  onEvidenceRequest,
}: {
  metric: ActionCenterPayload["headlineMetrics"][number]
  onEvidenceRequest: (evidenceId: string) => void
}) {
  const change = metric.change
  const isPositive = change ? change.value > 0 : false
  const isNegative = change ? change.value < 0 : false
  const DirectionIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : CircleMinus

  return (
    <div className="flex min-w-0 flex-col rounded-lg border bg-card p-4">
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
      <Button
        variant="ghost"
        size="sm"
        className="mt-auto min-h-11 w-full justify-start px-0 text-info-foreground"
        aria-label={`چطور ${metric.value.labelFa} محاسبه شد؟`}
        onClick={() => onEvidenceRequest(metric.evidenceId)}
      >
        <Calculator aria-hidden="true" data-icon="inline-start" />
        چطور محاسبه شد؟
      </Button>
    </div>
  )
}

function noMerchantError(): ArtifactError {
  return {
    code: "INSUFFICIENT_DATA",
    messageFa: "برای هیچ پذیرنده‌ای گزارش آماده نشده است. Artifact تحلیل را دوباره تولید کنید.",
    recoverable: true,
  }
}

function ResolvedActionCenter({
  artifact,
  showDevelopmentFixture,
}: {
  artifact: AnalysisArtifact<ActionCenterPayload>
  showDevelopmentFixture: boolean
}) {
  const merchantKeys = Object.keys(artifact.merchants)
  const [merchantKey, setMerchantKey] = useState(merchantKeys[0] ?? "")
  const initialPayload = artifact.merchants[merchantKey]
  const [selectedPeriodKey, setSelectedPeriodKey] = useState(
    initialPayload ? periodKey(initialPayload.selection.period) : "",
  )
  const [evidenceResolution, setEvidenceResolution] =
    useState<EvidenceResolution | null>(null)
  const evidenceTriggerRef = useRef<HTMLElement | null>(null)

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
  const hasInsufficientData =
    payload?.merchant.dataCoverage.quality === "insufficient" ||
    insights.some((insight) => insight.status === "insufficient-data")

  function closeEvidence() {
    setEvidenceResolution(null)
  }

  function handleMerchantChange(nextMerchantKey: string) {
    const nextPayload = artifact.merchants[nextMerchantKey]
    setMerchantKey(nextMerchantKey)
    setSelectedPeriodKey(
      nextPayload ? periodKey(nextPayload.selection.period) : "",
    )
    closeEvidence()
  }

  function handlePeriodChange(nextPeriodKey: string) {
    setSelectedPeriodKey(nextPeriodKey)
    closeEvidence()
  }

  function handleEvidenceRequest(evidenceId: string) {
    if (document.activeElement instanceof HTMLElement) {
      evidenceTriggerRef.current = document.activeElement
    }
    setEvidenceResolution(
      resolveEvidenceRecord(payload?.evidenceIndex ?? {}, evidenceId),
    )
  }

  function handleEvidenceOpenChange(open: boolean) {
    if (open) return

    closeEvidence()
    window.requestAnimationFrame(() => evidenceTriggerRef.current?.focus())
  }

  if (!payload) {
    return (
      <ActionCenterErrorState
        error={resolution?.success === false ? resolution.error : noMerchantError()}
      />
    )
  }

  const selectedEvidence: EvidenceRecord | null =
    evidenceResolution?.success === true ? evidenceResolution.data : null
  const selectedEvidenceError: ArtifactError | null =
    evidenceResolution?.success === false ? evidenceResolution.error : null

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
            onValueChange={handlePeriodChange}
          />
        </div>
      </section>

      {hasInsufficientData ? <InsufficientDataNotice /> : null}

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
        {payload.headlineMetrics.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {payload.headlineMetrics.map((metric) => (
              <HeadlineMetric
                key={metric.id}
                metric={metric}
                onEvidenceRequest={handleEvidenceRequest}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section aria-labelledby="insights-title" className="grid gap-4">
        <div>
          <p className="text-xs font-semibold text-info-foreground">اولویت‌بندی اقدام‌ها</p>
          <h2 id="insights-title" className="mt-1 text-xl font-bold sm:text-2xl">
            از اقدام اول شروع کنید
          </h2>
        </div>

        {insights.length === 0 ? <ActionCenterEmptyState /> : null}
        {insights[0] ? (
          <InsightCard
            insight={insights[0]}
            rank={1}
            featured
            onEvidenceRequest={handleEvidenceRequest}
          />
        ) : null}
        {insights.length > 1 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {insights.slice(1).map((insight, index) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                rank={index + 2}
                onEvidenceRequest={handleEvidenceRequest}
              />
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

      <EvidenceSheet
        evidence={selectedEvidence}
        error={selectedEvidenceError}
        open={evidenceResolution !== null}
        onOpenChange={handleEvidenceOpenChange}
      />
    </div>
  )
}

export function ActionCenter({
  artifact,
  showDevelopmentFixture = false,
}: {
  artifact: unknown
  showDevelopmentFixture?: boolean
}) {
  const parsedArtifact = parseActionCenterArtifact(artifact)

  if (!parsedArtifact.success) {
    return <ActionCenterErrorState error={parsedArtifact.error} />
  }

  if (Object.keys(parsedArtifact.data.merchants).length === 0) {
    return <ActionCenterErrorState error={noMerchantError()} />
  }

  return (
    <ResolvedActionCenter
      artifact={parsedArtifact.data}
      showDevelopmentFixture={showDevelopmentFixture}
    />
  )
}

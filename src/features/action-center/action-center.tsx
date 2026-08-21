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

import { formatActionCenterPeriodLabel } from "@/lib/persian-date"
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
    <div className="flex min-w-0 flex-col rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:border-border hover:shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{metric.value.labelFa}</p>
      <p className="mt-2.5 break-words text-2xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-3xl">
        {formatMetricValue(metric.value)}
      </p>
      {change ? (
        <div
          className={cn(
            "mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
            isPositive && "bg-success/10 text-success-foreground",
            isNegative && "bg-destructive/10 text-destructive",
            !isPositive && !isNegative && "bg-muted text-muted-foreground",
          )}
        >
          <DirectionIcon aria-hidden="true" className="size-3.5" />
          <span>
            {isPositive ? "افزایش" : isNegative ? "کاهش" : "بدون تغییر"}: {formatMetricValue(change)}
          </span>
        </div>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className="mt-4 min-h-9 w-full justify-start text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
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
  const merchantData = artifact.merchants[merchantKey]?.merchant
  const availablePeriods = merchantData?.availablePeriods ?? []
  const periodOptions = availablePeriods.map((period) => ({
    value: periodKey(period),
    label: formatActionCenterPeriodLabel(period, merchantData?.dataCoverage),
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
    <div className="grid gap-8 lg:gap-10">
      <section
        aria-labelledby="action-center-title"
        className="grid gap-6 rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs lg:grid-cols-[1fr_auto] lg:items-end"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 font-semibold">
              <CircleGauge aria-hidden="true" data-icon="inline-start" />
              مرکز اقدام
            </Badge>
            <Badge variant="outline" className="gap-1.5 font-semibold">
              <Database aria-hidden="true" data-icon="inline-start" />
              {coverageLabel(payload.merchant.dataCoverage.quality)}
            </Badge>
            {showDevelopmentFixture ? (
              <Badge variant="outline" className="gap-1.5 border-dashed font-semibold text-primary">
                <FlaskConical aria-hidden="true" data-icon="inline-start" />
                Fixture توسعه
              </Badge>
            ) : null}
          </div>
          <h1 id="action-center-title" className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            سه اقدام مهم برای <span className="text-primary">{payload.merchant.merchantKey}</span>
          </h1>
          <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
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
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">خلاصه دوره</span>
          <h2 id="headline-title" className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {headlineInsight?.titleFa ?? "خلاصه قابل اتکا برای این دوره موجود نیست"}
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
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

      <section aria-labelledby="insights-title" className="grid gap-5">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">اولویت‌بندی اقدام‌ها</span>
          <h2 id="insights-title" className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
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
          <div className="grid gap-5 lg:grid-cols-2">
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

      <Card className="gap-3 rounded-2xl border border-border/60 bg-muted/40 p-5 shadow-xs">
        <CardHeader className="p-0">
          <CardTitle className="text-sm font-bold text-foreground">مبنای این گزارش</CardTitle>
        </CardHeader>
        <CardContent className="p-0 text-xs leading-relaxed text-muted-foreground">
          {new Intl.NumberFormat("fa-IR").format(payload.merchant.dataCoverage.sessions)} پرداخت یکتا بررسی شده است. مبلغ‌ها ریال‌اند و تلاش‌های مجدد پیش از محاسبه فروش روی هر پرداخت تجمیع شده‌اند.
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

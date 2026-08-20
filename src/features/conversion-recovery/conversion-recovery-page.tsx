"use client"

import { useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  BanknoteArrowDown,
  Calculator,
  ChartNoAxesColumnDecreasing,
  CheckCircle2,
  CircleAlert,
  CircleGauge,
  Database,
  FlaskConical,
  RefreshCcw,
  Route,
  ShieldCheck,
  Target,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { RecoveryEvidenceSheet } from "./recovery-evidence-sheet"
import { RecoveryMerchantSelector } from "./recovery-merchant-selector"
import type {
  ConversionRecoveryArtifact,
  ConversionRecoveryPayload,
  EvidenceRecord,
  FunnelStage,
  RecoverySegment,
} from "./types"


const faInteger = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 })
const faPercent = new Intl.NumberFormat("fa-IR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})
const faDate = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const stageLabels: Record<FunnelStage["stage"], string> = {
  session: "درخواست پرداخت",
  attempted: "شروع پرداخت",
  "in-bank": "ورود به بانک",
  verified: "پرداخت موفق",
}
const bandLabels: Record<string, string> = {
  low: "مبلغ پایین",
  "lower-middle": "میانی پایین",
  "upper-middle": "میانی بالا",
  high: "مبلغ بالا",
}

function formatRial(value: number): string {
  return `${faInteger.format(value)} ریال`
}

function formatCompactRial(value: number): string {
  if (value >= 1_000_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value / 1_000_000_000)} میلیارد ریال`
  }
  if (value >= 1_000_000) {
    return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value / 1_000_000)} میلیون ریال`
  }
  return formatRial(value)
}

function formatPeriod(value: string): string {
  return faDate.format(new Date(`${value}T00:00:00Z`))
}

function EvidenceButton({
  label,
  evidenceId,
  onRequest,
}: {
  label: string
  evidenceId: string
  onRequest: (evidenceId: string) => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="min-h-11 justify-start"
      aria-label={`مشاهده ${label}`}
      onClick={() => onRequest(evidenceId)}
    >
      <Calculator aria-hidden="true" data-icon="inline-start" />
      {label}
    </Button>
  )
}

function FunnelStageCard({
  stage,
  index,
  isPrimaryDrop,
  onEvidenceRequest,
}: {
  stage: FunnelStage
  index: number
  isPrimaryDrop: boolean
  onEvidenceRequest: (evidenceId: string) => void
}) {
  const displayRate = stage.rateFromPrevious ?? 100
  return (
    <Card
      size="sm"
      className={cn("relative h-full", isPrimaryDrop && "ring-destructive/40")}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Badge variant={isPrimaryDrop ? "destructive" : "secondary"}>
            مرحله {faInteger.format(index + 1)}
          </Badge>
          {stage.rateFromPrevious !== null ? (
            <span className="text-xs tabular-nums text-muted-foreground">
              عبور {faPercent.format(stage.rateFromPrevious)}٪
            </span>
          ) : null}
        </div>
        <CardTitle>
          <h3>{stageLabels[stage.stage]}</h3>
        </CardTitle>
        <CardDescription>
          {stage.stage === "verified"
            ? "فقط try_status = Verified"
            : "Session یکتا؛ Retry دوباره شمرده نمی‌شود"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {faInteger.format(stage.count)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCompactRial(stage.amountRial)} مبلغ درخواستی
          </p>
        </div>
        <div
          role="img"
          aria-label={`${stageLabels[stage.stage]}: ${faPercent.format(displayRate)} درصد از مرحله قبل`}
          className="h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className={cn(
              "h-full rounded-full",
              isPrimaryDrop ? "bg-destructive" : "bg-primary",
            )}
            style={{ inlineSize: `${Math.max(displayRate, 3)}%` }}
          />
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-1 bg-muted/30 sm:grid-cols-1 xl:grid-cols-2">
        <EvidenceButton
          label="مدرک تعداد"
          evidenceId={stage.evidenceIds.count}
          onRequest={onEvidenceRequest}
        />
        <EvidenceButton
          label="مدرک مبلغ"
          evidenceId={stage.evidenceIds.amount}
          onRequest={onEvidenceRequest}
        />
        {stage.evidenceIds.rate ? (
          <div className="col-span-2 sm:col-span-1 xl:col-span-2">
            <EvidenceButton
              label="مدرک نرخ عبور"
              evidenceId={stage.evidenceIds.rate}
              onRequest={onEvidenceRequest}
            />
          </div>
        ) : null}
      </CardFooter>
    </Card>
  )
}

function MetricEvidenceRow({
  label,
  value,
  evidenceId,
  onEvidenceRequest,
}: {
  label: string
  value: string
  evidenceId: string
  onEvidenceRequest: (evidenceId: string) => void
}) {
  return (
    <div className="grid gap-2 rounded-lg bg-muted/60 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 font-bold tabular-nums">{value}</p>
      </div>
      <EvidenceButton
        label={`مدرک ${label}`}
        evidenceId={evidenceId}
        onRequest={onEvidenceRequest}
      />
    </div>
  )
}

function SegmentRow({
  segment,
  onEvidenceRequest,
}: {
  segment: RecoverySegment
  onEvidenceRequest: (evidenceId: string) => void
}) {
  const [, band = segment.key] = segment.key.split("|", 2)
  return (
    <div className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
      <div>
        <p className="font-medium">{bandLabels[band] ?? band}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {faInteger.format(segment.sessions)} Session attempted
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {segment.quality === "sufficient" && segment.verifyPct !== null ? (
          <>
            <Badge variant="secondary">
              Verified: {faPercent.format(segment.verifyPct)}٪
            </Badge>
            {segment.peerOrBaselinePct !== null ? (
              <Badge variant="outline">
                خط مبنای مبلغ: {faPercent.format(segment.peerOrBaselinePct)}٪
              </Badge>
            ) : null}
          </>
        ) : (
          <Badge variant="outline">نمونه ناکافی؛ بدون رتبه‌بندی</Badge>
        )}
      </div>
      <EvidenceButton
        label="مدرک سگمنت"
        evidenceId={segment.evidenceId}
        onRequest={onEvidenceRequest}
      />
    </div>
  )
}

export function ConversionRecoveryPage({
  artifact,
  payload,
  merchantKeys,
}: {
  artifact: ConversionRecoveryArtifact
  payload: ConversionRecoveryPayload
  merchantKeys: string[]
}) {
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)
  const evidenceTriggerRef = useRef<HTMLElement | null>(null)
  const evidenceIndex = useMemo(
    () => new Map(payload.evidence.map((record) => [record.id, record])),
    [payload.evidence],
  )
  const selectedEvidence: EvidenceRecord | null = selectedEvidenceId
    ? evidenceIndex.get(selectedEvidenceId) ?? null
    : null
  const insight = payload.insights[0]
  const scenario = payload.scenarios[0]
  const pspGroups = useMemo(() => {
    const groups = new Map<string, RecoverySegment[]>()
    for (const segment of payload.segments) {
      if (segment.dimension !== "psp") continue
      const [psp] = segment.key.split("|", 1)
      const rows = groups.get(psp) ?? []
      rows.push(segment)
      groups.set(psp, rows)
    }
    return [...groups.entries()]
  }, [payload.segments])
  const primaryDropIndex = payload.funnel.reduce(
    (currentIndex, stage, index, funnel) => {
      if (index === 0 || stage.rateFromPrevious === null) return currentIndex
      const currentRate = funnel[currentIndex].rateFromPrevious ?? 101
      return stage.rateFromPrevious < currentRate ? index : currentIndex
    },
    1,
  )

  function handleEvidenceRequest(evidenceId: string) {
    if (document.activeElement instanceof HTMLElement) {
      evidenceTriggerRef.current = document.activeElement
    }
    setSelectedEvidenceId(evidenceId)
  }

  function handleEvidenceOpenChange(open: boolean) {
    if (open) return
    setSelectedEvidenceId(null)
    window.requestAnimationFrame(() => evidenceTriggerRef.current?.focus())
  }

  return (
    <div className="grid gap-6 lg:gap-8">
      <header className="grid gap-5 rounded-xl border bg-card p-4 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <Route aria-hidden="true" data-icon="inline-start" />
              تشخیص مسیر پرداخت
            </Badge>
            <Badge variant="outline">
              <Database aria-hidden="true" data-icon="inline-start" />
              داده قطعی Session-level
            </Badge>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            بازیابی Conversion برای {payload.selection.merchantKey}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            افت فروش را از درخواست پرداخت تا Verified دنبال کنید؛ هر عدد مدرک، فرمول و Session نمونه دارد.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            دوره {formatPeriod(payload.selection.period.from)} تا {formatPeriod(payload.selection.period.to)}؛ مقایسه با {payload.selection.comparison ? `${formatPeriod(payload.selection.comparison.from)} تا ${formatPeriod(payload.selection.comparison.to)}` : "بدون دوره مبنا"}
          </p>
        </div>
        <RecoveryMerchantSelector
          merchantKey={payload.selection.merchantKey}
          merchantKeys={merchantKeys}
        />
      </header>

      {insight ? (
        <Card className="ring-primary/30">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={insight.status === "opportunity" ? "default" : "outline"}>
                <CircleGauge aria-hidden="true" data-icon="inline-start" />
                ریشه افت
              </Badge>
              <Badge variant="outline">اطمینان {insight.confidence === "medium" ? "متوسط" : insight.confidence}</Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl">
              <h2>{insight.titleFa}</h2>
            </CardTitle>
            <CardDescription className="max-w-4xl text-sm leading-7 text-foreground/80 sm:text-base">
              {insight.findingFa}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-[1fr_18rem]">
            <div className="flex items-start gap-3 rounded-lg border bg-card p-4">
              <Target aria-hidden="true" className="mt-1 size-5 shrink-0 text-info" />
              <div>
                <p className="text-xs font-semibold text-info-foreground">اقدام بعدی</p>
                <p className="mt-1 text-sm leading-7">{insight.actionFa}</p>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {insight.confidenceReasonFa}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/70 p-4">
              <p className="text-xs text-muted-foreground">پتانسیل برآوردی و غیرتضمینی</p>
              <p className="mt-2 text-2xl font-bold tabular-nums">
                {scenario ? formatCompactRial(scenario.estimatedVolumeRial) : "داده ناکافی"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {scenario
                  ? `حدود ${faInteger.format(scenario.estimatedOrders)} سفارش؛ ادعای علّی نیست`
                  : "Recommendation عددی ساخته نشده است"}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2">
            <EvidenceButton
              label="مدرک Insight"
              evidenceId={insight.evidenceId}
              onRequest={handleEvidenceRequest}
            />
            {scenario ? (
              <EvidenceButton
                label="مدرک سفارش برآوردی"
                evidenceId={scenario.evidenceIds.orders}
                onRequest={handleEvidenceRequest}
              />
            ) : null}
          </CardFooter>
        </Card>
      ) : null}

      <section aria-labelledby="payment-rail-title" className="grid gap-4">
        <div>
          <p className="text-xs font-semibold text-info-foreground">ریل تشخیصی</p>
          <h2 id="payment-rail-title" className="mt-1 text-xl font-bold sm:text-2xl">
            افت در کدام مرحله رخ داده است؟
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
            مقدار هر Stage یک‌بار در سطح Session جمع شده است. کوتاه‌ترین نرخ عبور، محل اصلی ریزش را نشان می‌دهد.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {payload.funnel.map((stage, index) => (
            <FunnelStageCard
              key={stage.stage}
              stage={stage}
              index={index}
              isPrimaryDrop={index === primaryDropIndex}
              onEvidenceRequest={handleEvidenceRequest}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="diagnosis-title" className="grid gap-4">
        <div>
          <p className="text-xs font-semibold text-info-foreground">دو اهرم قابل پیگیری</p>
          <h2 id="diagnosis-title" className="mt-1 text-xl font-bold sm:text-2xl">
            قبل از تلاش و بعد از خطای اول
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BanknoteArrowDown aria-hidden="true" className="size-5" />
                <h3>NoAttempt</h3>
              </CardTitle>
              <CardDescription>
                Sessionهایی که هیچ تلاش پرداختی را شروع نکرده‌اند؛ مهم‌ترین شکاف این دوره.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <MetricEvidenceRow
                label="Session بدون تلاش"
                value={faInteger.format(payload.noAttempt.sessions)}
                evidenceId={payload.noAttempt.evidenceIds.sessions}
                onEvidenceRequest={handleEvidenceRequest}
              />
              <MetricEvidenceRow
                label="سهم از همه Sessionها"
                value={payload.noAttempt.sharePct === null ? "داده ناکافی" : `${faPercent.format(payload.noAttempt.sharePct)}٪`}
                evidenceId={payload.noAttempt.evidenceIds.share}
                onEvidenceRequest={handleEvidenceRequest}
              />
              <MetricEvidenceRow
                label="مبلغ درخواستی درگیر"
                value={formatCompactRial(payload.noAttempt.requestedAmountRial)}
                evidenceId={payload.noAttempt.evidenceIds.amount}
                onEvidenceRequest={handleEvidenceRequest}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCcw aria-hidden="true" className="size-5" />
                <h3>بازیابی پس از تلاش اول</h3>
              </CardTitle>
              <CardDescription>
                صورت فقط Sessionهای first-try-non-verified است؛ recovered زیرمجموعه همان denominator است.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <MetricEvidenceRow
                label="واجد بازیابی"
                value={faInteger.format(payload.retry.firstTryNonVerifiedSessions)}
                evidenceId={payload.retry.evidenceIds.eligible}
                onEvidenceRequest={handleEvidenceRequest}
              />
              <MetricEvidenceRow
                label="بازیابی‌شده"
                value={faInteger.format(payload.retry.recoveredSessions)}
                evidenceId={payload.retry.evidenceIds.recovered}
                onEvidenceRequest={handleEvidenceRequest}
              />
              <MetricEvidenceRow
                label="نرخ بازیابی"
                value={payload.retry.recoveryPct === null ? "داده ناکافی" : `${faPercent.format(payload.retry.recoveryPct)}٪`}
                evidenceId={payload.retry.evidenceIds.rate}
                onEvidenceRequest={handleEvidenceRequest}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <Alert>
        <FlaskConical aria-hidden="true" />
        <AlertTitle>سناریو، اثر علّی یا تضمین فروش نیست</AlertTitle>
        <AlertDescription>
          خط مبنا سهم NoAttempt دوره قبل است؛ نرخ تبدیل attempted و متوسط مبلغ Verified دوره جاری ثابت فرض شده‌اند. Paid فقط عبور از بانک است و Reversed موفقیت محسوب نمی‌شود.
        </AlertDescription>
      </Alert>

      <section aria-labelledby="psp-title" className="grid gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-info-foreground">کنترل متغیر مخدوش‌کننده</p>
            <h2 id="psp-title" className="mt-1 text-xl font-bold sm:text-2xl">
              PSP بعد از کنترل مبلغ و حجم نمونه
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              نرخ هر PSP فقط در همان Quartile مبلغ مقایسه می‌شود؛ زیر ۱۰۰ Session کلی یا ۲۵ Session در cell، رتبه و پیشنهاد نمایش داده نمی‌شود.
            </p>
          </div>
          <Badge variant="outline">
            <ShieldCheck aria-hidden="true" data-icon="inline-start" />
            بدون Winner label
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {pspGroups.map(([psp, segments]) => (
            <Card key={psp} size="sm">
              <CardHeader>
                <CardTitle>
                  <h3 dir="ltr">{psp}</h3>
                </CardTitle>
                <CardDescription>
                  مقایسه توصیفی؛ PSP به‌عنوان علت موفقیت معرفی نمی‌شود.
                </CardDescription>
                <CardAction>
                  <Badge variant={segments.every((segment) => segment.quality === "insufficient-data") ? "outline" : "secondary"}>
                    {segments.every((segment) => segment.quality === "insufficient-data")
                      ? "نمونه ناکافی"
                      : "نمونه کنترل‌شده"}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-2">
                {segments.map((segment) => (
                  <SegmentRow
                    key={segment.key}
                    segment={segment}
                    onEvidenceRequest={handleEvidenceRequest}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartNoAxesColumnDecreasing aria-hidden="true" className="size-5" />
            <h2>قواعد خواندن این گزارش</h2>
          </CardTitle>
          <CardDescription>
            عددها از Attempt خام به Session یکتا تبدیل شده‌اند.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm leading-7 text-muted-foreground sm:grid-cols-3">
          <div className="flex items-start gap-2">
            <CheckCircle2 aria-hidden="true" className="mt-1 size-4 shrink-0 text-success" />
            <p>فروش و مبلغ موفق فقط با Verified محاسبه شده‌اند.</p>
          </div>
          <div className="flex items-start gap-2">
            <CircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0 text-destructive" />
            <p>Paid و Reversed به‌تنهایی فروش موفق نیستند.</p>
          </div>
          <div className="flex items-start gap-2">
            <ArrowLeft aria-hidden="true" className="mt-1 size-4 shrink-0 text-info" />
            <p>اقدام پیشنهادی باید در دوره بعد با همین فرمول سنجیده شود.</p>
          </div>
        </CardContent>
      </Card>

      <footer className="flex flex-col gap-1 pb-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <span>
          تولید Artifact: {formatPeriod(artifact.generatedAt.slice(0, 10))}
        </span>
        <span dir="ltr">Dataset: {artifact.dataset.fingerprint.slice(0, 12)}…</span>
      </footer>

      <RecoveryEvidenceSheet
        evidence={selectedEvidence}
        open={selectedEvidenceId !== null}
        onOpenChange={handleEvidenceOpenChange}
      />
    </div>
  )
}

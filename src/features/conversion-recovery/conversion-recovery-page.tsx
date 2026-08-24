"use client"

import { useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  BanknoteArrowDown,
  Calculator,
  ChartNoAxesColumnDecreasing,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
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
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { EvidenceSheet } from "@/entities/evidence/evidence-sheet"
import { RecoveryMerchantSelector } from "./recovery-merchant-selector"
import {
  formatPersianDate,
  formatPersianPeriod,
  localizePersianText,
} from "@/lib/persian-date"
import { HelpTooltip } from "@/components/help-tooltip"
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
const stageLabels: Record<FunnelStage["stage"], string> = {
  session: "ایجاد سفارش",
  attempted: "ورود به درگاه",
  "in-bank": "ورود اطلاعات کارت",
  verified: "تایید و پرداخت موفق",
}
const bandLabels: Record<string, string> = {
  low: "مبلغ پایین",
  "lower-middle": "میانی پایین",
  "upper-middle": "میانی بالا",
  high: "مبلغ بالا",
}
const confidenceLabels: Record<"low" | "medium" | "high", string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
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
  return formatPersianDate(value)
}

function EvidenceButton({
  label,
  displayLabel,
  evidenceId,
  onRequest,
}: {
  label: string
  displayLabel?: string
  evidenceId: string
  onRequest: (evidenceId: string) => void
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="min-h-9 w-full justify-start whitespace-normal text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
      aria-label={`مشاهده ${label}`}
      onClick={() => onRequest(evidenceId)}
    >
      <Calculator aria-hidden="true" data-icon="inline-start" />
      {displayLabel ?? label}
    </Button>
  )
}

const funnelBarTones = [
  "bg-primary/15 ring-primary/20",
  "bg-primary/25 ring-primary/30",
  "bg-primary/40 ring-primary/40",
  "bg-primary/60 ring-primary/50",
] as const

function FunnelOverview({
  stages,
  primaryDropIndex,
  onEvidenceRequest,
}: {
  stages: FunnelStage[]
  primaryDropIndex: number
  onEvidenceRequest: (evidenceId: string) => void
}) {
  const baseCount = stages[0]?.count ?? 0
  if (!(baseCount > 0)) return null
  return (
    <Card size="sm" className="rounded-2xl border border-border/70 bg-card shadow-xs">
      <CardHeader className="gap-1.5">
        <CardTitle className="text-base font-bold text-foreground">
          نمای کلی قیف در یک نگاه
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          عرض هر نوار نسبت به تعداد سفارش‌های مرحله اول است؛ با انتخاب هر نوار، روش محاسبه همان مرحله باز می‌شود.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="grid justify-items-center">
          {stages.map((stage, index) => {
            const widthPct = Math.min(100, Math.max(24, (stage.count / baseCount) * 100))
            const isPrimaryStep = index === primaryDropIndex
            return (
              <li key={stage.stage} className="grid w-full justify-items-center gap-1.5">
                {index > 0 ? (
                  <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 py-1 text-xs">
                    <ChevronDown
                      aria-hidden="true"
                      className={cn(
                        "size-3.5",
                        isPrimaryStep ? "text-destructive" : "text-muted-foreground",
                      )}
                    />
                    {stage.rateFromPrevious !== null ? (
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          isPrimaryStep ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {faPercent.format(stage.rateFromPrevious)}٪ عبور از مرحله قبل
                      </span>
                    ) : null}
                    {isPrimaryStep ? (
                      <Badge variant="destructive" className="px-2 py-0 text-xs font-bold">
                        بیشترین ریزش
                      </Badge>
                    ) : null}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => onEvidenceRequest(stage.evidenceIds.count)}
                  aria-label={`مشاهده روش محاسبه ${stageLabels[stage.stage]} با ${faInteger.format(stage.count)} سفارش`}
                  className={cn(
                    "block h-10 origin-center animate-bar-grow-x rounded-lg ring-1 transition-all duration-300 hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-12",
                    funnelBarTones[Math.min(index, funnelBarTones.length - 1)],
                  )}
                  style={{
                    inlineSize: `${widthPct}%`,
                    animationDelay: `${index * 130}ms`,
                  }}
                />
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  <span className="font-bold text-foreground">{stageLabels[stage.stage]}</span>
                  {" · "}
                  {faInteger.format(stage.count)} سفارش · {formatCompactRial(stage.amountRial)}
                </p>
              </li>
            )
          })}
        </ol>
      </CardContent>
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
    <div className="grid gap-2 rounded-xl border border-border/50 bg-muted/30 p-3.5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-base font-bold tabular-nums text-foreground">{value}</p>
      </div>
      <EvidenceButton
        label={`روش محاسبه ${label}`}
        displayLabel="روش محاسبه"
        evidenceId={evidenceId}
        onRequest={onEvidenceRequest}
      />
    </div>
  )
}

const bandOrder = ["low", "lower-middle", "upper-middle", "high"] as const

function MatrixCellButton({
  segment,
  animationDelayMs = 0,
  onEvidenceRequest,
}: {
  segment: RecoverySegment | undefined
  animationDelayMs?: number
  onEvidenceRequest: (evidenceId: string) => void
}) {
  if (!segment) {
    return (
      <div
        className="grid min-h-16 animate-pop-in place-items-center rounded-xl border border-dashed border-border/40 bg-muted/20 px-2 py-2 text-xs text-muted-foreground"
        style={{ animationDelay: `${animationDelayMs}ms` }}
      >
        داده‌ای ثبت نشده
      </div>
    )
  }
  const sufficient =
    segment.quality === "sufficient" && segment.verifyPct !== null
  const delta =
    sufficient && segment.peerOrBaselinePct !== null
      ? (segment.verifyPct as number) - segment.peerOrBaselinePct
      : null

  return (
    <button
      type="button"
      onClick={() => onEvidenceRequest(segment.evidenceId)}
      aria-label={
        sufficient
          ? `مشاهده روش محاسبه نرخ موفقیت در بازه ${bandLabels[segment.key.split("|")[1] ?? ""] ?? segment.key}`
          : `مشاهده روش محاسبه بازه با نمونه ناکافی`
      }
      className="grid min-h-16 w-full animate-pop-in place-items-center gap-0.5 rounded-xl border border-border/50 bg-card px-2 py-2 text-center transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      {sufficient ? (
        <>
          <span className="text-sm font-extrabold tabular-nums text-foreground">
            {faPercent.format(segment.verifyPct as number)}٪
          </span>
          {delta !== null ? (
            <span
              className={cn(
                "text-xs font-semibold tabular-nums",
                delta > 0.05 && "text-success-foreground",
                delta < -0.05 && "text-destructive",
                Math.abs(delta) <= 0.05 && "text-muted-foreground",
              )}
            >
              {Math.abs(delta) <= 0.05
                ? "هم‌تراز میانگین"
                : `${faPercent.format(Math.abs(delta))} واحد درصد ${delta > 0 ? "بالاتر" : "پایین‌تر"}`}
            </span>
          ) : null}
        </>
      ) : (
        <span className="text-xs font-semibold text-muted-foreground">
          نمونه ناکافی
        </span>
      )}
      <span className="text-xs tabular-nums text-muted-foreground">
        {faInteger.format(segment.sessions)} سفارش
      </span>
    </button>
  )
}

function PspBandMatrix({
  segments,
  onEvidenceRequest,
}: {
  segments: readonly RecoverySegment[]
  onEvidenceRequest: (evidenceId: string) => void
}) {
  const pspCodes = [...new Set(segments.map((segment) => segment.key.split("|")[0]))].sort((a, b) => a.localeCompare(b, "en"))
  const cellMap = new Map(segments.map((segment) => [segment.key, segment]))

  return (
    <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-border/60">
      <table className="w-full min-w-[36rem] border-collapse text-sm">
        <caption className="sr-only">
          مقایسه نرخ موفقیت هر درگاه پرداخت به تفکیک بازه مبلغی؛ هر خانه با میانگین همان بازه مبلغی مقایسه می‌شود.
        </caption>
        <thead>
          <tr className="bg-muted/60">
            <th scope="col" className="sticky start-0 z-10 bg-muted p-3 text-start text-xs font-bold text-foreground">
              درگاه \ بازه مبلغ
            </th>
            {bandOrder.map((band) => (
              <th key={band} scope="col" className="p-3 text-center text-xs font-bold text-foreground">
                {bandLabels[band]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pspCodes.map((psp, pspIndex) => (
            <tr key={psp} className="border-t border-border/50">
              <th scope="row" className="sticky start-0 z-10 bg-card p-3 text-start">
                <span dir="ltr" className="font-mono text-xs font-semibold text-foreground">{psp}</span>
              </th>
              {bandOrder.map((band, bandIndex) => (
                <td key={band} className="p-1.5 align-middle">
                  <MatrixCellButton
                    segment={cellMap.get(`${psp}|${band}`)}
                    animationDelayMs={pspIndex * 90 + bandIndex * 45}
                    onEvidenceRequest={onEvidenceRequest}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
  const pspSegments = useMemo(
    () => payload.segments.filter((segment) => segment.dimension === "psp"),
    [payload.segments],
  )
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
    <div className="grid gap-8 lg:gap-10">
      <header className="relative grid gap-4 overflow-hidden rounded-2xl border border-border/70 bg-card p-5 sm:p-7 shadow-xs">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary/[0.08] to-transparent" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 end-0 size-40 rounded-full bg-primary/[0.06] blur-3xl" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 font-semibold">
              <Route aria-hidden="true" data-icon="inline-start" />
              مسیر پرداخت خریداران
            </Badge>
            <Badge variant="outline" className="gap-1.5 font-semibold">
              <Database aria-hidden="true" data-icon="inline-start" />
              داده قطعی سفارش‌ها
            </Badge>
          </div>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-3xl sm:font-extrabold lg:text-4xl">
            <span className="text-primary underline decoration-primary/40 decoration-[3px] underline-offset-[6px]">
              نجات فروش و رفع موانع پرداخت
            </span>{" "}
            برای فروشگاه شما
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            رهگیری مرحله‌به‌مرحله فرآیند خرید، کشف دلایل انصراف مشتریان و پتانسیل افزایش درآمد با برطرف کردن موانع پرداخت.
          </p>
          <p className="mt-2.5 text-xs font-medium text-muted-foreground">
            دوره {formatPersianPeriod(payload.selection.period)}؛ مقایسه با {payload.selection.comparison ? formatPersianPeriod(payload.selection.comparison) : "بدون دوره مبنا"}
          </p>
        </div>
        <div className="border-t border-border/50 pt-3.5">
          <RecoveryMerchantSelector
            merchantKey={payload.selection.merchantKey}
            merchantKeys={merchantKeys}
          />
        </div>
      </header>

      {insight ? (
        <Card className="border-primary/40 bg-gradient-to-b from-card via-card to-primary/[0.02] shadow-sm ring-1 ring-primary/25">
          <CardHeader className="gap-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                ریشه افت
              </span>
              <Badge variant="outline" className="font-semibold">
                اطمینان {confidenceLabels[insight.confidence]}
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">
              <h2>{localizePersianText(insight.titleFa)}</h2>
            </CardTitle>
            <CardDescription className="max-w-4xl text-sm leading-relaxed text-foreground/85 sm:text-base">
              {localizePersianText(insight.findingFa)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[1fr_20rem]">
            <div className="flex items-start gap-3.5 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Target aria-hidden="true" className="size-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-primary">اقدام بعدی</p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">{localizePersianText(insight.actionFa)}</p>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {localizePersianText(insight.confidenceReasonFa)}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-muted/50 p-4 sm:p-5">
              <p className="text-xs font-medium text-muted-foreground">پتانسیل برآوردی نجات فروش</p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-3xl">
                {scenario ? formatCompactRial(scenario.estimatedVolumeRial) : "داده ناکافی"}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {scenario
                  ? `حدود ${faInteger.format(scenario.estimatedOrders)} سفارش بازیافتی؛ ادعای تضمین قطعی نیست`
                  : "پیشنهاد عددی ساخته نشده است"}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 rounded-b-2xl border-t border-border/50 bg-muted/20 p-4">
            <div className="w-full sm:w-auto">
              <EvidenceButton
                label="روش محاسبه ریشه افت فروش"
                evidenceId={insight.evidenceId}
                onRequest={handleEvidenceRequest}
              />
            </div>
            {scenario ? (
              <div className="w-full sm:w-auto">
                <EvidenceButton
                  label="روش محاسبه سفارش‌های قابل بازیابی"
                  evidenceId={scenario.evidenceIds.orders}
                  onRequest={handleEvidenceRequest}
                />
              </div>
            ) : null}
          </CardFooter>
        </Card>
      ) : (
        <Alert>
          <CircleAlert aria-hidden="true" />
          <AlertTitle>هنوز پیشنهادی برای این دوره نداریم</AlertTitle>
          <AlertDescription>
            داده‌های این دوره برای ساخت پیشنهاد عددی کافی نیست. هیچ عدد بدون پشتوانه نمایش داده نمی‌شود.
          </AlertDescription>
        </Alert>
      )}

      <section id="funnel" aria-labelledby="payment-rail-title" className="grid gap-5 scroll-mt-24">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">قیف ۴ مرحله‌ای پرداخت</span>
          <h2 id="payment-rail-title" className="mt-2 text-lg font-bold tracking-tight text-foreground sm:text-2xl">
            مشتریان در کدام مرحله از خرید منصرف می‌شوند؟
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            بررسی نرخ عبور خریداران از شروع سفارش تا تسویه نهایی؛ نشان قرمز محل بیشترین ریزش مشتری در این دوره است و با انتخاب هر نوار، روش محاسبه همان مرحله باز می‌شود.
          </p>
        </div>
        <FunnelOverview
          stages={payload.funnel}
          primaryDropIndex={primaryDropIndex}
          onEvidenceRequest={handleEvidenceRequest}
        />
      </section>

      <section aria-labelledby="diagnosis-title" className="grid gap-5">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">دو اهرم قابل پیگیری</span>
          <h2 id="diagnosis-title" className="mt-2 text-lg font-bold tracking-tight text-foreground sm:text-2xl">
            قبل از تلاش و بعد از خطای اول
          </h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
            <CardHeader className="gap-1.5">
              <CardTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
                <span className="flex size-8 items-center justify-center rounded-xl bg-muted text-foreground">
                  <BanknoteArrowDown aria-hidden="true" className="size-4" />
                </span>
                <div className="flex items-center gap-1.5">
                  <h3>انصراف قبل از ورود به درگاه</h3>
                  <HelpTooltip term="NoAttempt" />
                </div>
              </CardTitle>
              <CardDescription>
                خریدارانی که سفارش را ثبت کردند اما وارد درگاه بانک نشدند؛ بزرگ‌ترین پتانسیل افزایش فروش شما.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <MetricEvidenceRow
                label="سفارش‌های بدون ورود به درگاه"
                value={faInteger.format(payload.noAttempt.sessions)}
                evidenceId={payload.noAttempt.evidenceIds.sessions}
                onEvidenceRequest={handleEvidenceRequest}
              />
              <MetricEvidenceRow
                label="درصد کل خریداران منصرف‌شده"
                value={payload.noAttempt.sharePct === null ? "داده ناکافی" : `${faPercent.format(payload.noAttempt.sharePct)}٪`}
                evidenceId={payload.noAttempt.evidenceIds.share}
                onEvidenceRequest={handleEvidenceRequest}
              />
              <MetricEvidenceRow
                label="مبلغ فروش از دست‌رفته"
                value={formatCompactRial(payload.noAttempt.requestedAmountRial)}
                evidenceId={payload.noAttempt.evidenceIds.amount}
                onEvidenceRequest={handleEvidenceRequest}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
            <CardHeader className="gap-1.5">
              <CardTitle className="flex items-center gap-2.5 text-lg font-bold text-foreground">
                <span className="flex size-8 items-center justify-center rounded-xl bg-muted text-foreground">
                  <RefreshCcw aria-hidden="true" className="size-4" />
                </span>
                <div className="flex items-center gap-1.5">
                  <h3>نجات خرید با تلاش مجدد</h3>
                  <HelpTooltip term="Retry" />
                </div>
              </CardTitle>
              <CardDescription>
                خریدارانی که بار اول با خطای درگاه مواجه شدند اما با تلاش مجدد خریدشان با موفقیت انجام شد.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <MetricEvidenceRow
                label="خریداران مواجه با خطای اول"
                value={faInteger.format(payload.retry.firstTryNonVerifiedSessions)}
                evidenceId={payload.retry.evidenceIds.eligible}
                onEvidenceRequest={handleEvidenceRequest}
              />
              <MetricEvidenceRow
                label="خریداران نجات‌یافته با تلاش مجدد"
                value={faInteger.format(payload.retry.recoveredSessions)}
                evidenceId={payload.retry.evidenceIds.recovered}
                onEvidenceRequest={handleEvidenceRequest}
              />
              <MetricEvidenceRow
                label="درصد موفقیت در تلاش دوباره"
                value={payload.retry.recoveryPct === null ? "داده ناکافی" : `${faPercent.format(payload.retry.recoveryPct)}٪`}
                evidenceId={payload.retry.evidenceIds.rate}
                onEvidenceRequest={handleEvidenceRequest}
              />
            </CardContent>
          </Card>
        </div>
      </section>

      <Alert className="rounded-2xl">
        <FlaskConical aria-hidden="true" />
        <AlertTitle>این عدد برآورد است، نه تضمین فروش</AlertTitle>
        <AlertDescription>
          مبنا، سهم انصراف قبل از درگاه در دوره قبل است؛ نرخ موفقیت پرداخت و میانگین مبلغ خرید دوره جاری ثابت فرض شده‌اند. عبور از درگاه به‌تنهایی پرداخت موفق نیست و تراکنش برگشتی فروش محسوب نمی‌شود.
        </AlertDescription>
      </Alert>

      <section id="psp" aria-labelledby="psp-title" className="grid gap-5 scroll-mt-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">مقایسه منصفانه</span>
            <h2 id="psp-title" className="mt-2 text-lg font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <span>عملکرد درگاه‌های پرداخت (PSP)</span>
              <HelpTooltip term="PSP" />
            </h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              هر خانه نرخ موفقیت یک درگاه را فقط در بازه مبلغی همان ستون با میانگین بازار مقایسه می‌کند؛ اگر تعداد سفارش‌ها کم باشد (کمتر از ۱۰۰ سفارش کلی یا ۲۵ سفارش در یک بازه)، خانه «نمونه ناکافی» نمایش می‌دهد. با انتخاب هر خانه، روش محاسبه باز می‌شود.
            </p>
          </div>
          <Badge variant="outline" className="font-semibold gap-1.5">
            <ShieldCheck aria-hidden="true" data-icon="inline-start" />
            بدون معرفی برنده
          </Badge>
        </div>

        {pspSegments.length > 0 ? (
          <PspBandMatrix
            segments={pspSegments}
            onEvidenceRequest={handleEvidenceRequest}
          />
        ) : (
          <Alert className="rounded-2xl">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>داده درگاه‌ها برای مقایسه موجود نیست</AlertTitle>
            <AlertDescription>
              هیچ رتبه یا پیشنهاد مقایسه‌ای ساخته نشده است. تحلیل قیف پرداخت و انصراف قبل از درگاه همچنان بر پایه سفارش‌های معتبر قابل بررسی است.
            </AlertDescription>
          </Alert>
        )}
      </section>

      <Card size="sm" className="rounded-2xl border border-border/60 bg-muted/40 p-5 shadow-xs">
        <CardHeader className="p-0 gap-1">
          <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <ChartNoAxesColumnDecreasing aria-hidden="true" className="size-5 text-primary" />
            <h2>قواعد خواندن این گزارش</h2>
          </CardTitle>
          <CardDescription>
            عددها پس از یکی‌سازی تلاش‌های تکراری، به ازای هر سفارش محاسبه می‌شوند.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4 grid gap-3 p-0 text-xs leading-relaxed text-muted-foreground sm:grid-cols-3">
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border/50 p-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            <p>فروش موفق فقط شامل پرداخت‌های تاییدشده نهایی است.</p>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border/50 p-3">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>عبور از درگاه یا تراکنش برگشتی به‌تنهایی فروش موفق محسوب نمی‌شوند.</p>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border/50 p-3">
            <ArrowLeft aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>اقدام پیشنهادی باید در دوره بعد با همین فرمول سنجیده شود.</p>
          </div>
        </CardContent>
      </Card>

      <footer className="flex flex-col gap-1 pb-4 text-xs font-medium text-muted-foreground sm:flex-row sm:justify-between">
        <span>
          تاریخ تهیه گزارش: {formatPeriod(artifact.generatedAt.slice(0, 10))}
        </span>
        <span className="flex items-center gap-1.5">
          نسخه داده:
          <span dir="ltr" className="font-mono">{artifact.dataset.fingerprint.slice(0, 12)}…</span>
        </span>
      </footer>

      <EvidenceSheet
        evidence={selectedEvidence}
        error={null}
        open={selectedEvidenceId !== null}
        onOpenChange={handleEvidenceOpenChange}
      />
    </div>
  )
}

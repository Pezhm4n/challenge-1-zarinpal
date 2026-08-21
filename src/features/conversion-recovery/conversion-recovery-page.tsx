"use client"

import { useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  BanknoteArrowDown,
  Calculator,
  ChartNoAxesColumnDecreasing,
  CheckCircle2,
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
const stageDescriptions: Record<FunnelStage["stage"], string> = {
  session: "کل درخواست‌های پرداخت ایجادشده",
  attempted: "مشتریانی که وارد صفحه درگاه شدند",
  "in-bank": "مشتریانی که اطلاعات کارت را وارد کردند",
  verified: "تراکنش‌های تایید و تسویه‌شده نهایی",
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
      className="min-h-9 w-full justify-start text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
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
      className={cn(
        "relative flex h-full flex-col rounded-2xl border border-border/70 bg-card shadow-xs transition-all duration-200 hover:border-border hover:shadow-sm",
        isPrimaryDrop && "border-destructive/40 shadow-xs ring-1 ring-destructive/25",
      )}
    >
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={isPrimaryDrop ? "destructive" : "secondary"} className="font-semibold">
            مرحله {faInteger.format(index + 1)}
          </Badge>
          {stage.rateFromPrevious !== null ? (
            <span className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums",
              isPrimaryDrop ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
            )}>
              عبور {faPercent.format(stage.rateFromPrevious)}٪
            </span>
          ) : null}
        </div>
        <CardTitle className="text-base font-bold text-foreground">
          <h3>{stageLabels[stage.stage]}</h3>
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {stageDescriptions[stage.stage]}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3.5">
        <div>
          <p className="text-2xl font-extrabold tabular-nums tracking-tight text-foreground">
            {faInteger.format(stage.count)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCompactRial(stage.amountRial)} مبلغ درخواستی
          </p>
        </div>
        <div
          role="img"
          aria-label={`${stageLabels[stage.stage]}: ${faPercent.format(displayRate)} درصد از مرحله قبل`}
          className="h-2.5 overflow-hidden rounded-full bg-muted/80"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isPrimaryDrop ? "bg-destructive" : "bg-primary",
            )}
            style={{ inlineSize: `${Math.max(displayRate, 4)}%` }}
          />
        </div>
      </CardContent>
      <CardFooter className="mt-auto border-t border-border/50 bg-muted/20 p-3">
        <EvidenceButton
          label={`روش محاسبه مرحله ${stageLabels[stage.stage]}`}
          evidenceId={stage.evidenceIds.count}
          onRequest={onEvidenceRequest}
        />
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
    <div className="grid gap-2 rounded-xl border border-border/50 bg-muted/30 p-3.5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-base font-bold tabular-nums text-foreground">{value}</p>
      </div>
      <EvidenceButton
        label={`روش محاسبه ${label}`}
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
    <div className="grid gap-3 rounded-xl border border-border/50 bg-muted/30 p-3.5 sm:grid-cols-[1fr_auto_auto] sm:items-center hover:bg-muted/50 transition-colors">
      <div>
        <p className="font-semibold text-foreground">{bandLabels[band] ?? band}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {faInteger.format(segment.sessions)} سفارش در این بازه مبلغی
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {segment.quality === "sufficient" && segment.verifyPct !== null ? (
          <>
            <Badge variant="secondary" className="font-semibold">
              موفقیت: {faPercent.format(segment.verifyPct)}٪
            </Badge>
            {segment.peerOrBaselinePct !== null ? (
              <Badge variant="outline" className="font-semibold">
                میانگین بازار: {faPercent.format(segment.peerOrBaselinePct)}٪
              </Badge>
            ) : null}
          </>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">نمونه ناکافی</Badge>
        )}
        <EvidenceButton
          label={`روش محاسبه بازه ${bandLabels[band] ?? band}`}
          evidenceId={segment.evidenceId}
          onRequest={onEvidenceRequest}
        />
      </div>
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
    <div className="grid gap-8 lg:gap-10">
      <header className="grid gap-6 rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs lg:grid-cols-[1fr_auto] lg:items-end">
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
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            نجات فروش و رفع موانع پرداخت برای <span className="text-primary">{payload.selection.merchantKey}</span>
          </h1>
          <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            رهگیری مرحله‌به‌مرحله فرآیند خرید، کشف دلایل انصراف مشتریان و پتانسیل افزایش درآمد با برطرف کردن موانع پرداخت.
          </p>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            دوره {formatPersianPeriod(payload.selection.period)}؛ مقایسه با {payload.selection.comparison ? formatPersianPeriod(payload.selection.comparison) : "بدون دوره مبنا"}
          </p>
        </div>
        <RecoveryMerchantSelector
          merchantKey={payload.selection.merchantKey}
          merchantKeys={merchantKeys}
        />
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
              <p className="text-xs font-medium text-muted-foreground">پتانسیل برآوردی نجات فروش (تخمینی)</p>
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
          <AlertTitle>فرصت اولویت‌دار ثبت نشد</AlertTitle>
          <AlertDescription>
            داده‌های این دوره برای ساخت پیشنهاد عددی کافی نیست. مسیر پرداخت و مدارک موجود را بررسی کنید؛ هیچ عدد یا پیشنهاد غیرقابل اتکایی نمایش داده نمی‌شود.
          </AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="payment-rail-title" className="grid gap-5">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">قیف ۴ مرحله‌ای پرداخت</span>
          <h2 id="payment-rail-title" className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            مشتریان در کدام مرحله از خرید منصرف می‌شوند؟
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            بررسی نرخ عبور خریداران از شروع سفارش تا تسویه نهایی؛ کارت قرمز نشان‌دهنده بیشترین ریزش مشتری در این دوره است.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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

      <section aria-labelledby="diagnosis-title" className="grid gap-5">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">دو اهرم قابل پیگیری</span>
          <h2 id="diagnosis-title" className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
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
                  <h3>انصراف قبل از درگاه (NoAttempt)</h3>
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
                  <h3>بازیابی پس از تلاش اول (Retry)</h3>
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
        <AlertTitle>سناریو، اثر علّی یا تضمین فروش نیست</AlertTitle>
        <AlertDescription>
          خط مبنا سهم NoAttempt دوره قبل است؛ نرخ تبدیل attempted و متوسط مبلغ Verified دوره جاری ثابت فرض شده‌اند. Paid فقط عبور از بانک است و Reversed موفقیت محسوب نمی‌شود.
        </AlertDescription>
      </Alert>

      <section aria-labelledby="psp-title" className="grid gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">کنترل متغیر مخدوش‌کننده</span>
            <h2 id="psp-title" className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl flex items-center gap-2">
              <span>عملکرد درگاه‌های پرداخت (PSP)</span>
              <HelpTooltip term="PSP" />
            </h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              نرخ هر PSP فقط در همان Quartile مبلغ مقایسه می‌شود؛ زیر ۱۰۰ Session کلی یا ۲۵ Session در cell، رتبه و پیشنهاد نمایش داده نمی‌شود.
            </p>
          </div>
          <Badge variant="outline" className="font-semibold gap-1.5">
            <ShieldCheck aria-hidden="true" data-icon="inline-start" />
            بدون Winner label
          </Badge>
        </div>

        {pspGroups.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {pspGroups.map(([psp, segments]) => (
            <Card key={psp} size="sm" className="rounded-2xl border border-border/70 bg-card shadow-xs">
              <CardHeader className="gap-1.5">
                <CardTitle className="text-base font-bold">
                  <h3 dir="ltr" className="font-mono">{psp}</h3>
                </CardTitle>
                <CardDescription>
                  مقایسه توصیفی؛ PSP به‌عنوان علت موفقیت معرفی نمی‌شود.
                </CardDescription>
                <CardAction>
                  <Badge variant={segments.every((segment) => segment.quality === "insufficient-data") ? "outline" : "secondary"} className="font-semibold">
                    {segments.every((segment) => segment.quality === "insufficient-data")
                      ? "نمونه ناکافی"
                      : "نمونه کنترل‌شده"}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-2.5">
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
        ) : (
          <Alert className="rounded-2xl">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>داده PSP برای مقایسه موجود نیست</AlertTitle>
            <AlertDescription>
              هیچ رتبه، برنده یا پیشنهاد مقایسه‌ای ساخته نشده است. Funnel و تحلیل NoAttempt همچنان بر پایه Sessionهای معتبر قابل بررسی‌اند.
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
            عددها از Attempt خام به Session یکتا تبدیل شده‌اند.
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-4 grid gap-3 p-0 text-xs leading-relaxed text-muted-foreground sm:grid-cols-3">
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border/50 p-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
            <p>فروش و مبلغ موفق فقط با Verified محاسبه شده‌اند.</p>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border/50 p-3">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p>Paid و Reversed به‌تنهایی فروش موفق نیستند.</p>
          </div>
          <div className="flex items-start gap-2 rounded-xl bg-card border border-border/50 p-3">
            <ArrowLeft aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>اقدام پیشنهادی باید در دوره بعد با همین فرمول سنجیده شود.</p>
          </div>
        </CardContent>
      </Card>

      <footer className="flex flex-col gap-1 pb-4 text-xs font-medium text-muted-foreground sm:flex-row sm:justify-between">
        <span>
          تولید Artifact: {formatPeriod(artifact.generatedAt.slice(0, 10))}
        </span>
        <span dir="ltr" className="font-mono">Dataset: {artifact.dataset.fingerprint.slice(0, 12)}…</span>
      </footer>

      <RecoveryEvidenceSheet
        evidence={selectedEvidence}
        open={selectedEvidenceId !== null}
        onOpenChange={handleEvidenceOpenChange}
      />
    </div>
  )
}

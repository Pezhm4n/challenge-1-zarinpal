import {
  AlertCircleIcon,
  ShieldCheckIcon,
  TargetIcon,
  UsersRoundIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Badge } from "./ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import { cn } from "@/lib/utils"

import {
  formatPersianMonth,
  formatPersianPeriod,
  localizePersianText,
} from "@/lib/persian-date"
import { HelpTooltip } from "@/components/help-tooltip"
import { EvidenceDetails } from "./evidence-details"
import { MerchantSelector } from "./merchant-selector"
import type {
  CustomerGrowthArtifact,
  CustomerGrowthPayload,
  EvidenceRecord,
  InsightSummary,
} from "./types"

const faInteger = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 })
const faPercent = new Intl.NumberFormat("fa-IR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

function evidenceById(payload: CustomerGrowthPayload, evidenceId: string) {
  return payload.evidence.find((item) => item.id === evidenceId)
}

function evidenceByFormula(payload: CustomerGrowthPayload, formulaId: string) {
  return payload.evidence.find((item) => item.formulaId === formulaId)
}

function statusLabel(status: InsightSummary["status"]) {
  return {
    opportunity: "فرصت رشد",
    warning: "نیازمند توجه",
    stable: "پایدار",
    "insufficient-data": "داده ناکافی",
  }[status]
}

function statusVariant(status: InsightSummary["status"]) {
  if (status === "warning") {
    return "destructive" as const
  }
  if (status === "stable") {
    return "secondary" as const
  }
  return "outline" as const
}

function cohortTone(value: number) {
  if (value >= 60) {
    return "bg-primary text-primary-foreground font-bold"
  }
  if (value >= 30) {
    return "bg-primary/60 text-primary-foreground font-semibold"
  }
  if (value > 0) {
    return "bg-primary/15 text-primary font-semibold"
  }
  return "bg-muted text-muted-foreground"
}

function periodLabel(periodIndex: number) {
  return periodIndex === 0 ? "ماه شروع" : `ماه ${faInteger.format(periodIndex + 1)}`
}

function CohortSection({
  payload,
  evidence,
}: {
  payload: CustomerGrowthPayload
  evidence?: EvidenceRecord
}) {
  if (payload.cohorts.length === 0) {
    return (
      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            <h2>Retention ماهانه Cohort</h2>
          </CardTitle>
          <CardDescription>
            فقط Cohortهای دارای حداقل نمونه معتبر نمایش داده می‌شوند.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="rounded-2xl">
            <AlertCircleIcon />
            <AlertTitle>داده کافی نیست</AlertTitle>
            <AlertDescription>
              برای این پذیرنده Cohort ماهانه قابل اتکایی در بازه موجود نیست.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const cohortNames = [...new Set(payload.cohorts.map((item) => item.cohort))]
  const maxPeriod = Math.min(
    4,
    Math.max(...payload.cohorts.map((item) => item.periodIndex)),
  )
  const periods = Array.from({ length: maxPeriod + 1 }, (_, index) => index)
  const cohortMap = new Map(
    payload.cohorts.map((item) => [`${item.cohort}:${item.periodIndex}`, item]),
  )
  const latestCohorts = cohortNames.slice(-3).reverse()

  return (
    <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
      <CardHeader className="gap-1.5">
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          <h2>ماندگاری و بازگشت ماهانه مشتریان (Cohort Retention)</h2>
          <HelpTooltip term="Cohort" />
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          هر ردیف Cardهایی است که اولین خرید موفقشان در همان ماه ثبت شده است؛ ۰٪ یعنی ماه سپری شده اما بازگشتی ثبت نشده و — یعنی ماه هنوز نرسیده است.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="hidden overflow-x-auto rounded-xl border border-border/50 md:block">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="font-bold text-foreground">ماه اولین خرید</TableHead>
                {periods.map((period) => (
                  <TableHead key={period} className="text-center font-bold text-foreground">{periodLabel(period)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohortNames.map((cohort) => (
                <TableRow key={cohort}>
                  <TableCell className="font-semibold text-foreground">{formatPersianMonth(cohort)}</TableCell>
                  {periods.map((period) => {
                    const cell = cohortMap.get(`${cohort}:${period}`)
                    return (
                      <TableCell key={period} className="text-center">
                        {cell ? (
                          <span
                            className={cn(
                              "inline-flex min-w-16 justify-center rounded-full px-2.5 py-1 text-xs tabular-nums",
                              cohortTone(cell.retentionPct),
                            )}
                          >
                            {faPercent.format(cell.retentionPct)}٪
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 md:hidden">
          {latestCohorts.map((cohort) => (
            <div className="rounded-xl border border-border/50 bg-muted/30 p-4" key={cohort}>
              <p className="font-bold text-foreground">
                {formatPersianMonth(cohort)}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-2.5">
                {periods.slice(0, 4).map((period) => {
                  const cell = cohortMap.get(`${cohort}:${period}`)
                  return (
                    <div key={period} className="rounded-lg bg-card border border-border/40 p-2.5">
                      <dt className="text-xs text-muted-foreground">
                        {periodLabel(period)}
                      </dt>
                      <dd className="mt-1 font-bold tabular-nums text-foreground">
                        {cell ? `${faPercent.format(cell.retentionPct)}٪` : "—"}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </div>
          ))}
        </div>

        <EvidenceDetails evidence={evidence} />
      </CardContent>
    </Card>
  )
}

type CustomerGrowthPageProps = {
  artifact: CustomerGrowthArtifact
  payload: CustomerGrowthPayload
  merchantKeys: string[]
}

const bucketLabels: Record<string, string> = {
  "top-1": "خریدار اول (پرتراکنش‌ترین)",
  "rank-2-5": "خریداران رتبه ۲ تا ۵",
  other: "سایر خریداران",
}

export function CustomerGrowthPage({
  artifact,
  payload,
  merchantKeys,
}: CustomerGrowthPageProps) {
  const headline = payload.insights[0]
  const returningEvidence = evidenceByFormula(
    payload,
    "customer.returning_share.v1",
  )
  const comparisonShare = returningEvidence?.baseline?.value
  const repeatPairEvidence = evidenceByFormula(
    payload,
    "customer.repeat_pair_rate.v1",
  )
  const repeatRevenueEvidence = evidenceByFormula(
    payload,
    "customer.repeat_revenue_share.v1",
  )
  const cohortEvidence = evidenceByFormula(
    payload,
    "customer.cohort_retention.v1",
  )
  const concentrationEvidence = evidenceByFormula(
    payload,
    "customer.revenue_concentration.v1",
  )
  const qualityNote = returningEvidence?.dataQuality[0]

  return (
    <div className="grid gap-8 lg:gap-10">
      <header className="grid gap-6 rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 font-semibold">
              <UsersRoundIcon aria-hidden="true" className="size-3.5" />
              تحلیل مشتریان
            </Badge>
            <Badge variant="outline" className="gap-1.5 font-semibold">
              <ShieldCheckIcon aria-hidden="true" className="size-3.5" />
              کارت‌های ناشناس مشتری (Card)
              <HelpTooltip term="Card" icon="info" />
            </Badge>
          </div>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            رشد و وفاداری مشتریان برای <span className="text-primary">{payload.selection.merchantKey}</span>
          </h1>
          <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            تحلیل رفتار خرید و تکرار مراجعه مشتریان بر اساس کارت‌های بانکی ناشناس؛ کاملاً امن و بدون افشای هویت خریداران.
          </p>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            دوره: {formatPersianPeriod(payload.selection.period)}
          </p>
        </div>
        <MerchantSelector
          merchantKey={payload.selection.merchantKey}
          merchantKeys={merchantKeys}
        />
      </header>

      {headline ? (
        <Card className="border-primary/40 bg-gradient-to-b from-card via-card to-primary/[0.02] shadow-sm ring-1 ring-primary/25 rounded-2xl">
          <CardHeader className="gap-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                فرصت اول
              </span>
              <Badge variant={statusVariant(headline.status)} className="font-semibold">
                {statusLabel(headline.status)}
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight sm:text-2xl">
              <h2>{localizePersianText(headline.titleFa)}</h2>
            </CardTitle>
            <CardDescription className="max-w-4xl text-sm leading-relaxed text-foreground/85 sm:text-base">
              {localizePersianText(headline.findingFa)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-[1fr_20rem]">
            <div className="flex items-start gap-3.5 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <TargetIcon className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold text-primary">اقدام بعدی</p>
                <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">{localizePersianText(headline.actionFa)}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-muted/50 p-4 sm:p-5 text-sm">
              <p className="text-xs font-medium text-muted-foreground">سطح اطمینان</p>
              <p className="mt-2 text-sm font-semibold text-foreground leading-relaxed">{localizePersianText(headline.confidenceReasonFa)}</p>
            </div>
          </CardContent>
          <CardFooter className="rounded-b-2xl border-t border-border/50 bg-muted/20 p-4">
            <div className="w-full">
              <EvidenceDetails evidence={evidenceById(payload, headline.evidenceId)} />
            </div>
          </CardFooter>
        </Card>
      ) : null}

      {qualityNote ? (
        <Alert className="rounded-2xl">
          <ShieldCheckIcon />
          <AlertTitle>پوشش و حریم خصوصی داده</AlertTitle>
          <AlertDescription>{localizePersianText(qualityNote.messageFa)}</AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="customer-mix-title" className="grid gap-5">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">ترکیب پایگاه مشتریان</span>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl" id="customer-mix-title">
            ترکیب خریداران شما در این دوره
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card size="sm" className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
            <CardHeader className="p-0 gap-1">
              <CardTitle className="text-base font-bold text-foreground">
                <h3>کل خریداران فعال</h3>
              </CardTitle>
              <CardDescription className="text-xs">کارت‌های بانکی خریداران با خرید موفق در این دوره</CardDescription>
            </CardHeader>
            <CardContent className="p-0 mt-3">
              <p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {faInteger.format(payload.activeCards)}
              </p>
            </CardContent>
          </Card>
          <Card size="sm" className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
            <CardHeader className="p-0 gap-1">
              <CardTitle className="text-base font-bold text-foreground">
                <h3>خریداران جدید</h3>
              </CardTitle>
              <CardDescription className="text-xs">خریدارانی که برای اولین بار از شما خرید کرده‌اند</CardDescription>
            </CardHeader>
            <CardContent className="p-0 mt-3">
              <p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {faInteger.format(payload.newCards)}
              </p>
            </CardContent>
          </Card>
          <Card size="sm" className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs">
            <CardHeader className="p-0 gap-1">
              <CardTitle className="text-base font-bold text-foreground">
                <h3>خریداران بازگشتی</h3>
              </CardTitle>
              <CardDescription className="text-xs">
                {comparisonShare == null
                  ? "خریدارانی با سابقه خرید قبلی از شما"
                  : `دوره قبل: ${faPercent.format(comparisonShare)}٪`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 mt-3">
              <p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {payload.returningSharePct === null
                  ? "—"
                  : `${faPercent.format(payload.returningSharePct)}٪`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {faInteger.format(payload.returningCards)} خریدار از {faInteger.format(payload.activeCards)} خریدار فعال
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="repeat-title" className="grid gap-5">
        <div>
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">وفاداری و تکرار</span>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl" id="repeat-title">
            تکرار خرید و مشتریان وفادار
          </h2>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
            <CardHeader className="gap-1.5">
              <CardTitle className="text-base font-bold text-foreground">
                <h3>درصد خریداران دارای خرید مجدد</h3>
              </CardTitle>
              <CardDescription className="text-xs">
                خریدارانی که حداقل دو بار در این دوره از شما خرید موفق داشته‌اند.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {payload.repeatPairPct === null
                  ? "—"
                  : `${faPercent.format(payload.repeatPairPct)}٪`}
              </p>
              <EvidenceDetails evidence={repeatPairEvidence} />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
            <CardHeader className="gap-1.5">
              <CardTitle className="text-base font-bold text-foreground">
                <h3>سهم فروش از مشتریان وفادار</h3>
              </CardTitle>
              <CardDescription className="text-xs">
                درصد کل مبلغ فروش حاصل از مشتریانی که سابقه خرید قبلی داشته‌اند.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-3xl font-extrabold tabular-nums tracking-tight text-foreground">
                {payload.repeatRevenueSharePct === null
                  ? "—"
                  : `${faPercent.format(payload.repeatRevenueSharePct)}٪`}
              </p>
              <EvidenceDetails evidence={repeatRevenueEvidence} />
            </CardContent>
          </Card>
        </div>
      </section>

      <CohortSection payload={payload} evidence={cohortEvidence} />

      <Card className="rounded-2xl border border-border/70 bg-card shadow-xs">
        <CardHeader className="gap-1.5">
          <CardTitle className="text-lg font-bold text-foreground">
            <h2>تمرکز درآمد: چند درصد فروش وابسته به مشتریان پرخرید است؟</h2>
          </CardTitle>
          <CardDescription className="text-xs">
            بررسی توزیع درآمد بین دسته‌های خریداران؛ آیا فروشگاه شما وابسته به تعداد محدودی مشتری پرخرید است؟
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {payload.concentration.length > 0 ? (
            payload.concentration.map((bucket) => (
              <div className="flex flex-col gap-2 rounded-xl border border-border/40 bg-muted/20 p-3.5" key={bucket.bucket}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground">{bucketLabels[bucket.bucket] ?? bucket.bucket}</span>
                  <span className="tabular-nums font-bold text-foreground">
                    {faPercent.format(bucket.revenueSharePct)}٪ مبلغ
                  </span>
                </div>
                <div
                  aria-label={`${bucketLabels[bucket.bucket] ?? bucket.bucket}: ${faPercent.format(bucket.revenueSharePct)} درصد مبلغ`}
                  className="h-2.5 overflow-hidden rounded-full bg-muted"
                  role="img"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(bucket.revenueSharePct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {faPercent.format(bucket.customerSharePct)}٪ از کل خریداران فعال
                </p>
              </div>
            ))
          ) : (
            <Alert className="rounded-2xl">
              <AlertCircleIcon />
              <AlertTitle>داده کافی نیست</AlertTitle>
              <AlertDescription>
                برای محاسبه تمرکز مبلغ، خرید موفق دارای کارت بانکی کافی وجود ندارد.
              </AlertDescription>
            </Alert>
          )}
          <EvidenceDetails evidence={concentrationEvidence} />
        </CardContent>
      </Card>

      <footer className="flex flex-col gap-1 pb-4 text-xs font-medium text-muted-foreground sm:flex-row sm:justify-between">
        <span>
          دوره: {formatPersianPeriod(payload.selection.period)}
        </span>
        <span dir="ltr" className="font-mono">
          Dataset: {artifact.dataset.fingerprint.slice(0, 12)}…
        </span>
      </footer>
    </div>
  )
}


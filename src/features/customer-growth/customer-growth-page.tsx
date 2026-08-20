import {
  AlertCircleIcon,
  Repeat2Icon,
  ShieldCheckIcon,
  TargetIcon,
  UsersRoundIcon,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { Badge } from "./ui/badge"
import {
  Card,
  CardAction,
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
    opportunity: "فرصت",
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
    return "bg-primary text-primary-foreground"
  }
  if (value >= 30) {
    return "bg-primary/60 text-primary-foreground"
  }
  if (value > 0) {
    return "bg-primary/20 text-foreground"
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
      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Retention ماهانه Cohort</h2>
          </CardTitle>
          <CardDescription>
            فقط Cohortهای دارای حداقل نمونه معتبر نمایش داده می‌شوند.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
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
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Retention ماهانه Cohort</h2>
        </CardTitle>
        <CardDescription>
          هر ردیف Cardهایی است که اولین خرید موفقشان در همان ماه ثبت شده است؛ ۰٪ یعنی ماه سپری شده اما بازگشتی ثبت نشده و — یعنی ماه هنوز نرسیده است.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ماه اولین خرید</TableHead>
                {periods.map((period) => (
                  <TableHead key={period}>{periodLabel(period)}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohortNames.map((cohort) => (
                <TableRow key={cohort}>
                  <TableCell dir="ltr">{cohort}</TableCell>
                  {periods.map((period) => {
                    const cell = cohortMap.get(`${cohort}:${period}`)
                    return (
                      <TableCell key={period}>
                        {cell ? (
                          <span
                            className={cn(
                              "inline-flex min-w-16 justify-center rounded-md px-2 py-1 font-medium tabular-nums",
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
            <div className="rounded-lg bg-muted/60 p-3" key={cohort}>
              <p className="font-medium" dir="ltr">
                {cohort}
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-2">
                {periods.slice(0, 4).map((period) => {
                  const cell = cohortMap.get(`${cohort}:${period}`)
                  return (
                    <div key={period}>
                      <dt className="text-xs text-muted-foreground">
                        {periodLabel(period)}
                      </dt>
                      <dd className="mt-1 font-medium">
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
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">نبض زرین</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            رشد و بازگشت مشتری
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            رفتار Cardهای ناشناس در همین پذیرنده؛ بدون بازیابی هویت یا اطلاعات تماس.
          </p>
        </div>
        <MerchantSelector
          merchantKey={payload.selection.merchantKey}
          merchantKeys={merchantKeys}
        />
      </header>

      {headline ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{headline.titleFa}</h2>
            </CardTitle>
            <CardDescription>{headline.findingFa}</CardDescription>
            <CardAction>
              <Badge variant={statusVariant(headline.status)}>
                {statusLabel(headline.status)}
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-start gap-3">
              <TargetIcon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">اقدام بعدی</p>
                <p className="mt-1 font-medium leading-7">{headline.actionFa}</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-xs text-muted-foreground">سطح اطمینان</p>
              <p className="mt-1 font-medium">{headline.confidenceReasonFa}</p>
            </div>
          </CardContent>
          <CardFooter>
            <div className="w-full">
              <EvidenceDetails evidence={evidenceById(payload, headline.evidenceId)} />
            </div>
          </CardFooter>
        </Card>
      ) : null}

      {qualityNote ? (
        <Alert>
          <ShieldCheckIcon />
          <AlertTitle>پوشش و حریم خصوصی داده</AlertTitle>
          <AlertDescription>{qualityNote.messageFa}</AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="customer-mix-title">
        <div className="mb-3 flex items-center gap-2">
          <UsersRoundIcon className="size-5" aria-hidden="true" />
          <h2 className="text-lg font-semibold" id="customer-mix-title">
            ترکیب مشتریان فعال
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle>
                <h3>Card فعال</h3>
              </CardTitle>
              <CardDescription>خرید موفق دارای شناسه در این دوره</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">
                {faInteger.format(payload.activeCards)}
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>
                <h3>Card جدید</h3>
              </CardTitle>
              <CardDescription>اولین خرید موفق در همین دوره</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">
                {faInteger.format(payload.newCards)}
              </p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>
                <h3>Card بازگشتی</h3>
              </CardTitle>
              <CardDescription>
                {comparisonShare == null
                  ? "سابقه خرید پیش از این دوره"
                  : `دوره قبل: ${faPercent.format(comparisonShare)}٪`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold tabular-nums">
                {payload.returningSharePct === null
                  ? "—"
                  : `${faPercent.format(payload.returningSharePct)}٪`}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {faInteger.format(payload.returningCards)} Card از {faInteger.format(payload.activeCards)} Card
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="repeat-title">
        <div className="mb-3 flex items-center gap-2">
          <Repeat2Icon className="size-5" aria-hidden="true" />
          <h2 className="text-lg font-semibold" id="repeat-title">
            خرید تکراری
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <h3>نرخ زوج‌های تکرارشونده</h3>
              </CardTitle>
              <CardDescription>
                Cardهایی که تا پایان دوره حداقل دو Session موفق داشته‌اند.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-3xl font-semibold tabular-nums">
                {payload.repeatPairPct === null
                  ? "—"
                  : `${faPercent.format(payload.repeatPairPct)}٪`}
              </p>
              <EvidenceDetails evidence={repeatPairEvidence} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>
                <h3>سهم مبلغ Cardهای بازگشتی</h3>
              </CardTitle>
              <CardDescription>
                سهم حجم موفق دوره از Cardهایی که قبلاً دیده شده‌اند.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-3xl font-semibold tabular-nums">
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

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>تمرکز مبلغ بین Cardهای ناشناس</h2>
          </CardTitle>
          <CardDescription>
            Bucketها هم‌پوشانی ندارند و فقط وابستگی مبلغ را نشان می‌دهند.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {payload.concentration.length > 0 ? (
            payload.concentration.map((bucket) => (
              <div className="flex flex-col gap-2" key={bucket.bucket}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{bucket.bucket}</span>
                  <span className="tabular-nums">
                    {faPercent.format(bucket.revenueSharePct)}٪ مبلغ
                  </span>
                </div>
                <div
                  aria-label={`${bucket.bucket}: ${faPercent.format(bucket.revenueSharePct)} درصد مبلغ`}
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="img"
                >
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(bucket.revenueSharePct, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {faPercent.format(bucket.customerSharePct)}٪ از Cardهای فعال
                </p>
              </div>
            ))
          ) : (
            <Alert>
              <AlertCircleIcon />
              <AlertTitle>داده کافی نیست</AlertTitle>
              <AlertDescription>
                برای محاسبه تمرکز مبلغ، خرید موفق دارای Card کافی وجود ندارد.
              </AlertDescription>
            </Alert>
          )}
          <EvidenceDetails evidence={concentrationEvidence} />
        </CardContent>
      </Card>

      <footer className="flex flex-col gap-1 pb-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <span>
          دوره: {payload.selection.period.from} تا {payload.selection.period.to}
        </span>
        <span dir="ltr">
          Dataset: {artifact.dataset.fingerprint.slice(0, 12)}…
        </span>
      </footer>
    </main>
  )
}

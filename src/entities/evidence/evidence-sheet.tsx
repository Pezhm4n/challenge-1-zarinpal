"use client"

import { CircleAlert, CircleHelp, Database, Sigma } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { ArtifactError, EvidenceRecord, EvidenceSampleRow } from "@/contracts"
import { formatMetricValue, metricKindLabels } from "@/entities/insight/metric-value"
import {
  hasSufficientEvidenceSample,
  inspectEvidenceOperands,
} from "./model"

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-gregory", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
})

const grainLabels: Record<EvidenceRecord["grain"], string> = {
  attempt: "تلاش پرداخت",
  session: "پرداخت یکتا",
  "merchant-period": "پذیرنده در بازه",
  "merchant-card": "پذیرنده و کارت پوشانده‌شده",
  "peer-group": "گروه همتا",
}

function formatDate(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`))
}

function formatPeriod(period: EvidenceRecord["period"]): string {
  return `${formatDate(period.from)} تا ${formatDate(period.to)}`
}

function formatFilterValue(value: string | number | boolean): string {
  if (typeof value === "boolean") return value ? "بله" : "خیر"
  if (typeof value === "number") return numberFormatter.format(value)
  return value
}

function EvidenceSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="grid gap-3 border-t pt-5">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {children}
    </section>
  )
}

function EvidenceList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="grid list-disc gap-2 pe-5 text-sm leading-6 text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-foreground">{children}</dd>
    </div>
  )
}

function SampleValue({ value }: { value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">ثبت نشده</span>
  }
  return <>{typeof value === "number" ? numberFormatter.format(value) : value}</>
}

const persianDigits = "۰۱۲۳۴۵۶۷۸۹"

function localizeDigits(value: string): string {
  return value.replace(/\d/g, (digit) => persianDigits[Number(digit)])
}

function formatSampleTimestamp(value: string): string {
  return localizeDigits(value.replace("T", "، ").replace(/Z$/, ""))
}

const sampleFields: Array<{
  key: keyof EvidenceSampleRow
  label: string
  format?: (row: EvidenceSampleRow) => string | number | null | undefined
}> = [
  {
    key: "sessionKey",
    label: "شناسه پرداخت",
    format: (row) => localizeDigits(row.sessionKey),
  },
  { key: "trySeq", label: "شماره تلاش" },
  {
    key: "createdAt",
    label: "زمان",
    format: (row) => formatSampleTimestamp(row.createdAt),
  },
  {
    key: "amountRial",
    label: "مبلغ (ریال)",
    format: (row) => numberFormatter.format(row.amountRial),
  },
  { key: "sessionStatus", label: "وضعیت پرداخت" },
  { key: "tryStatus", label: "وضعیت تلاش" },
  { key: "pspCode", label: "PSP" },
  { key: "payerCardMasked", label: "کارت پوشانده‌شده" },
]

function SampleRows({ rows }: { rows: EvidenceSampleRow[] }) {
  if (rows.length === 0) {
    return (
      <Alert>
        <CircleAlert aria-hidden="true" />
        <AlertTitle>نمونه قابل نمایش کافی نیست</AlertTitle>
        <AlertDescription>
          نتیجه تحلیل حفظ شده است، اما برای این انتخاب Sample Row امنی در Artifact ثبت نشده است.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:hidden">
        {rows.map((row, index) => (
          <div key={`${row.sessionKey}-${index}`} className="grid gap-3 rounded-lg border p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              نمونه {numberFormatter.format(index + 1)}
            </p>
            <dl className="grid gap-3">
              {sampleFields.map((field) => (
                <KeyValue key={field.key} label={field.label}>
                  <SampleValue value={field.format ? field.format(row) : row[field.key]} />
                </KeyValue>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-3xl border-separate border-spacing-0 text-xs">
          <caption className="sr-only">نمونه پرداخت‌های استفاده‌شده در مدرک</caption>
          <thead>
            <tr>
              {sampleFields.map((field) => (
                <th key={field.key} scope="col" className="border-b p-2 text-start font-semibold">
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.sessionKey}-${index}`}>
                {sampleFields.map((field) => (
                  <td key={field.key} className="border-b p-2 align-top whitespace-nowrap">
                    <SampleValue value={field.format ? field.format(row) : row[field.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function EvidenceUnavailable({ error }: { error: ArtifactError }) {
  return (
    <>
      <SheetHeader className="pe-14 text-start">
        <SheetTitle className="text-lg">مدرک محاسبه در دسترس نیست</SheetTitle>
        <SheetDescription>جزئیات فنی داخلی نمایش داده نمی‌شود.</SheetDescription>
      </SheetHeader>
      <div className="px-4 pb-6">
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>گزارش ناقص است</AlertTitle>
          <AlertDescription>{error.messageFa}</AlertDescription>
        </Alert>
      </div>
    </>
  )
}

export function EvidenceSheet({
  evidence,
  error,
  open,
  onOpenChange,
}: {
  evidence: EvidenceRecord | null
  error: ArtifactError | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const operands = evidence ? inspectEvidenceOperands(evidence) : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="data-[side=left]:w-full data-[side=left]:max-w-none data-[side=left]:sm:max-w-2xl gap-0 overflow-y-auto"
        aria-label="مدرک محاسبه"
        aria-modal="true"
      >
        {!evidence || error ? (
          <EvidenceUnavailable
            error={
              error ?? {
                code: "INVALID_SCHEMA",
                messageFa: "مدرک این عدد پیدا نشد. گزارش باید دوباره تولید شود.",
                recoverable: false,
              }
            }
          />
        ) : (
          <>
            <SheetHeader className="gap-2.5 border-b border-border/70 p-5 pe-14 text-start sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={evidence.result?.kind === "estimate" ? "default" : "secondary"}
                >
                  {evidence.result
                    ? metricKindLabels[evidence.result.kind]
                    : "داده ناکافی"}
                </Badge>
                <Badge variant="outline">{grainLabels[evidence.grain]}</Badge>
              </div>
              <SheetTitle className="text-xl font-bold tracking-tight">{evidence.titleFa}</SheetTitle>
              <SheetDescription className="text-sm leading-relaxed">
                {evidence.explanationFa}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-5 p-5 sm:p-6">
              <div className="rounded-2xl border border-border/60 bg-muted/50 p-4 sm:p-5">
                <p className="text-xs font-medium text-muted-foreground">نتیجه محاسبه</p>
                <p className="mt-2.5 break-words text-2xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-3xl">
                  {evidence.result
                    ? formatMetricValue(evidence.result)
                    : "قابل محاسبه نیست"}
                </p>
              </div>

              {evidence.dataQuality.map((note) => (
                <Alert
                  key={note.code}
                  variant={note.severity === "warning" ? "destructive" : "default"}
                >
                  {note.severity === "warning" ? (
                    <CircleAlert aria-hidden="true" />
                  ) : (
                    <CircleHelp aria-hidden="true" />
                  )}
                  <AlertTitle>
                    {note.severity === "warning" ? "محدودیت کیفیت داده" : "یادداشت کیفیت داده"}
                  </AlertTitle>
                  <AlertDescription>{note.messageFa}</AlertDescription>
                </Alert>
              ))}

              <EvidenceSection title="فرمول و بازه">
                <dl className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4">
                  <KeyValue label="شناسه فرمول">
                    <code dir="ltr" className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono">
                      {evidence.formulaId}
                    </code>
                  </KeyValue>
                  <KeyValue label="فرمول">{evidence.formulaFa}</KeyValue>
                  <KeyValue label="بازه تحلیل">{formatPeriod(evidence.period)}</KeyValue>
                  <KeyValue label="بازه مقایسه">
                    {evidence.comparisonPeriod
                      ? formatPeriod(evidence.comparisonPeriod)
                      : "مقایسه‌ای ثبت نشده"}
                  </KeyValue>
                </dl>
              </EvidenceSection>

              <EvidenceSection title="صورت، مخرج و خط مبنا">
                {!operands?.complete ? (
                  <Alert>
                    <Sigma aria-hidden="true" />
                    <AlertTitle>جزء محاسبه ثبت نشده است</AlertTitle>
                    <AlertDescription>
                      {operands?.missing.includes("numerator") ? "صورت" : ""}
                      {operands?.missing.length === 2 ? " و " : ""}
                      {operands?.missing.includes("denominator") ? "مخرج" : ""} برای این مدرک در Artifact ثبت نشده است؛ فرمول و محدودیت‌ها را مبنا قرار دهید.
                    </AlertDescription>
                  </Alert>
                ) : null}
                <dl className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4">
                  <KeyValue label="صورت">
                    {evidence.numerator
                      ? `${evidence.numerator.labelFa}: ${numberFormatter.format(evidence.numerator.value)}`
                      : "ثبت نشده"}
                  </KeyValue>
                  <KeyValue label="مخرج">
                    {evidence.denominator
                      ? `${evidence.denominator.labelFa}: ${numberFormatter.format(evidence.denominator.value)}`
                      : "ثبت نشده"}
                  </KeyValue>
                  <KeyValue label="خط مبنا">
                    {evidence.baseline
                      ? `${evidence.baseline.type}، مقدار ${numberFormatter.format(evidence.baseline.value)}، نمونه ${numberFormatter.format(evidence.baseline.sampleSize)}`
                      : "ثبت نشده"}
                  </KeyValue>
                </dl>
              </EvidenceSection>

              <EvidenceSection title="محدودیت‌ها">
                <EvidenceList items={evidence.limitations} emptyLabel="محدودیتی ثبت نشده است." />
              </EvidenceSection>

              <details className="group rounded-2xl border border-border/60 bg-muted/20 overflow-hidden transition-all">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-foreground hover:bg-muted/40 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-bold">جزئیات فنی و نمونه داده</span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground group-open:hidden">
                    بررسی بیشتر
                  </span>
                  <span className="hidden rounded-full bg-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground group-open:inline">
                    بستن جزئیات
                  </span>
                </summary>

                <div className="grid gap-5 border-t border-border/50 p-4 sm:p-5">
                  <EvidenceSection title="منبع و فیلترها">
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      منبع نشان می‌دهد عدد از کدام ستون‌ها ساخته شده و فیلترها مشخص می‌کنند چه داده‌هایی وارد محاسبه شده‌اند.
                    </p>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Database aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
                      <p>سطح محاسبه: {grainLabels[evidence.grain]}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5" dir="ltr">
                      {evidence.sourceColumns.map((column) => (
                        <code key={column} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono">
                          {column}
                        </code>
                      ))}
                    </div>
                    {evidence.filters.length > 0 ? (
                      <dl className="grid gap-2">
                        {evidence.filters.map((filter, index) => (
                          <KeyValue key={`${filter.field}-${index}`} label={`فیلتر ${numberFormatter.format(index + 1)}`}>
                            <code dir="ltr" className="text-xs font-mono">
                              {filter.field} {filter.operator} {formatFilterValue(filter.value)}
                            </code>
                          </KeyValue>
                        ))}
                      </dl>
                    ) : (
                      <p className="text-sm text-muted-foreground">فیلتر اضافه‌ای اعمال نشده است.</p>
                    )}
                  </EvidenceSection>

                  <EvidenceSection title="کنترل‌ها و فرض‌ها">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid content-start gap-2 rounded-xl bg-card border border-border/50 p-3.5">
                        <p className="text-xs font-bold text-foreground">کنترل‌های مقایسه</p>
                        <EvidenceList items={evidence.controls} emptyLabel="کنترلی ثبت نشده است." />
                      </div>
                      <div className="grid content-start gap-2 rounded-xl bg-card border border-border/50 p-3.5">
                        <p className="text-xs font-bold text-foreground">فرض‌ها</p>
                        <EvidenceList items={evidence.assumptions} emptyLabel="فرض اضافه‌ای ثبت نشده است." />
                      </div>
                    </div>
                  </EvidenceSection>

                  <EvidenceSection title="نمونه داده پوشانده‌شده">
                    {!hasSufficientEvidenceSample(evidence) ? null : (
                      <p className="text-xs leading-5 text-muted-foreground">
                        این ردیف‌ها فقط برای ردیابی محاسبه‌اند و اندازه نمونه آماری محسوب نمی‌شوند.
                      </p>
                    )}
                    <SampleRows rows={evidence.sampleRows} />
                  </EvidenceSection>

                  <p className="break-all border-t border-border/50 pt-4 text-xs text-muted-foreground">
                    شناسه نسخه داده: <span dir="ltr" className="font-mono">{evidence.datasetFingerprint}</span>
                  </p>
                </div>
              </details>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

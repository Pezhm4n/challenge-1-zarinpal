"use client"

import { CircleAlert, CircleHelp, Database } from "lucide-react"

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
  formatPersianDateTime,
  formatPersianPeriod,
  localizePersianText,
} from "@/lib/persian-date"
import {
  hasSufficientEvidenceSample,
  inspectEvidenceOperands,
} from "./model"

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 2,
})

const grainLabels: Record<EvidenceRecord["grain"], string> = {
  attempt: "سطح تحلیل: تلاش‌های پرداخت",
  session: "سطح تحلیل: سفارش‌های مستقل",
  "merchant-period": "سطح تحلیل: کل دوره فروشگاه",
  "merchant-card": "سطح تحلیل: خریداران دارای کارت بانکی",
  "peer-group": "سطح تحلیل: گروه هم‌صنفان و بازار",
}

function formatPeriod(period: EvidenceRecord["period"]): string {
  return formatPersianPeriod(period)
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

function hasPersianChars(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}

const statusTranslations: Record<string, { fa: string; en: string }> = {
  NoAttempt: { fa: "انصراف بدون تلاش", en: "NoAttempt" },
  Verified: { fa: "پرداخت موفق", en: "Verified" },
  Failed: { fa: "ناموفق", en: "Failed" },
  Initiated: { fa: "شروع‌شده", en: "Initiated" },
  Paid: { fa: "پرداخت در بانک", en: "Paid" },
  Reversed: { fa: "برگشت‌خورده", en: "Reversed" },
  Expired: { fa: "منقضی‌شده", en: "Expired" },
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return "کاربرد ندارد"
  const tr = statusTranslations[status]
  return tr ? `${tr.fa} (${tr.en})` : localizePersianText(status)
}

function EvidenceList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="flex flex-col gap-2.5 text-xs sm:text-sm text-muted-foreground">
      {items.map((item, index) => {
        const localized = localizePersianText(item)
        const isPersian = hasPersianChars(localized)
        return (
          <li
            key={`${item}-${index}`}
            dir={isPersian ? "rtl" : "ltr"}
            className="flex items-start gap-2 text-start leading-relaxed font-sans"
          >
            <span
              aria-hidden="true"
              className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70"
            />
            <span className="min-w-0 flex-1 break-words">{localized}</span>
          </li>
        )
      })}
    </ul>
  )
}

function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-foreground">{children}</dd>
    </div>
  )
}

function SampleValue({ value }: { value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>
  }
  return <>{typeof value === "number" ? numberFormatter.format(value) : value}</>
}

function formatSampleTimestamp(value: string): string {
  return formatPersianDateTime(value)
}

const sampleFields: Array<{
  key: keyof EvidenceSampleRow
  label: string
  format?: (row: EvidenceSampleRow) => string | number | null | undefined
}> = [
  {
    key: "sessionKey",
    label: "شناسه پرداخت",
    format: (row) => row.sessionKey,
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
  {
    key: "sessionStatus",
    label: "وضعیت پرداخت",
    format: (row) => formatStatus(row.sessionStatus),
  },
  {
    key: "tryStatus",
    label: "وضعیت تلاش",
    format: (row) => formatStatus(row.tryStatus),
  },
  { key: "pspCode", label: "درگاه (PSP)" },
  { key: "payerCardMasked", label: "کارت خریدار" },
]

function SampleRows({ rows }: { rows: EvidenceSampleRow[] }) {
  if (rows.length === 0) {
    return (
      <Alert>
        <CircleAlert aria-hidden="true" />
        <AlertTitle>نمونه قابل نمایش</AlertTitle>
        <AlertDescription>
          برای این عدد نمونه جداگانه‌ای ذخیره نشده؛ عدد از مجموع همه سفارش‌های این دوره محاسبه شده است.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <>
      <div className="grid gap-3 sm:hidden">
        {rows.map((row, index) => (
          <div key={`${row.sessionKey}-${index}`} className="grid gap-3 rounded-xl border p-3.5 bg-card">
            <p className="text-xs font-semibold text-muted-foreground">
              نمونه {numberFormatter.format(index + 1)}
            </p>
            <dl className="grid gap-2.5">
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
                <th key={field.key} scope="col" className="border-b p-2.5 text-start font-semibold text-muted-foreground">
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.sessionKey}-${index}`} className="hover:bg-muted/30 transition-colors">
                {sampleFields.map((field) => (
                  <td key={field.key} className="border-b p-2.5 align-top whitespace-nowrap">
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
        <SheetDescription>جزئیات فنی این بخش در دسترس نیست.</SheetDescription>
      </SheetHeader>
      <div className="px-4 pb-6">
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle>گزارش در دسترس نیست</AlertTitle>
          <AlertDescription>{error.messageFa}</AlertDescription>
        </Alert>
      </div>
    </>
  )
}

const baselineLabels: Record<string, string> = {
  "merchant-period-verification-rate": "میانگین نرخ پرداخت موفق در کل دوره",
  "comparison-period-no-attempt-share": "سهم انصراف خریداران در دوره قبل",
  "comparison-returning-share": "سهم خریداران بازگشتی در دوره قبل",
  "same-category-peer-median-verificationRate": "میانه نرخ پرداخت موفق هم‌صنفان",
  "same-category-peer-median-verifiedVolumeRial": "میانه فروش موفق هم‌صنفان",
  "same-category-peer-median-averageVerifiedTicketRial": "میانه مبلغ خرید هم‌صنفان",
  "previous-period-sessions": "تعداد سفارش‌ها در دوره قبل",
  "previous-period-ticket": "میانگین مبلغ خرید در دوره قبل",
  "previous-period-rate": "نرخ پرداخت موفق در دوره قبل",
}

function formatBaselineLabel(type: string): string {
  if (baselineLabels[type]) return baselineLabels[type]
  return localizePersianText(type)
}

const columnLabels: Record<string, string> = {
  session_key: "شناسه پرداخت",
  merchant_key: "کد فروشگاه",
  category_id: "دسته‌بندی صنف",
  amount_rial: "مبلغ سفارش",
  amount: "مبلغ",
  created_at: "زمان ثبت",
  eventual_verified: "وضعیت پرداخت نهایی",
  try_seq: "شماره تلاش",
  try_status: "وضعیت تلاش",
  session_status: "وضعیت سفارش",
  payer_card_key: "شناسه کارت خریدار",
  psp_code: "کد درگاه (PSP)",
  evidence_scope: "محدوده تحلیل",
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
        aria-label="مدرک و روش محاسبه"
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
              <SheetTitle className="text-xl font-bold tracking-tight">{localizePersianText(evidence.titleFa)}</SheetTitle>
              <SheetDescription className="text-sm leading-relaxed text-muted-foreground">
                {localizePersianText(evidence.explanationFa)}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-5 p-5 sm:p-6">
              <div className="rounded-2xl border border-border/60 bg-muted/50 p-4 sm:p-5">
                <p className="text-xs font-semibold text-muted-foreground">نتیجه نهایی محاسبه</p>
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
                    {note.severity === "warning" ? "نکته مهم درباره داده‌ها" : "نکته تکمیلی"}
                  </AlertTitle>
                  <AlertDescription className="text-sm leading-relaxed">{localizePersianText(note.messageFa)}</AlertDescription>
                </Alert>
              ))}

              <EvidenceSection title="روش محاسبه و بازه زمانی">
                <dl className="grid gap-3 rounded-2xl border border-border/60 bg-card p-4">
                  <KeyValue label="روش محاسبه">{localizePersianText(evidence.formulaFa)}</KeyValue>
                  <KeyValue label="بازه زمانی تحلیل">{formatPeriod(evidence.period)}</KeyValue>
                  <KeyValue label="بازه زمانی مبنای مقایسه">
                    {evidence.comparisonPeriod
                      ? formatPeriod(evidence.comparisonPeriod)
                      : "مستقل از دوره مقایسه"}
                  </KeyValue>
                  <KeyValue label="شناسه فنی فرمول">
                    <code dir="ltr" className="inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                      {evidence.formulaId}
                    </code>
                  </KeyValue>
                </dl>
              </EvidenceSection>

              <EvidenceSection title="اجزای محاسبه و مقایسه">
                {operands?.complete ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-card p-4">
                      <p className="text-xs font-semibold text-muted-foreground">صورت کسر (تعداد / مقدار جزء)</p>
                      <p className="mt-1 text-sm font-bold text-foreground">
                        {localizePersianText(evidence.numerator?.labelFa)}
                      </p>
                      <p className="mt-1 text-xl font-extrabold tabular-nums text-primary">
                        {numberFormatter.format(evidence.numerator?.value ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-card p-4">
                      <p className="text-xs font-semibold text-muted-foreground">مخرج کسر (کل موارد بررسی‌شده)</p>
                      <p className="mt-1 text-sm font-bold text-foreground">
                        {localizePersianText(evidence.denominator?.labelFa)}
                      </p>
                      <p className="mt-1 text-xl font-extrabold tabular-nums text-foreground">
                        {numberFormatter.format(evidence.denominator?.value ?? 0)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/60 bg-card p-4 text-xs leading-relaxed text-muted-foreground">
                    این شاخص به صورت مستقیم بر اساس فرمول محاسباتی بالا و فیلترهای مشخص‌شده در این دوره اندازه‌گیری شده است.
                  </div>
                )}

                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <p className="text-xs font-semibold text-muted-foreground">مبنای مقایسه</p>
                  {evidence.baseline ? (
                    <p className="mt-1 text-sm font-medium text-foreground leading-relaxed">
                      {formatBaselineLabel(evidence.baseline.type)}:{" "}
                      <span className="font-bold tabular-nums text-primary">
                        {numberFormatter.format(evidence.baseline.value)}٪
                      </span>{" "}
                      <span className="text-xs text-muted-foreground">
                        (بر اساس {numberFormatter.format(evidence.baseline.sampleSize)} سفارش در دوره قبل)
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      برای این نوع تحلیل، مقایسه دوره‌ای مستقیم کاربرد ندارد.
                    </p>
                  )}
                </div>
              </EvidenceSection>

              <EvidenceSection title="ملاحظات و محدودیت‌ها">
                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <EvidenceList items={evidence.limitations} emptyLabel="محدودیت خاصی ثبت نشده است." />
                </div>
              </EvidenceSection>

              <details className="group rounded-2xl border border-border/60 bg-muted/20 overflow-hidden transition-all">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 p-4 font-semibold text-foreground hover:bg-muted/40 marker:content-none [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-bold">مشاهده فیلترها، ستون‌های داده و نمونه پرداخت‌ها</span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground group-open:hidden">
                    بررسی بیشتر
                  </span>
                  <span className="hidden rounded-full bg-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground group-open:inline">
                    بستن جزئیات
                  </span>
                </summary>

                <div className="grid gap-5 border-t border-border/50 p-4 sm:p-5">
                  <EvidenceSection title="شرایط و فرض‌های تحلیل">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid content-start gap-2 rounded-xl bg-card border border-border/50 p-3.5">
                        <p className="text-xs font-bold text-foreground">شرایط کنترل‌شده</p>
                        <EvidenceList items={evidence.controls} emptyLabel="شرط کنترلی خاصی ثبت نشده است." />
                      </div>
                      <div className="grid content-start gap-2 rounded-xl bg-card border border-border/50 p-3.5">
                        <p className="text-xs font-bold text-foreground">فرض‌های آماری</p>
                        <EvidenceList items={evidence.assumptions} emptyLabel="فرض اضافه‌ای ثبت نشده است." />
                      </div>
                    </div>
                  </EvidenceSection>

                  <EvidenceSection title="ستون‌ها و فیلترهای داده">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      این شاخص از روی ستون‌های زیر در جدول پرداخت‌ها و با اعمال فیلترهای زیر محاسبه شده است:
                    </p>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Database aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <p>{grainLabels[evidence.grain]}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5" dir="rtl">
                      {evidence.sourceColumns.map((column) => (
                        <span key={column} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                          {columnLabels[column] ?? column}
                        </span>
                      ))}
                    </div>
                    {evidence.filters.length > 0 ? (
                      <div className="grid gap-2 rounded-xl bg-card border border-border/50 p-3">
                        {evidence.filters.map((filter, index) => (
                          <div
                            key={`${filter.field}-${index}`}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs"
                          >
                            <span className="font-medium text-muted-foreground">
                              فیلتر {numberFormatter.format(index + 1)} ({columnLabels[filter.field] ?? filter.field})
                            </span>
                            <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                              {columnLabels[filter.field] ?? filter.field} {filter.operator === "=" ? "برابر با" : filter.operator === ">=" ? "بزرگتر یا مساوی با" : filter.operator} {localizePersianText(formatFilterValue(filter.value))}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">فیلتر اضافه‌ای اعمال نشده است.</p>
                    )}
                  </EvidenceSection>

                  <EvidenceSection title="نمونه سفارش‌های بررسی‌شده">
                    {!hasSufficientEvidenceSample(evidence) ? null : (
                      <p className="text-xs leading-5 text-muted-foreground">
                        این ردیف‌ها صرفاً برای نمونه و ردیابی صحت محاسبه نمایش داده شده‌اند.
                      </p>
                    )}
                    <SampleRows rows={evidence.sampleRows} />
                  </EvidenceSection>

                  <p className="break-all border-t border-border/50 pt-4 text-xs text-muted-foreground">
                    شناسه نسخه داده (Fingerprint): <span dir="ltr" className="font-mono">{evidence.datasetFingerprint}</span>
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

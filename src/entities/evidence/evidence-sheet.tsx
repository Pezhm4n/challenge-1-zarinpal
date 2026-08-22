"use client"

import { CalendarDays, CircleAlert, CircleHelp, Database, Scale } from "lucide-react"
import { useRef } from "react"

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
import { BaselineComparison } from "./baseline-comparison"
import { CalculationEquation, inferCalculationMode } from "./calculation-equation"
import {
  formatPersianDateTime,
  formatPersianPeriod,
  localizePersianText,
} from "@/lib/persian-date"
import {
  hasSufficientEvidenceSample,
  inspectEvidenceOperands,
} from "./model"
import { useSheetScrollTop } from "./use-sheet-scroll-top"
import { describeEvidenceFilter } from "./filter-text"

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 2,
})

const grainLabels: Record<EvidenceRecord["grain"], string> = {
  attempt: "محاسبه روی تلاش‌های پرداخت",
  session: "محاسبه روی سفارش‌های مستقل",
  "merchant-period": "محاسبه روی کل دوره فروشگاه",
  "merchant-card": "محاسبه روی خریداران دارای کارت بانکی",
  "peer-group": "محاسبه روی فروشگاه‌های هم‌صنف",
}

function formatPeriod(period: EvidenceRecord["period"]): string {
  return formatPersianPeriod(period)
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

const statusTranslations: Record<string, string> = {
  NoAttempt: "انصراف قبل از درگاه",
  Verified: "پرداخت موفق",
  Failed: "ناموفق",
  Initiated: "شروع‌شده",
  InBank: "در جریان پرداخت در بانک",
  Paid: "پرداخت در بانک",
  Reversed: "برگشت‌خورده",
  Expired: "منقضی‌شده",
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return "کاربرد ندارد"
  const label = statusTranslations[status]
  return label ?? localizePersianText(status)
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
    format: (row) => localizePersianText(row.sessionKey),
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
  { key: "pspCode", label: "درگاه" },
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
        <SheetDescription>جزئیات محاسبه این بخش در دسترس نیست.</SheetDescription>
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

const columnLabels: Record<string, string> = {
  session_key: "شناسه پرداخت",
  merchant_key: "کد فروشگاه",
  category_id: "دسته‌بندی صنف",
  amount_rial: "مبلغ سفارش",
  amount: "مبلغ",
  created_at: "زمان ثبت",
  eventual_verified: "وضعیت پرداخت نهایی",
  try_seq: "شماره تلاش",
  "max(try_seq)": "شماره آخرین تلاش",
  first_try_status: "وضعیت اولین تلاش",
  amount_band: "بازه مبلغی",
  try_status: "وضعیت تلاش",
  session_status: "وضعیت سفارش",
  payer_card_key: "شناسه کارت خریدار",
  psp_code: "کد درگاه (PSP)",
  evidence_scope: "محدوده تحلیل",
  sessions: "تعداد سفارش‌ها",
  weekday: "روز هفته",
  hour: "ساعت روز",
  metric: "معیار مقایسه",
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
  const contentRef = useSheetScrollTop(open, evidence?.id)
  const headerRef = useRef<HTMLDivElement | null>(null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        ref={contentRef}
        initialFocus={headerRef}
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
                messageFa: "جزئیات محاسبه این عدد پیدا نشد. لطفاً صفحه را دوباره باز کنید.",
                recoverable: false,
              }
            }
          />
        ) : (
          <>
            <SheetHeader
              ref={headerRef}
              tabIndex={-1}
              className="gap-2.5 border-b border-border/70 p-5 pe-14 text-start outline-none sm:p-6"
            >
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
              <section
                aria-label="نتیجه و روش محاسبه"
                className="rounded-2xl border border-border/60 bg-muted/50 p-4 sm:p-5"
              >
                <p className="text-xs font-semibold text-muted-foreground">
                  نتیجه نهایی محاسبه
                </p>
                <p className="mt-2.5 break-words text-xl font-extrabold tabular-nums tracking-tight text-foreground sm:text-3xl">
                  {evidence.result
                    ? formatMetricValue(evidence.result)
                    : "قابل محاسبه نیست"}
                </p>

                {operands?.complete &&
                evidence.numerator &&
                evidence.denominator &&
                evidence.result ? (
                  <div className="mt-5">
                    <CalculationEquation
                      mode={inferCalculationMode(
                        evidence.numerator.value,
                        evidence.denominator.value,
                        evidence.result.value,
                      )}
                      numeratorLabel={localizePersianText(evidence.numerator.labelFa)}
                      numeratorValue={numberFormatter.format(evidence.numerator.value)}
                      denominatorLabel={localizePersianText(evidence.denominator.labelFa)}
                      denominatorValue={numberFormatter.format(evidence.denominator.value)}
                      resultDisplay={formatMetricValue(evidence.result)}
                    />
                  </div>
                ) : evidence.result ? (
                  <p className="mt-3 rounded-xl bg-background p-3 text-sm leading-relaxed text-muted-foreground">
                    {localizePersianText(evidence.formulaFa)}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 font-medium text-foreground">
                    <CalendarDays aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                    بازه تحلیل: {formatPeriod(evidence.period)}
                  </span>
                  {evidence.comparisonPeriod ? (
                    <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 font-medium text-foreground">
                      <Scale aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
                      مقایسه با دوره قبل: {formatPeriod(evidence.comparisonPeriod)}
                    </span>
                  ) : null}
                </div>
              </section>

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

              <EvidenceSection title="این عدد در مقایسه با مبنایش">
                {evidence.baseline ? (
                  <BaselineComparison
                    baseline={evidence.baseline}
                    currentValue={
                      evidence.result && Number.isFinite(evidence.result.value)
                        ? evidence.result.value
                        : null
                    }
                    currentDisplay={
                      evidence.result ? formatMetricValue(evidence.result) : undefined
                    }
                    isRate={evidence.result?.unit === "percent"}
                  />
                ) : (
                  <p className="rounded-2xl border border-border/60 bg-card p-4 text-sm leading-relaxed text-muted-foreground">
                    برای این نوع تحلیل، مقایسه دوره‌ای مستقیم کاربرد ندارد.
                  </p>
                )}
              </EvidenceSection>

              <EvidenceSection title="قبل از تصمیم، این نکات را بدانید">
                <div className="rounded-2xl border border-border/60 bg-card p-4">
                  <EvidenceList items={evidence.limitations} emptyLabel="محدودیت خاصی ثبت نشده است." />
                </div>
              </EvidenceSection>

              <details className="group rounded-2xl border border-border/60 bg-muted/20 overflow-hidden transition-all">
                <summary className="flex min-h-12 cursor-pointer list-none flex-col items-center justify-center gap-2 p-4 text-center font-semibold text-foreground hover:bg-muted/40 marker:content-none sm:flex-row sm:justify-between sm:text-start [&::-webkit-details-marker]:hidden">
                  <span className="text-sm font-bold">جزئیات فنی برای راستی‌آزمایی محاسبه</span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground group-open:hidden">
                    بررسی بیشتر
                  </span>
                  <span className="hidden rounded-full bg-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground group-open:inline">
                    بستن جزئیات
                  </span>
                </summary>

                <div className="grid gap-5 border-t border-border/50 p-4 sm:p-5">
                  <EvidenceSection title="روش محاسبه (فنی)">
                    <p className="rounded-2xl border border-border/60 bg-card p-4 text-sm leading-relaxed text-foreground">
                      {localizePersianText(evidence.formulaFa)}
                    </p>
                  </EvidenceSection>

                  <EvidenceSection title="شرایط و فرض‌های تحلیل">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="grid content-start gap-2 rounded-xl bg-card border border-border/50 p-3.5">
                        <p className="text-xs font-bold text-foreground">شرایط ثابت مقایسه</p>
                        <EvidenceList items={evidence.controls} emptyLabel="شرطی ثبت نشده است." />
                      </div>
                      <div className="grid content-start gap-2 rounded-xl bg-card border border-border/50 p-3.5">
                        <p className="text-xs font-bold text-foreground">فرض‌های محاسبه</p>
                        <EvidenceList items={evidence.assumptions} emptyLabel="فرض خاصی ثبت نشده است." />
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
                              {describeEvidenceFilter(
                                columnLabels[filter.field] ?? filter.field,
                                filter.operator,
                                filter.value,
                              )}
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

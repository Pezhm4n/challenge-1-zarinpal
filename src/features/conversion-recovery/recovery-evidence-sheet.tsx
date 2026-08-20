"use client"

import {
  CircleAlert,
  CircleHelp,
  Database,
  Sigma,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import type { EvidenceRecord, EvidenceSampleRow, MetricValue } from "./types"


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
  session: "Session",
  "merchant-period": "پذیرنده در بازه",
  "merchant-card": "پذیرنده و کارت Mask‌شده",
  "peer-group": "گروه همتا",
}
const unitLabels: Record<MetricValue["unit"], string> = {
  rial: "ریال",
  percent: "٪",
  count: "",
  "percentage-point": "واحد درصد",
  seconds: "ثانیه",
}
const kindLabels: Record<MetricValue["kind"], string> = {
  actual: "مقدار واقعی",
  estimate: "برآورد سناریویی",
  benchmark: "معیار مقایسه",
}

function formatMetric(metric: MetricValue): string {
  const value = new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: metric.displayPrecision,
    maximumFractionDigits: metric.displayPrecision,
  }).format(metric.value)
  const suffix = unitLabels[metric.unit]
  return suffix ? `${value} ${suffix}` : value
}

function formatDate(value: string): string {
  const withTime = value.includes("T") ? value : `${value}T00:00:00`
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(withTime)
    ? withTime
    : `${withTime}Z`
  return dateFormatter.format(new Date(normalized))
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
      <h3 className="text-sm font-bold">{title}</h3>
      {children}
    </section>
  )
}

function KeyValue({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm">{children}</dd>
    </div>
  )
}

function EvidenceList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }
  return (
    <ul className="grid list-disc gap-2 pe-5 text-sm leading-6 text-muted-foreground">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

function SampleValue({ value }: { value: string | number | null | undefined }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">ثبت نشده</span>
  }
  return <>{typeof value === "number" ? numberFormatter.format(value) : value}</>
}

function SampleCard({ row, index }: { row: EvidenceSampleRow; index: number }) {
  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <p className="text-xs font-semibold text-muted-foreground">
        نمونه {numberFormatter.format(index + 1)}
      </p>
      <dl className="grid gap-2">
        <KeyValue label="Session">
          <span dir="ltr">{row.sessionKey}</span>
        </KeyValue>
        <KeyValue label="زمان">{formatDate(row.createdAt)}</KeyValue>
        <KeyValue label="مبلغ">
          {numberFormatter.format(row.amountRial)} ریال
        </KeyValue>
        <KeyValue label="وضعیت">
          <SampleValue value={row.tryStatus ?? row.sessionStatus} />
        </KeyValue>
        <KeyValue label="PSP">
          <SampleValue value={row.pspCode} />
        </KeyValue>
        <KeyValue label="کارت Mask‌شده">
          <SampleValue value={row.payerCardMasked} />
        </KeyValue>
      </dl>
    </div>
  )
}

export function RecoveryEvidenceSheet({
  evidence,
  open,
  onOpenChange,
}: {
  evidence: EvidenceRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const visibleQualityNotes = evidence?.dataQuality.filter(
    (note, index, notes) =>
      notes.findIndex((candidate) => candidate.messageFa === note.messageFa) ===
      index,
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="data-[side=left]:w-full data-[side=left]:max-w-none data-[side=left]:sm:max-w-2xl gap-0 overflow-y-auto"
        aria-label="مدرک محاسبه تحلیل بازیابی"
        aria-modal="true"
      >
        {!evidence ? (
          <>
            <SheetHeader className="pe-14 text-start">
              <SheetTitle>مدرک محاسبه پیدا نشد</SheetTitle>
              <SheetDescription>
                Artifact باید دوباره تولید و بررسی شود.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
              <Alert variant="destructive">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>گزارش ناقص است</AlertTitle>
                <AlertDescription>
                  جزئیات فنی داخلی نمایش داده نمی‌شود.
                </AlertDescription>
              </Alert>
            </div>
          </>
        ) : (
          <>
            <SheetHeader className="gap-2 border-b pe-14 text-start">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={evidence.result?.kind === "estimate" ? "default" : "secondary"}>
                  {evidence.result ? kindLabels[evidence.result.kind] : "داده ناکافی"}
                </Badge>
                <Badge variant="outline">{grainLabels[evidence.grain]}</Badge>
              </div>
              <SheetTitle className="text-xl font-bold">
                {evidence.titleFa}
              </SheetTitle>
              <SheetDescription className="leading-6">
                {evidence.explanationFa}
              </SheetDescription>
            </SheetHeader>

            <div className="grid gap-5 p-4 sm:p-6">
              <div className="rounded-lg bg-muted/70 p-4">
                <p className="text-xs text-muted-foreground">نتیجه محاسبه</p>
                <p className="mt-2 break-words text-xl font-bold tabular-nums">
                  {evidence.result ? formatMetric(evidence.result) : "قابل محاسبه نیست"}
                </p>
              </div>

              {visibleQualityNotes?.map((note) => {
                const matchingCodes = evidence.dataQuality
                  .filter((candidate) => candidate.messageFa === note.messageFa)
                  .map((candidate) => candidate.code)
                return (
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
                    {note.severity === "warning"
                      ? "محدودیت کیفیت داده"
                      : "یادداشت تحلیل"}
                  </AlertTitle>
                  <AlertDescription>
                    <p>{note.messageFa}</p>
                    <code dir="ltr" className="mt-2 block text-xs">
                      {matchingCodes.join(" / ")}
                    </code>
                  </AlertDescription>
                </Alert>
                )
              })}

              <EvidenceSection title="فرمول و بازه">
                <dl className="grid gap-3">
                  <KeyValue label="Formula ID">
                    <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {evidence.formulaId}
                    </code>
                  </KeyValue>
                  <KeyValue label="فرمول">{evidence.formulaFa}</KeyValue>
                  <KeyValue label="بازه تحلیل">
                    {formatDate(evidence.period.from)} تا {formatDate(evidence.period.to)}
                  </KeyValue>
                  <KeyValue label="بازه مقایسه">
                    {evidence.comparisonPeriod
                      ? `${formatDate(evidence.comparisonPeriod.from)} تا ${formatDate(evidence.comparisonPeriod.to)}`
                      : "ثبت نشده"}
                  </KeyValue>
                </dl>
              </EvidenceSection>

              <EvidenceSection title="صورت، مخرج و خط مبنا">
                {!evidence.numerator || !evidence.denominator ? (
                  <Alert>
                    <Sigma aria-hidden="true" />
                    <AlertTitle>همه عملوندها برای این نوع عدد لازم نیستند</AlertTitle>
                    <AlertDescription>
                      در Count یا Sum مستقیم، فرمول و فیلترهای Session منبع ردیابی هستند.
                    </AlertDescription>
                  </Alert>
                ) : null}
                <dl className="grid gap-3">
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
                  <KeyValue label="Baseline">
                    {evidence.baseline
                      ? `${evidence.baseline.type}، مقدار ${numberFormatter.format(evidence.baseline.value)}، نمونه ${numberFormatter.format(evidence.baseline.sampleSize)}`
                      : "ثبت نشده"}
                  </KeyValue>
                </dl>
              </EvidenceSection>

              <EvidenceSection title="منبع و فیلترها">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Database aria-hidden="true" />
                  <p>Grain محاسبه: {grainLabels[evidence.grain]}</p>
                </div>
                <div className="flex flex-wrap gap-2" dir="ltr">
                  {evidence.sourceColumns.map((column) => (
                    <code key={column} className="rounded bg-muted px-2 py-1 text-xs">
                      {column}
                    </code>
                  ))}
                </div>
                <dl className="grid gap-2">
                  {evidence.filters.map((filter, index) => (
                    <KeyValue
                      key={`${filter.field}-${index}`}
                      label={`فیلتر ${numberFormatter.format(index + 1)}`}
                    >
                      <code dir="ltr" className="text-xs">
                        {filter.field} {filter.operator} {formatFilterValue(filter.value)}
                      </code>
                    </KeyValue>
                  ))}
                </dl>
              </EvidenceSection>

              <EvidenceSection title="کنترل‌ها، فرض‌ها و محدودیت‌ها">
                <div className="grid gap-5 sm:grid-cols-3">
                  <div className="grid content-start gap-2">
                    <p className="text-xs font-semibold">کنترل‌ها</p>
                    <EvidenceList items={evidence.controls} empty="کنترلی ثبت نشده است." />
                  </div>
                  <div className="grid content-start gap-2">
                    <p className="text-xs font-semibold">فرض‌ها</p>
                    <EvidenceList items={evidence.assumptions} empty="فرض اضافه‌ای ثبت نشده است." />
                  </div>
                  <div className="grid content-start gap-2">
                    <p className="text-xs font-semibold">محدودیت‌ها</p>
                    <EvidenceList items={evidence.limitations} empty="محدودیتی ثبت نشده است." />
                  </div>
                </div>
              </EvidenceSection>

              <EvidenceSection title="نمونه Sessionهای Mask‌شده">
                {evidence.sampleRows.length === 0 ? (
                  <Alert>
                    <CircleAlert aria-hidden="true" />
                    <AlertTitle>نمونه امنی ثبت نشده است</AlertTitle>
                    <AlertDescription>
                      نتیجه و کیفیت تحلیل حفظ شده‌اند؛ Sample آماری محسوب نمی‌شود.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid gap-3">
                    {evidence.sampleRows.map((row, index) => (
                      <SampleCard key={`${row.sessionKey}-${index}`} row={row} index={index} />
                    ))}
                  </div>
                )}
              </EvidenceSection>

              <p className="break-all border-t pt-4 text-xs text-muted-foreground">
                Dataset fingerprint: <span dir="ltr">{evidence.datasetFingerprint}</span>
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

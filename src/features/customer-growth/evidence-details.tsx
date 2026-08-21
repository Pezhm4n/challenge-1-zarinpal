import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import { CalendarDays, Scale } from "lucide-react"
import {
  formatPersianDateTime,
  formatPersianPeriod,
  localizePersianText,
} from "@/lib/persian-date"
import { BaselineComparison } from "@/entities/evidence/baseline-comparison"
import { CalculationEquation, inferCalculationMode } from "@/entities/evidence/calculation-equation"
import { describeEvidenceFilter } from "@/entities/evidence/filter-text"
import type { EvidenceRecord, MetricValue } from "./types"

const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 })
const faInteger = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 })

const unitSuffixes: Record<MetricValue["unit"], string> = {
  rial: "ریال",
  percent: "٪",
  count: "",
  "percentage-point": "واحد درصد",
  seconds: "ثانیه",
}

function formatResultDisplay(result: MetricValue): string {
  if (result.value === null || !Number.isFinite(result.value)) return ""
  const formatted = faNumber.format(result.value)
  const suffix = unitSuffixes[result.unit]
  return suffix ? `${formatted} ${suffix}` : formatted
}

const grainLabels: Record<EvidenceRecord["grain"], string> = {
  attempt: "محاسبه روی تلاش‌های پرداخت",
  session: "محاسبه روی سفارش‌های مستقل",
  "merchant-period": "محاسبه روی کل دوره فروشگاه",
  "merchant-card": "محاسبه روی خریداران دارای کارت بانکی",
  "peer-group": "محاسبه روی فروشگاه‌های هم‌صنف",
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

type EvidenceDetailsProps = {
  evidence?: EvidenceRecord
}

export function EvidenceDetails({ evidence }: EvidenceDetailsProps) {
  if (!evidence) {
    return null
  }

  const numerator = evidence.numerator
  const denominator = evidence.denominator
  const result = evidence.result
  const resultDisplay =
    result && result.value !== null && Number.isFinite(result.value)
      ? formatResultDisplay(result)
      : ""
  const canShowEquation = Boolean(
    numerator && denominator && result && resultDisplay,
  )
  const resultValue =
    result && result.value !== null ? result.value : null

  return (
    <details className="group rounded-2xl border border-border/60 bg-muted/20 p-4 transition-all">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold text-foreground hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="text-xs font-bold">چطور محاسبه شد؟</span>
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground group-open:hidden">
          نمایش جزئیات
        </span>
        <span className="hidden rounded-full bg-muted px-2.5 py-0.5 text-xs font-normal text-muted-foreground group-open:inline">
          بستن جزئیات
        </span>
      </summary>
      <div className="mt-4 flex flex-col gap-4 text-sm">
        <div className="flex flex-col gap-1">
          <p className="font-medium">{localizePersianText(evidence.titleFa)}</p>
          <p className="text-muted-foreground">{localizePersianText(evidence.explanationFa)}</p>
        </div>

        {canShowEquation && numerator && denominator && result ? (
          <CalculationEquation
            mode={inferCalculationMode(numerator.value, denominator.value, result.value ?? Number.NaN)}
            numeratorLabel={localizePersianText(numerator.labelFa)}
            numeratorValue={faNumber.format(numerator.value)}
            denominatorLabel={localizePersianText(denominator.labelFa)}
            denominatorValue={faNumber.format(denominator.value)}
            resultDisplay={resultDisplay}
          />
        ) : null}

        {!canShowEquation ? (
          <p className="rounded-xl bg-background p-3 text-sm leading-relaxed text-muted-foreground">
            {localizePersianText(evidence.formulaFa)}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 font-medium text-foreground">
            <CalendarDays aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
            بازه تحلیل: {formatPersianPeriod(evidence.period)}
          </span>
          {evidence.comparisonPeriod ? (
            <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 font-medium text-foreground">
              <Scale aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
              مقایسه با دوره قبل: {formatPersianPeriod(evidence.comparisonPeriod)}
            </span>
          ) : null}
          <span className="inline-flex min-h-8 items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1.5 font-medium text-muted-foreground">
            {grainLabels[evidence.grain]}
          </span>
        </div>

        {evidence.baseline ? (
          <BaselineComparison
            baseline={evidence.baseline}
            currentValue={resultValue}
            currentDisplay={resultDisplay || undefined}
            isRate={result?.unit === "percent"}
          />
        ) : null}

        {evidence.dataQuality.map((note) => (
          <Alert key={note.code}>
            <AlertTitle>کیفیت داده</AlertTitle>
            <AlertDescription>{localizePersianText(note.messageFa)}</AlertDescription>
          </Alert>
        ))}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-card p-3.5">
            <p className="text-xs font-bold text-foreground">فرض‌ها</p>
            <ul className="mt-2.5 flex flex-col gap-2.5 text-xs text-muted-foreground">
              {evidence.assumptions.map((item, index) => {
                const localized = localizePersianText(item)
                const isPersian = /[\u0600-\u06FF]/.test(localized)
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
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-3.5">
            <p className="text-xs font-bold text-foreground">محدودیت‌ها</p>
            <ul className="mt-2.5 flex flex-col gap-2.5 text-xs text-muted-foreground">
              {evidence.limitations.map((item, index) => {
                const localized = localizePersianText(item)
                const isPersian = /[\u0600-\u06FF]/.test(localized)
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
          </div>
        </div>

        {evidence.sampleRows.length > 0 ? (
          <div>
            <p className="mb-2 font-medium">نمونه سفارش‌های بررسی‌شده</p>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>شناسه پرداخت</TableHead>
                    <TableHead>کارت خریدار</TableHead>
                    <TableHead>مبلغ (ریال)</TableHead>
                    <TableHead>زمان</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evidence.sampleRows.map((row) => (
                    <TableRow key={row.sessionKey}>
                      <TableCell>{localizePersianText(row.sessionKey)}</TableCell>
                      <TableCell>{row.payerCardMasked ?? "—"}</TableCell>
                      <TableCell>{faInteger.format(row.amountRial)}</TableCell>
                      <TableCell>{formatPersianDateTime(row.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-2 md:hidden">
              {evidence.sampleRows.map((row) => (
                <dl className="rounded-lg bg-background p-3" key={row.sessionKey}>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">شناسه پرداخت</dt>
                    <dd>{localizePersianText(row.sessionKey)}</dd>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">کارت خریدار</dt>
                    <dd>{row.payerCardMasked ?? "—"}</dd>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">مبلغ</dt>
                    <dd>{faInteger.format(row.amountRial)} ریال</dd>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">زمان</dt>
                    <dd>{formatPersianDateTime(row.createdAt)}</dd>
                  </div>
                </dl>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3 rounded-xl border border-border/50 bg-background/60 p-3.5">
          <p className="text-xs font-bold text-foreground">
            جزئیات فنی برای راستی‌آزمایی محاسبه
          </p>
          <div>
            <p className="text-xs text-muted-foreground">فرمول محاسبه (فنی)</p>
            <p className="mt-1 text-sm">{localizePersianText(evidence.formulaFa)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ستون‌های منبع</p>
            <dd className="mt-1 flex flex-wrap gap-2" dir="rtl">
              {evidence.sourceColumns.map((column) => (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground" key={column}>
                  {columnLabels[column] ?? column}
                </span>
              ))}
            </dd>
          </div>
          {evidence.filters.length > 0 ? (
            <div>
              <p className="text-xs text-muted-foreground">فیلترهای اعمال‌شده</p>
              <dd className="mt-1 flex flex-col gap-1">
                {evidence.filters.map((filter, index) => (
                  <div className="flex flex-wrap items-center justify-between text-xs rounded bg-muted/50 p-2" key={`${filter.field}-${index}`}>
                    <span className="text-muted-foreground">{columnLabels[filter.field] ?? filter.field}</span>
                    <span className="font-medium text-foreground">
                      {describeEvidenceFilter(columnLabels[filter.field] ?? filter.field, filter.operator, filter.value)}
                    </span>
                  </div>
                ))}
              </dd>
            </div>
          ) : null}
        </div>

        <p className="break-all text-xs text-muted-foreground">
          شناسه نسخه داده: <span dir="ltr" className="font-mono">{evidence.datasetFingerprint}</span>
        </p>
      </div>
    </details>
  )
}

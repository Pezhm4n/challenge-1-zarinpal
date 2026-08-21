import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"
import {
  formatPersianDateTime,
  formatPersianPeriod,
  localizePersianText,
} from "@/lib/persian-date"
import type { EvidenceRecord } from "./types"

const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 })
const faInteger = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 })

const grainLabels: Record<EvidenceRecord["grain"], string> = {
  attempt: "سطح تحلیل: تلاش‌های پرداخت",
  session: "سطح تحلیل: سفارش‌های مستقل",
  "merchant-period": "سطح تحلیل: کل دوره فروشگاه",
  "merchant-card": "سطح تحلیل: خریداران دارای کارت بانکی",
  "peer-group": "سطح تحلیل: گروه هم‌صنفان و بازار",
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

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-background p-3">
            <dt className="text-xs text-muted-foreground">
              {localizePersianText(evidence.numerator?.labelFa) || "صورت"}
            </dt>
            <dd className="mt-1 font-medium">
              {faNumber.format(evidence.numerator?.value ?? 0)}
            </dd>
          </div>
          <div className="rounded-lg bg-background p-3">
            <dt className="text-xs text-muted-foreground">
              {localizePersianText(evidence.denominator?.labelFa) || "مخرج"}
            </dt>
            <dd className="mt-1 font-medium">
              {faNumber.format(evidence.denominator?.value ?? 0)}
            </dd>
          </div>
        </dl>

        <div>
          <p className="text-xs text-muted-foreground">فرمول</p>
          <p className="mt-1 font-medium">{localizePersianText(evidence.formulaFa)}</p>
          <p className="mt-1 text-xs text-muted-foreground" dir="ltr">
            {evidence.formulaId}
          </p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">سطح محاسبه</dt>
            <dd className="mt-1 font-medium">{grainLabels[evidence.grain]}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">بازه محاسبه</dt>
            <dd className="mt-1 font-medium">
              {formatPersianPeriod(evidence.period)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">ستون‌های منبع</dt>
            <dd className="mt-1 flex flex-wrap gap-2" dir="rtl">
              {evidence.sourceColumns.map((column) => (
                <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-foreground" key={column}>
                  {columnLabels[column] ?? column}
                </span>
              ))}
            </dd>
          </div>
          {evidence.filters.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">فیلترهای اعمال‌شده</dt>
              <dd className="mt-1 flex flex-col gap-1">
                {evidence.filters.map((filter, index) => (
                  <div className="flex flex-wrap items-center justify-between text-xs rounded bg-background p-2" key={`${filter.field}-${index}`}>
                    <span className="text-muted-foreground">{columnLabels[filter.field] ?? filter.field}</span>
                    <span className="font-medium text-foreground">{columnLabels[filter.field] ?? filter.field} {filter.operator === "=" ? "برابر با" : filter.operator} {localizePersianText(String(filter.value))}</span>
                  </div>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>

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
            <p className="mb-2 font-medium">نمونه سفارش‌های مرتبط با صورت کسر</p>
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
                      <TableCell dir="ltr">{row.sessionKey}</TableCell>
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
                    <dd dir="ltr">{row.sessionKey}</dd>
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

        <p className="break-all text-xs text-muted-foreground">
          شناسه داده (Fingerprint): <span dir="ltr" className="font-mono">{evidence.datasetFingerprint}</span>
        </p>
      </div>
    </details>
  )
}

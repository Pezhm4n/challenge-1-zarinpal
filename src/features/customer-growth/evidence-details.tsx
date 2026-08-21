import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table"

import type { EvidenceRecord } from "./types"

const faNumber = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 })
const faInteger = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 })

const grainLabels: Record<EvidenceRecord["grain"], string> = {
  attempt: "تلاش پرداخت",
  session: "نشست پرداخت",
  "merchant-period": "پذیرنده در بازه",
  "merchant-card": "پذیرنده و کارت",
  "peer-group": "گروه همتا",
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
      <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between font-semibold text-foreground hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 marker:content-none [&::-webkit-details-marker]:hidden">
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
          <p className="font-medium">{evidence.titleFa}</p>
          <p className="text-muted-foreground">{evidence.explanationFa}</p>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-background p-3">
            <dt className="text-xs text-muted-foreground">
              {evidence.numerator?.labelFa ?? "صورت"}
            </dt>
            <dd className="mt-1 font-medium">
              {faNumber.format(evidence.numerator?.value ?? 0)}
            </dd>
          </div>
          <div className="rounded-lg bg-background p-3">
            <dt className="text-xs text-muted-foreground">
              {evidence.denominator?.labelFa ?? "مخرج"}
            </dt>
            <dd className="mt-1 font-medium">
              {faNumber.format(evidence.denominator?.value ?? 0)}
            </dd>
          </div>
        </dl>

        <div>
          <p className="text-xs text-muted-foreground">فرمول</p>
          <p className="mt-1 font-medium">{evidence.formulaFa}</p>
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
            <dd className="mt-1 font-medium" dir="ltr">
              {evidence.period.from.slice(0, 10)} – {evidence.period.to.slice(0, 10)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted-foreground">ستون‌های منبع</dt>
            <dd className="mt-1 flex flex-wrap gap-2" dir="ltr">
              {evidence.sourceColumns.map((column) => (
                <code className="rounded bg-background px-2 py-1 text-xs" key={column}>
                  {column}
                </code>
              ))}
            </dd>
          </div>
          {evidence.filters.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">فیلترهای اعمال‌شده</dt>
              <dd className="mt-1 flex flex-col gap-1" dir="ltr">
                {evidence.filters.map((filter, index) => (
                  <code className="text-xs" key={`${filter.field}-${index}`}>
                    {filter.field} {filter.operator} {String(filter.value)}
                  </code>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>

        {evidence.dataQuality.map((note) => (
          <Alert key={note.code}>
            <AlertTitle>کیفیت داده</AlertTitle>
            <AlertDescription>{note.messageFa}</AlertDescription>
          </Alert>
        ))}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="font-medium">فرض‌ها</p>
            <ul className="mt-2 flex list-inside list-disc flex-col gap-1 text-muted-foreground">
              {evidence.assumptions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="font-medium">محدودیت‌ها</p>
            <ul className="mt-2 flex list-inside list-disc flex-col gap-1 text-muted-foreground">
              {evidence.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        {evidence.sampleRows.length > 0 ? (
          <div>
            <p className="mb-2 font-medium">نمونه Sessionهای مرتبط با صورت کسر</p>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Card ناشناس</TableHead>
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
                      <TableCell dir="ltr">{row.createdAt.slice(0, 10)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-col gap-2 md:hidden">
              {evidence.sampleRows.map((row) => (
                <dl className="rounded-lg bg-background p-3" key={row.sessionKey}>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Session</dt>
                    <dd dir="ltr">{row.sessionKey}</dd>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Card ناشناس</dt>
                    <dd>{row.payerCardMasked ?? "—"}</dd>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">مبلغ</dt>
                    <dd>{faInteger.format(row.amountRial)} ریال</dd>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">زمان</dt>
                    <dd dir="ltr">{row.createdAt.slice(0, 10)}</dd>
                  </div>
                </dl>
              ))}
            </div>
          </div>
        ) : null}

        <p className="break-all text-xs text-muted-foreground" dir="ltr">
          Dataset fingerprint: {evidence.datasetFingerprint}
        </p>
      </div>
    </details>
  )
}

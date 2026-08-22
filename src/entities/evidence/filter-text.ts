import { formatPersianDate, localizePersianText } from "@/lib/persian-date"

const statusLabelsFa: Record<string, string> = {
  NoAttempt: "انصراف قبل از درگاه",
  Verified: "پرداخت موفق",
  Failed: "ناموفق",
  Initiated: "شروع‌شده",
  InBank: "در جریان پرداخت در بانک",
  Paid: "پرداخت در بانک",
  Reversed: "برگشت‌خورده",
  Expired: "منقضی‌شده",
}

const metricValueLabelsFa: Record<string, string> = {
  verificationRate: "نرخ پرداخت موفق",
  verifiedVolumeRial: "فروش موفق",
  averageVerifiedTicketRial: "میانگین مبلغ خرید موفق",
}

const bandValueLabelsFa: Record<string, string> = {
  low: "مبلغ پایین",
  "lower-middle": "میانی پایین",
  "upper-middle": "میانی بالا",
  high: "مبلغ بالا",
}

const scopeValueLabelsFa: Array<[RegExp, string]> = [
  [/^growth:traffic$/, "رشد ترافیک خریداران"],
  [/^growth:conversion$/, "رشد نرخ تبدیل"],
  [/^growth:ticket$/, "رشد میانگین مبلغ خرید"],
  [/^peer:/, "مقایسه با فروشگاه‌های هم‌صنف"],
  [/^timing:/, "روز و ساعت مشخص از هفته"],
]

export function formatStatusFa(status: string | null | undefined): string {
  if (!status) return "کاربرد ندارد"
  const label = statusLabelsFa[status]
  return label ?? localizePersianText(status)
}

const filterNumberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 2,
})

function formatFilterValueText(value: string | number | boolean | null): string {
  if (value === null || value === "null") return "مقدار خالی"
  if (typeof value === "boolean") return value ? "بله" : "خیر"
  if (typeof value === "number") return filterNumberFormatter.format(value)
  if (typeof value === "string") {
    const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2})?)?$/.exec(value)
    if (isoDateMatch) return formatPersianDate(isoDateMatch[0])
    const bandLabel = bandValueLabelsFa[value]
    if (bandLabel) return bandLabel
    const metricLabel = metricValueLabelsFa[value]
    if (metricLabel) return metricLabel
    for (const [pattern, label] of scopeValueLabelsFa) {
      if (pattern.test(value)) return label
    }
    if (value.includes("|")) {
      return value
        .split("|")
        .map((part) => statusLabelsFa[part] ?? localizePersianText(part))
        .join("، ")
    }
    const statusLabel = statusLabelsFa[value]
    if (statusLabel) return statusLabel
    const pspMatch = /^PSP-(\d+)$/.exec(value)
    if (pspMatch) return localizePersianText(`درگاه ${pspMatch[1]}`)
  }
  return localizePersianText(value)
}

export function describeEvidenceFilter(
  fieldLabel: string,
  operator: string,
  value: string | number | boolean | null,
): string {
  const isNullish = value === null || value === "null"
  if (operator === "is not" && isNullish) return `${fieldLabel} مقدار داشته باشد`
  if (operator === "is" && isNullish) return `${fieldLabel} مقدار نداشته باشد`

  const operatorLabel =
    operator === "="
      ? "برابر با"
      : operator === "!=" || operator === "<>"
        ? "به‌جز"
        : operator === ">="
        ? "بزرگتر یا مساوی با"
        : operator === "<="
          ? "کوچکتر یا مساوی با"
          : operator === "<"
            ? "کوچک‌تر از"
            : operator === ">"
              ? "بزرگ‌تر از"
              : operator === "IN"
                ? "یکی از این حالت‌ها"
                : operator

  return `${fieldLabel} ${operatorLabel} ${formatFilterValueText(value)}`
}

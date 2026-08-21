import { localizePersianText } from "@/lib/persian-date"

const statusLabelsFa: Record<string, string> = {
  NoAttempt: "انصراف قبل از درگاه",
  Verified: "پرداخت موفق",
  Failed: "ناموفق",
  Initiated: "شروع‌شده",
  Paid: "پرداخت در بانک",
  Reversed: "برگشت‌خورده",
  Expired: "منقضی‌شده",
}

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
      : operator === ">="
        ? "بزرگتر یا مساوی با"
        : operator === "<="
          ? "کوچکتر یا مساوی با"
          : operator === "<"
            ? "کوچک‌تر از"
            : operator === ">"
              ? "بزرگ‌تر از"
              : operator

  return `${fieldLabel} ${operatorLabel} ${formatFilterValueText(value)}`
}

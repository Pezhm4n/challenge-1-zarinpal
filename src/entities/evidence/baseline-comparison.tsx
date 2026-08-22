const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 2,
})

export type BaselineInfo = {
  type: string
  value: number
  sampleSize: number
}

const baselineLabels: Record<string, string> = {
  "merchant-period-verification-rate": "میانگین نرخ پرداخت موفق در کل دوره",
  "comparison-period-no-attempt-share": "سهم انصراف خریداران در دوره قبل",
  "comparison-returning-share": "سهم خریداران بازگشتی در دوره قبل",
  "same-category-peer-median-verificationRate":
    "میانه نرخ پرداخت موفق هم‌صنفان",
  "same-category-peer-median-verifiedVolumeRial": "میانه فروش موفق هم‌صنفان",
  "same-category-peer-median-averageVerifiedTicketRial":
    "میانه مبلغ خرید هم‌صنفان",
  "previous-period-sessions": "تعداد سفارش‌ها در دوره قبل",
  "previous-period-traffic": "تعداد خریداران در دوره قبل",
  "previous-period-conversion": "نرخ پرداخت موفق در دوره قبل",
  "previous-period-ticket": "میانگین مبلغ خرید در دوره قبل",
  "previous-period-rate": "نرخ پرداخت موفق در دوره قبل",
}

const rateBaselineTypes = new Set([
  "merchant-period-verification-rate",
  "comparison-period-no-attempt-share",
  "comparison-returning-share",
  "same-category-peer-median-verificationRate",
  "previous-period-rate",
])

function formatBaselineLabel(type: string): string {
  if (baselineLabels[type]) return baselineLabels[type]
  return type
}

function formatBaselineNumber(type: string, value: number): string {
  const formatted = numberFormatter.format(value)
  return rateBaselineTypes.has(type) ? `${formatted}٪` : formatted
}

function formatSignedDelta(delta: number, isRate: boolean): string {
  const sign = delta > 0 ? "+" : delta < 0 ? "\u2212" : ""
  return `${sign}${numberFormatter.format(Math.abs(delta))}${isRate ? "٪" : ""}`
}

export function BaselineComparison({
  baseline,
  currentValue,
  currentDisplay,
  isRate = false,
}: {
  baseline: BaselineInfo
  currentValue: number | null
  currentDisplay?: string
  isRate?: boolean
}) {
  const formattedBaseline = formatBaselineNumber(baseline.type, baseline.value)
  const sampleNote = `مبنا بر اساس ${numberFormatter.format(baseline.sampleSize)} نمونه محاسبه شده است.`

  if (
    currentValue === null ||
    !Number.isFinite(currentValue) ||
    currentDisplay === undefined
  ) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground">
          {formatBaselineLabel(baseline.type)}
        </p>
        <p className="mt-1 text-lg font-extrabold tabular-nums text-primary">
          {formattedBaseline}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {sampleNote}
        </p>
      </div>
    )
  }

  const delta = currentValue - baseline.value
  const maxValue =
    Math.max(Math.abs(currentValue), Math.abs(baseline.value)) || 1
  const currentWidth = Math.min(100, (Math.abs(currentValue) / maxValue) * 100)
  const baselineWidth = Math.min(
    100,
    (Math.abs(baseline.value) / maxValue) * 100,
  )

  return (
    <div className="grid gap-4 rounded-2xl border border-border/60 bg-card p-4">
      <div>
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="font-semibold text-foreground">این دوره</span>
          <span className="font-extrabold tabular-nums text-foreground">
            {currentDisplay}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${currentWidth}%` }}
          />
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs">
          <span className="font-medium leading-4 text-muted-foreground">
            {formatBaselineLabel(baseline.type)}
          </span>
          <span className="font-bold tabular-nums text-muted-foreground">
            {formattedBaseline}
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-muted-foreground/50"
            style={{ width: `${baselineWidth}%` }}
          />
        </div>
      </div>

      <p className="border-t border-border/50 pt-3 text-xs leading-relaxed text-muted-foreground">
        اختلاف این دوره نسبت به مبنا:{" "}
        <span
          dir="ltr"
          className="font-extrabold tabular-nums text-foreground"
        >
          {formatSignedDelta(delta, isRate || rateBaselineTypes.has(baseline.type))}
        </span>
      </p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {sampleNote}
      </p>
    </div>
  )
}

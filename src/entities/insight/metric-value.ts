import type { MetricValue } from "@/contracts"


const unitSuffix: Record<MetricValue["unit"], string> = {
  rial: "ریال",
  percent: "٪",
  count: "",
  "percentage-point": "واحد درصد",
  seconds: "ثانیه",
}


export const metricKindLabels: Record<MetricValue["kind"], string> = {
  actual: "مقدار واقعی",
  estimate: "برآورد سناریویی",
  benchmark: "معیار مقایسه",
}


export function formatMetricValue(metric: MetricValue): string {
  if (!Number.isFinite(metric.value)) {
    return "داده نامعتبر"
  }

  const isNegative = metric.value < 0
  const formatted = new Intl.NumberFormat("fa-IR", {
    minimumFractionDigits: metric.displayPrecision,
    maximumFractionDigits: metric.displayPrecision,
    useGrouping: true,
  }).format(metric.value)
  const suffix = unitSuffix[metric.unit]

  const isolated = isNegative ? `\u200E${formatted}\u200E` : formatted
  return suffix ? `${isolated} ${suffix}` : isolated
}

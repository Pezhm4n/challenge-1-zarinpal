import assert from "node:assert/strict"
import test from "node:test"

import {
  formatMetricValue,
  metricKindLabels,
} from "../../src/entities/insight/metric-value.ts"


test("مبلغ ریالی بدون تبدیل ضمنی به تومان نمایش داده می‌شود", () => {
  const value = formatMetricValue({
    value: 4_900_000_000,
    unit: "rial",
    labelFa: "پتانسیل برآوردی",
    kind: "estimate",
    displayPrecision: 0,
  })

  assert.equal(value, "۴٬۹۰۰٬۰۰۰٬۰۰۰ ریال")
})


// ICU در نسخه‌های مختلف Node جای Markهای جهت (LRM/RLM) را در اعداد منفی RTL
// جابه‌جا می‌کند؛ برای Deterministic بودن تست، Markهای نامرئی قبل از مقایسه حذف می‌شوند.
const stripDirectionMarks = (value) =>
  value.replace(/[\u200E\u200F\u2066-\u2069]/g, "")

test("درصد و واحد درصد با Precision قراردادی نمایش داده می‌شوند", () => {
  assert.equal(
    formatMetricValue({
      value: 39.49,
      unit: "percent",
      labelFa: "سهم NoAttempt",
      kind: "actual",
      displayPrecision: 2,
    }),
    "۳۹٫۴۹ ٪",
  )
  assert.equal(
    stripDirectionMarks(
      formatMetricValue({
        value: -21.01,
        unit: "percentage-point",
        labelFa: "افت Conversion",
        kind: "actual",
        displayPrecision: 2,
      }),
    ),
    "−۲۱٫۰۱ واحد درصد",
  )
})


test("مقدار غیرمتناهی عدد عادی نمایش داده نمی‌شود", () => {
  assert.equal(
    formatMetricValue({
      value: Number.NaN,
      unit: "count",
      labelFa: "نامعتبر",
      kind: "actual",
      displayPrecision: 0,
    }),
    "داده نامعتبر",
  )
})


test("Label نوع Metric، Actual و Estimate را صریح جدا می‌کند", () => {
  assert.equal(metricKindLabels.actual, "مقدار واقعی")
  assert.equal(metricKindLabels.estimate, "برآورد سناریویی")
  assert.equal(metricKindLabels.benchmark, "معیار مقایسه")
})

import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import {
  parseActionCenterArtifact,
  resolveActionCenterSelection,
} from "../../src/contracts/schema.ts"
import {
  m275ActionCenterArtifact,
  m275ActionCenterFixtureMeta,
} from "../../src/mocks/action-center-m275.ts"

function cloneFixture() {
  return structuredClone(m275ActionCenterArtifact)
}

test("Artifact نهایی Action Center بدون Fixture معتبر است", async () => {
  const artifact = JSON.parse(
    await readFile("public/analysis/action-center.json", "utf8"),
  )
  const result = parseActionCenterArtifact(artifact)

  assert.equal(result.success, true)
  if (!result.success) return
  assert.equal(result.data.dataset.rowCount, 2_213_289)
  assert.equal(result.data.dataset.sessionCount, 2_062_839)
  assert.deepEqual(
    result.data.merchants.M275.prioritizedInsights.map((insight) => insight.id),
    [
      "recovery-no-attempt-M275",
      "growth-driver-m275",
      "customers-returning-change-M275",
    ],
  )
})

test("نتیجه null فقط همراه هشدار کیفیت پذیرفته می‌شود", () => {
  const artifact = cloneFixture()
  const source = artifact.merchants.M275.evidenceIndex["evidence-m275-conversion"]
  artifact.merchants.M275.evidenceIndex["evidence-null-sample"] = {
    ...structuredClone(source),
    id: "evidence-null-sample",
    result: null,
    dataQuality: [
      {
        severity: "warning",
        code: "INSUFFICIENT_SAMPLE",
        messageFa: "نمونه برای محاسبه کافی نیست.",
      },
    ],
  }

  assert.equal(parseActionCenterArtifact(artifact).success, true)
  artifact.merchants.M275.evidenceIndex["evidence-null-sample"].dataQuality = []
  assert.equal(parseActionCenterArtifact(artifact).success, false)
})

test("fixture M275 قرارداد Action Center را کامل رعایت می‌کند", () => {
  const result = parseActionCenterArtifact(m275ActionCenterArtifact)

  assert.equal(result.success, true)
  if (!result.success) return

  const payload = result.data.merchants.M275
  assert.equal(payload.prioritizedInsights.length, 3)
  assert.equal(Object.keys(payload.evidenceIndex).length, 5)
  assert.ok(
    payload.prioritizedInsights.every(
      (insight) => payload.evidenceIndex[insight.evidenceId] !== undefined,
    ),
  )
})

test("Fixture پس از عبور از مرز JSON نیز معتبر می‌ماند", () => {
  const serializedArtifact = JSON.parse(JSON.stringify(m275ActionCenterArtifact))

  assert.equal(parseActionCenterArtifact(serializedArtifact).success, true)
})

test("metadata توسعه خارج از Shape قرارداد Artifact باقی می‌ماند", () => {
  assert.equal(m275ActionCenterFixtureMeta.developmentOnly, true)
  assert.equal("developmentOnly" in m275ActionCenterArtifact, false)

  const artifactWithMockFlag = {
    ...cloneFixture(),
    developmentOnly: true,
  }
  const result = parseActionCenterArtifact(artifactWithMockFlag)

  assert.equal(result.success, false)
  if (result.success) return
  assert.equal(result.error.code, "INVALID_SCHEMA")
})

test("Actual و Estimate در Fixture از هم جدا هستند", () => {
  const insights = m275ActionCenterArtifact.merchants.M275.prioritizedInsights
  const actualInsights = insights.filter((insight) => insight.impact?.kind === "actual")
  const estimateInsights = insights.filter((insight) => insight.impact?.kind === "estimate")

  assert.equal(actualInsights.length, 2)
  assert.equal(estimateInsights.length, 1)
  assert.match(estimateInsights[0].impact?.labelFa ?? "", /برآوردی/)
})

test("Impact هر Insight دقیقاً با نتیجه Evidence آن برابر است", () => {
  const payload = m275ActionCenterArtifact.merchants.M275

  for (const insight of payload.prioritizedInsights) {
    assert.deepEqual(insight.impact, payload.evidenceIndex[insight.evidenceId].result)
  }
})

test("Artifact با Metric ناسازگار نسبت به Evidence رد می‌شود", () => {
  const headlineMismatch = cloneFixture()
  headlineMismatch.merchants.M275.headlineMetrics[0].value = {
    ...headlineMismatch.merchants.M275.headlineMetrics[0].value,
    value: headlineMismatch.merchants.M275.headlineMetrics[0].value.value + 1,
  }

  const insightMismatch = cloneFixture()
  insightMismatch.merchants.M275.prioritizedInsights[0].impact = {
    ...insightMismatch.merchants.M275.prioritizedInsights[0].impact,
    value: insightMismatch.merchants.M275.prioritizedInsights[0].impact.value + 1,
  }

  assert.equal(parseActionCenterArtifact(headlineMismatch).success, false)
  assert.equal(parseActionCenterArtifact(insightMismatch).success, false)
})

test("اعداد کلیدی M275 با محاسبه دستی صورت و مخرج تطابق دارند", () => {
  const evidence = m275ActionCenterArtifact.merchants.M275.evidenceIndex
  const roundToTwo = (value) => Math.round(value * 100) / 100

  const sales = evidence["evidence-m275-sales-delta"]
  assert.equal(
    sales.result.value,
    sales.numerator.value - sales.denominator.value,
  )

  const sessions = evidence["evidence-m275-session-growth"]
  assert.equal(
    roundToTwo(
      ((sessions.numerator.value - sessions.denominator.value) /
        sessions.denominator.value) *
        100,
    ),
    16.59,
  )

  const conversion = evidence["evidence-m275-conversion"]
  assert.equal(
    roundToTwo((conversion.numerator.value / conversion.denominator.value) * 100),
    conversion.result.value,
  )

  const noAttempt = evidence["evidence-m275-no-attempt"]
  assert.equal(
    roundToTwo((noAttempt.numerator.value / noAttempt.denominator.value) * 100),
    noAttempt.result.value,
  )
})

test("NaN و Infinity به‌عنوان Metric معتبر پذیرفته نمی‌شوند", () => {
  const nanArtifact = cloneFixture()
  nanArtifact.merchants.M275.headlineMetrics[0].value.value = Number.NaN

  const infinityArtifact = cloneFixture()
  infinityArtifact.merchants.M275.evidenceIndex[
    "evidence-m275-no-attempt"
  ].result.value = Number.POSITIVE_INFINITY

  assert.equal(parseActionCenterArtifact(nanArtifact).success, false)
  assert.equal(parseActionCenterArtifact(infinityArtifact).success, false)
})

test("Insight با Evidence ID ناموجود رد می‌شود", () => {
  const artifact = cloneFixture()
  artifact.merchants.M275.prioritizedInsights[0].evidenceId = "missing-evidence"

  const result = parseActionCenterArtifact(artifact)

  assert.equal(result.success, false)
  if (result.success) return
  assert.equal(result.error.code, "INVALID_SCHEMA")
})

test("ناهماهنگی Dataset fingerprint رد می‌شود", () => {
  const artifact = cloneFixture()
  artifact.merchants.M275.evidenceIndex[
    "evidence-m275-sales-delta"
  ].datasetFingerprint = "different-fingerprint"

  const result = parseActionCenterArtifact(artifact)

  assert.equal(result.success, false)
  if (result.success) return
  assert.equal(result.error.code, "INVALID_SCHEMA")
})

test("Numerator و Denominator اختیاری‌اند اما null قرارداد را نقض می‌کند", () => {
  const omitted = cloneFixture()
  delete omitted.merchants.M275.evidenceIndex[
    "evidence-m275-recovery-scenario"
  ].numerator
  assert.equal(parseActionCenterArtifact(omitted).success, true)

  const nullNumerator = cloneFixture()
  nullNumerator.merchants.M275.evidenceIndex[
    "evidence-m275-no-attempt"
  ].numerator = null
  assert.equal(parseActionCenterArtifact(nullNumerator).success, false)

  const nullDenominator = cloneFixture()
  nullDenominator.merchants.M275.evidenceIndex[
    "evidence-m275-no-attempt"
  ].denominator = null
  assert.equal(parseActionCenterArtifact(nullDenominator).success, false)
})

test("شناسه کارت Mask‌نشده در Sample Row رد می‌شود", () => {
  const artifact = cloneFixture()
  artifact.merchants.M275.evidenceIndex[
    "evidence-m275-conversion"
  ].sampleRows[0].payerCardMasked = "6037991234567890"

  assert.equal(parseActionCenterArtifact(artifact).success, false)
})

test("توکن کارت ناشناس هش‌شده پذیرفته و شماره خام رد می‌شود", () => {
  const artifact = cloneFixture()
  artifact.merchants.M275.evidenceIndex[
    "evidence-m275-conversion"
  ].sampleRows[0].payerCardMasked = "کارت-ناشناس-6a353901"
  assert.equal(parseActionCenterArtifact(artifact).success, true)

  artifact.merchants.M275.evidenceIndex[
    "evidence-m275-conversion"
  ].sampleRows[0].payerCardMasked = "6037991234567890"
  assert.equal(parseActionCenterArtifact(artifact).success, false)
})

test("مقصد خارجی یا اجرایی Insight رد می‌شود", () => {
  for (const destination of ["https://example.com", "//example.com", "javascript:alert(1)"]) {
    const artifact = cloneFixture()
    artifact.merchants.M275.prioritizedInsights[0].destination = destination
    assert.equal(parseActionCenterArtifact(artifact).success, false)
  }
})

test("Artifact غایب Error قابل اقدام برمی‌گرداند", () => {
  const result = parseActionCenterArtifact(undefined)

  assert.equal(result.success, false)
  if (result.success) return
  assert.deepEqual(result.error, {
    code: "MISSING_ARTIFACT",
    messageFa: "گزارش تحلیل در دسترس نیست. دوباره تلاش کنید.",
    recoverable: true,
  })
})

test("پذیرنده ناموجود با Error قراردادی پاسخ داده می‌شود", () => {
  const result = resolveActionCenterSelection(m275ActionCenterArtifact, {
    merchantKey: "M999",
    period: { from: "2026-06-01", to: "2026-06-30" },
  })

  assert.equal(result.success, false)
  if (result.success) return
  assert.equal(result.error.code, "MERCHANT_NOT_FOUND")
  assert.equal(result.error.recoverable, true)
})

test("بازه ناموجود با Error قراردادی پاسخ داده می‌شود", () => {
  const result = resolveActionCenterSelection(m275ActionCenterArtifact, {
    merchantKey: "M275",
    period: { from: "2026-05-01", to: "2026-05-31" },
  })

  assert.equal(result.success, false)
  if (result.success) return
  assert.equal(result.error.code, "PERIOD_NOT_FOUND")
  assert.equal(result.error.recoverable, true)
})

test("انتخاب موجود Payload معتبر را برمی‌گرداند", () => {
  const result = resolveActionCenterSelection(m275ActionCenterArtifact, {
    merchantKey: "M275",
    period: { from: "2026-06-01", to: "2026-06-30" },
    comparison: { from: "2026-05-01", to: "2026-05-31" },
  })

  assert.equal(result.success, true)
  if (!result.success) return
  assert.equal(result.data.merchant.merchantKey, "M275")
})

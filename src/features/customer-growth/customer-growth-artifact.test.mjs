import assert from "node:assert/strict"
import test from "node:test"

import {
  CustomerGrowthArtifactError,
  getCustomerGrowthPayload,
  parseCustomerGrowthArtifact,
} from "./customer-growth-artifact.ts"

function metric(value) {
  return {
    value,
    unit: "percent",
    labelFa: "شاخص آزمایشی",
    kind: "actual",
    displayPrecision: 2,
  }
}

function evidence(formulaId, value, denominator = 10) {
  return {
    id: `evidence-${formulaId}`,
    formulaId,
    titleFa: "شاهد آزمایشی",
    explanationFa: "توضیح شاهد",
    grain: "merchant-card",
    sourceColumns: ["merchant_key", "session_key"],
    filters: [{ field: "try_status", operator: "=", value: "Verified" }],
    period: { from: "2026-03-01", to: "2026-03-31" },
    comparisonPeriod: { from: "2026-02-01", to: "2026-02-28" },
    numerator: { labelFa: "صورت", value: 1 },
    denominator: { labelFa: "مخرج", value: denominator },
    formulaFa: "صورت ÷ مخرج",
    result: metric(value),
    baseline: { type: "comparison", value: 10, sampleSize: 10 },
    controls: ["Session dedupe"],
    assumptions: ["فرض آزمایشی"],
    limitations: ["محدودیت آزمایشی"],
    dataQuality:
      denominator === 0
        ? [
            {
              severity: "warning",
              code: "TEST_ZERO_DENOMINATOR",
              messageFa: "مخرج صفر است.",
            },
          ]
        : [
            {
              severity: "info",
              code: "TEST_COVERAGE",
              messageFa: "پوشش کافی است.",
            },
          ],
    sampleRows: [
      {
        sessionKey: "S1",
        createdAt: "2026-03-10T10:00:00",
        amountRial: 1000,
        sessionStatus: "Verified",
        tryStatus: "Verified",
        pspCode: "PSP-01",
        payerCardMasked: "کارت-ناشناس-12345678",
      },
    ],
    datasetFingerprint: "abc123",
  }
}

function validArtifact() {
  const records = [
    evidence("customer.returning_share.v1", 50),
    evidence("customer.repeat_pair_rate.v1", 40),
    evidence("customer.repeat_revenue_share.v1", 25),
  ]
  return {
    schemaVersion: "1.0",
    generatedAt: "2026-08-20T00:00:00+00:00",
    dataset: {
      fingerprint: "abc123",
      rowCount: 20,
      sessionCount: 10,
      minCreatedAt: "2026-01-01T00:00:00",
      maxCreatedAt: "2026-03-31T23:59:59",
    },
    feature: "customer-growth",
    merchants: {
      MTEST: {
        selection: {
          merchantKey: "MTEST",
          period: { from: "2026-03-01", to: "2026-03-31" },
          comparison: { from: "2026-02-01", to: "2026-02-28" },
        },
        activeCards: 10,
        newCards: 5,
        returningCards: 5,
        returningSharePct: 50,
        repeatPairPct: 40,
        repeatRevenueSharePct: 25,
        cohorts: [
          { cohort: "2026-01", periodIndex: 0, customers: 10, retentionPct: 100 },
          { cohort: "2026-01", periodIndex: 1, customers: 0, retentionPct: 0 },
        ],
        concentration: [
          { bucket: "کارت اول", customerSharePct: 10, revenueSharePct: 50 },
          { bucket: "سایر", customerSharePct: 90, revenueSharePct: 50 },
        ],
        insights: [
          {
            id: "insight-1",
            feature: "customers",
            priority: 2,
            status: "stable",
            titleFa: "وضعیت پایدار",
            findingFa: "یافته آزمایشی",
            actionFa: "اقدام آزمایشی",
            impact: metric(1),
            confidence: "medium",
            confidenceReasonFa: "دلیل آزمایشی",
            evidenceId: "evidence-customer.returning_share.v1",
            destination: "/customers",
          },
        ],
        evidence: records,
      },
    },
  }
}

function clone(value) {
  return structuredClone(value)
}

function assertInvalid(value) {
  assert.throws(
    () => parseCustomerGrowthArtifact(value),
    (error) =>
      error instanceof CustomerGrowthArtifactError && error.code === "INVALID_SCHEMA",
  )
}

test("accepts a complete artifact contract", () => {
  assert.equal(parseCustomerGrowthArtifact(validArtifact()).schemaVersion, "1.0")
})

test("rejects invalid nested contract fields and enum values", () => {
  const invalidUnit = clone(validArtifact())
  invalidUnit.merchants.MTEST.evidence[0].result.unit = "invalid"
  assertInvalid(invalidUnit)

  const invalidFilter = clone(validArtifact())
  invalidFilter.merchants.MTEST.evidence[0].filters[0].value = []
  assertInvalid(invalidFilter)

  const invalidQuality = clone(validArtifact())
  invalidQuality.merchants.MTEST.evidence[0].dataQuality[0].severity = "error"
  assertInvalid(invalidQuality)

  const invalidSample = clone(validArtifact())
  invalidSample.merchants.MTEST.evidence[0].sampleRows[0].amountRial = Number.NaN
  assertInvalid(invalidSample)

  const invalidSelection = clone(validArtifact())
  invalidSelection.merchants.MTEST.selection.merchantKey = "OTHER"
  assertInvalid(invalidSelection)
})

test("rejects payload/evidence mismatch and unsafe zero denominator", () => {
  const mismatched = clone(validArtifact())
  mismatched.merchants.MTEST.returningSharePct = 49
  assertInvalid(mismatched)

  const unsafeZero = clone(validArtifact())
  const returning = unsafeZero.merchants.MTEST.evidence[0]
  returning.denominator = { labelFa: "مخرج", value: 0 }
  returning.result.value = 0
  assertInvalid(unsafeZero)
})

test("accepts null result with zero-denominator quality note", () => {
  const artifact = clone(validArtifact())
  const merchant = artifact.merchants.MTEST
  merchant.activeCards = 0
  merchant.newCards = 0
  merchant.returningCards = 0
  merchant.returningSharePct = null
  merchant.evidence[0] = evidence("customer.returning_share.v1", null, 0)
  assert.equal(
    parseCustomerGrowthArtifact(artifact).merchants.MTEST.returningSharePct,
    null,
  )
})

test("merchant lookup rejects inherited properties", () => {
  const artifact = validArtifact()
  const inherited = Object.create({ MTEST: artifact.merchants.MTEST })
  const unsafeArtifact = { ...artifact, merchants: inherited }

  assert.throws(
    () => getCustomerGrowthPayload(unsafeArtifact, "MTEST"),
    (error) =>
      error instanceof CustomerGrowthArtifactError && error.code === "MERCHANT_NOT_FOUND",
  )
})

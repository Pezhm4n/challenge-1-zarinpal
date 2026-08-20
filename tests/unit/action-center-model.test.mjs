import assert from "node:assert/strict"
import test from "node:test"

import {
  mergeActionCenterContributions,
  prioritizeInsights,
} from "../../src/features/action-center/model.ts"
import { m275ActionCenterArtifact } from "../../src/mocks/action-center-m275.ts"


const payload = m275ActionCenterArtifact.merchants.M275


function clone(value) {
  return structuredClone(value)
}


test("Insight فاقد Evidence از لیست اولویت‌دار حذف می‌شود", () => {
  const missingEvidenceInsight = {
    ...clone(payload.prioritizedInsights[0]),
    id: "missing-evidence-insight",
    evidenceId: "missing-evidence",
    priority: 1,
  }

  const result = prioritizeInsights(
    [missingEvidenceInsight, ...payload.prioritizedInsights],
    payload.evidenceIndex,
  )

  assert.equal(result.length, 3)
  assert.equal(result.some((insight) => insight.id === missingEvidenceInsight.id), false)
})


test("priority قبل از تمام Tie-breakerها اعمال می‌شود", () => {
  const lowPriority = {
    ...clone(payload.prioritizedInsights[0]),
    id: "priority-one",
    priority: 1,
    confidence: "low",
  }
  const highConfidenceLater = {
    ...clone(payload.prioritizedInsights[1]),
    id: "priority-two",
    priority: 2,
    confidence: "high",
  }

  const result = prioritizeInsights(
    [highConfidenceLater, lowPriority],
    payload.evidenceIndex,
  )

  assert.deepEqual(result.map((insight) => insight.id), ["priority-one", "priority-two"])
})


test("Impactهای هم‌واحد در priority برابر نزولی مرتب می‌شوند", () => {
  const smaller = {
    ...clone(payload.prioritizedInsights[2]),
    id: "rial-smaller",
    priority: 1,
    confidence: "high",
    impact: { ...clone(payload.prioritizedInsights[2].impact), value: 1_000 },
  }
  const larger = {
    ...clone(payload.prioritizedInsights[0]),
    id: "rial-larger",
    priority: 1,
    confidence: "low",
    impact: { ...clone(payload.prioritizedInsights[0].impact), value: 2_000 },
  }

  const result = prioritizeInsights(
    [smaller, larger],
    payload.evidenceIndex,
  )

  assert.deepEqual(result.map((insight) => insight.id), ["rial-larger", "rial-smaller"])
})


test("Impactهای ناهم‌واحد مستقیم مقایسه نمی‌شوند", () => {
  const percentHighConfidence = {
    ...clone(payload.prioritizedInsights[1]),
    id: "percent-high",
    priority: 1,
    confidence: "high",
    impact: { ...clone(payload.prioritizedInsights[1].impact), value: 1 },
  }
  const rialLowConfidence = {
    ...clone(payload.prioritizedInsights[0]),
    id: "rial-low",
    priority: 1,
    confidence: "low",
    impact: { ...clone(payload.prioritizedInsights[0].impact), value: 9_000_000_000 },
  }

  const result = prioritizeInsights(
    [rialLowConfidence, percentHighConfidence],
    payload.evidenceIndex,
  )

  assert.deepEqual(result.map((insight) => insight.id), ["percent-high", "rial-low"])
})


test("پس از Confidence، ID پایدار Tie-breaker نهایی است", () => {
  const second = {
    ...clone(payload.prioritizedInsights[1]),
    id: "b-insight",
    priority: 1,
    impact: null,
    confidence: "medium",
  }
  const first = {
    ...second,
    id: "a-insight",
  }

  const result = prioritizeInsights([second, first], payload.evidenceIndex)

  assert.deepEqual(result.map((insight) => insight.id), ["a-insight", "b-insight"])
})


test("Contributionهای Feature به Payload قراردادی Action Center merge می‌شوند", () => {
  const result = mergeActionCenterContributions({
    datasetFingerprint: m275ActionCenterArtifact.dataset.fingerprint,
    merchant: payload.merchant,
    selection: payload.selection,
    headlineMetrics: payload.headlineMetrics,
    contributions: [
      {
        datasetFingerprint: m275ActionCenterArtifact.dataset.fingerprint,
        insights: payload.prioritizedInsights,
        evidence: Object.values(payload.evidenceIndex),
      },
    ],
  })

  assert.equal(result.success, true)
  if (!result.success) return
  assert.equal(result.data.prioritizedInsights.length, 3)
  assert.equal(Object.keys(result.data.evidenceIndex).length, 5)
})


test("Dataset fingerprint ناسازگار merge را متوقف می‌کند", () => {
  const result = mergeActionCenterContributions({
    datasetFingerprint: m275ActionCenterArtifact.dataset.fingerprint,
    merchant: payload.merchant,
    selection: payload.selection,
    headlineMetrics: payload.headlineMetrics,
    contributions: [
      {
        datasetFingerprint: "different-fingerprint",
        insights: payload.prioritizedInsights,
        evidence: Object.values(payload.evidenceIndex),
      },
    ],
  })

  assert.equal(result.success, false)
  if (result.success) return
  assert.equal(result.error.code, "INVALID_SCHEMA")
})


test("Evidence ID تکراری merge را متوقف می‌کند", () => {
  const evidence = Object.values(payload.evidenceIndex)
  const contribution = {
    datasetFingerprint: m275ActionCenterArtifact.dataset.fingerprint,
    insights: payload.prioritizedInsights,
    evidence,
  }
  const result = mergeActionCenterContributions({
    datasetFingerprint: m275ActionCenterArtifact.dataset.fingerprint,
    merchant: payload.merchant,
    selection: payload.selection,
    headlineMetrics: payload.headlineMetrics,
    contributions: [contribution, contribution],
  })

  assert.equal(result.success, false)
  if (result.success) return
  assert.equal(result.error.code, "INVALID_SCHEMA")
})


test("limit نامعتبر رد می‌شود", () => {
  assert.throws(
    () => prioritizeInsights(payload.prioritizedInsights, payload.evidenceIndex, -1),
    RangeError,
  )
})

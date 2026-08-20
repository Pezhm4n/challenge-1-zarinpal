import assert from "node:assert/strict"
import test from "node:test"

import {
  hasSufficientEvidenceSample,
  inspectEvidenceOperands,
  resolveEvidenceRecord,
} from "../../src/entities/evidence/model.ts"
import { m275ActionCenterArtifact } from "../../src/mocks/action-center-m275.ts"

const evidenceIndex = m275ActionCenterArtifact.merchants.M275.evidenceIndex

test("Evidence ID معتبر به Record قراردادی resolve می‌شود", () => {
  const result = resolveEvidenceRecord(
    evidenceIndex,
    "evidence-m275-sales-delta",
  )

  assert.equal(result.success, true)
  if (!result.success) return
  assert.equal(result.data.formulaId, "growth.revenue_decomposition.v1")
})

test("Evidence ID ناموجود Error امن و فارسی برمی‌گرداند", () => {
  const result = resolveEvidenceRecord(evidenceIndex, "missing-evidence")

  assert.equal(result.success, false)
  if (result.success) return
  assert.equal(result.error.code, "INVALID_SCHEMA")
  assert.equal(result.error.recoverable, false)
  assert.doesNotMatch(result.error.messageFa, /[A-Z]:\\|stack|\.tsx/i)
})

test("نبود Numerator یا Denominator برای Drawer قابل تشخیص است", () => {
  const complete = evidenceIndex["evidence-m275-no-attempt"]
  const missingNumerator = structuredClone(complete)
  delete missingNumerator.numerator
  const missingBoth = structuredClone(complete)
  delete missingBoth.numerator
  delete missingBoth.denominator

  assert.deepEqual(inspectEvidenceOperands(complete), {
    complete: true,
    missing: [],
  })
  assert.deepEqual(inspectEvidenceOperands(missingNumerator), {
    complete: false,
    missing: ["numerator"],
  })
  assert.deepEqual(inspectEvidenceOperands(missingBoth), {
    complete: false,
    missing: ["numerator", "denominator"],
  })
})

test("Sample خالی به‌عنوان نمونه ناکافی تشخیص داده می‌شود", () => {
  const evidence = structuredClone(evidenceIndex["evidence-m275-conversion"])
  evidence.sampleRows = []

  assert.equal(hasSufficientEvidenceSample(evidence), false)
  assert.equal(
    hasSufficientEvidenceSample(evidenceIndex["evidence-m275-conversion"]),
    true,
  )
})

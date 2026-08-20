import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  ConversionRecoveryArtifactError,
  getConversionRecoveryPayload,
  parseConversionRecoveryArtifact,
} from "./conversion-recovery-artifact.ts"


const publicArtifactUrl = new URL(
  "../../../public/analysis/conversion-recovery.json",
  import.meta.url,
)

function publicArtifact() {
  return JSON.parse(readFileSync(publicArtifactUrl, "utf8"))
}

function cloneArtifact() {
  return structuredClone(publicArtifact())
}

test("accepts the committed M275 artifact and nullable low-sample evidence", () => {
  const parsed = parseConversionRecoveryArtifact(publicArtifact())
  const payload = parsed.merchants.M275

  assert.equal(parsed.feature, "conversion-recovery")
  assert.deepEqual(
    payload.funnel.map((stage) => stage.count),
    [3183, 1926, 1835, 1170],
  )
  assert.equal(payload.retry.firstTryNonVerifiedSessions, 786)
  assert.ok(
    payload.evidence.some(
      (record) =>
        record.result === null &&
        record.dataQuality.some((note) => note.code.includes("MIN_SAMPLE")),
    ),
  )
})

test("rejects a non-nested or reordered funnel", () => {
  const reordered = cloneArtifact()
  reordered.merchants.M275.funnel[1].stage = "verified"
  assert.throws(
    () => parseConversionRecoveryArtifact(reordered),
    ConversionRecoveryArtifactError,
  )

  const nonNested = cloneArtifact()
  nonNested.merchants.M275.funnel[2].count = 2000
  assert.throws(
    () => parseConversionRecoveryArtifact(nonNested),
    ConversionRecoveryArtifactError,
  )
})

test("rejects unresolved evidence references", () => {
  const artifact = cloneArtifact()
  artifact.merchants.M275.insights[0].evidenceId = "missing-evidence"

  assert.throws(
    () => parseConversionRecoveryArtifact(artifact),
    ConversionRecoveryArtifactError,
  )
})

test("accepts an explicit insufficient-data payload without scenarios or PSP rows", () => {
  const artifact = cloneArtifact()
  const payload = artifact.merchants.M275

  payload.scenarios = []
  payload.segments = payload.segments.filter((segment) => segment.dimension !== "psp")
  payload.insights[0].status = "insufficient-data"
  payload.insights[0].impact = null

  const parsed = parseConversionRecoveryArtifact(artifact).merchants.M275
  assert.equal(parsed.insights[0].status, "insufficient-data")
  assert.equal(parsed.insights[0].impact, null)
  assert.deepEqual(parsed.scenarios, [])
  assert.ok(parsed.segments.every((segment) => segment.dimension !== "psp"))
})

test("rejects duplicate evidence identifiers", () => {
  const artifact = cloneArtifact()
  artifact.merchants.M275.evidence[1].id = artifact.merchants.M275.evidence[0].id

  assert.throws(
    () => parseConversionRecoveryArtifact(artifact),
    ConversionRecoveryArtifactError,
  )
})

test("rejects a displayed NoAttempt rate that disagrees with its formula", () => {
  const artifact = cloneArtifact()
  artifact.merchants.M275.noAttempt.sharePct = 40

  assert.throws(
    () => parseConversionRecoveryArtifact(artifact),
    ConversionRecoveryArtifactError,
  )
})

test("accepts explicit zero-denominator null semantics", () => {
  const artifact = cloneArtifact()
  const payload = artifact.merchants.M275
  const evidence = payload.evidence.find(
    (record) => record.id === "recovery-M275-retry-rate",
  )

  payload.retry.firstTryNonVerifiedSessions = 0
  payload.retry.recoveredSessions = 0
  payload.retry.recoveryPct = null
  evidence.denominator.value = 0
  evidence.numerator.value = 0
  evidence.result = null
  evidence.dataQuality = [
    {
      severity: "warning",
      code: "ZERO_DENOMINATOR",
      messageFa: "مخرج صفر است.",
    },
  ]

  assert.equal(
    parseConversionRecoveryArtifact(artifact).merchants.M275.retry.recoveryPct,
    null,
  )
})

test("rejects null evidence without an explicit quality warning", () => {
  const artifact = cloneArtifact()
  const evidence = artifact.merchants.M275.evidence.find(
    (record) => record.result === null,
  )
  evidence.dataQuality = []

  assert.throws(
    () => parseConversionRecoveryArtifact(artifact),
    ConversionRecoveryArtifactError,
  )
})

test("rejects a numeric PSP rate below the approved sample threshold", () => {
  const artifact = cloneArtifact()
  const segment = artifact.merchants.M275.segments.find(
    (row) => row.dimension === "psp" && row.quality === "insufficient-data",
  )
  segment.verifyPct = 50

  assert.throws(
    () => parseConversionRecoveryArtifact(artifact),
    ConversionRecoveryArtifactError,
  )
})

test("rejects non-finite values at the JSON boundary", () => {
  const artifact = cloneArtifact()
  artifact.merchants.M275.noAttempt.sharePct = Number.NaN

  assert.throws(
    () => parseConversionRecoveryArtifact(artifact),
    ConversionRecoveryArtifactError,
  )
})

test("returns a typed merchant-not-found error", () => {
  const parsed = parseConversionRecoveryArtifact(publicArtifact())

  assert.throws(
    () => getConversionRecoveryPayload(parsed, "M404"),
    (error) =>
      error instanceof ConversionRecoveryArtifactError &&
      error.code === "MERCHANT_NOT_FOUND" &&
      error.recoverable,
  )
})

import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import { parsePeerOpportunitiesArtifact } from "../../src/features/peer-opportunities/load-peer-opportunities.ts"

async function loadArtifact() {
  return JSON.parse(
    await readFile("public/analysis/peer-opportunities.json", "utf8"),
  )
}

test("Artifact فرصت‌ها پیوند Insightها و Scopeهای مدرک را کامل نگه می‌دارد", async () => {
  assert.notEqual(parsePeerOpportunitiesArtifact(await loadArtifact()), null)
})

test("Artifact با Scope مدرک گمشده رد می‌شود", async () => {
  const artifact = await loadArtifact()
  artifact.merchants.M275.evidence = artifact.merchants.M275.evidence.filter(
    (record) => !record.filters.some((filter) => filter.value === "timing:3:17"),
  )

  assert.equal(parsePeerOpportunitiesArtifact(artifact), null)
})

test("Artifact با Evidence گمشدهٔ Insight رد می‌شود", async () => {
  const artifact = await loadArtifact()
  artifact.merchants.M275.insights[0].evidenceId = "missing-evidence"

  assert.equal(parsePeerOpportunitiesArtifact(artifact), null)
})

test("Artifact با شمار ردیف کمتر از Session رد می‌شود", async () => {
  const artifact = await loadArtifact()
  artifact.dataset.rowCount = artifact.dataset.sessionCount - 1

  assert.equal(parsePeerOpportunitiesArtifact(artifact), null)
})

test("Artifact با مقدار Insight ناسازگار با مدرک رد می‌شود", async () => {
  const artifact = await loadArtifact()
  artifact.merchants.M275.insights[0].impact.value += 1

  assert.equal(parsePeerOpportunitiesArtifact(artifact), null)
})

test("Artifact زمان نمایشی را به‌جای timestamp قراردادی نمی‌پذیرد", async () => {
  const artifact = await loadArtifact()
  artifact.merchants.M275.evidence[0].sampleRows[0].createdAt =
    "۲۰۲۶/۰۶/۰۱، ۰۰:۰۵:۵۴"

  assert.equal(parsePeerOpportunitiesArtifact(artifact), null)
})

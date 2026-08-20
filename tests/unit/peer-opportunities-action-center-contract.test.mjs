import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import { parseActionCenterArtifact } from "../../src/contracts/schema.ts"
import { mergeActionCenterContributions } from "../../src/features/action-center/model.ts"
import { m275ActionCenterArtifact } from "../../src/mocks/action-center-m275.ts"

test("Contribution فرصت‌ها با قرارداد Action Center نهایی ادغام می‌شود", async () => {
  const artifact = JSON.parse(
    await readFile("public/analysis/peer-opportunities.json", "utf8"),
  )
  const payload = artifact.merchants.M275
  const sharedPayload = m275ActionCenterArtifact.merchants.M275
  const merged = mergeActionCenterContributions({
    datasetFingerprint: artifact.dataset.fingerprint,
    merchant: sharedPayload.merchant,
    selection: sharedPayload.selection,
    headlineMetrics: [],
    contributions: [
      {
        datasetFingerprint: artifact.dataset.fingerprint,
        insights: payload.insights,
        evidence: payload.evidence,
      },
    ],
  })

  assert.equal(merged.success, true)
  if (!merged.success) return

  const actionCenterArtifact = {
    schemaVersion: "1.0",
    generatedAt: artifact.generatedAt,
    dataset: artifact.dataset,
    feature: "action-center",
    merchants: { M275: merged.data },
  }

  assert.equal(parseActionCenterArtifact(actionCenterArtifact).success, true)
})

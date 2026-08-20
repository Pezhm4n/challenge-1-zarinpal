import assert from "node:assert/strict"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import { loadActionCenterArtifact } from "../../src/features/action-center/load-artifact.ts"

async function withTemporaryArtifact(run) {
  const directory = await mkdtemp(path.join(tmpdir(), "action-center-loader-"))
  const artifactPath = path.join(directory, "action-center.json")
  try {
    await run(artifactPath)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test("Artifact واقعی موجود قبل از Fixture بارگذاری می‌شود", async () => {
  await withTemporaryArtifact(async (artifactPath) => {
    const artifact = { schemaVersion: "1.0", feature: "action-center" }
    await writeFile(artifactPath, JSON.stringify(artifact), "utf8")

    const result = await loadActionCenterArtifact({
      artifactPath,
      allowDevelopmentFixture: true,
    })

    assert.deepEqual(result, { artifact, source: "artifact" })
  })
})

test("Artifact غایب در Production با Mock پنهان جایگزین نمی‌شود", async () => {
  await withTemporaryArtifact(async (artifactPath) => {
    const result = await loadActionCenterArtifact({
      artifactPath,
      allowDevelopmentFixture: false,
    })

    assert.deepEqual(result, { artifact: undefined, source: "missing" })
  })
})

test("Fixture فقط در حالت صریح Development fallback می‌شود", async () => {
  await withTemporaryArtifact(async (artifactPath) => {
    const developmentFixture = { fixture: "M275" }
    const result = await loadActionCenterArtifact({
      artifactPath,
      allowDevelopmentFixture: true,
      developmentFixture,
    })

    assert.equal(result.source, "development-fixture")
    assert.equal(result.artifact, developmentFixture)
  })
})

test("JSON خراب به Artifact نامعتبر قابل نمایش در UI تبدیل می‌شود", async () => {
  await withTemporaryArtifact(async (artifactPath) => {
    await writeFile(artifactPath, "{not-json", "utf8")

    const result = await loadActionCenterArtifact({
      artifactPath,
      allowDevelopmentFixture: false,
    })

    assert.deepEqual(result, { artifact: {}, source: "invalid" })
  })
})

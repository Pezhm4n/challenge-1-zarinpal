import { readFile } from "node:fs/promises"
import path from "node:path"

export type ActionCenterArtifactSource =
  | "artifact"
  | "development-fixture"
  | "missing"
  | "invalid"

export type LoadedActionCenterArtifact = {
  artifact: unknown
  source: ActionCenterArtifactSource
}

function isNodeError(value: unknown): value is NodeJS.ErrnoException {
  return value instanceof Error && "code" in value
}

export async function loadActionCenterArtifact({
  artifactPath = path.join(
    process.cwd(),
    "public",
    "analysis",
    "action-center.json",
  ),
  allowDevelopmentFixture = process.env.NODE_ENV === "development",
  developmentFixture,
}: {
  artifactPath?: string
  allowDevelopmentFixture?: boolean
  developmentFixture?: unknown
} = {}): Promise<LoadedActionCenterArtifact> {
  try {
    const source = await readFile(
      /* turbopackIgnore: true */ artifactPath,
      "utf8",
    )

    try {
      return { artifact: JSON.parse(source) as unknown, source: "artifact" }
    } catch (error: unknown) {
      if (error instanceof SyntaxError) {
        return { artifact: {}, source: "invalid" }
      }
      throw error
    }
  } catch (error: unknown) {
    if (!isNodeError(error) || error.code !== "ENOENT") throw error

    if (allowDevelopmentFixture && developmentFixture !== undefined) {
      return {
        artifact: developmentFixture,
        source: "development-fixture",
      }
    }

    return { artifact: undefined, source: "missing" }
  }
}

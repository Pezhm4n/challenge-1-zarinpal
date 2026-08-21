import type { ArtifactError, EvidenceRecord } from "@/contracts"

export type EvidenceResolution =
  | { success: true; data: EvidenceRecord }
  | { success: false; error: ArtifactError }

export type EvidenceOperandState = {
  complete: boolean
  missing: Array<"numerator" | "denominator">
}

export function resolveEvidenceRecord(
  evidenceIndex: Readonly<Record<string, EvidenceRecord>>,
  evidenceId: string,
): EvidenceResolution {
  const evidence = evidenceIndex[evidenceId]

  if (!evidence) {
    return {
      success: false,
      error: {
        code: "INVALID_SCHEMA",
        messageFa: "جزئیات محاسبه این عدد پیدا نشد. لطفاً صفحه را دوباره باز کنید.",
        recoverable: false,
      },
    }
  }

  return { success: true, data: evidence }
}

export function inspectEvidenceOperands(
  evidence: EvidenceRecord,
): EvidenceOperandState {
  const missing: EvidenceOperandState["missing"] = []

  if (!evidence.numerator) missing.push("numerator")
  if (!evidence.denominator) missing.push("denominator")

  return { complete: missing.length === 0, missing }
}

export function hasSufficientEvidenceSample(evidence: EvidenceRecord): boolean {
  return evidence.sampleRows.length > 0
}

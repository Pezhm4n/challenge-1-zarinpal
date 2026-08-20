import { readFile } from "node:fs/promises"
import path from "node:path"

import type {
  ArtifactErrorCode,
  ConversionRecoveryArtifact,
  ConversionRecoveryPayload,
  EvidenceRecord,
  FunnelStage,
  MetricValue,
  RecoveryInsight,
  RecoveryScenario,
  RecoverySegment,
} from "./types"


export class ConversionRecoveryArtifactError extends Error {
  readonly code: ArtifactErrorCode
  readonly recoverable: boolean

  constructor(code: ArtifactErrorCode, message: string, recoverable: boolean) {
    super(message)
    this.code = code
    this.recoverable = recoverable
    this.name = "ConversionRecoveryArtifactError"
  }
}

const metricUnits = new Set<MetricValue["unit"]>([
  "rial",
  "percent",
  "count",
  "percentage-point",
  "seconds",
])
const metricKinds = new Set<MetricValue["kind"]>([
  "actual",
  "estimate",
  "benchmark",
])
const evidenceGrains = new Set<EvidenceRecord["grain"]>([
  "attempt",
  "session",
  "merchant-period",
  "merchant-card",
  "peer-group",
])
const stageOrder: FunnelStage["stage"][] = [
  "session",
  "attempted",
  "in-bank",
  "verified",
]
const insightStatuses = new Set<RecoveryInsight["status"]>([
  "opportunity",
  "warning",
  "stable",
  "insufficient-data",
])
const confidenceLevels = new Set<RecoveryInsight["confidence"]>([
  "high",
  "medium",
  "low",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.hasOwn(record, key)
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isInteger(value)
}

function isNullablePercentage(value: unknown): value is number | null {
  return value === null || (isFiniteNumber(value) && value >= 0 && value <= 100)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString)
}

function optional(
  record: Record<string, unknown>,
  key: string,
  predicate: (value: unknown) => boolean,
): boolean {
  return !hasOwn(record, key) || predicate(record[key])
}

function isPeriod(value: unknown): boolean {
  return isRecord(value) && isString(value.from) && isString(value.to)
}

function isSelection(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.merchantKey) &&
    isPeriod(value.period) &&
    optional(value, "comparison", isPeriod)
  )
}

function isMetricValue(value: unknown): value is MetricValue {
  return (
    isRecord(value) &&
    isFiniteNumber(value.value) &&
    isString(value.unit) &&
    metricUnits.has(value.unit as MetricValue["unit"]) &&
    isString(value.labelFa) &&
    isString(value.kind) &&
    metricKinds.has(value.kind as MetricValue["kind"]) &&
    isNonNegativeInteger(value.displayPrecision)
  )
}

function isDataQualityNote(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.severity === "info" || value.severity === "warning") &&
    isString(value.code) &&
    isString(value.messageFa)
  )
}

function isFilter(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.field) &&
    isString(value.operator) &&
    (isString(value.value) ||
      isFiniteNumber(value.value) ||
      typeof value.value === "boolean")
  )
}

function isLabeledNumber(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.labelFa) &&
    isFiniteNumber(value.value)
  )
}

function isBaseline(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.type) &&
    isFiniteNumber(value.value) &&
    isNonNegativeInteger(value.sampleSize)
  )
}

function isEvidenceSample(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.sessionKey) &&
    isString(value.createdAt) &&
    isNonNegativeInteger(value.amountRial) &&
    optional(value, "trySeq", isNonNegativeInteger) &&
    optional(value, "sessionStatus", isString) &&
    optional(value, "tryStatus", isString) &&
    optional(value, "pspCode", (item) => item === null || isString(item)) &&
    optional(
      value,
      "payerCardMasked",
      (item) => item === null || isString(item),
    )
  )
}

function hasQualityWarning(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value.dataQuality) &&
    value.dataQuality.some(
      (note) => isRecord(note) && note.severity === "warning",
    )
  )
}

function hasConsistentNullResult(value: Record<string, unknown>): boolean {
  if (value.result !== null) return true
  return hasQualityWarning(value)
}

function hasConsistentZeroDenominator(value: Record<string, unknown>): boolean {
  if (!isRecord(value.denominator) || value.denominator.value !== 0) {
    return true
  }
  return (
    value.result === null &&
    Array.isArray(value.dataQuality) &&
    value.dataQuality.some(
      (note) =>
        isRecord(note) &&
        note.severity === "warning" &&
        isString(note.code) &&
        note.code.includes("ZERO_DENOMINATOR"),
    )
  )
}

function isEvidence(value: unknown): value is EvidenceRecord {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.formulaId) &&
    isString(value.titleFa) &&
    isString(value.explanationFa) &&
    isString(value.grain) &&
    evidenceGrains.has(value.grain as EvidenceRecord["grain"]) &&
    isStringArray(value.sourceColumns) &&
    Array.isArray(value.filters) &&
    value.filters.every(isFilter) &&
    isPeriod(value.period) &&
    optional(value, "comparisonPeriod", isPeriod) &&
    optional(value, "numerator", isLabeledNumber) &&
    optional(value, "denominator", isLabeledNumber) &&
    isString(value.formulaFa) &&
    (value.result === null || isMetricValue(value.result)) &&
    optional(value, "baseline", isBaseline) &&
    isStringArray(value.controls) &&
    isStringArray(value.assumptions) &&
    isStringArray(value.limitations) &&
    Array.isArray(value.dataQuality) &&
    value.dataQuality.every(isDataQualityNote) &&
    Array.isArray(value.sampleRows) &&
    value.sampleRows.every(isEvidenceSample) &&
    isString(value.datasetFingerprint) &&
    hasConsistentNullResult(value) &&
    hasConsistentZeroDenominator(value)
  )
}

function isEvidenceIds(value: unknown, firstStage: boolean): boolean {
  return (
    isRecord(value) &&
    isString(value.count) &&
    isString(value.amount) &&
    (firstStage ? value.rate === null : isString(value.rate))
  )
}

function isFunnelStage(value: unknown, index: number): value is FunnelStage {
  return (
    isRecord(value) &&
    value.stage === stageOrder[index] &&
    isNonNegativeInteger(value.count) &&
    isNonNegativeInteger(value.amountRial) &&
    isNullablePercentage(value.rateFromPrevious) &&
    isEvidenceIds(value.evidenceIds, index === 0)
  )
}

function percentage(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null
  return Math.round((numerator * 100 * 10_000) / denominator) / 10_000
}

function sameNumber(left: number | null, right: number | null): boolean {
  if (left === null || right === null) return left === right
  return Math.abs(left - right) <= 0.0001
}

function isNestedFunnel(value: FunnelStage[]): boolean {
  if (value.length !== stageOrder.length) return false
  if (value[0].rateFromPrevious !== null) return false

  for (let index = 1; index < value.length; index += 1) {
    const previous = value[index - 1]
    const current = value[index]
    if (
      current.count > previous.count ||
      current.amountRial > previous.amountRial ||
      !sameNumber(
        current.rateFromPrevious,
        percentage(current.count, previous.count),
      )
    ) {
      return false
    }
  }
  return true
}

function isRecoverySegment(value: unknown): value is RecoverySegment {
  if (
    !isRecord(value) ||
    (value.dimension !== "psp" && value.dimension !== "amount-band") ||
    !isString(value.key) ||
    !isNonNegativeInteger(value.sessions) ||
    !isNullablePercentage(value.verifyPct) ||
    !isNullablePercentage(value.peerOrBaselinePct) ||
    (value.quality !== "sufficient" && value.quality !== "insufficient-data") ||
    !isStringArray(value.dataQualityCodes) ||
    !isString(value.evidenceId)
  ) {
    return false
  }
  if (
    value.dimension === "psp" &&
    value.quality === "insufficient-data" &&
    (value.verifyPct !== null || value.peerOrBaselinePct !== null)
  ) {
    return false
  }
  return true
}

function isScenario(value: unknown): value is RecoveryScenario {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.titleFa) &&
    isString(value.lever) &&
    isNullablePercentage(value.baseline) &&
    value.baseline !== null &&
    isNullablePercentage(value.target) &&
    value.target !== null &&
    isNonNegativeInteger(value.estimatedOrders) &&
    isNonNegativeInteger(value.estimatedVolumeRial) &&
    isString(value.confidence) &&
    confidenceLevels.has(value.confidence as RecoveryInsight["confidence"]) &&
    value.isCausalClaim === false &&
    isString(value.evidenceId) &&
    isRecord(value.evidenceIds) &&
    isString(value.evidenceIds.orders) &&
    isString(value.evidenceIds.volume)
  )
}

function isInsight(value: unknown): value is RecoveryInsight {
  return (
    isRecord(value) &&
    isString(value.id) &&
    value.feature === "recovery" &&
    isNonNegativeInteger(value.priority) &&
    value.priority >= 1 &&
    value.priority <= 5 &&
    isString(value.status) &&
    insightStatuses.has(value.status as RecoveryInsight["status"]) &&
    isString(value.titleFa) &&
    isString(value.findingFa) &&
    isString(value.actionFa) &&
    (value.impact === null || isMetricValue(value.impact)) &&
    isString(value.confidence) &&
    confidenceLevels.has(value.confidence as RecoveryInsight["confidence"]) &&
    isString(value.confidenceReasonFa) &&
    isString(value.evidenceId) &&
    value.destination === "/recovery"
  )
}

function referencedEvidenceIds(payload: ConversionRecoveryPayload): string[] {
  return [
    ...payload.funnel.flatMap((stage) => [
      stage.evidenceIds.count,
      stage.evidenceIds.amount,
      ...(stage.evidenceIds.rate ? [stage.evidenceIds.rate] : []),
    ]),
    payload.noAttempt.evidenceIds.sessions,
    payload.noAttempt.evidenceIds.share,
    payload.noAttempt.evidenceIds.amount,
    payload.retry.evidenceIds.eligible,
    payload.retry.evidenceIds.recovered,
    payload.retry.evidenceIds.rate,
    ...payload.segments.map((segment) => segment.evidenceId),
    ...payload.scenarios.flatMap((scenario) => [
      scenario.evidenceId,
      scenario.evidenceIds.orders,
      scenario.evidenceIds.volume,
    ]),
    ...payload.insights.map((insight) => insight.evidenceId),
  ]
}

function evidenceValue(
  evidenceIndex: Map<string, EvidenceRecord>,
  evidenceId: string,
): number | null | undefined {
  return evidenceIndex.get(evidenceId)?.result?.value ??
    (evidenceIndex.get(evidenceId)?.result === null ? null : undefined)
}

function isPayload(value: unknown, fingerprint: string): value is ConversionRecoveryPayload {
  if (
    !isRecord(value) ||
    !isSelection(value.selection) ||
    !Array.isArray(value.funnel) ||
    value.funnel.length !== stageOrder.length ||
    !value.funnel.every((stage, index) => isFunnelStage(stage, index)) ||
    !isNestedFunnel(value.funnel as FunnelStage[]) ||
    !isRecord(value.noAttempt) ||
    !isNonNegativeInteger(value.noAttempt.sessions) ||
    !isNullablePercentage(value.noAttempt.sharePct) ||
    !isNonNegativeInteger(value.noAttempt.requestedAmountRial) ||
    !isRecord(value.noAttempt.evidenceIds) ||
    !isString(value.noAttempt.evidenceIds.sessions) ||
    !isString(value.noAttempt.evidenceIds.share) ||
    !isString(value.noAttempt.evidenceIds.amount) ||
    !isRecord(value.retry) ||
    !isNonNegativeInteger(value.retry.firstTryNonVerifiedSessions) ||
    !isNonNegativeInteger(value.retry.recoveredSessions) ||
    value.retry.recoveredSessions > value.retry.firstTryNonVerifiedSessions ||
    !isNullablePercentage(value.retry.recoveryPct) ||
    !isRecord(value.retry.evidenceIds) ||
    !isString(value.retry.evidenceIds.eligible) ||
    !isString(value.retry.evidenceIds.recovered) ||
    !isString(value.retry.evidenceIds.rate) ||
    !Array.isArray(value.segments) ||
    !value.segments.every(isRecoverySegment) ||
    !Array.isArray(value.scenarios) ||
    !value.scenarios.every(isScenario) ||
    !Array.isArray(value.insights) ||
    !value.insights.every(isInsight) ||
    !Array.isArray(value.evidence) ||
    !value.evidence.every(isEvidence) ||
    !isRecord(value.diagnostics) ||
    !isNonNegativeInteger(value.diagnostics.missingPspAttemptedSessions) ||
    !isNonNegativeInteger(value.diagnostics.reversedSessionsExcludedFromSuccess)
  ) {
    return false
  }

  const payload = value as ConversionRecoveryPayload
  const sessionStage = payload.funnel[0]
  const attemptedStage = payload.funnel[1]
  const evidenceIndex = new Map(payload.evidence.map((record) => [record.id, record]))
  const uniqueEvidenceIds = new Set(evidenceIndex.keys())
  if (
    uniqueEvidenceIds.size !== payload.evidence.length ||
    payload.evidence.some((record) => record.datasetFingerprint !== fingerprint) ||
    referencedEvidenceIds(payload).some((id) => !uniqueEvidenceIds.has(id)) ||
    payload.noAttempt.sessions + attemptedStage.count !== sessionStage.count ||
    payload.noAttempt.requestedAmountRial > sessionStage.amountRial ||
    !sameNumber(
      payload.noAttempt.sharePct,
      percentage(payload.noAttempt.sessions, sessionStage.count),
    ) ||
    !sameNumber(
      payload.retry.recoveryPct,
      percentage(
        payload.retry.recoveredSessions,
        payload.retry.firstTryNonVerifiedSessions,
      ),
    )
  ) {
    return false
  }

  return (
    evidenceValue(evidenceIndex, payload.noAttempt.evidenceIds.share) ===
      payload.noAttempt.sharePct &&
    evidenceValue(evidenceIndex, payload.retry.evidenceIds.rate) ===
      payload.retry.recoveryPct
  )
}

export function parseConversionRecoveryArtifact(
  value: unknown,
): ConversionRecoveryArtifact {
  const validEnvelope =
    isRecord(value) &&
    value.schemaVersion === "1.0" &&
    value.feature === "conversion-recovery" &&
    isString(value.generatedAt) &&
    isRecord(value.dataset) &&
    isString(value.dataset.fingerprint) &&
    isNonNegativeInteger(value.dataset.rowCount) &&
    isNonNegativeInteger(value.dataset.sessionCount) &&
    isString(value.dataset.minCreatedAt) &&
    isString(value.dataset.maxCreatedAt) &&
    isRecord(value.merchants) &&
    Object.keys(value.merchants).length > 0

  if (!validEnvelope) {
    throw new ConversionRecoveryArtifactError(
      "INVALID_SCHEMA",
      "فایل تحلیل بازیابی با قرارداد نسخه ۱ سازگار نیست.",
      false,
    )
  }

  const dataset = value.dataset as Record<string, unknown>
  const merchants = value.merchants as Record<string, unknown>
  const fingerprint = String(dataset.fingerprint)
  const validPayloads = Object.entries(merchants).every(
    ([merchantKey, payload]) =>
      isPayload(payload, fingerprint) &&
      payload.selection.merchantKey === merchantKey,
  )
  if (!validPayloads) {
    throw new ConversionRecoveryArtifactError(
      "INVALID_SCHEMA",
      "اعداد یا مدارک تحلیل بازیابی با قرارداد و فرمول‌های مصوب هماهنگ نیستند.",
      false,
    )
  }

  return value as ConversionRecoveryArtifact
}

export async function loadConversionRecoveryArtifact(): Promise<ConversionRecoveryArtifact> {
  const artifactPath = path.join(
    process.cwd(),
    "public",
    "analysis",
    "conversion-recovery.json",
  )

  let serialized: string
  try {
    serialized = await readFile(artifactPath, "utf8")
  } catch (error: unknown) {
    if (isRecord(error) && error.code === "ENOENT") {
      throw new ConversionRecoveryArtifactError(
        "MISSING_ARTIFACT",
        "فایل تحلیل بازیابی هنوز تولید نشده است.",
        true,
      )
    }
    throw error
  }

  try {
    return parseConversionRecoveryArtifact(JSON.parse(serialized) as unknown)
  } catch (error: unknown) {
    if (error instanceof ConversionRecoveryArtifactError) throw error
    throw new ConversionRecoveryArtifactError(
      "INVALID_SCHEMA",
      "فایل تحلیل بازیابی JSON معتبر نیست.",
      false,
    )
  }
}

export function getConversionRecoveryPayload(
  artifact: ConversionRecoveryArtifact,
  merchantKey: string,
): ConversionRecoveryPayload {
  if (!Object.hasOwn(artifact.merchants, merchantKey)) {
    throw new ConversionRecoveryArtifactError(
      "MERCHANT_NOT_FOUND",
      "برای پذیرنده انتخاب‌شده تحلیل بازیابی موجود نیست.",
      true,
    )
  }
  return artifact.merchants[merchantKey]
}

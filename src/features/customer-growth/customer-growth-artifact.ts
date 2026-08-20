import { readFile } from "node:fs/promises"
import path from "node:path"

import type {
  ArtifactErrorCode,
  CustomerGrowthArtifact,
  CustomerGrowthPayload,
  EvidenceRecord,
  MetricValue,
} from "./types"

export class CustomerGrowthArtifactError extends Error {
  readonly code: ArtifactErrorCode
  readonly recoverable: boolean

  constructor(
    code: ArtifactErrorCode,
    message: string,
    recoverable: boolean,
  ) {
    super(message)
    this.code = code
    this.recoverable = recoverable
    this.name = "CustomerGrowthArtifactError"
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
const insightStatuses = new Set([
  "opportunity",
  "warning",
  "stable",
  "insufficient-data",
])
const confidenceLevels = new Set(["high", "medium", "low"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.hasOwn(record, key)
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || isFiniteNumber(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && isFiniteNumber(value) && value >= 0
}

function isPercentage(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 100
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
    isNullableFiniteNumber(value.value) &&
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
    isFiniteNumber(value.amountRial) &&
    optional(value, "trySeq", isNonNegativeInteger) &&
    optional(value, "sessionStatus", isString) &&
    optional(value, "tryStatus", isString) &&
    optional(value, "pspCode", (item) => item === null || isString(item)) &&
    optional(value, "payerCardMasked", (item) => item === null || isString(item))
  )
}

function hasConsistentZeroDenominator(value: Record<string, unknown>): boolean {
  if (!isRecord(value.denominator) || value.denominator.value !== 0) {
    return true
  }
  if (!isRecord(value.result) || value.result.value !== null) {
    return false
  }
  return (
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
    isMetricValue(value.result) &&
    optional(value, "baseline", isBaseline) &&
    isStringArray(value.controls) &&
    isStringArray(value.assumptions) &&
    isStringArray(value.limitations) &&
    Array.isArray(value.dataQuality) &&
    value.dataQuality.every(isDataQualityNote) &&
    Array.isArray(value.sampleRows) &&
    value.sampleRows.every(isEvidenceSample) &&
    isString(value.datasetFingerprint) &&
    hasConsistentZeroDenominator(value)
  )
}

function isInsight(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.id) &&
    value.feature === "customers" &&
    isNonNegativeInteger(value.priority) &&
    value.priority >= 1 &&
    value.priority <= 5 &&
    isString(value.status) &&
    insightStatuses.has(value.status) &&
    isString(value.titleFa) &&
    isString(value.findingFa) &&
    isString(value.actionFa) &&
    (value.impact === null || isMetricValue(value.impact)) &&
    isString(value.confidence) &&
    confidenceLevels.has(value.confidence) &&
    isString(value.confidenceReasonFa) &&
    isString(value.evidenceId) &&
    isString(value.destination)
  )
}

function isCohortCell(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.cohort) &&
    isNonNegativeInteger(value.periodIndex) &&
    isNonNegativeInteger(value.customers) &&
    isPercentage(value.retentionPct)
  )
}

function isConcentrationBucket(value: unknown): boolean {
  return (
    isRecord(value) &&
    isString(value.bucket) &&
    isPercentage(value.customerSharePct) &&
    isPercentage(value.revenueSharePct)
  )
}

function formulaResult(
  evidence: EvidenceRecord[],
  formulaId: string,
): number | null | undefined {
  return evidence.find((item) => item.formulaId === formulaId)?.result.value
}

function isCustomerPayload(value: unknown): value is CustomerGrowthPayload {
  if (
    !isRecord(value) ||
    !isSelection(value.selection) ||
    !isNonNegativeInteger(value.activeCards) ||
    !isNonNegativeInteger(value.newCards) ||
    !isNonNegativeInteger(value.returningCards) ||
    !isNullableFiniteNumber(value.returningSharePct) ||
    !isNullableFiniteNumber(value.repeatPairPct) ||
    !isNullableFiniteNumber(value.repeatRevenueSharePct) ||
    !Array.isArray(value.cohorts) ||
    !value.cohorts.every(isCohortCell) ||
    !Array.isArray(value.concentration) ||
    !value.concentration.every(isConcentrationBucket) ||
    !Array.isArray(value.insights) ||
    !value.insights.every(isInsight) ||
    !Array.isArray(value.evidence) ||
    !value.evidence.every(isEvidence)
  ) {
    return false
  }

  const evidence = value.evidence as EvidenceRecord[]
  const evidenceIds = new Set(evidence.map((item) => item.id))
  return (
    value.newCards + value.returningCards === value.activeCards &&
    value.insights.every(
      (item) => isRecord(item) && evidenceIds.has(String(item.evidenceId)),
    ) &&
    formulaResult(evidence, "customer.returning_share.v1") === value.returningSharePct &&
    formulaResult(evidence, "customer.repeat_pair_rate.v1") === value.repeatPairPct &&
    formulaResult(evidence, "customer.repeat_revenue_share.v1") ===
      value.repeatRevenueSharePct
  )
}

export function parseCustomerGrowthArtifact(value: unknown): CustomerGrowthArtifact {
  const valid =
    isRecord(value) &&
    value.schemaVersion === "1.0" &&
    value.feature === "customer-growth" &&
    isString(value.generatedAt) &&
    isRecord(value.dataset) &&
    isString(value.dataset.fingerprint) &&
    isNonNegativeInteger(value.dataset.rowCount) &&
    isNonNegativeInteger(value.dataset.sessionCount) &&
    isString(value.dataset.minCreatedAt) &&
    isString(value.dataset.maxCreatedAt) &&
    isRecord(value.merchants) &&
    Object.keys(value.merchants).length > 0 &&
    Object.entries(value.merchants).every(
      ([merchantKey, payload]) =>
        isCustomerPayload(payload) && payload.selection.merchantKey === merchantKey,
    )

  if (!valid) {
    throw new CustomerGrowthArtifactError(
      "INVALID_SCHEMA",
      "فایل تحلیل مشتری با قرارداد نسخه ۱ سازگار نیست.",
      false,
    )
  }

  return value as CustomerGrowthArtifact
}

export async function loadCustomerGrowthArtifact(): Promise<CustomerGrowthArtifact> {
  const artifactPath = path.join(
    process.cwd(),
    "public",
    "analysis",
    "customer-growth.json",
  )

  let serialized: string
  try {
    serialized = await readFile(artifactPath, "utf8")
  } catch (error: unknown) {
    if (isRecord(error) && error.code === "ENOENT") {
      throw new CustomerGrowthArtifactError(
        "MISSING_ARTIFACT",
        "فایل تحلیل مشتری هنوز تولید نشده است.",
        true,
      )
    }
    throw error
  }

  try {
    return parseCustomerGrowthArtifact(JSON.parse(serialized) as unknown)
  } catch (error: unknown) {
    if (error instanceof CustomerGrowthArtifactError) {
      throw error
    }
    throw new CustomerGrowthArtifactError(
      "INVALID_SCHEMA",
      "فایل تحلیل مشتری JSON معتبر نیست.",
      false,
    )
  }
}

export function getCustomerGrowthPayload(
  artifact: CustomerGrowthArtifact,
  merchantKey: string,
): CustomerGrowthPayload {
  if (!Object.hasOwn(artifact.merchants, merchantKey)) {
    throw new CustomerGrowthArtifactError(
      "MERCHANT_NOT_FOUND",
      "برای پذیرنده انتخاب‌شده تحلیل مشتری موجود نیست.",
      true,
    )
  }

  return artifact.merchants[merchantKey]
}

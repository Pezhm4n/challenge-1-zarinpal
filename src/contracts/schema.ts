import type {
  ActionCenterPayload,
  AnalysisArtifact,
  AnalysisSelection,
  ArtifactError,
  DataQualityNote,
  EvidenceRecord,
  EvidenceSampleRow,
  InsightSummary,
  MerchantSummary,
  MetricValue,
} from "./analysis"

type UnknownRecord = Record<string, unknown>

export type ArtifactParseResult =
  | { success: true; data: AnalysisArtifact<ActionCenterPayload> }
  | { success: false; error: ArtifactError }

export type ActionCenterSelectionResult =
  | { success: true; data: ActionCenterPayload }
  | { success: false; error: ArtifactError }

const metricUnits = [
  "rial",
  "percent",
  "count",
  "percentage-point",
  "seconds",
] as const
const metricKinds = ["actual", "estimate", "benchmark"] as const
const insightFeatures = ["recovery", "customers", "peers", "timing", "growth"] as const
const insightStatuses = ["opportunity", "warning", "stable", "insufficient-data"] as const
const confidenceLevels = ["high", "medium", "low"] as const
const evidenceGrains = ["attempt", "session", "merchant-period", "merchant-card", "peer-group"] as const
const coverageQualities = ["sufficient", "limited", "insufficient"] as const

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(record: UnknownRecord, keys: readonly string[]): boolean {
  return Object.keys(record).every((key) => keys.includes(key))
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function isInternalDestination(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`))
  )
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value))
}

function isOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString)
}

function isPeriod(value: unknown): value is { from: string; to: string } {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["from", "to"]) &&
    isIsoDate(value.from) &&
    isIsoDate(value.to) &&
    value.from <= value.to
  )
}

function isMetricValue(value: unknown): value is MetricValue {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["value", "unit", "labelFa", "kind", "displayPrecision"]) ||
    !isFiniteNumber(value.value) ||
    !isOneOf(value.unit, metricUnits) ||
    !isNonEmptyString(value.labelFa) ||
    !isOneOf(value.kind, metricKinds) ||
    !isNonNegativeInteger(value.displayPrecision)
  ) {
    return false
  }

  return value.unit !== "rial" || Number.isInteger(value.value)
}

function isAnalysisSelection(value: unknown): value is AnalysisSelection {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["merchantKey", "period", "comparison"]) &&
    isNonEmptyString(value.merchantKey) &&
    isPeriod(value.period) &&
    (value.comparison === undefined || isPeriod(value.comparison))
  )
}

function isInsightSummary(value: unknown): value is InsightSummary {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "id",
      "feature",
      "priority",
      "status",
      "titleFa",
      "findingFa",
      "actionFa",
      "impact",
      "confidence",
      "confidenceReasonFa",
      "evidenceId",
      "destination",
    ]) &&
    isNonEmptyString(value.id) &&
    isOneOf(value.feature, insightFeatures) &&
    isNonNegativeInteger(value.priority) &&
    value.priority >= 1 &&
    value.priority <= 5 &&
    isOneOf(value.status, insightStatuses) &&
    isNonEmptyString(value.titleFa) &&
    isNonEmptyString(value.findingFa) &&
    isNonEmptyString(value.actionFa) &&
    (value.impact === null || isMetricValue(value.impact)) &&
    isOneOf(value.confidence, confidenceLevels) &&
    isNonEmptyString(value.confidenceReasonFa) &&
    isNonEmptyString(value.evidenceId) &&
    isInternalDestination(value.destination)
  )
}

function isDataQualityNote(value: unknown): value is DataQualityNote {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["severity", "code", "messageFa"]) &&
    isOneOf(value.severity, ["info", "warning"] as const) &&
    isNonEmptyString(value.code) &&
    isNonEmptyString(value.messageFa)
  )
}

function isEvidenceSampleRow(value: unknown): value is EvidenceSampleRow {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "sessionKey",
      "trySeq",
      "createdAt",
      "amountRial",
      "sessionStatus",
      "tryStatus",
      "pspCode",
      "payerCardMasked",
    ]) ||
    !isNonEmptyString(value.sessionKey) ||
    (value.trySeq !== undefined && !isNonNegativeInteger(value.trySeq)) ||
    !isIsoTimestamp(value.createdAt) ||
    !isNonNegativeInteger(value.amountRial) ||
    (value.sessionStatus !== undefined && !isNonEmptyString(value.sessionStatus)) ||
    (value.tryStatus !== undefined && !isNonEmptyString(value.tryStatus)) ||
    (value.pspCode !== undefined && value.pspCode !== null && !isNonEmptyString(value.pspCode)) ||
    (value.payerCardMasked !== undefined &&
      value.payerCardMasked !== null &&
      !isNonEmptyString(value.payerCardMasked))
  ) {
    return false
  }

  return (
    typeof value.payerCardMasked !== "string" ||
    (value.payerCardMasked.includes("*") && !/^\d{12,19}$/.test(value.payerCardMasked))
  )
}

function isLabeledNumber(value: unknown): value is { labelFa: string; value: number } {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["labelFa", "value"]) &&
    isNonEmptyString(value.labelFa) &&
    isFiniteNumber(value.value)
  )
}

function isBaseline(
  value: unknown,
): value is { type: string; value: number; sampleSize: number } {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["type", "value", "sampleSize"]) &&
    isNonEmptyString(value.type) &&
    isFiniteNumber(value.value) &&
    isNonNegativeInteger(value.sampleSize)
  )
}

function isFilter(
  value: unknown,
): value is { field: string; operator: string; value: string | number | boolean } {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["field", "operator", "value"]) ||
    !isNonEmptyString(value.field) ||
    !isNonEmptyString(value.operator)
  ) {
    return false
  }

  return (
    typeof value.value === "string" ||
    typeof value.value === "boolean" ||
    isFiniteNumber(value.value)
  )
}

function isEvidenceRecord(value: unknown): value is EvidenceRecord {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "id",
      "formulaId",
      "titleFa",
      "explanationFa",
      "grain",
      "sourceColumns",
      "filters",
      "period",
      "comparisonPeriod",
      "numerator",
      "denominator",
      "formulaFa",
      "result",
      "baseline",
      "controls",
      "assumptions",
      "limitations",
      "dataQuality",
      "sampleRows",
      "datasetFingerprint",
    ]) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.formulaId) &&
    isNonEmptyString(value.titleFa) &&
    isNonEmptyString(value.explanationFa) &&
    isOneOf(value.grain, evidenceGrains) &&
    isStringArray(value.sourceColumns) &&
    Array.isArray(value.filters) &&
    value.filters.every(isFilter) &&
    isPeriod(value.period) &&
    (value.comparisonPeriod === undefined || isPeriod(value.comparisonPeriod)) &&
    (value.numerator === undefined || isLabeledNumber(value.numerator)) &&
    (value.denominator === undefined || isLabeledNumber(value.denominator)) &&
    isNonEmptyString(value.formulaFa) &&
    isMetricValue(value.result) &&
    (value.baseline === undefined || isBaseline(value.baseline)) &&
    isStringArray(value.controls) &&
    isStringArray(value.assumptions) &&
    isStringArray(value.limitations) &&
    Array.isArray(value.dataQuality) &&
    value.dataQuality.every(isDataQualityNote) &&
    Array.isArray(value.sampleRows) &&
    value.sampleRows.every(isEvidenceSampleRow) &&
    isNonEmptyString(value.datasetFingerprint)
  )
}

function isMerchantSummary(value: unknown): value is MerchantSummary {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "merchantKey",
      "categoryId",
      "categoryTitleFa",
      "availablePeriods",
      "dataCoverage",
    ]) ||
    !isNonEmptyString(value.merchantKey) ||
    !isNonEmptyString(value.categoryId) ||
    !isNonEmptyString(value.categoryTitleFa) ||
    !Array.isArray(value.availablePeriods) ||
    !value.availablePeriods.every(
      (period) =>
        isRecord(period) &&
        hasOnlyKeys(period, ["from", "to", "labelFa"]) &&
        isIsoDate(period.from) &&
        isIsoDate(period.to) &&
        period.from <= period.to &&
        isNonEmptyString(period.labelFa),
    ) ||
    !isRecord(value.dataCoverage) ||
    !hasOnlyKeys(value.dataCoverage, [
      "sessions",
      "verifiedSessions",
      "firstCreatedAt",
      "lastCreatedAt",
      "quality",
    ])
  ) {
    return false
  }

  return (
    isNonNegativeInteger(value.dataCoverage.sessions) &&
    isNonNegativeInteger(value.dataCoverage.verifiedSessions) &&
    value.dataCoverage.verifiedSessions <= value.dataCoverage.sessions &&
    isIsoTimestamp(value.dataCoverage.firstCreatedAt) &&
    isIsoTimestamp(value.dataCoverage.lastCreatedAt) &&
    isOneOf(value.dataCoverage.quality, coverageQualities)
  )
}

function isHeadlineMetric(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["id", "value", "change", "evidenceId"]) &&
    isNonEmptyString(value.id) &&
    isMetricValue(value.value) &&
    (value.change === undefined || isMetricValue(value.change)) &&
    isNonEmptyString(value.evidenceId)
  )
}

function isActionCenterPayload(value: unknown): value is ActionCenterPayload {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "merchant",
      "selection",
      "headlineMetrics",
      "prioritizedInsights",
      "evidenceIndex",
    ]) &&
    isMerchantSummary(value.merchant) &&
    isAnalysisSelection(value.selection) &&
    Array.isArray(value.headlineMetrics) &&
    value.headlineMetrics.every(isHeadlineMetric) &&
    Array.isArray(value.prioritizedInsights) &&
    value.prioritizedInsights.every(isInsightSummary) &&
    isRecord(value.evidenceIndex) &&
    Object.values(value.evidenceIndex).every(isEvidenceRecord)
  )
}

function invalidSchemaError(): ArtifactError {
  return {
    code: "INVALID_SCHEMA",
    messageFa: "داده تحلیل معتبر نیست. نسخه دیگری از گزارش را انتخاب کنید.",
    recoverable: false,
  }
}

function hasValidReferences(
  artifact: AnalysisArtifact<ActionCenterPayload>,
): boolean {
  return Object.entries(artifact.merchants).every(([merchantKey, payload]) => {
    const evidenceIds = new Set(Object.keys(payload.evidenceIndex))
    const insightIds = new Set<string>()

    if (
      payload.merchant.merchantKey !== merchantKey ||
      payload.selection.merchantKey !== merchantKey ||
      !payload.merchant.availablePeriods.some(
        (period) =>
          period.from === payload.selection.period.from &&
          period.to === payload.selection.period.to,
      )
    ) {
      return false
    }

    for (const [evidenceId, evidence] of Object.entries(payload.evidenceIndex)) {
      if (
        evidence.id !== evidenceId ||
        evidence.datasetFingerprint !== artifact.dataset.fingerprint
      ) {
        return false
      }
    }

    for (const metric of payload.headlineMetrics) {
      if (!evidenceIds.has(metric.evidenceId)) {
        return false
      }
    }

    for (const insight of payload.prioritizedInsights) {
      if (insightIds.has(insight.id) || !evidenceIds.has(insight.evidenceId)) {
        return false
      }
      insightIds.add(insight.id)
    }

    return true
  })
}

export function parseActionCenterArtifact(value: unknown): ArtifactParseResult {
  if (value === null || value === undefined) {
    return {
      success: false,
      error: {
        code: "MISSING_ARTIFACT",
        messageFa: "گزارش تحلیل در دسترس نیست. دوباره تلاش کنید.",
        recoverable: true,
      },
    }
  }

  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["schemaVersion", "generatedAt", "dataset", "feature", "merchants"]) ||
    value.schemaVersion !== "1.0" ||
    !isIsoTimestamp(value.generatedAt) ||
    value.feature !== "action-center" ||
    !isRecord(value.dataset) ||
    !hasOnlyKeys(value.dataset, [
      "fingerprint",
      "rowCount",
      "sessionCount",
      "minCreatedAt",
      "maxCreatedAt",
    ]) ||
    !isNonEmptyString(value.dataset.fingerprint) ||
    !isNonNegativeInteger(value.dataset.rowCount) ||
    !isNonNegativeInteger(value.dataset.sessionCount) ||
    value.dataset.sessionCount > value.dataset.rowCount ||
    !isIsoTimestamp(value.dataset.minCreatedAt) ||
    !isIsoTimestamp(value.dataset.maxCreatedAt) ||
    !isRecord(value.merchants) ||
    !Object.values(value.merchants).every(isActionCenterPayload)
  ) {
    return { success: false, error: invalidSchemaError() }
  }

  const artifact = value as AnalysisArtifact<ActionCenterPayload>
  if (!hasValidReferences(artifact)) {
    return { success: false, error: invalidSchemaError() }
  }

  return { success: true, data: artifact }
}

export function resolveActionCenterSelection(
  artifact: AnalysisArtifact<ActionCenterPayload>,
  selection: AnalysisSelection,
): ActionCenterSelectionResult {
  const payload = artifact.merchants[selection.merchantKey]
  if (!payload) {
    return {
      success: false,
      error: {
        code: "MERCHANT_NOT_FOUND",
        messageFa: "برای این پذیرنده گزارشی پیدا نشد. پذیرنده دیگری را انتخاب کنید.",
        recoverable: true,
      },
    }
  }

  const periodExists = payload.merchant.availablePeriods.some(
    (period) =>
      period.from === selection.period.from && period.to === selection.period.to,
  )

  if (
    !periodExists ||
    payload.selection.period.from !== selection.period.from ||
    payload.selection.period.to !== selection.period.to
  ) {
    return {
      success: false,
      error: {
        code: "PERIOD_NOT_FOUND",
        messageFa: "برای این بازه گزارشی آماده نشده است. یکی از بازه‌های موجود را انتخاب کنید.",
        recoverable: true,
      },
    }
  }

  return { success: true, data: payload }
}

export type MetricValue = {
  value: number | null
  unit: "rial" | "percent" | "count" | "percentage-point" | "seconds"
  labelFa: string
  kind: "actual" | "estimate" | "benchmark"
  displayPrecision: number
}

export type DataQualityNote = {
  severity: "info" | "warning"
  code: string
  messageFa: string
}

export type EvidenceSampleRow = {
  sessionKey: string
  createdAt: string
  amountRial: number
  sessionStatus?: string
  tryStatus?: string
  pspCode?: string | null
  payerCardMasked?: string | null
}

export type EvidenceRecord = {
  id: string
  formulaId: string
  titleFa: string
  explanationFa: string
  grain: "attempt" | "session" | "merchant-period" | "merchant-card" | "peer-group"
  sourceColumns: string[]
  filters: Array<{ field: string; operator: string; value: string | number | boolean }>
  period: { from: string; to: string }
  comparisonPeriod?: { from: string; to: string }
  numerator?: { labelFa: string; value: number }
  denominator?: { labelFa: string; value: number }
  formulaFa: string
  result: MetricValue
  baseline?: { type: string; value: number; sampleSize: number }
  controls: string[]
  assumptions: string[]
  limitations: string[]
  dataQuality: DataQualityNote[]
  sampleRows: EvidenceSampleRow[]
  datasetFingerprint: string
}

export type InsightSummary = {
  id: string
  feature: "customers"
  priority: 1 | 2 | 3 | 4 | 5
  status: "opportunity" | "warning" | "stable" | "insufficient-data"
  titleFa: string
  findingFa: string
  actionFa: string
  impact: MetricValue | null
  confidence: "high" | "medium" | "low"
  confidenceReasonFa: string
  evidenceId: string
  destination: string
}

export type CustomerGrowthPayload = {
  selection: {
    merchantKey: string
    period: { from: string; to: string }
    comparison?: { from: string; to: string }
  }
  activeCards: number
  newCards: number
  returningCards: number
  returningSharePct: number | null
  repeatPairPct: number | null
  repeatRevenueSharePct: number | null
  cohorts: Array<{
    cohort: string
    periodIndex: number
    customers: number
    retentionPct: number
  }>
  concentration: Array<{
    bucket: string
    customerSharePct: number
    revenueSharePct: number
  }>
  insights: InsightSummary[]
  evidence: EvidenceRecord[]
}

export type CustomerGrowthArtifact = {
  schemaVersion: "1.0"
  generatedAt: string
  dataset: {
    fingerprint: string
    rowCount: number
    sessionCount: number
    minCreatedAt: string
    maxCreatedAt: string
  }
  feature: "customer-growth"
  merchants: Record<string, CustomerGrowthPayload>
}

export type ArtifactErrorCode =
  | "MISSING_ARTIFACT"
  | "INVALID_SCHEMA"
  | "MERCHANT_NOT_FOUND"
  | "PERIOD_NOT_FOUND"
  | "INSUFFICIENT_DATA"

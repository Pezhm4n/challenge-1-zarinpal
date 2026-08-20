export type AnalysisFeature =
  | "action-center"
  | "conversion-recovery"
  | "customer-growth"
  | "peer-opportunities"

export type InsightFeature =
  | "recovery"
  | "customers"
  | "peers"
  | "timing"
  | "growth"

export type AnalysisArtifact<T> = {
  schemaVersion: "1.0"
  generatedAt: string
  dataset: {
    fingerprint: string
    rowCount: number
    sessionCount: number
    minCreatedAt: string
    maxCreatedAt: string
  }
  feature: AnalysisFeature
  merchants: Record<string, T>
}

export type AnalysisSelection = {
  merchantKey: string
  period: { from: string; to: string }
  comparison?: { from: string; to: string }
}

export type MetricValue = {
  value: number
  unit: "rial" | "percent" | "count" | "percentage-point" | "seconds"
  labelFa: string
  kind: "actual" | "estimate" | "benchmark"
  displayPrecision: number
}

export type InsightSummary = {
  id: string
  feature: InsightFeature
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

export type DataQualityNote = {
  severity: "info" | "warning"
  code: string
  messageFa: string
}

export type EvidenceSampleRow = {
  sessionKey: string
  trySeq?: number
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
  filters: Array<{
    field: string
    operator: string
    value: string | number | boolean
  }>
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

export type MerchantSummary = {
  merchantKey: string
  categoryId: string
  categoryTitleFa: string
  availablePeriods: Array<{ from: string; to: string; labelFa: string }>
  dataCoverage: {
    sessions: number
    verifiedSessions: number
    firstCreatedAt: string
    lastCreatedAt: string
    quality: "sufficient" | "limited" | "insufficient"
  }
}

export type OpportunityScenario = {
  id: string
  titleFa: string
  lever: string
  baseline: number
  target: number
  estimatedOrders: number
  estimatedVolumeRial: number
  confidence: "high" | "medium" | "low"
  isCausalClaim: false
  evidenceId: string
}

export type ConversionRecoveryPayload = {
  selection: AnalysisSelection
  funnel: Array<{
    stage: "session" | "attempted" | "in-bank" | "verified"
    count: number
    amountRial: number
    rateFromPrevious: number | null
  }>
  noAttempt: { sessions: number; sharePct: number; requestedAmountRial: number }
  retry: { retriedSessions: number; recoveredSessions: number; recoveryPct: number }
  segments: Array<{
    dimension: "psp" | "amount-band" | "hour" | "weekday"
    key: string
    sessions: number
    verifyPct: number
    peerOrBaselinePct?: number
  }>
  scenarios: OpportunityScenario[]
  insights: InsightSummary[]
  evidence: EvidenceRecord[]
}

export type CustomerGrowthPayload = {
  selection: AnalysisSelection
  activeCards: number
  newCards: number
  returningCards: number
  returningSharePct: number
  repeatPairPct: number
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

export type PeerOpportunitiesPayload = {
  selection: AnalysisSelection
  decomposition: Array<{
    driver: "traffic" | "conversion" | "ticket"
    current: number
    previous: number
    changePct: number
    contributionRial: number
  }>
  peerBenchmarks: Array<{
    metric: string
    merchantValue: number
    peerMedian: number
    percentile: number
    peerCount: number
    controls: string[]
    sufficient: boolean
  }>
  timeWindows: Array<{
    weekday: number
    hour: number
    sessions: number
    verifyPct: number
    volumeRial: number
    liftVsBaselinePct: number
  }>
  insights: InsightSummary[]
  evidence: EvidenceRecord[]
}

export type ActionCenterPayload = {
  merchant: MerchantSummary
  selection: AnalysisSelection
  headlineMetrics: Array<{
    id: string
    value: MetricValue
    change?: MetricValue
    evidenceId: string
  }>
  prioritizedInsights: InsightSummary[]
  evidenceIndex: Record<string, EvidenceRecord>
}

export type ArtifactError = {
  code:
    | "MISSING_ARTIFACT"
    | "INVALID_SCHEMA"
    | "MERCHANT_NOT_FOUND"
    | "PERIOD_NOT_FOUND"
    | "INSUFFICIENT_DATA"
  messageFa: string
  recoverable: boolean
}

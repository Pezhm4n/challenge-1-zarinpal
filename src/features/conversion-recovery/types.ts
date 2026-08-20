export type ArtifactErrorCode =
  | "MISSING_ARTIFACT"
  | "INVALID_SCHEMA"
  | "MERCHANT_NOT_FOUND"
  | "PERIOD_NOT_FOUND"
  | "INSUFFICIENT_DATA"

export type AnalysisPeriod = { from: string; to: string }

export type AnalysisSelection = {
  merchantKey: string
  period: AnalysisPeriod
  comparison?: AnalysisPeriod
}

export type MetricValue = {
  value: number
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
  period: AnalysisPeriod
  comparisonPeriod?: AnalysisPeriod
  numerator?: { labelFa: string; value: number }
  denominator?: { labelFa: string; value: number }
  formulaFa: string
  result: MetricValue | null
  baseline?: { type: string; value: number; sampleSize: number }
  controls: string[]
  assumptions: string[]
  limitations: string[]
  dataQuality: DataQualityNote[]
  sampleRows: EvidenceSampleRow[]
  datasetFingerprint: string
}

export type EvidenceIds = {
  count: string
  amount: string
  rate: string | null
}

export type FunnelStage = {
  stage: "session" | "attempted" | "in-bank" | "verified"
  count: number
  amountRial: number
  rateFromPrevious: number | null
  evidenceIds: EvidenceIds
}

export type RecoverySegment = {
  dimension: "psp" | "amount-band"
  key: string
  sessions: number
  verifyPct: number | null
  peerOrBaselinePct: number | null
  quality: "sufficient" | "insufficient-data"
  dataQualityCodes: string[]
  evidenceId: string
}

export type RecoveryScenario = {
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
  evidenceIds: { orders: string; volume: string }
}

export type RecoveryInsight = {
  id: string
  feature: "recovery"
  priority: 1 | 2 | 3 | 4 | 5
  status: "opportunity" | "warning" | "stable" | "insufficient-data"
  titleFa: string
  findingFa: string
  actionFa: string
  impact: MetricValue | null
  confidence: "high" | "medium" | "low"
  confidenceReasonFa: string
  evidenceId: string
  destination: "/recovery"
}

export type ConversionRecoveryPayload = {
  selection: AnalysisSelection
  funnel: FunnelStage[]
  noAttempt: {
    sessions: number
    sharePct: number | null
    requestedAmountRial: number
    evidenceIds: { sessions: string; share: string; amount: string }
  }
  retry: {
    firstTryNonVerifiedSessions: number
    recoveredSessions: number
    recoveryPct: number | null
    evidenceIds: { eligible: string; recovered: string; rate: string }
  }
  segments: RecoverySegment[]
  scenarios: RecoveryScenario[]
  insights: RecoveryInsight[]
  evidence: EvidenceRecord[]
  diagnostics: {
    missingPspAttemptedSessions: number
    reversedSessionsExcludedFromSuccess: number
  }
}

export type ConversionRecoveryArtifact = {
  schemaVersion: "1.0"
  generatedAt: string
  dataset: {
    fingerprint: string
    rowCount: number
    sessionCount: number
    minCreatedAt: string
    maxCreatedAt: string
  }
  feature: "conversion-recovery"
  merchants: Record<string, ConversionRecoveryPayload>
}

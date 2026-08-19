# Shared Contracts

این فایل پیش از شروع موازی‌سازی منبع حقیقت Contractهاست. تغییر آن فقط با تأیید Human Lead و هماهنگی چهار Feature Owner مجاز است.

## 1. Artifact Envelope

هر فایل `public/analysis/<feature>.json` این Envelope را دارد:

```ts
type AnalysisArtifact<T> = {
  schemaVersion: "1.0";
  generatedAt: string;              // ISO timestamp
  dataset: {
    fingerprint: string;            // SHA-256 or documented stable digest
    rowCount: number;
    sessionCount: number;
    minCreatedAt: string;
    maxCreatedAt: string;
  };
  feature: "action-center" | "conversion-recovery" | "customer-growth" | "peer-opportunities";
  merchants: Record<string, T>;
};
```

## 2. Shared Selection

```ts
type AnalysisSelection = {
  merchantKey: string;
  period: { from: string; to: string };
  comparison?: { from: string; to: string };
};
```

MVP فقط Periodهای ازپیش‌تولیدشده را می‌پذیرد. UI نباید بازه‌ای را نشان دهد که Artifact آن موجود نیست.

## 3. Insight Summary

```ts
type InsightSummary = {
  id: string;
  feature: "recovery" | "customers" | "peers" | "timing" | "growth";
  priority: 1 | 2 | 3 | 4 | 5;
  status: "opportunity" | "warning" | "stable" | "insufficient-data";
  titleFa: string;
  findingFa: string;
  actionFa: string;
  impact: MetricValue | null;
  confidence: "high" | "medium" | "low";
  confidenceReasonFa: string;
  evidenceId: string;
  destination: string;
};
```

## 4. Metric Value

```ts
type MetricValue = {
  value: number;
  unit: "rial" | "percent" | "count" | "percentage-point" | "seconds";
  labelFa: string;
  kind: "actual" | "estimate" | "benchmark";
  displayPrecision: number;
};
```

Amount در JSON عدد integer ریال است. `estimate` باید در UI Label صریح داشته باشد.

## 5. Evidence Contract

```ts
type EvidenceRecord = {
  id: string;
  formulaId: string;
  titleFa: string;
  explanationFa: string;
  grain: "attempt" | "session" | "merchant-period" | "merchant-card" | "peer-group";
  sourceColumns: string[];
  filters: Array<{ field: string; operator: string; value: string | number | boolean }>;
  period: { from: string; to: string };
  comparisonPeriod?: { from: string; to: string };
  numerator?: { labelFa: string; value: number };
  denominator?: { labelFa: string; value: number };
  formulaFa: string;
  result: MetricValue;
  baseline?: { type: string; value: number; sampleSize: number };
  controls: string[];
  assumptions: string[];
  limitations: string[];
  dataQuality: DataQualityNote[];
  sampleRows: EvidenceSampleRow[];
  datasetFingerprint: string;
};
```

```ts
type DataQualityNote = {
  severity: "info" | "warning";
  code: string;
  messageFa: string;
};

type EvidenceSampleRow = {
  sessionKey: string;
  trySeq?: number;
  createdAt: string;
  amountRial: number;
  sessionStatus?: string;
  tryStatus?: string;
  pspCode?: string | null;
  payerCardMasked?: string | null;
};
```

Card ID کامل در Artifact یا UI ممنوع است.

## 6. Merchant Summary

```ts
type MerchantSummary = {
  merchantKey: string;
  categoryId: string;
  categoryTitleFa: string;
  availablePeriods: Array<{ from: string; to: string; labelFa: string }>;
  dataCoverage: {
    sessions: number;
    verifiedSessions: number;
    firstCreatedAt: string;
    lastCreatedAt: string;
    quality: "sufficient" | "limited" | "insufficient";
  };
};
```

## 7. Feature Payloads

### Conversion Recovery

```ts
type ConversionRecoveryPayload = {
  selection: AnalysisSelection;
  funnel: Array<{
    stage: "session" | "attempted" | "in-bank" | "verified";
    count: number;
    amountRial: number;
    rateFromPrevious: number | null;
  }>;
  noAttempt: { sessions: number; sharePct: number; requestedAmountRial: number };
  retry: { retriedSessions: number; recoveredSessions: number; recoveryPct: number };
  segments: Array<{
    dimension: "psp" | "amount-band" | "hour" | "weekday";
    key: string;
    sessions: number;
    verifyPct: number;
    peerOrBaselinePct?: number;
  }>;
  scenarios: OpportunityScenario[];
  insights: InsightSummary[];
  evidence: EvidenceRecord[];
};
```

### Customer Growth

```ts
type CustomerGrowthPayload = {
  selection: AnalysisSelection;
  activeCards: number;
  newCards: number;
  returningCards: number;
  returningSharePct: number;
  repeatPairPct: number;
  repeatRevenueSharePct: number | null;
  cohorts: Array<{ cohort: string; periodIndex: number; customers: number; retentionPct: number }>;
  concentration: Array<{ bucket: string; customerSharePct: number; revenueSharePct: number }>;
  insights: InsightSummary[];
  evidence: EvidenceRecord[];
};
```

### Peer Opportunities

```ts
type PeerOpportunitiesPayload = {
  selection: AnalysisSelection;
  decomposition: Array<{
    driver: "traffic" | "conversion" | "ticket";
    current: number;
    previous: number;
    changePct: number;
    contributionRial: number;
  }>;
  peerBenchmarks: Array<{
    metric: string;
    merchantValue: number;
    peerMedian: number;
    percentile: number;
    peerCount: number;
    controls: string[];
    sufficient: boolean;
  }>;
  timeWindows: Array<{
    weekday: number;
    hour: number;
    sessions: number;
    verifyPct: number;
    volumeRial: number;
    liftVsBaselinePct: number;
  }>;
  insights: InsightSummary[];
  evidence: EvidenceRecord[];
};
```

### Action Center

```ts
type ActionCenterPayload = {
  merchant: MerchantSummary;
  selection: AnalysisSelection;
  headlineMetrics: Array<{ id: string; value: MetricValue; change?: MetricValue; evidenceId: string }>;
  prioritizedInsights: InsightSummary[];
  evidenceIndex: Record<string, EvidenceRecord>;
};
```

## 8. Opportunity Scenario

```ts
type OpportunityScenario = {
  id: string;
  titleFa: string;
  lever: string;
  baseline: number;
  target: number;
  estimatedOrders: number;
  estimatedVolumeRial: number;
  confidence: "high" | "medium" | "low";
  isCausalClaim: false;
  evidenceId: string;
};
```

## 9. Formula Registry v1

| Formula ID | Grain | Definition |
|---|---|---|
| `session.verify_rate.v1` | session | verified sessions / all sessions |
| `funnel.no_attempt_share.v1` | session | max try_seq = 0 / all sessions |
| `funnel.retry_recovery.v1` | session | first try non-verified and eventual verified / first try non-verified |
| `growth.revenue_decomposition.v1` | merchant-period | volume delta decomposed by traffic, conversion and average ticket using ordered/Shapley-safe method documented in Evidence |
| `scenario.no_attempt_recovery.v1` | merchant-period | excess NoAttempt sessions × attempted conversion × average ticket |
| `customer.repeat_pair_rate.v1` | merchant-card | card pairs with >=2 verified sessions / card pairs |
| `customer.returning_share.v1` | merchant-period | active cards first seen before period / active cards |
| `peer.robust_percentile.v1` | peer-group | percentile among same category after eligibility/sample controls |
| `time.window_lift.v1` | merchant-period | segment rate or volume vs merchant period baseline with minimum sample |

## 10. Guardrails

- Peer benchmark requires at least ۱۰ eligible peers; otherwise `insufficient-data`.
- Merchant must have at least ۱۰۰ sessions for percentile display.
- Time window requires at least ۲۵ sessions per cell.
- Counterfactual target may not exceed conservative baseline chosen in Evidence.
- Zero denominator returns `null` and Data-quality note; never Infinity/NaN.
- Paid/Reversed semantics not guessed; core verified revenue uses `try_status='Verified'` until Human Lead approves another rule.

## 11. Error Shape

Runtime artifact errors are represented locally:

```ts
type ArtifactError = {
  code: "MISSING_ARTIFACT" | "INVALID_SCHEMA" | "MERCHANT_NOT_FOUND" | "PERIOD_NOT_FOUND" | "INSUFFICIENT_DATA";
  messageFa: string;
  recoverable: boolean;
};
```

No raw stack trace or filesystem path is shown to the user.

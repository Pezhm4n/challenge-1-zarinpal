import { readFile } from "node:fs/promises";
import path from "node:path";

import type {
  DecompositionItem,
  EvidenceRecord,
  InsightSummary,
  LoadPeerOpportunitiesResult,
  PeerBenchmark,
  PeerOpportunitiesArtifact,
  PeerOpportunitiesPayload,
  TimeWindow,
} from "./types";

const artifactPath = path.join(
  process.cwd(),
  "public",
  "analysis",
  "peer-opportunities.json",
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPeriod(value: unknown): value is { from: string; to: string } {
  return (
    isRecord(value) &&
    typeof value.from === "string" &&
    typeof value.to === "string"
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isInternalDestination(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  );
}

function isDecompositionItem(value: unknown): value is DecompositionItem {
  return (
    isRecord(value) &&
    ["traffic", "conversion", "ticket"].includes(String(value.driver)) &&
    isFiniteNumber(value.current) &&
    isFiniteNumber(value.previous) &&
    isFiniteNumber(value.changePct) &&
    Number.isInteger(value.contributionRial)
  );
}

function isPeerBenchmark(value: unknown): value is PeerBenchmark {
  return (
    isRecord(value) &&
    typeof value.metric === "string" &&
    isFiniteNumber(value.merchantValue) &&
    isFiniteNumber(value.peerMedian) &&
    isFiniteNumber(value.percentile) &&
    Number.isInteger(value.peerCount) &&
    Array.isArray(value.controls) &&
    value.controls.every((control) => typeof control === "string") &&
    typeof value.sufficient === "boolean"
  );
}

function isTimeWindow(value: unknown): value is TimeWindow {
  return (
    isRecord(value) &&
    Number.isInteger(value.weekday) &&
    Number.isInteger(value.hour) &&
    Number.isInteger(value.sessions) &&
    isFiniteNumber(value.verifyPct) &&
    Number.isInteger(value.volumeRial) &&
    isFiniteNumber(value.liftVsBaselinePct)
  );
}

function isInsight(value: unknown): value is InsightSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    ["recovery", "customers", "peers", "timing", "growth"].includes(
      String(value.feature),
    ) &&
    Number.isInteger(value.priority) &&
    Number(value.priority) >= 1 &&
    Number(value.priority) <= 5 &&
    ["opportunity", "warning", "stable", "insufficient-data"].includes(
      String(value.status),
    ) &&
    typeof value.titleFa === "string" &&
    typeof value.findingFa === "string" &&
    typeof value.actionFa === "string" &&
    (value.impact === null || isMetricValue(value.impact)) &&
    ["high", "medium", "low"].includes(String(value.confidence)) &&
    typeof value.confidenceReasonFa === "string" &&
    typeof value.evidenceId === "string" &&
    isInternalDestination(value.destination)
  );
}

function isEvidence(value: unknown): value is EvidenceRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.formulaId === "string" &&
    typeof value.titleFa === "string" &&
    typeof value.explanationFa === "string" &&
    ["attempt", "session", "merchant-period", "merchant-card", "peer-group"].includes(
      String(value.grain),
    ) &&
    isStringArray(value.sourceColumns) &&
    Array.isArray(value.filters) &&
    value.filters.every(
      (filter) =>
        isRecord(filter) &&
        typeof filter.field === "string" &&
        typeof filter.operator === "string" &&
        (["string", "number", "boolean"].includes(typeof filter.value)) &&
        (typeof filter.value !== "number" || isFiniteNumber(filter.value)),
    ) &&
    isPeriod(value.period) &&
    (value.comparisonPeriod === undefined || isPeriod(value.comparisonPeriod)) &&
    (value.numerator === undefined || isEvidenceOperand(value.numerator)) &&
    (value.denominator === undefined || isEvidenceOperand(value.denominator)) &&
    typeof value.formulaFa === "string" &&
    isMetricValue(value.result) &&
    (value.baseline === undefined || isEvidenceBaseline(value.baseline)) &&
    isStringArray(value.controls) &&
    isStringArray(value.assumptions) &&
    isStringArray(value.limitations) &&
    Array.isArray(value.dataQuality) &&
    value.dataQuality.every(
      (note) =>
        isRecord(note) &&
        ["info", "warning"].includes(String(note.severity)) &&
        typeof note.code === "string" &&
        typeof note.messageFa === "string",
    ) &&
    Array.isArray(value.sampleRows) &&
    value.sampleRows.every(isEvidenceSampleRow) &&
    typeof value.datasetFingerprint === "string"
  );
}

function isEvidenceOperand(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.labelFa === "string" &&
    isFiniteNumber(value.value)
  );
}

function isEvidenceBaseline(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    isFiniteNumber(value.value) &&
    typeof value.sampleSize === "number" &&
    Number.isInteger(value.sampleSize) &&
    value.sampleSize >= 0
  );
}

function isMetricValue(value: unknown): boolean {
  return (
    isRecord(value) &&
    isFiniteNumber(value.value) &&
    ["rial", "percent", "count", "percentage-point", "seconds"].includes(
      String(value.unit),
    ) &&
    typeof value.labelFa === "string" &&
    ["actual", "estimate", "benchmark"].includes(String(value.kind)) &&
    typeof value.displayPrecision === "number" &&
    Number.isInteger(value.displayPrecision) &&
    value.displayPrecision >= 0
  );
}

function isEvidenceSampleRow(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.sessionKey === "string" &&
    (value.trySeq === undefined || Number.isInteger(value.trySeq)) &&
    isIsoTimestamp(value.createdAt) &&
    isFiniteNumber(value.amountRial) &&
    (value.sessionStatus === undefined || typeof value.sessionStatus === "string") &&
    (value.tryStatus === undefined || typeof value.tryStatus === "string") &&
    (value.pspCode === undefined ||
      value.pspCode === null ||
      typeof value.pspCode === "string") &&
    (value.payerCardMasked === undefined ||
      value.payerCardMasked === null ||
      typeof value.payerCardMasked === "string")
  );
}

function hasCompleteEvidenceReferences(payload: PeerOpportunitiesPayload): boolean {
  const evidenceIds = new Set<string>();
  const evidenceById = new Map<string, EvidenceRecord>();
  const evidenceScopes = new Set<string>();

  for (const record of payload.evidence) {
    if (evidenceIds.has(record.id)) {
      return false;
    }
    evidenceIds.add(record.id);
    evidenceById.set(record.id, record);

    const scope = record.filters.find(
      (filter) => filter.field === "evidence_scope",
    )?.value;
    if (typeof scope === "string") {
      if (evidenceScopes.has(scope)) {
        return false;
      }
      evidenceScopes.add(scope);
    }
  }

  const requiredScopes = [
    ...payload.decomposition.map((item) => `growth:${item.driver}`),
    ...payload.peerBenchmarks.map((item) => `peer:${item.metric}`),
    ...payload.timeWindows.map((item) => `timing:${item.weekday}:${item.hour}`),
  ];

  return (
    payload.insights.every((insight) => {
      const evidence = evidenceById.get(insight.evidenceId);
      return (
        evidence !== undefined &&
        evidence.result !== null &&
        (insight.impact === null ||
          (insight.impact.value === evidence.result.value &&
            insight.impact.unit === evidence.result.unit &&
            insight.impact.labelFa === evidence.result.labelFa &&
            insight.impact.kind === evidence.result.kind &&
            insight.impact.displayPrecision === evidence.result.displayPrecision))
      );
    }) &&
    requiredScopes.every((scope) => evidenceScopes.has(scope))
  );
}

function isPayload(value: unknown): value is PeerOpportunitiesPayload {
  if (!isRecord(value) || !isRecord(value.selection)) {
    return false;
  }
  const comparison = value.selection.comparison;
  return (
    typeof value.selection.merchantKey === "string" &&
    isPeriod(value.selection.period) &&
    (comparison === undefined || isPeriod(comparison)) &&
    Array.isArray(value.decomposition) &&
    value.decomposition.every(isDecompositionItem) &&
    Array.isArray(value.peerBenchmarks) &&
    value.peerBenchmarks.every(isPeerBenchmark) &&
    Array.isArray(value.timeWindows) &&
    value.timeWindows.every(isTimeWindow) &&
    Array.isArray(value.insights) &&
    value.insights.every(isInsight) &&
    Array.isArray(value.evidence) &&
    value.evidence.every(isEvidence) &&
    hasCompleteEvidenceReferences(value as PeerOpportunitiesPayload)
  );
}

export function parsePeerOpportunitiesArtifact(
  value: unknown,
): PeerOpportunitiesArtifact | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== "1.0" ||
    value.feature !== "peer-opportunities" ||
    !isIsoTimestamp(value.generatedAt) ||
    !isRecord(value.dataset) ||
    typeof value.dataset.fingerprint !== "string" ||
    !Number.isInteger(value.dataset.rowCount) ||
    !Number.isInteger(value.dataset.sessionCount) ||
    Number(value.dataset.rowCount) < Number(value.dataset.sessionCount) ||
    !isIsoTimestamp(value.dataset.minCreatedAt) ||
    !isIsoTimestamp(value.dataset.maxCreatedAt) ||
    !isRecord(value.merchants)
  ) {
    return null;
  }
  const datasetFingerprint = value.dataset.fingerprint;
  const merchantEntries = Object.entries(value.merchants);
  if (
    merchantEntries.length === 0 ||
    merchantEntries.some(
      ([merchantKey, payload]) =>
        !isPayload(payload) ||
        payload.selection.merchantKey !== merchantKey ||
        payload.evidence.some(
          (record) => record.datasetFingerprint !== datasetFingerprint,
        ),
    )
  ) {
    return null;
  }
  return value as PeerOpportunitiesArtifact;
}

export async function loadPeerOpportunities(
  requestedMerchant = "M275",
): Promise<LoadPeerOpportunitiesResult> {
  let raw: string;
  try {
    raw = await readFile(artifactPath, "utf8");
  } catch {
    return {
      status: "error",
      error: {
        code: "MISSING_ARTIFACT",
        messageFa: "فایل تحلیل فرصت‌ها هنوز تولید نشده است.",
        recoverable: true,
      },
    };
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(raw) as unknown;
  } catch {
    return {
      status: "error",
      error: {
        code: "INVALID_SCHEMA",
        messageFa: "فایل تحلیل قابل خواندن نیست.",
        recoverable: false,
      },
    };
  }
  const artifact = parsePeerOpportunitiesArtifact(decoded);
  if (!artifact) {
    return {
      status: "error",
      error: {
        code: "INVALID_SCHEMA",
        messageFa: "ساختار فایل تحلیل با قرارداد Feature سازگار نیست.",
        recoverable: false,
      },
    };
  }
  const payload = artifact.merchants[requestedMerchant];
  if (!payload) {
    return {
      status: "error",
      error: {
        code: "MERCHANT_NOT_FOUND",
        messageFa: "برای این پذیرنده تحلیل فرصت موجود نیست.",
        recoverable: true,
      },
    };
  }
  return {
    status: "ready",
    artifact,
    merchantKey: requestedMerchant,
    payload,
  };
}

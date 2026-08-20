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

function isPeriod(value: unknown): value is { from: string; to: string } {
  return (
    isRecord(value) &&
    typeof value.from === "string" &&
    typeof value.to === "string"
  );
}

function isDecompositionItem(value: unknown): value is DecompositionItem {
  return (
    isRecord(value) &&
    ["traffic", "conversion", "ticket"].includes(String(value.driver)) &&
    isFiniteNumber(value.current) &&
    isFiniteNumber(value.previous) &&
    (value.changePct === null || isFiniteNumber(value.changePct)) &&
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
    ["opportunity", "warning", "stable", "insufficient-data"].includes(
      String(value.status),
    ) &&
    typeof value.titleFa === "string" &&
    typeof value.findingFa === "string" &&
    typeof value.actionFa === "string" &&
    ["high", "medium", "low"].includes(String(value.confidence)) &&
    typeof value.confidenceReasonFa === "string" &&
    typeof value.evidenceId === "string" &&
    typeof value.destination === "string"
  );
}

function isEvidence(value: unknown): value is EvidenceRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.formulaId === "string" &&
    typeof value.titleFa === "string" &&
    typeof value.explanationFa === "string" &&
    Array.isArray(value.controls) &&
    value.controls.every((control) => typeof control === "string") &&
    Array.isArray(value.limitations) &&
    value.limitations.every((limitation) => typeof limitation === "string") &&
    Array.isArray(value.dataQuality)
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
    value.evidence.every(isEvidence)
  );
}

function parseArtifact(value: unknown): PeerOpportunitiesArtifact | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== "1.0" ||
    value.feature !== "peer-opportunities" ||
    typeof value.generatedAt !== "string" ||
    !isRecord(value.dataset) ||
    typeof value.dataset.fingerprint !== "string" ||
    !Number.isInteger(value.dataset.rowCount) ||
    !Number.isInteger(value.dataset.sessionCount) ||
    typeof value.dataset.minCreatedAt !== "string" ||
    typeof value.dataset.maxCreatedAt !== "string" ||
    !isRecord(value.merchants)
  ) {
    return null;
  }
  const merchantEntries = Object.entries(value.merchants);
  if (
    merchantEntries.length === 0 ||
    merchantEntries.some(([, payload]) => !isPayload(payload))
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
  const artifact = parseArtifact(decoded);
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

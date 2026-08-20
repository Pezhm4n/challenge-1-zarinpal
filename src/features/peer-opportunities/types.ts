export type Driver = "traffic" | "conversion" | "ticket";

export type DecompositionItem = {
  driver: Driver;
  current: number;
  previous: number;
  changePct: number;
  contributionRial: number;
};

export type PeerBenchmark = {
  metric: string;
  merchantValue: number;
  peerMedian: number;
  percentile: number;
  peerCount: number;
  controls: string[];
  sufficient: boolean;
};

export type TimeWindow = {
  weekday: number;
  hour: number;
  sessions: number;
  verifyPct: number;
  volumeRial: number;
  liftVsBaselinePct: number;
};

export type EvidenceReference = {
  id: string;
  baseline?: number;
};

export type InsightSummary = {
  id: string;
  feature: "recovery" | "customers" | "peers" | "timing" | "growth";
  priority: 1 | 2 | 3 | 4 | 5;
  status: "opportunity" | "warning" | "stable" | "insufficient-data";
  titleFa: string;
  findingFa: string;
  actionFa: string;
  confidence: "high" | "medium" | "low";
  confidenceReasonFa: string;
  evidenceId: string;
  destination: string;
};

export type EvidenceRecord = SharedEvidenceRecord;

export type PeerOpportunitiesPayload = {
  selection: {
    merchantKey: string;
    period: { from: string; to: string };
    comparison?: { from: string; to: string };
  };
  decomposition: DecompositionItem[];
  peerBenchmarks: PeerBenchmark[];
  timeWindows: TimeWindow[];
  insights: InsightSummary[];
  evidence: EvidenceRecord[];
};

export type PeerOpportunitiesArtifact = {
  schemaVersion: "1.0";
  generatedAt: string;
  dataset: {
    fingerprint: string;
    rowCount: number;
    sessionCount: number;
    minCreatedAt: string;
    maxCreatedAt: string;
  };
  feature: "peer-opportunities";
  merchants: Record<string, PeerOpportunitiesPayload>;
};

export type ArtifactError = {
  code:
    | "MISSING_ARTIFACT"
    | "INVALID_SCHEMA"
    | "MERCHANT_NOT_FOUND"
    | "PERIOD_NOT_FOUND"
    | "INSUFFICIENT_DATA";
  messageFa: string;
  recoverable: boolean;
};

export type LoadPeerOpportunitiesResult =
  | {
      status: "ready";
      artifact: PeerOpportunitiesArtifact;
      merchantKey: string;
      payload: PeerOpportunitiesPayload;
    }
  | { status: "error"; error: ArtifactError };
import type { EvidenceRecord as SharedEvidenceRecord } from "@/contracts";

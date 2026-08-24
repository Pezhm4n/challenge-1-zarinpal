import { readFileSync } from "node:fs";

const root = "I:/Computer/dev/Hackathon/challenge-1-zarinpal/public/analysis/";
const g = JSON.parse(readFileSync(root + "customer-growth.json", "utf8"));
const m = g.merchants.M275;
console.log("== concentration ==");
console.log(JSON.stringify(m.concentration, null, 1));
console.log("== selection ==");
console.log(JSON.stringify(m.selection, null, 1));
console.log("== insights ==");
for (const i of m.insights) {
  console.log(JSON.stringify({
    id: i.id, title: i.titleFa,
    finding: (i.findingFa ?? "").slice(0, 140),
    severity: i.severity, status: i.status,
    evidence: i.evidenceId, metric: i.metric,
  }));
}
const p = JSON.parse(readFileSync(root + "peer-opportunities.json", "utf8"));
const pm = p.merchants.M275;
console.log("== peer keys ==", Object.keys(pm));
console.log("== timeWindows count ==", pm.timeWindows.length);
console.log(JSON.stringify(pm.timeWindows, null, 1));
console.log("== benchmarks ==");
console.log(JSON.stringify(pm.peerBenchmarks, null, 1));
const r = JSON.parse(readFileSync(root + "conversion-recovery.json", "utf8"));
const rm = r.merchants.M275;
const psp = rm.segments.filter((s) => s.dimension === "psp");
console.log("== recovery psp segments ==");
console.log(JSON.stringify(psp.map((s) => ({ key: s.key, sessions: s.sessions, verified: s.verifiedSessions, verifyPct: s.verifyPct, baseline: s.peerOrBaselinePct })), null, 1));
const bands = rm.segments.filter((s) => s.dimension === "amount-band");
console.log("== recovery amount-band segments ==");
console.log(JSON.stringify(bands.map((s) => ({ key: s.key, sessions: s.sessions, verifyPct: s.verifyPct })), null, 1));

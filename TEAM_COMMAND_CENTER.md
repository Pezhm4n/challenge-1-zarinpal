# Team Command Center

```text
PROBLEM:
پذیرنده داده دارد اما نمی‌داند کدام اهرم رشد را با چه اثر و مدرکی پیگیری کند.

CORE USER:
پذیرنده غیرتکنیکال زرین‌پال.

CORE VALUE:
سه اقدام اولویت‌دار با اثر ریالی، Confidence و Evidence قابل بازکردن.

GOLDEN JOURNEY:
1. انتخاب M275 و May→June
2. مشاهده افت Conversion با وجود رشد Session
3. تشخیص NoAttempt به‌عنوان Driver غالب و 4.9b ریال potential
4. بازکردن Evidence و دریافت اقدام بعدی

MUST HAVE:
- Action Center
- Conversion Rescue
- Customer Growth
- Peer/Growth decomposition
- Evidence Drawer
- Mobile + Desktop

LATER:
- LLM explanation، export، holiday/forecast

OUT OF SCOPE:
- Auth/DB realtime، BI builder، chatbot عمومی، deploy توسط Agent

MEMBER A — Claude Code:
Feature: Action Center + Evidence
Goal: داستان واحد، UX، traceability
Dependencies: stable contract؛ payloadها قابل Mock

MEMBER B — Codex #1:
Feature: Conversion Rescue
Goal: NoAttempt root cause + recovery scenario
Dependencies: session grain؛ Evidence UI قابل Mock

MEMBER C — Antigravity:
Feature: Customer Growth
Goal: new/returning/cohort + retention action
Dependencies: verified-card definition؛ Evidence UI قابل Mock

MEMBER D — Codex #2:
Feature: Peer Opportunities
Goal: decomposition + controlled benchmark + time windows
Dependencies: session grain؛ Evidence UI قابل Mock

ARCHITECTURE:
CSV ignored → Python/DuckDB offline → small JSON evidence bundles → Next.js RTL static runtime

CONTRACTS:
ArtifactEnvelope، InsightSummary، EvidenceRecord، Feature Payloads؛ تغییر approval-gated

TOP RISKS:
Attempt/session double count؛ chart-first UX؛ time overrun؛ misleading counterfactual

CURRENT PHASE:
Repository Readiness complete; Implementation not started.

NEXT ACTION:
Human Lead branches/worktrees را بسازد و هر Feature Spec را به Owner تحویل دهد.
```

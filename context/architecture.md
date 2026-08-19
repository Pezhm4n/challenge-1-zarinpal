# Architecture — نبض زرین

## 1. Goals

- چهار Feature Owner بدون انتظار برای Data pipeline مشترک شروع کنند.
- تمام Insightها deterministic، testable و traceable باشند.
- Judge بدون CSV خام نسخه Demo را سریع اجرا کند.
- Mobile/Desktop و RTL از ابتدا جزو معماری باشند.
- تغییرات Featureها از طریق Folder ownership جدا بماند.

## 2. System View

```text
Ignored raw CSV (495 MB)
        ↓
Python + DuckDB offline analytics
        ↓
Feature-owned deterministic JSON bundles + Evidence packs
        ↓
public/analysis/*.json
        ↓
Next.js App Router / TypeScript contracts
        ↓
Action Center + 3 analytical routes + shared Evidence Drawer
```

Runtime هیچ Query مستقیم روی CSV، DuckDB server، Database یا LLM ندارد.

## 3. Stack

| Layer | Choice | Reason |
|---|---|---|
| Web | Next.js 16 App Router + React 19 | Build/run ساده و Deploy پذیرفته‌شده |
| Types | TypeScript Strict | کاهش خطا در Contractها |
| Styling | Tailwind 4 + shadcn Base Nova | Composition سریع و UI منسجم |
| Analytics | Python 3.10+ + DuckDB | اسکن کامل CSV و SQL تحلیلی سریع |
| Runtime data | Static JSON bundles | عدم نیاز به CSV بزرگ یا Backend پیچیده |
| Validation | Schema validation at JSON boundary | Fail fast روی Artifact ناسازگار |
| Tests | Unit formula tests + browser smoke/e2e | معیار صحت و Demo |

## 4. Canonical Folder Architecture

```text
challenge-1-zarinpal/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── contracts.md
├── team-plan.md
├── risk-register.md
├── submission-plan.md
├── components.json
├── requirements-analytics.txt
├── context/
│   ├── project-overview.md
│   ├── dataset-profile.md
│   ├── architecture.md
│   ├── code-standards.md
│   ├── ai-workflow-rules.md
│   ├── ui-context.md
│   └── progress-tracker.example.md
├── feature-specs/
│   ├── member-a.md
│   ├── member-b.md
│   ├── member-c.md
│   └── member-d.md
├── data/
│   ├── raw/                 # ignored: challenge_data.csv
│   ├── fixtures/            # tiny hand-checkable test fixtures
│   └── derived/             # ignored intermediate artifacts
├── analytics/
│   ├── common/              # loader, session grain, fingerprint, formula registry
│   ├── action_center/
│   ├── conversion_recovery/
│   ├── customer_growth/
│   ├── peer_opportunities/
│   └── tests/
├── public/
│   └── analysis/            # small deployable JSON bundles
├── src/
│   ├── app/                 # route composition only
│   ├── components/
│   │   ├── ui/              # shadcn source
│   │   └── layout/          # shared shell owned by A
│   ├── contracts/           # TS form of contracts.md; shared/approval-gated
│   ├── entities/
│   │   ├── insight/
│   │   ├── evidence/
│   │   └── merchant/
│   ├── features/
│   │   ├── action-center/
│   │   ├── conversion-recovery/
│   │   ├── customer-growth/
│   │   └── peer-opportunities/
│   ├── lib/
│   └── mocks/               # shared contract fixtures for parallel start
└── tests/
    ├── unit/
    └── e2e/
```

این ساختار قطعی است. تغییر root architecture فقط با تأیید Human Lead.

## 5. Routes

| Route | Owner | Purpose |
|---|---|---|
| `/` | A | Action Center، merchant/date selector، prioritized insights، Evidence Drawer |
| `/recovery` | B | Funnel، NoAttempt، retry، PSP/amount segments، recovery estimate |
| `/customers` | C | New/returning، repeat، cohort، concentration، retention action |
| `/opportunities` | D | Growth decomposition، peer benchmark، timing windows |

Routeها فقط Feature component را Compose می‌کنند. منطق داخل `src/app` ممنوع است.

## 6. Parallel Contract Strategy

- A در اولین Checkpoint قراردادهای TS و Mock fixture مشترک را تثبیت می‌کند.
- B/C/D هم‌زمان با Mockهای Contract کار می‌کنند و Analytics خود را در Folder خود می‌نویسند.
- هر Feature یک JSON مستقل تولید می‌کند؛ Action Center فقط آرایه `InsightSummary` آن‌ها را ترکیب می‌کند.
- Featureها حق Import مستقیم از Folder یکدیگر ندارند.

## 7. Data Model

### Raw Attempt

ردیف CSV با `session_key + try_seq`.

### Normalized Session

یک رکورد برای هر `session_key` شامل merchant/category/amount، first state، attempt count، eventual status، timestamps و fields قابل اتکا.

### Analytical Aggregates

- MerchantPeriodMetrics
- FunnelSegment
- CustomerCohort/RepeatSegment
- PeerBenchmark
- TimeWindow
- Insight + Evidence

Shape دقیق در `contracts.md` است.

## 8. Formula Registry

هر Formula یک ID پایدار دارد؛ نمونه:

- `session.verify_rate.v1`
- `funnel.no_attempt_share.v1`
- `growth.revenue_decomposition.v1`
- `scenario.no_attempt_recovery.v1`
- `customer.repeat_pair_rate.v1`
- `peer.robust_percentile.v1`

Pipeline و UI فقط به Formula ID متکی‌اند؛ توضیح Formula در Evidence pack قرار می‌گیرد.

## 9. M275 Scenario Formula

```text
gap_sessions = June sessions × (June NoAttempt share − May NoAttempt share)
attempted_conversion = June verified sessions ÷ June attempted sessions
estimated_recovered_orders = gap_sessions × attempted_conversion
estimated_volume = estimated_recovered_orders × June average verified ticket
```

Result تقریبی: ۵۵۱ سفارش و ۴٫۹ میلیارد ریال. UI باید Assumption و غیرعلّی‌بودن آن را نشان دهد.

## 10. Security and Privacy

- داده خام، Card ID کامل و Secret وارد Git یا Client bundle نشود.
- Evidence sample شناسه‌های حساس را mask کند.
- JSON boundary validate شود؛ HTML/markdown غیرقابل اعتماد render نشود.
- هیچ LLM در Core path نیست؛ Prompt injection surface حذف می‌شود.
- Static artifacts فقط Aggregation و نمونه لازم برای Traceability دارند.

## 11. Deployment

- Primary target: هر Node-compatible provider مورد تأیید Human Lead؛ Vercel/Liara هر دو با architecture سازگارند.
- Build: `npm ci && npm run build`.
- Runtime env در MVP لازم نیست.
- Python/DuckDB فقط برای بازتولید Artifactهاست، نه Runtime.
- `public/analysis` باید قبل از Deploy تولید و validate شود.
- Production deploy توسط Agent Lead انجام نمی‌شود.

## 12. System Invariants

1. UI عددی خارج از Artifact validated نمایش نمی‌دهد.
2. مبلغ‌ها integer ریال‌اند.
3. فروش روی Session grain است.
4. Insight بدون Evidence ممنوع است.
5. Peer benchmark بدون minimum sample نمایش داده نمی‌شود.
6. Estimate با Actual مخلوط نمی‌شود.
7. adjusted fee هیچ‌وقت «کارمزد واقعی» نامیده نمی‌شود.
8. Featureها از Contract مشترک عبور می‌کنند، نه Import مستقیم.

# Team Plan — Challenge 1 ZarinPal

## 1. Ownership Matrix

| Member | Provisional Agent | Primary Slice | Secondary | Authority | Key checkpoint |
|---|---|---|---|---|---|
| A | Claude Code | Action Center + Evidence + shared shell | UX/accessibility/integration | Feature folders + common loader; shared contract approval-gated | Evidence with one real insight by T+3h |
| B | Codex #1 | Conversion Rescue | formula correctness/tests | recovery folders | M275 real artifact by T+3h |
| C | Antigravity | Customer Growth | privacy/data-quality states | customer folders | repeat/new-returning artifact by T+3h |
| D | Codex #2 | Peer Opportunities | statistical guardrails/demo narrative | peer folders | decomposition/peer artifact by T+3h |

این Mapping براساس نیاز Feature و استقلال Slice است. نقاط قوت انسانی اعضا Unknown است؛ Human Lead فقط در آغاز می‌تواند Mapping را جابه‌جا کند. بعد از شروع، Reassignment بدون Blocker واقعی ممنوع است.

## 2. Branch Plan

```text
main
├── feat/member-a-action-center-evidence
├── feat/member-b-conversion-rescue
├── feat/member-c-customer-growth
└── feat/member-d-peer-opportunities
```

هر Branch در Worktree مستقل. Push/Remote با Human Lead.

## 3. Dependency Graph

```text
contracts.md + mock fixtures (A, first checkpoint)
   ├── B conversion-recovery ──┐
   ├── C customer-growth ──────┼── InsightSummary/Evidence → A Action Center
   └── D peer-opportunities ───┘

analytics/common session grain (A)
   ├── B can start with local CTE/mock
   ├── C can start with verified-card fixture
   └── D can start with session fixture
```

| Dependency | Type | Can Mock | Integrate early |
|---|---|---:|---:|
| Contract shapes | Hard | نه بعد از freeze | بله، T+60m |
| Shared Evidence component | Soft | بله | بله، T+3h |
| Common session loader | Soft initially | بله | T+4h |
| B/C/D real payloads for Action Center | Soft | بله | یکی در T+3h، همه T+7h |
| Global CSS/layout | Shared | خیر؛ owner A | T+2h |

## 4. First 60 Minutes

### Minute 0–10 — Challenge & scoring

- متن و معیارها قفل شوند.
- Grain attempt، fee caveat، mobile/desktop و traceability ثبت شوند.

### Minute 10–20 — Product alignment

- Product thesis و M275 golden story.
- BUILD/LATER/DON'T BUILD و REAL/MOCK نهایی.

### Minute 20–30 — Vertical slicing

- چهار Slice، ownership، Branch و folder boundaries.
- Agent mapping موقت و No-idle mocks.

### Minute 30–45 — Architecture/contracts

- Static bundle architecture.
- Insight/Evidence contracts، formula IDs، sample guards و security boundaries.

### Minute 45–60 — Readiness

- Context/Feature specs.
- Scaffold/branches/worktrees.
- هر عضو tracker محلی و fixture plan را آغاز کند.

Lead این آماده‌سازی را در Initial Commit انجام داده است؛ اعضا از Checkpoint T+60 شروع می‌کنند.

## 5. Challenge 1 Time Budget

به‌دلیل سه Challenge اجباری، Challenge 1 نباید کل ۴۸ ساعت را مصرف کند. Budget پایه: ۱۴ ساعت کاری از زمان شروع Implementation؛ در صورت Deadline رسمی متفاوت، Human Lead فقط زمان‌ها را adjust می‌کند، نه ترتیب فازها.

### Phase 1 — Alignment & Setup (T+0 تا T+1h)

- Goal: Contract و ownership ثابت
- Owners: همه؛ A contract gate
- Exit: fixture قابل مصرف و Branchها آماده
- Risk: بحث معماری طولانی؛ تصمیم reversible و ساده نگه داشته شود

### Phase 2 — Parallel Build (T+1 تا T+6h)

- B/C/D analytics + feature UI با Mock
- A shell/evidence/action center
- Exit: هر چهار Route با Artifact یا fixture و یک test اصلی
- Integration کوچک در T+3h

### Phase 3 — Integration (T+6 تا T+9h)

- Artifact واقعی جای Mock
- fingerprint/schema validation
- Action Center همه Insightها را مصرف کند
- Exit: Golden Journey M275 end-to-end

### Feature Freeze — T+9h

پس از Freeze: Feature جدید، تغییر Contract، تغییر root architecture، Auth و dependency پرریسک ممنوع.

### Phase 4 — QA/Security/Stabilization (T+9 تا T+11h)

- Formula regression، mobile/desktop، RTL، empty/error، no secrets/raw data
- Build clean و README test
- Exit: zero P0/P1 blocker

### Phase 5 — Polish/Demo/Submission (T+11 تا T+14h)

- Demo script، recording، deploy توسط Human Lead، submission checklist
- Exit: URL/video/repo/readme آماده

## 6. 48-Hour Event View

| Event window | Focus | Exit |
|---|---|---|
| 0–14h | Challenge 1 | محصول stable و submitted/ready |
| 14–16h | Buffer/context switch | Challenge 1 بسته؛ lessons ثبت |
| 16–30h | Challenge 2 | مستقل؛ reuse فقط Skills/learning، نه code/context |
| 30–44h | Challenge 3 | مستقل |
| 44–48h | Global submission buffer | لینک‌ها، ویدئوها، fallback و verification |

این تقسیم تا دریافت Deadline رسمی `UNCONFIRMED` است.

## 7. Integration Order

1. A contract + shell
2. B flagship recovery payload
3. D decomposition/peer payload
4. C customer payload
5. A final priority merge

Merge Feature به main تنها بعد از verify و Human Lead review.

## 8. Checkpoint Questions

### T+3h

- آیا M275 عدد واقعی و Evidence دارد؟
- آیا هر عضو با Mock/Contract مستقل پیش رفته؟
- آیا Contract change لازم است؟ این آخرین پنجره کم‌هزینه است.

### T+6h

- آیا Golden Journey حداقل با یک Insight end-to-end کار می‌کند؟
- آیا Analytics full dataset اجرا شده؟
- آیا Mobile shell قابل استفاده است؟

### T+9h Freeze

- P0های ناقص چیست؟
- چه چیزی حذف می‌شود؟
- آیا تمام Mockها از مسیر Demo حذف شده‌اند؟

## 9. Iteration/Reallocation

- عضو آزادشده ابتدا P0/P1 خودش، سپس integration/test همان Slice را انجام دهد.
- Reallocation فقط وقتی Feature Done و Backlog امتیازآور باقی است.
- Agent دوم روی همان فایل/Feature هم‌زمان کار نکند.
- هر Task جدید Spec کوتاه، owner، acceptance و file boundary می‌گیرد.

## 10. Mentor Preparation

Mentor فقط بعد از داشتن Prototype و برای این پرسش‌ها:

1. آیا Evidence Drawer فعلی معیار «منبع و نحوه محاسبه از UI» را کافی پوشش می‌دهد؟
2. آیا Scenario کاهش NoAttempt با Assumptionهای صریح، از نظر داوری actionable و غیرگمراه‌کننده است؟
3. برای peer benchmark، category + sample + size/ticket controls کافی است یا کنترل مشخص دیگری انتظار می‌رود؟

Template جلسه:

```text
Current State: M275 golden flow + evidence working
Problem: یک تصمیم مشخص
What We Tried: شواهد و گزینه‌ها
Decision Needed: انتخاب A/B
Specific Question: یک سؤال قابل پاسخ
```

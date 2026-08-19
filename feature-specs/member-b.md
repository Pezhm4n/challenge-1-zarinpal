# Member B — Conversion Rescue

## Assignment

- Provisional Agent: Codex #1
- Primary Vertical Slice: Conversion Rescue & NoAttempt diagnosis
- Secondary responsibility: analytical correctness and formula tests
- Decision authority: Folderهای `conversion-recovery`; Contract/Shared changes با تأیید Lead

## Goal

به پذیرنده نشان دهد افت فروش در کدام مرحله پرداخت رخ داده، چه بخشی قابل پیگیری است و فرصت محافظه‌کارانه آن چند سفارش/ریال است.

## User Flow

1. کاربر Insight افت Conversion را از Action Center باز می‌کند.
2. Breakdown می‌بیند: Session → Attempted → InBank/Failed → Verified.
3. Driver غالب، period comparison و segmentهای PSP/amount/time دیده می‌شوند.
4. Opportunity scenario و Action مشخص نمایش داده می‌شود.
5. Evidence محاسبه و sample Sessionها باز می‌شود.

## Inputs

- CSV columns: session/try keys، merchant/category، amount، statuses، PSP، timestamps
- `AnalysisSelection`
- Formula registry و Session normalization A
- M275 default period May vs June

## Outputs

- `analytics/conversion_recovery/*`
- `public/analysis/conversion-recovery.json`
- UI در `src/features/conversion-recovery`
- Route composition درخواست‌شده برای `/recovery`
- Insight summaries و Evidence records

## Core Analysis

- Session-level verification rate
- NoAttempt share و requested amount
- First-stage funnel و retry recovery
- PSP performance فقط با amount band/sample control
- Period comparison و driver diagnosis
- `scenario.no_attempt_recovery.v1`

## M275 Required Story

- May→June Session: +16.6%
- Conversion: 57.77%→36.76%
- NoAttempt: 10.99%→39.49%
- Avg ticket افزایش یافته؛ Demand/ticket علت اصلی نیست.
- June attempted conversion ≈60.75%.
- Scenario: بازگشت NoAttempt به May → حدود 551 سفارش و 4.9b ریال potential.
- عبارت «Estimate غیرعلّی» و Assumptionها اجباری‌اند.

## UI

- Root-cause headline
- Funnel با count و rate، نه Sankey پیچیده
- Period comparison ساده
- Opportunity calculation card
- Segment table با minimum sample و quality badge
- Evidence trigger برای هر claim

## Dependencies

- Hard: Contract و Session grain definition
- Soft: Shared Evidence component از A
- Can Mock: Evidence UI و Action Center summary
- Must integrate early: یک M275 real artifact تا T+3h

## Mock Strategy

تا آماده‌شدن common loader، Query Feature می‌تواند Session CTE مستقل داشته باشد. خروجی باید Contract نهایی را رعایت کند؛ پس از integration duplication حذف یا به common منتقل شود فقط با هماهنگی A.

## Acceptance Criteria

- Retry rowها Double-count نشوند.
- NoAttempt و attempted conversion درست تفکیک شوند.
- PSP comparison بدون amount/sample control به‌عنوان نتیجه قطعی نمایش داده نشود.
- M275 numbers با Profile تأییدشده تطابق داشته باشند.
- Scenario numerator/denominator و Formula در UI قابل مشاهده باشد.
- zero denominator و missing PSP state پوشش داده شود.
- Responsive و قابل فهم برای غیرتکنیکال.

## Error Cases

- try_seq=0
- Session با چند attempt
- Null PSP/bank/response
- Paid/Reversed semantics نامشخص
- amount outlier
- period با داده کم

## Tests

- Attempt→Session fixture
- NoAttempt share دستی
- Retry recovered session
- Scenario M275 با tolerance صفر/مستند
- PSP segment minimum sample
- Missing/zero denominator

## Out of Scope

- تغییر Routing واقعی PSP
- ادعای علت قطعی یا تضمین revenue
- Real-time retry/notification
- Raw event explorer کامل

## Demo Value

Flagship Actionability/Depth: افت فروش را به اهرم قابل پیگیری و اثر ریالی تبدیل می‌کند.

## Checkpoints

- T+60m: Query plan + fixture tests
- T+3h: M275 artifact + evidence
- T+6h: `/recovery` functional
- T+8h: integration + edge cases

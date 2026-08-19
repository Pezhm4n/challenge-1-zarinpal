# Member A — Action Center & Evidence

## Assignment

- Provisional Agent: Claude Code
- Primary Vertical Slice: Action Center + Trust/Evidence experience
- Secondary responsibility: UX consistency, accessibility and integration shell
- Decision authority: UI composition داخل Slice و `analytics/common`; Shared Contract change فقط با Human Lead

## Goal

پذیرنده در کمتر از ۱۰ ثانیه سه فرصت اولویت‌دار، اثر و اقدام بعدی را بفهمد و بتواند مدرک هر عدد را بدون دانش تحلیل داده بررسی کند.

## User Flow

1. کاربر Merchant و Period را انتخاب می‌کند.
2. Headline نشان می‌دهد فروش چگونه تغییر کرده و Driver اصلی چیست.
3. سه Insight از Payloadهای B/C/D بر اساس priority نمایش داده می‌شوند.
4. کاربر Action، impact و confidence را می‌خواند.
5. با «چطور حساب شد؟» Evidence Drawer باز می‌شود.
6. Formula، source، numerator/denominator، نمونه داده و محدودیت دیده می‌شود.

## Inputs

- `action-center.json`
- `InsightSummary[]` و `EvidenceRecord[]` از سه Feature دیگر
- Merchant/period catalog
- Mock fixtures مصوب برای شروع موازی

## Outputs

- Route `/`
- App shell و navigation responsive
- Merchant/date selection state
- Prioritized insight list
- Evidence Drawer/Sheet مشترک
- `analytics/common`: loader، session normalization، fingerprint و schema utilities
- Contract fixtures در `src/mocks`

## UI

- Header RTL با نام محصول و selectorها
- Hero/action card اول بدون Chart
- دو Action card بعدی
- Headline decomposition summary
- Evidence trigger روی تمام metricها
- Mobile: stack تک‌ستونه و Drawer تمام‌عرض
- Desktop: content + context panel بدون sidebar سنگین

## Business Logic

- فقط Insightهای دارای Evidence معتبر نمایش داده شوند.
- اولویت بر اساس priority، سپس impact و confidence؛ الگوریتم در Evidence/README مستند شود.
- `insufficient-data` به‌جای عدد جعلی State مستقل دارد.
- Actual و Estimate از نظر Label و Style جدا باشند.

## Analytics

- Loader با schema ثابت
- Attempt→Session normalization مشترک
- Dataset fingerprint و coverage metadata
- Merge index برای Evidenceها؛ هیچ Formula اختصاصی B/C/D در common قرار نگیرد.

## Dependencies

- Hard: `contracts.md`
- Soft: Payload واقعی B/C/D
- Can Mock: تمام Feature payloadها از روز اول
- Must integrate early: یک Insight واقعی از B در Checkpoint دوم

## Mock Strategy

Fixture M275 با سه Insight و Evidence کامل بساز؛ shape دقیقاً Contract را رعایت کند. Mock باید Label واضح Development داشته باشد و قبل از Demo با Artifact واقعی جایگزین شود.

## Acceptance Criteria

- سه Insight M275 با impact/action/confidence نمایش داده شوند.
- هر عدد اصلی Evidence قابل‌بازکردن داشته باشد.
- Evidence شامل Formula، period، numerator/denominator، controls، limitations و sample rows باشد.
- Merchant/period ناموجود Error state مناسب بدهد.
- Mobile 390px و Desktop 1440px بدون overflow افقی.
- Keyboard navigation، focus visible و accessible titles کامل.
- هیچ عدد از Mock در Demo نهایی باقی نماند.

## Error Cases

- Artifact missing/invalid
- Merchant/period unavailable
- Evidence ID missing
- Insufficient sample
- Null numerator/denominator
- Dataset fingerprint mismatch میان Featureها

## Tests

- Schema validation و artifact merge
- Priority sort و Actual/Estimate labels
- Missing evidence rejection
- Evidence Drawer accessibility
- Mobile/Desktop browser smoke
- Session normalization fixture برای Retry double-count

## Out of Scope

- محاسبات تخصصی B/C/D
- Auth، export، notification، AI explanation
- تغییر Theme خارج tokens مصوب

## Demo Value

این Slice بیشترین اثر را بر UX ۴۵ و Traceability ۷۵ دارد و تمام تحلیل‌های تیم را به داستان داوری واحد تبدیل می‌کند.

## Checkpoints

- T+60m: Contract fixture + shell + route skeleton
- T+3h: Evidence Drawer با M275 mock
- T+6h: یک Payload واقعی integrated
- T+9h: هر سه Feature integrated و responsive

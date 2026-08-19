# Member C — Customer Growth

## Assignment

- Provisional Agent: Antigravity
- Primary Vertical Slice: Customer repeat, cohorts and concentration
- Secondary responsibility: data-quality messaging and privacy masking
- Decision authority: Folderهای `customer-growth`; Shared changes approval-gated

## Goal

به پذیرنده نشان دهد رشد از مشتری جدید یا بازگشتی می‌آید، وفاداری در چه وضعی است و چه اقدام retention باید اندازه‌گیری شود.

## User Flow

1. کاربر `/customers` را باز می‌کند.
2. نسبت New/Returning و Repeat revenue را می‌بیند.
3. Cohort ساده و concentration مشخص می‌کند retention پایدار است یا وابستگی وجود دارد.
4. محصول اقدام و target period بعدی پیشنهاد می‌کند.
5. Evidence توضیح می‌دهد Card ناشناس چگونه و با چه محدودیتی استفاده شده است.

## Inputs

- فقط Verified attempts دارای `payer_card_key`
- merchant/session/amount/created_at
- period selection و Artifact contract

## Outputs

- `analytics/customer_growth/*`
- `public/analysis/customer-growth.json`
- UI در `src/features/customer-growth`
- Route `/customers`
- Insight/Evidence برای Action Center

## Core Analysis

- Active anonymous cards
- New vs returning cards بر اساس first verified purchase
- Repeat pair rate
- Repeat revenue share
- Monthly cohort retention
- Customer concentration buckets
- Period-to-period retention change

## Required Caveats

- Card ID ناشناس معادل Customer identity کامل نیست.
- Failed/NoAttempt rows اغلب card ندارند؛ retention denominator فقط verified/card-known است.
- Cross-merchant card behavior خارج Scope و از نظر privacy نمایش داده نمی‌شود.
- Action باید «طراحی کمپین/وفاداری در CRM خود پذیرنده» باشد، نه ارائه لیست تماس.

## UI

- Customer mix headline
- New/returning split و trend
- Cohort compact heatmap/table فقط در صورت sample کافی
- Concentration warning
- Action card و Evidence Drawer
- Insufficient-data state برای Merchantهای کوچک

## Dependencies

- Hard: Contract و Merchant/period selection
- Soft: Evidence component A
- Can Mock: M275 customer payload
- Must integrate early: InsightSummary تا T+4h

## Mock Strategy

Fixture با Cardهای ساختگی و Masked بساز؛ Formulaها ابتدا روی fixture دستی validate شوند. هیچ شناسه واقعی کامل وارد fixture committed نشود.

## Acceptance Criteria

- first-seen logic deterministic و period-aware باشد.
- Repeat pair rate و returning share مخلوط نشوند.
- M275 June returning card share حدود 4.16% و May حدود 5.36% reproduce شود.
- Sample/coverage و caveat در نگاه دوم قابل مشاهده باشد.
- Merchant کم‌داده، cohort جعلی نمایش ندهد.
- Card IDs mask شوند.
- Mobile/Desktop functional.

## Error Cases

- payer_card_key null
- Merchant با فقط یک ماه
- period اول بدون returning baseline
- duplicate verified rows/session
- very small cohort
- one card with extreme purchases

## Tests

- new/returning fixture
- duplicate session dedupe
- cohort retention دستی
- concentration calculation
- null card exclusion
- masking

## Out of Scope

- CRM integration، contact export، PII recovery
- Recommendation شخصی به مشتری نهایی
- Churn ML model یا LLM segmentation

## Demo Value

تحلیل رفتار مشتری نمونه Challenge را به اقدام retention با caveat و measurement تبدیل می‌کند و عمق/UX را بالا می‌برد.

## Checkpoints

- T+60m: fixture + definitions
- T+3h: repeat/new-returning artifact
- T+6h: `/customers` functional
- T+8h: cohort, privacy and integration

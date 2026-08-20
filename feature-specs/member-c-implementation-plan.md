# Member C Implementation Plan — Customer Growth, Repeat & Cohort

## Status

- Owner: Member C / Codex
- Branch: `codex/member-c-customer-growth`
- Scope: `customer-growth` vertical slice only
- State: **Review fixes verified; awaiting Human Lead approvals — not Done**
- Source of truth: `AGENTS.md` → `context/architecture.md` → `contracts.md` → `feature-specs/member-c.md`

## Goal

پیاده‌سازی کامل Route `/customers` و Artifact قطعی `customer-growth.json` تا پذیرنده بتواند بفهمد:

1. مشتریان فعال این دوره جدیدند یا بازگشتی؛
2. سهم خرید و درآمد تکراری چقدر است؛
3. Cohortهای ماهانه چه Retentionی دارند؛
4. درآمد تا چه حد به تعداد کمی Card ناشناس وابسته است؛
5. بر اساس این شواهد چه اقدام Retentionی را در CRM خود اندازه‌گیری کند.

خروجی باید Action-first، فارسی، RTL، Responsive، قابل ردیابی از طریق Evidence و صریح درباره محدودیت `payer_card_key` باشد.

## Confirmed Data and Contract

### Input grain

- ورودی خام در سطح Attempt با کلید `session_key + try_seq` است.
- تمام KPIهای فروش ابتدا در سطح Session deduplicate می‌شوند.
- Customer analytics فقط از Sessionهای eventual verified دارای `payer_card_key` استفاده می‌کند.
- ستون‌های لازم: `merchant_key`, `session_key`, `amount`, `created_at`, `try_status`, `payer_card_key` و فیلدهای لازم برای fingerprint.
- Card فقط یک شناسه ناشناس رفتاری است؛ Customer identity یا راه تماس محسوب نمی‌شود.

### Existing output schema

Artifact باید Envelope نسخه `1.0` و `feature: "customer-growth"` داشته باشد و برای هر Merchant دقیقاً `CustomerGrowthPayload` موجود در `contracts.md` را تولید کند:

- `selection`
- `activeCards`, `newCards`, `returningCards`, `returningSharePct`
- `repeatPairPct`, `repeatRevenueSharePct`
- `cohorts[]`
- `concentration[]`
- `insights[]`
- `evidence[]`

هیچ تغییر Schema در این Slice برنامه‌ریزی نشده است.

## Metric Definitions

| Metric | Planned deterministic definition | Formula ID / gate |
|---|---|---|
| Active cards | تعداد Card یکتای دارای Session موفق در period انتخابی | Feature-local evidence؛ ID نهایی باید تأیید شود |
| New cards | Active cardهایی که اولین Session موفقشان برای همان Merchant داخل period است | بخشی از customer mix |
| Returning cards | Active cardهایی که اولین Session موفقشان برای همان Merchant پیش از شروع period است | `customer.returning_share.v1` |
| Returning share | `returningCards / activeCards × 100` | `customer.returning_share.v1` |
| Repeat pair rate | زوج‌های merchant/card با حداقل ۲ Session موفق یکتا تا انتهای period تقسیم بر تمام زوج‌های واجد شرایط تا انتهای period | `customer.repeat_pair_rate.v1` |
| Repeat revenue share | حجم موفق period از Cardهای returning تقسیم بر حجم موفق card-known همان period | **Formula ID نیازمند تأیید Human Lead** |
| Monthly cohort retention | Cardهای Cohort ماه اولین خرید که در ماه index نیز خرید موفق دارند تقسیم بر اندازه Cohort | **Formula ID و minimum cohort sample نیازمند تأیید Human Lead** |
| Concentration | سهم Cardها و درآمد در bucketهای ثابت مرتب‌شده بر اساس حجم موفق period | **Formula ID و bucket definition نیازمند تأیید Human Lead** |

قواعد عمومی: denominator صفر به `null` و Data-quality note منجر می‌شود؛ Retry یا چند Verified row یک Session نباید دوباره شمرده شود؛ مبلغ‌ها integer ریال باقی می‌مانند.

## Files

### Feature-owned analytics

- `data/fixtures/customer-growth-sessions.csv` — Fixture کوچک، ساختگی و hand-checkable
- `analytics/customer_growth/__init__.py`
- `analytics/customer_growth/build_artifact.py` — orchestration و تولید JSON پایدار
- `analytics/customer_growth/queries.sql` — Session dedupe، first-seen، repeat، cohort و concentration
- `analytics/tests/test_customer_growth.py` — تست Formulaها، masking و edge caseها
- `public/analysis/customer-growth.json` — Artifact تولیدشده و deployable

### Feature-owned frontend

- `src/app/customers/page.tsx` — فقط Route composition
- `src/features/customer-growth/customer-growth-page.tsx` — orchestration UI همان Feature
- `src/features/customer-growth/customer-growth-artifact.ts` — load و validation در JSON boundary
- `src/features/customer-growth/customer-mix.tsx`
- `src/features/customer-growth/repeat-summary.tsx`
- `src/features/customer-growth/cohort-retention.tsx`
- `src/features/customer-growth/concentration-warning.tsx`
- `src/features/customer-growth/customer-growth-states.tsx`

نام/تعداد فایل‌های Component در صورت ساده‌تر بودن Implementation می‌تواند کمتر شود، اما تمام تغییرات داخل Folder مالکیت Member C می‌ماند. Component مشترک جدید یا تغییر `src/contracts`, `src/components/ui`, `components.json`, layout و global CSS فقط با هماهنگی Human Lead/Member A انجام می‌شود.

## Dependencies

### Hard

- شکل TypeScript تثبیت‌شده `AnalysisArtifact<CustomerGrowthPayload>` از Member A در `src/contracts`؛ تا زمان آماده‌شدن، Fixture و Analytics مطابق `contracts.md` پیش می‌روند و Shared Contract ساخته یا تغییر داده نمی‌شود.
- Merchant/period selection موجود در Contract و Shell مشترک.

### Soft

- Evidence Drawer و Insight Card مشترک Member A؛ Duplicate محلی ساخته نمی‌شود.
- `analytics/common` برای loader، Session normalization، Formula registry و dataset fingerprint؛ تا آماده‌شدن آن، queryهای Fixture مستقل و قابل جایگزینی نگه داشته می‌شوند.

### Resolved inputs and remaining integration gates

1. CSV کامل از مسیر استاندارد و Git-ignored یعنی `data/raw/challenge_data.csv` خوانده می‌شود؛ فایل خام commit یا وارد Client bundle نمی‌شود.
2. اعداد M275 روی داده کامل بازتولید شدند: May برابر `5.3571%` و June برابر `4.1556%`.
3. برای Cohort حداقل نمونه `20` و برای Concentration سه bucket غیرهم‌پوشان `top-1`، `rank-2-5` و `remaining` استفاده شد.
4. تا آماده‌شدن Shared Evidence component، disclosure محدود به Feature و typeهای محلی مطابق `contracts.md` پیاده‌سازی شد.
5. Formula IDهای `customer.repeat_revenue_share.v1`، `customer.cohort_retention.v1` و `customer.revenue_concentration.v1` هنوز باید توسط Human Lead وارد Registry مشترک شوند؛ فایل مشترک توسط Member C تغییر نکرده است.
6. Guardrail صفر-denominator به `MetricValue.value: null` نیاز دارد، در حالی که متن فعلی `contracts.md` فقط `number` را اعلام می‌کند؛ Slice رفتار امن `null + DataQuality` را پیاده کرده اما همگام‌سازی قرارداد مشترک نیازمند تصمیم Human Lead است.

## Implementation Steps

### 1. Fixture and formula lock

- Fixture ساختگی با چند Merchant/Card/Month، Null card، Session retry، duplicate verified row و Card بسیار پرتراکنش بساز.
- Expected result هر Metric را دستی در تست ثبت کن.
- Card کامل را در output قرار نده؛ masking قبل از serialization انجام شود.
- تصمیم‌های Formula ID، Cohort threshold و concentration buckets را از Human Lead بگیر.

### 2. Analytics vertical slice

- Attemptها را ابتدا به یک Session قطعی تبدیل کن.
- eventual verified و یک amount معتبر برای هر Session استخراج کن.
- Sessionهای بدون Card را فقط از Customer denominatorها حذف و coverage loss را ثبت کن.
- first verified purchase را برای هر `merchant/card` تا انتهای بازه محاسبه کن.
- Customer mix، repeat metrics، cohort matrix و concentration را تولید کن.
- EvidenceRecord کامل با grain، source columns، filters، numerator/denominator، محدودیت و fingerprint بساز.
- JSON را با ترتیب پایدار و Envelope نسخه `1.0` در `public/analysis/customer-growth.json` بنویس.

### 3. Boundary validation and states

- Artifact را در Boundary بدون `any` validate کن.
- حالت‌های `MISSING_ARTIFACT`, `INVALID_SCHEMA`, `MERCHANT_NOT_FOUND`, `PERIOD_NOT_FOUND` و `INSUFFICIENT_DATA` را به پیام فارسی قابل اقدام نگاشت کن.
- Merchant یک‌ماهه، cohort کوچک، denominator صفر و card coverage محدود نباید KPI یا heatmap جعلی تولید کنند.

### 4. Customer Growth UI

- بالای صفحه یک headline برای New/Returning mix و اقدام پیشنهادی نشان بده.
- Repeat pair و Repeat revenue را با تعریف جدا نمایش بده تا با Returning share مخلوط نشوند.
- Cohort را به‌صورت جدول/heatmap فشرده فقط برای sample کافی نمایش بده؛ در Mobile summary خوانا جایگزین شود.
- Concentration warning را فقط با label و توضیح عملی نشان بده، نه صرفاً رنگ.
- Caveat مربوط به Card ناشناس و card-known coverage در نگاه دوم و Evidence قابل مشاهده باشد.
- Evidence trigger از Contract مشترک استفاده کند و Card ID کامل هرگز render نشود.

### 5. Integration

- `insights[]` شامل مقصد `/customers` را زود به Member A تحویل بده.
- Merchant/period selection را از Shell دریافت کن؛ state موازی یا Contract جدید نساز.
- Mock را با Artifact واقعی جایگزین و M275 را برای May/June کنترل کن.

### 6. Review and handoff

- Diff را فقط برای Folderها و فایل‌های اعلام‌شده بررسی کن.
- Shared-file requestها را جداگانه به Human Lead گزارش کن.
- هیچ Push، Merge یا Deploy توسط Member C Agent انجام نشود.

## Tests and Validation

### Analytics tests

- New/returning fixture با first-seen قبل، داخل و بعد period
- جداسازی returning share از repeat pair rate
- Session dedupe برای Retry و duplicate Verified rows
- حذف Null card از numerator و denominator مناسب
- Cohort retention با نتیجه دستی معلوم
- Concentration با یک Card پرتراکنش و tie پایدار
- Zero denominator و Merchant یک‌ماهه
- Masking و عدم وجود Card کامل در JSON
- JSON schema/envelope و ordering پایدار
- بازتولید M275: returning share حدود `5.36%` در May و `4.16%` در June پس از دسترسی به CSV

### Frontend validation

- Artifact معتبر، مفقود و ناسازگار
- Merchant کم‌داده و cohort ناکافی
- Mobile `390×844` و Desktop `1440×900`
- RTL، keyboard navigation، focus visible و heading order
- تطابق مقدار UI با Evidence numerator/denominator

### Repository checks

```text
python -m pytest analytics/tests/test_customer_growth.py
npm run lint
npm run typecheck
npm run build
```

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Double-count شدن Sessionهای retry/duplicate | Session-grain CTE و fixture regression test |
| اشتباه گرفتن Card با Customer واقعی | copy صریح، عدم contact/export و masking |
| Cohort نمایشی برای sample کوچک | threshold مصوب + insufficient-data state |
| Outlier یک Card | concentration واقعی، بدون حذف اصل داده، caveat در Evidence |
| وابستگی به Shared code آماده‌نشده | mock-first و boundary مشخص؛ بدون duplicate shared component |
| اختلاف Formula با Contract | توقف در approval gate و درخواست Human Lead |
| نبود CSV خام | شروع با fixture؛ full-run و M275 validation پس از قرارگیری در `data/raw/` |

## Definition of Done

- تمام Acceptance Criteria فایل `member-c.md` پوشش داده شده باشد.
- Customer mix، Repeat، Cohort و Concentration واقعی و deterministic باشند.
- تمام اعداد قابل ردیابی به Evidence و Dataset fingerprint باشند.
- Card کامل، PII، raw CSV یا Secret وارد Git/Client bundle نشده باشد.
- M275 May/June پس از full-run بازتولید شده باشد.
- Mobile/Desktop، loading/empty/error/insufficient-data و accessibility بررسی شده باشند.
- تست‌های Feature و `npm run verify` سبز باشند.
- Diff خارج Scope وجود نداشته و Integration برای Human Lead آماده باشد.

## Approval Requested

با تأیید Member C، فقط مراحل Feature-owned و Fixture-first آغاز می‌شوند. هر تغییر در Shared Contract، Formula Registry، Shared UI یا معماری همچنان به تأیید جداگانه Human Lead نیاز دارد.

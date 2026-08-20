# Member B Implementation Plan — Conversion Rescue & NoAttempt

## Status

- Owner: Member B / Codex #1
- Branch: `feat/member-b-conversion-rescue`
- Scope: `conversion-recovery` vertical slice only
- State: **Phase 3 complete and verified; awaiting Human Lead approval for Phase 4**
- Source of truth: official challenge brief → `AGENTS.md` → `context/architecture.md` → `contracts.md` → `feature-specs/member-b.md`

## Goal

پیاده‌سازی Route `/recovery` و Artifact قطعی `conversion-recovery.json` تا پذیرنده غیرتکنیکال بتواند در کمتر از ۱۰ ثانیه بفهمد:

1. افت فروش در کدام مرحله چرخه پرداخت رخ داده است؛
2. آیا افت از کم‌شدن تقاضا است یا از افزایش Sessionهای `NoAttempt`؛
3. Retry و PSPها بعد از کنترل حجم نمونه و مبلغ چه سیگنالی دارند؛
4. سناریوی محافظه‌کارانه کاهش NoAttempt چند سفارش و چند ریال پتانسیل دارد؛
5. هر عدد با چه grain، فرمول، فیلتر، صورت، مخرج و نمونه Session محاسبه شده است.

خروجی باید فارسی، RTL، Responsive، Action-first و صریح درباره غیرعلّی و غیرتضمینی‌بودن Scenario باشد. AI/LLM در Core path استفاده نمی‌شود، زیرا معیار اصلی این Slice صحت قطعی، ردیابی‌پذیری و اجراپذیری است.

## Official Scoring Alignment

- **اقدام‌پذیری و بدیع‌بودن — ۹۰:** Root-cause مشخص، اقدام قابل انجام برای Checkout→Gateway و Opportunity ریالی محافظه‌کارانه.
- **صحت و ردیابی‌پذیری — ۷۵:** Session normalization، Evidence کامل، fingerprint، sample Session و جلوگیری از Double count شدن Retryها.
- **عمق تحلیلی — ۶۰:** آزمون فرضیه demand در برابر payment-entry failure، period comparison، funnel، retry و PSP comparison کنترل‌شده با amount band/sample guard.
- **UX غیرتکنیکال — ۴۵:** Finding→Impact→Action→Confidence→Evidence، بدون Sankey یا نمودار پیچیده.
- **کیفیت فنی — ۳۰:** DuckDB deterministic، JSON کوچک deployable، TypeScript strict، validation در boundary و تست‌های hand-checkable/full-dataset.

## Repository Trace

### Reusable shared implementation

- `analytics/common/loader.py`: CSV loader با schema صریح و SQL identifier guard.
- `analytics/common/sessions.py`: Attempt→Session normalization، eventual verified، NoAttempt، Retry و recovered-after-retry.
- `analytics/common/fingerprint.py` و `coverage.py`: fingerprint و Dataset metadata.
- `analytics/common/artifact.py`: JSON پایدار، جلوگیری از NaN و جلوگیری از خروج شناسه‌های حساس.
- `analytics/common/evidence.py`: Evidence sample و masking.
- `src/contracts/analysis.ts`: Shared payload/evidence types.
- `src/entities/evidence/evidence-sheet.tsx`: Evidence UI مشترک و Responsive.
- `src/entities/insight/*` و `src/components/ui/*`: presentation primitives موجود.

Member B این قابلیت‌ها را Duplicate یا تغییر نمی‌دهد. اگر Shared change لازم شود، کار متوقف و درخواست دقیق برای Human Lead ثبت می‌شود.

### Feature-owned empty boundaries

- `analytics/conversion_recovery/`
- `src/features/conversion-recovery/`
- `public/analysis/conversion-recovery.json`
- Route اختصاصی `/recovery`

## Full-dataset Validation

Dataset استاندارد در `data/raw/challenge_data.csv` قرار گرفت و توسط `.gitignore` نادیده گرفته می‌شود.

تست موجود Full Dataset روی فایل واقعی Passed است:

- Attempt rows: `2,213,289`
- Sessions: `2,062,839`
- Verified sessions: `1,025,627`
- NoAttempt sessions: `263,936`
- Retried sessions: `74,685`
- Recovered-after-retry sessions: `39,654`

### M275 exact values reproduced from the full dataset

May:

- Sessions: `2,730`
- Verified: `1,577`
- Session conversion: `57.7656%`
- NoAttempt: `300` / `10.9890%`
- Attempted: `2,430`
- Attempted conversion: `64.8971%`
- Verified volume: `13,778,530,000` rial
- Average verified ticket: `8,737,178.19` rial

June:

- Sessions: `3,183`
- Verified: `1,170`
- Session conversion: `36.7578%`
- NoAttempt: `1,257` / `39.4910%`
- Attempted: `1,926`
- Attempted conversion: `60.7477%`
- Retried: `56`
- Recovered after retry: `30`
- Verified volume: `10,421,270,000` rial
- Average verified ticket: `8,907,068.38` rial

این نتایج داستان رسمی M275 را تأیید می‌کنند: Session و Ticket کاهش نیافته‌اند؛ افت غالب پیش از ورود به تلاش پرداخت رخ داده است.

## Planned Deterministic Definitions

### Session funnel

- `session`: تمام `session_key`های یکتا در merchant/period.
- `attempted`: Sessionهایی که `no_attempt = false` و حداقل یک `try_seq > 0` دارند.
- `in-bank`: Sessionهایی که حداقل یک state از `InBank`, `Paid`, یا `Verified` دارند. `Paid` برای درآمد موفق شمرده نمی‌شود و فقط نشان‌دهنده عبور از stage است.
- `verified`: Sessionهایی که حداقل یک Attempt با `try_status='Verified'` دارند.
- Amount هر stage فقط یک‌بار در سطح Session جمع می‌شود.
- `rateFromPrevious` برای denominator صفر برابر `null` است، نه `0`, `Infinity` یا `NaN`.

### NoAttempt

- Formula: `funnel.no_attempt_share.v1`.
- Session فقط وقتی NoAttempt است که `max(try_seq)=0` و state آن `NoAttempt` باشد.
- Requested amount روی Session grain یک‌بار جمع می‌شود.
- Period comparison مقدار دقیق را نگه می‌دارد و فقط Presentation گرد می‌شود.

### Retry

- Session retried وقتی `attempt_count > 1` است.
- Recovered-after-retry وقتی first attempt غیرVerified، بیش از یک attempt و eventual verified باشد.
- تعریف denominator نهایی در Approval Gate قفل می‌شود؛ UI مقدار ناسازگار با numerator/denominator نمایش نمی‌دهد.

### Stage progression

- Formula ID: `funnel.stage_progression.v1`.
- Grain: `session` و ترتیب nested برابر `session → attempted → in-bank → verified` است.
- `attempted` حداقل یک `try_seq > 0` دارد.
- `in-bank` حداقل یک status از `InBank`, `Paid`, `Verified` دارد؛ `Paid` فقط عبور از Stage است.
- `verified` فقط با وجود `try_status='Verified'` ساخته می‌شود.
- `Reversed` به‌تنهایی success یا Stage progression ایجاد نمی‌کند و محدودیت آن در Evidence ثبت می‌شود.
- Count و Amount بعد از Session deduplication محاسبه می‌شوند؛ Amount هر Session در هر Stage یک‌بار جمع می‌شود.
- `rateFromPrevious` برای Stage اول و مخرج صفر `null` است؛ zero denominator با `ZERO_DENOMINATOR` ثبت می‌شود.

### PSP and amount controls

- مقایسه PSP فقط روی attempted Sessionها انجام می‌شود؛ NoAttempt فاقد PSP است و وارد denominator نمی‌شود.
- نرخ خام PSP به‌تنهایی نتیجه قطعی محسوب نمی‌شود.
- PSPها در amount bandهای ثابت/مستند مقایسه و نرخ هر cell با baseline همان amount band سنجیده می‌شود.
- cell یا PSP کم‌نمونه با quality badge به‌صورت `insufficient-data` نمایش داده می‌شود و وارد recommendation نمی‌شود.
- `Paid` و `Reversed` طبق Contract موفقیت تلقی نمی‌شوند؛ فقط `Verified` معیار success است.

### Conservative recovery scenario

- Formula ID: `scenario.no_attempt_recovery.v1`.
- `baseline_no_attempt_share = May no_attempt_sessions / May sessions`.
- `excess_no_attempt_sessions = June no_attempt_sessions - June sessions × baseline_no_attempt_share`.
- `attempted_conversion = June verified_sessions / June attempted_sessions`.
- `estimated_orders = excess_no_attempt_sessions × attempted_conversion`.
- `estimated_volume = estimated_orders × June average verified ticket`.
- مقادیر دقیق M275 قبل از Presentation rounding: حدود `551.1148` سفارش و `4,908,817,383` ریال.
- مقدار نمایشی محافظه‌کارانه: حدود `551` سفارش و `4.9` میلیارد ریال.
- `isCausalClaim` همیشه `false` و copy شامل «پتانسیل برآوردی» و «تضمین نیست» است.

## Planned Files

### Phase 2 — Fixture, formulas and tests

- `data/fixtures/conversion-recovery-attempts.csv`
- `analytics/conversion_recovery/__init__.py`
- `analytics/conversion_recovery/queries.sql`
- `analytics/conversion_recovery/build_artifact.py`
- `analytics/tests/test_conversion_recovery.py`

Fixture شامل NoAttempt، single attempt verified، failed attempt، multi-attempt recovered، unrecovered retry، missing PSP، zero denominator و amount-band boundary خواهد بود.

### Phase 3 — Real artifact and evidence

- `public/analysis/conversion-recovery.json`
- تست Full Dataset/M275 در `analytics/tests/test_conversion_recovery.py`

Artifact شامل Envelope `1.0`، selection، funnel، noAttempt، retry، controlled segments، scenario، insights و Evidence کامل است. JSON خام، Card ID کامل، Secret یا NaN وارد Git نمی‌شود.

### Phase 4 — Boundary and UI

- `src/features/conversion-recovery/conversion-recovery-artifact.ts`
- `src/features/conversion-recovery/conversion-recovery-artifact.test.mjs`
- `src/features/conversion-recovery/conversion-recovery-page.tsx`
- Componentهای کوچک Domain-based داخل همان Feature در صورت نیاز
- `src/app/recovery/page.tsx`
- `src/app/recovery/loading.tsx`

Route فقط composition انجام می‌دهد. UI از Shared Evidence Sheet و shadcn components موجود استفاده می‌کند و Shared layout/contracts/globals را تغییر نمی‌دهد.

### Phase 5 — States, accessibility and responsive

- Artifact missing/invalid
- Merchant/period not found
- insufficient-data و zero denominator
- missing PSP و low sample
- keyboard/focus/heading order
- Mobile `390×844` و Desktop `1440×900`
- جدول Segment در Mobile به summary/key-value خوانا تبدیل می‌شود.

### Phase 6 — Integration readiness

- InsightSummary و Evidence IDهای recovery برای Member A گزارش می‌شود.
- Action Center، shared contract یا shared navigation توسط Member B تغییر نمی‌کند.
- Human Lead تغییرات را review/cherry-pick/merge/push می‌کند.

## Test Matrix

### Formula and analytics

- Attempt→Session و جلوگیری از Double count شدن Retry.
- NoAttempt numerator/denominator دستی.
- Funnel count/rate/amount و ordering invariant.
- Retry recovered و unrecovered.
- Scenario exact arithmetic با tolerance صفر برای integer outputs و precision مستند برای percentage.
- PSP amount-band/sample guard.
- Missing PSP و Paid semantics.
- Zero denominator → `null` + DataQuality note.
- Stable JSON ordering، fingerprint و forbidden sensitive fields.
- Full Dataset: اعداد Profile و M275 بالا.

### TypeScript/UI

- Artifact معتبر، مفقود و ناسازگار.
- reference integrity بین insight/scenario و Evidence.
- Amount integer rial و Estimate label.
- Evidence numerator/denominator با مقدار UI یکسان.
- No raw stack/path در error state.
- RTL، touch target حداقل 44px، focus visible و heading order.

### Repository validation after every implementation phase

```text
.venv\Scripts\python.exe -m pytest <phase tests>
npm run lint
npm run typecheck
npm run build
git diff --check
```

## Approval Gate — Resolved Before Phase 2

### 1. Retry denominator / shared naming mismatch

`contracts.md` فرمول `funnel.retry_recovery.v1` را به‌شکل `recovered / first-try-non-verified` تعریف می‌کند، اما payload نام denominator را `retriedSessions` گذاشته است. این دو معنای متفاوت دارند.

پیشنهاد Member B:

- فرمول قراردادی حفظ شود؛
- denominator برابر attempted Sessionهای first-try-non-verified باشد؛
- Human Lead مشخص کند آیا field مشترک باید rename/clarify شود یا recovery rate فقط در Evidence نمایش داده شود.

تا تأیید، Contract مشترک تغییر نمی‌کند.

Resolution: Human Lead تعریف Formula را حفظ و shape آینده Shared Contract را با نام `firstTryNonVerifiedSessions` تأیید کرد. Member B در Phase 2 همین semantics را بدون تغییر Shared files پیاده‌سازی کرد.

### 2. Zero denominator and TypeScript nullability

Guardrail مشترک می‌گوید denominator صفر باید `null` بدهد، اما چند field عددی `ConversionRecoveryPayload` و `MetricValue.value` در TypeScript فعلی nullable نیستند.

پیشنهاد Member B:

- هیچ مقدار جعلی `0` تولید نشود؛
- local boundary type فقط برای stateهای ناکافی nullable باشد؛
- Shared contract فقط توسط Member A/Human Lead در صورت تأیید هماهنگ شود.

Resolution: Human Lead nullability محلی Conversion Recovery را تأیید کرد. Shared Contract، Schema و Evidence UI توسط Lead هماهنگ می‌شوند و در Branch Member B تغییر نکرده‌اند.

### 3. PSP sample threshold

Feature Spec minimum sample را اجباری کرده ولی عدد threshold را مشخص نکرده است.

پیشنهاد Member B:

- حداقل `100` Session attempted برای هر PSP در period؛
- حداقل `25` Session در هر PSP×amount-band cell؛
- زیر threshold فقط `insufficient-data` و بدون recommendation.

Resolution: Human Lead thresholdهای `100` Session attempted برای هر PSP و `25` Session برای هر PSP×amount-band را تأیید کرد. Phase 2 مرزهای دقیق این guard را با تست قفل کرد.

## Phase 2 Verification Record

- Fixture Attempt-level با NoAttempt، Verified، Failed، Paid، Retry recovered/unrecovered، missing PSP و zero denominator اضافه شد.
- Feature-owned Session view ترتیب Funnel و first-try-non-verified semantics را تثبیت کرد.
- Pure formulaها برای percentage/nullability، Retry، Scenario، amount band و PSP sample guard اضافه شدند.
- `20` تست Phase 2 Passed.
- کل Regression Suite: `51` Passed.
- lint با ignore صریح cache غیرقابل‌دسترسی sandbox، TypeScript و Production build Passed.
- Shared files، raw dataset، Context و Runtime UI تغییر نکردند.

## Phase 3 Verification Record

- Builder قطعی `analytics/conversion_recovery/build_artifact.py` با انتخاب Merchant و بازه‌های جاری/مقایسه اضافه شد.
- Artifact عمومی فقط برای Demo Merchant یعنی `M275` تولید شد و حدود `79KB` است؛ CSV خام در Artifact یا Git وارد نشد.
- Funnel واقعی June برای M275 با Count/Amount دقیق تأیید شد:
  - Session: `3,183` / `27,489,740,003` ریال
  - Attempted: `1,926` / `17,157,870,003` ریال
  - In-bank: `1,835` / `16,294,400,003` ریال
  - Verified: `1,170` / `10,421,270,000` ریال
- NoAttempt برابر `1,257` Session و `39.4910%`، و Retry recovery برابر `30 / 786 = 3.8168%` بازتولید شد.
- سناریوی غیرعلّی و غیرتضمینی M275 برابر `551` سفارش و `4,908,817,383` ریال است.
- PSPها در Quartile مبلغ Merchant-period کنترل شدند؛ guardهای `100` PSP و `25` cell اعمال و cellهای ناکافی بدون نرخ، baseline، ranking یا recommendation تولید شدند.
- Evidence برای Count، Amount، Rate، NoAttempt، Retry، Segment و Scenario با fingerprint، فیلتر، numerator/denominator، کنترل‌ها، فرض‌ها، محدودیت Reversed/Paid و Session نمونه masked تولید شد.
- Fixture مستقل Phase 3، zero denominator، Reversed، Retry deduplication، Amount-once و reference کامل M275 را پوشش می‌دهد.
- Shared files، UI، Route، Context و Formula Registry در Branch Member B تغییر نکردند.

## Risks and Mitigations

- **Double counting:** استفاده از common normalized session view و fixture regression.
- **Misleading counterfactual:** baseline/assumptions/limitations و `isCausalClaim:false`.
- **PSP confounding:** amount-band control و sample guard؛ نرخ خام صرفاً descriptive.
- **Ambiguous lifecycle:** `Verified` تنها success؛ Paid/Reversed فقط stage context.
- **Shared conflict:** هیچ edit در `src/contracts`, `analytics/common`, `src/components/ui`, layout, globals یا Context.
- **Raw-data leakage:** CSV ignored، samples محدود و masked، artifact safety test.
- **Chart-first UX:** headline/action/scenario قبل از funnel و segment details.

## Definition of Done

- Acceptance Criteria `feature-specs/member-b.md` کامل باشد.
- M275 واقعی با Evidence و fingerprint بازتولید شود.
- Retry rowها دوباره شمرده نشوند.
- PSP نتیجه کنترل‌نشده یا کم‌نمونه تولید نکند.
- تمام عددهای نمایشی Evidence قابل بازکردن داشته باشند.
- Mobile/Desktop، loading/error/empty/insufficient و accessibility بررسی شوند.
- Feature tests و `npm run verify` سبز باشند.
- Diff خارج Scope، raw CSV، Secret یا Shared edit وجود نداشته باشد.
- Push، Merge و Deploy فقط توسط Human Lead انجام شود.

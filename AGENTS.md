# AGENTS.md — Challenge 1: ZarinPal

این فایل قانون اجرایی Repository است. تمام Agentها قبل از هر تغییر باید این فایل، Contextهای مرتبط و Feature Spec اختصاصی خود را بخوانند.

## مأموریت محصول

«نبض زرین» یک داشبورد نمودارمحور نیست؛ یک Action Center برای پذیرنده غیرتکنیکال است که فرصت‌های رشد را با عدد ریالی، اقدام مشخص، سطح اطمینان و مدرک محاسبه ارائه می‌کند.

## ترتیب Source of Truth

1. متن رسمی Challenge و معیارهای داوری
2. `AGENTS.md`
3. `context/architecture.md`
4. `contracts.md`
5. Feature Spec عضو در `feature-specs/`
6. سایر فایل‌های `context/`
7. کد موجود

در تعارض، فایل بالاتر مقدم است. Unknown را حدس نزن؛ Blocker یا Assumption را گزارش کن.

## Stack قطعی

- Next.js 16 App Router، React 19، TypeScript Strict
- Tailwind CSS 4 و shadcn/ui با Base Nova، RTL
- Python 3.10+ و DuckDB برای پردازش آفلاین CSV
- JSON تحلیل‌شده و کوچک در `public/analysis/` برای Runtime
- بدون Auth و Database عملیاتی در MVP؛ Merchant selector نقش محیط دموی پذیرنده را دارد

## Invariantهای داده

- واحد تمام مبلغ‌ها ریال است؛ هیچ تبدیل ضمنی به تومان مجاز نیست.
- Grain فایل خام «تلاش پرداخت» است، نه تراکنش نهایی. KPIهای فروش باید ابتدا روی `session_key` تجمیع شوند.
- `try_seq = 0` و `try_status = NoAttempt` به‌عنوان Session بدون ورود به تلاش پرداخت تفسیر می‌شود.
- `adjusted_fee` کارمزد واقعی زرین‌پال نیست. فقط با عبارت «شاخص تعدیل‌شده کارمزد» و برای مقایسه نسبی استفاده شود.
- نبود `payer_card_key`، `issuer_bank_code` یا `psp_code` در مراحل نامرتبط چرخه پرداخت، صفر یا Unknown عمومی تلقی نشود.
- هر Counterfactual باید Scenario/Estimate نامیده شود، نه اثر علّی یا تضمین درآمد.

## Traceability اجباری

هر Insight باید قرارداد `Insight + Evidence` در `contracts.md` را رعایت کند و شامل این موارد باشد:

- مقدار، واحد و دوره
- اقدام قابل انجام
- فرمول و Formula ID
- ستون‌های منبع و Grain
- فیلترها، صورت و مخرج
- Baseline و کنترل‌های مقایسه
- Dataset fingerprint
- نمونه Session/Row قابل مشاهده در UI
- Data-quality note، Assumption و Confidence

هیچ عددی بدون Evidence Drawer وارد UI نشود.

## معماری و جهت Import

- `src/app` فقط Route composition و Layout؛ منطق تحلیلی ممنوع.
- `src/features/<feature>` مالک UI و state همان Feature است.
- `src/entities` مدل‌های نمایشی مشترک و بدون وابستگی به Featureها.
- `src/contracts` قراردادهای مشترک؛ تغییر فقط با تأیید Human Lead.
- `src/components/ui` فقط Componentهای shadcn؛ قبل از Component سفارشی Registry را جست‌وجو کن.
- `analytics/<feature>` محاسبات همان Slice؛ Featureها حق Import مستقیم از یکدیگر ندارند.
- `analytics/common` فقط Loader، Grain normalization، Formula registry و Dataset fingerprint؛ مالک Member A.
- `public/analysis` خروجی تولیدشده و Deployable؛ فایل خام در Runtime خوانده نمی‌شود.

جهت مجاز:

`app → features → entities/contracts → components/ui + lib`

Import معکوس یا Feature-to-Feature ممنوع است. اشتراک فقط از طریق Contract مصوب انجام می‌شود.

## مالکیت و فایل‌های Shared

- Member A: `action-center`, `evidence`, `analytics/common`, Shell مشترک
- Member B: `conversion-recovery`
- Member C: `customer-growth`
- Member D: `peer-opportunities`
- فایل‌های Shared شامل `src/app/layout.tsx`, `src/app/globals.css`, `src/contracts/*`, `analytics/common/*`, `components.json`, configها و Contextها هستند.
- تغییر Shared File بدون هماهنگی Human Lead ممنوع است.
- Agentها حق تغییر `AGENTS.md`, `CLAUDE.md`, `context/*`, `contracts.md`, `team-plan.md`, `risk-register.md` را ندارند.
- تنها `context/progress-tracker.md` محلی و قابل تغییر است؛ این فایل در Git نادیده گرفته می‌شود.

## قواعد Implementation

- Skill عمومی `hackathon-implementation-engineer` را برای اجرای Feature به‌کار ببر.
- Scope را به Feature Spec محدود نگه دار؛ Refactor نامرتبط ممنوع.
- تغییر معماری، Auth، Schema، Shared Contract یا Dependency اصلی نیازمند تأیید Human Lead است.
- Component موجود یا shadcn composition بر Component جدید مقدم است.
- UI فارسی، RTL، Responsive و قابل استفاده با صفحه‌کلید باشد.
- Loading، Empty، Error و Data-quality states جزو Acceptance Criteria هستند.
- رنگ Hardcode در Component ممنوع؛ Semantic Token استفاده شود.

## Type و کدنویسی

- `strict: true` حفظ شود؛ `any` ممنوع مگر با توضیح و تأیید.
- Boundaryهای JSON با Schema معتبرسنجی شوند.
- مبلغ‌ها integer ریال هستند؛ Format فقط در لایه نمایش.
- Formulaها pure و deterministic باشند.
- نام‌ها انگلیسی و Domain-based؛ متن UI فارسی و ساده.
- Secret، API key، PII یا داده خام در Source/Git ممنوع.

## Testing و Validation

- Formulaهای امتیازآور: Unit test با Fixture کوچک و نتیجه دستی معلوم.
- Grain normalization: تست جلوگیری از Double-count شدن Retryها.
- Evidence: تست تطابق مقدار UI با numerator/denominator.
- صفحات اصلی: Mobile و Desktop و RTL بررسی شوند.
- قبل از Commit: `npm run lint`, `npm run typecheck`, `npm run build` و تست‌های Feature.
- Happy path تنها کافی نیست؛ Missing data، zero denominator و insufficient peer sample را پوشش بده.

## Git

- روی Branch/Worktree اختصاصی کار کن؛ تغییر مستقیم `main` ممنوع.
- Commit کوچک، مرتبط و قابل بازگشت باشد.
- Agent حق Push، ساخت Remote، تغییر GitHub یا Deploy Production ندارد.
- قبل از Merge: Test → Diff Review → Human Lead review.

## Definition of Done

- مطابق Feature Spec و Contract
- عدد واقعی و Evidence قابل‌بازکردن
- اقدام مشخص و اثر ریالی/عملی
- Responsive در Mobile/Desktop
- Lint/Typecheck/Build/Test سبز
- بدون فایل خام، Secret یا تغییر خارج Scope
- آماده Integration روی `main`

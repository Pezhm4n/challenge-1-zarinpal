# نبض زرین — Zarin Pulse

مرکز اقدام تحلیلی برای پذیرندگان زرین‌پال. نبض زرین به‌جای یک داشبورد نمودارمحور، مهم‌ترین فرصت‌ها را با اثر مالی، اقدام بعدی، سطح اطمینان و مدرک محاسبه ارائه می‌کند.

## اجرای نسخه دمو

```bash
npm ci
npm run dev
```

سپس مسیر اصلی را در `http://localhost:3000` باز کنید. داده دمو از Artifactهای کوچک و ازپیش‌محاسبه‌شده در `public/analysis/` خوانده می‌شود و برای اجرا به CSV خام، پایگاه داده یا سرویس هوش مصنوعی نیاز ندارد.

## مسیرهای محصول

- `/` — مرکز اقدام و سه اولویت اصلی پذیرنده M275
- `/recovery` — قیف پرداخت، NoAttempt، Retry و سناریوی بازیابی
- `/customers` — کارت‌های بازگشتی، تکرار خرید، Cohort و تمرکز
- `/opportunities` — تفکیک تغییر فروش، مقایسه هم‌صنف و فرصت‌های زمانی

هر عدد مهم از داخل رابط به مدرک محاسبه متصل است. مدرک شامل فرمول، بازه، صورت و مخرج، خط مبنا، کنترل‌های مقایسه، محدودیت‌ها و نمونه داده پوشانده‌شده است.

## بازتولید Action Center

پس از آماده‌بودن سه Artifact فیچر، خروجی نهایی بدون محاسبه دوباره تحلیل‌ها ساخته می‌شود:

```bash
python -m analytics.action_center \
  --feature public/analysis/conversion-recovery.json \
  --feature public/analysis/customer-growth.json \
  --feature public/analysis/peer-opportunities.json \
  --output public/analysis/action-center.json
```

Composer یکسان‌بودن نسخه داده، بازه، پیوند Insight و Evidence و تطابق مقدارهای نمایشی را کنترل می‌کند.

## بازتولید تحلیل‌ها از داده خام

فایل خام باید با نام زیر قرار گیرد و وارد Git نمی‌شود:

```text
data/raw/challenge_data.csv
```

وابستگی‌های تحلیل آفلاین:

```bash
python -m pip install -r requirements-analytics.txt
```

داده خام در سطح «تلاش پرداخت» است. تمام KPIهای فروش پیش از محاسبه در سطح `session_key` تجمیع می‌شوند تا Retryها دوباره‌شماری نشوند. مبلغ‌ها ریال‌اند و `adjusted_fee` کارمزد واقعی زرین‌پال محسوب نمی‌شود.

## بررسی کامل

```bash
python -m pytest analytics/tests -q
node --test tests/unit/*.test.mjs
npm run verify
```

`npm run verify` شامل lint، TypeScript typecheck و Production build است.

## مستندات اصلی

- `AGENTS.md` — قوانین Repository و مالکیت فایل‌ها
- `context/project-overview.md` — مسئله، راهبرد محصول و Golden Journey
- `context/architecture.md` — معماری پردازش آفلاین و Runtime استاتیک
- `contracts.md` — قرارداد تحلیل و Evidence
- `feature-specs/` — برنامه و تحویل هر Feature
- `submission-plan.md` — چک‌لیست دمو و تحویل

# نبض زرین — Zarin Pulse

مرکز اقدام تحلیلی برای پذیرندگان زرین‌پال. محصول به‌جای نمایش مجموعه‌ای از نمودارها، فرصت‌های رشد را بر اساس اثر ریالی، اقدام پیشنهادی، اطمینان و مدرک محاسبه اولویت‌بندی می‌کند.

## وضعیت Repository

این Commit فقط Scaffold، معماری، Context، Contract و Feature Specها را آماده می‌کند. Featureهای محصول هنوز پیاده‌سازی نشده‌اند.

## اجرای Scaffold

```bash
npm install
npm run dev
```

بررسی کامل:

```bash
npm run verify
```

## دیتاست

فایل خام باید با نام زیر قرار گیرد و وارد Git نمی‌شود:

```text
data/raw/challenge_data.csv
```

نسخه محلی فعلی از `I:\Computer\dev\Hackathon\challenge_data.csv` کپی شده است. خروجی‌های کوچک و قطعی تحلیل پس از پیاده‌سازی Pipeline در `public/analysis/` تولید می‌شوند تا نسخه Deployشده به CSV حدود ۴۹۵ مگابایتی نیاز نداشته باشد.

وابستگی‌های تحلیلی:

```bash
python -m pip install -r requirements-analytics.txt
```

## مستندات اصلی

- `AGENTS.md`: قوانین Repository
- `context/project-overview.md`: مسئله، Strategy و Scope
- `context/architecture.md`: معماری و پوشه‌بندی قطعی
- `contracts.md`: قرارداد داده و Evidence
- `feature-specs/`: وظیفه چهار Feature Owner
- `team-plan.md`: زمان‌بندی، Dependency و Branchها
- `risk-register.md`: ریسک‌ها و Plan B
- `submission-plan.md`: الزامات تحویل و Demo

## قواعد مهم

- واحد پول ریال است.
- `adjusted_fee` کارمزد واقعی زرین‌پال نیست.
- Grain خام تلاش پرداخت است؛ فروش در سطح `session_key` محاسبه می‌شود.
- هر Insight باید از داخل UI قابل ردیابی باشد.
- Remote، Push و Production Deployment فقط توسط Human Lead انجام می‌شود.

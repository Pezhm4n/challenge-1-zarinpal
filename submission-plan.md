# Submission & Demo Plan

## Confirmed

- محصول تحلیلی با Insight قابل استفاده و اقدام‌پذیر.
- بررسی منبع و نحوه محاسبه از طریق UI.
- تمام قابلیت‌های ارائه‌شده باید در ویدئو تست/نمایش داده شوند.
- نمایش Mobile و Desktop الزامی است.

## Unknown — قبل از Submit باید از صفحه رسمی تأیید شود

- Deadline دقیق
- حداکثر طول/فرمت/حجم ویدئو
- Provider یا الزام Deploy
- Public/private بودن Repository
- فرمت README یا فایل‌های اجباری
- امکان Commit کردن derived artifacts
- Credential یا demo account requirement

هیچ‌کدام حدس زده نشود.

## Required Deliverables Checklist

```text
[ ] Source repository URL — Human Lead
[ ] Live deployed URL — Human Lead
[ ] Demo video URL — Human Lead
[ ] Mobile demonstration
[ ] Desktop demonstration
[ ] README quick run
[ ] Data placement/rebuild instructions
[ ] No raw CSV/secret in Git
[ ] All shown insights backed by real artifacts
[ ] Evidence Drawer shown in video
[ ] adjusted_fee caveat respected
[ ] npm ci / npm run build verified
[ ] Backup local recording and screenshots
```

## Demo Script — 3 to 5 minutes, adjust to official limit

1. Problem: پذیرنده داده دارد اما تصمیم بعدی را نمی‌داند.
2. Action Center M275: «تقاضا رشد کرده، اما فروش افت کرده.»
3. Flagship finding: Conversion 57.77%→36.76% و NoAttempt 10.99%→39.49%.
4. Impact: حدود 551 سفارش / 4.9b ریال potential با Assumption صریح.
5. Evidence Drawer: formula، periods، numerator/denominator، columns، sample rows و caveat.
6. Customer insight: returning mix و محدودیت anonymous cards.
7. Peer/decomposition: traffic بالا، conversion driver منفی، benchmark controlled.
8. Mobile view: همان Insight و Evidence در 390px.
9. Technical close: deterministic DuckDB pipeline، static artifact، سریع و قابل اجرا.

## Do Not Demo

- Placeholder/Mock
- Feature ناپایدار یا بدون Evidence
- adjusted_fee به‌عنوان fee واقعی
- Raw CSV table طولانی
- Chart بدون تصمیم
- ادعای قطعی درباره درآمد آینده

## Deployment Awareness

- Target نهایی توسط Human Lead انتخاب می‌شود.
- App با Vercel یا Liara Node-compatible است.
- Runtime env برای MVP ندارد.
- `public/analysis` باید در Build موجود باشد.
- Python/DuckDB در Runtime لازم نیست.
- Agent Lead Production Deploy انجام نمی‌دهد.

# Project Overview — نبض زرین

## 1. Challenge Brief

زرین‌پال از تیم می‌خواهد با دیتاست تراکنش/تلاش پرداخت، محصول تحلیلی‌ای بسازد که برای پذیرنده بینش قابل استفاده و اقدام‌پذیر تولید کند. کاربر باید بتواند منبع و روش محاسبه هر عدد یا ادعا را از داخل رابط بررسی کند. تمام قابلیت‌ها باید در ویدئو روی Mobile و Desktop نمایش داده شوند.

## 2. Source Classification

### Confirmed

- مخاطب اصلی پذیرنده زرین‌پال و غالباً غیرتحلیل‌گر است.
- تحلیل‌ها باید به عدد و اقدام مشخص برسند؛ نمودار عمومی کافی نیست.
- بدیع‌بودن تحلیل فراتر از مثال‌های سند امتیاز دارد.
- Grain خام سطح «تلاش پرداخت» است.
- تمرکز حجم روی برخی پذیرنده‌ها و Nullهای ساختاری باید لحاظ شوند.
- تمام مبلغ‌ها ریال‌اند.
- `adjusted_fee` تعرفه واقعی نیست؛ مقایسه نسبی آن معتبر است.
- ردیابی منبع و روش محاسبه باید از طریق UI ممکن باشد.
- امتیازها: اقدام‌پذیری ۹۰، صحت/ردیابی ۷۵، عمق ۶۰، UX برابر ۴۵، فنی ۳۰.

### Inferred

- یک محصول Action-first شانس بیشتری از Dashboard نمودارمحور دارد.
- Auth واقعی برای دموی دیتاست ثابت ارزش داوری کمی دارد؛ Merchant selector کافی است.
- پردازش ۴۹۵ مگابایت CSV در مرورگر یا هر Request، ریسک فنی و UX غیرضروری است.
- تحلیل قطعی و Explainable از لایه LLM قابل‌اعتمادتر است؛ AI فقط در صورت باقی‌ماندن زمان باید Explanation را ساده کند، نه عدد بسازد.

### Unknown

- مهلت دقیق، طول/فرمت ویدئو، نام Deploy provider و سیاست Commit کردن خروجی مشتق‌شده.
- اینکه پذیرنده در محصول واقعی به کدام قابلیت عملیاتی زرین‌پال برای اصلاح Checkout/Retry دسترسی دارد.
- نقاط قوت فردی اعضای تیم؛ Agent mapping فعلی موقت است.

## 3. Dataset Facts

- ۲٬۲۱۳٬۲۸۹ ردیف تلاش پرداخت
- ۲٬۰۶۲٬۸۳۹ Session یکتا
- ۳۴۳ پذیرنده، ۳۴۸ ترمینال، ۵ صنف، ۴۰۲٬۱۷۳ کارت ناشناس
- بازه ۱ ژانویه تا ۳۰ ژوئن ۲۰۲۶
- نرخ موفقیت Session: ۴۹٫۷۲٪
- NoAttempt: ۲۶۳٬۹۳۶ Session، معادل ۱۲٫۸٪ کل
- Sessionهای Retryشده: ۷۴٬۶۸۵؛ بازیابی بعد از شکست اول: ۳۹٬۶۵۴
- سهم ۱۰ پذیرنده اول از حجم موفق: ۸۲٫۴۲٪
- ۳۱٫۸۵٪ زوج‌های پذیرنده/کارت بیش از یک خرید موفق دارند

جزئیات در `context/dataset-profile.md` است.

## 4. Product Thesis

```text
For: پذیرنده زرین‌پال که زمان یا دانش تحلیل داده ندارد
Who has: داده زیاد اما پاسخ روشنی برای «این هفته چه کاری انجام دهم؟» ندارد
We build: نبض زرین، مرکز اقدام با سه فرصت اولویت‌دار
That enables: تشخیص اهرم رشد، اندازه‌گیری اثر ریالی و بررسی مدرک محاسبه
Core value: تصمیم بعدی قابل انجام، نه نمودار بیشتر
Strongest differentiator: Insight → Impact estimate → Action → Evidence trail
Golden user journey: انتخاب پذیرنده → مشاهده فرصت اول → فهم علت → بازکردن مدرک → اجرای اقدام
Out of scope: BI builder، گزارش مالی/حسابداری، پیش‌بینی تضمینی، Chatbot عمومی، Auth/Payment واقعی
```

## 5. Winning Strategy by Score

| معیار | طراحی پاسخ |
|---|---|
| اقدام‌پذیری/بداعت ۹۰ | Action cards با Opportunity ریالی، Growth decomposition و Counterfactual محافظه‌کارانه |
| صحت/ردیابی ۷۵ | Evidence Drawer برای هر عدد؛ Grain، Formula، filters، numerator/denominator، sample rows و fingerprint |
| عمق ۶۰ | فرضیه، decomposition، segment، cohort، peer percentile و کنترل category/size/amount/time |
| UX غیرتکنیکال ۴۵ | فارسی RTL، اول نتیجه و اقدام، سپس نمودار و در نهایت جزئیات محاسبه |
| فنی ۳۰ | Pipeline قطعی DuckDB، JSON کوچک Deployable، TypeScript Strict، تست Formula و اجرای یک‌فرمانی |

## 6. Golden User Journey

1. پذیرنده یا سناریوی Demo `M275` را انتخاب می‌کند.
2. صفحه اول سه فرصت را بر اساس اثر ریالی و Confidence مرتب می‌کند.
3. کاربر فرصت اول را می‌بیند: Sessionها در ژوئن رشد کرده‌اند اما Conversion افت کرده و NoAttempt عامل غالب است.
4. کاربر «چطور حساب شد؟» را باز می‌کند، فرمول، دوره، صورت/مخرج، داده نمونه و محدودیت را می‌بیند.
5. کاربر اقدام پیشنهادی و Checkpoint اندازه‌گیری بعدی را دریافت می‌کند.

## 7. Scope

### BUILD

- Merchant/date selector و Action Center با سه Insight اولویت‌دار
- Growth decomposition: Traffic × Conversion × Ticket
- Conversion Rescue: NoAttempt، stage funnel، retry recovery و PSP view کنترل‌شده
- Customer Growth: new/returning، repeat share، cohort و concentration
- Peer Benchmark: percentile هم‌صنف با sample guard و کنترل size/ticket
- Opportunity Calendar: بازه‌های زمانی قوی/ضعیف با حداقل sample
- Evidence Drawer مشترک برای همه Insightها
- Mobile/Desktop RTL، states کامل و راهنمای اجرای کوتاه

### LATER

- توضیح ساده‌تر با LLM فقط روی Evidence تولیدشده و بدون تولید عدد
- Export PDF/CSV گزارش
- What-if sliderهای بیشتر
- Holiday calendar فارسی و Forecast
- اتصال واقعی به CRM یا Notification

### DON'T BUILD

- Chatbot عمومی روی داده
- Auth کامل، Billing، Payment و Email infrastructure
- BI chart builder و Drag-and-drop
- Real-time ingestion، Microservice، Queue یا Database عملیاتی
- پیش‌بینی درآمد با ادعای قطعیت
- نمایش `adjusted_fee` به‌عنوان کارمزد واقعی

## 8. REAL vs MOCK/SIMPLIFIED

### REAL

- تمام اعداد و Insightهای Demo از دیتاست مشتق شوند.
- Session-level normalization و جلوگیری از Double count واقعی باشد.
- Formula، Evidence و sample rows واقعی باشند.
- چهار تحلیل اصلی و Responsive UI واقعاً کار کنند.
- Counterfactual با Assumption و Confidence واقعی و صریح باشد.

### MOCK / SIMPLIFIED

- Identity پذیرنده با Merchant selector شبیه‌سازی می‌شود.
- اقدام‌ها Recommendation هستند؛ Workflow اجرایی بیرونی پیاده نمی‌شود.
- داده Runtime از Bundle پیش‌محاسبه‌شده خوانده می‌شود، نه Query زنده CSV.
- LLM، Notification، Export و CRM حذف یا Placeholder غیرنمایشی هستند.

## 9. Default Demo Story: M275

- صنف: کیف و کفش
- Sessionهای May→June: ۲٬۷۳۰ → ۳٬۱۸۳، رشد ۱۶٫۶٪
- Conversion: ۵۷٫۷۷٪ → ۳۶٫۷۶٪، افت ۲۱٫۰۱ واحد درصد
- Volume موفق: ۱۳٫۷۸ → ۱۰٫۴۲ میلیارد ریال، افت ۲۴٫۴٪
- Average ticket: ۸٫۷۴ → ۸٫۹۱ میلیون ریال، رشد؛ پس Ticket عامل افت نیست
- NoAttempt: ۱۰٫۹۹٪ → ۳۹٫۴۹٪؛ عامل غالب و قابل بررسی
- Scenario محافظه‌کارانه: اگر NoAttempt به نرخ May برگردد و Conversion Sessionهای attempted ثابت بماند، حدود ۵۵۱ خرید و حدود ۴٫۹ میلیارد ریال حجم موفق بالقوه بازیابی می‌شود. این Estimate است، نه تضمین یا ادعای علّی.

## 10. Success Criteria

- پذیرنده در کمتر از ۱۰ ثانیه مشکل و اقدام اول را بفهمد.
- هر عدد امتیازآور با حداکثر دو Interaction به Evidence برسد.
- M275 story روی Mobile و Desktop بدون Scroll پیچیده قابل Demo باشد.
- هیچ KPI attempt-level به‌عنوان session-level نمایش داده نشود.
- Judge با `npm install && npm run dev` نسخه Demo را اجرا کند.

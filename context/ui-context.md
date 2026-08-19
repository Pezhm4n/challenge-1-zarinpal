# UI Context — نبض زرین

## Direction

رابط باید شبیه ابزار تصمیم‌گیری مالی قابل اعتماد باشد، نه Dashboard تزئینی یا AI template. زبان اصلی فارسی، جهت RTL و لحن مستقیم و غیرتکنیکال است.

## Information Hierarchy

1. «چه اتفاقی افتاده؟»
2. «اثر آن چقدر است؟»
3. «چه کاری انجام بدهم؟»
4. «چقدر مطمئنیم؟»
5. «چطور محاسبه شد؟»

Action card قبل از Chart نمایش داده شود. Raw data و Formula در Evidence Drawer سطح دوم قرار گیرند.

## Visual Language

- Background روشن و خنثی با سطح‌های محدود.
- Accent اصلی زرد گرم نزدیک هویت زرین‌پال، با متن تیره و Contrast معتبر.
- آبی تیره برای اطلاعات/اعتماد؛ سبز فقط outcome مثبت؛ قرمز فقط risk/error.
- Gradient، Glassmorphism، Neon، Bento تزئینی، Orb، Dot grid و Sparkle ممنوع.
- Border و Shadow کم و هدفمند؛ Radius متوسط، نه pill روی همه چیز.
- Icon فقط برای معنی عملی؛ Emoji جای Icon ممنوع.

## Typography

- فارسی: System stack سازگار با `Vazirmatn` در صورت اضافه‌شدن local/web-safe؛ وابستگی Font خارجی نباید Build را بشکند.
- اعداد و KPI با tabular numerals در صورت امکان.
- Heading کوتاه؛ اصطلاح فنی با توضیح ساده.
- از عبارت تضمینی مانند «حتماً ۴٫۹ میلیارد درآمد می‌گیرید» استفاده نشود؛ «پتانسیل برآوردی» نوشته شود.

## Semantic Tokens

- `background`, `foreground`, `card`, `muted`, `border`
- `primary`: action اصلی
- `secondary`: filters/navigation
- `destructive`: error/risk
- وضعیت Insight: `opportunity`, `warning`, `stable`, `insufficient-data` از Variant/Token مشترک، نه رنگ hardcoded.

## Core Components

- App shell + mobile header
- Merchant selector و period selector
- Insight Card کامل: title, finding, impact, action, confidence, evidence trigger
- Evidence Drawer در Desktop و Drawer/Sheet مناسب Mobile
- Metric decomposition row
- Accessible chart wrapper
- Data quality alert
- Empty/insufficient sample state

قبل از ساخت، shadcn search/docs اجرا شود. Componentهای محتمل: Card، Badge، Button، Select/Combobox، Sheet/Drawer، Tabs، Table، Alert، Tooltip، Chart، Skeleton، Empty.

## Responsive Rules

- Mobile baseline: 390×844؛ Desktop baseline: 1440×900.
- Navigation در Mobile compact؛ Action اول بدون horizontal scroll دیده شود.
- جدول Evidence در Mobile به key/value rows تبدیل شود.
- Chart labelها truncate نشوند؛ در صورت کمبود فضا summary جایگزین شود.
- Touch target حداقل 44px.

## Accessibility

- Contrast حداقل WCAG AA.
- تمام Triggerها نام accessible داشته باشند.
- Color تنها حامل status نباشد؛ label/icon هم استفاده شود.
- Focus visible، heading order و screen-reader summary برای Chart.
- Locale و `dir=rtl` در root ثابت است.

## Content Examples

خوب:

```text
افت فروش از کم‌شدن تقاضا نیست
Sessionها ۱۶٫۶٪ بیشتر شده‌اند، اما ۳۹٫۵٪ قبل از ورود به پرداخت متوقف شده‌اند.
اقدام: مسیر انتقال از Checkout به درگاه را برای تغییرات June بررسی کنید.
پتانسیل برآوردی: ۴٫۹ میلیارد ریال
```

بد:

```text
Conversion پایین است. برای جزئیات نمودار را بررسی کنید.
```

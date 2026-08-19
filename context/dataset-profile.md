# Dataset Profile

این Profile روی کل فایل `challenge_data.csv` با DuckDB انجام شده است؛ Sampling استفاده نشده است.

## Shape و بازه

| مورد | مقدار |
|---|---:|
| Attempt rows | 2,213,289 |
| Sessions | 2,062,839 |
| Merchants | 343 |
| Terminals | 348 |
| Categories | 5 |
| Anonymous payer cards | 402,173 |
| Date range | 2026-01-01 تا 2026-06-30 |

## Grain و Lifecycle

- هر ردیف یک تلاش یا state پرداخت است.
- `try_seq=0` برای ۲۶۳٬۹۳۶ Session دیده می‌شود و با `NoAttempt` همراه است.
- Sessionها از نظر merchant/category/amount ثابت‌اند؛ تغییر amount یا merchant داخل Session مشاهده نشد.
- ۷۴٬۶۸۵ Session بیش از یک تلاش دارند.
- Success باید با `bool_or(try_status='Verified')` یا منطق مصوب Session-level محاسبه شود.

## Funnel

| شاخص | مقدار |
|---|---:|
| Verified sessions | 1,025,627 |
| Session verification rate | 49.72% |
| Retried sessions | 3.62% |
| Recovered after failed first try | 39,654 |
| Recovery among failed-first sessions | 3.68% |

Verification attempt اول ۵۴٫۸۱٪ است؛ تلاش‌های طولانی ۱۱+ فقط ۰٫۴۳٪ Verification دارند. این الگو امکان Insight «Retry fatigue» می‌دهد، اما اقدام باید با قابلیت واقعی پذیرنده تطبیق داده شود.

## Missingness ساختاری

| ستون | Null rows | تفسیر |
|---|---:|---|
| switch_response_code | 2,155,696 | فقط برخی failureها مقدار دارند |
| psp_code | 263,936 | عمدتاً NoAttempt |
| issuer_bank_code | 1,178,921 | عمدتاً تلاش غیرموفق/بدون بانک |
| payer_card_key | 1,178,921 | Retention فقط روی پرداخت‌های دارای کارت معتبر |
| verify_time_ms | 1,179,013 | فقط lifecycle مرتبط |
| verified_at | 1,125,164 | برای Sessionهای تأییدنشده طبیعی است |

Nullها نباید کورکورانه با صفر پر شوند.

## Amount و Fee

- Total verified volume: حدود ۵٫۱۶۵ تریلیون ریال
- Median verified amount: حدود ۷۵۹٬۰۰۰ ریال
- P95: حدود ۱۹٫۵ میلیون ریال
- Max: ۱٫۹۹۲۸ میلیارد ریال
- Median adjusted fee share: حدود ۰٫۴۵۵٪، اما فقط شاخص تعدیل‌شده و غیرواقعی است.

## Concentration

- Top 1 merchant: ۳۷٫۷۷٪ حجم موفق
- Top 5: ۷۲٫۳۹٪
- Top 10: ۸۲٫۴۲٪
- Median Session per merchant: ۷۰
- Max Session for one merchant: ۱٬۰۵۵٬۹۱۲

Benchmark ساده بدون minimum sample و کنترل size گمراه‌کننده است.

## Categories

| صنف | پذیرنده | Session | Verification |
|---|---:|---:|---:|
| خدمات شبکه/اینترنت | 53 | 1,285,002 | 54.61% |
| آموزش مجازی | 158 | 346,566 | 21.68% |
| کیف و کفش | 69 | 280,751 | 59.76% |
| آرایشی/بهداشتی | 38 | 94,914 | 46.74% |
| ارائه‌دهنده اینترنت | 25 | 55,606 | 65.81% |

## Customer Signal

- ۳۹۶٬۳۶۵ زوج merchant/card با خرید موفق وجود دارد.
- ۱۲۶٬۲۲۵ زوج حداقل دو خرید دارند؛ Repeat pair rate برابر ۳۱٫۸۵٪ است.
- Card ناشناس فقط Signal رفتاری است و امکان تماس/شناسه مشتری واقعی فراهم نمی‌کند.

## Default Demo Merchant M275

| ماه | Session | Verified | Conversion | Avg ticket | Volume | NoAttempt |
|---|---:|---:|---:|---:|---:|---:|
| May | 2,730 | 1,577 | 57.77% | 8.74m | 13.78b | 10.99% |
| June | 3,183 | 1,170 | 36.76% | 8.91m | 10.42b | 39.49% |

در June، ۱٬۲۵۷ Session NoAttempt با ارزش درخواست‌شده حدود ۱۰٫۳۳ میلیارد ریال وجود دارد. از ۱٬۹۲۶ Session واردشده به تلاش، ۱٬۱۷۰ موفق شده‌اند؛ attempted conversion حدود ۶۰٫۷۵٪ است. در نتیجه افت اصلی پیش از ورود به PSP رخ داده است.

## Data Quality Guardrails

- Minimum peer sample: حداقل ۱۰ پذیرنده واجد شرایط و حداقل ۱۰۰ Session برای هر پذیرنده.
- Outlier handling: Winsorized display/robust median؛ اصل داده تغییر نکند.
- Time comparison: periodهای هم‌اندازه و full-period؛ ماه ناقص Label شود.
- Evidence sample: raw sample محدود و ماسک‌شده؛ هیچ Card ID کامل در UI.
- Counterfactual: baseline، assumption و interval صریح؛ واژه «پتانسیل» نه «درآمد قطعی».

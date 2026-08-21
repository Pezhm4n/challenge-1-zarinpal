/**
 * Persian (Solar Hijri / Shamsi) Date & Time Formatting Utilities
 * Uses native Intl.DateTimeFormat with 'fa-IR-u-ca-persian'
 */

const persianDateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

const persianDateTimeFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const persianShortDateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

const persianMonthFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function parseDateInput(input: string | Date | undefined | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const str = input.trim();
  if (/^\d{4}-\d{2}$/.test(str)) {
    return new Date(`${str}-15T00:00:00Z`);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(`${str}T00:00:00Z`);
  }
  return new Date(str);
}

/**
 * Formats an ISO date string or Date object to full Persian date (e.g. "۱۱ تیر ۱۴۰۳")
 */
export function formatPersianDate(date: string | Date | undefined | null): string {
  try {
    const d = parseDateInput(date);
    if (isNaN(d.getTime())) return typeof date === "string" ? date : "";
    return persianDateFormatter.format(d);
  } catch {
    return typeof date === "string" ? date : "";
  }
}

/**
 * Formats an ISO date string or Date object to Persian date and time (e.g. "۱۱ تیر ۱۴۰۳، ساعت ۱۴:۲۵")
 */
export function formatPersianDateTime(date: string | Date | undefined | null): string {
  try {
    const d = parseDateInput(date);
    if (isNaN(d.getTime())) return typeof date === "string" ? date : "";
    return persianDateTimeFormatter.format(d);
  } catch {
    return typeof date === "string" ? date : "";
  }
}

/**
 * Formats an ISO date string to short numeric Persian date (e.g. "۱۴۰۳/۰۴/۱۱")
 */
export function formatPersianShortDate(date: string | Date | undefined | null): string {
  try {
    const d = parseDateInput(date);
    if (isNaN(d.getTime())) return typeof date === "string" ? date : "";
    return persianShortDateFormatter.format(d);
  } catch {
    return typeof date === "string" ? date : "";
  }
}

/**
 * Formats a month identifier (e.g. "2024-07") to Persian month and year (e.g. "تیر ۱۴۰۳")
 */
export function formatPersianMonth(monthStr: string | Date | undefined | null): string {
  try {
    const d = parseDateInput(monthStr);
    if (isNaN(d.getTime())) return typeof monthStr === "string" ? monthStr : "";
    const parts = persianMonthFormatter.formatToParts(d);
    const month = parts.find((p) => p.type === "month")?.value ?? "";
    const year = parts.find((p) => p.type === "year")?.value ?? "";
    return `${month} ${year}`.trim();
  } catch {
    return typeof monthStr === "string" ? monthStr : "";
  }
}

/**
 * Formats a period ({ from: string, to: string }) to Persian date range (e.g. "۱۱ خرداد تا ۹ تیر ۱۴۰۵")
 */
export function formatPersianPeriod(
  period: { from: string; to: string } | undefined | null,
): string {
  if (!period) return "";
  try {
    const fromDate = parseDateInput(period.from);
    const toDate = parseDateInput(period.to);
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return `${formatPersianDate(period.from)} تا ${formatPersianDate(period.to)}`;
    }

    const fromParts = persianDateFormatter.formatToParts(fromDate);
    const toParts = persianDateFormatter.formatToParts(toDate);

    const fromYear = fromParts.find((p) => p.type === "year")?.value;
    const toYear = toParts.find((p) => p.type === "year")?.value;
    const fromMonth = fromParts.find((p) => p.type === "month")?.value;
    const toMonth = toParts.find((p) => p.type === "month")?.value;
    const fromDay = fromParts.find((p) => p.type === "day")?.value;
    const toDay = toParts.find((p) => p.type === "day")?.value;

    if (fromYear && toYear && fromYear === toYear) {
      if (fromMonth && toMonth && fromMonth === toMonth) {
        return `${fromDay} تا ${toDay} ${toMonth} ${toYear}`;
      }
      return `${fromDay} ${fromMonth} تا ${toDay} ${toMonth} ${toYear}`;
    }

    return `${formatPersianDate(period.from)} تا ${formatPersianDate(period.to)}`;
  } catch {
    return `${formatPersianDate(period.from)} تا ${formatPersianDate(period.to)}`;
  }
}

/**
 * Formats a period and optional data coverage note to concise Persian (e.g. "۱۱ خرداد تا ۹ تیر ۱۴۰۵ (داده تا ۱ تیر)")
 */
export function formatActionCenterPeriodLabel(
  period: { from: string; to: string; labelFa?: string },
  dataCoverage?: { lastCreatedAt?: string },
): string {
  const periodText = formatPersianPeriod(period);
  if (dataCoverage?.lastCreatedAt) {
    try {
      const lastD = parseDateInput(dataCoverage.lastCreatedAt.slice(0, 10));
      const lastParts = persianDateFormatter.formatToParts(lastD);
      const lastDay = lastParts.find((p) => p.type === "day")?.value;
      const lastMonth = lastParts.find((p) => p.type === "month")?.value;
      const lastDate = lastDay && lastMonth ? `${lastDay} ${lastMonth}` : formatPersianDate(dataCoverage.lastCreatedAt.slice(0, 10));
      return `${periodText} (داده تا ${lastDate})`;
    } catch {
      const lastDate = formatPersianDate(dataCoverage.lastCreatedAt.slice(0, 10));
      return `${periodText} (داده تا ${lastDate})`;
    }
  }
  return periodText;
}

const domainReplacements: Array<[RegExp, string]> = [
  // Full English / academic sentences & controls
  [/eventual_verified از Loader مشترک معتبر دریافت می‌شود\.?/gi, "وضعیت موفقیت پرداخت از منبع داده‌های معتبر تاییدشده استخراج شده است."],
  [/Baseline is the comparison-period NoAttempt share/gi, "خط مبنا: سهم انصراف خریداران در دوره قبل"],
  [/Attempted conversion is fixed at the current-period observed rate/gi, "نرخ موفقیت پرداخت تلاش‌ها مطابق دوره جاری ثابت در نظر گرفته شده است"],
  [/Average ticket uses current-period Verified sessions only/gi, "میانگین سبد خرید فقط بر اساس پرداخت‌های موفق دوره جاری محاسبه شده است"],
  [/Minimum 100 attempted sessions per PSP and 25 per PSP×amount-band/gi, "حداقل ۱۰۰ تلاش برای هر درگاه و ۲۵ تلاش در هر بازه مبلغی"],
  [/Amount bands are merchant-period quartiles:\s*q1=(\d+),\s*q2=(\d+),\s*q3=(\d+)\s*rial/gi, "دسته‌بندی مبالغ بر اساس چارک‌های دوره: چارک اول=$1، میانه=$2، چارک سوم=$3 ریال"],
  [/Amount bands are merchant-period quartiles/gi, "دسته‌بندی مبالغ بر اساس چارک‌های دوره"],
  [/Session-level deduplication/gi, "یکتاسازی در سطح سفارش"],
  [/Nested stage invariant/gi, "رعایت توالی مراحل قیف پرداخت"],
  [/Amount once per unique session_key/gi, "محاسبه یکباره مبلغ هر سفارش"],
  
  // Specific technical formulas & calculation phrases
  [/سفارش بالقوه دقیق × متوسط amount Sessionهای Verified جاری/g, "سفارش بالقوه دقیق × میانگین مبلغ خریدهای موفق جاری"],
  [/سفارش بالقوه دقیق × متوسط amount سفارش‌های تاییدشده جاری/g, "سفارش بالقوه دقیق × میانگین مبلغ خریدهای موفق جاری"],
  [/MAX\(0,\s*NoAttempt جاری − Session جاری × سهم مبنا\)\s*×\s*نرخ تبدیل attempted/g, "حداکثر(۰، انصراف جاری − کل سفارش‌ها × سهم مبنا) × درصد پرداخت‌های موفق"],
  [/Verified Session ÷ attempted Session در cell × ۱۰۰/g, "پرداخت موفق ÷ کل تلاش‌ها در این بازه × ۱۰۰"],
  [/حجم موفق خریداران بازگشتی ÷ کل حجم موفق دارای شناسه (?:کارت خریدار \(Card\)|Card) × ۱۰۰/g, "مبلغ خرید مشتریان بازگشتی ÷ کل مبلغ خریدهای دارای شناسه کارت × ۱۰۰"],
  [/سهم دوره جاری منهای سهم دوره مقایسه/g, "تغییر سهم خریداران بازگشتی نسبت به دوره قبل"],
  [/Cardهای فعال Cohort در ماه موردنظر ÷ اندازه اولیه Cohort × ۱۰۰/g, "خریداران فعال در ماه موردنظر ÷ تعداد اولیه خریداران گروه × ۱۰۰"],
  [/۱۰۰ × \(تعداد مقادیر کمتر \+ نصف تعداد مقادیر مساوی\) ÷ تعداد کسب‌وکارهای هم‌صنف/g, "۱۰۰ × (تعداد هم‌صنفان با مقدار کمتر + نصف موارد مساوی) ÷ کل هم‌صنفان"],
  [/درصد تغییر = \(مقدار جاری − مقدار مقایسه\) ÷ مقدار مقایسه؛ سهم عامل با میانگین اثر آن در همه ترتیب‌های تغییر محاسبه می‌شود/g, "سهم هر عامل به صورت مستقل و با حذف اثر سایر متغیرها بر فروش سنجیده شده است."],
  [/COUNT\(DISTINCT session_key\) پس از اعمال فیلتر Stage/g, "شمارش سفارش‌های یکتا در این مرحله از قیف"],
  [/SUM\(normalized_sessions\.amount_rial\)\s*(?:پس از فیلتر Stage|برای NoAttempt|برای انصراف قبل از درگاه \(NoAttempt\)|)/g, "مجموع مبلغ سفارش‌ها"],
  [/SUM\(normalized_sessions\.amount_rial\)/g, "مجموع مبلغ سفارش‌ها"],
  
  // Assumption & Limitation sentences
  [/Amount در سطح سفارش ثابت و به ریال است\.?/g, "مبالغ در سطح هر سفارش ثبت شده و واحد آن‌ها ریال است."],
  [/کارت خریدار \(Card\) ناشناس معادل هویت کامل مشتری یا راه تماس نیست\.?/g, "کارت بانکی خریدار به صورت ناشناس ثبت شده و معادل هویت یا شماره تماس مشتری نیست."],
  [/رفتار کارت خریدار \(Card\) در پذیرنده‌های دیگر بررسی یا نمایش داده نمی‌شود\.?/g, "رفتار خرید مشتریان فقط در همین فروشگاه بررسی شده و اطلاعات فروشگاه‌های دیگر محفوظ است."],
  [/سفارش‌های موفق فاقد (?:payer_card_key|شناسه کارت) در (?:Customer denominatorها|مخرج کسر مشتریان) وارد نمی‌شوند\.?/g, "تراکنش‌های موفقی که شناسه کارت در آن‌ها ثبت نشده، در محاسبات مشتریان لحاظ نمی‌شوند."],
  [/Bucketها غیرهم‌پوشان‌اند:\s*Card اول،\s*رتبه ۲ تا ۵ و سایر Cardها\.?/g, "دسته‌ها کاملاً مجزا هستند: خریدار اول، خریداران رتبه ۲ تا ۵ و سایر خریداران."],
  [/تعریف کارت بازگشتی و پوشش کارت در هر دو دوره یکسان است\.?/g, "معیار شناسایی خریدار بازگشتی در هر دو دوره کاملاً یکسان و منطبق است."],
  [/هر سفارش موفق فقط یک بار شمرده می‌شود\.?/g, "هر تراکنش خرید موفق دقیقاً یک بار در آمار لحاظ شده است."],
  [/NoAttempt مازاد تا خط مبنای دوره قبل کاهش می‌یابد\.?/g, "در این برآورد فرض شده درصد انصراف قبل از درگاه به سطح دوره قبل برگردد."],
  [/NoAttempt مازاد بر خط مبنای دوره قبل در نرخ تبدیل attempted جاری ضرب شده است\.?/g, "انصراف مازاد قبل از درگاه در نرخ پرداخت موفق دوره جاری ضرب شده است."],
  [/نرخ تبدیل attempted و متوسط مبلغ Verified ثابت فرض می‌شوند\.?/g, "در این برآورد فرض شده نرخ موفقیت پرداخت و میانگین سبد خرید ثابت بماند."],
  [/فروش و مبلغ موفق فقط از try_status=Verified محاسبه شده‌اند\.?/g, "آمار فروش و مبالغ فقط از تراکنش‌های کاملاً موفق و تاییدشده محاسبه شده‌اند."],
  [/این مقایسه توصیفی است و رابطه علّی PSP با موفقیت را اثبات نمی‌کند\.?/g, "این مقایسه صرفاً توصیفی بوده و عملکرد کیفی درگاه‌های متصل را نشان می‌دهد."],
  [/این مقایسه به حداقل نمونه (?:PSP=۱۰۰|PSP=100) و (?:cell=۲۵|cell=25) نرسیده یا PSP مفقود است[؛;]\s*بنابراین نرخ،\s*رتبه و پیشنهاد عددی نمایش داده نمی‌شود\.?/g, "این مقایسه به حداقل نمونه ۱۰۰ تلاش برای درگاه و ۲۵ تلاش در این بازه مبلغی نرسیده است؛ بنابراین نرخ، رتبه و پیشنهاد عددی نمایش داده نمی‌شود."],
  [/سناریو غیرعلّی، غیرتضمینی و بدون کنترل مداخله‌های هم‌زمان است\.?/g, "این سناریو یک برآورد احتمالی برای تصمیم‌گیری است و تضمین قطعی فروش نیست."],
  [/مسیر Checkout تا آغاز درگاه را پایش و نرخ NoAttempt دوره بعد را با همین خط مبنا مقایسه کنید\.?/g, "فرآیند ثبت سفارش تا ورود به درگاه را ساده‌تر کنید تا انصراف قبل از پرداخت کاهش یابد."],
  [/یک کمپین بازگشت را در CRM خود اجرا و همین شاخص را در دوره بعد مقایسه کنید\.?/g, "برای مشتریان قدیمی یک کمپین بازگشت (پیامک، پیشنهاد ویژه یا تخفیف) اجرا و تغییرات را رصد کنید."],
  [/عدد قطعی است اما فقط رفتار Cardهای ناشناس دارای پوشش را می‌سنجد\.?/g, "این محاسبه دقیق است اما صرفاً مشتریانی را بررسی می‌کند که با کارت بانکی ثبت شده‌اند."],
  [/فقط (\d+) Card فعال دارای شناسه در این دوره دیده شد\.?/g, "تنها $1 خریدار دارای کارت فعال در این دوره ثبت شده است."],
  [/پرتراکنش‌ترین Card ناشناس ([\d\.]+)٪ از مبلغ card-known دوره را ساخته است\.?/g, "پرتراکنش‌ترین خریدار $1٪ از کل مبلغ فروش دارای کارت را ایجاد کرده است."],
  [/ریسک تمرکز را در برنامه وفاداری بسنجید؛ فهرست تماس یا هویت مشتری از این داده استخراج نمی‌شود\.?/g, "ریسک وابستگی به خریداران عمده را مدیریت کنید؛ هویت یا اطلاعات تماس از این داده استخراج نمی‌شود."],
  [/این خروجی سناریوی برآوردی است؛ رابطه علّی یا تضمین فروش نیست\.?/g, "این عدد یک برآورد احتمالی است و به منزله تضمین قطعی درآمد نیست."],
  [/Paid فقط عبور از Stage درگاه\/بانک است و Verified یا فروش موفق محسوب نمی‌شود\.?/g, "عبور از درگاه به منزله پرداخت موفق نیست و فقط تراکنش‌های تاییدشده نهایی، موفق محسوب شده‌اند."],
  [/از Reversed هیچ موفقیت یا Stage جدیدی استنباط نشده است\.?/g, "تراکنش‌های برگشت‌خورده در آمار فروش موفق محاسبه نشده‌اند."],
  [/پس از Deduplicate کردن Retryها، هر session_key حداکثر یک‌بار در این Stage شمرده شده است\.?/g, "تلاش‌های تکراری تجمیع شده و هر سفارش مستقل حداکثر یک بار در این مرحله لحاظ شده است."],
  [/amount_rial از normalized_sessions گرفته شده و برای هر Session در این Stage دقیقاً یک‌بار جمع شده است\.?/g, "مبلغ هر سفارش دقیقاً یک بار و بدون دوباره‌شماری محاسبه شده است."],
  [/رتبه یک معیار به‌تنهایی تصویر کامل عملکرد را نشان نمی‌دهد\.?/g, "جایگاه در یک شاخص به‌تنهایی نشان‌دهنده کل وضعیت نیست و باید سایر شاخص‌ها نیز بررسی شوند."],
  [/برای جلوگیری از آستانهٔ ساختگی، مبلغ کل و میانگین مبلغ جداگانه گزارش می‌شوند و فیلتر مستقل اندازه اعمال نشده است\.?/g, "برای مقایسه دقیق‌تر، مبلغ کل فروش و میانگین مبلغ هر خرید جداگانه در نظر گرفته شده‌اند."],
  [/این تفکیک توصیفی است و ادعای علیت ندارد\.?/g, "این تفکیک صرفاً آماری بوده و رابطه علت و معلولی را اثبات نمی‌کند."],
  [/فقط Cohortهای حداقل (\d+) (?:Card|خریدار) نمایش داده می‌شوند\.?/g, "فقط گروه‌های مشتری دارای حداقل $1 خریدار تحلیل می‌شوند."],
  [/([\d\.,]+٪)\s*از سفارش‌های موفق این بازه شناسه کارت ناشناس قابل استفاده دارند[؛;]\s*KPIهای مشتری فقط بر همین پوشش متکی‌اند\.?/g, "تمامی سفارش‌های موفق این دوره ($1) دارای شناسه کارت معتبر هستند؛ شاخص‌های وفاداری بر همین مبنا محاسبه شده‌اند."],
  [/KPIهای مشتری فقط بر همین پوشش متکی‌اند\.?/g, "شاخص‌های وفاداری مشتریان بر مبنای سفارش‌های دارای کارت بانکی محاسبه شده‌اند."],
  
  // Labels & Titles
  [/اندازه Cohort اولیه/g, "اندازه گروه مشتریان اولیه (Cohort)"],
  [/اندازه اولیه Cohort/g, "اندازه اولیه گروه مشتریان"],
  [/Retention ماهانه Cohort/g, "ماندگاری ماهانه خریداران (Cohort)"],
  [/Retention Cohort/g, "ماندگاری گروه خریداران"],
  [/Cardهای بازگشته در ماه/g, "خریداران بازگشته در ماه"],
  [/Cardهای فعال Cohort/g, "خریداران فعال گروه"],
  [/امتیاز رتبه‌ای با احتساب نصف مقادیر مساوی/g, "امتیاز رتبه بین هم‌صنفان"],
  [/تعداد کسب‌وکارهای هم‌صنف واجد شرایط/g, "تعداد فروشگاه‌های هم‌صنف بررسی‌شده"],
  [/درصد هم‌صنفان با (.+) پایین‌تر/g, "درصد هم‌صنفان با $1 کمتر از شما"],
  [/سهم کارت بازگشتی دوره جاری/g, "سهم خریداران بازگشتی در دوره جاری"],
  [/سهم کارت بازگشتی دوره مقایسه/g, "سهم خریداران بازگشتی در دوره قبل"],
  [/سهم کارت بازگشتی/g, "سهم خریداران بازگشتی"],
  [/سهم کارت فعال/g, "سهم خریداران فعال"],
  [/نرخ Verified در سگمنت PSP و مبلغ/g, "نرخ پرداخت موفق در درگاه پرداخت و بازه مبلغی"],
  [/سگمنت PSP و مبلغ/g, "درگاه پرداخت و بازه مبلغی"],
  [/PSP-(\d+)\|upper-middle/g, "درگاه $1 | بازه مبلغی میانی بالا"],
  [/PSP-(\d+)\|lower-middle/g, "درگاه $1 | بازه مبلغی میانی پایین"],
  [/PSP-(\d+)\|upper/g, "درگاه $1 | بازه مبلغی بالا"],
  [/PSP-(\d+)\|lower/g, "درگاه $1 | بازه مبلغی پایین"],
  [/PSP-۰(\d+)\|upper-middle/g, "درگاه ۰$1 | بازه مبلغی میانی بالا"],
  [/PSP-۰(\d+)\|lower-middle/g, "درگاه ۰$1 | بازه مبلغی میانی پایین"],
  [/PSP-۰(\d+)\|upper/g, "درگاه ۰$1 | بازه مبلغی بالا"],
  [/PSP-۰(\d+)\|lower/g, "درگاه ۰$1 | بازه مبلغی پایین"],
  [/upper-middle/g, "میانی بالا"],
  [/lower-middle/g, "میانی پایین"],
  [/(?<![\p{L}\u200c])ژانویه(?![\p{L}\u200c])/gu, "دی"],
  [/(?<![\p{L}\u200c])فوریه(?![\p{L}\u200c])/gu, "بهمن"],
  [/(?<![\p{L}\u200c])مارس(?![\p{L}\u200c])/gu, "اسفند"],
  [/(?<![\p{L}\u200c])آوریل(?![\p{L}\u200c])/gu, "فروردین"],
  [/(?<![\p{L}\u200c])مه(?![\p{L}\u200c])/gu, "اردیبهشت"],
  [/(?<![\p{L}\u200c])ژوئن(?![\p{L}\u200c])/gu, "خرداد"],
  [/(?<![\p{L}\u200c])(?:ژوئیه|جولای)(?![\p{L}\u200c])/gu, "تیر"],
  [/(?<![\p{L}\u200c])(?:اوت|آگوست)(?![\p{L}\u200c])/gu, "مرداد"],
  [/(?<![\p{L}\u200c])سپتامبر(?![\p{L}\u200c])/gu, "شهریور"],
  [/(?<![\p{L}\u200c])اکتبر(?![\p{L}\u200c])/gu, "مهر"],
  [/(?<![\p{L}\u200c])نوامبر(?![\p{L}\u200c])/gu, "آبان"],
  [/(?<![\p{L}\u200c])دسامبر(?![\p{L}\u200c])/gu, "آذر"],
  
  // Baseline identifiers & phrases
  [/merchant-period-verification-rate/g, "میانگین نرخ پرداخت موفق در کل دوره"],
  [/comparison-period-no-attempt-share/g, "سهم انصراف خریداران در دوره قبل"],
  [/same-amount-band/g, "بازه مشابه مبلغ خرید"],
  [/same-merchant-prior-sessions/g, "سفارش‌های قبلی در همین فروشگاه"],
  [/comparison-returning-share/g, "سهم خریداران بازگشتی در دوره قبل"],
  [/same-category-peer-median-(\w+)/g, "میانه هم‌صنفان در بازار"],
  [/previous-period-(\w+)/g, "دوره قبل"],
  
  // Common terms and technical keywords
  [/eventual_verified/g, "وضعیت پرداخت نهایی"],
  [/payer_card_key/g, "شناسه کارت بانکی"],
  [/Customer denominatorها/g, "محاسبات آماری مشتریان"],
  [/NoAttempt/g, "انصراف قبل از درگاه (NoAttempt)"],
  [/Sessionهای Verified/g, "خریدهای موفق"],
  [/Sessionهای attempted/g, "تلاش‌های پرداخت"],
  [/Sessionهای Stage/g, "سفارش‌های مرحله"],
  [/Sessionهای/g, "سفارش‌های"],
  [/Session/g, "سفارش"],
  [/Conversion/g, "نرخ پرداخت موفق (Conversion)"],
  [/Cardهای بازگشتی/g, "خریداران بازگشتی"],
  [/Cardهای فعال/g, "خریداران فعال"],
  [/Cardهای/g, "کارت‌های خریدار"],
  [/Card/g, "کارت خریدار"],
  [/Cohort/g, "گروه مشتریان (Cohort)"],
  [/try_status\s*=\s*Verified/g, "وضعیت تلاش = تاییدشده"],
  [/try_status/g, "وضعیت تلاش"],
  [/session_status/g, "وضعیت سفارش"],
  [/try_seq/g, "شماره تلاش"],
  [/amount_band/g, "بازه مبلغی"],
  [/ZERO_DENOMINATOR/g, "داده آماری ناکافی"],
  [/MISSING_PSP/g, "عدم تشخیص درگاه"],
  [/NON_CAUSAL_SCENARIO/g, "برآورد تخمینی"],
  [/card-known/g, "دارای کارت مشخص"],
  [/Checkout/g, "صفحه تسویه حساب"],
  [/CRM/g, "سیستم مشتریان (CRM)"],
];

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

/**
 * Localizes embedded numbers (including negative numbers and percentages) and domain terms in Persian text
 * and enforces correct BiDi directional isolation so negative signs stay on the correct side in RTL.
 */
export function localizePersianText(text: string | undefined | null): string {
  if (!text) return "";
  let processed = text;
  for (const [pattern, replacement] of domainReplacements) {
    processed = processed.replace(pattern, replacement);
  }

  return processed.replace(/([+-]?\d+(?:,\d+)*(?:\.\d+)?)(%|٪)?/g, (_match, num, pct) => {
    const isNegative = num.startsWith("-");
    const isPositive = num.startsWith("+");
    const cleanNum = num.replace(/^[+-]/, "");
    const localized = cleanNum
      .replace(/\d/g, (digit: string) => persianDigits[Number(digit)])
      .replace(/\./g, "٫");
    const pctSign = pct ? "٪" : "";

    if (isNegative) {
      return `\u200E-${localized}${pctSign}\u200E`;
    }
    if (isPositive) {
      return `\u200E+${localized}${pctSign}\u200E`;
    }
    return `${localized}${pctSign}`;
  });
}



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
 * Formats a period ({ from: string, to: string }) to Persian date range (e.g. "۱۱ تیر ۱۴۰۳ تا ۱۰ مرداد ۱۴۰۳")
 */
export function formatPersianPeriod(
  period: { from: string; to: string } | undefined | null,
): string {
  if (!period) return "";
  return `${formatPersianDate(period.from)} تا ${formatPersianDate(period.to)}`;
}

/**
 * Formats a period and optional data coverage note to Persian (e.g. "۱۱ خرداد ۱۴۰۵ تا ۹ تیر ۱۴۰۵ (داده تا ۱ تیر ۱۴۰۵)")
 */
export function formatActionCenterPeriodLabel(
  period: { from: string; to: string; labelFa?: string },
  dataCoverage?: { lastCreatedAt?: string },
): string {
  const periodText = formatPersianPeriod(period);
  if (dataCoverage?.lastCreatedAt) {
    const lastDate = formatPersianDate(dataCoverage.lastCreatedAt.slice(0, 10));
    return `${periodText} (داده تا ${lastDate})`;
  }
  return periodText;
}

const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

/**
 * Localizes embedded numbers (including negative numbers and percentages) in Persian text
 * and enforces correct BiDi directional isolation so negative signs stay on the correct side in RTL.
 */
export function localizePersianText(text: string | undefined | null): string {
  if (!text) return "";
  return text.replace(/([+-]?\d+(?:,\d+)*(?:\.\d+)?)(%|٪)?/g, (_match, num, pct) => {
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



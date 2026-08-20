import { Clock3, TrendingDown, TrendingUp } from "lucide-react";

import type { TimeWindow } from "../types";

const weekdays: Record<number, string> = {
  1: "دوشنبه",
  2: "سه‌شنبه",
  3: "چهارشنبه",
  4: "پنج‌شنبه",
  5: "جمعه",
  6: "شنبه",
  7: "یکشنبه",
};

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

export function TimeWindowOpportunities({ windows }: { windows: TimeWindow[] }) {
  if (windows.length === 0) {
    return (
      <section className="grid gap-2 rounded-xl border bg-card p-4" aria-live="polite">
        <Clock3 aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 className="font-medium">نمونه کافی برای بازه زمانی وجود ندارد</h2>
        <p className="text-sm text-muted-foreground">
          فقط بازه‌هایی با حداقل ۲۵ Session نمایش داده می‌شوند.
        </p>
      </section>
    );
  }

  const ranked = [...windows].sort(
    (first, second) => second.liftVsBaselinePct - first.liftVsBaselinePct,
  );

  return (
    <section aria-labelledby="timing-title" className="grid gap-4">
      <header className="grid gap-1">
        <p className="text-sm font-medium text-muted-foreground">فرصت‌های زمانی</p>
        <h2 id="timing-title" className="text-xl font-semibold">
          بازه‌های قابل بررسی، نه ادعای علت
        </h2>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {ranked.map((window) => {
          const positive = window.liftVsBaselinePct >= 0;
          return (
            <article
              key={`${window.weekday}-${window.hour}`}
              className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-muted">
                  <Clock3 aria-hidden="true" className="size-5" />
                </div>
                <div className="grid gap-1">
                  <h3 className="font-medium">
                    {weekdays[window.weekday] ?? `روز ${window.weekday}`}، ساعت {numberFormatter.format(window.hour)}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {numberFormatter.format(window.sessions)} Session · نرخ موفقیت {numberFormatter.format(window.verifyPct)}٪
                  </p>
                </div>
              </div>
              <div
                className={
                  positive
                    ? "flex items-center gap-1 text-sm font-semibold"
                    : "flex items-center gap-1 text-sm font-semibold text-destructive"
                }
              >
                {positive ? (
                  <TrendingUp aria-hidden="true" className="size-4" />
                ) : (
                  <TrendingDown aria-hidden="true" className="size-4" />
                )}
                {numberFormatter.format(window.liftVsBaselinePct)}٪
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}


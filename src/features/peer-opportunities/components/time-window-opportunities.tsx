import { Calculator, Clock3, TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EvidenceReference, TimeWindow } from "../types";

const weekdays: Record<number, string> = {
  1: "دوشنبه",
  2: "سه‌شنبه",
  3: "چهارشنبه",
  4: "پنج‌شنبه",
  5: "جمعه",
  6: "شنبه",
  7: "یکشنبه",
};

const weekdayOrder = [1, 2, 3, 4, 5, 6, 7];
const hours = Array.from({ length: 24 }, (_, index) => index);

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});
const integerFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
});

function PercentageValue({ value }: { value: number }) {
  return (
    <span dir="ltr" className="inline-flex items-baseline gap-0.5 tabular-nums">
      <bdi>{numberFormatter.format(Math.abs(value))}</bdi>
      <span>٪</span>
    </span>
  );
}

function LiftSummary({ value }: { value: number }) {
  if (value === 0) {
    return <span>هم‌سطح نرخ مبنا</span>;
  }

  return (
    <span dir="rtl" className="inline-flex items-baseline gap-x-1">
      <PercentageValue value={value} />
      <span>{value > 0 ? "بالاتر از نرخ مبنا" : "پایین‌تر از نرخ مبنا"}</span>
    </span>
  );
}

/** Diverging success/destructive ramp by |lift|; color is never the only
 * signal because data cells always render the number too. */
function heatCellTone(lift: number): string {
  const magnitude = Math.abs(lift);
  if (lift > 0) {
    if (magnitude >= 40) return "bg-success text-primary-foreground font-bold";
    if (magnitude >= 15) return "bg-success/60 text-foreground font-semibold";
    return "bg-success/30 text-foreground font-semibold";
  }
  if (lift < 0) {
    if (magnitude >= 40) return "bg-destructive text-primary-foreground font-bold";
    if (magnitude >= 15) return "bg-destructive/60 text-foreground font-semibold";
    return "bg-destructive/30 text-foreground font-semibold";
  }
  return "bg-muted text-foreground font-semibold";
}

function GoldenHoursHeatmap({
  windows,
  evidenceByScope,
  onEvidenceRequest,
}: {
  windows: TimeWindow[];
  evidenceByScope: Record<string, EvidenceReference>;
  onEvidenceRequest: (evidenceId: string) => void;
}) {
  const windowMap = new Map(
    windows.map((window) => [`${window.weekday}:${window.hour}`, window]),
  );

  return (
    <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-border/60">
      <table className="w-full min-w-[52rem] border-collapse">
        <caption className="sr-only">
          نقشه حرارتی روز و ساعت‌های هفته؛ رنگ هر خانه فاصله نرخ موفقیت آن
          بازه از نرخ مبنا را نشان می‌دهد. خانه‌های خالی نمونه کافی ندارند.
        </caption>
        <thead>
          <tr className="bg-muted/60">
            <th
              scope="col"
              className="sticky start-0 z-10 bg-muted p-2 text-start text-xs font-bold text-foreground"
            >
              روز \ ساعت
            </th>
            {hours.map((hour) => (
              <th
                key={hour}
                scope="col"
                className="p-1 text-center text-xs font-medium tabular-nums text-muted-foreground"
              >
                {integerFormatter.format(hour)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekdayOrder.map((weekday) => (
            <tr key={weekday} className="border-t border-border/50">
              <th
                scope="row"
                className="sticky start-0 z-10 whitespace-nowrap bg-card p-2 text-start text-xs font-semibold text-foreground"
              >
                {weekdays[weekday]}
              </th>
              {hours.map((hour) => {
                const window = windowMap.get(`${weekday}:${hour}`);
                if (!window) {
                  return (
                    <td key={hour} className="p-0.5">
                      <div
                        aria-hidden="true"
                        className="grid h-8 min-w-8 place-items-center rounded-md bg-muted/30 text-xs text-muted-foreground"
                      >
                        ·
                      </div>
                    </td>
                  );
                }
                const evidence =
                  evidenceByScope[`timing:${weekday}:${hour}`];
                const ariaLabel = `${weekdays[weekday]} ساعت ${integerFormatter.format(hour)}: نرخ موفقیت ${numberFormatter.format(window.verifyPct)}٪، ${numberFormatter.format(Math.abs(window.liftVsBaselinePct))}٪ ${window.liftVsBaselinePct >= 0 ? "بالاتر" : "پایین‌تر"} از نرخ مبنا با ${integerFormatter.format(window.sessions)} خریدار${evidence?.id ? ". برای روش محاسبه انتخاب کنید" : ""}`;
                return (
                  <td key={hour} className="p-0.5">
                    <button
                      type="button"
                      aria-label={ariaLabel}
                      disabled={!evidence?.id}
                      onClick={() =>
                        evidence?.id ? onEvidenceRequest(evidence.id) : undefined
                      }
                      className={cn(
                        "grid h-8 min-w-8 place-items-center rounded-md text-xs tabular-nums transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                        heatCellTone(window.liftVsBaselinePct),
                        evidence?.id && "cursor-pointer hover:scale-[1.06]",
                      )}
                    >
                      <span dir="ltr">
                        {window.liftVsBaselinePct > 0 ? "+" : window.liftVsBaselinePct < 0 ? "−" : ""}
                        {integerFormatter.format(Math.round(Math.abs(window.liftVsBaselinePct)))}٪
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TimeWindowOpportunities({
  windows,
  evidenceByScope,
  onEvidenceRequest,
  emptyMessage,
}: {
  windows: TimeWindow[];
  evidenceByScope: Record<string, EvidenceReference>;
  onEvidenceRequest: (evidenceId: string) => void;
  emptyMessage?: string;
}) {
  if (windows.length === 0) {
    return (
      <section className="grid gap-2 rounded-xl border bg-card p-4" aria-live="polite">
        <Clock3 aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 className="font-medium">نمونه کافی برای تحلیل ساعات خرید وجود ندارد</h2>
        <p className="text-sm text-muted-foreground">
          {emptyMessage ?? "فقط بازه‌هایی با حداقل ۲۵ پرداخت یکتا نمایش داده می‌شوند."}
        </p>
      </section>
    );
  }

  const ranked = [...windows].sort(
    (first, second) => second.liftVsBaselinePct - first.liftVsBaselinePct,
  );

  return (
    <section aria-labelledby="timing-title" className="grid gap-5">
      <header className="grid gap-1">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary w-fit">ساعات طلایی خرید</span>
        <h2 id="timing-title" className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-2xl">
          ساعت‌ها و روزهای مناسب برای بیشترین فروش
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          روز و ساعت‌هایی که احتمال پرداخت موفق مشتریان در صنف شما بالاتر است.
        </p>
      </header>

      <div className="grid gap-3">
        <GoldenHoursHeatmap
          windows={windows}
          evidenceByScope={evidenceByScope}
          onEvidenceRequest={onEvidenceRequest}
        />
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-xs bg-success/60" />
            بالاتر از نرخ مبنا
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-xs bg-destructive/60" />
            پایین‌تر از نرخ مبنا
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-xs bg-muted/40" />
            نمونه ناکافی
          </span>
          <span>
            در این دوره فقط {integerFormatter.format(windows.length)} بازه حداقل ۲۵ پرداخت یکتا داشت؛ بقیه خانه‌ها نمونه کافی ندارند و عددی برایشان ساخته نشده است.
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {ranked.map((window) => {
          const positive = window.liftVsBaselinePct > 0;
          const negative = window.liftVsBaselinePct < 0;
          const evidence =
            evidenceByScope[`timing:${window.weekday}:${window.hour}`];
          return (
            <article
              key={`${window.weekday}-${window.hour}`}
              className="grid min-w-0 gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:border-border hover:shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(10rem,auto)] sm:items-center"
            >
              <div className="flex min-w-0 items-start gap-3.5">
                <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                  <Clock3 aria-hidden="true" className="size-5" />
                </div>
                <div className="grid min-w-0 flex-1 gap-1.5">
                  <h3 className="text-base font-bold leading-6 text-foreground">
                    {weekdays[window.weekday] ?? `روز ${window.weekday}`}، ساعت{" "}
                    <bdi dir="ltr" className="tabular-nums">
                      {numberFormatter.format(window.hour)}
                    </bdi>
                  </h3>
                  <div className="grid gap-0.5 text-xs leading-5 text-muted-foreground">
                    <p>
                      تعداد کل خریداران:{" "}
                      <bdi dir="ltr" className="tabular-nums font-semibold text-foreground">
                        {numberFormatter.format(window.sessions)}
                      </bdi>
                    </p>
                    <p>نرخ این بازه: <PercentageValue value={window.verifyPct} /></p>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 border-t border-border/50 pt-3 text-start text-sm font-semibold sm:border-s sm:border-t-0 sm:ps-4 sm:pt-0">
                <span className="grid gap-1">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold w-fit",
                    positive ? "bg-success/10 text-success-foreground" : negative ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                  )}>
                    {positive ? (
                      <TrendingUp aria-hidden="true" className="size-3.5" />
                    ) : negative ? (
                      <TrendingDown aria-hidden="true" className="size-3.5" />
                    ) : (
                      <Clock3 aria-hidden="true" className="size-3.5" />
                    )}
                    <LiftSummary value={window.liftVsBaselinePct} />
                  </span>
                  {evidence?.baseline !== undefined ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      نرخ مبنا: <PercentageValue value={evidence.baseline} />
                    </span>
                  ) : null}
                </span>
                {evidence?.id ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-10 w-fit text-xs font-medium"
                    onClick={() => onEvidenceRequest(evidence.id)}
                  >
                    <Calculator aria-hidden="true" data-icon="inline-start" />
                    جزئیات محاسبه
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

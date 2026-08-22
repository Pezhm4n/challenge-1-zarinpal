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

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
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

      <div className="grid gap-4 md:grid-cols-2">
        {ranked.map((window) => {
          const positive = window.liftVsBaselinePct > 0;
          const negative = window.liftVsBaselinePct < 0;
          const evidence =
            evidenceByScope[`timing:${window.weekday}:${window.hour}`];
          return (
            <article
              key={`${window.weekday}-${window.hour}`}
              className={cn(
                "grid min-w-0 gap-4 rounded-2xl border bg-card p-5 shadow-xs transition-all duration-200 hover:shadow-sm sm:grid-cols-[minmax(0,1fr)_minmax(10rem,auto)] sm:items-center",
                positive && "border-success/35 hover:border-success/55",
                negative && "border-destructive/40 hover:border-destructive/60",
                !positive && !negative && "border-border/70 hover:border-border",
              )}
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
              <div
                className={
                  negative
                    ? "grid gap-3 border-t border-border/50 pt-3 text-start text-sm font-semibold text-destructive sm:border-s sm:border-t-0 sm:ps-4 sm:pt-0"
                    : "grid gap-3 border-t border-border/50 pt-3 text-start text-sm font-semibold sm:border-s sm:border-t-0 sm:ps-4 sm:pt-0"
                }
              >
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
                    className="min-h-9 w-fit text-xs font-medium"
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

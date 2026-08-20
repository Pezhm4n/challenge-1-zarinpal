import { Calculator, Clock3, TrendingDown, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
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
        <h2 className="font-medium">نمونه کافی برای بازه زمانی وجود ندارد</h2>
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
    <section aria-labelledby="timing-title" className="grid gap-4">
      <header className="grid gap-1">
        <p className="text-sm font-medium text-muted-foreground">فرصت‌های زمانی</p>
        <h2 id="timing-title" className="text-xl font-semibold">
          زمان‌های مناسب برای بررسی
        </h2>
        <p className="text-sm text-muted-foreground">
          این الگوها نشان می‌دهند کدام زمان‌ها را بررسی کنید؛ علت قطعی را نشان
          نمی‌دهند.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {ranked.map((window) => {
          const positive = window.liftVsBaselinePct >= 0;
          const evidence =
            evidenceByScope[`timing:${window.weekday}:${window.hour}`];
          return (
            <article
              key={`${window.weekday}-${window.hour}`}
              className="grid min-w-0 gap-4 rounded-xl border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_minmax(9.5rem,auto)] sm:items-center"
            >
              <div className="flex min-w-0 items-start gap-3">
                <div className="grid size-10 place-items-center rounded-lg bg-muted">
                  <Clock3 aria-hidden="true" className="size-5" />
                </div>
                <div className="grid min-w-0 flex-1 gap-2">
                  <h3 className="font-medium leading-6">
                    {weekdays[window.weekday] ?? `روز ${window.weekday}`}، ساعت{" "}
                    <bdi dir="ltr" className="tabular-nums">
                      {numberFormatter.format(window.hour)}
                    </bdi>
                  </h3>
                  <div className="grid gap-1 text-xs leading-5 text-muted-foreground">
                    <p>
                      تعداد پرداخت‌های یکتا:{" "}
                      <bdi dir="ltr" className="tabular-nums">
                        {numberFormatter.format(window.sessions)}
                      </bdi>
                    </p>
                    <p>نرخ این بازه: <PercentageValue value={window.verifyPct} /></p>
                  </div>
                </div>
              </div>
              <div
                className={
                  positive
                    ? "grid gap-3 border-t pt-3 text-start text-sm font-semibold sm:border-s sm:border-t-0 sm:ps-4 sm:pt-0"
                    : "grid gap-3 border-t pt-3 text-start text-sm font-semibold text-destructive sm:border-s sm:border-t-0 sm:ps-4 sm:pt-0"
                }
              >
                <span className="grid gap-1">
                  <span className="inline-flex items-center gap-1">
                    {positive ? (
                      <TrendingUp aria-hidden="true" className="size-4" />
                    ) : (
                      <TrendingDown aria-hidden="true" className="size-4" />
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
                    className="min-h-11 w-fit"
                    onClick={() => onEvidenceRequest(evidence.id)}
                  >
                    <Calculator aria-hidden="true" data-icon="inline-start" />
                    جزئیات محاسبهٔ این بازه
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

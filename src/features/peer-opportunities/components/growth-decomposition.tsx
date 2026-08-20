import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import type { DecompositionItem, Driver } from "../types";

const driverLabels: Record<Driver, string> = {
  traffic: "تعداد Session",
  conversion: "نرخ موفقیت",
  ticket: "متوسط مبلغ موفق",
};

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

const rialFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
});

function formatDriverValue(item: DecompositionItem, value: number) {
  if (item.driver === "conversion") {
    return `${numberFormatter.format(value)}٪`;
  }
  if (item.driver === "ticket") {
    return `${rialFormatter.format(value)} ریال`;
  }
  return `${rialFormatter.format(value)} Session`;
}

function DirectionIcon({ value }: { value: number }) {
  if (value > 0) {
    return <ArrowUp aria-hidden="true" className="size-4" />;
  }
  if (value < 0) {
    return <ArrowDown aria-hidden="true" className="size-4" />;
  }
  return <Minus aria-hidden="true" className="size-4" />;
}

export function GrowthDecomposition({
  items,
}: {
  items: DecompositionItem[];
}) {
  const maximumContribution = Math.max(
    ...items.map((item) => Math.abs(item.contributionRial)),
    1,
  );

  return (
    <section aria-labelledby="decomposition-title" className="grid gap-4">
      <header className="grid gap-1">
        <p className="text-sm font-medium text-muted-foreground">علت تغییر حجم موفق</p>
        <h2 id="decomposition-title" className="text-xl font-semibold">
          سه عامل، بدون دوباره‌شماری اثر مشترک
        </h2>
      </header>

      <div className="grid gap-3 lg:grid-cols-3">
        {items.map((item) => {
          const isNegative = item.contributionRial < 0;
          const width = `${Math.max(
            8,
            Math.round((Math.abs(item.contributionRial) / maximumContribution) * 100),
          )}%`;
          return (
            <article
              key={item.driver}
              className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <h3 className="font-medium">{driverLabels[item.driver]}</h3>
                  <p className="text-xs text-muted-foreground">
                    {formatDriverValue(item, item.previous)} ← {formatDriverValue(item, item.current)}
                  </p>
                </div>
                <span
                  className={
                    isNegative
                      ? "flex items-center gap-1 text-sm font-medium text-destructive"
                      : "flex items-center gap-1 text-sm font-medium text-foreground"
                  }
                >
                  <DirectionIcon value={item.contributionRial} />
                  {item.changePct === null
                    ? "تعریف‌نشده"
                    : `${numberFormatter.format(item.changePct)}٪`}
                </span>
              </div>

              <div className="grid gap-2">
                <div
                  aria-label={`سهم ${driverLabels[item.driver]} از تغییر حجم موفق`}
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="img"
                >
                  <div
                    className={isNegative ? "h-full bg-destructive" : "h-full bg-primary"}
                    style={{ width }}
                  />
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  {rialFormatter.format(item.contributionRial)} ریال
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}


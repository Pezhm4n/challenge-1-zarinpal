import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import type { DecompositionItem, Driver } from "../types";

const driverLabels: Record<Driver, string> = {
  traffic: "تعداد پرداخت‌های یکتا",
  conversion: "نرخ پرداخت موفق",
  ticket: "میانگین مبلغ پرداخت موفق",
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
  return `${rialFormatter.format(value)} پرداخت`;
}

function ChangeSummary({ value }: { value: number | null }) {
  if (value === null) {
    return <span>تغییر نامشخص</span>;
  }

  if (value === 0) {
    return <span>بدون تغییر</span>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span>{value > 0 ? "رشد" : "افت"}</span>
      <bdi dir="ltr" className="tabular-nums">
        {numberFormatter.format(Math.abs(value))}٪
      </bdi>
    </span>
  );
}

function ImpactSummary({ value }: { value: number }) {
  if (value === 0) {
    return <span>تأثیری بر فروش نداشت</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <span>{value > 0 ? "افزایش فروش:" : "کاهش فروش:"}</span>
      <bdi dir="ltr" className="tabular-nums">
        {rialFormatter.format(Math.abs(value))} ریال
      </bdi>
    </span>
  );
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
        <p className="text-sm font-medium text-muted-foreground">تغییر فروش موفق</p>
        <h2 id="decomposition-title" className="text-xl font-semibold">
          فروش موفق چرا تغییر کرد؟
        </h2>
        <p className="text-sm text-muted-foreground">
          سهم هر عامل جداگانه محاسبه شده تا اثر یک تغییر، دوبار شمرده نشود.
        </p>
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
                    از <bdi dir="ltr" className="tabular-nums">{formatDriverValue(item, item.previous)}</bdi>
                    {" "}به <bdi dir="ltr" className="tabular-nums">{formatDriverValue(item, item.current)}</bdi>
                  </p>
                </div>
                <span
                  className={
                    isNegative
                      ? "flex items-center gap-1 text-sm font-medium text-destructive"
                      : "flex items-center gap-1 text-sm font-medium text-foreground"
                  }
                >
                  <span className="inline-flex items-center gap-1">
                    <DirectionIcon value={item.contributionRial} />
                    <ChangeSummary value={item.changePct} />
                  </span>
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
                <p
                  className={
                    isNegative
                      ? "text-sm font-semibold text-destructive"
                      : "text-sm font-semibold text-foreground"
                  }
                >
                  <ImpactSummary value={item.contributionRial} />
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

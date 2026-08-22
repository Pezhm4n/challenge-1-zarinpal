import { ArrowDown, ArrowUp, CircleAlert, Minus } from "lucide-react";

import { cn } from "@/lib/utils";
import type { DecompositionItem, Driver } from "../types";
import { EvidenceMetricButton } from "./evidence-metric-button";

const driverLabels: Record<Driver, string> = {
  traffic: "تعداد خریداران",
  conversion: "درصد پرداخت موفق",
  ticket: "میانگین مبلغ هر خرید",
};

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

const rialFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 0,
});

function formatDriverValue(item: DecompositionItem, value: number) {
  return item.driver === "conversion"
    ? numberFormatter.format(value)
    : rialFormatter.format(value);
}

function DriverUnit({ driver }: { driver: Driver }) {
  return <span>{driver === "conversion" ? "٪" : driver === "ticket" ? "ریال" : "خریدار"}</span>;
}

function DriverValue({ item, value }: { item: DecompositionItem; value: number }) {
  return (
    <span dir="ltr" className="inline-flex items-baseline gap-0.5 tabular-nums">
      <DriverUnit driver={item.driver} />
      <bdi>{formatDriverValue(item, value)}</bdi>
    </span>
  );
}

function PercentValue({ value }: { value: number }) {
  return (
    <span dir="ltr" className="inline-flex items-baseline gap-0.5 tabular-nums">
      <bdi>{numberFormatter.format(Math.abs(value))}</bdi>
      <span>٪</span>
    </span>
  );
}

function RialValue({ value }: { value: number }) {
  return (
    <span dir="ltr" className="inline-flex items-baseline gap-0.5 tabular-nums">
      <span>ریال</span>
      <bdi>{rialFormatter.format(Math.abs(value))}</bdi>
    </span>
  );
}

function ChangeSummary({ value }: { value: number }) {
  if (value === 0) {
    return <span>بدون تغییر</span>;
  }

  return (
      <span className="inline-flex items-center gap-1">
        <span>{value > 0 ? "رشد" : "افت"}</span>
      <PercentValue value={value} />
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
      <RialValue value={value} />
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
  evidenceByScope,
  onEvidenceRequest,
}: {
  items: DecompositionItem[];
  evidenceByScope: Record<string, string>;
  onEvidenceRequest: (evidenceId: string) => void;
}) {
  if (items.length === 0) {
    return (
      <section
        aria-labelledby="decomposition-title"
        className="grid gap-3 rounded-xl border bg-card p-4"
        aria-live="polite"
      >
        <CircleAlert aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 id="decomposition-title" className="font-medium">
          تفکیک عامل‌های تغییر فروش قابل محاسبه نیست
        </h2>
        <p className="text-sm text-muted-foreground">
          در یکی از دوره‌ها پرداخت موفقی ثبت نشده است؛ برای جلوگیری از نمایش عدد
          ساختگی، سهم عامل‌ها نمایش داده نمی‌شود.
        </p>
      </section>
    );
  }

  const maximumContribution = Math.max(
    ...items.map((item) => Math.abs(item.contributionRial)),
    1,
  );

  return (
    <section aria-labelledby="decomposition-title" className="grid gap-5">
      <header className="grid gap-1">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary w-fit">عامل‌های اصلی رشد</span>
        <h2 id="decomposition-title" className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-2xl">
          فروش شما از چه راه‌هایی تغییر کرده است؟
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          تفکیک سهم ۳ عامل کلیدی (تعداد خریداران، درصد خرید موفق، و مبلغ خرید)؛ تأثیر هر عامل جداگانه محاسبه شده است.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {items.map((item) => {
          const isNegative = item.contributionRial < 0;
          const isPositive = item.contributionRial > 0;
          const evidenceId = evidenceByScope[`growth:${item.driver}`];
          const width = `${Math.max(
            8,
            Math.round((Math.abs(item.contributionRial) / maximumContribution) * 100),
          )}%`;
          return (
            <article
              key={item.driver}
              className={cn(
                "grid gap-4 rounded-2xl border bg-card p-5 shadow-xs transition-all duration-200 hover:shadow-sm",
                isPositive && "border-success/35 hover:border-success/55",
                isNegative && "border-destructive/40 hover:border-destructive/60",
                !isPositive && !isNegative && "border-border/70 hover:border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <h3 className="text-base font-bold text-foreground">{driverLabels[item.driver]}</h3>
                  <p className="text-xs text-muted-foreground">
                    از <DriverValue item={item} value={item.previous} />
                    {" "}به <DriverValue item={item} value={item.current} />
                  </p>
                </div>
                <div
                  className={
                    isNegative
                      ? "inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive"
                      : isPositive
                        ? "inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success-foreground"
                        : "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
                  }
                >
                  <DirectionIcon value={item.contributionRial} />
                  <ChangeSummary value={item.changePct} />
                </div>
              </div>

              <div className="grid gap-2.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-muted-foreground">سهم در تغییر فروش:</span>
                  <EvidenceMetricButton
                    evidenceId={evidenceId}
                    ariaLabel={`مشاهده روش محاسبه سهم ${driverLabels[item.driver]} در فروش`}
                    onEvidenceRequest={onEvidenceRequest}
                    className={
                      isNegative
                        ? "text-xs font-bold text-destructive hover:underline"
                        : "text-xs font-bold text-primary hover:underline"
                    }
                  >
                    <span>
                      <ImpactSummary value={item.contributionRial} />
                    </span>
                  </EvidenceMetricButton>
                </div>
                <div
                  aria-label={`سهم ${driverLabels[item.driver]} از تغییر مبلغ فروش`}
                  className="h-2.5 overflow-hidden rounded-full bg-muted/80"
                  role="img"
                >
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isNegative ? "bg-destructive" : "bg-primary"
                    )}
                    style={{ width }}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

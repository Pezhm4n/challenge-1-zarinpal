import { CircleAlert, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";
import type { PeerBenchmark } from "../types";
import { EvidenceMetricButton } from "./evidence-metric-button";

const labels: Record<string, { title: string; unit: "percent" | "rial" }> = {
  verificationRate: { title: "درصد پرداخت موفق", unit: "percent" },
  verifiedVolumeRial: { title: "مجموع مبلغ فروش موفق", unit: "rial" },
  averageVerifiedTicketRial: { title: "میانگین مبلغ هر خرید", unit: "rial" },
};

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

function MetricValue({ value, unit }: { value: number; unit: "percent" | "rial" }) {
  return (
    <span dir="ltr" className="inline-flex items-baseline gap-0.5 tabular-nums">
      {unit === "percent" ? (
        <>
          <bdi>{numberFormatter.format(value)}</bdi>
          <span>٪</span>
        </>
      ) : (
        <>
          <span>ریال</span>
          <bdi>{numberFormatter.format(value)}</bdi>
        </>
      )}
    </span>
  );
}

function PercentageValue({ value }: { value: number }) {
  return <MetricValue value={value} unit="percent" />;
}

export function PeerPosition({
  benchmarks,
  evidenceByScope,
  onEvidenceRequest,
}: {
  benchmarks: PeerBenchmark[];
  evidenceByScope: Record<string, string>;
  onEvidenceRequest: (evidenceId: string) => void;
}) {
  if (benchmarks.length === 0) {
    return (
      <section
        aria-labelledby="peer-title"
        className="grid gap-3 rounded-xl border bg-card p-4"
        aria-live="polite"
      >
        <CircleAlert aria-hidden="true" className="size-5 text-muted-foreground" />
        <h2 id="peer-title" className="font-medium">
          داده کافی برای مقایسه با هم‌صنفان وجود ندارد
        </h2>
        <p className="text-sm text-muted-foreground">
          رتبه فقط زمانی نمایش داده می‌شود که فروشگاه شما و فروشگاه‌های
          هم‌صنف حداقل نمونهٔ لازم را داشته باشند.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="peer-title" className="grid gap-5">
      <header className="grid gap-1">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary w-fit">جایگاه در بازار</span>
        <h2 id="peer-title" className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-2xl">
          جایگاه و رتبه شما در میان فروشگاه‌های مشابه
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          بررسی صدک و رتبه عملکرد کسب‌وکار شما در مقایسه با فروشگاه‌های هم‌صنف در بازار.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {benchmarks.map((benchmark, benchmarkIndex) => {
          const evidenceId = evidenceByScope[`peer:${benchmark.metric}`];
          const label = labels[benchmark.metric] ?? {
            title: benchmark.metric,
            unit: "percent" as const,
          };
          if (!benchmark.sufficient) {
            return (
              <article
                key={benchmark.metric}
                className="grid animate-rise-in gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xs"
                style={{ animationDelay: `${benchmarkIndex * 90}ms` }}
              >
                <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <CircleAlert aria-hidden="true" className="size-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">{label.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  برای نمایش جایگاه، دادهٔ کافی از کسب‌وکارهای مشابه نداریم.
                </p>
              </article>
            );
          }
          const medianDelta =
            benchmark.peerMedian !== 0
              ? ((benchmark.merchantValue - benchmark.peerMedian) /
                  Math.abs(benchmark.peerMedian)) *
                100
              : null;
          return (
            <article
              key={benchmark.metric}
              className="grid animate-rise-in gap-5 rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:shadow-sm"
              style={{ animationDelay: `${benchmarkIndex * 90}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <h3 className="text-base font-bold text-foreground">{label.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    میانهٔ هم‌صنفان: <MetricValue value={benchmark.peerMedian} unit={label.unit} />
                  </p>
                </div>
                <div className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <UsersRound aria-hidden="true" className="size-4" />
                </div>
              </div>

              <div className="grid gap-3.5">
                <div className="flex items-end justify-between gap-3">
                  <div className="grid gap-0.5">
                    <span className="text-xs font-semibold text-muted-foreground">صدک جایگاه در صنف</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs text-muted-foreground">بهتر از</span>
                      <EvidenceMetricButton
                        evidenceId={evidenceId}
                        ariaLabel={`مشاهده روش محاسبه جایگاه ${label.title}`}
                        onEvidenceRequest={onEvidenceRequest}
                        className="text-xl font-extrabold tracking-tight text-foreground hover:text-primary sm:text-3xl"
                      >
                        <PercentageValue value={benchmark.percentile} />
                      </EvidenceMetricButton>
                    </div>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    <bdi dir="ltr" className="tabular-nums font-bold text-foreground">{numberFormatter.format(benchmark.peerCount)}</bdi>
                    {" "}کسب‌وکار هم‌صنف
                  </p>
                </div>

                <div className="grid gap-1.5 pt-1">
                  <div
                    aria-label={`جایگاه ${label.title}: بهتر از ${numberFormatter.format(benchmark.percentile)} درصد کسب‌وکارهای مشابه`}
                    className="relative flex items-center h-6 w-full px-1"
                    dir="ltr"
                    role="img"
                  >
                    {/* Neutral continuous track line (no progress fill) */}
                    <div className="h-1.5 w-full rounded-full bg-muted-foreground/20" />

                    {/* Left 0% tick */}
                    <div
                      aria-hidden="true"
                      className="absolute left-1 top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-muted-foreground/40 rounded-full"
                    />

                    {/* Median 50% center tick */}
                    <div
                      aria-hidden="true"
                      className="absolute left-1/2 top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-muted-foreground/60 rounded-full"
                    />

                    {/* Right 100% tick */}
                    <div
                      aria-hidden="true"
                      className="absolute right-1 top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-muted-foreground/40 rounded-full"
                    />

                    {/* Position Pin Indicator on Axis */}
                    <div
                      aria-hidden="true"
                      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex animate-pop-in items-center justify-center pointer-events-none"
                      style={{
                        left: `${Math.max(4, Math.min(96, benchmark.percentile))}%`,
                        animationDelay: `${350 + benchmarkIndex * 90}ms`,
                      }}
                    >
                      <span className="size-4 rounded-full border-2 border-card bg-primary shadow-md ring-3 ring-primary/25" />
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 px-1 text-xs font-medium text-muted-foreground" dir="ltr">
                    <span className="text-muted-foreground">۰٪ (کمترین)</span>
                    <span className="font-semibold text-foreground/75">میانه صنف (۵۰٪)</span>
                    <span className="text-muted-foreground">۱۰۰٪ (بیشترین)</span>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="grid min-w-0 gap-1 rounded-xl bg-muted/30 border border-border/40 p-3">
                    <dt className="text-muted-foreground">مقدار شما</dt>
                    <dd className="break-words font-bold text-foreground">
                      <MetricValue value={benchmark.merchantValue} unit={label.unit} />
                    </dd>
                  </div>
                  <div className="grid min-w-0 gap-1 rounded-xl bg-muted/30 border border-border/40 p-3">
                    <dt className="text-muted-foreground">میانهٔ هم‌صنفان</dt>
                    <dd className="break-words font-bold text-foreground">
                      <MetricValue value={benchmark.peerMedian} unit={label.unit} />
                    </dd>
                  </div>
                </dl>
                {medianDelta !== null ? (
                  <p
                    className={cn(
                      "inline-flex w-fit flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                      medianDelta > 0 && "bg-success/10 text-success-foreground",
                      medianDelta < 0 && "bg-destructive/10 text-destructive",
                      medianDelta === 0 && "bg-muted text-muted-foreground",
                    )}
                  >
                    {medianDelta === 0
                      ? "هم‌تراز میانهٔ هم‌صنفان"
                      : `${numberFormatter.format(Math.abs(medianDelta))}٪ ${medianDelta > 0 ? "بالاتر" : "پایین‌تر"} از میانهٔ هم‌صنفان`}
                  </p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

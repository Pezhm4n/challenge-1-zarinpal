import { CircleAlert, UsersRound } from "lucide-react";

import type { PeerBenchmark } from "../types";
import { EvidenceMetricButton } from "./evidence-metric-button";

const labels: Record<string, { title: string; unit: "percent" | "rial" }> = {
  verificationRate: { title: "نرخ پرداخت موفق", unit: "percent" },
  verifiedVolumeRial: { title: "مبلغ پرداخت‌های موفق", unit: "rial" },
  averageVerifiedTicketRial: { title: "میانگین مبلغ پرداخت موفق", unit: "rial" },
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
          رتبه فقط زمانی نمایش داده می‌شود که پذیرنده و گروه هم‌صنف حداقل نمونهٔ
          لازم را داشته باشند.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="peer-title" className="grid gap-5">
      <header className="grid gap-1">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary w-fit">جایگاه رقابتی</span>
        <h2 id="peer-title" className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          جایگاه شما میان کسب‌وکارهای مشابه
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          ببینید عملکرد شما از چند درصدِ کسب‌وکارهای مشابه بالاتر است.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        {benchmarks.map((benchmark) => {
          const evidenceId = evidenceByScope[`peer:${benchmark.metric}`];
          const label = labels[benchmark.metric] ?? {
            title: benchmark.metric,
            unit: "percent" as const,
          };
          if (!benchmark.sufficient) {
            return (
              <article
                key={benchmark.metric}
                className="grid gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xs"
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
          return (
            <article
              key={benchmark.metric}
              className="grid gap-5 rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-all duration-200 hover:border-border hover:shadow-sm"
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
                    <span className="text-xs font-medium text-muted-foreground">عملکرد شما بهتر از</span>
                    <EvidenceMetricButton
                      evidenceId={evidenceId}
                      ariaLabel={`مشاهده مدرک جایگاه ${label.title}`}
                      onEvidenceRequest={onEvidenceRequest}
                      className="text-2xl font-extrabold tracking-tight text-foreground hover:text-primary sm:text-3xl"
                    >
                      <PercentageValue value={benchmark.percentile} />
                    </EvidenceMetricButton>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    <bdi dir="ltr" className="tabular-nums font-bold text-foreground">{numberFormatter.format(benchmark.peerCount)}</bdi>
                    {" "}کسب‌وکار مشابه
                  </p>
                </div>
                <div
                  aria-label={`جایگاه ${label.title}: بهتر از ${numberFormatter.format(benchmark.percentile)} درصد کسب‌وکارهای مشابه`}
                  className="relative h-3 rounded-full bg-muted/80"
                  dir="ltr"
                  role="img"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-1/2 w-0.5 bg-border/80"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary shadow-xs ring-2 ring-primary/20"
                    style={{ left: `${Math.max(3, Math.min(97, benchmark.percentile))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-medium text-muted-foreground" dir="ltr">
                  <bdi>۰</bdi>
                  <span>میانه</span>
                  <bdi>۱۰۰</bdi>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="grid gap-1 rounded-xl bg-muted/30 border border-border/40 p-3">
                    <dt className="text-muted-foreground">مقدار شما</dt>
                    <dd className="font-bold text-foreground">
                      <MetricValue value={benchmark.merchantValue} unit={label.unit} />
                    </dd>
                  </div>
                  <div className="grid gap-1 rounded-xl bg-muted/30 border border-border/40 p-3">
                    <dt className="text-muted-foreground">میانهٔ هم‌صنفان</dt>
                    <dd className="font-bold text-foreground">
                      <MetricValue value={benchmark.peerMedian} unit={label.unit} />
                    </dd>
                  </div>
                </dl>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

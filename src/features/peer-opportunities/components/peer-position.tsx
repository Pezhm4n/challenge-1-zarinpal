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
    <section aria-labelledby="peer-title" className="grid gap-4">
      <header className="grid gap-1">
        <p className="text-sm font-medium text-muted-foreground">مقایسه با هم‌صنف</p>
        <h2 id="peer-title" className="text-xl font-semibold">
          جایگاه شما میان کسب‌وکارهای مشابه
        </h2>
        <p className="text-sm text-muted-foreground">
          ببینید عملکرد شما از چند درصدِ کسب‌وکارهای مشابه بالاتر است.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-3">
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
                className="grid gap-3 rounded-xl border bg-card p-4"
              >
                <CircleAlert aria-hidden="true" className="size-5 text-muted-foreground" />
                <h3 className="font-medium">{label.title}</h3>
                <p className="text-sm text-muted-foreground">
                  برای نمایش جایگاه، دادهٔ کافی از کسب‌وکارهای مشابه نداریم.
                </p>
              </article>
            );
          }
          return (
            <article
              key={benchmark.metric}
              className="grid gap-4 rounded-xl border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-1">
                  <h3 className="font-medium">{label.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    میانهٔ کسب‌وکارهای مشابه: <MetricValue value={benchmark.peerMedian} unit={label.unit} />
                  </p>
                </div>
                <UsersRound aria-hidden="true" className="size-5 text-muted-foreground" />
              </div>

              <div className="grid gap-3">
                <div className="flex items-end justify-between gap-3">
                  <p className="grid gap-0.5">
                    <span className="text-xs text-muted-foreground">عملکرد شما بهتر از</span>
                    <EvidenceMetricButton
                      evidenceId={evidenceId}
                      ariaLabel={`مشاهده مدرک جایگاه ${label.title}`}
                      onEvidenceRequest={onEvidenceRequest}
                      className="-my-1 text-2xl font-semibold"
                    >
                      <PercentageValue value={benchmark.percentile} />
                    </EvidenceMetricButton>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <bdi dir="ltr" className="tabular-nums">{numberFormatter.format(benchmark.peerCount)}</bdi>
                    {" "}کسب‌وکار مشابه
                  </p>
                </div>
                <div
                  aria-label={`جایگاه ${label.title}: بهتر از ${numberFormatter.format(benchmark.percentile)} درصد کسب‌وکارهای مشابه`}
                  className="relative h-3 rounded-full bg-muted"
                  dir="ltr"
                  role="img"
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 left-1/2 w-px bg-border"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary shadow-sm"
                    style={{ left: `${Math.max(2, Math.min(98, benchmark.percentile))}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground" dir="ltr">
                  <bdi>۰</bdi>
                  <span>میانه</span>
                  <bdi>۱۰۰</bdi>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="grid gap-1 rounded-lg bg-muted/60 p-2">
                    <dt className="text-muted-foreground">مقدار شما</dt>
                    <dd className="font-medium">
                      <MetricValue value={benchmark.merchantValue} unit={label.unit} />
                    </dd>
                  </div>
                  <div className="grid gap-1 rounded-lg bg-muted/60 p-2">
                    <dt className="text-muted-foreground">میانهٔ هم‌صنفان</dt>
                    <dd className="font-medium">
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

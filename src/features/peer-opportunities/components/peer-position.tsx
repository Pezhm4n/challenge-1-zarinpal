import { CircleAlert, UsersRound } from "lucide-react";

import type { PeerBenchmark } from "../types";

const labels: Record<string, { title: string; unit: "percent" | "rial" }> = {
  verificationRate: { title: "نرخ پرداخت موفق", unit: "percent" },
  verifiedVolumeRial: { title: "مبلغ پرداخت‌های موفق", unit: "rial" },
  averageVerifiedTicketRial: { title: "میانگین مبلغ پرداخت موفق", unit: "rial" },
};

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

function formatValue(value: number, unit: "percent" | "rial") {
  return unit === "percent"
    ? `${numberFormatter.format(value)}٪`
    : `${numberFormatter.format(value)} ریال`;
}

function formatPercentile(value: number) {
  return `${numberFormatter.format(value)}٪`;
}

export function PeerPosition({ benchmarks }: { benchmarks: PeerBenchmark[] }) {
  return (
    <section aria-labelledby="peer-title" className="grid gap-4">
      <header className="grid gap-1">
        <p className="text-sm font-medium text-muted-foreground">مقایسه با هم‌صنف</p>
        <h2 id="peer-title" className="text-xl font-semibold">
          جایگاه شما میان کسب‌وکارهای مشابه
        </h2>
        <p className="text-sm text-muted-foreground">
          صدک را کنار میانهٔ هم‌صنفان ببینید تا نتیجه قابل تفسیر باشد.
        </p>
      </header>

      <div className="grid gap-3 lg:grid-cols-3">
        {benchmarks.map((benchmark) => {
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
                    میانهٔ کسب‌وکارهای مشابه: {formatValue(benchmark.peerMedian, label.unit)}
                  </p>
                </div>
                <UsersRound aria-hidden="true" className="size-5 text-muted-foreground" />
              </div>

              <div className="grid gap-3">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-2xl font-semibold tabular-nums" dir="ltr">
                    صدک {formatPercentile(benchmark.percentile)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {numberFormatter.format(benchmark.peerCount)} کسب‌وکار مشابه
                  </p>
                </div>
                <div
                  aria-label={`جایگاه ${label.title}: بهتر از ${formatPercentile(benchmark.percentile)} کسب‌وکارهای مشابه`}
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
                  <span>۰</span>
                  <span>میانه</span>
                  <span>۱۰۰</span>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="grid gap-1 rounded-lg bg-muted/60 p-2">
                    <dt className="text-muted-foreground">مقدار شما</dt>
                    <dd className="font-medium tabular-nums" dir="ltr">
                      {formatValue(benchmark.merchantValue, label.unit)}
                    </dd>
                  </div>
                  <div className="grid gap-1 rounded-lg bg-muted/60 p-2">
                    <dt className="text-muted-foreground">میانهٔ هم‌صنفان</dt>
                    <dd className="font-medium tabular-nums" dir="ltr">
                      {formatValue(benchmark.peerMedian, label.unit)}
                    </dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground">
                  بهتر از {formatPercentile(benchmark.percentile)} کسب‌وکار مشابه هستید.
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

import { CircleAlert, UsersRound } from "lucide-react";

import type { PeerBenchmark } from "../types";

const labels: Record<string, { title: string; unit: "percent" | "rial" }> = {
  verificationRate: { title: "نرخ موفقیت", unit: "percent" },
  verifiedVolumeRial: { title: "حجم موفق", unit: "rial" },
  averageVerifiedTicketRial: { title: "متوسط مبلغ موفق", unit: "rial" },
};

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

function formatValue(value: number, unit: "percent" | "rial") {
  return unit === "percent"
    ? `${numberFormatter.format(value)}٪`
    : `${numberFormatter.format(value)} ریال`;
}

export function PeerPosition({ benchmarks }: { benchmarks: PeerBenchmark[] }) {
  return (
    <section aria-labelledby="peer-title" className="grid gap-4">
      <header className="grid gap-1">
        <p className="text-sm font-medium text-muted-foreground">مقایسه با هم‌صنف</p>
        <h2 id="peer-title" className="text-xl font-semibold">
          یک رتبه به‌تنهایی تصویر کامل نیست
        </h2>
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
                  نمونه هم‌صنف برای نمایش Percentile کافی نیست.
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
                    میانه هم‌صنف: {formatValue(benchmark.peerMedian, label.unit)}
                  </p>
                </div>
                <UsersRound aria-hidden="true" className="size-5 text-muted-foreground" />
              </div>

              <div className="grid gap-2">
                <div className="flex items-end justify-between gap-3">
                  <p className="text-2xl font-semibold tabular-nums">
                    صدک {numberFormatter.format(benchmark.percentile)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {numberFormatter.format(benchmark.peerCount)} هم‌صنف
                  </p>
                </div>
                <div
                  aria-label={`جایگاه ${label.title}: صدک ${benchmark.percentile}`}
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="img"
                >
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.max(2, Math.min(100, benchmark.percentile))}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  مقدار شما: {formatValue(benchmark.merchantValue, label.unit)}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}


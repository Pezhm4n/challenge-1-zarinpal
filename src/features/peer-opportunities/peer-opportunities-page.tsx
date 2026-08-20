import { ArrowLeft, BadgeCheck, Database, FileSearch2 } from "lucide-react";

import { FairComparisonNote } from "./components/fair-comparison-note";
import { GrowthDecomposition } from "./components/growth-decomposition";
import { PeerPosition } from "./components/peer-position";
import { TimeWindowOpportunities } from "./components/time-window-opportunities";
import type { PeerOpportunitiesPayload } from "./types";

const dateFormatter = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function formatDate(value: string) {
  return dateFormatter.format(new Date(`${value}T00:00:00Z`));
}

const confidenceLabels = {
  high: "اطمینان بالا",
  medium: "اطمینان متوسط",
  low: "اطمینان پایین",
} as const;

export function PeerOpportunitiesPage({
  payload,
}: {
  payload: PeerOpportunitiesPayload;
}) {
  const primaryInsight = [...payload.insights].sort(
    (first, second) => first.priority - second.priority,
  )[0];

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <header className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-sm font-medium text-muted-foreground">نبض زرین / فرصت‌ها</p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                فرصت‌های رشد پذیرنده <bdi dir="ltr">{payload.selection.merchantKey}</bdi>
              </h1>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
              {payload.selection.comparison ? (
                <span>
                  {formatDate(payload.selection.comparison.from)} تا {formatDate(payload.selection.period.to)}
                </span>
              ) : (
                <span>{formatDate(payload.selection.period.from)} تا {formatDate(payload.selection.period.to)}</span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
            <Database aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="grid gap-1">
              <p className="text-sm font-medium">نمایش آزمایشی با دادهٔ پرداخت‌های یکتا</p>
              <p className="text-sm text-muted-foreground">
                تلاش‌های تکراری یک پرداخت فقط یک‌بار شمرده شده‌اند. داده‌های کامل در نسخهٔ نهایی
                جایگزین می‌شوند.
              </p>
            </div>
          </div>
        </header>

        {primaryInsight ? (
          <section className="grid gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                <BadgeCheck aria-hidden="true" className="size-4" />
                {confidenceLabels[primaryInsight.confidence]}
              </span>
              <span className="text-xs text-muted-foreground">اولویت {primaryInsight.priority}</span>
            </div>
            <div className="grid gap-2">
              <h2 className="text-xl font-semibold sm:text-2xl">{primaryInsight.titleFa}</h2>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                {primaryInsight.findingFa}
              </p>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-muted p-3 text-sm">
              <ArrowLeft aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <p>
                <span className="font-medium">اقدام پیشنهادی: </span>
                {primaryInsight.actionFa}
              </p>
            </div>
          </section>
        ) : null}

        <GrowthDecomposition items={payload.decomposition} />

        <div className="grid gap-4">
          <PeerPosition benchmarks={payload.peerBenchmarks} />
          <FairComparisonNote benchmarks={payload.peerBenchmarks} />
        </div>

        <TimeWindowOpportunities windows={payload.timeWindows} />

        <section aria-labelledby="evidence-ready-title" className="grid gap-3 rounded-xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <FileSearch2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div className="grid gap-1">
              <h2 id="evidence-ready-title" className="font-semibold">
                مبنای محاسبه
              </h2>
              <p className="text-sm text-muted-foreground">
                این تحلیل بر پایهٔ پرداخت‌های یکتا و دوره‌های هم‌اندازه محاسبه شده است. جزئیات هر
                بخش در همین صفحه قابل بررسی خواهد بود.
              </p>
            </div>
          </div>
          <ul className="grid gap-2 text-sm md:grid-cols-3">
            {payload.evidence.map((record) => (
              <li key={record.id} className="rounded-lg border bg-muted/30 p-3 font-medium">
                {record.titleFa}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

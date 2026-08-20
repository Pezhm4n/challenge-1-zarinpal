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

const confidenceLabels = {
  high: "اطمینان بالا",
  medium: "اطمینان متوسط",
  low: "اطمینان پایین",
} as const;

export function PeerOpportunitiesPage({
  payload,
  generatedAt,
  fingerprint,
}: {
  payload: PeerOpportunitiesPayload;
  generatedAt: string;
  fingerprint: string;
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
                فرصت‌های رشد پذیرنده {payload.selection.merchantKey}
              </h1>
            </div>
            <div className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">
              {payload.selection.comparison ? (
                <span>
                  {payload.selection.comparison.from} تا {payload.selection.period.to}
                </span>
              ) : (
                <span>{payload.selection.period.from} تا {payload.selection.period.to}</span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border bg-card p-4">
            <Database aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div className="grid gap-1">
              <p className="text-sm font-medium">نسخه مستقل توسعه با داده Session-level</p>
              <p className="text-sm text-muted-foreground">
                Retryها در این ورودی قبلاً به یک Session تبدیل شده‌اند. Artifact نهایی پس از اتصال
                به `analytics/common` ایدین جایگزین می‌شود.
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

        <section aria-labelledby="evidence-ready-title" className="grid gap-4 rounded-xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <FileSearch2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div className="grid gap-1">
              <h2 id="evidence-ready-title" className="font-semibold">
                مدارک محاسبه برای اتصال آماده‌اند
              </h2>
              <p className="text-sm text-muted-foreground">
                Formula، controls و Data-quality داخل Artifact وجود دارند. تعامل نهایی «چطور حساب
                شد؟» بعد از دریافت Shared Evidence Drawer ایدین فعال می‌شود.
              </p>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {payload.evidence.map((record) => (
              <article key={record.id} className="grid gap-1 rounded-lg border bg-muted/30 p-3">
                <h3 className="text-sm font-medium">{record.titleFa}</h3>
                <code className="overflow-hidden text-ellipsis text-xs text-muted-foreground" dir="ltr">
                  {record.formulaId}
                </code>
              </article>
            ))}
          </div>
          <footer className="flex flex-wrap justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
            <span>تولید: {dateFormatter.format(new Date(generatedAt))}</span>
            <span dir="ltr">fingerprint: {fingerprint.slice(0, 12)}…</span>
          </footer>
        </section>
      </div>
    </main>
  );
}


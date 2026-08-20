"use client";

import { useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, Calculator, Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ArtifactError, EvidenceRecord } from "@/contracts";
import { EvidenceSheet } from "@/entities/evidence/evidence-sheet";
import {
  resolveEvidenceRecord,
  type EvidenceResolution,
} from "@/entities/evidence/model";

import { FairComparisonNote } from "./components/fair-comparison-note";
import { GrowthDecomposition } from "./components/growth-decomposition";
import { PeerPosition } from "./components/peer-position";
import { TimeWindowOpportunities } from "./components/time-window-opportunities";
import type { EvidenceReference, PeerOpportunitiesPayload } from "./types";

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
  const [evidenceResolution, setEvidenceResolution] =
    useState<EvidenceResolution | null>(null);
  const evidenceTriggerRef = useRef<HTMLElement | null>(null);
  const primaryInsight = [...payload.insights].sort(
    (first, second) => first.priority - second.priority,
  )[0];
  const timingInsight = payload.insights.find(
    (insight) => insight.feature === "timing",
  );
  const evidenceIndex = Object.fromEntries(
    payload.evidence.map((record) => [record.id, record]),
  );
  const evidenceReferences: Record<string, EvidenceReference> = Object.fromEntries(
    payload.evidence.flatMap((record) => {
      const scope = record.filters.find(
        (filter) => filter.field === "evidence_scope",
      )?.value;

      return typeof scope === "string"
        ? [[scope, { id: record.id, baseline: record.baseline?.value }]]
        : [];
    }),
  );
  const evidenceByScope = Object.fromEntries(
    Object.entries(evidenceReferences).map(([scope, reference]) => [
      scope,
      reference.id,
    ]),
  );
  const primaryEvidenceLabel =
    primaryInsight?.feature === "growth"
      ? "جمع کل تغییر فروش موفق"
      : primaryInsight?.feature === "peers"
        ? "جایگاه در گروه هم‌صنف"
        : primaryInsight?.feature === "timing"
          ? "فرصت‌های زمانی"
          : primaryInsight?.titleFa;

  function handleEvidenceRequest(evidenceId: string) {
    if (document.activeElement instanceof HTMLElement) {
      evidenceTriggerRef.current = document.activeElement;
    }
    setEvidenceResolution(resolveEvidenceRecord(evidenceIndex, evidenceId));
  }

  function handleEvidenceOpenChange(open: boolean) {
    if (open) {
      return;
    }

    setEvidenceResolution(null);
    window.requestAnimationFrame(() => evidenceTriggerRef.current?.focus());
  }

  const selectedEvidence: EvidenceRecord | null =
    evidenceResolution?.success === true ? evidenceResolution.data : null;
  const selectedEvidenceError: ArtifactError | null =
    evidenceResolution?.success === false ? evidenceResolution.error : null;

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
              <p className="text-sm font-medium">تحلیل بر پایهٔ کل داده‌های چالش</p>
              <p className="text-sm text-muted-foreground">
                تلاش‌های تکراری هر پرداخت پیش از محاسبه، روی پرداخت یکتا تجمیع شده‌اند.
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
            <Button
              type="button"
              variant="outline"
              className="min-h-11 w-fit"
              aria-label={
                primaryInsight?.feature === "growth"
                  ? primaryEvidenceLabel
                  : `مشاهده مدرک ${primaryEvidenceLabel}`
              }
              onClick={() => handleEvidenceRequest(primaryInsight.evidenceId)}
            >
              <Calculator aria-hidden="true" data-icon="inline-start" />
              {primaryInsight?.feature === "growth"
                ? primaryEvidenceLabel
                : `مشاهدهٔ مدرک ${primaryEvidenceLabel}`}
            </Button>
          </section>
        ) : null}

        <GrowthDecomposition
          items={payload.decomposition}
          evidenceByScope={evidenceByScope}
          onEvidenceRequest={handleEvidenceRequest}
        />

        <div className="grid gap-4">
          <PeerPosition
            benchmarks={payload.peerBenchmarks}
            evidenceByScope={evidenceByScope}
            onEvidenceRequest={handleEvidenceRequest}
          />
          <FairComparisonNote benchmarks={payload.peerBenchmarks} />
        </div>

        <TimeWindowOpportunities
          windows={payload.timeWindows}
          evidenceByScope={evidenceReferences}
          onEvidenceRequest={handleEvidenceRequest}
          emptyMessage={timingInsight?.findingFa}
        />

      </div>

      <EvidenceSheet
        evidence={selectedEvidence}
        error={selectedEvidenceError}
        open={evidenceResolution !== null}
        onOpenChange={handleEvidenceOpenChange}
      />
    </main>
  );
}

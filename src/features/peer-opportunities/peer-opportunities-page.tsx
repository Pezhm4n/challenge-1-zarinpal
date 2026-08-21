"use client";

import { useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, Calculator, Database } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ArtifactError, EvidenceRecord } from "@/contracts";
import { EvidenceSheet } from "@/entities/evidence/evidence-sheet";
import {
  resolveEvidenceRecord,
  type EvidenceResolution,
} from "@/entities/evidence/model";

import { formatPersianDate, localizePersianText } from "@/lib/persian-date";
import { FairComparisonNote } from "./components/fair-comparison-note";
import { GrowthDecomposition } from "./components/growth-decomposition";
import { PeerPosition } from "./components/peer-position";
import { TimeWindowOpportunities } from "./components/time-window-opportunities";
import type { EvidenceReference, PeerOpportunitiesPayload } from "./types";

function formatDate(value: string) {
  return formatPersianDate(value);
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
      ? "روش محاسبه تغییر فروش"
      : primaryInsight?.feature === "peers"
        ? "روش محاسبه جایگاه در گروه هم‌صنف"
        : primaryInsight?.feature === "timing"
          ? "روش محاسبه فرصت‌های زمانی"
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
    <div className="grid gap-8 lg:gap-10">
      <header className="grid gap-6 rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-xs lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 font-semibold">
              <BadgeCheck aria-hidden="true" className="size-3.5" />
              تحلیل هم‌صنفان و فرصت‌ها
            </Badge>
            <Badge variant="outline" className="gap-1.5 font-semibold">
              <Database aria-hidden="true" className="size-3.5" />
              بر پایه کل داده‌های ثبت‌شده
            </Badge>
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-3xl sm:font-extrabold lg:text-4xl">
            فرصت‌های رشد و مقایسه با بازار برای <span className="text-primary">فروشگاه شما</span>
          </h1>
          <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            کشف راه‌های افزایش فروش، سنجش رتبه در میان هم‌صنفان و شناسایی ساعات طلایی خرید مشتریان.
          </p>
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            {payload.selection.comparison ? (
              <span>
                دوره: {formatDate(payload.selection.comparison.from)} تا {formatDate(payload.selection.period.to)}
              </span>
            ) : (
              <span>دوره: {formatDate(payload.selection.period.from)} تا {formatDate(payload.selection.period.to)}</span>
            )}
          </p>
        </div>
      </header>

      {primaryInsight ? (
        <section className="grid gap-5 rounded-2xl border border-primary/40 bg-gradient-to-b from-card via-card to-primary/[0.02] p-6 shadow-sm ring-1 ring-primary/25 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
                فرصت کلیدی
              </span>
              <Badge variant="outline" className="font-semibold">
                {confidenceLabels[primaryInsight.confidence]}
              </Badge>
            </div>
            <span className="text-xs font-medium text-muted-foreground">اولویت {primaryInsight.priority}</span>
          </div>
          <div className="grid gap-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-2xl">{localizePersianText(primaryInsight.titleFa)}</h2>
            <p className="max-w-4xl text-sm leading-relaxed text-foreground/85 sm:text-base">
              {localizePersianText(primaryInsight.findingFa)}
            </p>
          </div>
          <div className="flex items-start gap-3.5 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 sm:p-5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ArrowLeft aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-primary">اقدام پیشنهادی</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-foreground">{localizePersianText(primaryInsight.actionFa)}</p>
            </div>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              className="min-h-10 w-fit"
              aria-label={`مشاهده ${primaryEvidenceLabel}`}
              onClick={() => handleEvidenceRequest(primaryInsight.evidenceId)}
            >
              <Calculator aria-hidden="true" data-icon="inline-start" />
              <span>چطور محاسبه شد؟</span>
            </Button>
          </div>
        </section>
      ) : null}

      <GrowthDecomposition
        items={payload.decomposition}
        evidenceByScope={evidenceByScope}
        onEvidenceRequest={handleEvidenceRequest}
      />

      <div className="grid gap-6">
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

      <EvidenceSheet
        evidence={selectedEvidence}
        error={selectedEvidenceError}
        open={evidenceResolution !== null}
        onOpenChange={handleEvidenceOpenChange}
      />
    </div>
  );
}

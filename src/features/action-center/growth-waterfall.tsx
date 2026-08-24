"use client"

import { Calculator } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { WaterfallModel, WaterfallStep } from "./growth-waterfall-model"

const faInteger = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 })
const faOneDecimal = new Intl.NumberFormat("fa-IR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function formatCompactRial(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) {
    return `${faOneDecimal.format(abs / 1_000_000_000)} میلیارد ریال`
  }
  if (abs >= 1_000_000) {
    return `${faOneDecimal.format(abs / 1_000_000)} میلیون ریال`
  }
  return `${faInteger.format(abs)} ریال`
}

function formatSignedCompactRial(step: WaterfallStep): string {
  const sign = step.positive === null ? "" : step.positive ? "+" : "−"
  return `${sign}${formatCompactRial(step.valueRial)}`
}

function barClassName(step: WaterfallStep): string {
  if (step.kind === "start") return "bg-chart-5/50"
  if (step.kind === "end") return "bg-primary"
  return step.positive ? "bg-success/80" : "bg-destructive/80"
}

function chipClassName(step: WaterfallStep): string {
  if (step.kind === "start" || step.kind === "end") {
    return "bg-muted text-foreground"
  }
  return step.positive
    ? "bg-success/10 text-success-foreground"
    : "bg-destructive/10 text-destructive"
}

function modelSummaryFa(model: WaterfallModel): string {
  const drivers = model.steps
    .filter((step) => step.positive !== null)
    .map((step) => `${step.labelFa} ${formatSignedCompactRial(step)}`)
    .join("، ")
  return `فروش از ${formatCompactRial(model.previousVolumeRial)} به ${formatCompactRial(
    model.currentVolumeRial,
  )} رسید. تفکیک عوامل: ${drivers}.`
}

/**
 * Desktop waterfall: geometry lives in an LTR container (charts read
 * left-to-right); every label is Persian and RTL internally.
 */
function WaterfallChart({ model }: { model: WaterfallModel }) {
  const maxLevel = model.maxLevelRial
  const columnCount = model.steps.length
  const columnWidth = 100 / columnCount
  const barInset = columnWidth * 0.18

  return (
    <div dir="ltr" className="relative hidden pt-9 sm:block">
      <div className="relative h-48">
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 100"
        >
          {model.steps.slice(0, -1).map((step, index) => {
            const y = 100 - (step.cumulativeAfterRial / maxLevel) * 100
            return (
              <line
                key={`connector-${step.kind}`}
                className="stroke-border"
                strokeDasharray="3 3"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                x1={(index + 1) * columnWidth - barInset}
                x2={(index + 1) * columnWidth + barInset}
                y1={y}
                y2={y}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex items-end">
          {model.steps.map((step, index) => {
            const bottomPct =
              step.kind === "start" || step.kind === "end"
                ? 0
                : (Math.min(
                    index > 0 ? model.steps[index - 1].cumulativeAfterRial : 0,
                    step.cumulativeAfterRial,
                  ) /
                    maxLevel) *
                  100
            const heightPct = Math.max(
              (Math.abs(step.valueRial) / maxLevel) * 100,
              step.kind === "start" || step.kind === "end" ? 2 : 1.5,
            )
            const topPct = bottomPct + heightPct
            return (
              <div
                key={step.kind}
                className="relative h-full flex-1"
                style={{ minWidth: 0 }}
              >
                <span
                  className={cn(
                    "absolute z-10 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
                    chipClassName(step),
                  )}
                  style={{
                    bottom: `calc(${topPct}% + 6px)`,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}
                >
                  {formatSignedCompactRial(step)}
                </span>
                <div
                  className={cn(
                    "absolute rounded-t-md",
                    barClassName(step),
                  )}
                  style={{
                    left: "18%",
                    width: "64%",
                    bottom: `${bottomPct}%`,
                    height: `${heightPct}%`,
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-3 grid" style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))` }}>
        {model.steps.map((step) => (
          <div dir="rtl" key={step.kind} className="px-1 text-center">
            <p className="text-xs font-semibold text-foreground">{step.labelFa}</p>
            {step.changeSummaryFa ? (
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {step.changeSummaryFa}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function WaterfallList({ model }: { model: WaterfallModel }) {
  return (
    <ol className="grid gap-2 sm:hidden">
      {model.steps.map((step) => (
        <li
          key={step.kind}
          className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 px-3.5 py-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{step.labelFa}</p>
            {step.changeSummaryFa ? (
              <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                {step.changeSummaryFa}
              </p>
            ) : null}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
              chipClassName(step),
            )}
          >
            <span dir="ltr">{formatSignedCompactRial(step)}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

export function GrowthWaterfall({
  model,
  evidenceId,
  onEvidenceRequest,
}: {
  model: WaterfallModel
  evidenceId?: string | null
  onEvidenceRequest?: (evidenceId: string) => void
}) {
  return (
    <figure className="m-0" aria-label={modelSummaryFa(model)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pb-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-xs bg-success/80" />
          عامل افزایشی
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-xs bg-destructive/80" />
          عامل کاهشی
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-xs bg-primary" />
          فروش دوره
        </span>
      </div>
      <WaterfallChart model={model} />
      <WaterfallList model={model} />
      <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
        این تفکیک یک برآورد حسابداری از عوامل تغییر فروش است و ادعای علّی یا تضمین درآمد نیست.
      </figcaption>
      {evidenceId && onEvidenceRequest ? (
        <div className="mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-10 justify-start text-xs font-semibold text-primary hover:bg-primary/10 hover:text-primary"
            aria-label="مشاهده روش محاسبه تفکیک رشد"
            onClick={() => onEvidenceRequest(evidenceId)}
          >
            <Calculator aria-hidden="true" data-icon="inline-start" />
            چطور محاسبه شد؟
          </Button>
        </div>
      ) : null}
    </figure>
  )
}

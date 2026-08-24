import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpLeft,
  Calculator,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { InsightSummary } from "@/contracts"
import { cn } from "@/lib/utils"

import { AnimatedMetricValue } from "./animated-metric-value"

import { metricKindLabels } from "./metric-value"
import { localizePersianText } from "@/lib/persian-date"

const confidenceLabels: Record<InsightSummary["confidence"], string> = {
  high: "اطمینان بالا",
  medium: "اطمینان متوسط",
  low: "اطمینان پایین",
}

const statusPresentation: Record<
  InsightSummary["status"],
  { label: string; className: string; icon: typeof CircleCheck }
> = {
  opportunity: {
    label: "فرصت رشد",
    className: "bg-success/15 text-success-foreground border-success/30",
    icon: CircleCheck,
  },
  warning: {
    label: "نیازمند توجه",
    className: "bg-destructive/15 text-destructive border-destructive/30",
    icon: CircleAlert,
  },
  stable: {
    label: "پایدار",
    className: "bg-info/15 text-info-foreground border-info/30",
    icon: ShieldCheck,
  },
  "insufficient-data": {
    label: "داده ناکافی",
    className: "bg-muted text-muted-foreground border-border",
    icon: CircleMinus,
  },
}

/** Contextual call-to-action per feature: label + optional in-page anchor. */
const ctaByFeature: Record<
  InsightSummary["feature"],
  { labelFa: string; anchor?: string }
> = {
  recovery: { labelFa: "بررسی قیف پرداخت", anchor: "funnel" },
  growth: { labelFa: "مشاهده تفکیک رشد" },
  customers: { labelFa: "مشاهده وضعیت مشتریان" },
  peers: { labelFa: "مشاهده مقایسه هم‌صنف" },
  timing: { labelFa: "مشاهده فرصت‌های زمانی" },
}

export function InsightCard({
  insight,
  featured = false,
  rank,
  contextQuery,
  onEvidenceRequest,
}: {
  insight: InsightSummary
  featured?: boolean
  rank: number
  /** Optional query string (e.g. "merchant=M275") kept when navigating. */
  contextQuery?: string
  onEvidenceRequest: (evidenceId: string) => void
}) {
  const status = statusPresentation[insight.status]
  const StatusIcon = status.icon
  const cta = ctaByFeature[insight.feature]
  const ctaHref = `${insight.destination}${contextQuery ? `?${contextQuery}` : ""}${cta.anchor ? `#${cta.anchor}` : ""}`

  return (
    <Card
      className={cn(
        "h-full gap-5 transition-all duration-200",
        featured
          ? "border-primary/40 bg-gradient-to-b from-card via-card to-primary/[0.02] shadow-sm ring-1 ring-primary/25"
          : "border-border/70 hover:-translate-y-0.5 hover:border-border hover:shadow-sm",
      )}
    >
      <CardHeader className="gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-0.5 text-xs font-bold text-primary">
            اقدام {new Intl.NumberFormat("fa-IR").format(rank)}
          </span>
          <Badge
            variant="outline"
            className={cn("gap-1.5 font-semibold", status.className)}
          >
            <StatusIcon aria-hidden="true" data-icon="inline-start" />
            {status.label}
          </Badge>
        </div>
        <CardTitle className={cn(featured ? "text-lg sm:text-2xl" : "text-base sm:text-lg")}>
          <h3>{localizePersianText(insight.titleFa)}</h3>
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed text-foreground/80">
          {localizePersianText(insight.findingFa)}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        {insight.impact ? (
          <div className="rounded-2xl border border-border/50 bg-muted/50 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {localizePersianText(insight.impact.labelFa)}
              </span>
              <Badge
                variant={insight.impact.kind === "estimate" ? "default" : "secondary"}
                data-kind={insight.impact.kind}
              >
                {metricKindLabels[insight.impact.kind]}
              </Badge>
            </div>
            <p
              className={cn(
                "mt-2.5 break-words text-xl font-extrabold tabular-nums tracking-tight sm:text-3xl",
                insight.impact.value < 0 && "text-destructive",
                insight.impact.value > 0 && "text-success-foreground",
              )}
            >
              <span className="inline-flex flex-wrap items-center gap-x-1.5">
                {insight.impact.value < 0 ? (
                  <TrendingDown aria-hidden="true" className="size-5 shrink-0 sm:size-6" />
                ) : insight.impact.value > 0 ? (
                  <TrendingUp aria-hidden="true" className="size-5 shrink-0 sm:size-6" />
                ) : null}
                <AnimatedMetricValue metric={insight.impact} delayMs={260} />
              </span>
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            فعلاً عدد قابل اعتمادی برای این پیشنهاد نداریم.
          </div>
        )}

        <div className="flex gap-3.5 rounded-2xl border border-primary/20 bg-primary/[0.04] p-4">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ArrowLeft aria-hidden="true" className="size-4" />
          </span>
          <div>
            <p className="text-xs font-bold text-primary">اقدام پیشنهادی</p>
            <p className="mt-1 text-sm leading-relaxed font-medium text-foreground">{localizePersianText(insight.actionFa)}</p>
          </div>
        </div>

        <div className="mt-auto grid gap-1.5 border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
          <div className="flex items-start gap-2.5">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p>
              <span className="font-semibold text-foreground">
                {confidenceLabels[insight.confidence]}:
              </span>{" "}
              {localizePersianText(insight.confidenceReasonFa)}
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <CircleMinus aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p>
              سنجش اثر: نتیجه این پیشنهاد در دوره بعد با همین فرمول دوباره محاسبه می‌شود.
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <Button
            size="default"
            className="min-h-11 w-full sm:w-fit font-medium"
            aria-label={`چطور ${insight.titleFa} محاسبه شد؟`}
            onClick={() => onEvidenceRequest(insight.evidenceId)}
          >
            <Calculator aria-hidden="true" data-icon="inline-start" />
            چطور محاسبه شد؟
          </Button>
          <Button
            variant="outline"
            size="default"
            className="min-h-11 w-full sm:w-fit"
            nativeButton={false}
            render={<Link href={ctaHref} />}
          >
            {cta.labelFa}
            <ArrowUpLeft aria-hidden="true" data-icon="inline-end" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

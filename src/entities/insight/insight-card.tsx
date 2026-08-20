import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpLeft,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  ShieldCheck,
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

import { formatMetricValue, metricKindLabels } from "./metric-value"


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
    label: "فرصت",
    className: "bg-success/10 text-success-foreground ring-success/20",
    icon: CircleCheck,
  },
  warning: {
    label: "نیازمند توجه",
    className: "bg-destructive/10 text-destructive ring-destructive/20",
    icon: CircleAlert,
  },
  stable: {
    label: "پایدار",
    className: "bg-info/10 text-info-foreground ring-info/20",
    icon: ShieldCheck,
  },
  "insufficient-data": {
    label: "داده ناکافی",
    className: "bg-muted text-muted-foreground ring-border",
    icon: CircleMinus,
  },
}


export function InsightCard({
  insight,
  featured = false,
  rank,
}: {
  insight: InsightSummary
  featured?: boolean
  rank: number
}) {
  const status = statusPresentation[insight.status]
  const StatusIcon = status.icon

  return (
    <Card
      className={cn(
        "h-full gap-5",
        featured && "border-primary/40 bg-card ring-primary/30",
      )}
    >
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            اقدام {new Intl.NumberFormat("fa-IR").format(rank)}
          </span>
          <Badge
            variant="outline"
            className={cn("ring-1", status.className)}
          >
            <StatusIcon aria-hidden="true" data-icon="inline-start" />
            {status.label}
          </Badge>
        </div>
        <CardTitle className={cn(featured && "text-lg sm:text-xl")}>
          {insight.titleFa}
        </CardTitle>
        <CardDescription className="text-sm leading-7 text-foreground/80">
          {insight.findingFa}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-5">
        {insight.impact ? (
          <div className="rounded-lg bg-muted/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                {insight.impact.labelFa}
              </span>
              <Badge
                variant={insight.impact.kind === "estimate" ? "default" : "secondary"}
                data-kind={insight.impact.kind}
              >
                {metricKindLabels[insight.impact.kind]}
              </Badge>
            </div>
            <p className="mt-2 break-words text-xl font-bold tabular-nums sm:text-2xl">
              {formatMetricValue(insight.impact)}
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            برای این Insight اثر عددی قابل اتکا موجود نیست.
          </div>
        )}

        <div className="flex gap-3 rounded-lg border bg-card p-4">
          <ArrowLeft
            aria-hidden="true"
            className="mt-1 size-4 shrink-0 text-info"
          />
          <div>
            <p className="text-xs font-semibold text-info-foreground">اقدام پیشنهادی</p>
            <p className="mt-1 text-sm leading-7">{insight.actionFa}</p>
          </div>
        </div>

        <div className="mt-auto flex items-start gap-2 border-t pt-4 text-xs leading-6 text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold text-foreground">
              {confidenceLabels[insight.confidence]}:
            </span>{" "}
            {insight.confidenceReasonFa}
          </p>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="min-h-11 w-full sm:w-fit"
          render={<Link href={insight.destination} />}
        >
          بررسی جزئیات
          <ArrowUpLeft aria-hidden="true" data-icon="inline-end" />
        </Button>
      </CardContent>
    </Card>
  )
}

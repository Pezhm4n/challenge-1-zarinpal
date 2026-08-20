import type {
  ActionCenterPayload,
  AnalysisSelection,
  ArtifactError,
  EvidenceRecord,
  InsightSummary,
  MerchantSummary,
} from "@/contracts"

const confidenceOrder: Record<InsightSummary["confidence"], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function compareConfidenceThenId(
  left: InsightSummary,
  right: InsightSummary,
): number {
  return (
    confidenceOrder[left.confidence] - confidenceOrder[right.confidence] ||
    left.id.localeCompare(right.id, "en")
  )
}

function sortPriorityGroup(group: InsightSummary[]): InsightSummary[] {
  const sorted = [...group].sort(compareConfidenceThenId)
  const units = new Set(
    sorted.flatMap((insight) => (insight.impact ? [insight.impact.unit] : [])),
  )

  for (const unit of units) {
    const positions = sorted.flatMap((insight, index) =>
      insight.impact?.unit === unit ? [index] : [],
    )
    const sameUnitInsights = positions
      .map((position) => sorted[position])
      .sort((left, right) => {
        const impactDifference =
          (right.impact?.value ?? Number.NEGATIVE_INFINITY) -
          (left.impact?.value ?? Number.NEGATIVE_INFINITY)
        return impactDifference || compareConfidenceThenId(left, right)
      })

    positions.forEach((position, index) => {
      sorted[position] = sameUnitInsights[index]
    })
  }

  return sorted
}

/**
 * Sort by priority first. Inside a priority, impact reorders only the slots
 * occupied by the same unit; different units retain confidence/ID ordering.
 */
export function prioritizeInsights(
  insights: readonly InsightSummary[],
  evidenceIndex: Readonly<Record<string, EvidenceRecord>>,
  limit = 3,
): InsightSummary[] {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new RangeError("Insight limit must be a non-negative integer")
  }

  const validInsights = insights.filter(
    (insight) => evidenceIndex[insight.evidenceId] !== undefined,
  )
  const groupedByPriority = new Map<number, InsightSummary[]>()

  for (const insight of validInsights) {
    const group = groupedByPriority.get(insight.priority) ?? []
    group.push(insight)
    groupedByPriority.set(insight.priority, group)
  }

  return [...groupedByPriority.entries()]
    .sort(([leftPriority], [rightPriority]) => leftPriority - rightPriority)
    .flatMap(([, group]) => sortPriorityGroup(group))
    .slice(0, limit)
}

export type FeatureContribution = {
  datasetFingerprint: string
  insights: readonly InsightSummary[]
  evidence: readonly EvidenceRecord[]
}

export type MergeActionCenterInput = {
  datasetFingerprint: string
  merchant: MerchantSummary
  selection: AnalysisSelection
  headlineMetrics: ActionCenterPayload["headlineMetrics"]
  contributions: readonly FeatureContribution[]
}

export type MergeActionCenterResult =
  | { success: true; data: ActionCenterPayload }
  | { success: false; error: ArtifactError }

function invalidContributionError(messageFa: string): MergeActionCenterResult {
  return {
    success: false,
    error: {
      code: "INVALID_SCHEMA",
      messageFa,
      recoverable: false,
    },
  }
}

export function mergeActionCenterContributions(
  input: MergeActionCenterInput,
): MergeActionCenterResult {
  if (
    input.merchant.merchantKey !== input.selection.merchantKey ||
    !input.merchant.availablePeriods.some(
      (period) =>
        period.from === input.selection.period.from &&
        period.to === input.selection.period.to,
    )
  ) {
    return invalidContributionError(
      "پذیرنده یا بازه گزارش با اطلاعات انتخاب‌شده هماهنگ نیست.",
    )
  }

  const evidenceIndex: Record<string, EvidenceRecord> = {}
  const insights: InsightSummary[] = []

  for (const contribution of input.contributions) {
    if (contribution.datasetFingerprint !== input.datasetFingerprint) {
      return invalidContributionError(
        "نسخه داده تحلیل‌ها یکسان نیست. گزارش‌ها باید دوباره تولید شوند.",
      )
    }

    for (const evidence of contribution.evidence) {
      if (
        evidence.datasetFingerprint !== input.datasetFingerprint ||
        evidenceIndex[evidence.id] !== undefined
      ) {
        return invalidContributionError(
          "مدرک تحلیل تکراری یا متعلق به نسخه دیگری از داده است.",
        )
      }
      evidenceIndex[evidence.id] = evidence
    }
    insights.push(...contribution.insights)
  }

  for (const metric of input.headlineMetrics) {
    if (evidenceIndex[metric.evidenceId] === undefined) {
      return invalidContributionError("مدرک یکی از عددهای اصلی گزارش پیدا نشد.")
    }
  }

  return {
    success: true,
    data: {
      merchant: input.merchant,
      selection: input.selection,
      headlineMetrics: input.headlineMetrics,
      prioritizedInsights: prioritizeInsights(insights, evidenceIndex),
      evidenceIndex,
    },
  }
}

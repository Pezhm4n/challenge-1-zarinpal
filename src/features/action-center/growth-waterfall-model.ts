/**
 * Pure growth-waterfall computation for the Action Center.
 *
 * The waterfall explains the verified sales change of the selected period by
 * decomposing it into traffic / conversion / ticket contributions. Every input
 * comes from the peer-opportunities artifact; nothing here is fabricated.
 */

export type WaterfallDriver = "traffic" | "conversion" | "ticket"

export type GrowthDecompositionDriver = {
  driver: WaterfallDriver
  current: number
  previous: number
  changePct: number
  contributionRial: number
}

export type GrowthDecompositionSource = {
  merchantKey: string
  drivers: readonly GrowthDecompositionDriver[]
  /** Verified sales volume of the current period in rials (peer benchmark). */
  currentVolumeRial: number | null
}

export type WaterfallStep = {
  /** "start"/"end" are absolute volume bars; drivers are contribution bars. */
  kind: "start" | "end" | WaterfallDriver
  labelFa: string
  valueRial: number
  /** Running total after this step; drives bar placement and connectors. */
  cumulativeAfterRial: number
  /** Sign of the contribution (null for start/end volume bars). */
  positive: boolean | null
  /** Driver movement rendered as «previous ← current» (null for start/end). */
  changeSummaryFa: string | null
}

export type WaterfallModel = {
  previousVolumeRial: number
  currentVolumeRial: number
  totalChangeRial: number
  steps: WaterfallStep[]
  /** Largest absolute level, used to scale bar heights. */
  maxLevelRial: number
}

export const waterfallDriverLabelsFa: Record<WaterfallDriver, string> = {
  traffic: "ترافیک ورودی",
  conversion: "نرخ پرداخت موفق",
  ticket: "میانگین مبلغ خرید",
}

const driverOrder: readonly WaterfallDriver[] = [
  "traffic",
  "conversion",
  "ticket",
]

const faInteger = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 })
const faOneDecimal = new Intl.NumberFormat("fa-IR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

function driverChangeSummaryFa(
  driver: WaterfallDriver,
  previous: number,
  current: number,
): string {
  if (driver === "conversion") {
    return `${faOneDecimal.format(previous)}٪ ← ${faOneDecimal.format(current)}٪`
  }
  if (driver === "ticket") {
    return `${faInteger.format(Math.round(previous))} ← ${faInteger.format(Math.round(current))} ریال`
  }
  return `${faInteger.format(previous)} ← ${faInteger.format(current)}`
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

/**
 * Builds waterfall steps from the decomposition drivers and the current
 * verified volume. Returns null when any input is missing or inconsistent so
 * the UI can hide the chart instead of showing invented numbers.
 */
export function buildWaterfallModel(
  source: GrowthDecompositionSource | null | undefined,
): WaterfallModel | null {
  if (!source || !isFiniteNumber(source.currentVolumeRial)) return null

  const drivers = driverOrder.map((driver) =>
    source.drivers.find((item) => item.driver === driver),
  )
  if (drivers.some((driver) => driver === undefined)) return null
  if (
    drivers.some(
      (driver) =>
        !Number.isInteger(driver!.contributionRial) ||
        !isFiniteNumber(driver!.current) ||
        !isFiniteNumber(driver!.previous),
    )
  ) {
    return null
  }

  const totalChangeRial = drivers.reduce(
    (sum, driver) => sum + driver!.contributionRial,
    0,
  )
  const previousVolumeRial = source.currentVolumeRial - totalChangeRial
  if (!Number.isFinite(previousVolumeRial) || previousVolumeRial <= 0) {
    return null
  }
  if (source.currentVolumeRial <= 0) return null

  const steps: WaterfallStep[] = [
    {
      kind: "start",
      labelFa: "فروش دوره قبل",
      valueRial: previousVolumeRial,
      cumulativeAfterRial: previousVolumeRial,
      positive: null,
      changeSummaryFa: null,
    },
  ]

  let runningTotal = previousVolumeRial
  for (const driver of drivers) {
    runningTotal += driver!.contributionRial
    steps.push({
      kind: driver!.driver,
      labelFa: waterfallDriverLabelsFa[driver!.driver],
      valueRial: driver!.contributionRial,
      cumulativeAfterRial: runningTotal,
      positive: driver!.contributionRial >= 0,
      changeSummaryFa: driverChangeSummaryFa(
        driver!.driver,
        driver!.previous,
        driver!.current,
      ),
    })
  }

  steps.push({
    kind: "end",
    labelFa: "فروش این دوره",
    valueRial: source.currentVolumeRial,
    cumulativeAfterRial: source.currentVolumeRial,
    positive: null,
    changeSummaryFa: null,
  })

  const maxLevelRial = Math.max(
    previousVolumeRial,
    source.currentVolumeRial,
    ...steps.map((step) => Math.abs(step.cumulativeAfterRial)),
  )

  return {
    previousVolumeRial,
    currentVolumeRial: source.currentVolumeRial,
    totalChangeRial,
    steps,
    maxLevelRial,
  }
}

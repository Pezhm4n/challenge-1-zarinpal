import assert from "node:assert/strict"
import test from "node:test"

import {
  buildWaterfallModel,
  waterfallDriverLabelsFa,
} from "../../src/features/action-center/growth-waterfall-model.ts"

/**
 * Fixture mirrors M275's peer-opportunities decomposition. Expected values are
 * computed by hand:
 *   total change = 1_887_428_470 - 5_480_727_254 + 236_038_784 = -3_357_260_000
 *   previous volume = 10_421_270_000 - (-3_357_260_000) = 13_778_530_000
 */
const m275Source = {
  merchantKey: "M275",
  currentVolumeRial: 10_421_270_000,
  drivers: [
    { driver: "traffic", current: 3183, previous: 2730, changePct: 16.5934, contributionRial: 1_887_428_470 },
    { driver: "conversion", current: 36.7578, previous: 57.7656, changePct: -36.3673, contributionRial: -5_480_727_254 },
    { driver: "ticket", current: 8_907_068.3761, previous: 8_737_178.1864, changePct: 1.9445, contributionRial: 236_038_784 },
  ],
}

test("آبشار رشد جمع عوامل و فروش دوره قبل را درست محاسبه می‌کند", () => {
  const model = buildWaterfallModel(m275Source)

  assert.notEqual(model, null)
  if (!model) return
  assert.equal(model.totalChangeRial, -3_357_260_000)
  assert.equal(model.previousVolumeRial, 13_778_530_000)
  assert.equal(model.currentVolumeRial, 10_421_270_000)
  assert.equal(model.steps.length, 5)

  const [start, traffic, conversion, ticket, end] = model.steps
  assert.equal(start.kind, "start")
  assert.equal(start.valueRial, 13_778_530_000)
  assert.equal(start.cumulativeAfterRial, 13_778_530_000)
  assert.equal(traffic.cumulativeAfterRial, 13_778_530_000 + 1_887_428_470)
  assert.equal(traffic.positive, true)
  assert.equal(conversion.positive, false)
  assert.equal(
    conversion.cumulativeAfterRial,
    13_778_530_000 + 1_887_428_470 - 5_480_727_254,
  )
  assert.equal(
    ticket.cumulativeAfterRial,
    13_778_530_000 + 1_887_428_470 - 5_480_727_254 + 236_038_784,
  )
  assert.equal(end.kind, "end")
  assert.equal(end.cumulativeAfterRial, 10_421_270_000)
  // Running total must reconcile with the headline sales change.
  assert.equal(end.cumulativeAfterRial - start.cumulativeAfterRial, model.totalChangeRial)
})

test("برچسب فارسی هر عامل در خروجی آبشار حفظ می‌شود", () => {
  const model = buildWaterfallModel(m275Source)
  assert.notEqual(model, null)
  if (!model) return
  const driverSteps = model.steps.filter((step) => step.positive !== null)
  assert.deepEqual(
    driverSteps.map((step) => step.labelFa),
    [
      waterfallDriverLabelsFa.traffic,
      waterfallDriverLabelsFa.conversion,
      waterfallDriverLabelsFa.ticket,
    ],
  )
  for (const step of driverSteps) {
    assert.equal(typeof step.changeSummaryFa, "string")
    assert.ok(step.changeSummaryFa.includes("←"))
  }
})

test("آبشار با داده ناقص یا ناسازگار ساخته نمی‌شود", () => {
  assert.equal(buildWaterfallModel(null), null)
  assert.equal(buildWaterfallModel(undefined), null)
  assert.equal(
    buildWaterfallModel({ ...m275Source, currentVolumeRial: null }),
    null,
  )
  // Missing driver
  assert.equal(
    buildWaterfallModel({
      ...m275Source,
      drivers: m275Source.drivers.slice(0, 2),
    }),
    null,
  )
  // Non-integer contribution violates the rial invariant
  assert.equal(
    buildWaterfallModel({
      ...m275Source,
      drivers: m275Source.drivers.map((driver) =>
        driver.driver === "ticket"
          ? { ...driver, contributionRial: 236_038_784.5 }
          : driver,
      ),
    }),
    null,
  )
  // Previous volume turning non-positive means the inputs are inconsistent.
  const impossibleSource = {
    merchantKey: "M275",
    currentVolumeRial: 1000,
    drivers: m275Source.drivers.map((driver) => ({
      ...driver,
      contributionRial: Math.abs(driver.contributionRial),
    })),
  }
  assert.equal(buildWaterfallModel(impossibleSource), null)
})

test("مقیاس آبشار بزرگ‌ترین سطح مطلق را مبنا قرار می‌دهد", () => {
  const model = buildWaterfallModel(m275Source)
  assert.notEqual(model, null)
  if (!model) return
  // Previous volume is the highest level in this fixture.
  assert.equal(model.maxLevelRial, 13_778_530_000 + 1_887_428_470)
})

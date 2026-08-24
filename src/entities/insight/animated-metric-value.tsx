"use client"

import { useEffect, useRef } from "react"

import type { MetricValue } from "@/contracts"

import { formatMetricValue } from "./metric-value"

/**
 * Renders a metric value that counts up from zero when it first appears.
 * The final value is always rendered for SSR, invalid/zero/negative values,
 * and reduced-motion users; the animation only rewrites the text content of
 * this span, so no React state is involved.
 */
export function AnimatedMetricValue({
  metric,
  delayMs = 150,
  durationMs = 900,
}: {
  metric: MetricValue
  delayMs?: number
  durationMs?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const { kind, unit, value, displayPrecision, labelFa } = metric

  useEffect(() => {
    const el = ref.current
    if (!el || !Number.isFinite(value) || value <= 0) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let raf = 0
    let start: number | null = null
    const renderValue = (nextValue: number) => {
      el.textContent = formatMetricValue({
        kind,
        unit,
        displayPrecision,
        labelFa,
        value: nextValue,
      })
    }

    const timeout = window.setTimeout(() => {
      renderValue(0)
      const step = (now: number) => {
        if (start === null) start = now
        const progress = Math.min((now - start) / durationMs, 1)
        renderValue(value * (1 - Math.pow(1 - progress, 3)))
        if (progress < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delayMs)

    return () => {
      window.clearTimeout(timeout)
      cancelAnimationFrame(raf)
    }
  }, [kind, unit, value, displayPrecision, labelFa, delayMs, durationMs])

  return <span ref={ref}>{formatMetricValue(metric)}</span>
}

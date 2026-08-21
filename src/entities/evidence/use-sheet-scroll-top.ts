"use client"

import { useEffect, useRef } from "react"

export function useSheetScrollTop(open: boolean, resetKey?: string) {
  const contentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const el = contentRef.current
    if (!el) return

    el.scrollTo({ top: 0 })
    const raf = window.requestAnimationFrame(() => {
      if (el.scrollTop !== 0) el.scrollTo({ top: 0 })
    })
    return () => window.cancelAnimationFrame(raf)
  }, [open, resetKey])

  return contentRef
}

"use client"

import { useRouter } from "next/navigation"
import { useCallback, useRef, useState, useTransition } from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type MerchantSelectorProps = {
  merchantKey: string
  merchantKeys: string[]
}

export function MerchantSelector({
  merchantKey,
  merchantKeys,
}: MerchantSelectorProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const [contentMaxHeight, setContentMaxHeight] = useState<number | undefined>(
    undefined,
  )
  const merchantOptions = merchantKeys.map((key) => ({
    label: key,
    value: key,
  }))

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) return
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setContentMaxHeight(
      Math.max(160, Math.min(320, window.innerHeight - rect.bottom - 16)),
    )
  }, [])

  return (
    <div className="flex min-w-48 flex-col gap-1.5">
      <label
        className="text-xs font-medium text-muted-foreground"
        id="merchant-selector-label"
      >
        فروشگاه
      </label>
      <Select
        items={merchantOptions}
        value={merchantKey}
        onOpenChange={handleOpenChange}
        onValueChange={(value) => {
          if (!value || value === merchantKey) {
            return
          }
          startTransition(() => {
            router.push(`/customers?merchant=${encodeURIComponent(value)}`)
          })
        }}
      >
        <SelectTrigger
          ref={triggerRef}
          aria-labelledby="merchant-selector-label"
          aria-busy={isPending}
          className="min-h-11 w-full"
        >
          <SelectValue>{merchantKey}</SelectValue>
        </SelectTrigger>
        <SelectContent
          align="start"
          side="bottom"
          collisionAvoidance={{ side: "shift", align: "shift", fallbackAxisSide: "none" }}
          style={contentMaxHeight ? { maxHeight: contentMaxHeight } : undefined}
        >
          <SelectGroup>
            <SelectLabel>فروشگاه‌ها</SelectLabel>
            {merchantOptions.map((option) => (
              <SelectItem
                className="min-h-11"
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

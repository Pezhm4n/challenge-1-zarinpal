"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


export function RecoveryMerchantSelector({
  merchantKey,
  merchantKeys,
}: {
  merchantKey: string
  merchantKeys: string[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const options = merchantKeys.map((key) => ({ label: key, value: key }))

  return (
    <div className="flex min-w-48 flex-col gap-1.5">
      <label
        id="recovery-merchant-label"
        className="text-xs font-medium text-muted-foreground"
      >
        پذیرنده نمایشی
      </label>
      <Select
        items={options}
        value={merchantKey}
        onValueChange={(value) => {
          if (!value || value === merchantKey) return
          startTransition(() => {
            router.push(`/recovery?merchant=${encodeURIComponent(value)}`)
          })
        }}
      >
        <SelectTrigger
          aria-labelledby="recovery-merchant-label"
          aria-busy={isPending}
          className="min-h-11 w-full bg-card"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          <SelectGroup>
            <SelectLabel>پذیرنده‌ها</SelectLabel>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="min-h-11"
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

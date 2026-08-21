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
} from "./ui/select"

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
  const merchantOptions = merchantKeys.map((key) => ({
    label: key,
    value: key,
  }))

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
          aria-labelledby="merchant-selector-label"
          aria-busy={isPending}
          className="min-h-11 w-full"
        >
          <SelectValue>{merchantKey}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
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

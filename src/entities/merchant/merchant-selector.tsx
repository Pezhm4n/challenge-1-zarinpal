"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


export type MerchantOption = {
  value: string
  label: string
  description: string
}


export function MerchantSelector({
  value,
  options,
  onValueChange,
}: {
  value: string
  options: readonly MerchantOption[]
  onValueChange: (value: string) => void
}) {
  return (
    <div className="grid gap-2">
      <label id="merchant-selector-label" className="text-xs font-medium text-muted-foreground">
        پذیرنده
      </label>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onValueChange(nextValue)
        }}
      >
        <SelectTrigger
          className="min-h-11 w-full bg-card sm:min-w-56"
          aria-labelledby="merchant-selector-label"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="grid gap-0.5">
                <span className="font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

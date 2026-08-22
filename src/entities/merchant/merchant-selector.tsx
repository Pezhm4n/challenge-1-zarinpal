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
  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label id="merchant-selector-label" className="text-xs font-semibold text-muted-foreground">
        فروشگاه
      </label>
      <Select
        items={options}
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onValueChange(nextValue)
        }}
      >
        <SelectTrigger
          className="min-h-11 w-full bg-card sm:w-60"
          aria-labelledby="merchant-selector-label"
        >
          <SelectValue>{selectedOption?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-baseline gap-2">
                <span className="font-semibold text-foreground">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  ({option.description})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

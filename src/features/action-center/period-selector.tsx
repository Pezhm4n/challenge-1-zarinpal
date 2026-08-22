"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


export type PeriodOption = {
  value: string
  label: string
  triggerLabel?: string
}


export function PeriodSelector({
  value,
  options,
  onValueChange,
}: {
  value: string
  options: readonly PeriodOption[]
  onValueChange: (value: string) => void
}) {
  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label id="period-selector-label" className="text-xs font-semibold text-muted-foreground">
        بازه زمانی
      </label>
      <Select
        items={options}
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onValueChange(nextValue)
        }}
      >
        <SelectTrigger
          className="min-h-11 w-full bg-card sm:w-72"
          aria-labelledby="period-selector-label"
        >
          <SelectValue>{selectedOption?.triggerLabel ?? selectedOption?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

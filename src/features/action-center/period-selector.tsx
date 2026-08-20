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
  return (
    <div className="grid gap-2">
      <label id="period-selector-label" className="text-xs font-medium text-muted-foreground">
        دوره تحلیل
      </label>
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue !== null) onValueChange(nextValue)
        }}
      >
        <SelectTrigger
          className="min-h-11 w-full bg-card sm:min-w-64"
          aria-labelledby="period-selector-label"
        >
          <SelectValue />
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

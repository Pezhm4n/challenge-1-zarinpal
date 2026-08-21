type OperandTone = "default" | "result"

function OperandBox({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: OperandTone
}) {
  const isResult = tone === "result"
  return (
    <div
      dir="rtl"
      className={`flex-1 rounded-xl border p-3 sm:min-w-36 ${
        isResult
          ? "border-primary/30 bg-primary/10"
          : "border-border/60 bg-background"
      }`}
    >
      <p
        className={`text-[11px] font-semibold leading-4 ${
          isResult ? "text-primary/80" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-1 break-words text-base font-extrabold tabular-nums sm:text-lg ${
          isResult ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function EquationSymbol({ children }: { children: string }) {
  return (
    <>
      <span
        aria-hidden="true"
        className="hidden items-center justify-center text-xl font-bold text-muted-foreground sm:flex"
      >
        {children}
      </span>
      <div
        aria-hidden="true"
        className="flex items-center gap-3 sm:hidden"
      >
        <span className="h-px flex-1 bg-border" />
        <span className="text-lg font-bold text-muted-foreground">
          {children}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  )
}

export function CalculationEquation({
  numeratorLabel,
  numeratorValue,
  denominatorLabel,
  denominatorValue,
  resultDisplay,
}: {
  numeratorLabel: string
  numeratorValue: string
  denominatorLabel: string
  denominatorValue: string
  resultDisplay: string
}) {
  return (
    <div
      dir="ltr"
      role="group"
      aria-label="معادله محاسبه این عدد"
      className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-x-2"
    >
      <OperandBox label={numeratorLabel} value={numeratorValue} tone="default" />
      <EquationSymbol>÷</EquationSymbol>
      <OperandBox
        label={denominatorLabel}
        value={denominatorValue}
        tone="default"
      />
      <EquationSymbol>=</EquationSymbol>
      <OperandBox label="نتیجه" value={resultDisplay} tone="result" />
    </div>
  )
}

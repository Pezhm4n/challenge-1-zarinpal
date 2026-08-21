import { CircleAlert, DatabaseZap, FileQuestion } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ArtifactError } from "@/contracts"

export function ActionCenterErrorState({ error }: { error: ArtifactError }) {
  return (
    <section aria-labelledby="action-center-error-title">
      <Card className="mx-auto max-w-2xl rounded-3xl p-6 shadow-sm sm:p-8">
        <CardHeader className="gap-3 p-0">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            <FileQuestion aria-hidden="true" className="size-6" />
          </div>
          <CardTitle>
            <h1 id="action-center-error-title" className="text-xl font-bold tracking-tight text-foreground">
              گزارش قابل نمایش نیست
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-4 p-0">
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>داده این گزارش کامل نیست</AlertTitle>
            <AlertDescription>{error.messageFa}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </section>
  )
}

export function ActionCenterEmptyState() {
  return (
    <Card className="rounded-3xl border-dashed border-border/80 bg-muted/20">
      <CardContent className="grid justify-items-center gap-3 py-12 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground shadow-2xs">
          <DatabaseZap aria-hidden="true" className="size-7" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Insight دارای مدرک موجود نیست</h3>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          برای این انتخاب هنوز اقدام قابل اتکایی تولید نشده است. پذیرنده یا بازه دیگری را انتخاب کنید.
        </p>
      </CardContent>
    </Card>
  )
}

export function InsufficientDataNotice() {
  return (
    <Alert className="rounded-2xl">
      <DatabaseZap aria-hidden="true" />
      <AlertTitle>داده برای نتیجه قطعی کافی نیست</AlertTitle>
      <AlertDescription>
        این تحلیل با برچسب داده ناکافی نمایش داده می‌شود. تصمیم نهایی را پس از کامل‌شدن پوشش بازه بگیرید.
      </AlertDescription>
    </Alert>
  )
}


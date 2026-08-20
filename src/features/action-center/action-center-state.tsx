import { CircleAlert, DatabaseZap, FileQuestion } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ArtifactError } from "@/contracts"

export function ActionCenterErrorState({ error }: { error: ArtifactError }) {
  return (
    <section aria-labelledby="action-center-error-title">
      <Card className="mx-auto max-w-2xl">
        <CardHeader className="gap-3">
          <FileQuestion aria-hidden="true" className="size-7 text-destructive" />
          <CardTitle>
            <h1 id="action-center-error-title" className="text-xl font-bold">
              گزارش قابل نمایش نیست
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
    <Card className="border-dashed bg-muted/30">
      <CardContent className="grid justify-items-center gap-2 py-8 text-center">
        <DatabaseZap aria-hidden="true" className="size-7 text-muted-foreground" />
        <h3 className="font-bold">Insight دارای مدرک موجود نیست</h3>
        <p className="max-w-lg text-sm leading-6 text-muted-foreground">
          برای این انتخاب هنوز اقدام قابل اتکایی تولید نشده است. پذیرنده یا بازه دیگری را انتخاب کنید.
        </p>
      </CardContent>
    </Card>
  )
}

export function InsufficientDataNotice() {
  return (
    <Alert>
      <DatabaseZap aria-hidden="true" />
      <AlertTitle>داده برای نتیجه قطعی کافی نیست</AlertTitle>
      <AlertDescription>
        این تحلیل با برچسب داده ناکافی نمایش داده می‌شود. تصمیم نهایی را پس از کامل‌شدن پوشش بازه بگیرید.
      </AlertDescription>
    </Alert>
  )
}

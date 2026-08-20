"use client"

import { CircleAlert, RotateCcw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"


export default function RecoveryError({ reset }: { reset: () => void }) {
  return (
    <section
      aria-labelledby="recovery-unexpected-error-title"
      className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center"
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle>
            <h1 id="recovery-unexpected-error-title" className="text-xl font-bold">
              آماده‌سازی تحلیل بازیابی متوقف شد
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>خطای موقت</AlertTitle>
            <AlertDescription>
              گزارش نمایش داده نشد. دوباره تلاش کنید؛ مسیر فایل، Stack trace یا جزئیات داخلی در این صفحه نمایش داده نمی‌شود.
            </AlertDescription>
          </Alert>
          <Button className="min-h-11 w-full sm:w-fit" onClick={reset}>
            <RotateCcw aria-hidden="true" data-icon="inline-start" />
            تلاش دوباره
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

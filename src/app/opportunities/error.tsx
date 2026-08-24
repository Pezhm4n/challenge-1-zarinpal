"use client"

import { CircleAlert, RotateCcw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function OpportunitiesError({ reset }: { reset: () => void }) {
  return (
    <section
      aria-labelledby="opportunities-unexpected-error-title"
      className="mx-auto flex min-h-[50vh] w-full max-w-3xl items-center py-8"
    >
      <Card className="w-full rounded-2xl p-6 shadow-sm sm:p-8">
        <CardHeader className="p-0">
          <CardTitle>
            <h1
              id="opportunities-unexpected-error-title"
              className="text-xl font-bold tracking-tight text-foreground"
            >
              آماده‌سازی تحلیل فرصت‌ها متوقف شد
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-5 grid gap-5 p-0">
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>خطای موقت</AlertTitle>
            <AlertDescription>
              گزارش فرصت‌های رشد نمایش داده نشد. دوباره تلاش کنید؛ جزئیات فنی
              داخلی برای امنیت نمایش داده نمی‌شود.
            </AlertDescription>
          </Alert>
          <Button
            className="min-h-11 w-full sm:w-fit font-medium"
            onClick={reset}
          >
            <RotateCcw aria-hidden="true" data-icon="inline-start" />
            تلاش دوباره
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}

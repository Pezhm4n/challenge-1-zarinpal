"use client"

import { CircleAlert, RotateCcw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section aria-labelledby="unexpected-error-title">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>
            <h1 id="unexpected-error-title" className="text-xl font-bold">
              آماده‌سازی گزارش متوقف شد
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>خطای موقت</AlertTitle>
            <AlertDescription>
              جزئیات گزارش نمایش داده نشد. دوباره تلاش کنید؛ اطلاعات فنی داخلی برای امنیت نمایش داده نمی‌شود.
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

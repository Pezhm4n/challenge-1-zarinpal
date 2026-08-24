"use client"

import { CircleAlert, RotateCcw } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section aria-labelledby="unexpected-error-title" className="py-12">
      <Card className="mx-auto max-w-2xl rounded-2xl p-6 shadow-sm sm:p-8">
        <CardHeader className="p-0">
          <CardTitle>
            <h1 id="unexpected-error-title" className="text-xl font-bold tracking-tight text-foreground">
              آماده‌سازی گزارش متوقف شد
            </h1>
          </CardTitle>
        </CardHeader>
        <CardContent className="mt-5 grid gap-5 p-0">
          <Alert variant="destructive" className="rounded-2xl">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>خطای موقت</AlertTitle>
            <AlertDescription>
              جزئیات گزارش نمایش داده نشد. دوباره تلاش کنید؛ اطلاعات فنی داخلی برای امنیت نمایش داده نمی‌شود.
            </AlertDescription>
          </Alert>
          <Button className="min-h-10 w-full sm:w-fit font-medium" onClick={reset}>
            <RotateCcw aria-hidden="true" data-icon="inline-start" />
            تلاش دوباره
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}


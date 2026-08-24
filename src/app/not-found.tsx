import Link from "next/link"
import { Compass } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function NotFound() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="mx-auto flex min-h-[50vh] w-full max-w-2xl items-center py-8"
    >
      <Card className="w-full rounded-2xl p-6 shadow-sm sm:p-8">
        <CardContent className="grid gap-5 p-0 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Compass aria-hidden="true" className="size-6" />
          </div>
          <div className="grid gap-1.5">
            <h1
              id="not-found-title"
              className="text-xl font-bold tracking-tight text-foreground"
            >
              این صفحه در نبض زرین وجود ندارد
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              آدرس واردشده اشتباه است یا صفحه جابه‌جا شده است. از منوی اصلی یکی
              از گزارش‌ها را باز کنید.
            </p>
          </div>
          <div className="mx-auto grid w-full gap-2 sm:w-fit sm:grid-cols-2">
            <Button
              className="min-h-11 font-medium"
              nativeButton={false}
              render={<Link href="/" />}
            >
              رفتن به مرکز اقدام
            </Button>
            <Button
              variant="outline"
              className="min-h-11"
              nativeButton={false}
              render={<Link href="/recovery" />}
            >
              گزارش نجات فروش
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

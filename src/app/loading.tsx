import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="grid gap-6" role="status" aria-live="polite" aria-label="در حال آماده‌سازی گزارش">
      <span className="sr-only">گزارش در حال آماده‌شدن است.</span>
      <Card>
        <CardHeader className="gap-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-3/4 max-w-lg" />
          <Skeleton className="h-5 w-full max-w-2xl" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}

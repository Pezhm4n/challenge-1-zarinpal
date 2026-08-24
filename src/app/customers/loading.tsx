import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function CustomersLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="در حال بارگذاری گزارش مشتریان"
      className="grid min-w-0 gap-8 lg:gap-10"
    >
      <div className="grid min-w-0 gap-3 rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
        <Skeleton className="h-5 w-24 max-w-full rounded-full" />
        <Skeleton className="h-9 w-full max-w-md rounded-xl" />
        <Skeleton className="h-5 w-full max-w-lg rounded-lg" />
      </div>
      <Card className="min-w-0 rounded-2xl">
        <CardHeader className="min-w-0 gap-2">
          <Skeleton className="h-6 w-full max-w-xs rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
        </CardHeader>
        <CardContent className="grid min-w-0 gap-4 md:grid-cols-3">
          <Skeleton className="h-24 sm:h-28 w-full rounded-2xl" />
          <Skeleton className="h-24 sm:h-28 w-full rounded-2xl" />
          <Skeleton className="h-24 sm:h-28 w-full rounded-2xl" />
        </CardContent>
      </Card>
      <Skeleton className="h-64 sm:h-80 w-full min-w-0 rounded-2xl" />
    </div>
  )
}

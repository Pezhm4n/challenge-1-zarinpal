import { Card, CardContent, CardHeader } from "@/features/customer-growth/ui/card"
import { Skeleton } from "@/features/customer-growth/ui/skeleton"

export default function CustomersLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="در حال بارگذاری تحلیل مشتری"
      className="grid gap-8 lg:gap-10"
    >
      <div className="grid gap-3 rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-9 w-64 max-w-full rounded-xl" />
        <Skeleton className="h-5 w-96 max-w-full rounded-lg" />
      </div>
      <Card className="rounded-2xl">
        <CardHeader className="gap-2">
          <Skeleton className="h-6 w-56 max-w-full rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </CardContent>
      </Card>
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  )
}


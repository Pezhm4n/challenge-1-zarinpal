import { Card, CardContent, CardHeader } from "@/features/customer-growth/ui/card"
import { Skeleton } from "@/features/customer-growth/ui/skeleton"

export default function CustomersLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="در حال بارگذاری تحلیل مشتری"
      className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8"
    >
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-5 w-96 max-w-full" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-56 max-w-full" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
      <Skeleton className="h-80 w-full" />
    </main>
  )
}

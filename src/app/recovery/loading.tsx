import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"


export default function RecoveryLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="در حال بارگذاری گزارش نجات فروش"
      className="grid min-w-0 gap-8 lg:gap-10"
    >
      <div className="grid min-w-0 gap-3 rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
        <Skeleton className="h-5 w-full max-w-36 rounded-full" />
        <Skeleton className="h-9 w-full max-w-sm rounded-xl" />
        <Skeleton className="h-5 w-full max-w-2xl rounded-lg" />
      </div>
      <Card className="min-w-0 rounded-2xl">
        <CardHeader className="min-w-0 gap-2">
          <Skeleton className="h-7 w-full max-w-xs rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
        </CardHeader>
        <CardContent className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-48 sm:h-56 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 sm:h-80 w-full rounded-2xl" />
        <Skeleton className="h-64 sm:h-80 w-full rounded-2xl" />
      </div>
    </div>
  )
}

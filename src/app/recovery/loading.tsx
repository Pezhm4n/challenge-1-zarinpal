import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"


export default function RecoveryLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="در حال بارگذاری تحلیل بازیابی"
      className="grid gap-6"
    >
      <div className="grid gap-3 rounded-xl border bg-card p-4 sm:p-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-72 max-w-full" />
          <Skeleton className="h-5 w-full" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-56 w-full" />
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    </div>
  )
}

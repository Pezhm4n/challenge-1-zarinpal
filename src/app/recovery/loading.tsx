import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"


export default function RecoveryLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="در حال بارگذاری تحلیل بازیابی"
      className="grid gap-8 lg:gap-10"
    >
      <div className="grid gap-3 rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
        <Skeleton className="h-5 w-36 rounded-full" />
        <Skeleton className="h-9 w-80 max-w-full rounded-xl" />
        <Skeleton className="h-5 w-full max-w-2xl rounded-lg" />
      </div>
      <Card className="rounded-2xl">
        <CardHeader className="gap-2">
          <Skeleton className="h-7 w-72 max-w-full rounded-lg" />
          <Skeleton className="h-5 w-full rounded-lg" />
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-56 w-full rounded-2xl" />
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  )
}

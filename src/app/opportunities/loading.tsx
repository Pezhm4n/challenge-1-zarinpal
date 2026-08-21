import { Skeleton } from "@/components/ui/skeleton"

export default function OpportunitiesLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="در حال بارگذاری گزارش فرصت‌ها"
      className="grid gap-8 lg:gap-10"
    >
      <div className="grid gap-3 rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
        <Skeleton className="h-5 w-36 rounded-full" />
        <Skeleton className="h-9 w-80 max-w-full rounded-xl" />
        <Skeleton className="h-5 w-full max-w-2xl rounded-lg" />
        <Skeleton className="h-4 w-48 rounded-lg" />
      </div>
      <div className="grid gap-4 rounded-2xl border border-primary/40 p-6 sm:p-7">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-7 w-3/4 max-w-lg rounded-lg" />
        <Skeleton className="h-5 w-full max-w-2xl rounded-lg" />
        <Skeleton className="h-16 w-full max-w-xl rounded-xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-56 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

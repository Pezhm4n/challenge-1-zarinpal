import { Skeleton } from "@/components/ui/skeleton"

export default function OpportunitiesLoading() {
  return (
    <div
      aria-busy="true"
      aria-label="در حال بارگذاری گزارش فرصت‌ها"
      className="grid min-w-0 gap-8 lg:gap-10"
    >
      <div className="grid min-w-0 gap-3 rounded-2xl border border-border/70 bg-card p-6 sm:p-8">
        <Skeleton className="h-5 w-full max-w-36 rounded-full" />
        <Skeleton className="h-9 w-full max-w-sm rounded-xl" />
        <Skeleton className="h-5 w-full max-w-2xl rounded-lg" />
        <Skeleton className="h-4 w-full max-w-48 rounded-lg" />
      </div>
      <div className="grid min-w-0 gap-4 rounded-2xl border border-border/70 p-6 sm:p-7">
        <Skeleton className="h-5 w-full max-w-28 rounded-full" />
        <Skeleton className="h-7 w-full max-w-md rounded-lg" />
        <Skeleton className="h-5 w-full max-w-2xl rounded-lg" />
        <Skeleton className="h-16 w-full max-w-xl rounded-xl" />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-48 sm:h-56 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 sm:h-32 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

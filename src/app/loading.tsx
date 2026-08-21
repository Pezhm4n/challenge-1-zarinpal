import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="grid min-w-0 gap-8 lg:gap-10" role="status" aria-live="polite" aria-label="در حال آماده‌سازی گزارش">
      <span className="sr-only">گزارش در حال آماده‌شدن است.</span>
      <div className="grid min-w-0 gap-3 rounded-3xl border border-border/70 bg-card p-6 sm:p-8">
        <Skeleton className="h-5 w-full max-w-28 rounded-full" />
        <Skeleton className="h-9 w-full max-w-lg rounded-xl" />
        <Skeleton className="h-5 w-full max-w-2xl rounded-lg" />
        <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 sm:h-28 rounded-2xl" />
          <Skeleton className="h-24 sm:h-28 rounded-2xl" />
          <Skeleton className="h-24 sm:h-28 rounded-2xl" />
        </div>
      </div>
      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <Skeleton className="h-64 sm:h-80 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-60 sm:h-72 rounded-2xl" />
        <Skeleton className="h-60 sm:h-72 rounded-2xl" />
      </div>
    </div>
  )
}

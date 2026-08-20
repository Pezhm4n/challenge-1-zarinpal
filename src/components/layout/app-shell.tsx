import Link from "next/link"
import { ChartNoAxesCombined } from "lucide-react"

import { AppNavigation } from "./app-navigation"


export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-foreground px-4 py-3 text-background focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:inline-flex focus:min-h-11 focus:min-w-11 focus:items-center"
      >
        رفتن به محتوای اصلی
      </a>
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              aria-label="نبض زرین، صفحه اقدام‌ها"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ChartNoAxesCombined aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block text-base font-semibold">نبض زرین</span>
                <span className="block text-xs text-muted-foreground">
                  مرکز اقدام پذیرنده
                </span>
              </span>
            </Link>
          </div>

          <AppNavigation />
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {children}
      </main>
    </div>
  )
}

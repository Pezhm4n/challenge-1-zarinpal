import Link from "next/link"
import { ChartNoAxesCombined } from "lucide-react"

import { AppMobileTabBar, AppNavigation } from "./app-navigation"

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-full bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:inline-flex focus:items-center focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        رفتن به محتوای اصلی
      </a>
      <header className="sticky top-0 z-40 border-b border-border/70 bg-card/90 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="group flex min-h-10 items-center gap-3 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="نبض زرین، صفحه اقدام‌ها"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs transition-transform duration-200 group-hover:scale-105">
                <ChartNoAxesCombined aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="flex items-center gap-2">
                  <span className="text-base font-bold tracking-tight text-foreground">نبض زرین</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    دستیار رشد فروش
                  </span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  مرکز اقدام هوشمند زرین‌پال
                </span>
              </span>
            </Link>
          </div>

          <div className="hidden lg:block">
            <AppNavigation />
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
        {children}
      </main>
      <AppMobileTabBar />
    </div>
  )
}


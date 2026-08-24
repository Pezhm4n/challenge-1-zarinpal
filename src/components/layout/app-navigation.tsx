"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CircleGauge, RefreshCcw, Target, UsersRound } from "lucide-react"

import { cn } from "@/lib/utils"

const navigationItems = [
  { href: "/", label: "اقدام‌ها", icon: CircleGauge },
  { href: "/recovery", label: "نجات فروش", icon: RefreshCcw },
  { href: "/customers", label: "مشتریان", icon: UsersRound },
  { href: "/opportunities", label: "رقبا", icon: Target },
] as const

export function AppNavigation() {
  const pathname = usePathname()

  return (
    <nav aria-label="منوی اصلی" className="w-full lg:w-auto">
      <ul className="grid grid-cols-4 gap-1 rounded-full bg-muted/80 p-1 border border-border/60 shadow-2xs lg:flex lg:gap-1.5">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isCurrent = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-xs font-medium text-muted-foreground transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:text-sm lg:px-4.5",
                  isCurrent
                    ? "bg-card text-primary font-semibold shadow-xs ring-1 ring-border/50"
                    : "hover:bg-card/50 hover:text-foreground active:scale-[0.98]",
                )}
              >
                <Icon aria-hidden="true" className={cn("size-4 shrink-0 transition-colors", isCurrent ? "text-primary" : "text-muted-foreground")} />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function AppMobileTabBar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="منوی اصلی"
      className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-border/50 bg-card/60 p-1.5 shadow-lg shadow-foreground/[0.08] backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isCurrent = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-xs leading-none transition-all duration-200 active:scale-[0.93] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  isCurrent
                    ? "bg-primary/15 font-semibold text-primary ring-1 ring-primary/20"
                    : "font-medium text-muted-foreground hover:bg-card/80 hover:text-foreground active:scale-[0.97]",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "size-5 shrink-0 transition-transform duration-300 ease-smooth",
                    isCurrent && "-translate-y-0.5 scale-110",
                  )}
                />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}


"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CircleGauge, RefreshCcw, Target, UsersRound } from "lucide-react"

import { cn } from "@/lib/utils"


const navigationItems = [
  { href: "/", label: "اقدام‌ها", icon: CircleGauge },
  { href: "/recovery", label: "بازیابی", icon: RefreshCcw },
  { href: "/customers", label: "مشتریان", icon: UsersRound },
  { href: "/opportunities", label: "فرصت‌ها", icon: Target },
] as const


export function AppNavigation() {
  const pathname = usePathname()

  return (
    <nav aria-label="مسیرهای تحلیل" className="w-full lg:w-auto">
      <ul className="grid grid-cols-4 gap-1 rounded-lg bg-muted p-1 lg:flex">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isCurrent = pathname === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-sm lg:px-3",
                  isCurrent &&
                    "bg-card text-foreground shadow-xs ring-1 ring-foreground/5",
                )}
              >
                <Icon aria-hidden="true" className="size-4" />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

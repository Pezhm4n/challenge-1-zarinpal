"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className="size-11 shrink-0 rounded-full transition-transform duration-200 active:scale-90"
      aria-label="تغییر تم روشن/تیره"
      title="تغییر تم"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <span className="relative flex size-5 items-center justify-center">
        <Sun
          aria-hidden="true"
          className="absolute size-5 rotate-90 scale-0 text-amber-500 transition-all duration-300 ease-smooth dark:rotate-0 dark:scale-100"
        />
        <Moon
          aria-hidden="true"
          className="absolute size-5 rotate-0 scale-100 transition-all duration-300 ease-smooth dark:-rotate-90 dark:scale-0"
        />
      </span>
    </Button>
  )
}

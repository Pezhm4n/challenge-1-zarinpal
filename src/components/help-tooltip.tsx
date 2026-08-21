"use client"

import * as React from "react"
import { HelpCircle, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export const GLOSSARY: Record<string, { termFa: string; desc: string }> = {
  NoAttempt: {
    termFa: "انصراف بدون شروع تلاش (NoAttempt)",
    desc: "کاربر پس از ایجاد سفارش و باز شدن صفحه پرداخت، بدون ورود به درگاه یا وارد کردن اطلاعات کارت از خرید منصرف شده است.",
  },
  PSP: {
    termFa: "ارائه‌دهنده خدمات پرداخت (PSP)",
    desc: "شرکت‌های مجاز شاپرکی متصل به شبکه بانکی (مانند به‌پرداخت، سامان، سداد، پارسیان و...) که مسئول پردازش و تایید تراکنش درگاه هستند.",
  },
  Cohort: {
    termFa: "هم‌گروهی خریداران (Cohort)",
    desc: "دسته‌بندی خریداران بر اساس ماه اولین خرید آن‌ها، برای سنجش میزان بازگشت، وفاداری و تکرار خرید در ماه‌های پس از آن.",
  },
  Conversion: {
    termFa: "نرخ تبدیل پرداخت",
    desc: "درصد نشست‌های پرداختی که با موفقیت پرداخت و تسویه شده‌اند نسبت به کل نشست‌ها.",
  },
  Card: {
    termFa: "کارت ناشناس مشتری",
    desc: "شناسه یکتا و پوشانده‌شده کارت بانکی خریدار؛ بدون افشای شماره کارت یا اطلاعات هویتی، برای بررسی رفتار مشتری.",
  },
  Retry: {
    termFa: "تلاش مجدد (Retry)",
    desc: "تلاش‌های مکرر خریدار در یک نشست پس از دریافت خطا در پرداخت اولیه، تا زمان موفقیت پرداخت.",
  },
}

export function HelpTooltip({
  term,
  text,
  className,
  icon = "help",
}: {
  term?: keyof typeof GLOSSARY | string
  text?: string
  className?: string
  icon?: "help" | "info"
}) {
  const info = term && GLOSSARY[term] ? GLOSSARY[term] : null
  const content = text ?? info?.desc
  const title = info?.termFa

  if (!content) return null

  const IconComponent = icon === "info" ? Info : HelpCircle

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full p-0.5 text-muted-foreground/70 hover:text-primary transition-colors cursor-help focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
            className
          )}
          aria-label={title ? `راهنمای ${title}` : "راهنما"}
        >
          <IconComponent className="size-3.5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="top" className="text-start">
          {title ? <p className="font-bold text-foreground mb-1">{title}</p> : null}
          <p className="text-muted-foreground leading-relaxed">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

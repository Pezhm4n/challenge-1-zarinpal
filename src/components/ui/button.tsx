import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:shadow-sm active:bg-primary/95",
        outline:
          "border-border bg-card text-foreground shadow-xs hover:bg-muted hover:border-border/80 hover:text-foreground active:bg-muted/80 aria-expanded:bg-muted dark:border-border dark:bg-card dark:hover:bg-muted",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/90 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted/80 hover:text-foreground active:bg-muted aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/60",
        destructive:
          "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 active:bg-destructive/25 focus-visible:ring-destructive",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 min-h-9 gap-2 px-4 text-sm has-data-[icon=inline-end]:pe-3.5 has-data-[icon=inline-start]:ps-3.5",
        xs: "h-6 min-h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 min-h-8 gap-1.5 px-3 text-xs has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 min-h-11 gap-2 px-6 text-base font-medium has-data-[icon=inline-end]:pe-5 has-data-[icon=inline-start]:ps-5",
        icon: "size-9 min-h-9 min-w-9 p-0",
        "icon-xs": "size-6 min-h-6 min-w-6 p-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 min-h-8 min-w-8 p-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-11 min-h-11 min-w-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }


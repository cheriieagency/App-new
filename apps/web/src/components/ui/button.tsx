import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8A857D] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 shadow-none",
  {
    variants: {
      variant: {
        default:
          "bg-[#2C3B2E] text-[#F9F8F6] hover:bg-[#243228]",
        destructive:
          "bg-[#B85C38] text-[#F9F8F6] hover:bg-[#a35232]",
        outline:
          "border border-[#E6E3DB] bg-transparent text-[#2C2621] hover:bg-[#F0EFEA]",
        secondary:
          "border border-[#E6E3DB] bg-transparent text-[#2C2621] hover:bg-[#F0EFEA]",
        ghost:
          "text-[#8A857D] hover:bg-[#F0EFEA] hover:text-[#2C2621]",
        link: "text-[#2C3B2E] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 min-h-[44px] px-5 py-2 has-[>svg]:px-4",
        xs: "h-7 gap-1 rounded-lg px-2.5 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-xl px-3.5 has-[>svg]:px-3",
        lg: "h-11 min-h-[44px] rounded-xl px-7 has-[>svg]:px-5",
        icon: "size-10 min-h-[44px] min-w-[44px]",
        "icon-xs": "size-7 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-11 min-h-[44px] min-w-[44px]",
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
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

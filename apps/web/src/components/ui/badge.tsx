import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] whitespace-nowrap transition-[color,background-color] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#8A857D] [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-[rgba(44,59,46,0.06)] text-[#2C3B2E]",
        secondary: "bg-[#F0EFEA] text-[#8A857D]",
        destructive: "bg-[rgba(184,92,56,0.08)] text-[#B85C38]",
        outline: "border-[#E6E3DB] text-[#8A857D] bg-transparent",
        ghost: "text-[#8A857D]",
        link: "text-[#2C3B2E] underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }

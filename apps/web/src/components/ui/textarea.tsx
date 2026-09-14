import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] px-3.5 py-2.5 text-base text-[#2C2621] shadow-none transition-[color,border-color] outline-none placeholder:text-[#8A857D] focus-visible:border-[#8A857D] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[#B85C38] md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-[#E6E3DB] bg-[#FFFFFF] px-3.5 py-2 text-base text-[#2C2621] shadow-none transition-[color,border-color] outline-none selection:bg-[#2C3B2E]/15 selection:text-[#2C2621] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-[#2C2621] placeholder:text-[#8A857D] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-[#8A857D] focus-visible:ring-0",
        "aria-invalid:border-[#B85C38] aria-invalid:ring-0",
        className
      )}
      {...props}
    />
  )
}

export { Input }

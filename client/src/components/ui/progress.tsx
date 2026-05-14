"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value = 0, ...props }, ref) => {
  const numericValue = typeof value === "number" && Number.isFinite(value) ? value : 0;
  const safeValue = Math.min(100, Math.max(0, numericValue));

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary shadow-inner",
        className
      )}
      value={safeValue}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 bg-gradient-to-r from-primary via-accent to-[hsl(var(--mtendere-orange))] transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${100 - safeValue}%)` }}
      />
    </ProgressPrimitive.Root>
  );
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }

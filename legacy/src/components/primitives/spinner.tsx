"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const spinnerVariants = cva(
  "inline-block rounded-full border-current border-r-transparent animate-spin",
  {
    variants: {
      size: {
        sm: "h-3 w-3 border-2",
        md: "h-4 w-4 border-2",
        lg: "h-6 w-6 border-[3px]",
        xl: "h-10 w-10 border-4",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

export const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, size, label = "Chargement…", ...props }, ref) => (
    <span ref={ref} role="status" className={cn(spinnerVariants({ size }), className)} {...props}>
      <span className="sr-only">{label}</span>
    </span>
  ),
);
Spinner.displayName = "Spinner";

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="radio"
      className={cn(
        "h-4 w-4 cursor-pointer appearance-none rounded-full",
        "border border-[var(--input-border)] bg-[var(--input-bg)]",
        "checked:border-[var(--color-accent)] checked:border-[5px]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "transition-all",
        className,
      )}
      {...props}
    />
  ),
);
Radio.displayName = "Radio";

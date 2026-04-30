"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  size?: "sm" | "md";
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, size = "md", ...props }, ref) => {
    const dim = size === "sm" ? "h-4 w-7" : "h-5 w-9";
    return (
      <label className={cn("inline-flex relative cursor-pointer", className)}>
        <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
        <span
          className={cn(
            dim,
            "rounded-full bg-[var(--input-border)] transition-colors",
            "peer-checked:bg-[var(--color-accent)]",
            "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-ring)]",
            "peer-disabled:opacity-50 peer-disabled:cursor-not-allowed",
            "before:absolute before:top-0.5 before:left-0.5 before:bg-[var(--color-foreground)] before:rounded-full before:transition-transform",
            size === "sm" ? "before:h-3 before:w-3 peer-checked:before:translate-x-3" : "before:h-4 before:w-4 peer-checked:before:translate-x-4",
          )}
        />
      </label>
    );
  },
);
Switch.displayName = "Switch";

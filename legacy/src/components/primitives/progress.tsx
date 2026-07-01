"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  indeterminate?: boolean;
  size?: "sm" | "md" | "lg";
  tone?: "accent" | "success" | "warning" | "error";
}

const SIZE_HEIGHT = { sm: "h-1", md: "h-2", lg: "h-3" } as const;
const TONE_BG = {
  accent: "bg-[var(--color-accent)]",
  success: "bg-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]",
  error: "bg-[var(--color-error)]",
} as const;

export function Progress({
  className,
  value = 0,
  max = 100,
  indeterminate,
  size = "md",
  tone = "accent",
  ...props
}: ProgressProps) {
  const pct = indeterminate ? null : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={indeterminate ? undefined : value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-busy={indeterminate || undefined}
      className={cn("relative w-full overflow-hidden rounded-full bg-[var(--color-surface-elevated)]", SIZE_HEIGHT[size], className)}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500 ease-out",
          TONE_BG[tone],
          indeterminate && "absolute left-0 w-1/3 animate-[shimmer_1.5s_ease-in-out_infinite]",
        )}
        style={pct !== null ? { width: `${pct}%` } : undefined}
      />
    </div>
  );
}

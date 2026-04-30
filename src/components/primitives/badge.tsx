"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[var(--badge-radius)] h-[var(--badge-h)] px-[var(--badge-px)] text-xs font-medium uppercase tracking-wide",
  {
    variants: {
      tone: {
        neutral: "bg-[var(--badge-bg-neutral)] text-[var(--badge-fg-neutral)]",
        accent: "bg-[var(--badge-bg-accent)] text-[var(--badge-fg-accent)]",
        success: "bg-[var(--badge-bg-success)] text-[var(--badge-fg-success)]",
        warning: "bg-[var(--badge-bg-warning)] text-[var(--badge-fg-warning)]",
        error: "bg-[var(--badge-bg-error)] text-[var(--badge-fg-error)]",
        info: "bg-[var(--badge-bg-info)] text-[var(--badge-fg-info)]",
      },
      variant: {
        soft: "",
        solid: "",
        outline: "bg-transparent border border-current",
      },
    },
    defaultVariants: { tone: "neutral", variant: "soft" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, variant, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ tone, variant }), className)} {...props} />
  ),
);
Badge.displayName = "Badge";

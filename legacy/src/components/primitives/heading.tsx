"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const headingVariants = cva(
  "font-semibold tracking-tight text-[var(--color-foreground)] text-balance",
  {
    variants: {
      level: {
        1: "text-[length:var(--text-3xl)] leading-[var(--lh-tight)]",
        2: "text-[length:var(--text-2xl)] leading-[var(--lh-tight)]",
        3: "text-[length:var(--text-xl)] leading-tight",
        4: "text-[length:var(--text-lg)] leading-tight",
        5: "text-[length:var(--text-base)] leading-snug",
        6: "text-[length:var(--text-sm)] leading-snug uppercase tracking-wider",
      },
      scale: {
        display: "text-[length:var(--text-display)] leading-[0.96]",
        mega: "text-[length:var(--text-mega)] leading-[0.92]",
      },
    },
    defaultVariants: { level: 2 },
  },
);

export interface HeadingProps
  extends Omit<React.HTMLAttributes<HTMLHeadingElement>, "color">,
    VariantProps<typeof headingVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ className, level, scale, as, ...props }, ref) => {
    const Tag = (as ?? `h${level ?? 2}`) as "h1";
    return <Tag ref={ref} className={cn(headingVariants({ level, scale }), className)} {...props} />;
  },
);
Heading.displayName = "Heading";

"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const skeletonVariants = cva(
  "block bg-[var(--color-surface-elevated)] animate-pulse",
  {
    variants: {
      shape: {
        rect: "rounded-[var(--radius-md)]",
        circle: "rounded-full",
        text: "rounded-[var(--radius-sm)] h-4",
      },
    },
    defaultVariants: { shape: "rect" },
  },
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof skeletonVariants> {}

export const Skeleton = React.forwardRef<HTMLSpanElement, SkeletonProps>(
  ({ className, shape, ...props }, ref) => (
    <span ref={ref} aria-busy="true" aria-label="Chargement" className={cn(skeletonVariants({ shape }), className)} {...props} />
  ),
);
Skeleton.displayName = "Skeleton";

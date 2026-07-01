"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const bannerVariants = cva(
  "flex items-center gap-3 px-4 py-2 text-sm",
  {
    variants: {
      tone: {
        neutral: "bg-[var(--color-surface-raised)] text-[var(--color-foreground)]",
        accent: "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]",
        warning: "bg-[var(--badge-bg-warning)] text-[var(--color-warning)]",
        error: "bg-[var(--badge-bg-error)] text-[var(--color-error)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof bannerVariants> {
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function Banner({ className, tone, dismissible, onDismiss, children, ...props }: BannerProps) {
  return (
    <div role="status" className={cn(bannerVariants({ tone }), className)} {...props}>
      <div className="flex-1">{children}</div>
      {dismissible && (
        <button onClick={onDismiss} aria-label="Fermer" className="text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]">×</button>
      )}
    </div>
  );
}

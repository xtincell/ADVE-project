"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const toastVariants = cva(
  "pointer-events-auto flex items-center gap-3 p-4 rounded-[var(--toast-radius)] border bg-[var(--toast-bg)] text-[var(--toast-fg)] shadow-[var(--toast-shadow)] w-[var(--toast-w)] max-w-[90vw]",
  {
    variants: {
      tone: {
        neutral: "border-[var(--toast-border)]",
        success: "border-[var(--color-success)]",
        warning: "border-[var(--color-warning)]",
        error: "border-[var(--color-error)]",
        info: "border-[var(--color-info)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface ToastProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">, VariantProps<typeof toastVariants> {
  title?: React.ReactNode;
}

export const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, tone, title, children, ...props }, ref) => (
    <div ref={ref} role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? "assertive" : "polite"} className={cn(toastVariants({ tone }), className)} {...props}>
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div className="text-sm text-[var(--color-foreground-secondary)]">{children}</div>
      </div>
    </div>
  ),
);
Toast.displayName = "Toast";

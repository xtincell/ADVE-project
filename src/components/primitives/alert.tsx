"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const alertVariants = cva(
  "flex gap-3 p-4 rounded-[var(--radius-md)] border",
  {
    variants: {
      tone: {
        info: "bg-[var(--badge-bg-info)] border-[var(--color-info)] text-[var(--color-foreground)]",
        success: "bg-[var(--badge-bg-success)] border-[var(--color-success)] text-[var(--color-foreground)]",
        warning: "bg-[var(--badge-bg-warning)] border-[var(--color-warning)] text-[var(--color-foreground)]",
        error: "bg-[var(--badge-bg-error)] border-[var(--color-error)] text-[var(--color-foreground)]",
      },
    },
    defaultVariants: { tone: "info" },
  },
);

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
}

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone, title, children, ...props }, ref) => (
    <div ref={ref} role={tone === "error" ? "alert" : "status"} className={cn(alertVariants({ tone }), className)} {...props}>
      <div className="flex-1">
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div className="text-sm text-[var(--color-foreground-secondary)]">{children}</div>
      </div>
    </div>
  ),
);
Alert.displayName = "Alert";

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  dismissible?: boolean;
  onDismiss?: () => void;
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, children, dismissible, onDismiss, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 text-xs",
        "bg-[var(--color-surface-elevated)] text-[var(--color-foreground-secondary)]",
        "border border-[var(--color-border)] rounded-[var(--radius-sm)]",
        className,
      )}
      {...props}
    >
      {children}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Retirer"
          className="ml-1 -mr-1 text-[var(--color-foreground-muted)] hover:text-[var(--color-foreground)]"
        >
          ×
        </button>
      )}
    </span>
  ),
);
Tag.displayName = "Tag";

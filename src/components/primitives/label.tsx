"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  optional?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, optional, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("inline-flex items-center gap-1 text-sm font-medium text-[var(--color-foreground)]", className)}
      {...props}
    >
      {children}
      {required && <span className="text-[var(--color-error)]" aria-label="requis">*</span>}
      {optional && <span className="text-xs text-[var(--color-foreground-muted)] font-normal">(optionnel)</span>}
    </label>
  ),
);
Label.displayName = "Label";

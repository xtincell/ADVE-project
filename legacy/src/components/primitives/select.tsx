"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { FOCUS_RING, TRANSITION_BASE, DISABLED_STATE } from "@/lib/design/cva-presets";

export const selectVariants = cva(
  cn(
    "block w-full bg-[var(--input-bg)] text-[var(--input-fg)]",
    "rounded-[var(--input-radius)] border border-[var(--input-border)]",
    "px-[var(--input-px)] pr-9 appearance-none cursor-pointer",
    "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 fill=%22none%22 stroke=%22%23c9c3b6%22 stroke-width=%222%22><path d=%22M3 5l3 3 3-3%22/></svg>')] bg-no-repeat bg-[right_12px_center]",
    "hover:border-[var(--input-border-hover)] focus:border-[var(--input-border-focus)]",
    FOCUS_RING, TRANSITION_BASE, DISABLED_STATE,
  ),
  {
    variants: {
      size: {
        sm: "h-[var(--input-h-sm)] text-sm",
        md: "h-[var(--input-h-md)] text-sm",
        lg: "h-[var(--input-h-lg)] text-base",
      },
      state: {
        default: "",
        invalid: "border-[var(--input-border-invalid)]",
        valid: "border-[var(--input-border-valid)]",
      },
    },
    defaultVariants: { size: "md", state: "default" },
  },
);

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">, VariantProps<typeof selectVariants> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, size, state, children, ...props }, ref) => (
    <select ref={ref} className={cn(selectVariants({ size, state }), className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";

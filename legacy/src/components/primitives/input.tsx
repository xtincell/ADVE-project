"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { FOCUS_RING, TRANSITION_BASE, DISABLED_STATE } from "@/lib/design/cva-presets";

export const inputVariants = cva(
  cn(
    "block w-full bg-[var(--input-bg)] text-[var(--input-fg)] placeholder:text-[var(--input-placeholder)]",
    "rounded-[var(--input-radius)] border border-[var(--input-border)]",
    "px-[var(--input-px)]",
    "hover:border-[var(--input-border-hover)] focus:border-[var(--input-border-focus)]",
    FOCUS_RING,
    TRANSITION_BASE,
    DISABLED_STATE,
    "disabled:bg-[var(--input-bg-disabled)] disabled:text-[var(--input-fg-disabled)]",
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
        invalid: "border-[var(--input-border-invalid)] focus:border-[var(--input-border-invalid)]",
        valid: "border-[var(--input-border-valid)]",
      },
    },
    defaultVariants: { size: "md", state: "default" },
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, state, ...props }, ref) => (
    <input ref={ref} className={cn(inputVariants({ size, state }), className)} {...props} />
  ),
);
Input.displayName = "Input";

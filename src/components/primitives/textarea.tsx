"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { FOCUS_RING, TRANSITION_BASE, DISABLED_STATE } from "@/lib/design/cva-presets";

export const textareaVariants = cva(
  cn(
    "block w-full bg-[var(--input-bg)] text-[var(--input-fg)] placeholder:text-[var(--input-placeholder)]",
    "rounded-[var(--input-radius)] border border-[var(--input-border)]",
    "px-[var(--input-px)] py-2 resize-y min-h-[80px]",
    "hover:border-[var(--input-border-hover)] focus:border-[var(--input-border-focus)]",
    FOCUS_RING, TRANSITION_BASE, DISABLED_STATE,
  ),
  {
    variants: {
      state: {
        default: "",
        invalid: "border-[var(--input-border-invalid)]",
        valid: "border-[var(--input-border-valid)]",
      },
    },
    defaultVariants: { state: "default" },
  },
);

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, VariantProps<typeof textareaVariants> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, state, ...props }, ref) => (
    <textarea ref={ref} className={cn(textareaVariants({ state }), className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

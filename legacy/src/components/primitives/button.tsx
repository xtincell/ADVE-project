"use client";

/**
 * Button primitive — Phase 11 DS panda + rouge.
 * 6 variants × 4 sizes. CVA-driven, tokens-only.
 * Cf. DESIGN-SYSTEM.md, design-tokens/component.md (Button section).
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { FOCUS_RING, TRANSITION_BASE, DISABLED_STATE } from "@/lib/design/cva-presets";

export const buttonVariants = cva(
  cn(
    "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none",
    "rounded-[var(--button-radius)]",
    FOCUS_RING,
    TRANSITION_BASE,
    DISABLED_STATE,
  ),
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)] hover:bg-[var(--button-primary-bg-hover)] active:bg-[var(--button-primary-bg-active)]",
        ghost:
          "bg-transparent border border-[var(--button-ghost-border)] text-[var(--button-ghost-fg)] hover:bg-[var(--button-ghost-bg-hover)]",
        outline:
          "bg-transparent border border-[var(--button-outline-border)] text-[var(--button-outline-fg)] hover:bg-[var(--button-ghost-bg-hover)]",
        subtle:
          "bg-[var(--button-subtle-bg)] text-[var(--button-subtle-fg)] hover:bg-[var(--color-surface-elevated)]",
        destructive:
          "bg-[var(--button-destructive-bg)] text-[var(--button-destructive-fg)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-active)]",
        link: "bg-transparent text-[var(--button-link-fg)] hover:text-[var(--button-link-fg-hover)] underline-offset-4 hover:underline px-0",
      },
      size: {
        sm: "h-[var(--button-h-sm)] px-[var(--button-px-sm)] text-sm",
        md: "h-[var(--button-h-md)] px-[var(--button-px-md)] text-sm",
        lg: "h-[var(--button-h-lg)] px-[var(--button-px-lg)] text-base",
        icon: "h-[var(--button-h-icon)] w-[var(--button-h-icon)] p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  ),
);
Button.displayName = "Button";

function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin"
      aria-hidden="true"
    />
  );
}

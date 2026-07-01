"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const textVariants = cva("text-[var(--color-foreground)]", {
  variants: {
    variant: {
      body: "text-[length:var(--text-base)] leading-[var(--lh-normal)]",
      lead: "text-[length:var(--text-lg)] leading-[var(--lh-relaxed)] text-[var(--color-foreground-secondary)] text-pretty max-w-[60ch]",
      caption: "text-[length:var(--text-sm)] text-[var(--color-foreground-secondary)]",
      label: "text-xs uppercase tracking-wider text-[var(--color-foreground-muted)]",
      mono: "font-mono text-[length:var(--text-sm)]",
    },
    tone: {
      default: "",
      muted: "text-[var(--color-foreground-muted)]",
      accent: "text-[var(--color-accent)]",
      success: "text-[var(--color-success)]",
      warning: "text-[var(--color-warning)]",
      error: "text-[var(--color-error)]",
    },
  },
  defaultVariants: { variant: "body" },
});

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement>, VariantProps<typeof textVariants> {
  as?: "p" | "span" | "div";
}

export const Text = React.forwardRef<HTMLParagraphElement, TextProps>(
  ({ className, variant, tone, as = "p", ...props }, ref) => {
    const Tag = as as "p";
    return <Tag ref={ref as React.Ref<HTMLParagraphElement>} className={cn(textVariants({ variant, tone }), className)} {...props} />;
  },
);
Text.displayName = "Text";

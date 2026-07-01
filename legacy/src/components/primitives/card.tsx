"use client";

/**
 * Card primitive — surface raised/elevated/overlay/flat.
 * Compound component avec slots Header/Body/Footer.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const cardVariants = cva("rounded-[var(--card-radius)] transition-colors", {
  variants: {
    surface: {
      flat: "bg-transparent",
      raised: "bg-[var(--card-bg)] border border-[var(--card-border)]",
      elevated: "bg-[var(--card-elevated-bg,var(--card-bg-elevated))] border border-[var(--card-border)] shadow-[var(--card-shadow)]",
      overlay: "bg-[var(--card-bg-overlay)] border border-[var(--card-border)] shadow-[var(--card-shadow-hover)]",
      outlined: "bg-transparent border border-[var(--card-border-hover)]",
    },
    interactive: {
      true: "cursor-pointer hover:bg-[var(--card-bg-hover)] hover:border-[var(--card-border-hover)] focus-visible:outline-2 focus-visible:outline-[var(--color-ring)] focus-visible:outline-offset-2",
      false: "",
    },
  },
  defaultVariants: { surface: "raised", interactive: false },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, surface, interactive, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ surface, interactive }), className)} {...props} />
  ),
);
Card.displayName = "Card";

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-[var(--card-gap)] px-[var(--card-px)] pt-[var(--card-py)] pb-0",
        className,
      )}
      {...props}
    />
  ),
);
CardHeader.displayName = "CardHeader";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-semibold tracking-tight text-[var(--color-foreground)]",
        "text-[length:var(--card-title-size)] leading-tight",
        className,
      )}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-[var(--color-foreground-secondary)]", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

export const CardBody = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("px-[var(--card-px)] py-[var(--card-py)]", className)} {...props} />
  ),
);
CardBody.displayName = "CardBody";

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-[var(--card-gap)] px-[var(--card-px)] pb-[var(--card-py)] pt-0",
        className,
      )}
      {...props}
    />
  ),
);
CardFooter.displayName = "CardFooter";

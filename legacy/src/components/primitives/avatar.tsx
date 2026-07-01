"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const avatarVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[var(--color-surface-elevated)] text-[var(--color-foreground-secondary)] font-medium select-none",
  {
    variants: {
      size: {
        xs: "h-6 w-6 text-xs",
        sm: "h-8 w-8 text-sm",
        md: "h-10 w-10 text-base",
        lg: "h-12 w-12 text-lg",
        xl: "h-16 w-16 text-xl",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface AvatarProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, size, src, alt = "", fallback, ...props }, ref) => (
    <span ref={ref} className={cn(avatarVariants({ size }), className)} {...props}>
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden={!fallback} className="uppercase">{fallback ?? "?"}</span>
      )}
    </span>
  ),
);
Avatar.displayName = "Avatar";

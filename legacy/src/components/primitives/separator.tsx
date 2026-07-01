"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
}

export const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
    <hr
      ref={ref}
      role={decorative ? "presentation" : "separator"}
      aria-orientation={orientation}
      className={cn(
        "border-0 bg-[var(--color-border)]",
        orientation === "horizontal" ? "h-px w-full" : "w-px h-full inline-block",
        className,
      )}
      {...props}
    />
  ),
);
Separator.displayName = "Separator";

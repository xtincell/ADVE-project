"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: "row" | "col";
  gap?: 0 | 1 | 2 | 3 | 4 | 6 | 8 | 12 | 16;
  align?: "start" | "center" | "end" | "stretch" | "baseline";
  justify?: "start" | "center" | "end" | "between" | "around";
  wrap?: boolean;
}

const GAP_CLASS: Record<NonNullable<StackProps["gap"]>, string> = {
  0: "gap-0", 1: "gap-1", 2: "gap-2", 3: "gap-3", 4: "gap-4", 6: "gap-6", 8: "gap-8", 12: "gap-12", 16: "gap-16",
};

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, direction = "col", gap = 4, align, justify, wrap, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex",
        direction === "col" ? "flex-col" : "flex-row",
        GAP_CLASS[gap],
        align && `items-${align}`,
        justify && `justify-${justify}`,
        wrap && "flex-wrap",
        className,
      )}
      {...props}
    />
  ),
);
Stack.displayName = "Stack";

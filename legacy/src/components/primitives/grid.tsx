"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 6 | 8 | 12;
  gap?: 0 | 1 | 2 | 3 | 4 | 6 | 8 | 12;
  responsive?: boolean;
}

const COLS: Record<NonNullable<GridProps["cols"]>, string> = {
  1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4", 6: "grid-cols-6", 8: "grid-cols-8", 12: "grid-cols-12",
};
const GAP: Record<NonNullable<GridProps["gap"]>, string> = {
  0: "gap-0", 1: "gap-1", 2: "gap-2", 3: "gap-3", 4: "gap-4", 6: "gap-6", 8: "gap-8", 12: "gap-12",
};

export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 4, gap = 4, responsive = true, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("grid", responsive ? "grid-cols-1 md:grid-cols-2 lg:" + COLS[cols] : COLS[cols], GAP[gap], className)}
      {...props}
    />
  ),
);
Grid.displayName = "Grid";

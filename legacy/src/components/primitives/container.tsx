"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxw?: "prose" | "sm" | "md" | "lg" | "xl" | "content" | "full";
}

const MAXW: Record<NonNullable<ContainerProps["maxw"]>, string> = {
  prose: "max-w-[var(--maxw-prose)]",
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  content: "max-w-[var(--maxw-content)]",
  full: "max-w-full",
};

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, maxw = "content", ...props }, ref) => (
    <div ref={ref} className={cn("mx-auto px-[var(--pad-page)]", MAXW[maxw], className)} {...props} />
  ),
);
Container.displayName = "Container";

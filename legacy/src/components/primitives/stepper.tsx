"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StepperStep {
  label: string;
  description?: string;
  status: "pending" | "current" | "done" | "error";
}

export interface StepperProps {
  steps: StepperStep[];
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function Stepper({ steps, className, orientation = "horizontal" }: StepperProps) {
  return (
    <ol
      className={cn(
        "flex",
        orientation === "horizontal" ? "items-center gap-4" : "flex-col gap-4",
        className,
      )}
    >
      {steps.map((s, i) => {
        const stateColor = {
          pending: "bg-[var(--color-surface-elevated)] text-[var(--color-foreground-muted)]",
          current: "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]",
          done: "bg-[var(--color-success)] text-[var(--color-foreground-inverse)]",
          error: "bg-[var(--color-error)] text-[var(--color-accent-foreground)]",
        }[s.status];
        return (
          <li
            key={`${s.label}-${i}`}
            aria-current={s.status === "current" ? "step" : undefined}
            className={cn("flex items-center gap-3", orientation === "vertical" && "w-full")}
          >
            <span className={cn("flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold", stateColor)}>
              {s.status === "done" ? "✓" : s.status === "error" ? "!" : i + 1}
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-medium text-[var(--color-foreground)]">{s.label}</span>
              {s.description && (
                <span className="text-xs text-[var(--color-foreground-muted)]">{s.description}</span>
              )}
            </span>
            {orientation === "horizontal" && i < steps.length - 1 && (
              <span aria-hidden="true" className="h-px w-8 bg-[var(--color-border)]" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

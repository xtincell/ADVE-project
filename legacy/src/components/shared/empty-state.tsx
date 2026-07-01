"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/40 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="rounded-full bg-background/80 p-4">
        <Icon className="h-8 w-8 text-foreground-muted" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-foreground-secondary">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-foreground"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

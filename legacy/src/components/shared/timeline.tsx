"use client";

import { type LucideIcon, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  date: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  type?: "default" | "success" | "warning" | "error" | "info";
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const TYPE_COLORS = {
  default: "bg-surface-raised text-foreground-secondary",
  success: "bg-emerald-500/20 text-emerald-400",
  warning: "bg-amber-500/20 text-amber-400",
  error: "bg-error/20 text-error",
  info: "bg-blue-500/20 text-blue-400",
} as const;

const LINE_COLORS = {
  default: "bg-background",
  success: "bg-emerald-500/30",
  warning: "bg-amber-500/30",
  error: "bg-error/30",
  info: "bg-blue-500/30",
} as const;

export function Timeline({ events, className }: TimelineProps) {
  return (
    <div className={cn("space-y-0", className)}>
      {events.map((event, i) => {
        const type = event.type ?? "default";
        const Icon = event.icon ?? Circle;
        const isLast = i === events.length - 1;

        return (
          <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Vertical line */}
            {!isLast && (
              <div
                className={cn(
                  "absolute left-[15px] top-8 bottom-0 w-px",
                  LINE_COLORS[type],
                )}
              />
            )}

            {/* Icon */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                TYPE_COLORS[type],
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-medium text-white">{event.title}</p>
              {event.description && (
                <p className="mt-0.5 text-xs text-foreground-secondary">
                  {event.description}
                </p>
              )}
              <time className="mt-1 block text-[11px] text-foreground-muted">
                {new Date(event.date).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
}

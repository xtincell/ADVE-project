"use client";

import { type LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
  icon?: LucideIcon;
  className?: string;
}

const TREND_CONFIG = {
  up: { icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  down: { icon: TrendingDown, color: "text-error", bg: "bg-error/10" },
  flat: { icon: Minus, color: "text-foreground-secondary", bg: "bg-zinc-400/10" },
} as const;

export function StatCard({
  title,
  value,
  trend,
  trendValue,
  icon: Icon,
  className,
}: StatCardProps) {
  const trendConfig = trend ? TREND_CONFIG[trend] : null;
  const TrendIcon = trendConfig?.icon;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background/80 p-5 transition-colors hover:border-border",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground-secondary">{title}</p>
          <p className="text-3xl font-bold tracking-tight text-white">
            {value}
          </p>
        </div>
        {Icon && (
          <div className="rounded-lg bg-background p-2.5">
            <Icon className="h-5 w-5 text-foreground-secondary" />
          </div>
        )}
      </div>

      {trendConfig && trendValue && TrendIcon && (
        <div className="mt-3 flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold",
              trendConfig.bg,
              trendConfig.color,
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {trendValue}
          </span>
          <span className="text-xs text-foreground-muted">vs période préc.</span>
        </div>
      )}
    </div>
  );
}

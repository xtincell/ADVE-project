"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "stable";
  accent?: string;
}

export function MetricCard({ label, value, subtitle, trend, accent = "rgb(232, 75, 34)" }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">{label}</p>
      <div className="mt-1 flex items-end gap-2">
        <span className="text-2xl font-bold" style={{ color: accent }}>
          {value}
        </span>
        {trend && (
          <span className="mb-0.5">
            {trend === "up" && <TrendingUp className="h-4 w-4 text-success" />}
            {trend === "down" && <TrendingDown className="h-4 w-4 text-error" />}
            {trend === "stable" && <Minus className="h-4 w-4 text-foreground-muted" />}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-foreground-muted">{subtitle}</p>}
    </div>
  );
}

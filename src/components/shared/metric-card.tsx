"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number;
  data?: number[];
  trend?: "up" | "down" | "flat";
  format?: "number" | "currency" | "percent";
  /** ISO-4217 currency code (XAF, XOF, EUR, …). Required when
   *  `format="currency"`. No silent default to EUR — the call site
   *  must pass the strategy's currency. */
  currency?: string;
  /** Currency symbol used as fallback when Intl rejects the code (e.g.
   *  fictional WKD for Wakanda simulation). */
  currencySymbol?: string;
  className?: string;
}

function formatValue(
  value: number,
  format: MetricCardProps["format"],
  currency?: string,
  currencySymbol?: string,
): string {
  switch (format) {
    case "currency": {
      const code = currency ?? "XAF";
      try {
        return new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: code,
          maximumFractionDigits: 0,
        }).format(value);
      } catch {
        // Intl rejects fictional codes (WKD). Fall back to the symbol.
        return `${new Intl.NumberFormat("fr-FR").format(value)} ${currencySymbol ?? code}`;
      }
    }
    case "percent":
      return `${value.toFixed(1)}%`;
    default:
      return new Intl.NumberFormat("fr-FR").format(value);
  }
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;

  const width = 120;
  const height = 32;
  const padding = 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * (width - padding * 2),
    y: padding + (1 - (v - min) / range) * (height - padding * 2),
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  const lastPt = points[points.length - 1]!;
  const firstPt = points[0]!;

  const areaPath =
    linePath +
    ` L ${lastPt.x} ${height} L ${firstPt.x} ${height} Z`;

  const isUp = data[data.length - 1]! >= data[0]!;
  const stroke = isUp ? "#34d399" : "#f87171";
  const fill = isUp ? "#34d39920" : "#f8717120";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
    >
      <path d={areaPath} fill={fill} />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.5" />
    </svg>
  );
}

const TREND_CONFIG = {
  up: { icon: TrendingUp, color: "text-success" },
  down: { icon: TrendingDown, color: "text-error" },
  flat: { icon: Minus, color: "text-foreground-secondary" },
};

export function MetricCard({
  label,
  value,
  data,
  trend,
  format = "number",
  currency,
  currencySymbol,
  className,
}: MetricCardProps) {
  const trendConfig = trend ? TREND_CONFIG[trend] : null;
  const TrendIcon = trendConfig?.icon;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-background/80 p-5",
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground-secondary">{label}</p>

      <div className="mt-2 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">
            {formatValue(value, format, currency, currencySymbol)}
          </span>
          {trendConfig && TrendIcon && (
            <TrendIcon className={cn("h-4 w-4", trendConfig.color)} />
          )}
        </div>

        {data && data.length >= 2 && <Sparkline data={data} />}
      </div>
    </div>
  );
}

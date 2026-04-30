"use client";

import { Calendar, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

interface CampaignData {
  name: string;
  status: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
}

interface CampaignCardProps {
  campaign: CampaignData;
  /** ISO-4217 currency code (XAF, XOF, EUR…). The strategy currency. */
  currency?: string;
  /** Symbol fallback for fictional codes (WKD). */
  currencySymbol?: string;
  onClick?: () => void;
  className?: string;
}

function formatCurrency(value: number, currency?: string, currencySymbol?: string): string {
  const code = currency ?? "XAF";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${new Intl.NumberFormat("fr-FR").format(value)} ${currencySymbol ?? code}`;
  }
}

function formatDateRange(start?: string, end?: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const parts: string[] = [];
  if (start) parts.push(new Date(start).toLocaleDateString("fr-FR", opts));
  if (end) parts.push(new Date(end).toLocaleDateString("fr-FR", opts));
  return parts.join(" - ");
}

export function CampaignCard({
  campaign,
  currency,
  currencySymbol,
  onClick,
  className,
}: CampaignCardProps) {
  const dateRange = formatDateRange(campaign.startDate, campaign.endDate);

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border border-border bg-background/80 p-4 transition-colors",
        onClick && "cursor-pointer hover:border-border",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-white line-clamp-2">
          {campaign.name}
        </h4>
        <StatusBadge status={campaign.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground-secondary">
        {campaign.budget != null && (
          <span className="flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            {formatCurrency(campaign.budget, currency, currencySymbol)}
          </span>
        )}
        {dateRange && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {dateRange}
          </span>
        )}
      </div>
    </div>
  );
}

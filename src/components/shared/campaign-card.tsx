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
  onClick?: () => void;
  className?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
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
  onClick,
  className,
}: CampaignCardProps) {
  const dateRange = formatDateRange(campaign.startDate, campaign.endDate);

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 transition-colors",
        onClick && "cursor-pointer hover:border-zinc-700",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-white line-clamp-2">
          {campaign.name}
        </h4>
        <StatusBadge status={campaign.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
        {campaign.budget != null && (
          <span className="flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            {formatCurrency(campaign.budget)}
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

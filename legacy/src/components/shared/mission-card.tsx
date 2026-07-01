"use client";

import { Calendar, User, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

interface MissionData {
  title: string;
  status: string;
  deadline?: string;
  driverChannel?: string;
  assignee?: string;
}

interface MissionCardProps {
  mission: MissionData;
  onClick?: () => void;
  className?: string;
}

export function MissionCard({ mission, onClick, className }: MissionCardProps) {
  const isOverdue =
    mission.deadline && new Date(mission.deadline) < new Date();

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
          {mission.title}
        </h4>
        <StatusBadge status={mission.status} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-foreground-secondary">
        {mission.deadline && (
          <span
            className={cn(
              "flex items-center gap-1",
              isOverdue && "text-error",
            )}
          >
            <Calendar className="h-3 w-3" />
            {new Date(mission.deadline).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
        {mission.driverChannel && (
          <span className="flex items-center gap-1">
            <Radio className="h-3 w-3" />
            {mission.driverChannel}
          </span>
        )}
        {mission.assignee && (
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {mission.assignee}
          </span>
        )}
      </div>
    </div>
  );
}

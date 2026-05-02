import { Shield, Star, Crown, Gem } from "lucide-react";
import { cn } from "@/lib/utils";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

interface TierBadgeProps {
  tier: GuildTier;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const TIER_CONFIG: Record<
  GuildTier,
  { label: string; icon: typeof Shield; colors: string }
> = {
  APPRENTI: {
    label: "Apprenti",
    icon: Shield,
    colors: "bg-surface-raised text-foreground-secondary ring-border/30",
  },
  COMPAGNON: {
    label: "Compagnon",
    icon: Star,
    colors: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  },
  MAITRE: {
    label: "Ma\u00eetre",
    icon: Crown,
    colors: "bg-warning/15 text-warning ring-warning",
  },
  ASSOCIE: {
    label: "Associ\u00e9",
    icon: Gem,
    colors: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  },
};

const SIZE_CLASSES = {
  sm: { badge: "px-2 py-0.5 text-xs gap-1", icon: "h-3 w-3" },
  md: { badge: "px-2.5 py-1 text-sm gap-1.5", icon: "h-3.5 w-3.5" },
  lg: { badge: "px-3 py-1.5 text-sm gap-2", icon: "h-4 w-4" },
};

export function TierBadge({ tier, size = "md", className }: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  const sizeConfig = SIZE_CLASSES[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold ring-1 ring-inset",
        sizeConfig.badge,
        config.colors,
        className,
      )}
    >
      <Icon className={sizeConfig.icon} />
      {config.label}
    </span>
  );
}

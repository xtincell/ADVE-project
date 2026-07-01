"use client";

/**
 * OperateStatusBadge — Badge générique data-driven pour toute la section opérationnelle.
 *
 * Remplace tous les badges locaux définis dans les pages individuelles.
 * Consomme UNIQUEMENT operate-config.ts — zéro couleur inline.
 *
 * Usage :
 *   <OperateStatusBadge type="campaign" value="LIVE" />
 *   <OperateStatusBadge type="priority" value="CRITIQUE" />
 *   <OperateStatusBadge type="aarrr" value="ACQUISITION" />
 *   <OperateStatusBadge type="mission" value="IN_PROGRESS" />
 *   <OperateStatusBadge type="health" value="RED" />
 *   <OperateStatusBadge type="brief" value="VALIDATED" />
 *   <OperateStatusBadge type="request" value="OPEN" />
 *   <OperateStatusBadge type="creative" value="EN_PRODUCTION" />
 *   <OperateStatusBadge type="client" value="VALIDE" />
 *   <OperateStatusBadge type="production" value="TERMINE" />
 */

import { cn } from "@/lib/utils";
import {
  getCampaignStateConfig,
  getAARRStageConfig,
  getMissionStageConfig,
  getPriorityConfig,
  getHealthSignalConfig,
  BRIEF_STATUS_CONFIG,
  REQUEST_STATUS_CONFIG,
  CREATIVE_STATUS_CONFIG,
  CLIENT_STATUS_CONFIG,
  PRODUCTION_STATE_CONFIG,
  type BriefStatus,
  type RequestStatus,
  type CreativeProductionStatus,
  type ClientReviewStatus,
  type ProductionState,
  type HealthSignal,
} from "@/lib/operate-config";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type BadgeType =
  | "campaign"
  | "aarrr"
  | "mission"
  | "priority"
  | "health"
  | "brief"
  | "request"
  | "creative"
  | "client"
  | "production";

interface OperateStatusBadgeProps {
  type: BadgeType;
  value: string;
  /** Afficher l'icône sémantique */
  showIcon?: boolean;
  /** Afficher le label court au lieu du label complet */
  short?: boolean;
  /** Classes CSS additionnelles */
  className?: string;
  /** Taille du badge */
  size?: "xs" | "sm" | "md";
}

// ─────────────────────────────────────────────────────────────────────────────
// Résolution de config depuis le type et la valeur
// ─────────────────────────────────────────────────────────────────────────────

function resolveConfig(type: BadgeType, value: string): { label: string; color: string; icon?: string } {
  switch (type) {
    case "campaign": {
      const cfg = getCampaignStateConfig(value);
      return { label: cfg.label, color: cfg.color, icon: cfg.icon };
    }
    case "aarrr": {
      const cfg = getAARRStageConfig(value);
      return { label: cfg.label, color: cfg.color, icon: cfg.icon };
    }
    case "mission": {
      const cfg = getMissionStageConfig(value);
      return { label: cfg.label, color: cfg.color, icon: cfg.icon };
    }
    case "priority": {
      const cfg = getPriorityConfig(value);
      return { label: cfg.label, color: cfg.color, icon: cfg.icon };
    }
    case "health": {
      const cfg = getHealthSignalConfig(value);
      return { label: cfg.label, color: cfg.color, icon: cfg.icon };
    }
    case "brief": {
      const cfg = BRIEF_STATUS_CONFIG[value as BriefStatus];
      return cfg
        ? { label: cfg.label, color: cfg.color, icon: cfg.icon }
        : { label: value, color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30" };
    }
    case "request": {
      const cfg = REQUEST_STATUS_CONFIG[value as RequestStatus];
      return cfg
        ? { label: cfg.label, color: cfg.color, icon: cfg.icon }
        : { label: value, color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30" };
    }
    case "creative": {
      const cfg = CREATIVE_STATUS_CONFIG[value as CreativeProductionStatus];
      return cfg
        ? { label: cfg.label, color: cfg.color, icon: cfg.icon }
        : { label: value, color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30" };
    }
    case "client": {
      const cfg = CLIENT_STATUS_CONFIG[value as ClientReviewStatus];
      return cfg
        ? { label: cfg.label, color: cfg.color, icon: cfg.icon }
        : { label: value, color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30" };
    }
    case "production": {
      const cfg = PRODUCTION_STATE_CONFIG[value as ProductionState];
      return cfg
        ? { label: cfg.label, color: cfg.color, icon: cfg.icon }
        : { label: value, color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30" };
    }
    default:
      return { label: value, color: "bg-foreground-muted/15 text-foreground-secondary ring-border/30" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant
// ─────────────────────────────────────────────────────────────────────────────

export function OperateStatusBadge({
  type,
  value,
  showIcon = true,
  short = false,
  className,
  size = "sm",
}: OperateStatusBadgeProps) {
  if (!value) return null;

  const { label, color, icon } = resolveConfig(type, value);

  const sizeClasses = {
    xs: "px-1.5 py-px text-[9px]",
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-0.5 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset",
        sizeClasses[size],
        color,
        className
      )}
    >
      {showIcon && icon && <span className="leading-none">{icon}</span>}
      <span>{short ? value.replace(/_/g, " ") : label}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Health dot — point pulsant pour le health signal
// ─────────────────────────────────────────────────────────────────────────────

export function HealthDot({ signal }: { signal: string }) {
  const cfg = getHealthSignalConfig(signal);
  return (
    <span
      title={cfg.label}
      className={cn("inline-block h-2 w-2 rounded-full", cfg.dotClass)}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CampaignStateBadge — remplacement direct du composant local dans campaigns/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

export function CampaignStateBadge({ state, compact = false }: { state: string; compact?: boolean }) {
  const cfg = getCampaignStateConfig(state);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset",
        compact ? "px-1.5 py-px text-[9px]" : "px-2.5 py-0.5 text-xs",
        cfg.color
      )}
    >
      {cfg.icon && <span className="leading-none">{cfg.icon}</span>}
      {compact ? cfg.labelShort : cfg.label}
    </span>
  );
}

/**
 * OracleSectionCard — Phase 21 F-F (ADR-0073)
 *
 * Affiche une section Oracle (1..35) avec son status courant + le bouton
 * d'action contextuel (Générer / Régénérer / Retry).
 *
 * Sources de vérité combinées :
 *   - DB persisté (props.dbStatus / dbStatus)  → status canonique
 *   - Stream events (props.streamPhase)        → phase live "generating" si
 *                                                section en cours
 *
 * La précédence est : si streamPhase === "generating", on affiche GENERATING
 * même si dbStatus dit autre chose (transition not-yet-persisted). Sinon
 * dbStatus a la priorité.
 */

"use client";

import { CheckCircle, Loader2, AlertCircle, Circle, RefreshCw, Sparkles } from "lucide-react";
import type { OracleSectionPhase } from "@/hooks/use-oracle-stream";

export type SectionDbStatus = "PENDING" | "GENERATING" | "COMPLETE" | "FAILED" | "STALE";

export interface OracleSectionCardProps {
  sectionNumber: string; // "01" .. "35"
  sectionId: number;
  sectionTitle: string;
  tier: "CORE" | "BIG4_BASELINE" | "DISTINCTIVE";
  dbStatus: SectionDbStatus;
  /** Phase live depuis le stream (override transitoire). Optional. */
  streamPhase?: OracleSectionPhase;
  /** Confidence persisté (0..1) ou live depuis stream. */
  confidence?: number | null;
  /** Last error si dbStatus=FAILED. */
  lastError?: { errorCode?: string | null; errorMessage?: string | null } | null;
  /** Section a une dépendance amont mutée (UI badge stale-aware). */
  isStale?: boolean;
  /** Disable le bouton si l'opérateur n'a pas le droit ou si une autre op est en cours. */
  disabled?: boolean;
  /** Click "Générer" / "Régénérer" / "Retry" — caller émet le tRPC mutation. */
  onAction: (mode: "FRESH" | "REGEN" | "RETRY") => void;
  /** Click sur la card FAILED ouvre le modal d'erreur détaillé. */
  onShowError?: () => void;
}

const TIER_CHIPS: Record<OracleSectionCardProps["tier"], string> = {
  CORE: "bg-blue-500/10 text-blue-300 border-blue-700/30",
  BIG4_BASELINE: "bg-zinc-500/10 text-zinc-300 border-zinc-700/30",
  DISTINCTIVE: "bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-700/30",
};

export function OracleSectionCard(props: OracleSectionCardProps): React.ReactElement {
  const {
    sectionNumber,
    sectionId,
    sectionTitle,
    tier,
    dbStatus,
    streamPhase,
    confidence,
    lastError,
    isStale,
    disabled,
    onAction,
    onShowError,
  } = props;

  // Stream phase wins for transient "generating" state; otherwise DB status.
  const effectivePhase = resolveEffectivePhase(dbStatus, streamPhase);
  const visual = getVisual(effectivePhase, isStale);
  const buttonConfig = getButtonConfig(effectivePhase, dbStatus);

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border ${visual.border} ${visual.bg} px-3 py-2.5 transition-all`}
    >
      <visual.Icon
        className={`mt-0.5 h-4 w-4 shrink-0 ${visual.color} ${effectivePhase === "generating" ? "animate-spin" : ""}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground-muted">{sectionNumber}</span>
          <span className="truncate text-sm font-medium text-foreground-secondary" title={`§${sectionId} — ${sectionTitle}`}>
            {sectionTitle}
          </span>
          <span
            className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${TIER_CHIPS[tier]}`}
          >
            {tier === "BIG4_BASELINE" ? "BIG4" : tier === "DISTINCTIVE" ? "DISTINCT" : "CORE"}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-foreground-muted">
          <span className={`font-medium ${visual.color}`}>{visual.label}</span>
          {effectivePhase === "completed" && typeof confidence === "number" && (
            <span>· conf {confidence.toFixed(2)}</span>
          )}
          {isStale && effectivePhase !== "generating" && (
            <span className="text-amber-300">· un pilier amont a muté</span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {effectivePhase === "failed" && lastError?.errorCode && onShowError && (
          <button
            type="button"
            onClick={onShowError}
            className="rounded border border-rose-700/40 bg-rose-900/20 px-2 py-0.5 text-[10px] font-medium text-rose-300 transition-colors hover:bg-rose-900/40"
            title={lastError.errorMessage ?? lastError.errorCode}
          >
            voir l&apos;erreur
          </button>
        )}
        <button
          type="button"
          onClick={() => onAction(buttonConfig.mode)}
          disabled={disabled || effectivePhase === "generating"}
          className={`flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40 ${buttonConfig.className}`}
          title={buttonConfig.title}
        >
          <buttonConfig.Icon className={`h-3 w-3 ${effectivePhase === "generating" ? "animate-spin" : ""}`} />
          {buttonConfig.label}
        </button>
      </div>
    </div>
  );
}

// ── Internals ────────────────────────────────────────────────────────

function resolveEffectivePhase(
  dbStatus: SectionDbStatus,
  streamPhase: OracleSectionPhase | undefined,
): "idle" | "generating" | "completed" | "failed" | "stale" {
  // Stream "generating" wins (UI feedback transitoire).
  if (streamPhase === "generating") return "generating";
  // DB status canonique.
  if (dbStatus === "GENERATING") return "generating";
  if (dbStatus === "COMPLETE") return "completed";
  if (dbStatus === "FAILED") return "failed";
  if (dbStatus === "STALE") return "stale";
  return "idle";
}

interface VisualConfig {
  Icon: typeof CheckCircle;
  color: string;
  bg: string;
  border: string;
  label: string;
}

function getVisual(phase: ReturnType<typeof resolveEffectivePhase>, isStale: boolean | undefined): VisualConfig {
  if (phase === "generating") {
    return {
      Icon: Loader2,
      color: "text-blue-400",
      bg: "bg-blue-900/15",
      border: "border-blue-700/40",
      label: "Génération en cours",
    };
  }
  if (phase === "completed") {
    return {
      Icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-900/10",
      border: "border-emerald-800/30",
      label: isStale ? "Complète (périmée)" : "Complète",
    };
  }
  if (phase === "failed") {
    return {
      Icon: AlertCircle,
      color: "text-rose-400",
      bg: "bg-rose-900/15",
      border: "border-rose-800/40",
      label: "Échec",
    };
  }
  if (phase === "stale") {
    return {
      Icon: AlertCircle,
      color: "text-amber-300",
      bg: "bg-amber-900/10",
      border: "border-amber-800/30",
      label: "Périmée",
    };
  }
  return {
    Icon: Circle,
    color: "text-foreground-muted",
    bg: "bg-background/30",
    border: "border-border",
    label: "En attente",
  };
}

interface ButtonConfig {
  Icon: typeof Sparkles;
  label: string;
  mode: "FRESH" | "REGEN" | "RETRY";
  title: string;
  className: string;
}

function getButtonConfig(
  phase: ReturnType<typeof resolveEffectivePhase>,
  dbStatus: SectionDbStatus,
): ButtonConfig {
  if (phase === "generating") {
    return {
      Icon: Loader2,
      label: "En cours…",
      mode: "FRESH",
      title: "Génération déjà en cours",
      className: "border-blue-700/40 bg-blue-900/30 text-blue-300",
    };
  }
  if (phase === "failed" || dbStatus === "FAILED") {
    return {
      Icon: RefreshCw,
      label: "Retry",
      mode: "RETRY",
      title: "Reprendre après échec (mode RETRY)",
      className: "border-rose-700/40 bg-rose-900/20 text-rose-300 hover:bg-rose-900/40",
    };
  }
  if (phase === "stale" || dbStatus === "STALE") {
    return {
      Icon: RefreshCw,
      label: "Régénérer",
      mode: "RETRY",
      title: "Section périmée — régénère pour rafraîchir",
      className: "border-amber-700/40 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40",
    };
  }
  if (phase === "completed" || dbStatus === "COMPLETE") {
    return {
      Icon: RefreshCw,
      label: "Régénérer",
      mode: "REGEN",
      title: "Régénère cette section (mode REGEN)",
      className: "border-border bg-background text-foreground-secondary hover:bg-surface-raised",
    };
  }
  // PENDING — première génération
  return {
    Icon: Sparkles,
    label: "Générer",
    mode: "FRESH",
    title: "Première génération de cette section (mode FRESH)",
    className: "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20",
  };
}

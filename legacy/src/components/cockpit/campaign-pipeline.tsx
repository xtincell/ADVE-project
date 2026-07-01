"use client";

/**
 * CampaignPipeline — Visualisation stepper de la machine à 12 états.
 *
 * Consomme UNIQUEMENT operate-config.ts — zéro état hardcodé.
 * La validation des transitions reste côté serveur (campaignManager.transition).
 * Ce composant est responsable de l'affichage et du déclenchement de la mutation.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import {
  CAMPAIGN_STATES,
  getCampaignStateConfig,
  getCampaignStateLabel,
  getDisplayTransitions,
  getNextState,
  GATE_LABELS,
  type CampaignState,
} from "@/lib/operate-config";
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  Lock,
  AlertTriangle,
  Loader2,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CampaignPipelineProps {
  campaignId: string;
  currentState: string;
  onTransitionComplete?: () => void;
  /** Mode compact — pastilles sans labels (pour les cartes de liste) */
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ordre canonique du stepper (les 10 états forward, sans ARCHIVED/CANCELLED)
// ─────────────────────────────────────────────────────────────────────────────

const PIPELINE_STEPS: CampaignState[] = [
  "BRIEF_DRAFT",
  "BRIEF_VALIDATED",
  "PLANNING",
  "CREATIVE_DEV",
  "PRODUCTION",
  "PRE_PRODUCTION",
  "APPROVAL",
  "READY_TO_LAUNCH",
  "LIVE",
  "POST_CAMPAIGN",
];

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────

export function CampaignPipeline({
  campaignId,
  currentState,
  onTransitionComplete,
  compact = false,
}: CampaignPipelineProps) {
  const [confirmTransition, setConfirmTransition] = useState<CampaignState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentCfg = getCampaignStateConfig(currentState);
  const currentIndex = PIPELINE_STEPS.indexOf(currentState as CampaignState);
  const isTerminal = currentCfg.isTerminal;
  const isCancelled = currentState === "CANCELLED";

  // Récupère les transitions disponibles depuis le serveur
  const availableQuery = trpc.campaignManager.availableTransitions.useQuery(
    { state: currentState as "BRIEF_DRAFT" | "BRIEF_VALIDATED" | "PLANNING" | "CREATIVE_DEV" | "PRODUCTION" | "PRE_PRODUCTION" | "APPROVAL" | "READY_TO_LAUNCH" | "LIVE" | "POST_CAMPAIGN" | "ARCHIVED" | "CANCELLED" },
    { staleTime: 30_000 }
  );
  const serverTransitions = (availableQuery.data ?? []) as CampaignState[];

  // Transitions d'affichage (client, pour UI) — validées au final côté serveur
  const displayTransitions = getDisplayTransitions(currentState as CampaignState);
  const nextState = getNextState(currentState as CampaignState);

  // Mutation de transition
  const transitionMutation = trpc.campaignManager.transition.useMutation({
    onSuccess: () => {
      setConfirmTransition(null);
      setError(null);
      onTransitionComplete?.();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleTransition(toState: CampaignState) {
    setError(null);
    setConfirmTransition(toState);
  }

  function confirmAndTransition() {
    if (!confirmTransition) return;
    transitionMutation.mutate({ campaignId, toState: confirmTransition });
  }

  // ── Mode compact ─────────────────────────────────────────────────────────
  if (compact) {
    return (
      <CompactPipeline
        currentState={currentState}
        currentIndex={currentIndex}
        isCancelled={isCancelled}
      />
    );
  }

  // ── Mode complet ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Bandeau état courant */}
      <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-surface-raised p-4">
        <span className="text-2xl">{currentCfg.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                currentCfg.color
              )}
            >
              {currentCfg.labelShort}
            </span>
            {isCancelled && (
              <span className="text-xs text-error font-medium">Campagne annulée</span>
            )}
          </div>
          <p className="mt-0.5 text-sm font-semibold text-foreground">{currentCfg.label}</p>
          <p className="mt-0.5 text-xs text-foreground-muted">{currentCfg.description}</p>
        </div>
        {!isTerminal && !isCancelled && currentIndex >= 0 && (
          <div className="shrink-0 text-right">
            <div className="font-mono text-2xs uppercase tracking-widest text-foreground-muted">
              Étape
            </div>
            <div className="text-sm font-bold text-foreground">
              {currentIndex + 1}
              <span className="text-foreground-muted">/{PIPELINE_STEPS.length}</span>
            </div>
          </div>
        )}
      </div>

      {/* Stepper horizontal */}
      {!isCancelled && (
        <div className="overflow-x-auto pb-2">
          <ol className="flex min-w-max items-start gap-0">
            {PIPELINE_STEPS.map((step, idx) => {
              const cfg = CAMPAIGN_STATES[step];
              const isPast = currentIndex > idx;
              const isCurrent = currentIndex === idx;
              const isFuture = currentIndex < idx;
              const isLast = idx === PIPELINE_STEPS.length - 1;

              return (
                <li key={step} className="flex items-center">
                  {/* Pastille */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all",
                        isPast &&
                          "bg-success/20 text-success ring-1 ring-inset ring-success/40",
                        isCurrent &&
                          "ring-2 ring-offset-2 ring-offset-surface ring-accent bg-accent/20 text-accent scale-110",
                        isFuture &&
                          "bg-background/40 text-foreground-muted ring-1 ring-inset ring-border/30"
                      )}
                    >
                      {isPast ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isCurrent ? (
                        <span className="text-xs font-bold">{idx + 1}</span>
                      ) : (
                        <span className="text-xs text-foreground-muted">{idx + 1}</span>
                      )}
                    </div>
                    {/* Label */}
                    <span
                      className={cn(
                        "max-w-[64px] text-center text-[9px] leading-tight",
                        isPast && "text-success",
                        isCurrent && "font-semibold text-foreground",
                        isFuture && "text-foreground-muted"
                      )}
                    >
                      {cfg.labelShort}
                    </span>
                  </div>

                  {/* Connecteur */}
                  {!isLast && (
                    <div
                      className={cn(
                        "mx-1 h-px w-6 shrink-0 transition-colors",
                        isPast || isCurrent ? "bg-accent/40" : "bg-border/30"
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Gates de la prochaine transition */}
      {!isTerminal && !isCancelled && currentCfg.forwardGates.length > 0 && (
        <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            Prérequis pour avancer
          </div>
          <ul className="space-y-0.5">
            {currentCfg.forwardGates.map((gate) => (
              <li key={gate} className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <Lock className="h-3 w-3 text-warning/60" />
                {GATE_LABELS[gate] ?? gate}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-xs text-error">
          <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
          {error}
        </div>
      )}

      {/* Confirmation de transition */}
      {confirmTransition && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">
            Confirmer la transition ?
          </p>
          <div className="flex items-center gap-2 text-xs text-foreground-muted">
            <span>{currentCfg.icon} {currentCfg.label}</span>
            <ArrowRight className="h-3 w-3 text-accent" />
            <span>
              {getCampaignStateConfig(confirmTransition).icon}{" "}
              {getCampaignStateLabel(confirmTransition)}
            </span>
          </div>
          {CAMPAIGN_STATES[confirmTransition]?.forwardRequiresApproval && (
            <p className="text-2xs text-warning">
              ⚠️ Cette transition nécessite une approbation.
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={transitionMutation.isPending}
              onClick={confirmAndTransition}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {transitionMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Confirmer
            </button>
            <button
              type="button"
              onClick={() => setConfirmTransition(null)}
              className="rounded-lg bg-background/60 px-3 py-1.5 text-xs font-medium text-foreground-secondary transition-colors hover:bg-background"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Actions disponibles */}
      {!isTerminal && !isCancelled && !confirmTransition && displayTransitions.length > 0 && (
        <div className="space-y-2">
          {/* Bouton principal — avancer vers le prochain état */}
          {nextState && (
            <button
              type="button"
              onClick={() => handleTransition(nextState)}
              className="flex w-full items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              <span className="flex items-center gap-2">
                <span>{getCampaignStateConfig(nextState).icon}</span>
                Avancer vers « {getCampaignStateLabel(nextState)} »
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* Rollbacks et annulation */}
          {displayTransitions
            .filter((t) => t !== nextState)
            .map((toState) => {
              const toCfg = getCampaignStateConfig(toState);
              const isCancel = toState === "CANCELLED";
              const isRollback =
                CAMPAIGN_STATES[toState]?.stepIndex < (currentIndex ?? 0);
              return (
                <button
                  key={toState}
                  type="button"
                  onClick={() => handleTransition(toState)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    isCancel
                      ? "border border-error/20 bg-error/5 text-error hover:bg-error/10"
                      : "border border-border/30 bg-background/40 text-foreground-secondary hover:bg-background/60"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    {isRollback && <RotateCcw className="h-3 w-3" />}
                    <span>{toCfg.icon}</span>
                    {isCancel
                      ? "Annuler la campagne"
                      : isRollback
                        ? `Retour : ${getCampaignStateLabel(toState)}`
                        : getCampaignStateLabel(toState)}
                  </span>
                </button>
              );
            })}
        </div>
      )}

      {/* État terminal */}
      {(isTerminal || isCancelled) && (
        <div className="rounded-lg border border-border/30 bg-background/40 p-3 text-center text-xs text-foreground-muted">
          {isCancelled
            ? "Cette campagne a été annulée. Aucune action disponible."
            : "Cette campagne est archivée définitivement."}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mode compact — mini-stepper pour les cartes de liste
// ─────────────────────────────────────────────────────────────────────────────

function CompactPipeline({
  currentState,
  currentIndex,
  isCancelled,
}: {
  currentState: string;
  currentIndex: number;
  isCancelled: boolean;
}) {
  if (isCancelled) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-error font-medium">❌ Annulée</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-px">
      {PIPELINE_STEPS.map((step, idx) => {
        const cfg = CAMPAIGN_STATES[step];
        const isPast = currentIndex > idx;
        const isCurrent = currentIndex === idx;

        return (
          <div
            key={step}
            title={cfg.label}
            className={cn(
              "h-1.5 rounded-full transition-all",
              isPast ? "w-3 bg-success/60" : isCurrent ? "w-3 bg-accent" : "w-2 bg-border/40",
              isCurrent && "ring-1 ring-accent/40"
            )}
          />
        );
      })}
    </div>
  );
}

"use client";

/**
 * <ArtemisLaunchModal/> — Préparation guidée du vault avant lancement Artemis.
 *
 * Trois phases internes :
 *   1. DIAGNOSE — affiche l'état des 4 piliers fondateurs (A/D/V/E) en
 *      langage métier. Si tous sont prêts (≥ ENRICHED), court-circuit
 *      direct vers Artemis. Sinon : 3 actions (Préparer / Modifier moi-même
 *      / Annuler).
 *   2. PREPARING — appel `pillar.cockpitPrepareForArtemis`. Loader, puis
 *      récap par pilier (filled / needsHuman). Si needsHuman bloque,
 *      deep-link vers la page d'édition du pilier.
 *   3. READY — confirmation humaine, bouton "Lancer Artemis maintenant".
 *
 * Pas de jargon eng dans le copy (cf. NEFER §9.5).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Wand2,
} from "lucide-react";
import { Dialog, DialogFooter } from "@/components/primitives/dialog";
import { trpc } from "@/lib/trpc/client";
import { PILLAR_NAMES } from "@/lib/types/advertis-vector";
import type { AutoFillResult } from "@/lib/types/pillar-maturity";
import { ADVE_KEYS as CANONICAL_ADVE_KEYS } from "@/domain";

// ─── Type aliases ─────────────────────────────────────────────────────────

type PillarKey = "a" | "d" | "v" | "e";
// pillar-maturity stores under lowercase keys — derive from canonical uppercase.
const ADVE_KEYS: PillarKey[] = CANONICAL_ADVE_KEYS.map((k) => k.toLowerCase() as PillarKey);

const COCKPIT_PILLAR_ROUTE: Record<PillarKey, string> = {
  a: "/cockpit/brand/identity",
  d: "/cockpit/brand/positioning",
  v: "/cockpit/brand/offer",
  e: "/cockpit/brand/engagement",
};

// Stage labels in business language (no eng jargon)
const STAGE_COPY: Record<string, { label: string; tone: "ok" | "warn" | "todo" }> = {
  EMPTY: { label: "À démarrer", tone: "todo" },
  INTAKE: { label: "Brouillon", tone: "warn" },
  ENRICHED: { label: "Prêt", tone: "ok" },
  COMPLETE: { label: "Complet", tone: "ok" },
};

interface PillarReadinessLite {
  pillarKey: string;
  stage: string; // EMPTY | INTAKE | ENRICHED | COMPLETE
  missing: readonly string[];
  derivable: readonly string[];
  needsHuman: readonly string[];
}

interface ExternalBlocker {
  pillarKey: string;
  reasons: readonly string[];
  missingFields?: readonly string[];
}

// ─── Component ─────────────────────────────────────────────────────────────

export interface ArtemisLaunchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyId: string;
  /** Called when the user confirms launch — page handles the actual mutation. */
  onLaunch: () => void;
  /**
   * Pre-seed blockers when the modal is opened reactively (after enrichOracle
   * threw ORACLE-101). Lets us show the same flow without re-querying.
   */
  externalBlockers?: readonly ExternalBlocker[];
}

type Phase = "DIAGNOSE" | "PREPARING" | "READY";

export function ArtemisLaunchModal({
  open,
  onOpenChange,
  strategyId,
  onLaunch,
  externalBlockers,
}: ArtemisLaunchModalProps) {
  const [phase, setPhase] = useState<Phase>("DIAGNOSE");
  const [fillResults, setFillResults] = useState<AutoFillResult[] | null>(null);
  const [inferredMarked, setInferredMarked] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Fetch fresh pillar readiness when modal opens. While the auto-fill is
  // running we poll every 3s so the user sees each pillar transition from
  // EMPTY/INTAKE → ENRICHED live (proof the server is making progress, not
  // a generic spinner that says nothing).
  const readiness = trpc.pillar.maturityReport.useQuery(
    { strategyId },
    {
      enabled: open,
      refetchOnWindowFocus: false,
      refetchInterval: phase === "PREPARING" ? 3000 : false,
    },
  );

  const prepare = trpc.pillar.cockpitPrepareForArtemis.useMutation({
    onSuccess: (data) => {
      setFillResults(data.pillars);
      setInferredMarked(data.inferredMarked);
      void readiness.refetch();
    },
  });

  // Reset on close
  const resetPrepare = prepare.reset;
  useEffect(() => {
    if (!open) {
      setPhase("DIAGNOSE");
      setFillResults(null);
      setInferredMarked(0);
      resetPrepare();
    }
  }, [open, resetPrepare]);

  // Decide phase from readiness data
  const advePillars: PillarReadinessLite[] = useMemo(() => {
    const pillars = readiness.data?.pillars;
    if (!pillars) return [];
    return ADVE_KEYS.map((k) => {
      // assessStrategy stores by lowercase key
      const r = pillars[k];
      return {
        pillarKey: k,
        stage: r?.currentStage ?? "EMPTY",
        missing: r?.missing ?? [],
        derivable: r?.derivable ?? [],
        needsHuman: r?.needsHuman ?? [],
      };
    });
  }, [readiness.data]);

  const allReady = advePillars.length === 4 && advePillars.every((p) => p.stage === "ENRICHED" || p.stage === "COMPLETE");
  const blockingPillars = advePillars.filter((p) => p.stage !== "ENRICHED" && p.stage !== "COMPLETE");

  // Auto-advance: if everything is already ready when modal opens, jump to READY
  useEffect(() => {
    if (!open) return;
    if (phase !== "DIAGNOSE") return;
    if (readiness.isLoading) return;
    if (allReady) setPhase("READY");
  }, [open, phase, readiness.isLoading, allReady]);

  // Decide post-fill phase — needsHuman is never blocking (PR-C ADR-0035).
  // Auto-fill always produces an inferred draft; the human validates afterward
  // via the "Inféré IA" badge on each cockpit pillar page. We always go to
  // READY after a fill completes — if the gate still vetoes server-side, the
  // page's onError handler reopens the modal with the server-side blockers.
  useEffect(() => {
    if (phase !== "PREPARING" || !fillResults) return;
    setPhase("READY");
  }, [phase, fillResults]);

  // Tick a 1s counter while preparing so the user sees that something is
  // alive even if the server is quiet (LLM calls take time).
  useEffect(() => {
    if (phase !== "PREPARING") {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Heartbeat from the polling query — seconds since last readiness refresh.
  // The `elapsed` tick re-renders this component every 1s while preparing,
  // so this stale-counter stays accurate without needing its own interval.
  const sinceRefresh = phase === "PREPARING" && readiness.dataUpdatedAt
    ? Math.max(0, Math.floor((Date.now() - readiness.dataUpdatedAt) / 1000))
    : null;

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Préparer le lancement d'Artemis
        </span>
      }
      description={
        phase === "DIAGNOSE" || phase === "PREPARING"
          ? "Avant qu'Artemis enrichisse les 35 sections de l'Oracle, vos 4 fondations stratégiques doivent être prêtes. Les champs comblés par l'IA sont marqués « Inféré » pour que vous les validiez plus tard."
          : "Vos fondations sont prêtes. Artemis peut enrichir l'Oracle."
      }
    >
      {/* Loading initial readiness */}
      {readiness.isLoading && phase === "DIAGNOSE" && (
        <div className="flex items-center gap-2 py-8 text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Évaluation des 4 fondations en cours…</span>
        </div>
      )}

      {/* DIAGNOSE phase */}
      {phase === "DIAGNOSE" && !readiness.isLoading && advePillars.length > 0 && (
        <>
          {externalBlockers && externalBlockers.length > 0 && (
            <div className="mb-4 rounded-lg border border-error/40 bg-error/5 p-3 text-xs text-error">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Le lancement précédent a été interrompu : votre vault stratégique manque de matière
                  pour qu'Artemis puisse enrichir l'Oracle proprement.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {advePillars.map((p) => (
              <PillarRow key={p.pillarKey} pillar={p} />
            ))}
          </div>

          <div className="mt-5 rounded-lg border border-border bg-background/50 p-3 text-xs text-foreground-muted">
            <p>
              <strong className="text-foreground-secondary">Préparation automatique :</strong>{" "}
              nous comblons d'abord ce qui se déduit de votre vault (calculs, références croisées),
              puis Artemis génère ce qui manque encore. Vous pouvez ensuite réviser, éditer ou relancer.
            </p>
          </div>
        </>
      )}

      {/* PREPARING phase — live feedback : elapsed counter, per-pillar real
          stage refreshed every 3s by the polling query, heartbeat showing the
          last successful refresh, and a soft warning after 75s. */}
      {phase === "PREPARING" && (
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <p className="text-sm text-foreground-secondary">
              Préparation des 4 fondations…{" "}
              <span className="font-mono text-foreground">{elapsed}s</span>
              <span className="text-foreground-muted">
                {" "}/ typiquement 20-60s
              </span>
            </p>
          </div>

          {/* Per-pillar live stage from the readiness poll */}
          <ul className="space-y-1.5 text-xs">
            {advePillars.map((p) => {
              const ready = p.stage === "ENRICHED" || p.stage === "COMPLETE";
              const stageInfo = STAGE_COPY[p.stage] ?? { label: p.stage, tone: "todo" as const };
              return (
                <li key={p.pillarKey} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-foreground-secondary">
                    {ready ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-foreground-muted" />
                    )}
                    {PILLAR_NAMES[p.pillarKey as keyof typeof PILLAR_NAMES]}
                  </span>
                  <span
                    className={
                      ready
                        ? "font-medium text-emerald-500"
                        : stageInfo.tone === "warn"
                          ? "text-yellow-500"
                          : "text-foreground-muted"
                    }
                  >
                    {stageInfo.label}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Heartbeat — confirms the polling is alive */}
          {sinceRefresh !== null && (
            <p className="text-[11px] text-foreground-muted">
              Dernière mise à jour : il y a {sinceRefresh}s
              {readiness.isFetching && " · rafraîchissement…"}
            </p>
          )}

          {/* Soft warning after 75s — exceeding the typical window */}
          {elapsed > 75 && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3 text-xs text-foreground-secondary">
              <strong className="text-yellow-500">C'est plus long que prévu.</strong>{" "}
              Le serveur travaille toujours (LLM + écritures). Tu peux fermer cette
              fenêtre — la préparation continue en arrière-plan, et tu verras les
              piliers passer en « Prêt » sur leurs pages dédiées.
            </div>
          )}
        </div>
      )}

      {/* READY phase — fill done. needsHuman is never blocking : auto-fill
          always produces an inferred draft, and the operator validates the
          INFERRED-marked fields later from each pillar page. */}
      {phase === "READY" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-500">
                Vos 4 fondations sont prêtes.
              </p>
              <p className="text-xs text-foreground-secondary">
                Artemis va enrichir les 35 sections de l'Oracle en s'appuyant sur votre vault.
                Vous suivrez la progression en temps réel sur la page proposition.
              </p>
            </div>
          </div>

          {fillResults && fillResults.some((r) => r.filled.length > 0) && (
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="mb-2 text-xs font-semibold text-foreground-secondary">
                Récapitulatif de la préparation
              </p>
              <ul className="space-y-1 text-xs text-foreground-muted">
                {fillResults.map((r) => (
                  <li key={r.pillarKey} className="flex items-center justify-between">
                    <span>{PILLAR_NAMES[r.pillarKey as keyof typeof PILLAR_NAMES]}</span>
                    <span className="text-emerald-400">
                      {r.filled.length > 0 ? `+${r.filled.length} champs` : "déjà prêt"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {inferredMarked > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
              <p className="text-xs text-foreground-secondary">
                <strong className="text-yellow-500">{inferredMarked} champ{inferredMarked > 1 ? "s" : ""} inféré{inferredMarked > 1 ? "s" : ""}</strong>{" "}
                par l'IA et marqué{inferredMarked > 1 ? "s" : ""} comme tel{inferredMarked > 1 ? "s" : ""}. Vous pourrez les valider ou les
                réécrire depuis chaque page de fondation (Authenticité / Distinction / Valeur /
                Engagement) — un badge « Inféré IA » s'affiche à côté de chaque valeur concernée.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mutation error */}
      {prepare.error && (
        <div className="mt-3 rounded-lg border border-error/40 bg-error/5 p-3 text-xs text-error">
          La préparation a échoué : {prepare.error.message}
        </div>
      )}

      {/* Footer actions */}
      <DialogFooter>
        {phase === "DIAGNOSE" && !readiness.isLoading && (
          <>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-raised"
            >
              Annuler
            </button>
            {blockingPillars[0] && (
              <a
                href={COCKPIT_PILLAR_ROUTE[blockingPillars[0]!.pillarKey as PillarKey]}
                className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-raised hover:text-foreground"
              >
                Modifier moi-même <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                setPhase("PREPARING");
                prepare.mutate({ strategyId });
              }}
              disabled={prepare.isPending || advePillars.length === 0}
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" /> Préparer automatiquement
            </button>
          </>
        )}

        {phase === "PREPARING" && (
          <>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-raised"
            >
              Fermer (la préparation continue)
            </button>
            <button
              type="button"
              disabled
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white opacity-60"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-mono">{elapsed}s</span>
            </button>
          </>
        )}

        {phase === "READY" && (
          <>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-raised"
            >
              Plus tard
            </button>
            <button
              type="button"
              onClick={() => {
                onLaunch();
                onOpenChange(false);
              }}
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent"
            >
              <Sparkles className="h-4 w-4" /> Lancer Artemis maintenant
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

      </DialogFooter>
    </Dialog>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

function PillarRow({ pillar }: { pillar: PillarReadinessLite }) {
  const stageInfo = STAGE_COPY[pillar.stage] ?? { label: pillar.stage, tone: "todo" as const };
  const ready = pillar.stage === "ENRICHED" || pillar.stage === "COMPLETE";
  const name = PILLAR_NAMES[pillar.pillarKey as keyof typeof PILLAR_NAMES];

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3">
      <div className="flex items-center gap-3">
        {ready ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <AlertCircle
            className={
              stageInfo.tone === "warn" ? "h-5 w-5 text-yellow-500" : "h-5 w-5 text-foreground-muted"
            }
          />
        )}
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          {!ready && (
            <p className="mt-0.5 text-xs text-foreground-muted">
              {pillar.derivable.length > 0 && (
                <>{pillar.derivable.length} déductible{pillar.derivable.length > 1 ? "s" : ""}</>
              )}
              {pillar.derivable.length > 0 && pillar.needsHuman.length > 0 && " · "}
              {pillar.needsHuman.length > 0 && (
                <>
                  {pillar.needsHuman.length} à renseigner
                </>
              )}
              {pillar.derivable.length === 0 && pillar.needsHuman.length === 0 && pillar.missing.length > 0 && (
                <>{pillar.missing.length} élément{pillar.missing.length > 1 ? "s" : ""} manquant{pillar.missing.length > 1 ? "s" : ""}</>
              )}
            </p>
          )}
        </div>
      </div>
      <span
        className={
          ready
            ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-500"
            : stageInfo.tone === "warn"
              ? "rounded-full bg-yellow-500/15 px-2.5 py-0.5 text-xs font-medium text-yellow-500"
              : "rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-foreground-muted"
        }
      >
        {stageInfo.label}
      </span>
    </div>
  );
}

"use client";

/**
 * <RtisCascadeModal/> — déclenchement explicite de la cascade RTIS.
 *
 * Trois phases internes :
 *   1. CONFIRM  — explication du déroulé, bouton "Déclencher la cascade"
 *   2. RUNNING  — barre de progression par pilier (R/T/I/S) live via
 *                 polling readiness toutes les 3 s, compteur écoulé,
 *                 heartbeat "dernière mise à jour il y a Xs"
 *   3. DONE     — confirmation visible : "Cascade terminée — Oracle prêt à
 *                 compiler". Bouton "Fermer" qui re-bascule la page en état
 *                 vert.
 *   4. FAILED   — un ou plusieurs piliers RTIS sont restés vides. Liste les
 *                 raisons + bouton "Réessayer" + "Compiler quand même"
 *                 (avec warning sections RTIS-vides).
 *
 * Trigger : auto-ouvert par la page proposition quand ADVE atteint 100%
 * et RTIS pas encore prêt, ou clic manuel sur le bouton rouge "Lancer
 * Artemis" (fallback). Pas de jargon eng dans le copy (cf. NEFER §9.5).
 */

import { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Dialog, DialogFooter } from "@/components/primitives/dialog";
import { trpc } from "@/lib/trpc/client";

type Phase = "CONFIRM" | "RUNNING" | "DONE" | "FAILED";

const PILLAR_NAMES = {
  r: "Risk — Risques & résilience",
  t: "Track — Tracking marché & traction",
  i: "Innovation — Actions & roadmap",
  s: "Strategy — Synthèse stratégique",
} as const;

type RtisKey = keyof typeof PILLAR_NAMES;

const PILLAR_KEYS: readonly RtisKey[] = ["r", "t", "i", "s"];

export interface RtisCascadeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyId: string;
  /** Called once the cascade reports allReady = true. Used by the page to
   *  flip the "Lancer Artemis" button from red to green. */
  onCompleted?: () => void;
}

export function RtisCascadeModal({
  open,
  onOpenChange,
  strategyId,
  onCompleted,
}: RtisCascadeModalProps) {
  const [phase, setPhase] = useState<Phase>("CONFIRM");
  const [elapsed, setElapsed] = useState(0);

  // Poll readiness while RUNNING so the user sees R/T/I/S transitioning.
  const readiness = trpc.pillar.maturityReport.useQuery(
    { strategyId },
    {
      enabled: open,
      refetchOnWindowFocus: false,
      refetchInterval: phase === "RUNNING" ? 3000 : false,
    },
  );

  // Réutilise la procédure existante `pillar.cascadeRTIS` (kind RUN_RTIS_CASCADE,
  // governor MESTOR, p95 45s). `skipIfReady: true` short-circuit si RTIS déjà
  // au stage ENRICHED+ → 0 LLM call. Le retour est `{ results: ActualizeResult[],
  // finalScore?, skipped? }` du runner Mestor canonique.
  const cascade = trpc.pillar.cascadeRTIS.useMutation({
    onSuccess: (result) => {
      void readiness.refetch();
      const allUpdated = result.results.every((r) => r.updated || r.maturityStage === "ENRICHED" || r.maturityStage === "COMPLETE");
      if (allUpdated || result.skipped) {
        setPhase("DONE");
        onCompleted?.();
      } else {
        setPhase("FAILED");
      }
    },
    onError: () => {
      setPhase("FAILED");
    },
  });

  // Reset on close
  const resetCascade = cascade.reset;
  useEffect(() => {
    if (!open) {
      setPhase("CONFIRM");
      setElapsed(0);
      resetCascade();
    }
  }, [open, resetCascade]);

  // Live elapsed counter while running
  useEffect(() => {
    if (phase !== "RUNNING") return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Optimistic transition to DONE — the polled readiness query updates
  // every 3s while the mutation is still in-flight. As soon as all 4 RTIS
  // pillars show ENRICHED+, flip to DONE without waiting for the mutation
  // to fully resolve (the runner's final readiness re-check + JSON
  // serialization can add 5-15s of perceived "stuck" time).
  const allRtisReadyFromPoll = useMemo(
    () => {
      const pillars = readiness.data?.pillars as Record<string, { currentStage?: string }> | undefined;
      if (!pillars) return false;
      return PILLAR_KEYS.every((k) => {
        const stage = pillars[k]?.currentStage;
        return stage === "ENRICHED" || stage === "COMPLETE";
      });
    },
    [readiness.data],
  );
  useEffect(() => {
    if (phase !== "RUNNING") return;
    if (!allRtisReadyFromPoll) return;
    setPhase("DONE");
    onCompleted?.();
  }, [phase, allRtisReadyFromPoll, onCompleted]);

  const sinceRefresh = phase === "RUNNING" && readiness.dataUpdatedAt
    ? Math.max(0, Math.floor((Date.now() - readiness.dataUpdatedAt) / 1000))
    : null;

  const rtisStatus = useMemo(() => {
    const pillars = readiness.data?.pillars ?? {};
    return PILLAR_KEYS.map((k) => {
      const r = (pillars as Record<string, { currentStage?: string }>)[k];
      const stage = r?.currentStage ?? "EMPTY";
      const ready = stage === "ENRICHED" || stage === "COMPLETE";
      const inProgress = stage === "INTAKE";
      return { key: k, stage, ready, inProgress };
    });
  }, [readiness.data]);

  const startCascade = () => {
    setPhase("RUNNING");
    setElapsed(0);
    cascade.mutate({ strategyId, skipIfReady: true });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          Cascade RTIS — préparer Oracle à compiler
        </span>
      }
      description={
        phase === "CONFIRM"
          ? "Vos 4 fondations ADVE sont complètes. Pour qu'Artemis compile l'Oracle sans sections vides, il faut maintenant dériver les 4 piliers dynamiques (Risk, Track, Innovation, Strategy) à partir d'ADVE. Cette étape n'a lieu qu'une fois."
          : phase === "RUNNING"
            ? "Génération en cours — chaque pilier prend 20 à 40 secondes (LLM)."
            : phase === "DONE"
              ? "Oracle est maintenant prêt à compiler sans sections vides."
              : "Certains piliers n'ont pas pu être remplis. Tu peux ré-essayer ou compiler quand même (Oracle aura des sections RTIS partielles)."
      }
    >
      {/* CONFIRM phase */}
      {phase === "CONFIRM" && (
        <div className="space-y-4">
          <ul className="space-y-2 text-sm">
            {PILLAR_KEYS.map((k) => (
              <li
                key={k}
                className="flex items-start gap-3 rounded-lg border border-border bg-background/50 p-3"
              >
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                  {k.toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{PILLAR_NAMES[k]}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="rounded-lg border border-border bg-background/50 p-3 text-xs text-foreground-muted">
            <p>
              <strong className="text-foreground-secondary">Durée typique :</strong> 1 à 2 minutes.
              La cascade tourne en série pour respecter l'ordre de dérivation
              (R d'abord, puis T qui s'appuie sur R + signaux Seshat, puis I,
              puis S).
            </p>
          </div>
        </div>
      )}

      {/* RUNNING phase */}
      {phase === "RUNNING" && (
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <p className="text-sm text-foreground-secondary">
              Cascade en cours…{" "}
              <span className="font-mono text-foreground">{elapsed}s</span>
              <span className="text-foreground-muted"> / typiquement 60-120s</span>
            </p>
          </div>

          <ul className="space-y-2 text-sm">
            {rtisStatus.map((p) => (
              <li
                key={p.key}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background/50 px-3 py-2"
              >
                <span className="flex items-center gap-2">
                  {p.ready ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : p.inProgress ? (
                    <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-foreground-muted" />
                  )}
                  <span className="text-foreground-secondary">
                    {PILLAR_NAMES[p.key]}
                  </span>
                </span>
                <span
                  className={
                    p.ready
                      ? "text-xs font-medium text-emerald-500"
                      : p.inProgress
                        ? "text-xs font-medium text-yellow-500"
                        : "text-xs font-medium text-foreground-muted"
                  }
                >
                  {p.ready ? "Prêt" : p.inProgress ? "En cours" : "En attente"}
                </span>
              </li>
            ))}
          </ul>

          {sinceRefresh !== null && (
            <p className="text-[11px] text-foreground-muted">
              Dernière mise à jour : il y a {sinceRefresh}s
              {readiness.isFetching && " · rafraîchissement…"}
            </p>
          )}

          {elapsed > 90 && (
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-3 text-xs text-foreground-secondary">
              <strong className="text-yellow-500">Plus long que prévu.</strong>{" "}
              Le LLM travaille toujours. Tu peux fermer cette fenêtre — la cascade
              continue en arrière-plan, le bouton « Lancer Artemis » virera vert
              quand RTIS sera prêt.
            </div>
          )}
        </div>
      )}

      {/* DONE phase */}
      {phase === "DONE" && (
        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-emerald-500">
                Cascade RTIS terminée — vos 8 piliers sont prêts.
              </p>
              <p className="text-xs text-foreground-secondary">
                Oracle peut maintenant compiler ses 35 sections sans risque de
                sections RTIS vides. Le bouton « Lancer Artemis » est passé au
                vert sur la page proposition.
              </p>
            </div>
          </div>

          {cascade.data?.results && cascade.data.results.length > 0 && (
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <p className="mb-2 text-xs font-semibold text-foreground-secondary">
                Récapitulatif {cascade.data.skipped ? "(déjà prêt — short-circuit)" : ""}
              </p>
              <ul className="space-y-1 text-xs text-foreground-muted">
                {cascade.data.results.map((r) => (
                  <li key={r.pillarKey} className="flex items-center justify-between">
                    <span className="font-mono text-[11px]">
                      {PILLAR_NAMES[r.pillarKey.toLowerCase() as RtisKey] ?? r.pillarKey}
                    </span>
                    <span
                      className={
                        r.error
                          ? "text-error"
                          : r.updated
                            ? "text-emerald-400"
                            : "text-foreground-muted"
                      }
                    >
                      {r.error
                        ? `error: ${r.error.slice(0, 50)}`
                        : r.updated
                          ? `mis à jour · ${r.maturityStage ?? ""}`
                          : "déjà prêt"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* FAILED phase */}
      {phase === "FAILED" && (
        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 rounded-lg border border-error/40 bg-error/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-error" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-error">
                Cascade incomplète.
              </p>
              <p className="text-xs text-foreground-secondary">
                {(() => {
                  const emptyResults = cascade.data?.results?.filter(
                    (r) => r.error || (!r.updated && r.maturityStage !== "ENRICHED" && r.maturityStage !== "COMPLETE"),
                  );
                  if (emptyResults && emptyResults.length > 0) {
                    return `Pilier(s) en échec : ${emptyResults.map((r) => r.pillarKey).join(", ")}.`;
                  }
                  return cascade.error?.message ?? "Le serveur a renvoyé une erreur.";
                })()}
              </p>
            </div>
          </div>

          {cascade.data?.results && (
            <div className="rounded-lg border border-border bg-background/50 p-3">
              <ul className="space-y-1 text-xs">
                {cascade.data.results.map((r) => (
                  <li
                    key={r.pillarKey}
                    className="flex items-start justify-between gap-2"
                  >
                    <span className="font-mono text-[11px] text-foreground-muted">
                      {PILLAR_NAMES[r.pillarKey.toLowerCase() as RtisKey] ?? r.pillarKey}
                    </span>
                    <span
                      className={
                        r.error
                          ? "text-error"
                          : r.updated
                            ? "text-emerald-400"
                            : "text-foreground-muted"
                      }
                    >
                      {r.error
                        ? `error — ${r.error.slice(0, 60)}`
                        : r.updated
                          ? `mis à jour · ${r.maturityStage ?? ""}`
                          : "non-updated"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        {phase === "CONFIRM" && (
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
              onClick={startCascade}
              disabled={cascade.isPending}
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              Déclencher la cascade RTIS
              <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}

        {phase === "RUNNING" && (
          <>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-raised"
            >
              Fermer (la cascade continue)
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

        {phase === "DONE" && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent"
          >
            <CheckCircle2 className="h-4 w-4" />
            Compris — fermer
          </button>
        )}

        {phase === "FAILED" && (
          <>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground-secondary hover:bg-surface-raised"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase("RUNNING");
                setElapsed(0);
                // Réessai avec skipIfReady=false : on force la cascade même si
                // certains piliers étaient déjà ENRICHED. Le user veut un re-run.
                cascade.mutate({ strategyId, skipIfReady: false });
              }}
              disabled={cascade.isPending}
              className="flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </button>
          </>
        )}
      </DialogFooter>
    </Dialog>
  );
}

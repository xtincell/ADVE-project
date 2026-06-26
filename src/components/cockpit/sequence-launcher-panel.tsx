"use client";

/**
 * SequenceLauncherPanel — Cockpit brand-side launcher for Glory sequences
 * (Phase 24). Lists the sequences (8 ADVERTIS PILLAR + others) with a
 * deterministic cost estimate, and lets the founder ARM one — with the credit
 * cost shown and explicitly confirmed before any LLM-billed run, plus a
 * prerequisite readiness check (`glory.scanSequence`). Trigger goes through the
 * governed `glory.executeSequence` mutation (no bypass).
 */

import { useMemo, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Rocket, Zap, Coins, Loader2, X, AlertTriangle, CheckCircle2, FolderOpen, RotateCcw, Clock } from "lucide-react";

const LIFECYCLE_LABEL: Record<string, string> = { DRAFT: "Brouillon", STABLE: "Stable", DEPRECATED: "Déprécié" };

interface Seq {
  key: string;
  family: string;
  name: string;
  description: string;
  pillar: string | null;
  aiPowered: boolean;
  lifecycle: string;
  tier: number;
  stepCount: number;
  cost: { costClass: "DETERMINISTIC" | "LLM"; llmSteps: number; totalSteps: number; estimateUsd: number };
}

export function SequenceLauncherPanel() {
  const strategyId = useCurrentStrategyId();
  const listQuery = trpc.glory.launchableSequences.useQuery(undefined);
  const executionsQuery = trpc.sequenceVault.list.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId }
  );

  const [familyFilter, setFamilyFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<Seq | null>(null);

  const sequences = useMemo(() => (listQuery.data ?? []) as Seq[], [listQuery.data]);
  const families = useMemo(() => [...new Set(sequences.map((s) => s.family))].sort(), [sequences]);
  const filtered = useMemo(() => sequences.filter((s) => !familyFilter || s.family === familyFilter), [sequences, familyFilter]);

  const executions = useMemo(() => {
    const map = new Map<string, any>();
    if (executionsQuery.data) {
      for (const exec of executionsQuery.data) {
        map.set(exec.sequenceKey, exec);
      }
    }
    return map;
  }, [executionsQuery.data]);

  if (!strategyId || listQuery.isLoading || executionsQuery.isLoading) return <SkeletonPage />;

  return (
    <article className="mx-auto max-w-[var(--maxw-content,1200px)] px-[var(--pad-page,1.5rem)] py-8 md:py-12">
      <style>{`
        .flip-card {
          perspective: 1000px;
          min-height: 220px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
        }
        .flip-card-inner.has-transition {
          transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .flip-card-inner.is-flipped {
          transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          width: 100%;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .flip-card-front {
          position: relative;
          transform: rotateY(0deg);
        }
        .flip-card-back {
          position: absolute;
          inset: 0;
          transform: rotateY(180deg);
        }
      `}</style>

      <header className="mb-8 border-b border-border-subtle pb-6">
        <div className="mb-3 flex items-center gap-2 font-mono text-2xs uppercase tracking-widest text-foreground-muted">
          <Rocket className="h-3.5 w-3.5 text-accent" />
          <span>Séquences Glory · déclenchables depuis la marque</span>
        </div>
        <h1 className="font-display font-semibold tracking-tighter leading-[0.95] text-foreground" style={{ fontSize: "var(--text-display)" }}>
          Armer un livrable.
        </h1>
        <p className="mt-3 max-w-[64ch] text-foreground-secondary" style={{ fontSize: "var(--text-lg)" }}>
          Chaque séquence enchaîne des outils Glory pour produire un livrable. Les séquences <span className="text-accent">LLM</span> consomment des crédits — le coût estimé est affiché et <span className="font-serif italic">confirmé</span> avant tout lancement.
        </p>
      </header>

      <nav className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border-subtle pb-4">
        <button type="button" onClick={() => setFamilyFilter(null)} className={`font-mono text-2xs uppercase tracking-widest transition-colors ${!familyFilter ? "text-accent" : "text-foreground-muted hover:text-foreground"}`}>Toutes</button>
        {families.map((f) => (
          <button key={f} type="button" onClick={() => setFamilyFilter(f)} className={`font-mono text-2xs uppercase tracking-widest transition-colors ${familyFilter === f ? "text-accent" : "text-foreground-muted hover:text-foreground"}`}>{f}</button>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => {
          const exec = executions.get(s.key);
          const lastOutput = exec && exec.status === "COMPLETED" ? {
            id: exec.id,
            completedAt: exec.createdAt instanceof Date ? exec.createdAt.toISOString() : exec.createdAt,
            outputUrl: `/cockpit/brand/deliverables/${s.key}`,
          } : null;
          return (
            <SequenceCard
              key={s.key}
              seq={s}
              onLaunch={() => setSelected(s)}
              lastOutput={lastOutput}
            />
          );
        })}
      </div>

      {selected ? (
        <LaunchModal
          strategyId={strategyId}
          seq={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => executionsQuery.refetch()}
        />
      ) : null}
    </article>
  );
}

function SequenceCard({
  seq,
  onLaunch,
  lastOutput,
}: {
  seq: Seq;
  onLaunch: () => void;
  lastOutput?: { outputUrl?: string | null; completedAt?: string | null; id?: string } | null;
}) {
  const isCompleted = !!lastOutput?.completedAt;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flip-card">
      <div className={`flip-card-inner ${mounted ? "has-transition" : ""} ${isCompleted ? "is-flipped" : ""}`}>
        {/* Front Face: Launch card */}
        <div className="flip-card-front flex h-full flex-col rounded-lg border border-white/5 bg-surface-raised p-4">
          <div className="mb-1 flex items-center gap-2">
            {seq.pillar ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15 text-2xs font-bold text-accent">
                {seq.pillar}
              </span>
            ) : null}
            <span className="truncate text-sm font-semibold text-foreground">{seq.name}</span>
          </div>
          <p className="mb-4 flex-1 text-xs leading-relaxed text-foreground-secondary">{seq.description}</p>
          <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[9px] uppercase tracking-wide">
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-foreground-muted">{seq.family}</span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-foreground-muted">
              {LIFECYCLE_LABEL[seq.lifecycle] ?? seq.lifecycle}
            </span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-foreground-muted">{seq.stepCount} étapes</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            {seq.cost.costClass === "LLM" ? (
              <span className="inline-flex items-center gap-1 text-2xs text-accent">
                <Zap className="h-3 w-3" /> ~${seq.cost.estimateUsd.toFixed(2)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-2xs text-success">
                <Coins className="h-3 w-3" /> gratuit
              </span>
            )}

            <button
              type="button"
              onClick={onLaunch}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent/15 px-2.5 py-1.5 text-2xs font-medium text-accent transition-colors hover:bg-accent/25"
            >
              <Rocket className="h-3 w-3" /> Lancer
            </button>
          </div>
        </div>

        {/* Back Face: Completed state */}
        <div className="flip-card-back flex h-full flex-col justify-between rounded-lg border border-success/20 bg-success/[0.03] p-4">
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {seq.pillar ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/20 text-2xs font-bold text-success">
                    {seq.pillar}
                  </span>
                ) : null}
                <span className="truncate text-sm font-semibold text-foreground">{seq.name}</span>
              </div>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-bold text-success ring-1 ring-inset ring-success/30">
                <CheckCircle2 className="h-2.5 w-2.5" /> Terminé
              </span>
            </div>
            <p className="text-xs text-foreground-secondary leading-relaxed mb-4">
              Ce livrable a été généré avec succès. Vous pouvez maintenant l'ouvrir ou relancer la séquence si des données sources ont changé.
            </p>
          </div>

          <div>
            <div className="mb-4 flex flex-wrap items-center gap-1.5 text-[9px] uppercase tracking-wide">
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-foreground-muted">{seq.family}</span>
              {lastOutput?.completedAt && (
                <span className="flex items-center gap-0.5 rounded bg-success/10 px-1.5 py-0.5 text-[9px] text-success font-medium">
                  <Clock className="h-2.5 w-2.5" /> Généré le{" "}
                  {new Date(lastOutput.completedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              {seq.cost.costClass === "LLM" ? (
                <span className="inline-flex items-center gap-1 text-2xs text-accent">
                  <Zap className="h-3 w-3" /> ~${seq.cost.estimateUsd.toFixed(2)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-2xs text-success">
                  <Coins className="h-3 w-3" /> gratuit
                </span>
              )}

              <div className="flex items-center gap-1.5">
                {lastOutput?.outputUrl && (
                  <a
                    href={lastOutput.outputUrl}
                    className="inline-flex items-center gap-1 rounded-lg bg-success/20 px-3 py-1.5 text-2xs font-semibold text-success transition-colors hover:bg-success/30"
                  >
                    <FolderOpen className="h-3 w-3" /> Ouvrir
                  </a>
                )}
                <button
                  type="button"
                  onClick={onLaunch}
                  title="Relancer la séquence (la nouvelle version remplacera l'actuelle, l'ancienne sera historisée)"
                  className="inline-flex items-center gap-1 rounded-lg bg-foreground-muted/10 px-3 py-1.5 text-2xs font-semibold text-foreground-secondary transition-colors hover:bg-foreground-muted/20"
                >
                  <RotateCcw className="h-3 w-3" /> Relancer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LaunchModal({
  strategyId,
  seq,
  onClose,
  onSuccess,
}: {
  strategyId: string;
  seq: Seq;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const scan = trpc.glory.scanSequence.useQuery({ strategyId, sequenceKey: seq.key });
  const exec = trpc.glory.executeSequence.useMutation({
    onSuccess: () => {
      onSuccess();
    },
  });

  const blocked = (scan.data as { blocked?: boolean } | undefined)?.blocked ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-surface-raised p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{seq.name}</h2>
            <p className="mt-0.5 text-xs text-foreground-muted">{seq.family} · {seq.stepCount} étapes</p>
          </div>
          <button type="button" onClick={onClose} className="text-foreground-muted hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-foreground-secondary">{seq.description}</p>

        <div className={`mb-3 rounded-lg border p-3 ${seq.cost.costClass === "LLM" ? "border-accent/30 bg-accent/5" : "border-white/5 bg-white/[0.02]"}`}>
          {seq.cost.costClass === "LLM" ? (
            <p className="flex items-center gap-2 text-xs text-accent">
              <Zap className="h-3.5 w-3.5 shrink-0" /> {seq.cost.llmSteps} appel{seq.cost.llmSteps > 1 ? "s" : ""} LLM · coût estimé <strong>~${seq.cost.estimateUsd.toFixed(2)}</strong> (crédits)
            </p>
          ) : (
            <p className="flex items-center gap-2 text-xs text-success"><Coins className="h-3.5 w-3.5 shrink-0" /> Séquence déterministe — aucun crédit consommé.</p>
          )}
        </div>

        {scan.isLoading ? (
          <p className="mb-3 flex items-center gap-2 text-xs text-foreground-muted"><Loader2 className="h-3 w-3 animate-spin" /> Vérification des prérequis…</p>
        ) : blocked ? (
          <p className="mb-3 flex items-start gap-2 text-xs text-error"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Prérequis non remplis — complète les piliers / séquences en amont avant de lancer.</p>
        ) : (
          <p className="mb-3 flex items-center gap-2 text-xs text-success"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Prérequis OK.</p>
        )}

        {exec.isError ? <p className="mb-3 text-xs text-error">{exec.error.message}</p> : null}

        {exec.isSuccess ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <p className="text-sm font-medium text-foreground">Séquence lancée.</p>
            <button type="button" onClick={onClose} className="mt-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-foreground-secondary hover:bg-white/10">Fermer</button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} disabled={exec.isPending} className="rounded-lg px-3 py-1.5 text-xs text-foreground-muted hover:text-foreground disabled:opacity-50">Annuler</button>
            <button
              type="button"
              onClick={() => exec.mutate({ strategyId, sequenceKey: seq.key })}
              disabled={exec.isPending || blocked || scan.isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {exec.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              {seq.cost.costClass === "LLM" ? `Confirmer & lancer (~$${seq.cost.estimateUsd.toFixed(2)})` : "Confirmer & lancer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

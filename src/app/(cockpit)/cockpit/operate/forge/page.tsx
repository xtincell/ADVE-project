/**
 * /cockpit/operate/forge — Deliverable Forge (Phase 17b, ADR-0050 — anciennement ADR-0037).
 *
 * Surface output-first du Deliverable Forge. Le founder pointe le
 * `BrandAsset.kind` matériel cible et l'OS résout en arrière la cascade
 * Glory→Brief→Forge :
 *   1. resolveRequirements → DAG des briefs requis + scan vault
 *   2. compose (mode PREVIEW Phase 17 commit 4) → composition complète +
 *      coût estimé + verdict pre-conditions Loi 2
 *
 * Le mode DISPATCHED async (avec NSP streaming des étapes) viendra dans un
 * commit ultérieur — pour l'instant la page expose le PREVIEW.
 *
 * Design tokens : panda noir/bone + accent rouge fusée (ADR-0013). Aucune
 * classe Tailwind couleur brute hors primitives — uniquement les tokens
 * canoniques (text-foreground, bg-surface-raised, border-border, etc.).
 */

"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  Hammer,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Zap,
  DollarSign,
  ChevronRight,
} from "lucide-react";

const VAULT_STATUS_LABELS: Record<string, string> = {
  ACTIVE_REUSE: "Réutiliser",
  STALE_REFRESH: "Rafraîchir",
  MISSING_GENERATE: "Générer",
};

const VAULT_STATUS_VARIANTS: Record<string, string> = {
  ACTIVE_REUSE: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  STALE_REFRESH: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
  MISSING_GENERATE: "bg-accent/15 text-accent ring-accent/30",
};

export default function DeliverableForgePage() {
  const strategyId = useCurrentStrategyId();
  const [targetKind, setTargetKind] = useState<string>("");
  const [confirmedDispatch, setConfirmedDispatch] = useState(false);

  // Étape 0 — liste des kinds supportés
  const supported = trpc.deliverableOrchestrator.listSupportedKinds.useQuery();

  // Étape 1 — DAG + vault scan (skip tant qu'on n'a pas choisi un kind)
  const requirements = trpc.deliverableOrchestrator.resolveRequirements.useQuery(
    { targetKind, strategyId: strategyId ?? undefined },
    { enabled: Boolean(targetKind && strategyId) },
  );

  // Étape 2 — compose mutation (mode PREVIEW)
  const composeMutation = trpc.deliverableOrchestrator.compose.useMutation();

  const composition = composeMutation.data?.intentResult ?? null;

  const totalEstimatedCost = useMemo(() => {
    if (!requirements.data || !requirements.data.ok) return 0;
    const matches = requirements.data.vaultMatches ?? [];
    const toGenerate = matches.filter(
      (m) => m.status === "MISSING_GENERATE" || m.status === "STALE_REFRESH",
    ).length;
    return toGenerate * 0.1 + 0.5; // mêmes constantes que composer.ts
  }, [requirements.data]);

  const canDispatch =
    requirements.data?.ok === true &&
    !composeMutation.isPending &&
    !composition &&
    Boolean(strategyId);

  function handleLaunch() {
    if (!strategyId || !targetKind) return;
    setConfirmedDispatch(true);
    composeMutation.mutate({
      strategyId,
      targetKind,
      previewOnly: true, // Phase 17 commit 4 : toujours PREVIEW
    });
  }

  function handleReset() {
    setTargetKind("");
    setConfirmedDispatch(false);
    composeMutation.reset();
  }

  if (!strategyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={Hammer}
          title="Sélectionnez une marque"
          description="Cette surface ne peut produire un livrable que dans le contexte d'une stratégie active."
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Deliverable Forge"
        description="Pointez un livrable matériel cible — l'OS résout la cascade complète, scanne votre vault, et propose une production."
      />

      {/* ── Étape 0 — Sélecteur target kind ──────────────────────────── */}
      <section className="rounded-xl border border-border bg-background/80 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
            <span className="text-sm font-semibold">1</span>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Que voulez-vous produire ?</h3>
            <p className="mt-0.5 text-xs text-foreground-secondary">
              Sélectionnez le type de livrable matériel cible. L'OS remontera automatiquement les
              briefs upstream nécessaires.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {supported.data?.kinds.map((kind) => (
            <button
              key={kind}
              onClick={() => {
                setTargetKind(kind);
                composeMutation.reset();
                setConfirmedDispatch(false);
              }}
              className={`rounded-lg border p-3 text-left transition-colors ${
                targetKind === kind
                  ? "border-accent bg-accent/10"
                  : "border-border bg-background/40 hover:border-foreground-muted"
              }`}
            >
              <span className="text-xs font-medium text-foreground">{kind}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Étape 1 — DAG résolu + vault scan ────────────────────────── */}
      {targetKind && (
        <section className="rounded-xl border border-border bg-background/80 p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
              <span className="text-sm font-semibold">2</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Cascade requise
              </h3>
              <p className="mt-0.5 text-xs text-foreground-secondary">
                Briefs upstream à fournir (depuis le vault) ou à générer. L'estimation coût
                inclut les LLM tools manquants + le forge Ptah final.
              </p>
            </div>
          </div>

          {requirements.isPending && (
            <p className="text-xs text-foreground-muted">Résolution du DAG en cours…</p>
          )}

          {requirements.data && !requirements.data.ok && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
              <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                {requirements.data.code}
              </p>
              <p className="mt-1 text-xs text-foreground-secondary">{requirements.data.message}</p>
            </div>
          )}

          {requirements.data?.ok && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                <Search className="h-3 w-3" />
                <span>
                  Producteur target : <span className="text-accent">{requirements.data.targetGloryToolSlug}</span>
                </span>
              </div>

              {requirements.data.vaultMatches && requirements.data.vaultMatches.length > 0 ? (
                <ul className="space-y-1.5">
                  {requirements.data.vaultMatches.map((match) => (
                    <li
                      key={match.kind}
                      className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2"
                    >
                      <span className="text-xs font-medium text-foreground">{match.kind}</span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${VAULT_STATUS_VARIANTS[match.status] ?? ""}`}
                      >
                        {VAULT_STATUS_LABELS[match.status] ?? match.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-foreground-muted">
                  Aucun kind upstream — production directe (cas rare).
                </p>
              )}

              <div className="flex items-center gap-3 border-t border-border pt-3 text-xs">
                <DollarSign className="h-4 w-4 text-foreground-muted" />
                <span className="text-foreground-secondary">Coût estimé</span>
                <span className="font-semibold text-foreground">
                  ${totalEstimatedCost.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Étape 2 — Lancement ──────────────────────────────────────── */}
      {requirements.data?.ok && !composition && (
        <section className="rounded-xl border border-border bg-background/80 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
              <span className="text-sm font-semibold">3</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Lancer la production
              </h3>
              <p className="mt-0.5 text-xs text-foreground-secondary">
                Phase 17 mode PREVIEW : la composition est calculée et persistée hash-chained
                dans IntentEmission, sans encore déclencher de forge. Le dispatch async réel
                (avec streaming NSP des étapes) viendra dans un commit ultérieur.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLaunch}
              disabled={!canDispatch || confirmedDispatch}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-background hover:bg-accent/90 disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              {composeMutation.isPending ? "Composition…" : "Lancer la composition (PREVIEW)"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-foreground-secondary hover:border-foreground-muted"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </section>
      )}

      {/* ── Étape 3 — Résultat ───────────────────────────────────────── */}
      {composition && (
        <section className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-foreground">Composition complétée</h3>
              <p className="mt-0.5 text-xs text-foreground-secondary">
                Status : <span className="font-semibold">{composition.status}</span>
              </p>
              <p className="mt-2 text-xs text-foreground">{composition.summary}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-foreground-secondary hover:border-foreground-muted"
          >
            <ChevronRight className="h-3.5 w-3.5" />
            Composer un autre livrable
          </button>
        </section>
      )}
    </div>
  );
}

"use client";

/**
 * Panneau « Trajectoire APOGEE » (ADR-0167) — surface opérateur des transitions
 * de palier. Affiche le palier OFFICIEL (ratchet `apogeeTier`) vs le palier
 * IMPLIQUÉ par le score, la divergence honnête (Loi 1 : pas de rétrogradation
 * silencieuse), les boutons Promouvoir/Rétrograder gate-aware (raison chiffrée
 * quand refusé), et l'historique lu depuis IntentEmission.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { TIER_DEFINITIONS, type BrandTier } from "@/domain";
import { TrendingUp, TrendingDown, ArrowRight, History, Loader2, Info } from "lucide-react";

function TierChip({ tier }: { tier: BrandTier }) {
  const def = TIER_DEFINITIONS[tier];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset"
      style={{ color: def.colorVar, borderColor: def.colorVar }}
    >
      {def.label}
    </span>
  );
}

export function ApogeeTrajectoryPanel({ strategyId }: { strategyId: string }) {
  const utils = trpc.useUtils();
  const preview = trpc.strategy.tierTransitionPreview.useQuery({ strategyId });
  const trajectory = trpc.strategy.tierTrajectory.useQuery({ strategyId, limit: 20 });

  const [pending, setPending] = useState<"PROMOTE" | "DEMOTE" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = trpc.strategy.transitionTier.useMutation({
    onSuccess: () => {
      setPending(null);
      setReason("");
      setError(null);
      preview.refetch();
      trajectory.refetch();
      // Le palier officiel a bougé → rafraîchir les surfaces dépendantes.
      utils.cockpitDashboard.getBrandIdentity.invalidate({ strategyId }).catch(() => {});
    },
    onError: (e) => setError(e.message),
  });

  if (preview.isLoading) {
    return (
      <section className="rounded-xl border border-border-subtle bg-surface-elevated p-6">
        <div className="flex items-center gap-2 text-sm text-foreground-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement de la trajectoire…
        </div>
      </section>
    );
  }
  if (!preview.data) return null;

  const { currentTier, impliedTier, composite, apogeeTierSet, promote, demote } = preview.data;
  const diverges = currentTier !== impliedTier;

  const submit = () => {
    if (reason.trim().length < 10) {
      setError("Une raison d'au moins 10 caractères est requise.");
      return;
    }
    mutation.mutate({ strategyId, direction: pending!, reason: reason.trim() });
  };

  return (
    <section className="space-y-5 rounded-xl border border-border-subtle bg-surface-elevated p-6">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Trajectoire APOGEE</h2>
      </div>

      {/* Palier officiel vs impliqué */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="space-y-1">
          <div className="text-2xs uppercase tracking-widest text-foreground-muted">Palier officiel</div>
          <div className="flex items-center gap-2">
            <TierChip tier={currentTier} />
            {!apogeeTierSet && <span className="text-2xs text-foreground-muted">(dérivé du score — jamais promu)</span>}
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-2xs uppercase tracking-widest text-foreground-muted">Impliqué par le score</div>
          <div className="flex items-center gap-2">
            <TierChip tier={impliedTier} />
            <span className="text-2xs text-foreground-muted">{Math.round(composite)}/200</span>
          </div>
        </div>
      </div>

      {diverges && (
        <div className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-sunken p-3 text-xs text-foreground-secondary">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <span>
            Le score implique « {TIER_DEFINITIONS[impliedTier].label} » tandis que le palier officiel est « {TIER_DEFINITIONS[currentTier].label} ».
            {" "}Loi 1 : le palier officiel ne bouge que par une décision explicite — pas de rétrogradation silencieuse.
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {promote ? (
          <button
            onClick={() => { setPending("PROMOTE"); setReason(""); setError(null); }}
            disabled={!promote.allowed || mutation.isPending}
            title={promote.allowed ? undefined : promote.reason}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-sunken disabled:cursor-not-allowed disabled:opacity-50"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Promouvoir <ArrowRight className="h-3 w-3" /> <TierChip tier={promote.targetTier} />
          </button>
        ) : (
          <span className="text-2xs text-foreground-muted">Palier apex — aucune promotion possible.</span>
        )}
        {demote && (
          <button
            onClick={() => { setPending("DEMOTE"); setReason(""); setError(null); }}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-foreground-muted transition-colors hover:text-error disabled:opacity-50"
          >
            <TrendingDown className="h-3.5 w-3.5" />
            Rétrograder <ArrowRight className="h-3 w-3" /> <TierChip tier={demote.targetTier} />
          </button>
        )}
      </div>

      {/* Raison de refus de promotion (honnête, chiffrée) */}
      {promote && !promote.allowed && !pending && (
        <p className="text-2xs text-foreground-muted">Promotion indisponible : {promote.reason}</p>
      )}

      {/* Formulaire de raison (transition = acte explicite) */}
      {pending && (
        <div className="space-y-2 rounded-lg border border-border-subtle bg-surface-sunken p-3">
          <label className="text-2xs uppercase tracking-widest text-foreground-muted">
            Raison de la {pending === "PROMOTE" ? "promotion" : "rétrogradation"} (≥ 10 caractères, persistée)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="w-full resize-none rounded-md border border-border-subtle bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
            placeholder="Ex. Masse de superfans atteinte et cult-index confirmé sur le trimestre."
          />
          {error && <p className="text-2xs text-error">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              onClick={submit}
              disabled={mutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Confirmer
            </button>
            <button
              onClick={() => { setPending(null); setError(null); }}
              className="rounded-md px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:text-foreground"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Historique de trajectoire */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-2xs uppercase tracking-widest text-foreground-muted">
          <History className="h-3 w-3" /> Historique
        </div>
        {trajectory.data && trajectory.data.length > 0 ? (
          <ul className="space-y-1.5">
            {trajectory.data.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 text-xs text-foreground-secondary">
                <span className="font-mono text-2xs text-foreground-muted">
                  {new Date(t.emittedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                {t.from && t.to && (
                  <span className="inline-flex items-center gap-1">
                    <TierChip tier={t.from as BrandTier} /> <ArrowRight className="h-3 w-3 text-foreground-muted" /> <TierChip tier={t.to as BrandTier} />
                  </span>
                )}
                {t.outcome !== "OK" && <span className="text-2xs text-error">({t.outcome})</span>}
                {t.reason && <span className="text-foreground-muted">— {t.reason}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-2xs text-foreground-muted">Aucune transition enregistrée. Le palier officiel suit le score jusqu'à la première décision.</p>
        )}
      </div>
    </section>
  );
}

"use client";

/**
 * CanonCampaignsPanel — les campagnes canon de la stratégie (ADR-0119).
 *
 * Affiche les 3 campagnes canon (30-60-90 / annuelle / always-on) générées depuis
 * le Pilier S, avec leurs actions rattachées, et un bouton de (re)génération
 * déterministe (`strategy.generateCanonicalCampaigns`). Répond au besoin : les
 * campagnes canon visibles dans l'onglet Campagnes avec leurs actions gouvernées.
 */

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { Button } from "@/components/primitives/button";
import { Loader2, Sparkles, Infinity as InfinityIcon, CalendarRange, Plus, ArrowRight } from "lucide-react";

const CANON_LABEL: Record<string, string> = {
  GTM_90: "Go-to-market 30-60-90",
  ANNUAL: "Campagne annuelle",
  ALWAYS_ON: "Always-on (permanent)",
  PUNCTUAL: "Ponctuelle (insight / Jehuty)",
};

// Niveau d'exécution (ADR-0089) dérivé de l'Advertis — Conservateur / Cible / Ambitieux.
const ROUTE_LABEL: Record<string, string> = {
  CONSERVATIVE: "Conservateur",
  TARGET: "Cible",
  AMBITIOUS: "Ambitieux",
};

function fmtBudget(n: number | null | undefined, currency: string | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const cur = currency === "XAF" || currency === "XOF" ? "FCFA" : currency ?? "";
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(n))} ${cur}`.trim();
}
function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function CanonCampaignsPanel() {
  const strategyId = useCurrentStrategyId();
  const [start, setStart] = useState(() => new Date().toISOString().slice(0, 10));
  const utils = trpc.useUtils();
  const { data: canon, isLoading } = trpc.campaign.canonByStrategy.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );
  const invalidate = () => utils.campaign.canonByStrategy.invalidate({ strategyId: strategyId ?? "" });
  const generate = trpc.strategy.generateCanonicalCampaigns.useMutation({ onSuccess: invalidate });
  const punctual = trpc.strategy.createPunctualCampaign.useMutation({ onSuccess: invalidate });

  if (!strategyId) return null;
  const campaigns = canon ?? [];

  return (
    <section className="rounded-xl border border-white/5 bg-surface-raised p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-accent" /> Campagnes canon (Pilier S)
          </h2>
          <p className="mt-0.5 text-xs text-foreground-muted">
            30-60-90 · annuelle · always-on — cadre stratégique ancré sur la date de lancement. Ouvre un frame pour choisir sa <span className="text-foreground-secondary">direction créative</span> ; les actions de production s'y rattachent ensuite.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[9px] font-bold uppercase tracking-widest text-foreground-muted">
            Date de lancement
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              title="La 30-60-90 et l'annuelle s'ancrent sur cette date ; l'always-on est permanent."
              className="rounded-lg border border-white/10 bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-accent/40 focus:outline-none"
            />
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={punctual.isPending}
            onClick={() => {
              const title = window.prompt("Titre de la campagne ponctuelle (insight externe / Jehuty) :");
              if (title && title.trim().length >= 3) punctual.mutate({ strategyId, title: title.trim(), insightSource: "EXTERNAL_INSIGHT" });
            }}
          >
            {punctual.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
            Ponctuelle
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={generate.isPending}
            onClick={() => generate.mutate({ strategyId, startDate: start ? new Date(`${start}T12:00:00.000Z`) : undefined })}
          >
            {generate.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
            {campaigns.length > 0 ? "Régénérer" : "Générer les campagnes canon"}
          </Button>
        </div>
      </div>

      {generate.isError || punctual.isError ? (
        <p className="mt-2 text-xs font-medium text-error">Échec : {(generate.error ?? punctual.error)?.message}</p>
      ) : generate.data?.status === "DEFERRED" ? (
        <p className="mt-2 text-xs font-medium text-warning">
          Génération en attente : {generate.data.reason}
        </p>
      ) : generate.data?.status === "OK" ? (
        <p className="mt-2 text-xs font-medium text-success">
          {generate.data.campaigns.length} frame(s) canon amorcé(s) · cadre stratégique prêt. Les actions de production arrivent après validation de la direction créative.
        </p>
      ) : null}

      {isLoading ? (
        <p className="mt-4 text-xs text-foreground-muted">Chargement…</p>
      ) : campaigns.length === 0 ? (
        <p className="mt-4 text-xs text-foreground-muted">
          Aucun frame canon. Lance l'amorçage : le Pilier S projette le cadre (30-60-90 · annuelle · always-on). Les actions de production se rattachent ensuite à la validation de la direction créative.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/cockpit/operate/campaigns/${c.id}`}
              className="group flex min-w-0 flex-col rounded-lg border border-white/5 bg-background/40 p-3 transition-colors hover:border-accent/30 hover:bg-background/60"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs font-semibold text-foreground">{CANON_LABEL[c.canonType ?? ""] ?? c.canonType}</span>
                {c.isAlwaysOn ? (
                  <span title="Permanent" className="shrink-0 text-foreground-muted"><InfinityIcon className="h-3.5 w-3.5" /></span>
                ) : (
                  <span className="shrink-0 text-foreground-muted"><CalendarRange className="h-3.5 w-3.5" /></span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                {c.routeKey ? <span title="Niveau d'exécution (dérivé de l'Advertis)" className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{ROUTE_LABEL[c.routeKey] ?? c.routeKey}</span> : null}
                {c.aarrrPrimary ? <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent">{c.aarrrPrimary}</span> : null}
                {c.aarrrSecondary ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">+{c.aarrrSecondary}</span> : null}
              </div>
              <p className="mt-2 text-[11px] text-foreground-secondary">
                Budget conseillé : <span className="font-semibold text-foreground">{fmtBudget(c.recommendedBudget, c.budgetCurrency)}</span>
              </p>
              <p className="text-[10px] text-foreground-muted">
                {fmtDate(c.startDate)}{c.isAlwaysOn ? " → permanent" : c.endDate ? ` → ${fmtDate(c.endDate)}` : ""}
              </p>
              <div className="mt-2 border-t border-white/5 pt-2">
                {c.brandActions.length > 0 ? (
                  <>
                    <p className="text-[9px] font-bold uppercase tracking-wide text-foreground-muted">{c.brandActions.length} action(s) de production</p>
                    <ul className="mt-1 space-y-0.5">
                      {c.brandActions.slice(0, 6).map((a) => (
                        <li key={a.id} className="truncate text-[11px] text-foreground-secondary">• {a.title}</li>
                      ))}
                      {c.brandActions.length > 6 ? (
                        <li className="text-[10px] text-foreground-muted">+{c.brandActions.length - 6} autre(s)…</li>
                      ) : null}
                    </ul>
                  </>
                ) : (
                  <p className="text-[10px] font-medium text-foreground-muted">En attente de direction créative — les actions de production se rattacheront après validation.</p>
                )}
              </div>
              <span className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-accent opacity-80 transition-opacity group-hover:opacity-100">
                Ouvrir le frame <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

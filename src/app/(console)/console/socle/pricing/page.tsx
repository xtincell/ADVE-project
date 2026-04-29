"use client";

/**
 * /console/socle/pricing — Operations admin: tier catalog + overrides + providers.
 *
 * APOGEE: Mission Control deck / Operations sub-system / Ground Tier.
 *
 * - Tier definitions are read-only (defined in code for type safety).
 * - SPU values OR local-currency amounts can be OVERRIDDEN per market via
 *   PricingOverride table — admin edits visible immediately on intake page.
 * - Payment providers can be enabled/disabled (secrets stay in env vars).
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { CheckCircle2, XCircle, Globe, Layers, CreditCard, Plus, Trash2, Save, X } from "lucide-react";

const COMMON_MARKETS = ["FR", "CM", "CI", "SN", "US", "MA", "NG"];
const TIER_KEYS = [
  "INTAKE_FREE", "INTAKE_PDF", "ORACLE_FULL", "COCKPIT_MONTHLY",
  "RETAINER_BASE", "RETAINER_PRO", "RETAINER_ENTERPRISE",
] as const;

export default function PricingAdminPage() {
  const utils = trpc.useUtils();
  const { data: tiers, isLoading: tiersLoading } = trpc.monetization.adminListTiers.useQuery();
  const { data: providersStatus, isLoading: provLoading } = trpc.monetization.adminListProviders.useQuery();
  const { data: providerCfg } = trpc.monetization.adminGetProviderConfig.useQuery();
  const { data: matrix, isLoading: matrixLoading } = trpc.monetization.adminTierMatrix.useQuery({
    countries: COMMON_MARKETS,
  });
  const { data: overrides } = trpc.monetization.adminListOverrides.useQuery();

  const updateProviderCfg = trpc.monetization.adminUpdateProviderConfig.useMutation({
    onSuccess: () => utils.monetization.adminGetProviderConfig.invalidate(),
  });
  const upsertOverride = trpc.monetization.adminUpsertOverride.useMutation({
    onSuccess: () => {
      utils.monetization.adminListOverrides.invalidate();
      utils.monetization.adminTierMatrix.invalidate();
    },
  });
  const deleteOverride = trpc.monetization.adminDeleteOverride.useMutation({
    onSuccess: () => {
      utils.monetization.adminListOverrides.invalidate();
      utils.monetization.adminTierMatrix.invalidate();
    },
  });

  const [draft, setDraft] = useState<{
    tierKey: string;
    countryCode: string | null;
    amountSpu: string;
    amountLocal: string;
    currencyCode: string;
    reason: string;
  } | null>(null);

  if (tiersLoading || provLoading || matrixLoading) return <SkeletonPage />;

  const providerEnabled = (id: string) => {
    const cfg = providerCfg?.find((p) => p.providerId === id);
    return cfg ? cfg.enabled : true; // default enabled
  };

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="Pricing"
        description="Tarifs par marché, providers de paiement, overrides admin."
      />

      {/* Providers — status + toggle */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
        <header className="mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Providers de paiement
          </h2>
        </header>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {providersStatus?.map((p) => {
            const enabled = providerEnabled(p.id);
            return (
              <div
                key={p.id}
                className={
                  "flex items-center justify-between rounded-lg border p-3 " +
                  (p.configured && enabled
                    ? "border-emerald-900/60 bg-emerald-950/20"
                    : !p.configured
                      ? "border-zinc-800 bg-zinc-900/40 opacity-60"
                      : "border-amber-900/60 bg-amber-950/20")
                }
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-zinc-200">{p.id}</span>
                  {p.configured ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-zinc-600" />
                  )}
                </div>
                {p.id !== "MOCK" && p.configured && (
                  <label className="inline-flex items-center gap-1.5 text-[10px] text-zinc-400">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(e) =>
                        updateProviderCfg.mutate({
                          providerId: p.id as "CINETPAY" | "STRIPE" | "PAYPAL",
                          enabled: e.target.checked,
                        })
                      }
                      disabled={updateProviderCfg.isPending}
                      className="h-3.5 w-3.5 accent-amber-500"
                    />
                    {enabled ? "actif" : "désactivé"}
                  </label>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Status : configuré (env vars présents) + activé (toggle DB).
          Pour configurer : env vars (CINETPAY_API_KEY+CINETPAY_SITE_ID, STRIPE_SECRET_KEY,
          PAYPAL_CLIENT_ID+PAYPAL_CLIENT_SECRET, PAYPAL_ENV).
        </p>
      </section>

      {/* Tier catalog */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
        <header className="mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Catalogue de tiers (base SPU)
          </h2>
        </header>
        <table className="min-w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
              <th className="px-3 py-2">Tier</th>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2 text-right">Prix base (SPU)</th>
              <th className="px-3 py-2">Facturation</th>
              <th className="px-3 py-2 text-right">Mission step</th>
            </tr>
          </thead>
          <tbody>
            {tiers?.map((t) => (
              <tr key={t.key} className="border-b border-zinc-900 last:border-0">
                <td className="px-3 py-2 font-mono text-zinc-300">{t.key}</td>
                <td className="px-3 py-2 text-zinc-200">{t.label}</td>
                <td className="px-3 py-2 text-right font-mono text-zinc-300">{t.amountSpu === 0 ? "—" : t.amountSpu}</td>
                <td className="px-3 py-2 text-zinc-400">{t.billing === "MONTHLY" ? "Mensuel" : "Unique"}</td>
                <td className="px-3 py-2 text-right text-zinc-400">{t.missionStep}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Overrides */}
      <section className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-5">
        <header className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-300">
              Overrides actifs
            </h2>
            <span className="rounded-full bg-amber-900/30 px-2 py-0.5 text-[10px] text-amber-300">
              {overrides?.filter((o) => o.active).length ?? 0}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setDraft({ tierKey: "INTAKE_PDF", countryCode: null, amountSpu: "", amountLocal: "", currencyCode: "", reason: "" })
            }
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-700/60 bg-amber-700/30 px-3 py-1 text-xs font-medium text-amber-100 hover:bg-amber-700/50"
          >
            <Plus className="h-3.5 w-3.5" /> Nouvel override
          </button>
        </header>

        {draft && (
          <div className="mb-4 rounded-lg border border-amber-700/40 bg-zinc-950 p-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
              <select
                value={draft.tierKey}
                onChange={(e) => setDraft({ ...draft, tierKey: e.target.value })}
                className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
              >
                {TIER_KEYS.filter((k) => k !== "INTAKE_FREE").map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <input
                placeholder="Pays (ex: CM, vide=global)"
                value={draft.countryCode ?? ""}
                onChange={(e) => setDraft({ ...draft, countryCode: e.target.value.toUpperCase() || null })}
                className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                maxLength={2}
              />
              <input
                placeholder="SPU (ex: 79)"
                value={draft.amountSpu}
                onChange={(e) => setDraft({ ...draft, amountSpu: e.target.value })}
                className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                type="number"
              />
              <input
                placeholder="Local (override direct)"
                value={draft.amountLocal}
                onChange={(e) => setDraft({ ...draft, amountLocal: e.target.value })}
                className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                type="number"
                step="0.01"
              />
              <input
                placeholder="Devise (XAF, EUR)"
                value={draft.currencyCode}
                onChange={(e) => setDraft({ ...draft, currencyCode: e.target.value.toUpperCase() })}
                className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
                maxLength={3}
              />
              <input
                placeholder="Raison"
                value={draft.reason}
                onChange={(e) => setDraft({ ...draft, reason: e.target.value })}
                className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
              />
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300"
              >
                <X className="h-3 w-3" /> Annuler
              </button>
              <button
                type="button"
                disabled={upsertOverride.isPending}
                onClick={() => {
                  upsertOverride.mutate(
                    {
                      tierKey: draft.tierKey as (typeof TIER_KEYS)[number],
                      countryCode: draft.countryCode,
                      amountSpu: draft.amountSpu ? parseInt(draft.amountSpu, 10) : null,
                      amountLocal: draft.amountLocal ? parseFloat(draft.amountLocal) : null,
                      currencyCode: draft.currencyCode || null,
                      active: true,
                      reason: draft.reason || null,
                    },
                    { onSuccess: () => setDraft(null) },
                  );
                }}
                className="inline-flex items-center gap-1 rounded bg-amber-600 px-3 py-1 text-xs font-medium text-black hover:bg-amber-500 disabled:opacity-50"
              >
                <Save className="h-3 w-3" /> Sauvegarder
              </button>
            </div>
            <p className="mt-2 text-[10px] text-zinc-500">
              Astuce : remplir SPU OU (Local + Devise). SPU passe par market factor + FX.
              Local saute tout, fixe le prix exact dans la devise donnée.
            </p>
          </div>
        )}

        {overrides && overrides.length > 0 ? (
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Marché</th>
                <th className="px-3 py-2 text-right">SPU</th>
                <th className="px-3 py-2 text-right">Local</th>
                <th className="px-3 py-2">Devise</th>
                <th className="px-3 py-2">Raison</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id} className="border-b border-zinc-900 last:border-0">
                  <td className="px-3 py-2 font-mono text-zinc-200">{o.tierKey}</td>
                  <td className="px-3 py-2 text-zinc-300">{o.countryCode ?? "GLOBAL"}</td>
                  <td className="px-3 py-2 text-right font-mono">{o.amountSpu ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono">{o.amountLocal?.toString() ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-400">{o.currencyCode ?? "—"}</td>
                  <td className="px-3 py-2 text-[10px] text-zinc-500">{o.reason ?? ""}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => deleteOverride.mutate({ id: o.id })}
                      disabled={deleteOverride.isPending}
                      className="inline-flex items-center gap-1 rounded border border-red-900/60 bg-red-950/30 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-900/40"
                    >
                      <Trash2 className="h-3 w-3" /> Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-xs text-zinc-500">Aucun override actif. Tous les marchés utilisent le calcul SPU × facteur × FX.</p>
        )}
      </section>

      {/* Tier matrix — live computed */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
        <header className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Matrice live (avec overrides appliqués)
          </h2>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-[10px] uppercase tracking-wider text-zinc-500">
                <th className="px-3 py-2">Marché</th>
                {tiers?.filter((t) => t.amountSpu > 0).map((t) => (
                  <th key={t.key} className="px-3 py-2 text-right">{t.label}</th>
                ))}
                <th className="px-3 py-2 text-right">Facteur</th>
              </tr>
            </thead>
            <tbody>
              {matrix && Object.entries(matrix).map(([countryCode, gridForCountry]) => {
                const factor = gridForCountry.find((g) => g.price.amount > 0)?.price.internal.marketFactor;
                return (
                  <tr key={countryCode} className="border-b border-zinc-900 last:border-0">
                    <td className="px-3 py-2 font-mono text-zinc-300">{countryCode}</td>
                    {tiers?.filter((t) => t.amountSpu > 0).map((t) => {
                      const cell = gridForCountry.find((g) => g.definition.key === t.key);
                      return (
                        <td key={t.key} className="px-3 py-2 text-right font-mono text-zinc-200">
                          {cell?.price.display ?? "—"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right font-mono text-amber-400">
                      {factor ? factor.toFixed(2) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Les overrides ci-dessus s'appliquent immédiatement à cette matrice et à
          l'intake page. Pas de redéploiement requis.
        </p>
      </section>
    </div>
  );
}

"use client";

/**
 * /console/socle/pricing — Operations admin: tier catalog + market matrix + providers.
 *
 * APOGEE: Mission Control deck / Operations sub-system / Ground Tier.
 *
 * Reads-only for now: shows what `monetization.adminListTiers`,
 * `adminTierMatrix` and `adminListProviders` return. Tier amount overrides
 * (per-market) are a P3 feature once the override Prisma model lands —
 * this page is the surface that will host them.
 */

import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { CheckCircle2, XCircle, Globe, Layers, CreditCard } from "lucide-react";

const COMMON_MARKETS = ["FR", "CM", "CI", "SN", "US", "MA", "NG"];

export default function PricingAdminPage() {
  const { data: tiers, isLoading: tiersLoading } = trpc.monetization.adminListTiers.useQuery();
  const { data: providers, isLoading: provLoading } = trpc.monetization.adminListProviders.useQuery();
  const { data: matrix, isLoading: matrixLoading } = trpc.monetization.adminTierMatrix.useQuery({
    countries: COMMON_MARKETS,
  });

  if (tiersLoading || provLoading || matrixLoading) return <SkeletonPage />;

  return (
    <div className="space-y-8 p-6">
      <PageHeader
        title="Pricing"
        description="Tarifs par marché, providers de paiement, matrice de prix temps réel."
      />

      {/* Providers */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
        <header className="mb-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Providers de paiement
          </h2>
        </header>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {providers?.map((p) => (
            <div
              key={p.id}
              className={
                "flex items-center justify-between rounded-lg border p-3 " +
                (p.configured
                  ? "border-emerald-900/60 bg-emerald-950/20"
                  : "border-zinc-800 bg-zinc-900/40")
              }
            >
              <span className="text-sm font-mono text-zinc-200">{p.id}</span>
              {p.configured ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-zinc-600" />
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          Les providers non configurés ne sont pas utilisés. Pour activer : env vars
          (CINETPAY_API_KEY+CINETPAY_SITE_ID, STRIPE_SECRET_KEY, PAYPAL_CLIENT_ID+PAYPAL_CLIENT_SECRET).
        </p>
      </section>

      {/* Tier catalog */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
        <header className="mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Catalogue de tiers
          </h2>
        </header>
        <div className="overflow-x-auto">
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
                  <td className="px-3 py-2 text-zinc-400">
                    {t.billing === "MONTHLY" ? "Mensuel" : "Unique"}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-400">{t.missionStep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-zinc-500">
          SPU = standard pricing units, en devise du marché de référence (configurable
          via MONETIZATION_STANDARD_COUNTRY env var). Conversion + arrondi appliqués
          côté `monetization` service.
        </p>
      </section>

      {/* Tier matrix */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-5">
        <header className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
            Matrice de prix par marché
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
          Facteur = (PPI marché / PPI standard) ^ 0.6, plafonné [0.30, 1.50].
          Arrondi millier pour devises sans décimales (XAF/XOF/NGN), arrondi 10 + psychological -1
          pour devises avec décimales (EUR/USD/MAD).
        </p>
      </section>
    </div>
  );
}

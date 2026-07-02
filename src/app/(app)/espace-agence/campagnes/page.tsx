import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { readSession } from "@/lib/session";
import { listFleetCampaigns, totalEstimatedByCurrency } from "@/server/agency";
import { costSummary } from "@/server/campaigns";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CampaignStatusBadge,
  DATE_FORMAT,
  formatAmount,
} from "@/components/campaigns/status";
import { AgencyNav } from "../nav";
import { NoAgencyState } from "../no-agency";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campagnes — Espace agence" };

/**
 * /espace-agence/campagnes — port de l'esprit de `(agency)/agency/campaigns`
 * legacy (campagnes du portefeuille : statut, budget) sur les tables v7 :
 * le « budget » est le total RÉEL des coûts estimés des actions non annulées
 * (référentiel marché), sommé PAR DEVISE — deux marchés ne s'additionnent
 * jamais entre eux, et une action sans coût résolu reste « à estimer ».
 */
export default async function AgencyCampaignsPage() {
  const session = await readSession();
  if (!session) redirect("/connexion?next=/espace-agence/campagnes");

  const data = await listFleetCampaigns(session);
  if (!data) return <NoAgencyState title="Campagnes" />;

  const { agency, campaigns } = data;
  const active = campaigns.filter((c) => c.status === "ACTIVE").length;
  const fleetTotals = totalEstimatedByCurrency(campaigns.flatMap((c) => c.actions));
  const currencies = Object.entries(fleetTotals.byCurrency).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  const tiles = [
    { label: "Campagnes", value: String(campaigns.length), hint: "toutes marques de la flotte" },
    { label: "En production", value: String(active), hint: "gate « lancer la production » franchie" },
    {
      label: "Budget estimé",
      value:
        currencies.length > 0
          ? currencies.map(([cur, total]) => formatAmount(total, cur)).join(" · ")
          : "—",
      hint: "actions non annulées, par devise de marché",
    },
    {
      label: "À estimer",
      value: String(fleetTotals.unestimated),
      hint: "actions sans coût résolu au référentiel",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Espace agence — {agency.name}</p>
        <h1 className="font-display text-3xl font-semibold">Campagnes</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-sand">
          Le pipeline de production de toute la flotte — chaque campagne se pilote depuis
          l&apos;espace de sa marque ; ici, l&apos;agence surveille statuts, marchés et budgets
          réels.
        </p>
      </header>

      <AgencyNav />

      {/* ── Compteurs ──────────────────────────────────────────────────── */}
      <section className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4" aria-label="Compteurs campagnes">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-line bg-ink-2 p-6">
            <p className="text-sm font-medium text-sand">{tile.label}</p>
            <p className="font-display mt-2 text-2xl font-semibold text-bone">{tile.value}</p>
            <p className="mt-1 text-xs text-smoke-2">{tile.hint}</p>
          </div>
        ))}
      </section>

      {campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone />}
          title="Aucune campagne dans la flotte"
          description="Dès qu'une marque de la flotte crée une campagne dans son espace, elle apparaît ici avec son statut, son marché et son budget estimé réel."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line bg-ink-2">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-4 py-3 font-semibold text-sand">Campagne</th>
                <th className="px-4 py-3 font-semibold text-sand">Client</th>
                <th className="px-4 py-3 font-semibold text-sand">Marché</th>
                <th className="px-4 py-3 font-semibold text-sand">Actions</th>
                <th className="px-4 py-3 font-semibold text-sand">Budget estimé</th>
                <th className="px-4 py-3 font-semibold text-sand">Créée le</th>
                <th className="px-4 py-3 font-semibold text-sand">Statut</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const costs = costSummary(campaign.actions);
                const actionCount = campaign.actions.filter((a) => a.status !== "CANCELLED").length;
                return (
                  <tr key={campaign.id} className="border-b border-line-soft last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-bone">{campaign.name}</p>
                      <p className="line-clamp-1 max-w-xs text-xs text-smoke-2">
                        {campaign.objective}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/espace-agence/clients/${campaign.workspaceId}`}
                        className="text-sand transition-colors hover:text-coral"
                      >
                        {campaign.workspaceName}
                      </Link>
                      <p className="text-xs text-smoke-2">{campaign.brandName}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sand">
                      {campaign.countryName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sand">{actionCount}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className="font-mono text-xs text-sand">
                        {costs.total > 0 ? formatAmount(costs.total, costs.currency) : "—"}
                      </span>
                      {costs.unestimated > 0 ? (
                        <span className="block text-xs text-coral">
                          {costs.unestimated} à estimer
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-sand">
                      {DATE_FORMAT.format(campaign.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <CampaignStatusBadge status={campaign.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

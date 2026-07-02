import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, SearchX } from "lucide-react";
import { readSession } from "@/lib/session";
import { getFleetClientDetail } from "@/server/agency";
import { COMPOSITE_MAX_SCORE } from "@/domain/scoring";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LevelBadge } from "@/components/pillars/level-badge";
import {
  CampaignStatusBadge,
  DATE_FORMAT,
  formatAmount,
  MissionStatusBadge,
} from "@/components/campaigns/status";
import { AgencyNav } from "../../nav";
import { NoAgencyState } from "../../no-agency";
import { SubscriptionBadge } from "../../subscription-badge";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fiche client — Espace agence" };

/**
 * /espace-agence/clients/[id] — port de l'esprit de
 * `(agency)/agency/clients/[clientId]` legacy (fiche client : marques,
 * activité) étendu à ce que les tables v7 tranche 2 savent dire : campagnes
 * (budget réel des actions), missions en cours, derniers paiements. Tenancy :
 * un id hors flotte est introuvable, même s'il existe en base.
 */

const NUMBER_FORMAT = new Intl.NumberFormat("fr-FR");

/** Convention finance v7 : les francs CFA (XOF/XAF) se disent « FCFA ». */
function formatMoney(amount: number, currency: string): string {
  const unit = currency === "XOF" || currency === "XAF" ? "FCFA" : currency;
  return `${NUMBER_FORMAT.format(amount)} ${unit}`;
}

function paymentStatusBadge(status: string) {
  if (status === "confirmed") return <Badge variant="gold">Confirmé</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

/** Encart de section vide — le trou s'affiche, il ne se masque pas. */
function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line bg-ink-2/50 px-5 py-6 text-sm text-sand">
      {children}
    </p>
  );
}

type PageProps = { params: Promise<{ id: string }> };

export default async function AgencyClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await readSession();
  if (!session) redirect("/connexion?next=/espace-agence/clients");

  const lookup = await getFleetClientDetail(session, id);
  if (lookup.kind === "no-agency") return <NoAgencyState title="Fiche client" />;

  if (lookup.kind === "not-found") {
    return (
      <div className="space-y-8">
        <header className="space-y-1">
          <p className="eyebrow text-coral">Espace agence — {lookup.agency.name}</p>
          <h1 className="font-display text-3xl font-semibold">Fiche client</h1>
        </header>
        <AgencyNav />
        <EmptyState
          icon={<SearchX />}
          title="Client introuvable dans votre flotte"
          description="Ce workspace n'existe pas ou n'appartient pas à la flotte de votre agence — la fiche d'un client ne s'ouvre que si un membre de l'équipe a une membership chez lui."
        >
          <Link
            href="/espace-agence/clients"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Tous les clients
          </Link>
        </EmptyState>
      </div>
    );
  }

  const { agency, workspace, brands, subscription, lastActivityAt, campaigns, missionsInProgress, recentPayments } =
    lookup.detail;

  const tiles = [
    { label: "Marques", value: String(brands.length), hint: "dans ce workspace" },
    {
      label: "Campagnes",
      value: String(campaigns.length),
      hint: `dont ${campaigns.filter((c) => c.status === "ACTIVE").length} en production`,
    },
    {
      label: "Missions en cours",
      value: String(missionsInProgress.length),
      hint: "ouvertes, assignées ou livrées",
    },
    {
      label: "Membres",
      value: String(workspace.memberCount),
      hint: `workspace créé le ${DATE_FORMAT.format(workspace.createdAt)}`,
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="eyebrow text-coral">Espace agence — {agency.name}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-semibold">{workspace.name}</h1>
          <SubscriptionBadge subscription={subscription} />
        </div>
        <p className="text-sm text-sand">
          <span className="font-mono text-xs text-smoke-2">{workspace.slug}</span>
          {" · "}dernière activité auditée :{" "}
          {lastActivityAt ? DATE_FORMAT.format(lastActivityAt) : "aucune mutation tracée"}
        </p>
      </header>

      <AgencyNav />

      <Link
        href="/espace-agence/clients"
        className="inline-flex items-center gap-1.5 text-sm text-sand transition-colors hover:text-bone"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Tous les clients
      </Link>

      {/* ── Compteurs ──────────────────────────────────────────────────── */}
      <section className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4" aria-label="Compteurs du client">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg border border-line bg-ink-2 p-6">
            <p className="text-sm font-medium text-sand">{tile.label}</p>
            <p className="font-display mt-2 text-4xl font-semibold text-bone">{tile.value}</p>
            <p className="mt-1 text-xs text-smoke-2">{tile.hint}</p>
          </div>
        ))}
      </section>

      {/* ── Marques ────────────────────────────────────────────────────── */}
      <section className="space-y-3" aria-label="Marques du client">
        <h2 className="font-display text-xl font-semibold">Marques</h2>
        {brands.length === 0 ? (
          <EmptyLine>Aucune marque dans ce workspace pour l&apos;instant.</EmptyLine>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-ink-2">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-3 font-semibold text-sand">Marque</th>
                  <th className="px-4 py-3 font-semibold text-sand">Palier</th>
                  <th className="px-4 py-3 font-semibold text-sand">Score</th>
                  <th className="px-4 py-3 font-semibold text-sand">Calculé le</th>
                </tr>
              </thead>
              <tbody>
                {brands.map((brand) => (
                  <tr key={brand.id} className="border-b border-line-soft last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-bone">{brand.name}</p>
                      {brand.sector ? <p className="text-xs text-smoke-2">{brand.sector}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <LevelBadge level={brand.level} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-sand">
                      {brand.score !== null
                        ? `${Math.round(brand.score)} / ${COMPOSITE_MAX_SCORE}`
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-sand">
                      {brand.scoreComputedAt ? DATE_FORMAT.format(brand.scoreComputedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Campagnes ──────────────────────────────────────────────────── */}
      <section className="space-y-3" aria-label="Campagnes du client">
        <h2 className="font-display text-xl font-semibold">
          Campagnes
          <span className="ml-2 text-sm font-normal text-smoke-2">({campaigns.length})</span>
        </h2>
        {campaigns.length === 0 ? (
          <EmptyLine>
            Aucune campagne pour ce client — le pipeline se pilote depuis son espace marque.
          </EmptyLine>
        ) : (
          <div className="space-y-2.5">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ink-2 px-5 py-4"
              >
                <span className="min-w-0">
                  <span className="block truncate font-display text-base font-semibold text-bone">
                    {campaign.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-smoke-2">
                    {campaign.brandName} · {campaign.countryName} · {campaign.actionCount} action
                    {campaign.actionCount > 1 ? "s" : ""}
                    {" · "}créée le {DATE_FORMAT.format(campaign.createdAt)}
                  </span>
                </span>
                <span className="flex items-center gap-3 text-right">
                  <span>
                    <span className="block font-mono text-xs text-sand">
                      {campaign.costs.total > 0
                        ? formatAmount(campaign.costs.total, campaign.costs.currency)
                        : "—"}
                    </span>
                    {campaign.costs.unestimated > 0 ? (
                      <span className="block text-xs text-coral">
                        {campaign.costs.unestimated} à estimer
                      </span>
                    ) : null}
                  </span>
                  <CampaignStatusBadge status={campaign.status} />
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Missions en cours ──────────────────────────────────────────── */}
      <section className="space-y-3" aria-label="Missions en cours du client">
        <h2 className="font-display text-xl font-semibold">
          Missions en cours
          <span className="ml-2 text-sm font-normal text-smoke-2">
            ({missionsInProgress.length})
          </span>
        </h2>
        {missionsInProgress.length === 0 ? (
          <EmptyLine>
            Aucune mission ouverte, assignée ou livrée pour ce client — les missions validées ne
            sont plus « en cours ».
          </EmptyLine>
        ) : (
          <div className="space-y-2.5">
            {missionsInProgress.map((mission) => (
              <div
                key={mission.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-ink-2 px-5 py-4"
              >
                <span className="min-w-0">
                  <span className="block truncate font-display text-base font-semibold text-bone">
                    {mission.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-smoke-2">
                    {mission.campaignName} · {mission.actionName}
                    {mission.assignee ? ` · ${mission.assignee}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-smoke-2">
                    {DATE_FORMAT.format(mission.createdAt)}
                  </span>
                  <MissionStatusBadge status={mission.status} />
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Paiements récents ──────────────────────────────────────────── */}
      <section className="space-y-3" aria-label="Paiements du client">
        <h2 className="font-display text-xl font-semibold">Derniers paiements</h2>
        {recentPayments.length === 0 ? (
          <EmptyLine>Aucun paiement enregistré pour ce workspace.</EmptyLine>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-line bg-ink-2">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="px-4 py-3 font-semibold text-sand">Date</th>
                  <th className="px-4 py-3 font-semibold text-sand">Montant</th>
                  <th className="px-4 py-3 font-semibold text-sand">Méthode</th>
                  <th className="px-4 py-3 font-semibold text-sand">Référence</th>
                  <th className="px-4 py-3 font-semibold text-sand">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-line-soft last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-sand">
                      {DATE_FORMAT.format(payment.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-bone">
                      {formatMoney(payment.amount, payment.currency)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-sand">{payment.method}</td>
                    <td className="px-4 py-3 font-mono text-xs text-sand">
                      {payment.reference ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {paymentStatusBadge(payment.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

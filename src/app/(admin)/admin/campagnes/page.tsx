import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { parsePage, PAGE_SIZE } from "@/server/admin";
import {
  CAMPAIGN_STATUS_LABELS,
  MISSION_STATUSES,
  MISSION_STATUS_LABELS,
  type CampaignStatus,
  type MissionStatus,
} from "@/domain/campaign";
import { formatAmount } from "@/components/campaigns/status";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/components/ui/cn";
import { Pager } from "../../pager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Campagnes" };

const DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Variants lisibles sur fond CLAIR (les badges campaigns/status sont calés sombre). */
const CAMPAIGN_VARIANTS: Record<CampaignStatus, BadgeProps["variant"]> = {
  DRAFT: "neutral",
  ACTIVE: "gold",
  ARCHIVED: "outline",
};

const STATUS_FILTERS = ["toutes", "cadrage", "production", "archivees"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  toutes: "Toutes",
  cadrage: "Cadrage",
  production: "En production",
  archivees: "Archivées",
};

const STATUS_FILTER_TO_ENUM: Record<Exclude<StatusFilter, "toutes">, CampaignStatus> = {
  cadrage: "DRAFT",
  production: "ACTIVE",
  archivees: "ARCHIVED",
};

function parseStatusFilter(raw: string | undefined): StatusFilter {
  return (STATUS_FILTERS as readonly string[]).includes(raw ?? "")
    ? (raw as StatusFilter)
    : "toutes";
}

function campaignWhere(filter: StatusFilter): Prisma.CampaignWhereInput {
  return filter === "toutes" ? {} : { status: STATUS_FILTER_TO_ENUM[filter] };
}

/**
 * Budget estimé d'une campagne, PAR devise (deux devises ne s'additionnent
 * jamais — doctrine WP-018 reconduite) + compte des actions « à estimer »
 * (trou de référentiel affiché, pas masqué). Actions annulées exclues.
 */
function campaignBudget(
  actions: ReadonlyArray<{
    status: string;
    estimatedCost: number | null;
    costCurrency: string | null;
  }>,
): { totals: Array<{ currency: string; amount: number }>; unresolved: number } {
  const byCurrency = new Map<string, number>();
  let unresolved = 0;
  for (const action of actions) {
    if (action.status === "CANCELLED") continue;
    if (action.estimatedCost === null || action.costCurrency === null) {
      unresolved += 1;
      continue;
    }
    byCurrency.set(
      action.costCurrency,
      (byCurrency.get(action.costCurrency) ?? 0) + action.estimatedCost,
    );
  }
  return {
    totals: [...byCurrency.entries()]
      .map(([currency, amount]) => ({ currency, amount }))
      .sort((a, b) => a.currency.localeCompare(b.currency)),
    unresolved,
  };
}

type PageProps = { searchParams: Promise<{ statut?: string; page?: string }> };

/**
 * /admin/campagnes — vue cross-workspace RÉELLE du pipeline de production
 * (WP-020, esprit des panneaux campagnes de la console legacy) : chaque
 * campagne avec sa marque, son marché, ses actions, ses missions par étape
 * du circuit et son budget estimé par devise. Lecture seule — le pilotage
 * (gates, briefs, missions) reste dans le cockpit de chaque marque.
 */
export default async function AdminCampagnesPage({ searchParams }: PageProps) {
  const { statut, page: rawPage } = await searchParams;
  const filter = parseStatusFilter(statut);
  const page = parsePage(rawPage);
  const db = getDb();

  const [total, filteredTotal, statusCounts, missionCounts, unresolvedActions, campaigns] =
    await Promise.all([
      db.campaign.count(),
      db.campaign.count({ where: campaignWhere(filter) }),
      db.campaign.groupBy({ by: ["status"], _count: { _all: true } }),
      db.mission.groupBy({ by: ["status"], _count: { _all: true } }),
      db.campaignAction.count({
        where: { estimatedCost: null, status: { not: "CANCELLED" } },
      }),
      db.campaign.findMany({
        where: campaignWhere(filter),
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: {
          brand: { select: { name: true, workspace: { select: { name: true } } } },
          country: { select: { name: true, code: true } },
          actions: {
            select: {
              status: true,
              estimatedCost: true,
              costCurrency: true,
              briefs: { select: { missions: { select: { status: true } } } },
            },
          },
        },
      }),
    ]);

  const campaignCount = (status: CampaignStatus) =>
    statusCounts.find((row) => row.status === status)?._count._all ?? 0;
  const missionCount = (status: MissionStatus) =>
    missionCounts.find((row) => row.status === status)?._count._all ?? 0;
  const missionTotal = MISSION_STATUSES.reduce((sum, s) => sum + missionCount(s), 0);

  const filterHref = (f: StatusFilter) =>
    f === "toutes" ? "/admin/campagnes" : `/admin/campagnes?statut=${f}`;

  const tiles = [
    { label: "Campagnes", value: total, hint: "toutes marques, tous statuts" },
    {
      label: "En production",
      value: campaignCount("ACTIVE"),
      hint: `${campaignCount("DRAFT")} en cadrage · ${campaignCount("ARCHIVED")} archivée${campaignCount("ARCHIVED") > 1 ? "s" : ""}`,
    },
    {
      label: "Missions",
      value: missionTotal,
      hint: MISSION_STATUSES.map(
        (s) => `${missionCount(s)} ${MISSION_STATUS_LABELS[s].toLowerCase()}${missionCount(s) > 1 ? "s" : ""}`,
      ).join(" · "),
    },
    {
      label: "Actions à estimer",
      value: unresolvedActions,
      hint: "coût non dérivable du référentiel — jamais inventé",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="eyebrow text-coral">Console</p>
        <h1 className="font-display text-3xl font-semibold">Campagnes</h1>
        <p className="text-sm text-smoke">
          Le pipeline de production cross-flotte : campagne → actions → briefs → missions.
          Budgets = coûts d&apos;actions réellement estimés, par devise — un trou de
          référentiel s&apos;affiche « à estimer », il ne se masque pas.
        </p>
      </header>

      <div className="grid gap-bento sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-lg bg-white p-6 shadow-card">
            <p className="text-sm font-medium text-smoke">{tile.label}</p>
            <p className="font-display mt-2 text-4xl font-semibold text-ink">{tile.value}</p>
            <p className="mt-1 text-xs text-smoke-2">{tile.hint}</p>
          </div>
        ))}
      </div>

      <div role="tablist" aria-label="Filtrer par statut" className="flex flex-wrap gap-1.5">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f}
            role="tab"
            aria-selected={filter === f}
            href={filterHref(f)}
            className={cn(
              "rounded-sm border px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === f
                ? "border-ink bg-ink text-bone"
                : "border-ink/15 text-graphite hover:border-ink/40",
            )}
          >
            {STATUS_FILTER_LABELS[f]}
          </Link>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          tone="light"
          icon={<Megaphone />}
          title="Aucune campagne"
          description="Les campagnes naissent dans le cockpit des marques (cadre → production → briefs → missions). La vue cross-flotte se remplit avec l'activité réelle."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg bg-white shadow-card">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="px-4 py-3 font-semibold text-graphite">Campagne</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Marque</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Marché</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Statut</th>
                  <th className="px-4 py-3 text-right font-semibold text-graphite">Actions</th>
                  <th className="px-4 py-3 text-right font-semibold text-graphite">Missions</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Budget estimé</th>
                  <th className="px-4 py-3 font-semibold text-graphite">Créée le</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => {
                  const missions = campaign.actions.flatMap((action) =>
                    action.briefs.flatMap((brief) => brief.missions),
                  );
                  const stepCounts = MISSION_STATUSES.map(
                    (s) => missions.filter((m) => m.status === s).length,
                  );
                  const activeActions = campaign.actions.filter((a) => a.status !== "CANCELLED");
                  const briefed = activeActions.filter((a) => a.status === "BRIEFED").length;
                  const budget = campaignBudget(campaign.actions);
                  return (
                    <tr key={campaign.id} className="border-b border-ink/5 last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{campaign.name}</p>
                        <p className="max-w-64 truncate text-xs text-smoke-2">
                          {campaign.objective}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-graphite">
                        {campaign.brand.name}
                        <span className="block text-xs text-smoke-2">
                          {campaign.brand.workspace.name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-graphite">
                        {campaign.country.name}{" "}
                        <span className="font-mono text-xs text-smoke-2">
                          ({campaign.country.code})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={CAMPAIGN_VARIANTS[campaign.status]}>
                          {CAMPAIGN_STATUS_LABELS[campaign.status]}
                        </Badge>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-graphite">
                        {activeActions.length}
                        {briefed > 0 ? (
                          <span className="text-smoke-2"> ({briefed} briefée{briefed > 1 ? "s" : ""})</span>
                        ) : null}
                      </td>
                      <td
                        className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-graphite"
                        title={MISSION_STATUSES.map(
                          (s, i) => `${stepCounts[i]} ${MISSION_STATUS_LABELS[s].toLowerCase()}`,
                        ).join(" · ")}
                      >
                        {missions.length > 0 ? stepCounts.join(" · ") : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-graphite">
                        {budget.totals.length === 0 && budget.unresolved === 0 ? "—" : null}
                        {budget.totals.map((t) => (
                          <span key={t.currency} className="block">
                            {formatAmount(t.amount, t.currency)}
                          </span>
                        ))}
                        {budget.unresolved > 0 ? (
                          <span className="block text-coral">
                            {budget.unresolved} à estimer
                          </span>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-smoke">
                        {DATE_FORMAT.format(campaign.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-smoke-2">
            Colonne Missions : {MISSION_STATUSES.map((s) => MISSION_STATUS_LABELS[s].toLowerCase()).join(" · ")}{" "}
            (étapes du circuit, sans saut ni retour).
          </p>
          <Pager pathname="/admin/campagnes" params={{ statut }} page={page} total={filteredTotal} />
        </>
      )}
    </div>
  );
}

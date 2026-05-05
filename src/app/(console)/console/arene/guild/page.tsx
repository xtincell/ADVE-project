import { PILLAR_STORAGE_KEYS } from "@/domain";

"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { SearchFilter } from "@/components/shared/search-filter";
import { DataTable } from "@/components/shared/data-table";
import { TierBadge } from "@/components/shared/tier-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { Modal } from "@/components/shared/modal";
import { Users, Award, Star, TrendingUp, Radar, Briefcase, CheckCircle, History } from "lucide-react";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

const ADVE_KEYS = PILLAR_STORAGE_KEYS;
const ADVE_LABELS: Record<string, string> = {
  a: "Ambition",
  d: "Direction",
  v: "Valeur",
  e: "Engagement",
  r: "Resonance",
  t: "Transformation",
  i: "Impact",
  s: "Synergie",
};

function AdveRadar({ vector }: { vector: Record<string, number> | null }) {
  if (!vector) {
    return <p className="text-xs text-foreground-muted">Aucun vecteur ADVERTIS disponible</p>;
  }

  const maxVal = 25;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">Vecteur ADVERTIS</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {ADVE_KEYS.map((k) => {
          const val = vector[k] ?? 0;
          const pct = Math.min((val / maxVal) * 100, 100);
          return (
            <div key={k} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground-secondary">{ADVE_LABELS[k]}</span>
                <span className="text-[11px] font-bold text-white">{val.toFixed(0)}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-background">
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GuildPage() {
  const { data: stats, isLoading: loadingStats } = trpc.guilde.getStats.useQuery();
  const [tierFilter, setTierFilter] = useState<string>("");
  const { data: talents, isLoading: loadingTalents } = trpc.guilde.list.useQuery({
    tier: (tierFilter as GuildTier) || undefined,
    limit: 100,
  });
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: profileDetail, isLoading: loadingProfile } = trpc.guilde.getProfile.useQuery(
    { id: selectedId ?? "" },
    { enabled: !!selectedId },
  );

  const tierEvaluation = trpc.guildTier.checkPromotion.useQuery(
    { talentProfileId: selectedId ?? "" },
    { enabled: false },
  );

  const { data: portfolio, isLoading: loadingPortfolio } = trpc.guilde.getPortfolio.useQuery(
    { talentProfileId: selectedId ?? "" },
    { enabled: !!selectedId },
  );

  const isLoading = loadingStats || loadingTalents;

  const allTalents = talents ?? [];
  const filtered = allTalents.filter((t) => {
    if (search && !(t.displayName ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    if (filterValues.tier && t.tier !== filterValues.tier) return false;
    return true;
  });

  const promotionCandidates = new Set(
    allTalents
      .filter((t) => (t.tier === "APPRENTI" && t.avgScore >= 8) || (t.tier === "COMPAGNON" && t.avgScore >= 8.5))
      .map((t) => t.id),
  );

  const tableData = filtered.map((t) => ({
    id: t.id,
    name: t.displayName ?? "Sans nom",
    tier: t.tier as GuildTier,
    skills: (t.skills as string[] | null) ?? [],
    firstPassRate: t.firstPassRate ?? 0,
    totalMissions: t.totalMissions ?? 0,
    avgScore: t.avgScore ?? 0,
    status: (t as Record<string, unknown>).status as string ?? "ACTIVE",
    specialties: (t.driverSpecialties as string[] | null) ?? [],
    isPromotionCandidate: promotionCandidates.has(t.id),
  }));

  if (isLoading) return <SkeletonPage />;

  const tierCounts = (stats?.byTier ?? []).reduce(
    (acc, t) => ({ ...acc, [t.tier]: t._count }),
    {} as Record<string, number>,
  );

  const maitresAssocies = (tierCounts.MAITRE ?? 0) + (tierCounts.ASSOCIE ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="La Guilde"
        description="Repertoire des creatifs par tier - gestion des talents"
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Arene" },
          { label: "Guilde" },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total membres" value={stats?.total ?? 0} icon={Users} />
        <StatCard title="Apprentis" value={tierCounts.APPRENTI ?? 0} icon={Users} />
        <StatCard title="Compagnons" value={tierCounts.COMPAGNON ?? 0} icon={Star} />
        <StatCard
          title="Maitres + Associes"
          value={maitresAssocies}
          icon={Award}
          trendValue={`${tierCounts.MAITRE ?? 0} M / ${tierCounts.ASSOCIE ?? 0} A`}
        />
      </div>

      {/* Promotion Alert Banner */}
      {promotionCandidates.size > 0 && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-4">
          <p className="text-sm font-medium text-amber-400">
            {promotionCandidates.size} candidat(s) a la promotion detecte(s)
          </p>
          <p className="mt-1 text-xs text-foreground-secondary">
            Base sur le score moyen et le nombre de missions.
          </p>
        </div>
      )}

      {/* Search & Filter */}
      <SearchFilter
        placeholder="Rechercher un creatif..."
        value={search}
        onChange={setSearch}
        filters={[
          {
            key: "tier",
            label: "Tier",
            options: [
              { value: "APPRENTI", label: "Apprenti" },
              { value: "COMPAGNON", label: "Compagnon" },
              { value: "MAITRE", label: "Maitre" },
              { value: "ASSOCIE", label: "Associe" },
            ],
          },
        ]}
        filterValues={filterValues}
        onFilterChange={(key, value) => {
          setFilterValues((p) => ({ ...p, [key]: value }));
          if (key === "tier") setTierFilter(value);
        }}
      />

      {/* Data Table */}
      {tableData.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun creatif"
          description="La Guilde est vide. Invitez des creatifs a rejoindre l'ecosysteme."
        />
      ) : (
        <DataTable
          data={tableData}
          columns={[
            {
              key: "name",
              header: "Creatif",
              render: (item) => (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{item.name}</span>
                  {item.isPromotionCandidate && (
                    <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      PROMO
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: "tier",
              header: "Tier",
              sortable: true,
              render: (item) => <TierBadge tier={item.tier} size="sm" />,
            },
            {
              key: "skills",
              header: "Skills",
              sortable: false,
              render: (item) => (
                <div className="flex flex-wrap gap-1">
                  {item.skills.slice(0, 3).map((s) => (
                    <span
                      key={s}
                      className="rounded bg-background px-1.5 py-0.5 text-[10px] text-foreground-secondary"
                    >
                      {s}
                    </span>
                  ))}
                  {item.skills.length > 3 && (
                    <span className="text-[10px] text-foreground-muted">+{item.skills.length - 3}</span>
                  )}
                </div>
              ),
            },
            {
              key: "firstPassRate",
              header: "1st Pass %",
              sortable: true,
              render: (item) => (
                <span
                  className={`font-medium ${
                    item.firstPassRate >= 0.8
                      ? "text-emerald-400"
                      : item.firstPassRate >= 0.6
                        ? "text-amber-400"
                        : "text-error"
                  }`}
                >
                  {(item.firstPassRate * 100).toFixed(0)}%
                </span>
              ),
            },
            {
              key: "totalMissions",
              header: "Missions",
              sortable: true,
              render: (item) => <span className="text-foreground-secondary">{item.totalMissions}</span>,
            },
            {
              key: "avgScore",
              header: "Score QC",
              sortable: true,
              render: (item) => (
                <span className="font-bold text-white">{item.avgScore.toFixed(1)}/10</span>
              ),
            },
            {
              key: "status",
              header: "Statut",
              sortable: false,
              render: (item) => (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    item.status === "ACTIVE"
                      ? "bg-emerald-400/10 text-emerald-400"
                      : item.status === "INACTIVE"
                        ? "bg-zinc-400/10 text-foreground-secondary"
                        : "bg-amber-400/10 text-amber-400"
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {item.status}
                </span>
              ),
            },
          ]}
          pageSize={15}
          onRowClick={(item) => setSelectedId(item.id)}
        />
      )}

      {/* Profile Detail Modal */}
      <Modal
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title={profileDetail?.displayName ?? "Creatif"}
        size="lg"
      >
        {loadingProfile ? (
          <div className="space-y-4">
            <div className="h-8 animate-pulse rounded bg-background" />
            <div className="h-24 animate-pulse rounded bg-background" />
            <div className="h-32 animate-pulse rounded bg-background" />
          </div>
        ) : profileDetail ? (
          <div className="space-y-5">
            {/* Header: Tier + Score */}
            <div className="flex items-center justify-between">
              <TierBadge tier={profileDetail.tier as GuildTier} size="lg" />
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {(profileDetail.avgScore ?? 0).toFixed(1)}/10
                </p>
                <p className="text-xs text-foreground-secondary">Score moyen QC</p>
              </div>
            </div>

            {/* Bio */}
            {profileDetail.bio && (
              <p className="text-sm text-foreground-secondary">{profileDetail.bio}</p>
            )}

            {/* Skills */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                Competences
              </p>
              <div className="flex flex-wrap gap-1.5">
                {((profileDetail.skills as string[] | null) ?? []).length === 0 ? (
                  <span className="text-xs text-foreground-muted">Aucune competence renseignee</span>
                ) : (
                  ((profileDetail.skills as string[] | null) ?? []).map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-background px-2 py-1 text-xs text-foreground-secondary"
                    >
                      {s}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Performance Metrics Grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-lg bg-background/50 p-3 text-center">
                <Briefcase className="mx-auto mb-1 h-4 w-4 text-foreground-muted" />
                <p className="text-lg font-bold text-white">{profileDetail.totalMissions ?? 0}</p>
                <p className="text-[10px] text-foreground-muted">Missions</p>
              </div>
              <div className="rounded-lg bg-background/50 p-3 text-center">
                <CheckCircle className="mx-auto mb-1 h-4 w-4 text-foreground-muted" />
                <p className="text-lg font-bold text-white">
                  {((profileDetail.firstPassRate ?? 0) * 100).toFixed(0)}%
                </p>
                <p className="text-[10px] text-foreground-muted">1st Pass</p>
              </div>
              <div className="rounded-lg bg-background/50 p-3 text-center">
                <Star className="mx-auto mb-1 h-4 w-4 text-foreground-muted" />
                <p className="text-lg font-bold text-white">
                  {(profileDetail.avgScore ?? 0).toFixed(1)}
                </p>
                <p className="text-[10px] text-foreground-muted">Score QC</p>
              </div>
              <div className="rounded-lg bg-background/50 p-3 text-center">
                <Radar className="mx-auto mb-1 h-4 w-4 text-foreground-muted" />
                <p className="text-lg font-bold text-white">
                  {(profileDetail.portfolioItems ?? []).length}
                </p>
                <p className="text-[10px] text-foreground-muted">Portfolio</p>
              </div>
            </div>

            {/* ADVERTIS Vector Radar */}
            <div className="rounded-lg border border-border bg-background/80 p-4">
              <AdveRadar
                vector={profileDetail.advertis_vector as Record<string, number> | null}
              />
            </div>

            {/* Membership */}
            {profileDetail.guildOrganization && (
              <div className="rounded-lg border border-border bg-background/80 p-3">
                <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted mb-1">
                  Organisation
                </p>
                <p className="text-sm font-medium text-white">
                  {profileDetail.guildOrganization.name}
                </p>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-background/80 p-3">
              <div>
                <p className="text-xs text-foreground-muted">Statut membre</p>
                <p className="text-sm font-medium text-white">
                  {(profileDetail as Record<string, unknown>).status as string ?? "ACTIVE"}
                </p>
              </div>
              {profileDetail.memberships && (profileDetail.memberships as unknown[]).length > 0 && (
                <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  {(profileDetail.memberships as unknown[]).length} adhesion(s) active(s)
                </span>
              )}
            </div>

            {/* Evaluate Tier Action */}
            {promotionCandidates.has(profileDetail.id) && (
              <button
                onClick={() => tierEvaluation.refetch()}
                disabled={tierEvaluation.isFetching}
                className="w-full rounded-lg bg-amber-500 py-2.5 text-sm font-medium text-foreground-muted hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {tierEvaluation.isFetching ? "Evaluation en cours..." : "Evaluer pour promotion"}
              </button>
            )}

            {/* Evaluation Result */}
            {tierEvaluation.data && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">
                <p className="text-sm font-medium text-amber-400">Resultat de l'evaluation</p>
                <pre className="mt-2 text-xs text-foreground-secondary whitespace-pre-wrap">
                  {JSON.stringify(tierEvaluation.data, null, 2)}
                </pre>
              </div>
            )}

            {/* Portfolio / Mission History */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-foreground-muted">
                <History className="mr-1 inline h-3 w-3" />
                Portfolio ({(portfolio ?? []).length} elements)
              </p>
              {loadingPortfolio ? (
                <div className="h-16 animate-pulse rounded bg-background" />
              ) : (portfolio ?? []).length === 0 ? (
                <p className="text-xs text-foreground-muted">Aucun element de portfolio.</p>
              ) : (
                <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                  {(portfolio ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/30 p-2.5"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        {item.description && (
                          <p className="text-[10px] text-foreground-muted line-clamp-1">{item.description}</p>
                        )}
                      </div>
                      <span className="shrink-0 text-[10px] text-foreground-muted">
                        {new Date(item.createdAt).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

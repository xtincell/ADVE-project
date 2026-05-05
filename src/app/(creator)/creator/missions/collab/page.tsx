import { PILLAR_STORAGE_KEYS } from "@/domain";

"use client";

import { useState } from "react";
import {
  Users,
  CheckCircle,
  Star,
  Clock,
  FileText,
  Target,
  Eye,
  Calendar,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { PillarProgress } from "@/components/shared/pillar-progress";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { SearchFilter } from "@/components/shared/search-filter";
import { type PillarKey } from "@/lib/types/advertis-vector";

type GuildTier = "APPRENTI" | "COMPAGNON" | "MAITRE" | "ASSOCIE";

interface TeamMember {
  name: string;
  tier: GuildTier;
  role: string;
  avatar?: string;
}

interface CollabDeliverable {
  title: string;
  assignee: string;
  status: string;
}

interface TimelineEvent {
  date: string;
  label: string;
  done: boolean;
}

export default function CollabMissionsPage() {
  const [search, setSearch] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedMission, setSelectedMission] = useState<string | null>(null);

  const missions = trpc.mission.list.useQuery({ limit: 50 });

  const missionDetail = trpc.mission.get.useQuery(
    { id: selectedMission! },
    { enabled: !!selectedMission }
  );

  if (missions.isLoading) return <SkeletonPage />;

  const allMissions = missions.data ?? [];
  const collabMissions = allMissions.filter((m) => m.mode === "COLLABORATIF");

  const activeCollabs = collabMissions.filter((m) => m.status === "IN_PROGRESS");
  const completedCollabs = collabMissions.filter((m) => m.status === "COMPLETED");
  const myContributions = collabMissions.filter(
    (m) => m.status === "IN_PROGRESS" || m.status === "COMPLETED"
  );

  const filtered = collabMissions.filter((m) => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterValues.status || m.status === filterValues.status;
    return matchSearch && matchStatus;
  });

  const statusOptions = [
    { value: "IN_PROGRESS", label: "En cours" },
    { value: "COMPLETED", label: "Termine" },
    { value: "DRAFT", label: "Brouillon" },
  ];

  // Detail data
  const detail = missionDetail.data;
  const detailMeta = detail?.advertis_vector as Record<string, unknown> | null;
  const detailTeam = (detailMeta?.team as TeamMember[]) ?? [];
  const detailDeliverables = (detailMeta?.collab_deliverables as CollabDeliverable[]) ?? [];
  const detailTimeline = (detailMeta?.timeline as TimelineEvent[]) ?? [];
  const detailBrief = (detailMeta?.brief as string) ?? "";

  const pillarScores: Partial<Record<PillarKey, number>> = {};
  if (detailMeta) {
    ([...PILLAR_STORAGE_KEYS] as PillarKey[]).forEach((k) => {
      if (typeof detailMeta[k] === "number") pillarScores[k] = detailMeta[k] as number;
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missions Collaboratives"
        description="Missions en mode collaboratif avec plusieurs createurs"
        breadcrumbs={[
          { label: "Creator", href: "/creator" },
          { label: "Missions", href: "/creator/missions/available" },
          { label: "Collaboratives" },
        ]}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Collabs actives"
          value={activeCollabs.length}
          icon={Users}
          trend={activeCollabs.length > 0 ? "up" : "flat"}
          trendValue={activeCollabs.length > 0 ? "En cours" : "Aucune"}
        />
        <StatCard
          title="Terminees"
          value={completedCollabs.length}
          icon={CheckCircle}
        />
        <StatCard
          title="Mes contributions"
          value={myContributions.length}
          icon={Star}
        />
      </div>

      {/* Search & Filter */}
      <SearchFilter
        placeholder="Rechercher une mission collaborative..."
        value={search}
        onChange={setSearch}
        filters={[
          { key: "status", label: "Statut", options: statusOptions },
        ]}
        filterValues={filterValues}
        onFilterChange={(key, value) =>
          setFilterValues((prev) => ({ ...prev, [key]: value }))
        }
      />

      {/* Mission list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucune mission collaborative"
          description="Les missions collaboratives apparaitront ici lorsqu'elles seront disponibles."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => {
            const meta = m.advertis_vector as Record<string, unknown> | null;
            const deadline = meta?.deadline as string | undefined;
            const team = (meta?.team as TeamMember[]) ?? [];
            const myRole = (meta?.myRole as string) ?? "Contributeur";
            const progressPct = (meta?.progress as number) ?? 0;
            const campaignName = (meta?.campaignName as string) ?? "";

            // Extract pillar keys from mission meta for badge display
            const missionPillars: PillarKey[] = [];
            if (meta) {
              ([...PILLAR_STORAGE_KEYS] as PillarKey[]).forEach((k) => {
                if (typeof meta[k] === "number" && (meta[k] as number) > 0) {
                  missionPillars.push(k);
                }
              });
            }

            const PILLAR_BADGE_COLORS: Record<PillarKey, string> = {
              a: "bg-purple-500/20 text-purple-400",
              d: "bg-blue-500/20 text-blue-400",
              v: "bg-emerald-500/20 text-emerald-400",
              e: "bg-amber-500/20 text-amber-400",
              r: "bg-red-500/20 text-red-400",
              t: "bg-sky-500/20 text-sky-400",
              i: "bg-orange-500/20 text-orange-400",
              s: "bg-pink-500/20 text-pink-400",
            };

            return (
              <div
                key={m.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-colors hover:border-zinc-700"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white line-clamp-2">
                      {m.title}
                    </h3>
                    {campaignName && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {campaignName}
                      </p>
                    )}
                    {!campaignName && m.driver && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {m.driver.name} - {m.driver.channel}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={m.status} />
                </div>

                {/* Meta info */}
                <div className="mt-3 space-y-1.5 text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    <span>{team.length > 0 ? `${team.length} membres` : "Equipe en attente"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3 w-3" />
                    <span>Mon role: {myRole}</span>
                  </div>
                  {deadline && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(deadline).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Team avatars */}
                {team.length > 0 && (
                  <div className="mt-3 flex items-center gap-1">
                    <div className="flex -space-x-2">
                      {team.slice(0, 5).map((member, i) => (
                        <div
                          key={i}
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-800 text-[10px] font-semibold text-zinc-300"
                          title={member.name}
                        >
                          {member.avatar ?? member.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {team.length > 5 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-zinc-900 bg-zinc-700 text-[10px] font-semibold text-zinc-300">
                          +{team.length - 5}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ADVE pillar badges */}
                {missionPillars.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {missionPillars.slice(0, 4).map((p) => (
                      <span
                        key={p}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${PILLAR_BADGE_COLORS[p]}`}
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Progression</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-700"
                      style={{ width: `${Math.max(progressPct, 2)}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4">
                  <button
                    onClick={() => setSelectedMission(m.id)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Voir les details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mission detail modal */}
      <Modal
        open={!!selectedMission}
        onClose={() => setSelectedMission(null)}
        title="Mission collaborative"
        size="lg"
      >
        {missionDetail.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-full animate-pulse rounded bg-zinc-800" />
            ))}
          </div>
        ) : detail ? (
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
            {/* Title & campaign */}
            <div>
              <h3 className="text-lg font-semibold text-white">{detail.title}</h3>
              <p className="mt-1 text-sm text-zinc-400">
                {detail.campaign?.name ?? detail.strategy?.name ?? ""}
              </p>
              <div className="mt-2">
                <StatusBadge status={detail.status} />
              </div>
            </div>

            {/* Shared brief */}
            {detailBrief && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-zinc-400">Brief partage</h4>
                <div className="rounded-lg border border-zinc-800/50 bg-zinc-800/30 p-4">
                  <p className="text-sm leading-relaxed text-zinc-300">{detailBrief}</p>
                </div>
              </div>
            )}

            {/* Team composition */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-zinc-400">
                Composition de l&apos;equipe ({detailTeam.length})
              </h4>
              {detailTeam.length > 0 ? (
                <div className="space-y-2">
                  {detailTeam.map((member, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-zinc-800/50 bg-zinc-800/20 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-300">
                          {member.avatar ?? member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{member.name}</p>
                          <p className="text-xs text-zinc-500">{member.role}</p>
                        </div>
                      </div>
                      <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                        {member.tier}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Equipe en cours d&apos;assignation</p>
              )}
            </div>

            {/* Deliverables per member */}
            {detailDeliverables.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-400">
                  Livrables par membre
                </h4>
                <div className="space-y-2">
                  {detailDeliverables.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-zinc-800/50 bg-zinc-800/20 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-zinc-500" />
                        <div>
                          <p className="text-sm text-zinc-300">{d.title}</p>
                          <p className="text-xs text-zinc-500">Assigne a {d.assignee}</p>
                        </div>
                      </div>
                      <StatusBadge
                        status={d.status}
                        variantMap={{
                          done: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
                          in_progress: "bg-violet-400/15 text-violet-400 ring-violet-400/30",
                          pending: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Standard deliverables from DB */}
            {detail.deliverables && detail.deliverables.length > 0 && detailDeliverables.length === 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-400">
                  Livrables ({detail.deliverables.length})
                </h4>
                <div className="space-y-2">
                  {detail.deliverables.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800/50 bg-zinc-800/20 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-zinc-500" />
                        <p className="text-sm text-zinc-300">{d.title}</p>
                      </div>
                      <StatusBadge status={d.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Collaboration timeline */}
            {detailTimeline.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-zinc-400">
                  Timeline collaboration
                </h4>
                <div className="relative space-y-0 pl-4">
                  {detailTimeline.map((event, i) => (
                    <div key={i} className="relative flex gap-4 pb-4">
                      {/* Vertical line */}
                      {i < detailTimeline.length - 1 && (
                        <div className="absolute left-[-8px] top-3 h-full w-px bg-zinc-800" />
                      )}
                      {/* Dot */}
                      <div
                        className={`relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                          event.done
                            ? "border-emerald-500 bg-emerald-500"
                            : "border-zinc-600 bg-zinc-900"
                        }`}
                        style={{ marginLeft: "-20px" }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-zinc-500" />
                          <span className="text-xs text-zinc-500">
                            {new Date(event.date).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <p
                          className={`mt-0.5 text-sm ${
                            event.done ? "text-zinc-400 line-through" : "text-zinc-300"
                          }`}
                        >
                          {event.label}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ADVE focus */}
            {Object.keys(pillarScores).length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-zinc-400">
                  Focus pilliers ADVE
                </h4>
                <PillarProgress scores={pillarScores} />
              </div>
            )}

            {/* Modal info grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-500">Canal</span>
                <p className="font-medium text-zinc-300">
                  {detail.driver?.channel ?? "N/A"}
                </p>
              </div>
              <div>
                <span className="text-zinc-500">Mode</span>
                <p className="font-medium text-zinc-300">Collaboratif</p>
              </div>
            </div>

            {/* Close */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedMission(null)}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
              >
                Fermer
              </button>
              <a
                href="/creator/missions/active"
                className="flex flex-1 items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                Contribuer
              </a>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

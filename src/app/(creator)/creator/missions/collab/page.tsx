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
import { PILLAR_STORAGE_KEYS } from "@/domain";

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
              v: "bg-success/20 text-success",
              e: "bg-warning/20 text-warning",
              r: "bg-error/20 text-error",
              t: "bg-sky-500/20 text-sky-400",
              i: "bg-orange-500/20 text-orange-400",
              s: "bg-pink-500/20 text-pink-400",
            };

            return (
              <div
                key={m.id}
                className="rounded-xl border border-border bg-background/80 p-5 transition-colors hover:border-border"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-white line-clamp-2">
                      {m.title}
                    </h3>
                    {campaignName && (
                      <p className="mt-0.5 truncate text-xs text-foreground-muted">
                        {campaignName}
                      </p>
                    )}
                    {!campaignName && m.driver && (
                      <p className="mt-0.5 truncate text-xs text-foreground-muted">
                        {m.driver.name} - {m.driver.channel}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={m.status} />
                </div>

                {/* Meta info */}
                <div className="mt-3 space-y-1.5 text-xs text-foreground-secondary">
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
                          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-border bg-background text-[10px] font-semibold text-foreground-secondary"
                          title={member.name}
                        >
                          {member.avatar ?? member.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {team.length > 5 && (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-border bg-surface-raised text-[10px] font-semibold text-foreground-secondary">
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
                  <div className="flex items-center justify-between text-[10px] text-foreground-muted">
                    <span>Progression</span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-background">
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
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
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
              <div key={i} className="h-4 w-full animate-pulse rounded bg-background" />
            ))}
          </div>
        ) : detail ? (
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
            {/* Title & campaign */}
            <div>
              <h3 className="text-lg font-semibold text-white">{detail.title}</h3>
              <p className="mt-1 text-sm text-foreground-secondary">
                {detail.campaign?.name ?? detail.strategy?.name ?? ""}
              </p>
              <div className="mt-2">
                <StatusBadge status={detail.status} />
              </div>
            </div>

            {/* Shared brief */}
            {detailBrief && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground-secondary">Brief partage</h4>
                <div className="rounded-lg border border-border/50 bg-background/30 p-4">
                  <p className="text-sm leading-relaxed text-foreground-secondary">{detailBrief}</p>
                </div>
              </div>
            )}

            {/* Team composition */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-foreground-secondary">
                Composition de l&apos;equipe ({detailTeam.length})
              </h4>
              {detailTeam.length > 0 ? (
                <div className="space-y-2">
                  {detailTeam.map((member, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/20 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-sm font-semibold text-foreground-secondary">
                          {member.avatar ?? member.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{member.name}</p>
                          <p className="text-xs text-foreground-muted">{member.role}</p>
                        </div>
                      </div>
                      <span className="rounded-md bg-background px-2 py-0.5 text-[10px] font-semibold text-foreground-secondary">
                        {member.tier}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-foreground-muted">Equipe en cours d&apos;assignation</p>
              )}
            </div>

            {/* Deliverables per member */}
            {detailDeliverables.length > 0 && (
              <div>
                <h4 className="mb-3 text-sm font-medium text-foreground-secondary">
                  Livrables par membre
                </h4>
                <div className="space-y-2">
                  {detailDeliverables.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/20 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-foreground-muted" />
                        <div>
                          <p className="text-sm text-foreground-secondary">{d.title}</p>
                          <p className="text-xs text-foreground-muted">Assigne a {d.assignee}</p>
                        </div>
                      </div>
                      <StatusBadge
                        status={d.status}
                        variantMap={{
                          done: "bg-success/15 text-success ring-success",
                          in_progress: "bg-accent/15 text-accent ring-accent/30",
                          pending: "bg-warning/15 text-warning ring-warning",
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
                <h4 className="mb-3 text-sm font-medium text-foreground-secondary">
                  Livrables ({detail.deliverables.length})
                </h4>
                <div className="space-y-2">
                  {detail.deliverables.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 bg-background/20 px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-foreground-muted" />
                        <p className="text-sm text-foreground-secondary">{d.title}</p>
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
                <h4 className="mb-3 text-sm font-medium text-foreground-secondary">
                  Timeline collaboration
                </h4>
                <div className="relative space-y-0 pl-4">
                  {detailTimeline.map((event, i) => (
                    <div key={i} className="relative flex gap-4 pb-4">
                      {/* Vertical line */}
                      {i < detailTimeline.length - 1 && (
                        <div className="absolute left-[-8px] top-3 h-full w-px bg-background" />
                      )}
                      {/* Dot */}
                      <div
                        className={`relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                          event.done
                            ? "border-success bg-success"
                            : "border-border-strong bg-background"
                        }`}
                        style={{ marginLeft: "-20px" }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-foreground-muted" />
                          <span className="text-xs text-foreground-muted">
                            {new Date(event.date).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <p
                          className={`mt-0.5 text-sm ${
                            event.done ? "text-foreground-secondary line-through" : "text-foreground-secondary"
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
                <h4 className="mb-2 text-sm font-medium text-foreground-secondary">
                  Focus pilliers ADVE
                </h4>
                <PillarProgress scores={pillarScores} />
              </div>
            )}

            {/* Modal info grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-foreground-muted">Canal</span>
                <p className="font-medium text-foreground-secondary">
                  {detail.driver?.channel ?? "N/A"}
                </p>
              </div>
              <div>
                <span className="text-foreground-muted">Mode</span>
                <p className="font-medium text-foreground-secondary">Collaboratif</p>
              </div>
            </div>

            {/* Close */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectedMission(null)}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground-secondary transition-colors hover:bg-surface-raised"
              >
                Fermer
              </button>
              <a
                href="/creator/missions/active"
                className="flex flex-1 items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-foreground"
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

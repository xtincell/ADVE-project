"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Tabs } from "@/components/shared/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchFilter } from "@/components/shared/search-filter";
import { Modal } from "@/components/shared/modal";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { buildPillarContentMap, PILLAR_TAG_BG } from "@/components/shared/pillar-content-card";
import { PILLAR_NAMES, PILLAR_KEYS, type PillarKey } from "@/lib/types/advertis-vector";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { FormField } from "@/components/shared/form-field";
import {
  Rocket,
  Clock,
  AlertTriangle,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Radio,
  User,
  Target,
  BarChart3,
  CheckCircle2,
  Timer,
  TrendingUp,
  Eye,
  Star,
  Pencil,
} from "lucide-react";

/* ---- helpers ---- */

const STAGES = ["DRAFT", "IN_PROGRESS", "REVIEW", "COMPLETED"] as const;

const STAGE_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  IN_PROGRESS: "En cours",
  REVIEW: "Revue",
  COMPLETED: "Termine",
};

function stageIndex(status: string): number {
  const idx = STAGES.indexOf(status as (typeof STAGES)[number]);
  return idx >= 0 ? idx : 0;
}

function hoursUntilDeadline(deadline: string): number {
  return (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60);
}

function slaColor(hours: number): string {
  if (hours < 0) return "text-red-400 animate-pulse";
  if (hours < 24) return "text-red-400";
  if (hours < 48) return "text-amber-400";
  return "text-emerald-400";
}

function slaBg(hours: number): string {
  if (hours < 0) return "bg-red-500/15 ring-red-500/30";
  if (hours < 24) return "bg-red-500/10 ring-red-500/20";
  if (hours < 48) return "bg-amber-500/10 ring-amber-500/20";
  return "bg-emerald-500/10 ring-emerald-500/20";
}

/* ---- mini radar (inline) ---- */
function MiniPillarRadar({ priorities }: { priorities: Record<string, number> }) {
  const maxVal = Math.max(...Object.values(priorities), 1);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {PILLAR_KEYS.map((k) => {
        const val = priorities[k] ?? 0;
        const pct = (val / maxVal) * 100;
        return (
          <div
            key={k}
            title={`${k.toUpperCase()}: ${val}`}
            className="w-2 rounded-t bg-violet-500/60 transition-all"
            style={{ height: `${Math.max(pct, 8)}%` }}
          />
        );
      })}
    </div>
  );
}

/* ---- progress timeline ---- */
function ProgressTimeline({ currentStatus }: { currentStatus: string }) {
  const current = stageIndex(currentStatus);
  return (
    <div className="flex items-center gap-1 w-full">
      {STAGES.map((stage, idx) => {
        const isCompleted = idx < current;
        const isCurrent = idx === current;
        const isLast = idx === STAGES.length - 1;
        return (
          <div key={stage} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`h-1.5 w-full rounded-full transition-all ${
                  isCompleted
                    ? "bg-emerald-500"
                    : isCurrent
                      ? "bg-violet-500"
                      : "bg-zinc-800"
                }`}
              />
              <span
                className={`mt-1 text-[9px] font-medium ${
                  isCompleted
                    ? "text-emerald-400"
                    : isCurrent
                      ? "text-violet-400"
                      : "text-zinc-600"
                }`}
              >
                {STAGE_LABELS[stage]}
              </span>
            </div>
            {!isLast && <div className="w-1" />}
          </div>
        );
      })}
    </div>
  );
}

/* ---- main ---- */

export default function MissionsPage() {
  const strategyId = useCurrentStrategyId();
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [expandedMission, setExpandedMission] = useState<string | null>(null);
  const [detailMission, setDetailMission] = useState<string | null>(null);
  const [validateTarget, setValidateTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const utils = trpc.useUtils();

  const missionsQuery = trpc.mission.list.useQuery(
    { strategyId: strategyId!, limit: 100 },
    { enabled: !!strategyId },
  );

  const [editTarget, setEditTarget] = useState<{
    id: string;
    title: string;
    deadline: string;
  } | null>(null);

  const acceptDeliverableMutation = trpc.mission.acceptDeliverable.useMutation({
    onSuccess: () => {
      utils.mission.list.invalidate();
      setValidateTarget(null);
    },
  });

  const updateMissionMutation = trpc.mission.update.useMutation({
    onSuccess: () => {
      utils.mission.list.invalidate();
    },
  });

  const setDeadlineMutation = trpc.mission.setDeadline.useMutation({
    onSuccess: () => {
      utils.mission.list.invalidate();
      setEditTarget(null);
    },
  });

  const handleEditSave = () => {
    if (!editTarget) return;
    const promises: Promise<unknown>[] = [];
    // Update title
    promises.push(
      updateMissionMutation.mutateAsync({
        id: editTarget.id,
        title: editTarget.title,
      }),
    );
    // Update deadline if provided
    if (editTarget.deadline) {
      promises.push(
        setDeadlineMutation.mutateAsync({
          id: editTarget.id,
          deadline: new Date(editTarget.deadline).toISOString(),
        }),
      );
    }
    Promise.all(promises).then(() => {
      setEditTarget(null);
    });
  };

  const strategyQuery = trpc.strategy.getWithScore.useQuery(
    { id: strategyId! },
    { enabled: !!strategyId },
  );

  const pillarContentMap = buildPillarContentMap(
    (strategyQuery.data as Record<string, unknown> & { pillars?: Array<{ key: string; content: unknown }> })?.pillars,
  );

  /* ---- derived data ---- */
  const allMissions = missionsQuery.data ?? [];

  const stats = useMemo(() => {
    const total = allMissions.length;
    const completed = allMissions.filter((m) => m.status === "COMPLETED").length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Avg QC score from deliverables
    const allDeliverables = allMissions.flatMap((m) => m.deliverables ?? []);
    const scoredDeliverables = allDeliverables.filter(
      (d) => (d as Record<string, unknown>).qcScore != null,
    );
    const avgQc =
      scoredDeliverables.length > 0
        ? scoredDeliverables.reduce(
            (sum, d) => sum + ((d as Record<string, unknown>).qcScore as number),
            0,
          ) / scoredDeliverables.length
        : 0;

    // On-time rate
    const withDeadline = allMissions.filter((m) => {
      const meta = m.advertis_vector as Record<string, unknown> | null;
      return meta?.deadline;
    });
    const onTime = withDeadline.filter((m) => {
      const meta = m.advertis_vector as Record<string, unknown> | null;
      if (m.status !== "COMPLETED") return true;
      const deadline = meta?.deadline as string;
      return new Date(deadline).getTime() >= Date.now();
    }).length;
    const onTimeRate =
      withDeadline.length > 0
        ? Math.round((onTime / withDeadline.length) * 100)
        : 100;

    return { total, completed, completionRate, avgQc, onTimeRate };
  }, [allMissions]);

  if (!strategyId || missionsQuery.isLoading) {
    return <SkeletonPage />;
  }

  if (missionsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Missions" />
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-2 text-sm text-red-300">
            {missionsQuery.error.message}
          </p>
        </div>
      </div>
    );
  }

  const activeMissions = allMissions.filter(
    (m) => m.status === "IN_PROGRESS" || m.status === "DRAFT",
  );
  const toValidate = allMissions.filter((m) =>
    m.deliverables?.some((d) => d.status === "PENDING"),
  );
  const completed = allMissions.filter((m) => m.status === "COMPLETED");

  const tabFiltered =
    activeTab === "active"
      ? activeMissions
      : activeTab === "validate"
        ? toValidate
        : completed;

  const missions = tabFiltered.filter(
    (m) =>
      !search || m.title.toLowerCase().includes(search.toLowerCase()),
  );

  const tabs = [
    { key: "active", label: "Actives", count: activeMissions.length },
    { key: "validate", label: "A valider", count: toValidate.length },
    { key: "completed", label: "Terminees", count: completed.length },
  ];

  const detailData = detailMission
    ? allMissions.find((m) => m.id === detailMission)
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missions"
        description="Gerez vos missions actives, validez les livrables et suivez l'avancement."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Operations" },
          { label: "Missions" },
        ]}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard title="Total missions" value={stats.total} icon={Rocket} />
        <StatCard
          title="Taux d'achevement"
          value={`${stats.completionRate}%`}
          icon={CheckCircle2}
          trend={stats.completionRate >= 70 ? "up" : stats.completionRate >= 40 ? "flat" : "down"}
          trendValue={`${stats.completed}/${stats.total}`}
        />
        <StatCard
          title="Score QC moyen"
          value={stats.avgQc > 0 ? stats.avgQc.toFixed(1) : "--"}
          icon={Star}
        />
        <StatCard
          title="Livraison a l'heure"
          value={`${stats.onTimeRate}%`}
          icon={Timer}
          trend={stats.onTimeRate >= 80 ? "up" : "down"}
        />
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <SearchFilter
        placeholder="Rechercher une mission..."
        value={search}
        onChange={setSearch}
      />

      {missions.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title={
            activeTab === "active"
              ? "Aucune mission active"
              : activeTab === "validate"
                ? "Rien a valider"
                : "Aucune mission terminee"
          }
          description="Les missions apparaitront ici."
        />
      ) : (
        <div className="space-y-3">
          {missions.map((m) => {
            const isExpanded = expandedMission === m.id;
            const meta = m.advertis_vector as Record<string, unknown> | null;
            const deliverables = m.deliverables ?? [];
            const pendingDeliverables = deliverables.filter(
              (d) => d.status === "PENDING",
            );
            const deadline = meta?.deadline as string | undefined;
            const hoursLeft = deadline ? hoursUntilDeadline(deadline) : null;

            const missionPillars =
              (meta?.pillarPriority as Record<string, number> | undefined) ??
              (m.driver?.pillarPriority as Record<string, number> | undefined);

            return (
              <div
                key={m.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/80 transition-colors hover:border-zinc-700"
              >
                {/* Header */}
                <div
                  className="cursor-pointer p-4"
                  onClick={() =>
                    setExpandedMission(isExpanded ? null : m.id)
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-white">
                          {m.title}
                        </h4>
                        <StatusBadge status={m.status} />
                        {/* SLA countdown */}
                        {hoursLeft !== null && (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${slaBg(hoursLeft)} ${slaColor(hoursLeft)}`}
                          >
                            <Timer className="h-3 w-3" />
                            {hoursLeft < 0
                              ? `SLA depasse (${Math.abs(Math.round(hoursLeft))}h)`
                              : `${Math.round(hoursLeft)}h restantes`}
                          </span>
                        )}
                      </div>

                      {/* Progress timeline */}
                      <div className="max-w-xs">
                        <ProgressTimeline currentStatus={m.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400">
                        {deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(deadline).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                        {m.driver && (
                          <>
                            <span className="flex items-center gap-1">
                              <Radio className="h-3 w-3" />
                              {m.driver.channel}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {m.driver.name}
                            </span>
                          </>
                        )}
                        <span>
                          {deliverables.length} livrable
                          {deliverables.length !== 1 ? "s" : ""}
                        </span>
                        {pendingDeliverables.length > 0 && (
                          <span className="text-amber-400">
                            {pendingDeliverables.length} en attente
                          </span>
                        )}
                        {/* Pillar mini radar */}
                        {missionPillars && Object.keys(missionPillars).length > 0 && (
                          <MiniPillarRadar priorities={missionPillars} />
                        )}
                      </div>

                      {/* Pillar badges */}
                      {(() => {
                        if (!missionPillars || Object.keys(missionPillars).length === 0) return null;
                        const sortedKeys = Object.entries(missionPillars)
                          .sort(([, a], [, b]) => b - a)
                          .map(([k]) => k as PillarKey)
                          .filter((k) => k in PILLAR_NAMES);
                        if (sortedKeys.length === 0) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {sortedKeys.slice(0, 4).map((pk) => (
                              <span
                                key={pk}
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${PILLAR_TAG_BG[pk]}`}
                              >
                                {pk.toUpperCase()} &mdash; {PILLAR_NAMES[pk]}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const mMeta = m.advertis_vector as Record<string, unknown> | null;
                          const mDeadline = mMeta?.deadline as string | undefined;
                          setEditTarget({
                            id: m.id,
                            title: m.title,
                            deadline: mDeadline ? new Date(mDeadline).toISOString().split("T")[0] ?? "" : "",
                          });
                        }}
                        className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        title="Modifier la mission"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailMission(m.id);
                        }}
                        className="rounded-lg border border-zinc-700 bg-zinc-800 p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700"
                        title="Voir le detail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 shrink-0 text-zinc-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 shrink-0 text-zinc-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded deliverables section */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 p-4">
                    <h5 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                      Livrables
                    </h5>
                    {deliverables.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        Aucun livrable soumis.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {deliverables.map((d) => {
                          const dMeta = d as Record<string, unknown>;
                          const qcScore = dMeta.qcScore as number | undefined;
                          return (
                            <div
                              key={d.id}
                              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3"
                            >
                              <div className="flex items-center gap-3">
                                <FileCheck className="h-4 w-4 text-zinc-500" />
                                <div>
                                  <p className="text-sm text-white">
                                    {d.title}
                                  </p>
                                  <p className="text-xs text-zinc-500">
                                    {new Date(
                                      d.createdAt as unknown as string,
                                    ).toLocaleDateString("fr-FR")}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* QC score chip */}
                                {qcScore != null && (
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                      qcScore >= 80
                                        ? "bg-emerald-500/15 text-emerald-400"
                                        : qcScore >= 60
                                          ? "bg-amber-500/15 text-amber-400"
                                          : "bg-red-500/15 text-red-400"
                                    }`}
                                  >
                                    QC {qcScore}
                                  </span>
                                )}
                                <StatusBadge status={d.status} />
                                {d.status === "PENDING" && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setValidateTarget({
                                        id: d.id,
                                        title: d.title,
                                      });
                                    }}
                                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                                  >
                                    Valider
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mission detail modal */}
      <Modal
        open={!!detailData}
        onClose={() => setDetailMission(null)}
        title={detailData?.title ?? "Detail de la mission"}
        size="lg"
      >
        {detailData && (() => {
          const meta = detailData.advertis_vector as Record<string, unknown> | null;
          const deadline = meta?.deadline as string | undefined;
          const budget = meta?.budget as number | undefined;
          const briefDesc = meta?.briefDescription as string | undefined;
          const deliverables = detailData.deliverables ?? [];
          const hoursLeft = deadline ? hoursUntilDeadline(deadline) : null;
          const commission = meta?.commission as Record<string, unknown> | undefined;

          const missionPillars =
            (meta?.pillarPriority as Record<string, number> | undefined) ??
            (detailData.driver?.pillarPriority as Record<string, number> | undefined);

          return (
            <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
              {/* Status + SLA */}
              <div className="flex items-center gap-3 flex-wrap">
                <StatusBadge status={detailData.status} />
                {hoursLeft !== null && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${slaBg(hoursLeft)} ${slaColor(hoursLeft)}`}
                  >
                    <Timer className="h-3.5 w-3.5" />
                    {hoursLeft < 0
                      ? `SLA depasse de ${Math.abs(Math.round(hoursLeft))}h`
                      : `${Math.round(hoursLeft)}h avant deadline`}
                  </span>
                )}
              </div>

              {/* Progress */}
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500 uppercase">Progression</p>
                <ProgressTimeline currentStatus={detailData.status} />
              </div>

              {/* Brief description */}
              {briefDesc && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <p className="mb-1 text-xs font-medium text-zinc-500">Description du brief</p>
                  <p className="text-sm leading-relaxed text-zinc-300">{briefDesc}</p>
                </div>
              )}

              {/* Driver specs */}
              {detailData.driver && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <p className="mb-2 text-xs font-medium text-zinc-500 uppercase">Driver</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-zinc-500">Nom:</span>{" "}
                      <span className="text-white">{detailData.driver.name}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Canal:</span>{" "}
                      <span className="text-white">{detailData.driver.channel}</span>
                    </div>
                    {!!(detailData.driver as Record<string, unknown>).formatSpecs && (
                      <div className="col-span-2">
                        <span className="text-zinc-500">Format:</span>{" "}
                        <span className="text-white">
                          {String((detailData.driver as Record<string, unknown>).formatSpecs)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                {deadline && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Date limite</p>
                    <p className="mt-1 text-sm text-white">
                      {new Date(deadline).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {budget != null && (
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Budget</p>
                    <p className="mt-1 text-sm text-white">{budget.toLocaleString("fr-FR")} EUR</p>
                  </div>
                )}
              </div>

              {/* Pillar impact */}
              {missionPillars && Object.keys(missionPillars).length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-zinc-500 uppercase">
                    Impact ADVE-RTIS
                  </p>
                  <div className="space-y-1.5">
                    {Object.entries(missionPillars)
                      .sort(([, a], [, b]) => b - a)
                      .filter(([k]) => k in PILLAR_NAMES)
                      .map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2">
                          <span className={`w-6 text-center text-[11px] font-bold ${PILLAR_TAG_BG[k as PillarKey].split(" ")[1]}`}>
                            {k.toUpperCase()}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-zinc-800">
                            <div
                              className="h-full rounded-full bg-violet-500 transition-all"
                              style={{ width: `${Math.min((v / 25) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-zinc-400 w-8 text-right">
                            {typeof v === "number" ? v.toFixed(0) : v}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Deliverables */}
              <div>
                <p className="mb-2 text-xs font-medium text-zinc-500 uppercase">
                  Livrables ({deliverables.length})
                </p>
                {deliverables.length === 0 ? (
                  <p className="text-sm text-zinc-500">Aucun livrable soumis.</p>
                ) : (
                  <div className="space-y-2">
                    {deliverables.map((d) => {
                      const dMeta = d as Record<string, unknown>;
                      const qcScore = dMeta.qcScore as number | undefined;
                      const qcReview = dMeta.qcReview as string | undefined;
                      return (
                        <div
                          key={d.id}
                          className="rounded-lg border border-zinc-800 bg-zinc-950/50 px-4 py-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileCheck className="h-4 w-4 text-zinc-500" />
                              <span className="text-sm text-white">{d.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {qcScore != null && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    qcScore >= 80
                                      ? "bg-emerald-500/15 text-emerald-400"
                                      : qcScore >= 60
                                        ? "bg-amber-500/15 text-amber-400"
                                        : "bg-red-500/15 text-red-400"
                                  }`}
                                >
                                  QC {qcScore}/100
                                </span>
                              )}
                              <StatusBadge status={d.status} />
                            </div>
                          </div>
                          {qcReview && (
                            <p className="mt-2 text-xs text-zinc-400 border-t border-zinc-800 pt-2">
                              {qcReview}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Commission status */}
              {commission && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <p className="mb-2 text-xs font-medium text-zinc-500 uppercase">Commission</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {commission.amount != null && (
                      <div>
                        <span className="text-zinc-500">Montant:</span>{" "}
                        <span className="text-white">
                          {(commission.amount as number).toLocaleString("fr-FR")} EUR
                        </span>
                      </div>
                    )}
                    {!!commission.status && (
                      <div>
                        <span className="text-zinc-500">Statut:</span>{" "}
                        <StatusBadge status={commission.status as string} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      <ConfirmDialog
        open={!!validateTarget}
        onClose={() => setValidateTarget(null)}
        onConfirm={() => {
          if (validateTarget) {
            acceptDeliverableMutation.mutate({ deliverableId: validateTarget.id });
          }
        }}
        title="Valider le livrable"
        message={`Confirmez-vous la validation de "${validateTarget?.title}" ?`}
        confirmLabel={acceptDeliverableMutation.isPending ? "Validation..." : "Valider"}
        variant="info"
      />

      {/* Edit mission modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Modifier la mission"
        size="md"
      >
        {editTarget && (
          <div className="space-y-4">
            <FormField label="Titre de la mission" required>
              <input
                type="text"
                value={editTarget.title}
                onChange={(e) =>
                  setEditTarget({ ...editTarget, title: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              />
            </FormField>

            <FormField label="Date limite">
              <input
                type="date"
                value={editTarget.deadline}
                onChange={(e) =>
                  setEditTarget({ ...editTarget, deadline: e.target.value })
                }
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600"
              />
            </FormField>

            {(updateMissionMutation.error || setDeadlineMutation.error) && (
              <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-3 text-sm text-red-300">
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                {updateMissionMutation.error?.message ?? setDeadlineMutation.error?.message}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditTarget(null)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
              >
                Annuler
              </button>
              <button
                onClick={handleEditSave}
                disabled={
                  !editTarget.title.trim() ||
                  updateMissionMutation.isPending ||
                  setDeadlineMutation.isPending
                }
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
              >
                {updateMissionMutation.isPending || setDeadlineMutation.isPending
                  ? "Sauvegarde..."
                  : "Sauvegarder"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

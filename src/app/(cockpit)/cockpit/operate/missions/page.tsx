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
import { getFieldLabel } from "@/components/cockpit/field-renderers";
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
  Megaphone,
  DollarSign,
  XCircle,
  ArrowRight,
  Plus,
  UserCheck,
  Send,
  ClipboardCheck,
  Award,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { PILLAR_STORAGE_KEYS } from "@/domain";

/* ---- helpers ---- */

const STAGES = ["DRAFT", "IN_PROGRESS", "REVIEW", "COMPLETED"] as const;

const STAGE_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  IN_PROGRESS: "En cours",
  REVIEW: "Revue",
  COMPLETED: "Termine",
  CANCELLED: "Annule",
};

function stageIndex(status: string): number {
  const idx = STAGES.indexOf(status as (typeof STAGES)[number]);
  return idx >= 0 ? idx : 0;
}

function hoursUntilDeadline(deadline: string): number {
  return (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60);
}

function slaColor(hours: number): string {
  if (hours < 0) return "text-error animate-pulse";
  if (hours < 24) return "text-error";
  if (hours < 48) return "text-warning";
  return "text-success";
}

function slaBg(hours: number): string {
  if (hours < 0) return "bg-error/15 ring-error";
  if (hours < 24) return "bg-error/10 ring-error";
  if (hours < 48) return "bg-warning/10 ring-warning";
  return "bg-success/10 ring-success";
}

function getNextStatuses(current: string): string[] {
  const transitions: Record<string, string[]> = {
    DRAFT: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["REVIEW", "CANCELLED"],
    REVIEW: ["COMPLETED", "CANCELLED"],
    COMPLETED: ["CANCELLED"],
    CANCELLED: [],
  };
  return transitions[current] ?? ["CANCELLED"];
}

function priorityBadge(priority: number): { bg: string; text: string } {
  if (priority === 1) return { bg: "bg-error/15 text-error ring-error", text: "1" };
  if (priority <= 3) return { bg: "bg-warning/15 text-warning ring-warning", text: String(priority) };
  return { bg: "bg-surface-raised text-foreground-secondary ring-border/30", text: String(priority) };
}

function formatXAF(amount: number): string {
  return amount.toLocaleString("fr-FR") + " XAF";
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
            className="w-2 rounded-t bg-accent/60 transition-all"
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
                    ? "bg-success"
                    : isCurrent
                      ? "bg-accent"
                      : "bg-background"
                }`}
              />
              <span
                className={`mt-1 text-[9px] font-medium ${
                  isCompleted
                    ? "text-success"
                    : isCurrent
                      ? "text-accent"
                      : "text-foreground-muted"
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
  const [activeTab, setActiveTab] = useState("all");
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

  // ── P2 State ──────────────────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [newMission, setNewMission] = useState({
    title: "", description: "", mode: "DISPATCH", priority: "3", budget: "",
    slaDeadline: "", campaignId: "",
    // Brief data fields
    objective: "", targetPersona: "", keyMessage: "", deliverablesExpected: "",
  });

  // Talent suggestion: missionId to run suggest on
  const [suggestTarget, setSuggestTarget] = useState<string | null>(null);
  // Submit deliverable target
  const [submitTarget, setSubmitTarget] = useState<{
    missionId: string;
    title: string;
  } | null>(null);
  const [newDeliverable, setNewDeliverable] = useState({ title: "", fileUrl: "", description: "" });
  // QC review target
  const [reviewTarget, setReviewTarget] = useState<{
    deliverableId: string;
    deliverableTitle: string;
  } | null>(null);
  const [qcVerdict, setQcVerdict] = useState("ACCEPTED");
  const [qcScore, setQcScore] = useState(7);
  const [qcFeedback, setQcFeedback] = useState("");
  const [qcPillarScores, setQcPillarScores] = useState<Record<string, number>>({});

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

  // ── P2 Mutations ──────────────────────────────────────────────────────────
  const createMutation = trpc.mission.create.useMutation({
    onSuccess: () => {
      utils.mission.list.invalidate();
      setShowCreate(false);
      setNewMission({ title: "", description: "", mode: "DISPATCH", priority: "3", budget: "", slaDeadline: "", campaignId: "", objective: "", targetPersona: "", keyMessage: "", deliverablesExpected: "" });
    },
  });

  const assignMutation = trpc.mission.assign.useMutation({
    onSuccess: () => {
      utils.mission.list.invalidate();
      setSuggestTarget(null);
    },
  });

  const submitDeliverableMutation = trpc.mission.submitDeliverable.useMutation({
    onSuccess: () => {
      utils.mission.list.invalidate();
      setSubmitTarget(null);
      setNewDeliverable({ title: "", fileUrl: "", description: "" });
    },
  });

  const reviewDeliverableMutation = trpc.mission.reviewDeliverable.useMutation({
    onSuccess: () => {
      utils.mission.list.invalidate();
      setReviewTarget(null);
      setQcVerdict("ACCEPTED");
      setQcScore(7);
      setQcFeedback("");
      setQcPillarScores({});
    },
  });

  // Talent suggestions — only when suggestTarget is set
  const suggestQuery = trpc.mission.suggestTalent.useQuery(
    { missionId: suggestTarget! },
    { enabled: !!suggestTarget },
  );

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
      return (m as Record<string, unknown>).slaDeadline || meta?.deadline;
    });
    const onTime = withDeadline.filter((m) => {
      const meta = m.advertis_vector as Record<string, unknown> | null;
      if (m.status !== "COMPLETED") return true;
      const dl = (m as Record<string, unknown>).slaDeadline ? new Date((m as Record<string, unknown>).slaDeadline as string).toISOString() : (meta?.deadline as string);
      return new Date(dl).getTime() >= Date.now();
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
        <div className="rounded-xl border border-error/50 bg-error/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-error" />
          <p className="mt-2 text-sm text-error">
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
    activeTab === "all"
      ? allMissions
      : activeTab === "active"
        ? activeMissions
        : activeTab === "validate"
          ? toValidate
          : completed;

  const missions = tabFiltered.filter(
    (m) =>
      !search || m.title.toLowerCase().includes(search.toLowerCase()),
  );

  const tabs = [
    { key: "all", label: "Toutes", count: allMissions.length },
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
      >
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground"
        >
          <Plus className="h-4 w-4" />
          Nouvelle mission
        </button>
      </PageHeader>

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
            const deadline = (m as Record<string, unknown>).slaDeadline ? new Date((m as Record<string, unknown>).slaDeadline as string).toISOString() : (meta?.deadline as string | undefined);
            const hoursLeft = deadline ? hoursUntilDeadline(deadline) : null;

            const missionPillars =
              (meta?.pillarPriority as Record<string, number> | undefined) ??
              (m.driver?.pillarPriority as Record<string, number> | undefined);

            return (
              <div
                key={m.id}
                className="rounded-xl border border-border bg-background/80 transition-colors hover:border-border"
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
                        {/* Mode badge */}
                        {!!(m as Record<string, unknown>).mode && (
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            (m as Record<string, unknown>).mode === "DISPATCH"
                              ? "bg-blue-500/15 text-blue-400"
                              : "bg-purple-500/15 text-purple-400"
                          }`}>
                            {(m as Record<string, unknown>).mode as string}
                          </span>
                        )}
                        {/* Priority badge */}
                        {(() => {
                          const p = (m as Record<string, unknown>).priority as number | undefined;
                          if (p == null) return null;
                          const pb = priorityBadge(p);
                          return (
                            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ring-1 ring-inset ${pb.bg}`}>
                              {pb.text}
                            </span>
                          );
                        })()}
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

                      {/* Description */}
                      {!!(m as Record<string, unknown>).description && (
                        <p className="text-xs text-foreground-secondary line-clamp-2">
                          {(m as Record<string, unknown>).description as string}
                        </p>
                      )}

                      {/* Progress timeline */}
                      <div className="max-w-xs">
                        <ProgressTimeline currentStatus={m.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-secondary">
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
                        {(m as Record<string, unknown>).budget != null && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {formatXAF((m as Record<string, unknown>).budget as number)}
                          </span>
                        )}
                        {m.campaign && (
                          <span className="flex items-center gap-1">
                            <Megaphone className="h-3 w-3" />
                            {m.campaign.name}
                          </span>
                        )}
                        <span>
                          {deliverables.length} livrable
                          {deliverables.length !== 1 ? "s" : ""}
                        </span>
                        {pendingDeliverables.length > 0 && (
                          <span className="text-warning">
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
                      {/* Matching engine — only on DRAFT unassigned */}
                      {m.status === "DRAFT" && !(m as Record<string, unknown>).assigneeId && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSuggestTarget(m.id); }}
                          className="rounded-lg border border-accent bg-accent/30 p-1.5 text-accent hover:bg-accent/60"
                          title="Matcher un talent"
                        >
                          <Zap className="h-4 w-4" />
                        </button>
                      )}
                      {/* Submit deliverable — only IN_PROGRESS */}
                      {m.status === "IN_PROGRESS" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSubmitTarget({ missionId: m.id, title: m.title }); }}
                          className="rounded-lg border border-blue-700 bg-blue-950/30 p-1.5 text-blue-400 hover:bg-blue-950/60"
                          title="Soumettre un livrable"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const mSla = (m as Record<string, unknown>).slaDeadline as string | undefined;
                          const mMeta = m.advertis_vector as Record<string, unknown> | null;
                          const mDeadline = mSla ? new Date(mSla).toISOString().split("T")[0] : (mMeta?.deadline as string | undefined);
                          setEditTarget({
                            id: m.id,
                            title: m.title,
                            deadline: mDeadline ? new Date(mDeadline).toISOString().split("T")[0] ?? "" : "",
                          });
                        }}
                        className="rounded-lg border border-border bg-background p-1.5 text-foreground-secondary hover:text-white hover:bg-surface-raised"
                        title="Modifier la mission"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailMission(m.id);
                        }}
                        className="rounded-lg border border-border bg-background p-1.5 text-foreground-secondary hover:text-white hover:bg-surface-raised"
                        title="Voir le detail"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 shrink-0 text-foreground-muted" />
                      ) : (
                        <ChevronDown className="h-5 w-5 shrink-0 text-foreground-muted" />
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Expanded dossier de mission ── */}
                {isExpanded && (() => {
                  const bd = ((m as Record<string, unknown>).briefData ?? {}) as Record<string, unknown>;
                  const assignee = (m as Record<string, unknown>).assignee as { id: string; name: string; email: string; image?: string | null } | null;
                  const commissions = (m as Record<string, unknown>).commissions as Array<{ id: string; status: string; grossAmount: number; netAmount: number; commissionAmount: number; currency: string; tierAtTime?: string }> | undefined;
                  const objective = bd.objective as string | undefined;
                  const persona = bd.targetPersona as string | undefined;
                  const keyMsg = bd.keyMessage as string | undefined;
                  const delExpected = bd.deliverablesExpected as string | undefined;
                  const pillarPriority = (bd.pillarPriority as string[]) || [];
                  const missionCtx = (bd.missionContext as Record<string, unknown>) || {};
                  const metriques = (missionCtx.metriques as Record<string, unknown>) || {};
                  const risques = (missionCtx.risques as string[]) || [];
                  const budgetVal = (m as Record<string, unknown>).budget as number | null;
                  const totalCommission = commissions?.reduce((s, c) => s + (c.commissionAmount ?? 0), 0) ?? 0;
                  const netPay = commissions?.reduce((s, c) => s + (c.netAmount ?? 0), 0) ?? 0;

                  return (
                    <div className="border-t border-border bg-background/40 divide-y divide-zinc-800/60">

                      {/* ── Brief ── */}
                      {(objective || persona || keyMsg || delExpected) && (
                        <div className="p-4 space-y-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Brief</p>
                          {objective && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted mb-1 flex items-center gap-1"><Target className="h-3 w-3" /> Objectif</p>
                              <p className="text-xs text-foreground leading-relaxed">{objective}</p>
                            </div>
                          )}
                          {(persona || keyMsg) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {persona && (
                                <div className="rounded-lg border border-border bg-background/60 p-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted mb-1 flex items-center gap-1"><User className="h-3 w-3" /> Persona</p>
                                  <p className="text-xs text-foreground-secondary leading-relaxed">{persona}</p>
                                </div>
                              )}
                              {keyMsg && (
                                <div className="rounded-lg border border-border bg-background/60 p-3">
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted mb-1 flex items-center gap-1"><Send className="h-3 w-3" /> Message clé</p>
                                  <p className="text-xs text-accent italic">"{keyMsg}"</p>
                                </div>
                              )}
                            </div>
                          )}
                          {delExpected && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted mb-1 flex items-center gap-1"><FileCheck className="h-3 w-3" /> Livrables attendus</p>
                              <p className="text-xs text-foreground-secondary whitespace-pre-line leading-relaxed">{delExpected}</p>
                            </div>
                          )}
                          {Object.keys(metriques).length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted mb-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> KPIs cibles</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {Object.entries(metriques).map(([k, v]) => (
                                  <div key={k} className="rounded-lg border border-border bg-background/60 p-2.5">
                                    <p className="text-[10px] text-foreground-muted capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</p>
                                    <p className="text-sm font-semibold text-white">{String(v)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {risques.length > 0 && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-warning/80 mb-1.5 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Risques</p>
                              <ul className="space-y-1">
                                {risques.map((r, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-foreground-secondary">
                                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-warning/60" />
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {pillarPriority.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {pillarPriority.map((k, i) => (
                                <span key={k} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PILLAR_TAG_BG[k as PillarKey] ?? "bg-background text-foreground-secondary"}`}>
                                  {i + 1}. {k.toUpperCase()} — {PILLAR_NAMES[k as PillarKey] ?? k}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Exécutant + Budget + Commission ── */}
                      <div className="p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Exécution</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {/* Exécutant */}
                          <div className="col-span-2 rounded-lg border border-border bg-background/60 p-3 flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent/20 text-accent">
                              {assignee?.image
                                ? <img src={assignee.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                                : <UserCheck className="h-4 w-4" />
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">Exécutant</p>
                              <p className="text-sm font-medium text-white truncate">{assignee?.name ?? "Non assigné"}</p>
                              {assignee?.email && <p className="text-[10px] text-foreground-muted truncate">{assignee.email}</p>}
                              {commissions?.[0]?.tierAtTime && (
                                <span className="inline-block mt-0.5 rounded-full bg-warning/15 px-1.5 py-px text-[9px] font-semibold text-warning">{commissions[0].tierAtTime}</span>
                              )}
                            </div>
                          </div>
                          {/* Budget */}
                          <div className="rounded-lg border border-border bg-background/60 p-3">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted flex items-center gap-1"><DollarSign className="h-3 w-3" /> Budget</p>
                            <p className="mt-1 text-sm font-semibold text-white">{budgetVal != null ? formatXAF(budgetVal) : "—"}</p>
                          </div>
                          {/* Rémunération */}
                          {(commissions?.length ?? 0) > 0 && (
                            <div className="rounded-lg border border-border bg-background/60 p-3">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted flex items-center gap-1"><Award className="h-3 w-3" /> Rémunération</p>
                              <p className="mt-1 text-sm font-semibold text-success">{formatXAF(netPay)}</p>
                              {totalCommission > 0 && <p className="text-[10px] text-foreground-muted">commission {formatXAF(totalCommission)}</p>}
                              <span className={`mt-1 inline-block rounded-full px-1.5 py-px text-[9px] font-semibold ${commissions![0]!.status === "PAID" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>{commissions![0]!.status}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Rapport / Livrables ── */}
                      <div className="p-4 space-y-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent">
                          Rapport d'exécution {deliverables.length > 0 ? `(${deliverables.length})` : ""}
                        </p>
                        {deliverables.length === 0 ? (
                          <p className="text-xs text-foreground-muted">Aucun livrable soumis.</p>
                        ) : (
                          <div className="space-y-3">
                            {deliverables.map((d) => {
                              const dMeta = d as Record<string, unknown>;
                              const qcScore = dMeta.qcScore as number | undefined;
                              const qcFeedback = dMeta.qcFeedback as string | undefined;
                              const desc = dMeta.description as string | undefined;
                              return (
                                <div key={d.id} className="rounded-xl border border-border bg-background/60 p-4 space-y-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <FileCheck className={`h-4 w-4 flex-shrink-0 ${d.status === "ACCEPTED" ? "text-success" : d.status === "PENDING" ? "text-warning" : "text-foreground-muted"}`} />
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-white">{d.title}</p>
                                        {(dMeta.fileUrl as string | undefined) && (
                                          <p className="text-[10px] text-accent/70 font-mono truncate">{dMeta.fileUrl as string}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {qcScore != null && (
                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${qcScore >= 8 ? "bg-success/15 text-success" : qcScore >= 6 ? "bg-warning/15 text-warning" : "bg-error/15 text-error"}`}>
                                          QC {qcScore}/10
                                        </span>
                                      )}
                                      <StatusBadge status={d.status} />
                                      {d.status === "PENDING" && (
                                        <>
                                          <button onClick={(e) => { e.stopPropagation(); setReviewTarget({ deliverableId: d.id, deliverableTitle: d.title }); }}
                                            className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent">
                                            <ShieldCheck className="h-3.5 w-3.5" /> QC Review
                                          </button>
                                          <button onClick={(e) => { e.stopPropagation(); setValidateTarget({ id: d.id, title: d.title }); }}
                                            className="rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-white hover:bg-success">
                                            Valider
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {/* Description / résumé du rapport */}
                                  {desc && (
                                    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
                                      <p className="text-xs text-foreground-secondary leading-relaxed">{desc}</p>
                                    </div>
                                  )}
                                  {qcFeedback && (
                                    <div className="rounded-lg border border-accent/30 bg-accent/10 p-2.5">
                                      <p className="text-[10px] font-semibold text-accent mb-1">Feedback QC</p>
                                      <p className="text-xs text-foreground-secondary leading-relaxed">{qcFeedback}</p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })()}
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
          const deadline = (detailData as Record<string, unknown>).slaDeadline ? new Date((detailData as Record<string, unknown>).slaDeadline as string).toISOString() : (meta?.deadline as string | undefined);
          const budget = ((detailData as Record<string, unknown>).budget as number | undefined) ?? (meta?.budget as number | undefined);
          const briefDesc = meta?.briefDescription as string | undefined;
          const briefData = (detailData as Record<string, unknown>).briefData as Record<string, unknown> | null;
          const deliverables = detailData.deliverables ?? [];
          const hoursLeft = deadline ? hoursUntilDeadline(deadline) : null;
          const commission = meta?.commission as Record<string, unknown> | undefined;
          const commissions = (detailData as Record<string, unknown>).commissions as Array<{ id: string; grossAmount: number; netAmount: number; currency: string; status: string }> | undefined;
          const nextStatuses = getNextStatuses(detailData.status);

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
                <p className="mb-2 text-xs font-medium text-foreground-muted uppercase">Progression</p>
                <ProgressTimeline currentStatus={detailData.status} />
              </div>

              {/* Brief description */}
              {briefDesc && (
                <div className="rounded-lg border border-border bg-background/50 p-4">
                  <p className="mb-1 text-xs font-medium text-foreground-muted">Description du brief</p>
                  <p className="text-sm leading-relaxed text-foreground-secondary">{briefDesc}</p>
                </div>
              )}

              {/* Brief Data (from mission record) */}
              {briefData && Object.keys(briefData).length > 0 && (
                <div className="rounded-lg border border-border bg-background/50 p-4 space-y-3">
                  <p className="mb-1 text-xs font-medium text-foreground-muted uppercase">Donnees du brief</p>
                  {!!briefData.objective && (
                    <div>
                      <p className="text-[11px] font-medium text-foreground-muted uppercase">Objectif</p>
                      <p className="text-sm leading-relaxed text-foreground-secondary">{briefData.objective as string}</p>
                    </div>
                  )}
                  {!!briefData.targetPersona && (
                    <div>
                      <p className="text-[11px] font-medium text-foreground-muted uppercase">Persona cible</p>
                      <p className="text-sm leading-relaxed text-foreground-secondary">{briefData.targetPersona as string}</p>
                    </div>
                  )}
                  {!!briefData.keyMessage && (
                    <div>
                      <p className="text-[11px] font-medium text-foreground-muted uppercase">Message cle</p>
                      <div className="mt-1 rounded-lg border-l-2 border-accent bg-accent/5 px-3 py-2">
                        <p className="text-sm italic text-accent">{briefData.keyMessage as string}</p>
                      </div>
                    </div>
                  )}
                  {!!briefData.pillarPriority && Array.isArray(briefData.pillarPriority) && (
                    <div>
                      <p className="text-[11px] font-medium text-foreground-muted uppercase">Piliers prioritaires</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {(briefData.pillarPriority as string[]).map((pk) => (
                          <span
                            key={pk}
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${PILLAR_TAG_BG[pk as PillarKey] ?? "bg-surface-raised/50 text-foreground-secondary"}`}
                          >
                            {pk.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {(briefData.budget != null || !!briefData.currency) && (
                    <div>
                      <p className="text-[11px] font-medium text-foreground-muted uppercase">Budget brief</p>
                      <p className="text-sm text-white">
                        {briefData.budget != null
                          ? `${(briefData.budget as number).toLocaleString("fr-FR")} ${(briefData.currency as string) ?? "XAF"}`
                          : (briefData.currency as string)}
                      </p>
                    </div>
                  )}
                  {!!briefData.deadline && (
                    <div>
                      <p className="text-[11px] font-medium text-foreground-muted uppercase">Deadline brief</p>
                      <p className="text-sm text-white">
                        {new Date(briefData.deadline as string).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  )}
                  {!!briefData.deliverablesExpected && (
                    <div>
                      <p className="text-[11px] font-medium text-foreground-muted uppercase">Livrables attendus</p>
                      <p className="text-sm leading-relaxed text-foreground-secondary">{briefData.deliverablesExpected as string}</p>
                    </div>
                  )}
                  {!!briefData.status && (
                    <div>
                      <p className="text-[11px] font-medium text-foreground-muted uppercase">Statut brief</p>
                      <StatusBadge status={briefData.status as string} />
                    </div>
                  )}
                  {!!briefData.missionContext && (() => {
                    const ctx = briefData.missionContext as Record<string, unknown>;
                    return (
                      <div className="rounded-lg border border-border bg-background/80 p-3 space-y-2">
                        <p className="text-[11px] font-medium text-foreground-muted uppercase">Contexte mission</p>
                        {!!ctx.prerequis && (
                          <div>
                            <p className="text-[10px] font-medium text-foreground-muted">Prerequis</p>
                            <p className="text-xs text-foreground-secondary">{String(ctx.prerequis)}</p>
                          </div>
                        )}
                        {!!ctx.metriques && (
                          <div>
                            <p className="text-[10px] font-medium text-foreground-muted">Metriques</p>
                            <div className="mt-1 space-y-0.5">
                              {typeof ctx.metriques === "object" && ctx.metriques !== null
                                ? Object.entries(ctx.metriques as Record<string, unknown>).map(([k, v]) => (
                                    <div key={k} className="flex items-center justify-between text-xs">
                                      <span className="text-foreground-muted">{k}</span>
                                      <span className="text-foreground-secondary">{String(v)}</span>
                                    </div>
                                  ))
                                : <p className="text-xs text-foreground-secondary">{String(ctx.metriques)}</p>}
                            </div>
                          </div>
                        )}
                        {!!ctx.risques && (
                          <div>
                            <p className="text-[10px] font-medium text-foreground-muted">Risques</p>
                            {Array.isArray(ctx.risques)
                              ? <ul className="mt-1 space-y-0.5 text-xs text-foreground-secondary list-disc list-inside">{(ctx.risques as string[]).map((r, i) => <li key={i}>{r}</li>)}</ul>
                              : <p className="text-xs text-foreground-secondary">{String(ctx.risques)}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Driver specs */}
              {detailData.driver && (
                <div className="rounded-lg border border-border bg-background/50 p-4">
                  <p className="mb-2 text-xs font-medium text-foreground-muted uppercase">Driver</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-foreground-muted">Nom:</span>{" "}
                      <span className="text-white">{detailData.driver.name}</span>
                    </div>
                    <div>
                      <span className="text-foreground-muted">Canal:</span>{" "}
                      <span className="text-white">{detailData.driver.channel}</span>
                    </div>
                    {!!(detailData.driver as Record<string, unknown>).formatSpecs && (
                      <div className="col-span-2">
                        <span className="text-foreground-muted">Format:</span>{" "}
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
                    <p className="text-xs font-medium text-foreground-muted">Date limite</p>
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
                    <p className="text-xs font-medium text-foreground-muted">Budget</p>
                    <p className="mt-1 text-sm text-white">{formatXAF(budget)}</p>
                  </div>
                )}
              </div>

              {/* Pillar impact */}
              {missionPillars && Object.keys(missionPillars).length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-foreground-muted uppercase">
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
                          <div className="flex-1 h-2 rounded-full bg-background">
                            <div
                              className="h-full rounded-full bg-accent transition-all"
                              style={{ width: `${Math.min((v / 25) * 100, 100)}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-foreground-secondary w-8 text-right">
                            {typeof v === "number" ? v.toFixed(0) : v}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Status transitions */}
              {nextStatuses.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-foreground-muted uppercase">Transition de statut</p>
                  <div className="flex flex-wrap gap-2">
                    {nextStatuses.map((ns) => (
                      <button
                        key={ns}
                        onClick={() =>
                          updateMissionMutation.mutate({
                            id: detailData.id,
                            status: ns,
                          })
                        }
                        disabled={updateMissionMutation.isPending}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          ns === "CANCELLED"
                            ? "border border-error bg-error/30 text-error hover:bg-error/60"
                            : "border border-border bg-background text-foreground-secondary hover:bg-surface-raised hover:text-white"
                        }`}
                      >
                        {ns === "CANCELLED" ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowRight className="h-3.5 w-3.5" />
                        )}
                        {STAGE_LABELS[ns] ?? ns}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliverables */}
              <div>
                <p className="mb-2 text-xs font-medium text-foreground-muted uppercase">
                  Livrables ({deliverables.length})
                </p>
                {deliverables.length === 0 ? (
                  <p className="text-sm text-foreground-muted">Aucun livrable soumis.</p>
                ) : (
                  <div className="space-y-2">
                    {deliverables.map((d) => {
                      const dMeta = d as Record<string, unknown>;
                      const qcScore = dMeta.qcScore as number | undefined;
                      const qcReview = dMeta.qcReview as string | undefined;
                      return (
                        <div
                          key={d.id}
                          className="rounded-lg border border-border bg-background/50 px-4 py-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileCheck className="h-4 w-4 text-foreground-muted" />
                              <span className="text-sm text-white">{d.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {qcScore != null && (
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                    qcScore >= 80
                                      ? "bg-success/15 text-success"
                                      : qcScore >= 60
                                        ? "bg-warning/15 text-warning"
                                        : "bg-error/15 text-error"
                                  }`}
                                >
                                  QC {qcScore}/100
                                </span>
                              )}
                              <StatusBadge status={d.status} />
                            </div>
                          </div>
                          {qcReview && (
                            <p className="mt-2 text-xs text-foreground-secondary border-t border-border pt-2">
                              {qcReview}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Commissions (from DB relation) */}
              {commissions && commissions.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-foreground-muted uppercase">Commissions</p>
                  <div className="space-y-2">
                    {commissions.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-4 py-3"
                      >
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-foreground-muted">Brut:</span>{" "}
                            <span className="text-white">{c.grossAmount.toLocaleString("fr-FR")} {c.currency}</span>
                          </div>
                          <div>
                            <span className="text-foreground-muted">Net:</span>{" "}
                            <span className="text-white">{c.netAmount.toLocaleString("fr-FR")} {c.currency}</span>
                          </div>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Commission status (from advertis_vector - legacy) */}
              {commission && (
                <div className="rounded-lg border border-border bg-background/50 p-4">
                  <p className="mb-2 text-xs font-medium text-foreground-muted uppercase">Commission</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {commission.amount != null && (
                      <div>
                        <span className="text-foreground-muted">Montant:</span>{" "}
                        <span className="text-white">
                          {(commission.amount as number).toLocaleString("fr-FR")} EUR
                        </span>
                      </div>
                    )}
                    {!!commission.status && (
                      <div>
                        <span className="text-foreground-muted">Statut:</span>{" "}
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

      {/* ════════════════════════════════════════════════════════════════
          P2 MODAL 1 — Create mission
          ═══════════════════════════════════════════════════════════════ */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nouvelle mission" size="lg">
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Base fields */}
          <div className="space-y-4">
            <FormField label="Titre de la mission" required>
              <input
                type="text"
                value={newMission.title}
                onChange={(e) => setNewMission({ ...newMission, title: e.target.value })}
                placeholder="Ex: Creation spot radio 60s — lancement SPAWT"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
              />
            </FormField>
            <FormField label="Description">
              <textarea
                value={newMission.description}
                onChange={(e) => setNewMission({ ...newMission, description: e.target.value })}
                rows={2}
                placeholder="Contexte et perimetre de la mission..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
              />
            </FormField>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Mode">
                <select
                  value={newMission.mode}
                  onChange={(e) => setNewMission({ ...newMission, mode: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong"
                >
                  <option value="DISPATCH">DISPATCH</option>
                  <option value="COLLABORATIF">COLLABORATIF</option>
                </select>
              </FormField>
              <FormField label="Priorite (1=critique)">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={newMission.priority}
                  onChange={(e) => setNewMission({ ...newMission, priority: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong"
                />
              </FormField>
              <FormField label="Budget (XAF)">
                <input
                  type="number"
                  value={newMission.budget}
                  onChange={(e) => setNewMission({ ...newMission, budget: e.target.value })}
                  placeholder="Ex: 250000"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong"
                />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Deadline SLA">
                <input
                  type="datetime-local"
                  value={newMission.slaDeadline}
                  onChange={(e) => setNewMission({ ...newMission, slaDeadline: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong"
                />
              </FormField>
              <FormField label="ID Campagne">
                <input
                  type="text"
                  value={newMission.campaignId}
                  onChange={(e) => setNewMission({ ...newMission, campaignId: e.target.value })}
                  placeholder="ID de la campagne (optionnel)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
                />
              </FormField>
            </div>
          </div>

          {/* Brief data */}
          <div className="rounded-lg border border-border bg-background/50 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground-secondary">Brief creatif</p>
            <FormField label="Objectif">
              <input
                type="text"
                value={newMission.objective}
                onChange={(e) => setNewMission({ ...newMission, objective: e.target.value })}
                placeholder="Ex: Augmenter la notoriete de 15pts en 3 mois"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
              />
            </FormField>
            <FormField label="Persona cible">
              <input
                type="text"
                value={newMission.targetPersona}
                onChange={(e) => setNewMission({ ...newMission, targetPersona: e.target.value })}
                placeholder="Ex: Entrepreneurs 25-40 ans, urbains, digitaux"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
              />
            </FormField>
            <FormField label="Message cle">
              <input
                type="text"
                value={newMission.keyMessage}
                onChange={(e) => setNewMission({ ...newMission, keyMessage: e.target.value })}
                placeholder="Ex: SPAWT — La plateforme qui transforme ton audience en revenus"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
              />
            </FormField>
            <FormField label="Livrables attendus">
              <textarea
                value={newMission.deliverablesExpected}
                onChange={(e) => setNewMission({ ...newMission, deliverablesExpected: e.target.value })}
                rows={2}
                placeholder="Ex: 1 spot radio 60s, 3 variantes 30s, guide de diffusion"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
              />
            </FormField>
          </div>

          {createMutation.error && (
            <div className="rounded-lg border border-error/50 bg-error/20 p-3 text-xs text-error">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {createMutation.error.message}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-raised"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (!newMission.title.trim() || !strategyId) return;
                const briefData: Record<string, unknown> = {};
                if (newMission.objective) briefData.objective = newMission.objective;
                if (newMission.targetPersona) briefData.targetPersona = newMission.targetPersona;
                if (newMission.keyMessage) briefData.keyMessage = newMission.keyMessage;
                if (newMission.deliverablesExpected) briefData.deliverablesExpected = newMission.deliverablesExpected;
                createMutation.mutate({
                  title: newMission.title,
                  strategyId,
                  description: newMission.description || undefined,
                  mode: newMission.mode as "DISPATCH" | "COLLABORATIF",
                  priority: parseInt(newMission.priority) || 3,
                  budget: newMission.budget ? parseFloat(newMission.budget) : undefined,
                  slaDeadline: newMission.slaDeadline || undefined,
                  campaignId: newMission.campaignId || undefined,
                  ...(Object.keys(briefData).length > 0 ? { briefData } : {}),
                });
              }}
              disabled={!newMission.title.trim() || createMutation.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50"
            >
              {createMutation.isPending ? "Creation..." : "Creer la mission"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          P2 MODAL 2 — Talent matching + assign
          ═══════════════════════════════════════════════════════════════ */}
      <Modal
        open={!!suggestTarget}
        onClose={() => setSuggestTarget(null)}
        title="Matching Talent — Top candidats"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-xs text-foreground-muted">
            Le moteur de matching analyse la compatibilite tier, specialite driver, alignement ADVE et taux de premier passage.
          </p>
          {suggestQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-foreground-secondary">
              <Zap className="h-4 w-4 animate-pulse text-accent" />
              Analyse en cours...
            </div>
          )}
          {suggestQuery.error && (
            <div className="rounded-lg border border-error/50 bg-error/20 p-3 text-xs text-error">
              <AlertTriangle className="mr-2 inline h-3.5 w-3.5" />
              {suggestQuery.error.message}
            </div>
          )}
          {suggestQuery.data && (() => {
            const candidates = suggestQuery.data as unknown as Array<{
              userId: string;
              displayName?: string;
              tier: string;
              score: number;
              breakdown?: Record<string, number>;
            }>;
            if (candidates.length === 0) {
              return <p className="text-sm text-foreground-muted">Aucun talent disponible correspondant a cette mission.</p>;
            }
            return (
              <div className="space-y-3">
                {candidates.map((c, idx) => (
                  <div
                    key={c.userId}
                    className={`rounded-lg border p-4 ${idx === 0 ? "border-accent bg-accent/20" : "border-border bg-background/50"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Rank badge */}
                        <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? "bg-accent/30 text-accent" : idx === 1 ? "bg-surface-raised text-foreground-secondary" : "bg-background text-foreground-muted"}`}>
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {c.displayName ?? c.userId.slice(0, 12)}
                          </p>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="rounded bg-background px-1.5 py-0.5 text-[10px] font-bold text-foreground-secondary">
                              {c.tier}
                            </span>
                            <span className="text-xs text-foreground-secondary">
                              Score: <span className={`font-semibold ${c.score >= 70 ? "text-success" : c.score >= 50 ? "text-warning" : "text-foreground-secondary"}`}>{c.score}/100</span>
                            </span>
                          </div>
                          {c.breakdown && (
                            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-foreground-muted">
                              {Object.entries(c.breakdown).map(([k, v]) => (
                                <span key={k}>{getFieldLabel(k)}: <span className="text-foreground-secondary">{v}</span></span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (!suggestTarget) return;
                          assignMutation.mutate({ missionId: suggestTarget, assigneeId: c.userId });
                        }}
                        disabled={assignMutation.isPending}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Assigner
                      </button>
                    </div>
                    {/* Score bar */}
                    <div className="mt-3 h-1.5 w-full rounded-full bg-background">
                      <div
                        className={`h-1.5 rounded-full transition-all ${idx === 0 ? "bg-accent" : "bg-surface-elevated"}`}
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
          {assignMutation.isSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-success bg-success/20 p-3 text-xs text-success">
              <Award className="h-4 w-4" />
              Talent assigne avec succes. La mission est maintenant EN_COURS.
            </div>
          )}
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          P2 MODAL 3 — Submit deliverable
          ═══════════════════════════════════════════════════════════════ */}
      <Modal
        open={!!submitTarget}
        onClose={() => setSubmitTarget(null)}
        title={`Soumettre un livrable — ${submitTarget?.title ?? ""}`}
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-blue-950/20 border border-blue-800/40 p-3 text-xs text-blue-300">
            <Send className="h-4 w-4 shrink-0" />
            Le livrable sera soumis en revue QC. Un reviewer sera automatiquement assigne selon le tier.
          </div>
          <FormField label="Titre du livrable" required>
            <input
              type="text"
              value={newDeliverable.title}
              onChange={(e) => setNewDeliverable({ ...newDeliverable, title: e.target.value })}
              placeholder="Ex: Spot radio 60s — Version finale"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
            />
          </FormField>
          <FormField label="URL du fichier">
            <input
              type="url"
              value={newDeliverable.fileUrl}
              onChange={(e) => setNewDeliverable({ ...newDeliverable, fileUrl: e.target.value })}
              placeholder="https://drive.google.com/..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
            />
          </FormField>
          <FormField label="Description / notes">
            <textarea
              value={newDeliverable.description}
              onChange={(e) => setNewDeliverable({ ...newDeliverable, description: e.target.value })}
              rows={2}
              placeholder="Contexte, version, remarques..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
            />
          </FormField>
          {submitDeliverableMutation.error && (
            <div className="rounded-lg border border-error/50 bg-error/20 p-3 text-xs text-error">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {submitDeliverableMutation.error.message}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setSubmitTarget(null)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-raised"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (!submitTarget || !newDeliverable.title.trim()) return;
                submitDeliverableMutation.mutate({
                  missionId: submitTarget.missionId,
                  title: newDeliverable.title,
                  fileUrl: newDeliverable.fileUrl || undefined,
                  description: newDeliverable.description || undefined,
                });
              }}
              disabled={!newDeliverable.title.trim() || submitDeliverableMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {submitDeliverableMutation.isPending ? "Soumission..." : "Soumettre"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════
          P2 MODAL 4 — QC Review
          ═══════════════════════════════════════════════════════════════ */}
      <Modal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title={`QC Review — ${reviewTarget?.deliverableTitle ?? ""}`}
        size="md"
      >
        <div className="space-y-5">
          <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/20 p-3 text-xs text-accent">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            Revue qualite structuree. Le verdict determine le statut du livrable et declenche la boucle feedback.
          </div>

          {/* Verdict */}
          <FormField label="Verdict" required>
            <div className="grid grid-cols-2 gap-2">
              {[
                { v: "ACCEPTED", label: "Accepte", color: "border-success bg-success/30 text-success" },
                { v: "MINOR_REVISION", label: "Revision mineure", color: "border-warning bg-warning/30 text-warning" },
                { v: "MAJOR_REVISION", label: "Revision majeure", color: "border-orange-700 bg-orange-950/30 text-orange-300" },
                { v: "REJECTED", label: "Rejete", color: "border-error bg-error/30 text-error" },
              ].map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setQcVerdict(opt.v)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${qcVerdict === opt.v ? opt.color + " ring-2 ring-offset-1 ring-offset-zinc-950" : "border-border bg-background text-foreground-secondary hover:border-border"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </FormField>

          {/* Score */}
          <FormField label={`Score global: ${qcScore}/10`} required>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={qcScore}
              onChange={(e) => setQcScore(parseFloat(e.target.value))}
              className="w-full accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-foreground-muted">
              <span>0 — Inacceptable</span>
              <span>5 — Moyen</span>
              <span>10 — Parfait</span>
            </div>
          </FormField>

          {/* Pillar scores (compact) */}
          <div>
            <p className="mb-2 text-xs font-medium text-foreground-muted uppercase">Scores piliers ADVE-RTIS (optionnel)</p>
            <div className="grid grid-cols-4 gap-2">
              {[...PILLAR_STORAGE_KEYS].map((pk) => (
                <div key={pk}>
                  <p className="mb-1 text-[10px] text-foreground-muted text-center">{pk.toUpperCase()}</p>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={qcPillarScores[pk] ?? ""}
                    placeholder="—"
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-center text-xs text-white outline-none focus:border-border-strong"
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setQcPillarScores((prev) => {
                        const next = { ...prev };
                        if (!isNaN(val)) next[pk] = val;
                        else delete next[pk];
                        return next;
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <FormField label="Feedback" required>
            <textarea
              value={qcFeedback}
              onChange={(e) => setQcFeedback(e.target.value)}
              rows={4}
              placeholder="Detaillez les points forts, axes d'amelioration, et contexte du verdict..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
            />
          </FormField>

          {reviewDeliverableMutation.error && (
            <div className="rounded-lg border border-error/50 bg-error/20 p-3 text-xs text-error">
              <AlertTriangle className="mr-2 inline h-4 w-4" />
              {reviewDeliverableMutation.error.message}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setReviewTarget(null)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-raised"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (!reviewTarget || !qcFeedback.trim()) return;
                reviewDeliverableMutation.mutate({
                  deliverableId: reviewTarget.deliverableId,
                  verdict: qcVerdict as "ACCEPTED" | "MINOR_REVISION" | "MAJOR_REVISION" | "REJECTED",
                  overallScore: qcScore,
                  feedback: qcFeedback,
                  ...(Object.keys(qcPillarScores).length > 0 ? { pillarScores: qcPillarScores } : {}),
                });
              }}
              disabled={!qcFeedback.trim() || reviewDeliverableMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent disabled:opacity-50"
            >
              <ClipboardCheck className="h-4 w-4" />
              {reviewDeliverableMutation.isPending ? "Soumission..." : "Soumettre le verdict"}
            </button>
          </div>
        </div>
      </Modal>

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
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
              />
            </FormField>

            <FormField label="Date limite">
              <input
                type="date"
                value={editTarget.deadline}
                onChange={(e) =>
                  setEditTarget({ ...editTarget, deadline: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
              />
            </FormField>

            {(updateMissionMutation.error || setDeadlineMutation.error) && (
              <div className="rounded-lg border border-error/50 bg-error/20 p-3 text-sm text-error">
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                {updateMissionMutation.error?.message ?? setDeadlineMutation.error?.message}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditTarget(null)}
                className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-raised"
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
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50"
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

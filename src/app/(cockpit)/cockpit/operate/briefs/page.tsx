"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs } from "@/components/shared/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchFilter } from "@/components/shared/search-filter";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { PILLAR_KEYS, PILLAR_NAMES, type PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_TAG_BG } from "@/components/shared/pillar-content-card";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  FileText,
  AlertTriangle,
  Clock,
  Target,
  CheckCircle,
  Plus,
  Send,
  ChevronDown,
  ChevronUp,
  Megaphone,
  DollarSign,
  User,
  ClipboardList,
  ListChecks,
  TrendingUp,
  ArrowRight,
  Zap,
} from "lucide-react";

/* ─── helpers ────────────────────────────────────────────────────────────── */

const BRIEF_STATUSES = ["DRAFT", "SUBMITTED", "VALIDATED", "ASSIGNED"] as const;
const BRIEF_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumis",
  VALIDATED: "Validé",
  ASSIGNED: "Assigné",
};
const BRIEF_STATUS_VARIANTS: Record<string, string> = {
  DRAFT: "bg-zinc-400/15 text-foreground-secondary ring-zinc-400/30",
  SUBMITTED: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
  VALIDATED: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  ASSIGNED: "bg-accent/15 text-accent ring-violet-400/30",
  IN_PROGRESS: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  COMPLETED: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
};

function formatXAF(v: number) {
  return v.toLocaleString("fr-FR") + " XAF";
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-0.5 text-xs text-foreground">{value}</p>
    </div>
  );
}

/* ─── Expandable brief card ──────────────────────────────────────────────── */

type Mission = {
  id: string;
  title: string;
  status: string;
  priority?: number | null;
  budget?: number | null;
  slaDeadline?: string | null;
  briefData?: unknown;
  advertis_vector?: unknown;
  driver?: { channel: string; name: string } | null;
  campaign?: { id: string; name: string; state: string } | null;
  deliverables?: Array<{ id: string; title: string; status: string; fileUrl?: string | null; createdAt: unknown }>;
};

function BriefCard({ m, getBriefStatus }: { m: Mission; getBriefStatus: (m: Mission) => string }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const bd = (m.briefData ?? {}) as Record<string, unknown>;
  const meta = (m.advertis_vector ?? {}) as Record<string, unknown>;
  const briefStatus = getBriefStatus(m);

  // Key info — prefer briefData, fall back to advertis_vector
  const objective = (bd.objective as string) || (meta.objective as string) || m.title;
  const persona = (bd.targetPersona as string) || (meta.targetPersona as string);
  const keyMessage = (bd.keyMessage as string) || (meta.keyMessage as string);
  const deliverablesExpected = (bd.deliverablesExpected as string) || (meta.deliverables as string);
  const deadlineStr = (bd.deadline as string) || (meta.deadline as string) || (m.slaDeadline ? new Date(m.slaDeadline as string).toISOString().split("T")[0] : null);
  const budget = (bd.budget as number) || (meta.budget as number) || (m.budget as number);
  const pillarPriority = (bd.pillarPriority as string[]) || [];
  const missionCtx = (bd.missionContext as Record<string, unknown>) || {};
  const metriques = (missionCtx.metriques as Record<string, unknown>) || {};
  const risques = (missionCtx.risques as string[]) || [];
  const deliverables = m.deliverables ?? [];

  return (
    <div className="rounded-xl border border-border bg-background/80 overflow-hidden transition-colors hover:border-border">
      {/* ── Card header (always visible) ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title + status */}
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-white leading-snug">{m.title}</h4>
              <StatusBadge status={briefStatus} variantMap={BRIEF_STATUS_VARIANTS} />
            </div>

            {/* Campaign + mission link row */}
            {m.campaign && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-foreground-muted">
                <span className="flex items-center gap-1">
                  <Megaphone className="h-3 w-3 text-foreground-muted" />
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/cockpit/operate/campaigns/${m.campaign!.id}`); }}
                    className="text-accent hover:text-accent hover:underline"
                  >
                    {m.campaign.name}
                  </button>
                </span>
                <span className="flex items-center gap-1">
                  <ArrowRight className="h-2.5 w-2.5" />
                  <span className="text-foreground-secondary">Mission #{m.priority ?? "—"}</span>
                  <span className={`rounded-full px-1.5 py-px text-[9px] font-semibold ${
                    m.status === "COMPLETED" ? "bg-emerald-500/15 text-emerald-400" :
                    m.status === "IN_PROGRESS" ? "bg-blue-500/15 text-blue-400" :
                    "bg-surface-raised text-foreground-secondary"
                  }`}>{m.status}</span>
                </span>
              </div>
            )}

            {/* Objective preview */}
            {objective && (
              <p className="mt-2 text-xs text-foreground-secondary line-clamp-2 leading-relaxed">
                {objective}
              </p>
            )}

            {/* Chips: deadline, budget, driver */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-foreground-muted">
              {deadlineStr && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(deadlineStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
              {budget > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatXAF(budget)}
                </span>
              )}
              {m.driver && (
                <span className="flex items-center gap-1 text-accent/70">
                  <Zap className="h-3 w-3" />
                  {m.driver.channel} · {m.driver.name}
                </span>
              )}
              {deliverables.length > 0 && (
                <span className="flex items-center gap-1 text-foreground-secondary">
                  <ListChecks className="h-3 w-3" />
                  {deliverables.length} livrable{deliverables.length > 1 ? "s" : ""} soumis
                </span>
              )}
            </div>
          </div>

          {/* Expand chevron */}
          <div className="mt-0.5 flex-shrink-0 text-foreground-muted">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="border-t border-border px-4 pb-5 pt-4 space-y-4 bg-background/40">

          {/* Objective full */}
          {objective && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted flex items-center gap-1.5 mb-1.5">
                <Target className="h-3 w-3" /> Objectif
              </p>
              <p className="text-sm text-foreground leading-relaxed">{objective}</p>
            </div>
          )}

          {/* Persona + message clé */}
          {(persona || keyMessage) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {persona && (
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted flex items-center gap-1 mb-1.5">
                    <User className="h-3 w-3" /> Persona cible
                  </p>
                  <p className="text-xs text-foreground-secondary leading-relaxed">{persona}</p>
                </div>
              )}
              {keyMessage && (
                <div className="rounded-lg border border-border bg-background/60 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted flex items-center gap-1 mb-1.5">
                    <Send className="h-3 w-3" /> Message clé
                  </p>
                  <p className="text-xs text-accent italic leading-relaxed">"{keyMessage}"</p>
                </div>
              )}
            </div>
          )}

          {/* Livrables attendus */}
          {deliverablesExpected && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted flex items-center gap-1.5 mb-1.5">
                <ClipboardList className="h-3 w-3" /> Livrables attendus
              </p>
              <p className="text-xs text-foreground-secondary leading-relaxed whitespace-pre-line">{deliverablesExpected}</p>
            </div>
          )}

          {/* KPIs / métriques */}
          {Object.keys(metriques).length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted flex items-center gap-1.5 mb-2">
                <TrendingUp className="h-3 w-3" /> KPIs cibles
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(metriques).map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-border bg-background/60 p-2.5">
                    <p className="text-[10px] text-foreground-muted capitalize">{k.replace(/([A-Z])/g, " $1").trim()}</p>
                    <p className="text-sm font-semibold text-white">{String(v)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risques */}
          {risques.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600/80 flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="h-3 w-3" /> Risques identifiés
              </p>
              <ul className="space-y-1">
                {risques.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground-secondary">
                    <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500/60" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pillar priorities */}
          {pillarPriority.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted mb-1.5">Piliers prioritaires</p>
              <div className="flex flex-wrap gap-1.5">
                {pillarPriority.map((k, i) => (
                  <span key={k} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PILLAR_TAG_BG[k as PillarKey] ?? "bg-background text-foreground-secondary"}`}>
                    {i + 1}. {k.toUpperCase()} — {PILLAR_NAMES[k as PillarKey] ?? k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Livrables soumis (actuels) */}
          {deliverables.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-foreground-muted flex items-center gap-1.5 mb-2">
                <ListChecks className="h-3 w-3" /> Livrables soumis ({deliverables.length})
              </p>
              <div className="space-y-1.5">
                {deliverables.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-border bg-background/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className={`h-3.5 w-3.5 flex-shrink-0 ${d.status === "ACCEPTED" ? "text-emerald-400" : "text-foreground-muted"}`} />
                      <div>
                        <p className="text-xs font-medium text-white">{d.title}</p>
                        {d.fileUrl && <p className="text-[10px] text-foreground-muted font-mono">{d.fileUrl}</p>}
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Go to mission / campaign CTA */}
          <div className="flex gap-2 pt-1">
            {m.campaign && (
              <button
                onClick={() => router.push(`/cockpit/operate/campaigns/${m.campaign!.id}`)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-raised transition-colors"
              >
                <Megaphone className="h-3 w-3" />
                Voir la campagne
              </button>
            )}
            <button
              onClick={() => router.push(`/cockpit/operate/missions`)}
              className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground-secondary hover:bg-surface-raised transition-colors"
            >
              <ArrowRight className="h-3 w-3" />
              Voir la mission
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function BriefsPage() {
  const strategyId = useCurrentStrategyId();
  const [activeTab, setActiveTab] = useState("in_progress");
  const [search, setSearch] = useState("");
  const [showBuilder, setShowBuilder] = useState(false);
  const [briefForm, setBriefForm] = useState({
    objective: "",
    targetPersona: "",
    keyMessage: "",
    pillarPriority: [] as PillarKey[],
    driverId: "",
    budget: "",
    deadline: "",
    deliverables: "",
  });
  const [briefErrors, setBriefErrors] = useState<Record<string, string>>({});

  const missionsQuery = trpc.mission.list.useQuery(
    { strategyId: strategyId!, limit: 100 },
    { enabled: !!strategyId },
  );
  const driversQuery = trpc.driver.list.useQuery(
    { strategyId: strategyId! },
    { enabled: !!strategyId },
  );
  const utils = trpc.useUtils();
  const createMission = trpc.mission.create.useMutation({
    onSuccess: () => {
      utils.mission.list.invalidate();
      setShowBuilder(false);
      setBriefForm({ objective: "", targetPersona: "", keyMessage: "", pillarPriority: [], driverId: "", budget: "", deadline: "", deliverables: "" });
      setBriefErrors({});
    },
  });

  if (!strategyId || missionsQuery.isLoading) return <SkeletonPage />;

  if (missionsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Briefs" />
        <div className="rounded-xl border border-red-900/50 bg-error/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-error" />
          <p className="mt-2 text-sm text-error">{missionsQuery.error.message}</p>
        </div>
      </div>
    );
  }

  const allMissions = (missionsQuery.data ?? []) as Mission[];
  const drivers = driversQuery.data ?? [];
  const selectedDriver = drivers.find((d) => d.id === briefForm.driverId);

  const getBriefStatus = (m: Mission) => {
    if (m.status === "COMPLETED") return "VALIDATED";
    if (m.deliverables?.some((d) => d.status === "PENDING")) return "SUBMITTED";
    return m.status;
  };

  // Missions that have briefData (or at least a description with brief intent)
  const withBrief = allMissions.filter((m) => {
    const bd = m.briefData as Record<string, unknown> | null;
    const meta = m.advertis_vector as Record<string, unknown> | null;
    return (bd && Object.keys(bd).length > 0) || (meta && (meta.objective || meta.deadline || meta.deliverables));
  });

  const inProgress = withBrief.filter((m) => m.status === "IN_PROGRESS" || m.status === "DRAFT");
  const submitted = withBrief.filter((m) => m.deliverables?.some((d) => d.status === "PENDING"));
  const validated = withBrief.filter((m) => m.status === "COMPLETED");

  const tabFiltered =
    activeTab === "in_progress" ? inProgress
    : activeTab === "submitted" ? submitted
    : validated;

  const missions = tabFiltered.filter(
    (m) => !search || m.title.toLowerCase().includes(search.toLowerCase()),
  );

  const tabs = [
    { key: "in_progress", label: "En cours", count: inProgress.length },
    { key: "submitted", label: "Soumis", count: submitted.length },
    { key: "validated", label: "Validés", count: validated.length },
  ];

  const validateBrief = () => {
    const e: Record<string, string> = {};
    if (!briefForm.objective.trim()) e.objective = "L'objectif est requis.";
    if (!briefForm.keyMessage.trim()) e.keyMessage = "Le message clé est requis.";
    setBriefErrors(e);
    return Object.keys(e).length === 0;
  };

  const togglePillar = (k: PillarKey) =>
    setBriefForm((prev) => ({
      ...prev,
      pillarPriority: prev.pillarPriority.includes(k)
        ? prev.pillarPriority.filter((p) => p !== k)
        : [...prev.pillarPriority, k],
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Briefs"
        description="Suivez vos briefs de mission, de la création à la validation."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Opérations" },
          { label: "Briefs" },
        ]}
      >
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground"
        >
          <Plus className="h-4 w-4" />
          Nouveau brief
        </button>
      </PageHeader>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <SearchFilter placeholder="Rechercher un brief..." value={search} onChange={setSearch} />

      {missions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={activeTab === "in_progress" ? "Aucun brief en cours" : activeTab === "submitted" ? "Aucun brief soumis" : "Aucun brief validé"}
          description="Les briefs apparaîtront ici une fois les missions créées avec leur contenu de brief."
        />
      ) : (
        <div className="space-y-3">
          {missions.map((m) => (
            <BriefCard key={m.id} m={m} getBriefStatus={getBriefStatus} />
          ))}
        </div>
      )}

      {/* Builder modal */}
      <Modal open={showBuilder} onClose={() => setShowBuilder(false)} title="Nouveau brief" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <FormField label="Objectif" required error={briefErrors.objective}>
            <textarea
              value={briefForm.objective}
              onChange={(e) => setBriefForm({ ...briefForm, objective: e.target.value })}
              rows={2}
              placeholder="Définissez l'objectif principal du brief..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
            />
          </FormField>

          <FormField label="Persona cible">
            <input
              type="text"
              value={briefForm.targetPersona}
              onChange={(e) => setBriefForm({ ...briefForm, targetPersona: e.target.value })}
              placeholder="Ex: foodies 25-35 ans, Abidjan, 2000+ followers"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
            />
          </FormField>

          <FormField label="Message clé" required error={briefErrors.keyMessage}>
            <textarea
              value={briefForm.keyMessage}
              onChange={(e) => setBriefForm({ ...briefForm, keyMessage: e.target.value })}
              rows={2}
              placeholder="Le message principal à communiquer..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
            />
          </FormField>

          <FormField label="Livrables attendus" helpText="Un livrable par ligne">
            <textarea
              value={briefForm.deliverables}
              onChange={(e) => setBriefForm({ ...briefForm, deliverables: e.target.value })}
              rows={3}
              placeholder="Ex: 26 interviews foodies&#10;20 restaurants visités&#10;Rapport terrain"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
            />
          </FormField>

          <FormField label="Piliers prioritaires ADVE-RTIS">
            <div className="flex flex-wrap gap-2">
              {PILLAR_KEYS.map((k) => {
                const sel = briefForm.pillarPriority.includes(k);
                return (
                  <button key={k} type="button" onClick={() => togglePillar(k)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${sel ? PILLAR_TAG_BG[k] + " ring-1 ring-inset ring-current" : "bg-background text-foreground-muted hover:text-foreground-secondary"}`}
                  >
                    {k.toUpperCase()} — {PILLAR_NAMES[k]}
                  </button>
                );
              })}
            </div>
          </FormField>

          <FormField label="Driver">
            <select
              value={briefForm.driverId}
              onChange={(e) => setBriefForm({ ...briefForm, driverId: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong"
            >
              <option value="">Sélectionner un driver...</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.channel})</option>)}
            </select>
          </FormField>

          {selectedDriver && (
            <div className="rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs text-foreground-secondary">
              <p className="text-accent font-semibold mb-1">{selectedDriver.channel} · {selectedDriver.name}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Budget (XAF)">
              <input type="number" value={briefForm.budget}
                onChange={(e) => setBriefForm({ ...briefForm, budget: e.target.value })}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-border-strong"
              />
            </FormField>
            <FormField label="Date limite">
              <input type="date" value={briefForm.deadline}
                onChange={(e) => setBriefForm({ ...briefForm, deadline: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white outline-none focus:border-border-strong"
              />
            </FormField>
          </div>

          <button
            type="button"
            disabled={createMission.isPending}
            onClick={() => {
              if (!validateBrief()) return;
              const pillarPriorities: Record<string, number> = {};
              briefForm.pillarPriority.forEach((k, i) => { pillarPriorities[k] = briefForm.pillarPriority.length - i; });
              createMission.mutate({
                title: briefForm.objective,
                strategyId: strategyId!,
                driverId: briefForm.driverId || undefined,
                advertis_vector: { ...pillarPriorities },
                briefData: {
                  objective: briefForm.objective,
                  targetPersona: briefForm.targetPersona,
                  keyMessage: briefForm.keyMessage,
                  deliverablesExpected: briefForm.deliverables,
                  pillarPriority: briefForm.pillarPriority,
                  budget: briefForm.budget ? Number(briefForm.budget) : undefined,
                  deadline: briefForm.deadline || undefined,
                },
              });
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50"
          >
            {createMission.isPending ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" /> : <Send className="h-4 w-4" />}
            {createMission.isPending ? "Création..." : "Créer le brief"}
          </button>

          {createMission.error && (
            <p className="mt-2 text-xs text-error">{createMission.error.message}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}

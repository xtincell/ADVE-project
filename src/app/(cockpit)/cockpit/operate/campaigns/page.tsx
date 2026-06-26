"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs } from "@/components/shared/tabs";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScoreBadge } from "@/components/shared/score-badge";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchFilter } from "@/components/shared/search-filter";
import { Modal } from "@/components/shared/modal";
import { FormField } from "@/components/shared/form-field";
import { SkeletonPage, SkeletonCard } from "@/components/shared/loading-skeleton";
import { buildPillarContentMap } from "@/components/shared/pillar-content-card";
import { PILLAR_NAMES, PILLAR_KEYS, type PillarKey } from "@/lib/types/advertis-vector";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
// ── operate-config : source de vérité unique — aucune constante d'état en local
import {
  getCampaignStateConfig,
  getCampaignStateLabel,
  STATE_PHASE_GROUPS,
  ACTIVE_CAMPAIGN_STATES,
  formatCurrency,
} from "@/lib/operate-config";
import { CampaignPipeline } from "@/components/cockpit/campaign-pipeline";
import { CampaignStateBadge } from "@/components/cockpit/operate-status-badge";
import {
  Megaphone,
  Plus,
  AlertTriangle,
  Target,
  CheckCircle,
  Play,
  Clock,
  Rocket,
  ArrowRight,
  DollarSign,
  BarChart3,
  ShieldAlert,
  Users,
  GitBranch,
} from "lucide-react";

// PILLAR_BADGE_COLORS : propres aux piliers ADVE, pas liés aux enums campagne — OK ici
const PILLAR_BADGE_COLORS: Record<PillarKey, string> = {
  a: "bg-accent/15 text-accent border-accent/40",
  d: "bg-info/15 text-info border-info/40",
  v: "bg-success/15 text-success border-success/40",
  e: "bg-warning/15 text-warning border-warning/40",
  r: "bg-error/15 text-error border-error/40",
  t: "bg-info/15 text-info border-info/40",
  i: "bg-warning/15 text-warning border-warning/40",
  s: "bg-error/15 text-error border-error/40",
};

export default function CampaignsPage() {
  const strategyId = useCurrentStrategyId();
  const router = useRouter();

  const strategiesQuery = trpc.strategy.list.useQuery({});
  const pillarContentMap = buildPillarContentMap(
    strategiesQuery.data?.[0]?.pillars as Array<{ key: string; content: unknown }> | undefined,
  );
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState({ name: "", description: "", status: "ACTIVE", budget: "", startDate: "", endDate: "" });

  const campaignsQuery = trpc.campaign.list.useQuery(
    { strategyId: strategyId ?? undefined },
    { enabled: !!strategyId },
  );

  const overviewQuery = trpc.operationsOverview.overview.useQuery(undefined, { enabled: !!strategyId });
  const budgetQuery = trpc.operationsOverview.budgetConsolidation.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId }
  );
  const fieldOpProgressQuery = trpc.operationsOverview.fieldOpProgress.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId }
  );

  const createMutation = trpc.campaign.create.useMutation({
    onSuccess: () => {
      campaignsQuery.refetch();
      setShowCreate(false);
      setNewCampaign({ name: "", description: "", status: "ACTIVE", budget: "", startDate: "", endDate: "" });
    },
  });

  if (!strategyId || campaignsQuery.isLoading || overviewQuery.isLoading || budgetQuery.isLoading || fieldOpProgressQuery.isLoading) {
    return <SkeletonPage />;
  }

  if (campaignsQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campagnes" />
        <div className="rounded-xl border border-error/50 bg-error/20 p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-error" />
          <p className="mt-2 text-sm text-error">
            {campaignsQuery.error.message}
          </p>
        </div>
      </div>
    );
  }

  const allCampaigns = campaignsQuery.data ?? [];

  // Tab filtering — depuis STATE_PHASE_GROUPS de operate-config (jamais hardcodé)
  const getState = (c: { state?: string | null; status: string }) => c.state ?? c.status;
  const activeCampaigns    = allCampaigns.filter((c) => STATE_PHASE_GROUPS.active.includes(getState(c) as never));
  const productionCampaigns = allCampaigns.filter((c) => STATE_PHASE_GROUPS.production.includes(getState(c) as never));
  const completedCampaigns  = allCampaigns.filter((c) => STATE_PHASE_GROUPS.done.includes(getState(c) as never));

  const tabFiltered =
    activeTab === "all"
      ? allCampaigns
      : activeTab === "active"
        ? activeCampaigns
        : activeTab === "production"
          ? productionCampaigns
          : completedCampaigns;

  const campaigns = tabFiltered.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalMissions = allCampaigns.reduce(
    (sum, c) => sum + (c.missions?.length ?? 0),
    0,
  );

  const budgetLines = budgetQuery.data ?? [];
  const fieldOps = fieldOpProgressQuery.data ?? [];
  const overview = overviewQuery.data;

  const activeMissionsCount = (overview?.missions.IN_PROGRESS ?? 0) + (overview?.missions.REVIEW ?? 0);
  const totalSpent = budgetLines.reduce((acc, b) => acc + b.spent, 0);

  // Group budget consolidation by campaign ID
  const budgetMap = new Map(budgetLines.map(b => [b.id, b]));

  // Group field ops progress by campaign ID
  const fieldOpsMap = new Map<string, typeof fieldOps>();
  fieldOps.forEach(op => {
    if (op.campaign) {
      const list = fieldOpsMap.get(op.campaign.id) ?? [];
      list.push(op);
      fieldOpsMap.set(op.campaign.id, list);
    }
  });

  const tabs = [
    { key: "all", label: "Toutes", count: allCampaigns.length },
    { key: "active", label: "Actives", count: activeCampaigns.length },
    { key: "production", label: "Production", count: productionCampaigns.length },
    { key: "completed", label: "Terminees", count: completedCampaigns.length },
  ];

  const selectedCampaignData = selectedCampaign
    ? allCampaigns.find((c) => c.id === selectedCampaign)
    : null;

  const handleCreate = () => {
    if (!newCampaign.name.trim() || !strategyId) return;
    createMutation.mutate({
      name: newCampaign.name,
      strategyId,
      ...(newCampaign.description.trim() ? { description: newCampaign.description.trim() } : {}),
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campagnes"
        description="Suivez vos campagnes actives et leurs performances."
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Operations" },
          { label: "Campagnes" },
        ]}
      >
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground"
        >
          <Plus className="h-4 w-4" />
          Nouvelle campagne
        </button>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total campagnes"
          value={allCampaigns.length}
          icon={Megaphone}
          trend="flat"
          trendValue={`${totalMissions} mission${totalMissions !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Missions Actives"
          value={activeMissionsCount}
          icon={Play}
          trend={activeMissionsCount > 0 ? "up" : "flat"}
          trendValue="en exécution"
        />
        <StatCard
          title="Candidatures Guilde"
          value={overview?.openApplications ?? 0}
          icon={Users}
          trend={overview?.openApplications && overview.openApplications > 0 ? "up" : "flat"}
          trendValue="en attente"
        />
        <StatCard
          title="Budget Dépensé"
          value={`${totalSpent.toLocaleString("fr-FR")} XAF`}
          icon={DollarSign}
          trend="flat"
          trendValue="total cumulé"
        />
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Search */}
      <SearchFilter
        placeholder="Rechercher une campagne..."
        value={search}
        onChange={setSearch}
      />

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Aucune campagne"
          description="Creez votre premiere campagne pour organiser vos missions."
          action={{ label: "Creer une campagne", onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => {
            const meta = c.advertis_vector as Record<string, unknown> | null;
            const missions = c.missions ?? [];
            const composite = meta
              ? Object.values(meta).reduce((sum: number, v) => sum + (typeof v === "number" ? v : 0), 0 as number)
              : 0;
            const focusKeys = (
              Array.isArray(meta?.focus) ? meta.focus : PILLAR_KEYS.filter((k) => typeof meta?.[k] === "number" && (meta[k] as number) > 0)
            ) as PillarKey[];

            // Success status logic based on AARRR reports & targets
            const campaignOps = fieldOpsMap.get(c.id) ?? [];
            let totalProgress = 0;
            let totalTarget = 0;
            let hasReports = false;

            campaignOps.forEach(op => {
              const config = op.aarrConfig as Record<string, unknown> | null;
              const targets = {
                acquisition: typeof config?.acquisitionTarget === "number" ? config.acquisitionTarget : 100,
                activation: typeof config?.activationTarget === "number" ? config.activationTarget : 50,
                retention: typeof config?.retentionTarget === "number" ? config.retentionTarget : 20,
                revenue: typeof config?.revenueTarget === "number" ? config.revenueTarget : 10,
                referral: typeof config?.referralTarget === "number" ? config.referralTarget : 5,
              };
              
              const progress = op.metrics ?? {
                acquisition: 0,
                activation: 0,
                retention: 0,
                revenue: 0,
                referral: 0,
              };
              
              if (op.reportsCount > 0) {
                hasReports = true;
              }
              
              totalProgress += progress.acquisition + progress.activation + progress.retention + progress.revenue + progress.referral;
              totalTarget += targets.acquisition + targets.activation + targets.retention + targets.revenue + targets.referral;
            });

            let successStatus = "N/A";
            let successColor = "bg-foreground-muted/15 text-foreground-secondary ring-border/30";

            if (hasReports && totalTarget > 0) {
              const ratio = totalProgress / totalTarget;
              if (ratio >= 0.8) {
                successStatus = "Réussite Totale";
                successColor = "bg-success/15 text-success ring-success/30";
              } else if (ratio >= 0.3) {
                successStatus = "Réussite Partielle";
                successColor = "bg-warning/15 text-warning ring-warning/30";
              } else {
                successStatus = "Échec";
                successColor = "bg-error/15 text-error ring-error/30";
              }
            } else if (campaignOps.length > 0) {
              successStatus = "En cours";
              successColor = "bg-info/15 text-info ring-info/30";
            }

            const bData = budgetMap.get(c.id);

            return (
              <button
                key={c.id}
                onClick={() => router.push(`/cockpit/operate/campaigns/${c.id}`)}
                className="w-full rounded-xl border border-border bg-background/80 p-4 text-left transition-colors hover:border-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-semibold text-white">
                        {c.name}
                      </h4>
                      <CampaignStateBadge state={getState(c)} />
                      {successStatus !== "N/A" && (
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-semibold ring-1 ring-inset ${successColor}`}>
                          {successStatus}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-secondary">
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {missions.length} mission{missions.length !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(
                          c.createdAt as unknown as string,
                        ).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {bData ? (
                        <span className="flex items-center gap-1 text-white">
                          <DollarSign className="h-3 w-3 text-accent" />
                          <span>Dépensé : {bData.spent.toLocaleString("fr-FR")} / {bData.planned.toLocaleString("fr-FR")} XAF</span>
                        </span>
                      ) : (
                        (c as any).budget != null && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {((c as any).budget as number).toLocaleString("fr-FR")} XAF
                          </span>
                        )
                      )}
                      {((c as any).startDate || (c as any).endDate) && (
                        <span className="text-foreground-muted">
                          {(c as any).startDate
                            ? new Date((c as any).startDate as string).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                            : "?"}
                          {" "}→{" "}
                          {(c as any).endDate
                            ? new Date((c as any).endDate as string).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                            : "?"}
                        </span>
                      )}
                      {(c as any).code && (
                        <span className="rounded bg-background px-1.5 py-0.5 font-mono text-2xs text-foreground-secondary">
                          {(c as any).code}
                        </span>
                      )}
                    </div>
                    {/* Pillar focus badges */}
                    {focusKeys.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {focusKeys.map((k) => (
                          <span
                            key={k}
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-semibold ${PILLAR_BADGE_COLORS[k] ?? "bg-background text-foreground-secondary border-border"}`}
                          >
                            {k.toUpperCase()} {PILLAR_NAMES[k]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {meta && (composite as number) > 0 && (
                    <ScoreBadge score={composite as number} size="sm" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Campaign Detail Modal with State Transitions */}
      {selectedCampaignData && (
        <CampaignDetailModal
          campaign={selectedCampaignData}
          pillarContentMap={pillarContentMap}
          onClose={() => setSelectedCampaign(null)}
          onTransitionComplete={() => campaignsQuery.refetch()}
        />
      )}

      {/* Create campaign modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Nouvelle campagne"
        size="md"
      >
        <div className="space-y-4">
          <FormField label="Nom de la campagne" required>
            <input
              type="text"
              value={newCampaign.name}
              onChange={(e) =>
                setNewCampaign({ ...newCampaign, name: e.target.value })
              }
              placeholder="Ex: Campagne printemps 2026"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={newCampaign.description}
              onChange={(e) =>
                setNewCampaign({ ...newCampaign, description: e.target.value })
              }
              placeholder="Decrivez les objectifs et le contexte de la campagne..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
            />
          </FormField>

          <FormField label="Budget (XAF)">
            <input
              type="number"
              value={newCampaign.budget}
              onChange={(e) =>
                setNewCampaign({ ...newCampaign, budget: e.target.value })
              }
              placeholder="Ex: 5000000"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Date de debut">
              <input
                type="date"
                value={newCampaign.startDate}
                onChange={(e) =>
                  setNewCampaign({ ...newCampaign, startDate: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
              />
            </FormField>
            <FormField label="Date de fin">
              <input
                type="date"
                value={newCampaign.endDate}
                onChange={(e) =>
                  setNewCampaign({ ...newCampaign, endDate: e.target.value })
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-foreground-muted outline-none focus:border-border-strong focus:ring-1 focus:ring-border"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground-secondary hover:bg-surface-raised"
            >
              Annuler
            </button>
            <button
              onClick={handleCreate}
              disabled={!newCampaign.name.trim() || createMutation.isPending}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-foreground disabled:opacity-50"
            >
              {createMutation.isPending ? "Creation..." : "Creer"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* ============================
   Campaign Detail Modal
   ============================ */

interface CampaignDetailModalProps {
  campaign: {
    id: string;
    name: string;
    status: string;
    state?: string;
    createdAt: unknown;
    advertis_vector: unknown;
    missions?: Array<{ id: string; status: string }>;
  };
  pillarContentMap: Record<string, Record<string, unknown> | undefined>;
  onClose: () => void;
  onTransitionComplete: () => void;
}

// VALID_TRANSITIONS supprimé — transitions golées par getDisplayTransitions() depuis operate-config
// Validation finale toujours côté serveur via campaignManager.transition

function CampaignDetailModal({ campaign, pillarContentMap, onClose, onTransitionComplete }: CampaignDetailModalProps) {
  const campaignState = (campaign.state ?? campaign.status) as string;
  const stateCfg = getCampaignStateConfig(campaignState);

  // Fetch budget breakdown
  const budgetQuery = trpc.campaignManager.getBudgetBreakdown.useQuery(
    { campaignId: campaign.id },
  );

  // Fetch AARRR report si LIVE ou POST_CAMPAIGN
  const showAarrr = campaignState === "LIVE" || campaignState === "POST_CAMPAIGN";
  const aarrrQuery = trpc.campaignManager.getAARRReport.useQuery(
    { campaignId: campaign.id },
    { enabled: showAarrr },
  );

  const meta = campaign.advertis_vector as Record<string, unknown> | null;
  const missions = campaign.missions ?? [];
  const scores: Partial<Record<PillarKey, number>> = meta
    ? {
        a: (meta.a as number) ?? 0,
        d: (meta.d as number) ?? 0,
        v: (meta.v as number) ?? 0,
        e: (meta.e as number) ?? 0,
        r: (meta.r as number) ?? 0,
        t: (meta.t as number) ?? 0,
        i: (meta.i as number) ?? 0,
        s: (meta.s as number) ?? 0,
      }
    : {};
  const modalFocusKeys = (
    Array.isArray(meta?.focus) ? meta.focus : PILLAR_KEYS.filter((k) => typeof meta?.[k] === "number" && (meta[k] as number) > 0)
  ) as PillarKey[];

  const budget = budgetQuery.data as {
    total?: number;
    spent?: number;
    remaining?: number;
    breakdown?: Array<{ category: string; amount: number }>;
  } | null;
  const aarrrData = aarrrQuery.data as {
    stages?: Array<{ stage: string; metrics?: Array<{ metric: string; value: number; target?: number }> }>;
  } | null;

  return (
    <Modal
      open
      onClose={onClose}
      title={campaign.name}
      size="lg"
    >
      <div className="space-y-5">
        {/* Current state badge + date */}
        <div className="flex items-center gap-3">
          <CampaignStateBadge state={campaignState} />
          <span className="text-sm text-foreground-secondary">
            Creee le{" "}
            {new Date(campaign.createdAt as string).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          {(campaign as any).code && (
            <span className="rounded bg-background px-2 py-0.5 font-mono text-xs text-foreground-secondary">
              {(campaign as any).code}
            </span>
          )}
          {((campaign as any).startDate || (campaign as any).endDate) && (
            <span className="text-xs text-foreground-muted">
              {(campaign as any).startDate
                ? new Date((campaign as any).startDate as string).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                : "?"}
              {" "}→{" "}
              {(campaign as any).endDate
                ? new Date((campaign as any).endDate as string).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
                : "?"}
            </span>
          )}
        </div>

        {/* Pipeline 12 états — CampaignPipeline remplace les boutons de transition */}
        <div className="rounded-xl border border-border bg-background/50 p-4">
          <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <GitBranch className="h-4 w-4 text-accent" />
            Pipeline de la campagne
          </h4>
          <CampaignPipeline
            campaignId={campaign.id}
            currentState={campaignState}
            onTransitionComplete={onTransitionComplete}
          />
        </div>

        {/* Objectives */}
        {(() => {
          const objectives = (campaign as any).objectives as { primary?: string; secondary?: string; missions?: string[] } | null;
          if (!objectives) return null;
          return (
            <div className="rounded-lg border border-border bg-background/50 p-4">
              <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground-secondary">
                <Target className="h-4 w-4" />
                Objectifs
              </h4>
              <div className="space-y-2">
                {objectives.primary && (
                  <div>
                    <p className="text-2xs font-medium uppercase tracking-wide text-foreground-muted">Principal</p>
                    <p className="text-sm text-white">{objectives.primary}</p>
                  </div>
                )}
                {objectives.secondary && (
                  <div>
                    <p className="text-2xs font-medium uppercase tracking-wide text-foreground-muted">Secondaire</p>
                    <p className="text-sm text-white">{objectives.secondary}</p>
                  </div>
                )}
                {objectives.missions && objectives.missions.length > 0 && (
                  <div>
                    <p className="text-2xs font-medium uppercase tracking-wide text-foreground-muted">Missions liees</p>
                    <ul className="mt-1 space-y-0.5">
                      {objectives.missions.map((mid, idx) => (
                        <li key={idx} className="text-xs text-foreground-secondary">• {mid}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Budget Breakdown */}
        <div className="rounded-lg border border-border bg-background/50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground-secondary">
            <DollarSign className="h-4 w-4" />
            Budget
          </h4>
          {budgetQuery.isLoading ? (
            <p className="text-xs text-foreground-muted">Chargement du budget...</p>
          ) : budget ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-foreground-muted">Total</p>
                  <p className="text-sm font-semibold text-white">
                    {(budget.total ?? 0).toLocaleString("fr-FR")} XAF
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted">Depense</p>
                  <p className="text-sm font-semibold text-warning">
                    {(budget.spent ?? 0).toLocaleString("fr-FR")} XAF
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-muted">Restant</p>
                  <p className="text-sm font-semibold text-success">
                    {(budget.remaining ?? 0).toLocaleString("fr-FR")} XAF
                  </p>
                </div>
              </div>
              {budget.breakdown && budget.breakdown.length > 0 && (
                <div className="space-y-1.5 border-t border-border pt-3">
                  {budget.breakdown.map((item) => (
                    <div key={item.category} className="flex items-center justify-between text-xs">
                      <span className="text-foreground-secondary">{item.category}</span>
                      <span className="text-white">{item.amount.toLocaleString("fr-FR")} XAF</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-foreground-muted">Aucune donnee budgetaire.</p>
          )}
        </div>

        {/* AARRR Metrics (only for LIVE / POST_CAMPAIGN) */}
        {showAarrr && (
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground-secondary">
              <BarChart3 className="h-4 w-4" />
              Metriques AARRR
            </h4>
            {aarrrQuery.isLoading ? (
              <p className="text-xs text-foreground-muted">Chargement des metriques...</p>
            ) : aarrrData?.stages && aarrrData.stages.length > 0 ? (
              <div className="space-y-3">
                {aarrrData.stages.map((stage) => (
                  <div key={stage.stage} className="rounded-lg border border-border bg-background/60 p-3">
                    <h5 className="mb-2 text-xs font-semibold text-white">{stage.stage}</h5>
                    {stage.metrics && stage.metrics.length > 0 ? (
                      <div className="space-y-1">
                        {stage.metrics.map((m) => (
                          <div key={m.metric} className="flex items-center justify-between text-xs">
                            <span className="text-foreground-secondary">{m.metric}</span>
                            <span className="text-white">
                              {m.value}{m.target ? ` / ${m.target}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-foreground-muted">Aucune metrique.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-foreground-muted">Aucune metrique AARRR enregistree.</p>
            )}
          </div>
        )}

        {/* ADVE Radar */}
        {meta && Object.keys(scores).some((k) => (scores[k as PillarKey] ?? 0) > 0) && (
          <div className="rounded-lg border border-border bg-background/50 p-4">
            <h4 className="mb-3 text-sm font-medium text-foreground-secondary">Radar ADVE-RTIS</h4>
            <AdvertisRadar scores={scores} className="flex justify-center" />
          </div>
        )}

        {/* Piliers strategiques */}
        {modalFocusKeys.length > 0 && (
          <div>
            <h4 className="mb-3 text-sm font-medium text-foreground-secondary">
              Piliers strategiques
            </h4>
            <div className="space-y-2">
              {modalFocusKeys.map((k) => {
                const content = pillarContentMap[k];
                const firstField = content ? Object.entries(content)[0] : null;
                return (
                  <div
                    key={k}
                    className={`rounded-lg border p-3 ${PILLAR_BADGE_COLORS[k] ?? "bg-background text-foreground-secondary border-border"}`}
                  >
                    <span className="text-xs font-bold">
                      {k.toUpperCase()} &mdash; {PILLAR_NAMES[k]}
                    </span>
                    {firstField && !!firstField[1] && (
                      <p className="mt-1 text-xs text-foreground-secondary line-clamp-2">
                        {Array.isArray(firstField[1])
                          ? (firstField[1] as string[]).join(", ")
                          : String(firstField[1])}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Missions list */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-foreground-secondary">
            Missions ({missions.length})
          </h4>
          {missions.length === 0 ? (
            <p className="text-sm text-foreground-muted">
              Aucune mission associee a cette campagne.
            </p>
          ) : (
            <div className="space-y-2">
              {missions.map((m) => {
                const mission = m as { id: string; title: string; status: string; priority?: number; slaDeadline?: string; mode?: string; budget?: number; description?: string };
                return (
                  <div key={mission.id} className="rounded-lg border border-border bg-background/80 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {mission.priority && (
                            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-2xs font-bold ${mission.priority <= 1 ? "bg-error/20 text-error" : mission.priority <= 3 ? "bg-warning/20 text-warning" : "bg-surface-raised text-foreground-secondary"}`}>
                              {mission.priority}
                            </span>
                          )}
                          <span className="text-sm font-medium text-white">{mission.title || `${mission.id.slice(0, 8)}...`}</span>
                        </div>
                        {mission.description && (
                          <p className="mt-1 text-xs text-foreground-muted line-clamp-1">{mission.description}</p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-foreground-muted">
                          {mission.mode && <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">{mission.mode}</span>}
                          {mission.slaDeadline && <span>📅 {new Date(mission.slaDeadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>}
                          {mission.budget && <span>💰 {mission.budget.toLocaleString("fr-FR")} XAF</span>}
                        </div>
                      </div>
                      <StatusBadge status={mission.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

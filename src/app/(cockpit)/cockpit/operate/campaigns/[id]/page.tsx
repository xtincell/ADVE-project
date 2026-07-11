"use client";

/**
 * Fiche campagne — parent minces (dé-densification, dette (b) audit UX
 * 2026-07-11). Les 12 onglets vivent dans ./campaign-tabs/* (extraction
 * iso-comportement : mêmes clés de cache tRPC, mêmes cascades
 * d'invalidation). Le parent garde la query `campaignManager.getById`
 * (header + meta + props d'Overview) et l'onglet actif (state pur,
 * défaut "overview" — pas de deep-link ?tab=). La barre regroupe les
 * onglets en 5 jobs founder (esprit ADR-0122) sans changer keys/labels.
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  ClipboardList,
  DollarSign,
  FileText,
  FolderOpen,
  Layers,
  MapPin,
  Megaphone,
  ShieldAlert,
  Target,
  Users,
  Zap,
} from "lucide-react";
import { StateBadge, type CampaignState } from "./campaign-tabs/shared";
import { OverviewTab } from "./campaign-tabs/overview-tab";
import { ActionsTab } from "./campaign-tabs/actions-tab";
import { ExecutionsTab } from "./campaign-tabs/executions-tab";
import { TeamTab } from "./campaign-tabs/team-tab";
import { MilestonesTab } from "./campaign-tabs/milestones-tab";
import { BudgetTab } from "./campaign-tabs/budget-tab";
import { BriefsTab } from "./campaign-tabs/briefs-tab";
import { AssetsTab } from "./campaign-tabs/assets-tab";
import { AARRRTab } from "./campaign-tabs/aarrr-tab";
import { FieldOpsTab } from "./campaign-tabs/fieldops-tab";
import { AmplificationsTab } from "./campaign-tabs/amplifications-tab";
import { ReportsTab } from "./campaign-tabs/reports-tab";

// ─── Tab definitions — 5 groupes jobs founder, keys/labels/icônes inchangés ──

type TabKey =
  | "overview" | "actions" | "executions" | "team" | "milestones" | "budget"
  | "briefs" | "assets" | "aarrr" | "fieldops" | "amplifications" | "reports";

interface TabDef { key: TabKey; label: string; icon: React.ElementType }

const TAB_GROUPS: Array<{ label: string; tabs: TabDef[] }> = [
  {
    label: "Pilotage",
    tabs: [
      { key: "overview", label: "Vue d'ensemble", icon: Target },
      { key: "milestones", label: "Jalons", icon: Calendar },
    ],
  },
  {
    label: "Contenu & production",
    tabs: [
      { key: "actions", label: "Actions", icon: Zap },
      { key: "briefs", label: "Briefs", icon: ClipboardList },
      { key: "executions", label: "Executions", icon: Layers },
      { key: "assets", label: "Assets", icon: FolderOpen },
    ],
  },
  {
    label: "Diffusion",
    tabs: [
      { key: "fieldops", label: "Terrain", icon: MapPin },
      { key: "amplifications", label: "Media", icon: Megaphone },
    ],
  },
  {
    label: "Mesure",
    tabs: [
      { key: "aarrr", label: "AARRR", icon: BarChart3 },
      { key: "budget", label: "Budget", icon: DollarSign },
      { key: "reports", label: "Rapports", icon: FileText },
    ],
  },
  {
    label: "Réglages",
    tabs: [{ key: "team", label: "Equipe", icon: Users }],
  },
];

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const campaignQuery = trpc.campaignManager.getById.useQuery({ id: campaignId });

  if (campaignQuery.isLoading) return <SkeletonPage />;
  if (campaignQuery.error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Campagne introuvable" />
        <div className="rounded-xl border border-error/50 bg-error/20 p-6 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-error" />
          <p className="mt-2 text-sm text-error">{campaignQuery.error.message}</p>
        </div>
      </div>
    );
  }

  const campaign = campaignQuery.data as Record<string, unknown>;
  const state = ((campaign.state as string) ?? (campaign.status as string) ?? "BRIEF_DRAFT") as CampaignState;
  const name = (campaign.name as string) ?? "Campagne";
  const code = campaign.code as string | undefined;
  const budget = campaign.budget as number | undefined;
  const startDate = campaign.startDate as string | undefined;
  const endDate = campaign.endDate as string | undefined;
  const strategyId = campaign.strategyId as string;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={name}
        description={code ?? undefined}
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Operations" },
          { label: "Campagnes", href: "/cockpit/operate/campaigns" },
          { label: name },
        ]}
      >
        <button
          onClick={() => router.push("/cockpit/operate/campaigns")}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground-secondary hover:bg-surface-raised"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour
        </button>
      </PageHeader>

      {/* State + meta bar */}
      <div className="flex flex-wrap items-center gap-3">
        <StateBadge state={state} />
        {budget != null && <span className="text-xs text-foreground-secondary"><DollarSign className="mr-0.5 inline h-3 w-3" />{budget.toLocaleString("fr-FR")} XAF</span>}
        {startDate && <span className="text-xs text-foreground-muted">{new Date(startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → {endDate ? new Date(endDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "?"}</span>}
      </div>

      {/* Tabs — regroupés par jobs founder */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-background/50 p-1">
        {TAB_GROUPS.map((group, gi) => (
          <div key={group.label} className={`flex flex-col gap-0.5 ${gi > 0 ? "ml-1 border-l border-border/50 pl-2" : ""}`}>
            <span className="px-2 pt-0.5 text-2xs font-medium uppercase tracking-wide text-foreground-muted">{group.label}</span>
            <div className="flex gap-1">
              {group.tabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors ${active ? "bg-background text-white" : "text-foreground-muted hover:text-foreground-secondary"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" && <OverviewTab campaignId={campaignId} strategyId={strategyId} state={state} onRefresh={() => campaignQuery.refetch()} />}
        {activeTab === "actions" && <ActionsTab campaignId={campaignId} />}
        {activeTab === "executions" && <ExecutionsTab campaignId={campaignId} />}
        {activeTab === "team" && <TeamTab campaignId={campaignId} />}
        {activeTab === "milestones" && <MilestonesTab campaignId={campaignId} />}
        {activeTab === "budget" && <BudgetTab campaignId={campaignId} />}
        {activeTab === "briefs" && <BriefsTab campaignId={campaignId} strategyId={strategyId} />}
        {activeTab === "assets" && <AssetsTab campaignId={campaignId} />}
        {activeTab === "aarrr" && <AARRRTab campaignId={campaignId} budget={budget} />}
        {activeTab === "fieldops" && <FieldOpsTab campaignId={campaignId} />}
        {activeTab === "amplifications" && <AmplificationsTab campaignId={campaignId} />}
        {activeTab === "reports" && <ReportsTab campaignId={campaignId} />}
      </div>
    </div>
  );
}

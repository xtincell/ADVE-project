"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs } from "@/components/shared/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { Modal } from "@/components/shared/modal";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import {
  Wrench,
  Layers,
  Play,
  Clock,
  CheckCircle,
  Zap,
  Link2,
  Cpu,
  FileText,
  Calculator,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type GloryTool = {
  slug: string;
  name: string;
  layer: string;
  order: number;
  executionType: string;
  pillarKeys: string[];
  requiredDrivers: string[];
  description: string;
};

type GlorySequence = {
  key: string;
  family: string;
  name: string;
  description: string;
  pillar?: string;
  steps: Array<{ type: string; ref: string; name: string; status: string }>;
  aiPowered: boolean;
  refined: boolean;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const LAYER_COLORS: Record<string, string> = {
  CR: "bg-blue-500",
  DC: "bg-emerald-500",
  HYBRID: "bg-purple-500",
  BRAND: "bg-amber-500",
};

const LAYER_LABELS: Record<string, string> = {
  CR: "Concepteur-Redacteur",
  DC: "Direction Creation",
  HYBRID: "Operations",
  BRAND: "Identite Visuelle",
};

const LAYER_BADGE: Record<string, string> = {
  CR: "bg-blue-400/15 text-blue-400 ring-blue-400/30",
  DC: "bg-emerald-400/15 text-emerald-400 ring-emerald-400/30",
  HYBRID: "bg-purple-400/15 text-purple-400 ring-purple-400/30",
  BRAND: "bg-amber-400/15 text-amber-400 ring-amber-400/30",
};

const EXEC_BADGE: Record<string, { label: string; color: string; icon: typeof Cpu }> = {
  LLM: { label: "LLM", color: "bg-rose-400/15 text-rose-400 ring-rose-400/30", icon: Cpu },
  COMPOSE: { label: "COMPOSE", color: "bg-sky-400/15 text-sky-400 ring-sky-400/30", icon: FileText },
  CALC: { label: "CALC", color: "bg-orange-400/15 text-orange-400 ring-orange-400/30", icon: Calculator },
};

const FAMILY_COLORS: Record<string, string> = {
  PILLAR: "border-l-amber-500",
  PRODUCTION: "border-l-blue-500",
  STRATEGIC: "border-l-emerald-500",
  OPERATIONAL: "border-l-purple-500",
};

const FAMILY_LABELS: Record<string, string> = {
  PILLAR: "Pilier ADVE-RTIS",
  PRODUCTION: "Production Creative",
  STRATEGIC: "Strategique",
  OPERATIONAL: "Operationnel",
};

const STEP_TYPE_ICONS: Record<string, { label: string; color: string }> = {
  GLORY: { label: "G", color: "bg-blue-500" },
  ARTEMIS: { label: "A", color: "bg-rose-500" },
  SESHAT: { label: "S", color: "bg-teal-500" },
  MESTOR: { label: "M", color: "bg-violet-500" },
  PILLAR: { label: "P", color: "bg-amber-500" },
  CALC: { label: "C", color: "bg-orange-500" },
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function GloryPage() {
  const [view, setView] = useState<"tools" | "sequences">("sequences");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedSeqKey, setSelectedSeqKey] = useState<string | null>(null);
  const strategyId = useCurrentStrategyId();

  const toolsQuery = trpc.glory.listAll.useQuery();
  const historyQuery = trpc.glory.history.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: !!strategyId },
  );
  const selectedToolQuery = trpc.glory.getBySlug.useQuery(
    { slug: selectedSlug ?? "" },
    { enabled: !!selectedSlug },
  );

  const allTools = (toolsQuery.data ?? []) as GloryTool[];
  const history = (historyQuery.data ?? []) as unknown as Array<{
    id: string; toolSlug: string; createdAt: string; status?: string;
  }>;

  // Import sequences client-side (static data, no trpc needed)
  // We'll use the trpc listAll which returns tools; sequences come from a separate endpoint or static import
  // For now, derive sequence data from tool relationships
  const llmCount = allTools.filter((t) => t.executionType === "LLM").length;
  const composeCount = allTools.filter((t) => t.executionType === "COMPOSE").length;
  const calcCount = allTools.filter((t) => t.executionType === "CALC").length;

  const todayExecutions = history.filter((h) => {
    const d = new Date(h.createdAt);
    return d.toDateString() === new Date().toDateString();
  });

  const successRate = history.length > 0
    ? Math.round((history.filter((h) => h.status === "SUCCESS" || h.status === "COMPLETED").length / history.length) * 100)
    : 0;

  // Tab filtering for tools view
  const toolTabs = [
    { key: "all", label: "Tous", count: allTools.length },
    { key: "cr", label: "CR", count: allTools.filter((t) => t.layer === "CR").length },
    { key: "dc", label: "DC", count: allTools.filter((t) => t.layer === "DC").length },
    { key: "hybrid", label: "HYBRID", count: allTools.filter((t) => t.layer === "HYBRID").length },
    { key: "brand", label: "BRAND", count: allTools.filter((t) => t.layer === "BRAND").length },
  ];

  const tabFiltered = activeTab === "all"
    ? allTools
    : allTools.filter((t) => t.layer === activeTab.toUpperCase());

  if (toolsQuery.isLoading) return <SkeletonPage />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="GLORY Tools"
        description={`${allTools.length} outils | 31 sequences | 4 familles — systeme de production creative ADVE-RTIS`}
        breadcrumbs={[
          { label: "Console", href: "/console" },
          { label: "Fusee" },
          { label: "GLORY" },
        ]}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total outils" value={allTools.length} icon={Wrench} />
        <StatCard title="Sequences" value={31} icon={Link2} />
        <StatCard title="Executions aujourd'hui" value={todayExecutions.length} icon={Play} />
        <StatCard
          title="Taux de succes"
          value={history.length > 0 ? `${successRate} %` : "- %"}
          icon={CheckCircle}
        />
      </div>

      {/* Execution Type Breakdown */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["LLM", "COMPOSE", "CALC"] as const).map((exec) => {
          const info = EXEC_BADGE[exec];
          const count = exec === "LLM" ? llmCount : exec === "COMPOSE" ? composeCount : calcCount;
          const Icon = info.icon;
          return (
            <div key={exec} className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                <Icon className="h-5 w-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-xs text-zinc-500">{info.label} — {exec === "LLM" ? "IA creative" : exec === "COMPOSE" ? "Compositing" : "Calcul"}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setView("sequences")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            view === "sequences" ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Sequences (31)
        </button>
        <button
          onClick={() => setView("tools")}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            view === "tools" ? "bg-white text-black" : "bg-zinc-800 text-zinc-400 hover:text-white"
          }`}
        >
          Outils ({allTools.length})
        </button>
      </div>

      {/* ═══ SEQUENCES VIEW ═══ */}
      {view === "sequences" && (
        <div className="space-y-6">
          {(["PILLAR", "PRODUCTION", "STRATEGIC", "OPERATIONAL"] as const).map((family) => (
            <div key={family}>
              <h3 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                {FAMILY_LABELS[family]}
              </h3>
              <div className="space-y-2">
                {/* Static sequence data — will be replaced with trpc query when endpoint exists */}
                {getStaticSequences(family).map((seq) => (
                  <div
                    key={seq.key}
                    className={`rounded-xl border border-zinc-800 border-l-4 ${FAMILY_COLORS[family]} bg-zinc-900/80 p-4`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{seq.name}</h4>
                          <span className="text-[10px] font-mono text-zinc-500">{seq.key}</span>
                          {seq.pillar && (
                            <span className="inline-flex rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-400 ring-1 ring-inset ring-amber-400/30">
                              {seq.pillar.toUpperCase()}
                            </span>
                          )}
                          {!seq.aiPowered && (
                            <span className="inline-flex rounded-full bg-orange-400/15 px-2 py-0.5 text-[10px] font-semibold text-orange-400 ring-1 ring-inset ring-orange-400/30">
                              CALC
                            </span>
                          )}
                          {seq.refined && (
                            <span className="inline-flex rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-400/30">
                              AFFINE
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{seq.description}</p>

                        {/* Step chain visualization */}
                        <div className="mt-3 flex flex-wrap items-center gap-1">
                          {seq.steps.map((step, i) => {
                            const typeInfo = STEP_TYPE_ICONS[step.type] ?? { label: "?", color: "bg-zinc-600" };
                            return (
                              <div key={i} className="flex items-center gap-1">
                                {i > 0 && <span className="text-zinc-600 text-[10px]">&rarr;</span>}
                                <div
                                  className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold text-white ${typeInfo.color}`}
                                  title={`${step.type}: ${step.name}`}
                                >
                                  {typeInfo.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500">{seq.steps.length} steps</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ TOOLS VIEW ═══ */}
      {view === "tools" && (
        <>
          <Tabs tabs={toolTabs} activeTab={activeTab} onChange={setActiveTab} />

          {tabFiltered.length === 0 ? (
            <EmptyState icon={Wrench} title="Aucun outil" description="Aucun outil GLORY trouve dans cette couche." />
          ) : (
            <div className="space-y-2">
              {tabFiltered.map((tool) => {
                const execInfo = EXEC_BADGE[tool.executionType] ?? EXEC_BADGE.COMPOSE;
                return (
                  <div
                    key={tool.slug}
                    onClick={() => setSelectedSlug(tool.slug)}
                    className="cursor-pointer rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-white">{tool.name}</h4>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${LAYER_BADGE[tool.layer] ?? ""}`}>
                            {tool.layer}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${execInfo.color}`}>
                            {execInfo.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{tool.description}</p>
                        {tool.pillarKeys.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {tool.pillarKeys.map((pk) => (
                              <span key={pk} className="inline-flex rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                                {pk.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500">#{tool.order}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tool Detail Modal */}
      <Modal
        open={!!selectedSlug}
        onClose={() => setSelectedSlug(null)}
        title={selectedToolQuery.data?.name ?? selectedSlug ?? "Details"}
        size="lg"
      >
        {selectedToolQuery.isLoading ? (
          <p className="text-sm text-zinc-500">Chargement...</p>
        ) : selectedToolQuery.data ? (() => {
          const t = selectedToolQuery.data;
          const execInfo = EXEC_BADGE[t.executionType] ?? EXEC_BADGE.COMPOSE;
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${LAYER_BADGE[t.layer] ?? ""}`}>
                  {t.layer}
                </span>
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${execInfo.color}`}>
                  {execInfo.label}
                </span>
                <span className="text-xs text-zinc-500">#{t.order} — {t.slug}</span>
              </div>

              <p className="text-sm text-zinc-400">{t.description}</p>

              {t.inputFields?.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Champs d&apos;entree</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.inputFields.map((f: string) => (
                      <span key={f} className="inline-flex rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-400">{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {t.pillarBindings && Object.keys(t.pillarBindings).length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Bindings piliers (irrigation ADVE-RTIS)</p>
                  <div className="space-y-1">
                    {Object.entries(t.pillarBindings as Record<string, string>).map(([field, path]) => (
                      <div key={field} className="flex items-center gap-2 text-[11px]">
                        <span className="font-medium text-blue-400">{field}</span>
                        <span className="text-zinc-600">&larr;</span>
                        <span className="font-mono text-amber-400">{path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                <p className="mb-1 text-xs font-medium text-zinc-500">Format de sortie</p>
                <p className="text-sm font-mono text-white">{t.outputFormat}</p>
              </div>

              {t.dependencies?.length > 0 && (
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-3">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Dependances</p>
                  <div className="flex flex-wrap gap-1.5">
                    {t.dependencies.map((d: string) => (
                      <span key={d} className="inline-flex rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[11px] font-medium text-purple-400">{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })() : null}
      </Modal>

      {/* Execution History */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-zinc-400" />
          <h3 className="text-sm font-semibold text-white">Historique d&apos;execution</h3>
        </div>
        {!strategyId ? (
          <p className="text-xs text-zinc-500">Selectionnez une strategie pour voir l&apos;historique.</p>
        ) : historyQuery.isLoading ? (
          <p className="text-xs text-zinc-500">Chargement...</p>
        ) : history.length === 0 ? (
          <EmptyState icon={Zap} title="Aucune execution" description="L&apos;historique des executions GLORY apparaitra ici." />
        ) : (
          <div className="space-y-2">
            {history.slice(0, 20).map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-2.5">
                <div>
                  <span className="text-sm text-white">{h.toolSlug}</span>
                  <span className="ml-2 text-xs text-zinc-500">
                    {new Date(h.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <StatusBadge status={h.status ?? "completed"} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Static sequence data (until trpc endpoint exists) ───────────────────────
// This mirrors sequences.ts structure for client rendering

function getStaticSequences(family: string): GlorySequence[] {
  const all: GlorySequence[] = [
    // PILLAR
    { key: "MANIFESTE-A", family: "PILLAR", name: "Le Manifeste", pillar: "a", description: "Document fondateur de l'Authenticite — ADN, archeytpe, prophetie, voix, manifeste redige.", steps: [{ type: "PILLAR", ref: "a", name: "Injection A", status: "ACTIVE" }, { type: "ARTEMIS", ref: "fw-01", name: "Archeologie", status: "ACTIVE" }, { type: "SESHAT", ref: "cultural", name: "Refs culturelles", status: "ACTIVE" }, { type: "GLORY", ref: "wordplay-cultural-bank", name: "Jeux de mots", status: "ACTIVE" }, { type: "GLORY", ref: "concept-generator", name: "Concepts", status: "ACTIVE" }, { type: "GLORY", ref: "tone-of-voice-designer", name: "Ton de voix", status: "ACTIVE" }, { type: "GLORY", ref: "claim-baseline-factory", name: "Claims", status: "ACTIVE" }, { type: "GLORY", ref: "manifesto-writer", name: "Manifeste", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "BRANDBOOK-D", family: "PILLAR", name: "Le Brandbook", pillar: "d", description: "Systeme visuel complet — identite, codes, guidelines.", steps: [{ type: "PILLAR", ref: "d", name: "Injection D", status: "ACTIVE" }, { type: "GLORY", ref: "semiotic-brand-analyzer", name: "Semiotique", status: "ACTIVE" }, { type: "GLORY", ref: "visual-landscape-mapper", name: "Paysage", status: "ACTIVE" }, { type: "GLORY", ref: "visual-moodboard-generator", name: "Moodboard", status: "ACTIVE" }, { type: "GLORY", ref: "photography-style-guide", name: "Photo", status: "ACTIVE" }, { type: "GLORY", ref: "chromatic-strategy-builder", name: "Chromatic", status: "ACTIVE" }, { type: "GLORY", ref: "typography-system-architect", name: "Typo", status: "ACTIVE" }, { type: "GLORY", ref: "logo-type-advisor", name: "Logo", status: "ACTIVE" }, { type: "GLORY", ref: "design-token-architect", name: "Tokens", status: "ACTIVE" }, { type: "GLORY", ref: "iconography-system-builder", name: "Icones", status: "ACTIVE" }, { type: "GLORY", ref: "motion-identity-designer", name: "Motion", status: "ACTIVE" }, { type: "GLORY", ref: "brand-guidelines-generator", name: "Guidelines", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "OFFRE-V", family: "PILLAR", name: "L'Offre Commerciale", pillar: "v", description: "Proposition de valeur, pricing, deck commercial.", steps: [{ type: "PILLAR", ref: "v", name: "Injection V", status: "ACTIVE" }, { type: "SESHAT", ref: "benchmarks", name: "Benchmarks", status: "ACTIVE" }, { type: "GLORY", ref: "value-proposition-builder", name: "Value Prop", status: "ACTIVE" }, { type: "GLORY", ref: "claim-baseline-factory", name: "Claims", status: "ACTIVE" }, { type: "CALC", ref: "pricing-strategy-advisor", name: "Pricing", status: "ACTIVE" }, { type: "GLORY", ref: "sales-deck-builder", name: "Deck", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "PLAYBOOK-E", family: "PILLAR", name: "Le Playbook Engagement", pillar: "e", description: "Communaute, content, rituels, parcours superfan.", steps: [{ type: "PILLAR", ref: "e", name: "Injection E", status: "ACTIVE" }, { type: "ARTEMIS", ref: "fw-07", name: "Touchpoints", status: "ACTIVE" }, { type: "ARTEMIS", ref: "fw-08", name: "Rituels", status: "ACTIVE" }, { type: "GLORY", ref: "community-playbook-generator", name: "Playbook", status: "ACTIVE" }, { type: "GLORY", ref: "superfan-journey-mapper", name: "Superfan", status: "ACTIVE" }, { type: "GLORY", ref: "engagement-rituals-designer", name: "Rituels", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "AUDIT-R", family: "PILLAR", name: "L'Audit Interne", pillar: "r", description: "Risques, conformite, vulnerabilites, mitigation.", steps: [{ type: "PILLAR", ref: "r", name: "Injection R", status: "ACTIVE" }, { type: "MESTOR", ref: "actualize-r", name: "RTIS R", status: "ACTIVE" }, { type: "ARTEMIS", ref: "fw-22", name: "Risk Matrix", status: "ACTIVE" }, { type: "GLORY", ref: "risk-matrix-builder", name: "Matrice", status: "ACTIVE" }, { type: "GLORY", ref: "crisis-communication-planner", name: "Crise", status: "ACTIVE" }, { type: "GLORY", ref: "compliance-checklist-generator", name: "Conformite", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "ETUDE-T", family: "PILLAR", name: "L'Etude de Marche", pillar: "t", description: "Intelligence marche, analyse concurrentielle, tendances.", steps: [{ type: "PILLAR", ref: "t", name: "Injection T", status: "ACTIVE" }, { type: "SESHAT", ref: "market", name: "Market Intel", status: "ACTIVE" }, { type: "ARTEMIS", ref: "fw-11", name: "Market Fit", status: "ACTIVE" }, { type: "GLORY", ref: "competitive-analysis-builder", name: "Concurrents", status: "ACTIVE" }, { type: "CALC", ref: "market-sizing-estimator", name: "TAM/SAM", status: "ACTIVE" }, { type: "GLORY", ref: "trend-radar-builder", name: "Tendances", status: "ACTIVE" }, { type: "GLORY", ref: "insight-synthesizer", name: "Insights", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "BRAINSTORM-I", family: "PILLAR", name: "Le Brainstorm 360", pillar: "i", description: "Ideation, architecture campagne, allocation ressources.", steps: [{ type: "PILLAR", ref: "i", name: "Injection I", status: "ACTIVE" }, { type: "MESTOR", ref: "actualize-i", name: "RTIS I", status: "ACTIVE" }, { type: "GLORY", ref: "ideation-workshop-facilitator", name: "Ideation", status: "ACTIVE" }, { type: "GLORY", ref: "concept-generator", name: "Concepts", status: "ACTIVE" }, { type: "GLORY", ref: "campaign-architecture-planner", name: "Architecture", status: "ACTIVE" }, { type: "CALC", ref: "resource-allocation-planner", name: "Ressources", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "ROADMAP-S", family: "PILLAR", name: "La Roadmap Strategique", pillar: "s", description: "Vision, objectifs, KPIs, jalons, gouvernance.", steps: [{ type: "PILLAR", ref: "s", name: "Injection S", status: "ACTIVE" }, { type: "MESTOR", ref: "actualize-s", name: "RTIS S", status: "ACTIVE" }, { type: "GLORY", ref: "strategic-diagnostic", name: "Diagnostic", status: "ACTIVE" }, { type: "GLORY", ref: "kpi-framework-builder", name: "KPIs", status: "ACTIVE" }, { type: "GLORY", ref: "milestone-roadmap-builder", name: "Roadmap", status: "ACTIVE" }], aiPowered: true, refined: false },

    // PRODUCTION
    { key: "BRAND", family: "PRODUCTION", name: "Identite Visuelle", description: "Pipeline sequentiel 10 outils — semiotique aux guidelines.", steps: Array(10).fill(null).map((_, i) => ({ type: "GLORY", ref: `brand-${i}`, name: `Step ${i+1}`, status: "ACTIVE" })), aiPowered: true, refined: true },
    { key: "KV", family: "PRODUCTION", name: "Key Visual", description: "Du concept au prompt AI image optimise.", steps: [{ type: "PILLAR", ref: "a+d", name: "Inject A+D", status: "ACTIVE" }, { type: "GLORY", ref: "concept-generator", name: "Concept", status: "ACTIVE" }, { type: "GLORY", ref: "claim-baseline-factory", name: "Claim", status: "ACTIVE" }, { type: "GLORY", ref: "creative-evaluation-matrix", name: "Eval", status: "ACTIVE" }, { type: "GLORY", ref: "kv-art-direction-brief", name: "Brief DA", status: "ACTIVE" }, { type: "GLORY", ref: "kv-banana-prompt-generator", name: "Prompt", status: "ACTIVE" }, { type: "GLORY", ref: "kv-review-validator", name: "Validation", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "SPOT-VIDEO", family: "PRODUCTION", name: "Spot Video / TV", description: "Script, dialogues, storyboard, briefs prod.", steps: [{ type: "GLORY", ref: "concept-generator", name: "Concept", status: "ACTIVE" }, { type: "GLORY", ref: "script-writer", name: "Script", status: "ACTIVE" }, { type: "GLORY", ref: "dialogue-writer", name: "Dialogues", status: "ACTIVE" }, { type: "GLORY", ref: "storyboard-generator", name: "Storyboard", status: "ACTIVE" }, { type: "GLORY", ref: "casting-brief-generator", name: "Casting", status: "ACTIVE" }, { type: "GLORY", ref: "music-sound-brief", name: "Son", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "SPOT-RADIO", family: "PRODUCTION", name: "Spot Radio", description: "Script, dialogues, voix off, son.", steps: [{ type: "GLORY", ref: "concept-generator", name: "Concept", status: "ACTIVE" }, { type: "GLORY", ref: "script-writer", name: "Script", status: "ACTIVE" }, { type: "GLORY", ref: "voiceover-brief-generator", name: "Voix Off", status: "ACTIVE" }, { type: "GLORY", ref: "music-sound-brief", name: "Son", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "PRINT-AD", family: "PRODUCTION", name: "Annonce Presse", description: "Concept, claim, layout, body copy.", steps: [{ type: "GLORY", ref: "concept-generator", name: "Concept", status: "ACTIVE" }, { type: "GLORY", ref: "claim-baseline-factory", name: "Claim", status: "ACTIVE" }, { type: "GLORY", ref: "print-ad-architect", name: "Layout", status: "ACTIVE" }, { type: "GLORY", ref: "long-copy-craftsman", name: "Copy", status: "ACTIVE" }, { type: "GLORY", ref: "brand-guardian-system", name: "Check", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "OOH", family: "PRODUCTION", name: "Affichage Exterieur", description: "Layout maitre + declinaisons multi-formats.", steps: [{ type: "GLORY", ref: "concept-generator", name: "Concept", status: "ACTIVE" }, { type: "GLORY", ref: "print-ad-architect", name: "Layout", status: "ACTIVE" }, { type: "GLORY", ref: "format-declination-engine", name: "Formats", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "SOCIAL-POST", family: "PRODUCTION", name: "Post Social", description: "Copy plateforme + brand check.", steps: [{ type: "GLORY", ref: "concept-generator", name: "Concept", status: "ACTIVE" }, { type: "GLORY", ref: "social-copy-engine", name: "Copy", status: "ACTIVE" }, { type: "GLORY", ref: "brand-guardian-system", name: "Check", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "NAMING", family: "PRODUCTION", name: "Naming", description: "Exploration, generation, evaluation, check legal.", steps: [{ type: "GLORY", ref: "semiotic-brand-analyzer", name: "Semiotique", status: "ACTIVE" }, { type: "GLORY", ref: "wordplay-cultural-bank", name: "Mots", status: "ACTIVE" }, { type: "GLORY", ref: "naming-generator", name: "Noms", status: "ACTIVE" }, { type: "GLORY", ref: "creative-evaluation-matrix", name: "Eval", status: "ACTIVE" }, { type: "GLORY", ref: "naming-legal-checker", name: "Legal", status: "ACTIVE" }], aiPowered: true, refined: false },

    // STRATEGIC
    { key: "CAMPAIGN-360", family: "STRATEGIC", name: "Campagne 360", description: "Brief, architecture, media, simulation.", steps: [{ type: "GLORY", ref: "brief-creatif-interne", name: "Brief", status: "ACTIVE" }, { type: "GLORY", ref: "concept-generator", name: "Concept", status: "ACTIVE" }, { type: "GLORY", ref: "campaign-architecture-planner", name: "Archi", status: "ACTIVE" }, { type: "CALC", ref: "media-plan-builder", name: "Media", status: "ACTIVE" }, { type: "GLORY", ref: "digital-planner", name: "Digital", status: "ACTIVE" }, { type: "CALC", ref: "campaign-360-simulator", name: "Simulation", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "LAUNCH", family: "STRATEGIC", name: "Lancement", description: "Benchmark, brief, campagne, timeline.", steps: [{ type: "SESHAT", ref: "market", name: "Intel", status: "ACTIVE" }, { type: "GLORY", ref: "competitive-analysis-builder", name: "Concurrents", status: "ACTIVE" }, { type: "GLORY", ref: "concept-generator", name: "Concept", status: "ACTIVE" }, { type: "GLORY", ref: "launch-timeline-planner", name: "Timeline", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "PITCH", family: "STRATEGIC", name: "Pitch", description: "Benchmark, brief, concept, pitch, presentation.", steps: [{ type: "GLORY", ref: "benchmark-reference-finder", name: "Refs", status: "ACTIVE" }, { type: "GLORY", ref: "concept-generator", name: "Concept", status: "ACTIVE" }, { type: "GLORY", ref: "pitch-architect", name: "Pitch", status: "ACTIVE" }, { type: "GLORY", ref: "credentials-deck-builder", name: "Credentials", status: "ACTIVE" }], aiPowered: true, refined: false },

    // OPERATIONAL
    { key: "OPS", family: "OPERATIONAL", name: "Operations Production", description: "Budget, devis, vendor, approval.", steps: [{ type: "GLORY", ref: "production-budget-optimizer", name: "Budget", status: "ACTIVE" }, { type: "GLORY", ref: "devis-generator", name: "Devis", status: "ACTIVE" }, { type: "GLORY", ref: "vendor-brief-generator", name: "Vendor", status: "ACTIVE" }, { type: "GLORY", ref: "approval-workflow-manager", name: "Approval", status: "ACTIVE" }], aiPowered: false, refined: false },
    { key: "EVAL", family: "OPERATIONAL", name: "Post-Campagne & Awards", description: "Resultats, ROI, evaluation, case.", steps: [{ type: "GLORY", ref: "post-campaign-reader", name: "Resultats", status: "ACTIVE" }, { type: "CALC", ref: "roi-calculator", name: "ROI", status: "ACTIVE" }, { type: "GLORY", ref: "creative-evaluation-matrix", name: "Eval", status: "ACTIVE" }, { type: "GLORY", ref: "award-case-builder", name: "Case", status: "ACTIVE" }], aiPowered: true, refined: false },
    { key: "COST-SERVICE", family: "OPERATIONAL", name: "Cout du Service", description: "Taux horaire, CODB, marge par prestation.", steps: [{ type: "CALC", ref: "hourly-rate-calculator", name: "Taux", status: "ACTIVE" }, { type: "CALC", ref: "codb-calculator", name: "CODB", status: "ACTIVE" }, { type: "CALC", ref: "service-margin-analyzer", name: "Marges", status: "ACTIVE" }], aiPowered: false, refined: false },
    { key: "PROFITABILITY", family: "OPERATIONAL", name: "Rentabilite", description: "P&L, rentabilite client, taux utilisation.", steps: [{ type: "CALC", ref: "project-pnl-calculator", name: "P&L", status: "ACTIVE" }, { type: "CALC", ref: "client-profitability-analyzer", name: "Client", status: "ACTIVE" }, { type: "CALC", ref: "utilization-rate-tracker", name: "Utilisation", status: "ACTIVE" }], aiPowered: false, refined: false },
  ];

  return all.filter((s) => s.family === family);
}

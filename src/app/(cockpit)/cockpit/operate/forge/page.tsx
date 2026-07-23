"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Modal } from "@/components/shared/modal";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import { formatConfidence } from "@/lib/operate-config";
import {
  Hammer,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Zap,
  DollarSign,
  ChevronRight,
  ShieldCheck,
  CheckSquare,
  Square,
  ArrowRight,
  AlertCircle,
  Briefcase,
  Users,
  BookOpen,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Constantes locales non liées aux enums Prisma (OK de garder ici)
const VAULT_STATUS_LABELS: Record<string, string> = {
  ACTIVE_REUSE: "Réutiliser",
  STALE_REFRESH: "Rafraîchir",
  MISSING_GENERATE: "Générer",
};

const VAULT_STATUS_VARIANTS: Record<string, string> = {
  ACTIVE_REUSE: "bg-success/15 text-success ring-success/30",
  STALE_REFRESH: "bg-warning/15 text-warning ring-warning/30",
  MISSING_GENERATE: "bg-accent/15 text-accent ring-accent/30",
};

export default function DeliverableForgePage() {
  const strategyId = useCurrentStrategyId();
  const [activeTab, setActiveTab] = useState<"projects" | "deliverables">("projects");

  // Tab 1: Project Forge States
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [routeGuildeOnCreate, setRouteGuildeOnCreate] = useState(false);
  // Modal de confirmation validation S < 30%
  const [showLowConfidenceModal, setShowLowConfidenceModal] = useState(false);

  // Tab 2: Deliverable Forge States
  const [targetKind, setTargetKind] = useState<string>("");
  const [confirmedDispatch, setConfirmedDispatch] = useState(false);
  // ADR-0136 — forge réelle (previewOnly:false) après l'aperçu.
  const [confirmForge, setConfirmForge] = useState(false);
  const [forgeLaunched, setForgeLaunched] = useState(false);

  // tRPC Queries & Mutations
  const strategyQuery = trpc.strategy.get.useQuery(
    { id: strategyId ?? "" },
    { enabled: Boolean(strategyId) }
  );

  // Confiance du pilier S — alimente la bannière
  const synthesisConfidenceQuery = trpc.strategy.getSynthesisConfidence.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: Boolean(strategyId) }
  );

  const actionsQuery = trpc.actions.byStrategy.useQuery(
    { strategyId: strategyId ?? "" },
    { enabled: Boolean(strategyId) }
  );

  const validateSynthesisMutation = trpc.strategy.validateSynthesis.useMutation({
    onSuccess: (data) => {
      if (data && "warning" in data && data.warning) {
        // Confiance < 30% — afficher le modal
        setShowLowConfidenceModal(true);
      } else {
        strategyQuery.refetch();
        synthesisConfidenceQuery.refetch();
      }
    }
  });

  const generateProjectsMutation = trpc.strategy.generateProjectsFromActions.useMutation({
    onSuccess: () => {
      actionsQuery.refetch();
      setSelectedActionIds([]);
    }
  });

  const routeToGuildeMutation = trpc.campaignManager.routeToGuilde.useMutation();

  // Deliverable Forge queries (Tab 2)
  const supported = trpc.deliverableOrchestrator.listSupportedKinds.useQuery();
  
  const requirements = trpc.deliverableOrchestrator.resolveRequirements.useQuery(
    { targetKind, strategyId: strategyId ?? undefined },
    { enabled: Boolean(targetKind && strategyId && activeTab === "deliverables") },
  );

  const composeMutation = trpc.deliverableOrchestrator.compose.useMutation();
  const composition = composeMutation.data?.intentResult ?? null;

  const totalEstimatedCost = useMemo(() => {
    if (!requirements.data || !requirements.data.ok) return 0;
    const matches = requirements.data.vaultMatches ?? [];
    const toGenerate = matches.filter(
      (m) => m.status === "MISSING_GENERATE" || m.status === "STALE_REFRESH",
    ).length;
    return toGenerate * 0.1 + 0.5;
  }, [requirements.data]);

  const canDispatch =
    requirements.data?.ok === true &&
    !composeMutation.isPending &&
    !composition &&
    Boolean(strategyId);

  // Handlers
  function handleLaunch() {
    if (!strategyId || !targetKind) return;
    setConfirmedDispatch(true);
    composeMutation.mutate({
      strategyId,
      targetKind,
      previewOnly: true,
    });
  }

  function handleReset() {
    setTargetKind("");
    setConfirmedDispatch(false);
    setForgeLaunched(false);
    composeMutation.reset();
  }

  // ADR-0136 — lance la forge RÉELLE (previewOnly:false) après confirmation.
  function handleForge() {
    if (!strategyId || !targetKind) return;
    setConfirmForge(false);
    setForgeLaunched(true);
    composeMutation.mutate({ strategyId, targetKind, previewOnly: false });
  }

  async function handleValidateStrategy() {
    if (!strategyId) return;
    // Lance la validation — le serveur retourne { warning: true } si confiance < 30%
    // Le onSuccess du mutation gère l'affichage du modal
    await validateSynthesisMutation.mutateAsync({ strategyId });
  }

  async function handleForceValidate() {
    if (!strategyId) return;
    setShowLowConfidenceModal(false);
    await validateSynthesisMutation.mutateAsync({ strategyId, forceConfidence: true });
    strategyQuery.refetch();
    synthesisConfidenceQuery.refetch();
  }

  async function handleGenerateProjects() {
    if (!strategyId || selectedActionIds.length === 0) return;
    const res = await generateProjectsMutation.mutateAsync({
      strategyId,
      actionIds: selectedActionIds
    });

    if (routeGuildeOnCreate && res.projects) {
      for (const proj of res.projects) {
        await routeToGuildeMutation.mutateAsync({
          campaignId: proj.campaignId
        });
      }
    }
  }

  function toggleActionSelection(id: string) {
    setSelectedActionIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  if (!strategyId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          icon={Hammer}
          title="Sélectionnez une marque"
          description="Cette surface ne peut produire un projet ou un livrable que dans le contexte d'une stratégie active."
        />
      </div>
    );
  }

  const strategy = strategyQuery.data;
  const isStrategyValidated = strategy?.status === "VALIDATED" || strategy?.status === "ACTIVE";
  const actions = actionsQuery.data ?? [];
  const sConf = synthesisConfidenceQuery.data;
  const confFmt = formatConfidence(sConf?.confidence);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="La Forge"
        description="Le creuset opérationnel de transformation. Validez votre stratégie, générez les projets associés et matérialisez vos livrables."
      />

      {/* ── Bannière confiance Pilier S ──────────────────────────────────── */}
      {sConf && !isStrategyValidated && (
        <div
          className={cn(
            "rounded-xl border p-4 space-y-3",
            sConf.hasLowConfidence
              ? "border-error/30 bg-error/5"
              : confFmt.level === "medium"
                ? "border-warning/30 bg-warning/5"
                : "border-success/20 bg-success/5"
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert
                className={cn(
                  "h-4 w-4 shrink-0",
                  sConf.hasLowConfidence ? "text-error" : confFmt.level === "medium" ? "text-warning" : "text-success"
                )}
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Confiance stratégique — Pilier S (Synthèse)
                </p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {sConf.isAiProposed
                    ? "⚠️ La majorité des données stratégiques ont été inférées par l'IA et ne sont pas encore validées par un opérateur."
                    : confFmt.level === "low"
                      ? "Les données de synthèse sont insuffisantes pour garantir la qualité des projets générés."
                      : confFmt.level === "medium"
                        ? "La stratégie est partiellement validée. Une revue avant forge est recommandée."
                        : "La stratégie est bien documentée. Vous pouvez forger en toute confiance."}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className={cn("text-2xl font-black tabular-nums", confFmt.color)}>
                {confFmt.pct}
              </span>
              {sConf.isAiProposed && (
                <p className="text-[9px] font-mono uppercase tracking-widest text-error mt-0.5">
                  AI_PROPOSED
                </p>
              )}
            </div>
          </div>
          {/* Barre de progression */}
          <div className="h-1.5 w-full rounded-full bg-background/40">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all",
                sConf.hasLowConfidence ? "bg-error" : confFmt.level === "medium" ? "bg-warning" : "bg-success"
              )}
              style={{ width: confFmt.pct }}
            />
          </div>
        </div>
      )}

      {/* ── Modal : validation < 30% ─────────────────────────────────────── */}
      {showLowConfidenceModal && sConf && (
        <Modal
          open={showLowConfidenceModal}
          onClose={() => setShowLowConfidenceModal(false)}
          title={`⚠️ Stratégie à ${confFmt.pct} de confiance`}
        >
          <div className="space-y-4">
            <p className="text-sm text-foreground-secondary">
              La majorité des données de cette stratégie ont été <strong>inférées par l'IA</strong>
              {sConf.isAiProposed ? " (statut : AI_PROPOSED)" : ""}. Forger des projets sur une base
              aussi incertaine peut produire des campagnes mal alignées avec votre réalité terrain.
            </p>
            <div className="rounded-lg border border-error/20 bg-error/5 p-3 text-xs text-error">
              <strong>Risque :</strong> les briefs et KPI générés seront basés sur des hypothèses non validées.
              Nous recommandons de revoir votre fondation de marque avant de procéder.
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href="/cockpit/brand/roadmap"
                onClick={() => setShowLowConfidenceModal(false)}
                className="flex items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
              >
                <BookOpen className="h-4 w-4" />
                Relire et compléter la fondation
              </a>
              <button
                type="button"
                onClick={handleForceValidate}
                className="flex items-center justify-center gap-2 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm font-medium text-error transition-colors hover:bg-error/10"
              >
                <CheckCircle2 className="h-4 w-4" />
                Valider malgré la confiance faible
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Tabs Selector */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("projects")}
          className={cn(
            "px-4 py-2 text-sm font-semibold border-b-2 -mb-[2px] transition-colors",
            activeTab === "projects"
              ? "border-accent text-accent"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          )}
        >
          S → Projets (La Forge)
        </button>
        <button
          onClick={() => setActiveTab("deliverables")}
          className={cn(
            "px-4 py-2 text-sm font-semibold border-b-2 -mb-[2px] transition-colors",
            activeTab === "deliverables"
              ? "border-accent text-accent"
              : "border-transparent text-foreground-secondary hover:text-foreground"
          )}
        >
          Livrables (Deliverable Forge)
        </button>
      </div>

      {/* ── TAB 1 : LA FORGE (S → PROJECTS) ────────────────────────── */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          {/* Strategy validation gate */}
          {!isStrategyValidated ? (
            <section className="rounded-xl border border-warning/30 bg-warning/5 p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">Validation du S requise</h3>
                  <p className="text-xs text-foreground-secondary leading-relaxed">
                    La stratégie de la marque <span className="font-semibold text-foreground">{strategy?.name}</span> n'a pas encore été validée. La validation de la synthèse est nécessaire pour verrouiller la stratégie et déclencher sa vie opérationnelle.
                  </p>
                </div>
              </div>

              {/* S-Validation checklist */}
              <div className="border border-border/60 bg-background/50 rounded-lg p-4 space-y-3">
                <h4 className="text-2xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  Critères de validation stratégique
                </h4>

                <ul className="space-y-2 text-xs">
                  <li className="flex items-center gap-2 text-foreground-secondary">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground-muted" />
                    Piliers A, D, V, E complétés et qualifiés
                  </li>
                  <li className="flex items-center gap-2 text-foreground-secondary">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground-muted" />
                    Bilan des risques et opportunités (R+T) calculé
                  </li>
                  <li className="flex items-center gap-2 text-foreground-secondary">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground-muted" />
                    Oracle stratégique validé et assemblé
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleValidateStrategy}
                  disabled={validateSynthesisMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-background hover:bg-accent/90 disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {validateSynthesisMutation.isPending ? "Validation..." : "Valider le S → Déclencher la vie de la marque"}
                </button>
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-success" />
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Stratégie Validée.</span> La vie opérationnelle de la marque est active. Vous pouvez forger des projets ci-dessous.
                </div>
              </div>
            </section>
          )}

          {/* Action to Projects Pipeline */}
          {isStrategyValidated && (
            <section className="rounded-xl border border-border bg-background/80 p-5 space-y-4">
              <div className="flex items-start justify-between border-b border-border pb-3 flex-wrap gap-2">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-accent" />
                    Actions Recommandées & Initiatives
                  </h3>
                  <p className="text-xs text-foreground-secondary">
                    Sélectionnez les initiatives issues de la synthèse pour les matérialiser en projets opérationnels (campagnes + briefs créatifs/prod + missions).
                  </p>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 text-foreground-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={routeGuildeOnCreate}
                      onChange={(e) => setRouteGuildeOnCreate(e.target.checked)}
                      className="rounded border-border bg-background text-accent focus:ring-accent"
                    />
                    Acheminer automatiquement vers la Guilde
                  </label>

                  <button
                    onClick={handleGenerateProjects}
                    disabled={selectedActionIds.length === 0 || generateProjectsMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-background hover:bg-accent/90 disabled:opacity-50"
                  >
                    <Zap className="h-4 w-4" />
                    {generateProjectsMutation.isPending ? "Génération..." : `Générer ${selectedActionIds.length} briefs`}
                  </button>
                </div>
              </div>

              {actions.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="Aucune action proposée"
                  description="Synchronisez ou enrichissez l'Innovation (I) pour générer des initiatives."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-foreground-secondary border-b border-border pb-2">
                        <th className="py-2 pl-2"></th>
                        <th className="py-2 font-semibold">Initiative</th>
                        <th className="py-2 font-semibold">Touchpoint</th>
                        <th className="py-2 font-semibold">AARRR</th>
                        <th className="py-2 font-semibold">Priorité</th>
                        <th className="py-2 font-semibold text-right">Budget prévu</th>
                        <th className="py-2 font-semibold text-right pr-2">Statut</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {actions.map((act) => {
                        const isSelected = selectedActionIds.includes(act.id);
                        const isAlreadyAccepted = act.status === "ACCEPTED" || act.status === "SCHEDULED" || act.status === "EXECUTED";

                        return (
                          <tr
                            key={act.id}
                            className={cn(
                              "hover:bg-background/20 transition-colors",
                              isSelected && "bg-accent/5",
                              isAlreadyAccepted && "opacity-50"
                            )}
                          >
                            <td className="py-3 pl-2">
                              {!isAlreadyAccepted && (
                                <button
                                  onClick={() => toggleActionSelection(act.id)}
                                  className="text-foreground-secondary hover:text-accent transition-colors"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-4 w-4 text-accent" />
                                  ) : (
                                    <Square className="h-4 w-4" />
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="py-3 max-w-sm">
                              <p className="font-semibold text-foreground">{act.title}</p>
                              <p className="text-2xs text-foreground-secondary line-clamp-1">{act.description}</p>
                            </td>
                            <td className="py-3">
                              <span className="px-1.5 py-0.5 rounded bg-background border border-border text-foreground-secondary">
                                {act.touchpoint ?? "UNCLASSIFIED"}
                              </span>
                            </td>
                            <td className="py-3 text-foreground-secondary">{act.aarrrIntent ?? "—"}</td>
                            <td className="py-3">
                              <span className="font-mono">{act.priority ?? "P2"}</span>
                            </td>
                            <td className="py-3 text-right text-foreground">
                              {act.budgetMin ? `${act.budgetMin.toLocaleString()} XAF` : "—"}
                            </td>
                            <td className="py-3 text-right pr-2">
                              <span className={cn(
                                "text-2xs font-semibold px-2 py-0.5 rounded border uppercase",
                                isAlreadyAccepted
                                  ? "bg-success/15 text-success border-success/30"
                                  : "bg-warning/15 text-warning border-warning/30"
                              )}>
                                {act.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* ── TAB 2 : DELIVERABLE FORGE (ORIGINAL GLORY COMPOSER) ────────────────── */}
      {activeTab === "deliverables" && (
        <div className="space-y-6">
          {/* ── Étape 0 — Sélecteur target kind ──────────────────────────── */}
          <section className="rounded-xl border border-border bg-background/80 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
                <span className="text-sm font-semibold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Que voulez-vous produire ?</h3>
                <p className="mt-0.5 text-xs text-foreground-secondary">
                  Sélectionnez le type de livrable matériel cible. L'OS remontera automatiquement les
                  briefs upstream nécessaires.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {supported.data?.kinds.map((kind) => (
                <button
                  key={kind}
                  onClick={() => {
                    setTargetKind(kind);
                    composeMutation.reset();
                    setConfirmedDispatch(false);
                  }}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    targetKind === kind
                      ? "border-accent bg-accent/10"
                      : "border-border bg-background/40 hover:border-foreground-muted"
                  )}
                >
                  <span className="text-xs font-medium text-foreground">{kind}</span>
                </button>
              ))}
            </div>
          </section>

          {/* ── Étape 1 — DAG résolu + vault scan ────────────────────────── */}
          {targetKind && (
            <section className="rounded-xl border border-border bg-background/80 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <span className="text-sm font-semibold">2</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Cascade requise
                  </h3>
                  <p className="mt-0.5 text-xs text-foreground-secondary">
                    Briefs upstream à fournir (depuis le vault) ou à générer. L'estimation coût
                    inclut les éléments de production manquants.
                  </p>
                </div>
              </div>

              {requirements.isPending && (
                <p className="text-xs text-foreground-muted">Résolution du DAG en cours…</p>
              )}

              {requirements.data && !requirements.data.ok && (
                <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
                  <p className="text-xs font-semibold text-warning flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    {requirements.data.code}
                  </p>
                  <p className="mt-1 text-xs text-foreground-secondary">{requirements.data.message}</p>
                </div>
              )}

              {requirements.data?.ok && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                    <Search className="h-3 w-3" />
                    <span>
                      Producteur target : <span className="text-accent">{requirements.data.targetGloryToolSlug}</span>
                    </span>
                  </div>

                  {requirements.data.vaultMatches && requirements.data.vaultMatches.length > 0 ? (
                    <ul className="space-y-1.5">
                      {requirements.data.vaultMatches.map((match) => (
                        <li
                          key={match.kind}
                          className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2"
                        >
                          <span className="text-xs font-medium text-foreground">{match.kind}</span>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-semibold ring-1 ring-inset",
                              VAULT_STATUS_VARIANTS[match.status]
                            )}
                          >
                            {VAULT_STATUS_LABELS[match.status] ?? match.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-foreground-muted">
                      Aucun kind upstream — production directe (cas rare).
                    </p>
                  )}

                  <div className="flex items-center gap-3 border-t border-border pt-3 text-xs">
                    <DollarSign className="h-4 w-4 text-foreground-muted" />
                    <span className="text-foreground-secondary">Coût estimé</span>
                    <span className="font-semibold text-foreground">
                      ${totalEstimatedCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ── Étape 2 — Lancement ──────────────────────────────────────── */}
          {requirements.data?.ok && !composition && (
            <section className="rounded-xl border border-border bg-background/80 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <span className="text-sm font-semibold">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Aperçu de la cascade de production
                  </h3>
                  <p className="mt-0.5 text-xs text-foreground-secondary">
                    Cet aperçu calcule la cascade de briefs nécessaires à ce livrable, sans
                    encore lancer la production. La production effective des assets est prise
                    en charge par votre équipe UPgraders.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={!canDispatch || confirmedDispatch}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-background hover:bg-accent/90 disabled:opacity-50"
                >
                  <Zap className="h-4 w-4" />
                  {composeMutation.isPending ? "Calcul…" : "Calculer l'aperçu"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-foreground-secondary hover:border-foreground-muted"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </section>
          )}

          {/* ── Étape 3 — Résultat ─────────────────────────────────────────
              Branché sur composition.status : un VETOED rendait la carte
              VERTE « Aperçu prêt » avec le bouton Forger actif (audit
              2026-07-16, `forge-veto-rendered-as-success`). */}
          {composition && (composition as { status?: string }).status === "VETOED" ? (
            <section className="rounded-xl border border-warning/40 bg-warning/5 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/15 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">Composition refusée</h3>
                  <p className="mt-2 text-xs text-foreground">
                    {(composition as { summary?: string }).summary ??
                      "Les pré-conditions ne sont pas réunies (fiche de marque incomplète ou budget). Complétez puis réessayez."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-foreground-secondary hover:border-foreground-muted"
              >
                Recommencer
              </button>
            </section>
          ) : composition && (
            <section className="rounded-xl border border-success/40 bg-success/5 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {forgeLaunched ? "Livrable lancé" : "Aperçu de la cascade prêt"}
                  </h3>
                  <p className="mt-2 text-xs text-foreground">{composition.summary}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {!forgeLaunched && (
                  <button
                    type="button"
                    onClick={() => setConfirmForge(true)}
                    disabled={composeMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/15 disabled:opacity-40"
                  >
                    <Hammer className="h-3.5 w-3.5" />
                    Forger réellement ce livrable
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-foreground-secondary hover:border-foreground-muted"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Composer un autre livrable
                </button>
              </div>
            </section>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmForge}
        onClose={() => setConfirmForge(false)}
        onConfirm={handleForge}
        title="Forger réellement ce livrable"
        message="La production réelle exécute l'outil de génération puis matérialise le livrable. Elle consomme du crédit. Continuer ?"
        confirmLabel="Forger"
        variant="info"
      />
    </div>
  );
}

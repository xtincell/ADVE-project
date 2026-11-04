"use client";

import { useEffect, useState, useMemo } from "react";
import { materialHandoffBlock, productionSourceManifest } from "@/domain/production-sources";
import { trpc } from "@/lib/trpc/client";
import { ProductionMixReview } from "@/components/cockpit/production-mix-review";
import { ProductionSourcePicker, type SourceChoice } from "@/components/cockpit/production-source-picker";
import { PtahKilnTracker } from "@/components/neteru/ptah-kiln-tracker";
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
  ACTIVE_REUSE: "Disponible · réutilisé",
  STALE_REFRESH: "À rafraîchir dans la cascade",
  MISSING_GENERATE: "À générer dans la cascade",
};

const PRODUCTION_LABELS: Record<string, string> = {
  KV_VISUAL: "Visuel principal", PRINT_AD_SPEC: "Annonce imprimée", STORYBOARD: "Storyboard",
  PITCH: "Présentation", VOICEOVER_BRIEF: "Voix off", VENDOR_BRIEF: "Brief prestataire",
  CASTING_BRIEF: "Brief casting", BCG_PORTFOLIO: "Matrice de portefeuille",
  MCK_3H: "Trois horizons", KV_ART_DIRECTION_BRIEF: "Direction artistique",
  BIG_IDEA: "Idée directrice", CHROMATIC_STRATEGY: "Palette de couleurs",
  TYPOGRAPHY_SYSTEM: "Système typographique", SEMIOTIC_ANALYSIS:"Analyse sémiotique", VISUAL_LANDSCAPE_MAP:"Paysage visuel", MOODBOARD:"Planche d’inspiration", CREATIVE_BRIEF: "Brief créatif",
  SCRIPT: "Script", SOUND_BRIEF: "Direction sonore", PERSONA: "Persona",
  VALUE_PROPOSITION: "Proposition de valeur", POSITIONING: "Positionnement",
  SOCIAL_COPY: "Texte social", TONE_CHARTER: "Ton éditorial",
};
const productionLabel = (kind: string) => PRODUCTION_LABELS[kind] ?? kind.toLowerCase().replaceAll("_", " ");

const VAULT_STATUS_VARIANTS: Record<string, string> = {
  ACTIVE_REUSE: "bg-success/15 text-success ring-success/30",
  STALE_REFRESH: "bg-warning/15 text-warning ring-warning/30",
  MISSING_GENERATE: "bg-accent/15 text-accent ring-accent/30",
};

export function ProductionWorkbench() {
  const strategyId = useCurrentStrategyId();
  return <StrategyWorkbench key={strategyId ?? "none"} strategyId={strategyId} />;
}

function StrategyWorkbench({ strategyId }: { strategyId: string | null }) {
  const [activeTab, setActiveTab] = useState<"projects" | "deliverables">("deliverables");

  // Tab 1: Project Forge States
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [routeGuildeOnCreate, setRouteGuildeOnCreate] = useState(false);
  // Modal de confirmation validation S < 30%
  const [showLowConfidenceModal, setShowLowConfidenceModal] = useState(false);
  const [reviewedVersion, setReviewedVersion] = useState<number | null>(null);

  // Tab 2: Deliverable Forge States
  const [targetKind, setTargetKind] = useState<string>("");
  const [selection, setSelection] = useState<SourceChoice[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [creativeProposalId, setCreativeProposalId] = useState("");
  const campaigns = trpc.campaign.list.useQuery({ strategyId: strategyId ?? "" }, { enabled: !!strategyId && !!targetKind });
  const proposals = trpc.creativeProposal.listByStrategy.useQuery({ strategyId: strategyId ?? "" }, { enabled: !!strategyId && !!targetKind });
  const routeKey = campaigns.data?.find(c => c.id === campaignId)?.routeKey;
  const validProposals = proposals.data?.filter(p => p.status === "VALIDATED" && (!routeKey || p.routeKey === routeKey)) ?? [];
  const [previewId, setPreviewId] = useState<string | null>(null);
  useEffect(() => {
    setPreviewId(new URL(window.location.href).searchParams.get("productionPreview"));
  }, []);
  function rememberPreview(id: string | null) {
    setPreviewId(id);
    const url = new URL(window.location.href);
    if (id) {
      url.searchParams.set("productionPreview", id);
      if (strategyId) url.searchParams.set("strategy", strategyId);
    } else url.searchParams.delete("productionPreview");
    window.history.replaceState(window.history.state, "", url);
  }
  // ADR-0136 — forge réelle (previewOnly:false) après l'aperçu.
  const [confirmForge, setConfirmForge] = useState(false);


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
        setReviewedVersion(data.version);
        setShowLowConfidenceModal(true);
      } else {
        strategyQuery.refetch();
        synthesisConfidenceQuery.refetch();
      }
    },
    onError: () => { synthesisConfidenceQuery.refetch(); },
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
    { targetKind, strategyId: strategyId ?? undefined, campaignId: campaignId || undefined },
    { enabled: Boolean(targetKind && strategyId && activeTab === "deliverables") },
  );

  const saved = trpc.deliverableOrchestrator.getProductionPreview.useQuery(
    { strategyId: strategyId ?? "", previewIntentId: previewId ?? "" }, { enabled: !!strategyId && !!previewId, retry: false },
  );
  useEffect(() => {
    if (!saved.data || saved.data.previewIntentId !== previewId) return;
    setTargetKind(saved.data.targetKind);
    setCampaignId(saved.data.campaignId ?? "");
    setCreativeProposalId(saved.data.creativeProposalId ?? "");
    setSelection(saved.data.sourceManifest.sources.map(({ assetId, version, role, name, sections, artwork }) => ({ assetId, version, role, name, sections, artwork })));
  }, [saved.data, previewId]);
  const composeMutation = trpc.deliverableOrchestrator.compose.useMutation({
    onSuccess({ intentResult }) {
      const receipt = intentResult.output as { status?: string; previewIntentId?: string } | undefined;
      if (intentResult.status === "OK" && receipt?.status === "PREVIEW" && receipt.previewIntentId) {
        rememberPreview(receipt.previewIntentId);
      } else if (previewId) {
        void saved.refetch();
      }
    },
  });
  const composition = composeMutation.data?.intentResult ?? null;
  const output = composition?.output as { status?: string; generativeTaskId?: string | null; materialStatus?: string | null; missingPreconditions?: string[]; composition?: {missingPreconditions?: string[]}; sourceManifest?: unknown } | undefined;
  const progress = trpc.deliverableOrchestrator.productionProgress.useQuery(
    {strategyId: strategyId ?? "", previewIntentId: previewId ?? ""},
    {enabled: !!strategyId && !!previewId, refetchInterval: q => {
      const run = q.state.data;
      return composeMutation.isPending || (run && !["OK","FAILED","VETOED","DEFERRED"].includes(run.status)) ? 2000 : false;
    }}
  );
  const previousDispatch = progress.data ?? saved.data?.dispatchReceipt;
  const restored = saved.data?.previewIntentId === previewId && saved.data != null;
  const parsed = productionSourceManifest.safeParse(output?.sourceManifest ?? saved.data?.sourceManifest);
  const manifest = parsed.success ? parsed.data : undefined;
  const handoff = manifest ? materialHandoffBlock(manifest) : null;
  const missing = saved.data?.missingPreconditions ?? output?.composition?.missingPreconditions ?? output?.missingPreconditions ?? [];
  const previewReady = (composition?.status === "OK" && output?.status === "PREVIEW") || (!composition && restored);
  const dispatched = composition?.status === "OK" && output?.status === "DISPATCHED";

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
    !composition && !restored &&
    Boolean(strategyId) && (validProposals.length < 2 || Boolean(creativeProposalId));

  const pins = selection.map(({ assetId, version, role, sections, artwork }) => ({ assetId, version, role, sections, artwork }));
  const scope = { campaignId: campaignId || undefined, creativeProposalId: creativeProposalId || undefined };
  function resetPreview() {
    rememberPreview(null);
    setConfirmForge(false);
    composeMutation.reset();
  }

  // Handlers
  function handleLaunch(startProduction = false) {
    if (!strategyId || !targetKind) return;

    composeMutation.mutate({
      strategyId,
      targetKind,
      previewOnly: true,
      pins, ...scope,
    }, { onSuccess: ({intentResult}) => {
      const receipt = intentResult.output as {status?: string; materialBlock?: string; missingPreconditions?: string[]; composition?: {missingPreconditions?: string[]}};
      if (startProduction && intentResult.status === "OK" && receipt?.status === "PREVIEW" && !receipt.materialBlock && !(receipt.missingPreconditions ?? receipt.composition?.missingPreconditions)?.length)
        setConfirmForge(true);
    }});
  }

  function handleReset() {
    setTargetKind("");
    setSelection([]);
    setCampaignId("");
    setCreativeProposalId("");
    rememberPreview(null);
    setConfirmForge(false);
    composeMutation.reset();
  }

  // ADR-0136 — lance la forge RÉELLE (previewOnly:false) après confirmation.
  function handleForge() {
    if (!strategyId || !targetKind) return;
    setConfirmForge(false);
    if (!previewReady || handoff || missing.length || !previewId || previousDispatch) return;
    composeMutation.mutate({ strategyId, targetKind, previewOnly: false, previewIntentId: previewId, pins, ...scope });
  }

  function handleValidateStrategy() {
    const expectedVersion = synthesisConfidenceQuery.data?.currentVersion;
    if (!strategyId || expectedVersion == null) return;
    validateSynthesisMutation.mutate({ strategyId, expectedVersion });
  }

  function handleForceValidate() {
    if (!strategyId || reviewedVersion == null) return;
    setShowLowConfidenceModal(false);
    validateSynthesisMutation.mutate({ strategyId, expectedVersion: reviewedVersion, forceConfidence: true });
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
  // ACTIVE is also the schema default; it is not a recorded synthesis approval.
  const isStrategyValidated = (strategy?.status === "VALIDATED" || strategy?.status === "ACTIVE")
    && ["VALIDATED", "LOCKED"].includes(synthesisConfidenceQuery.data?.validationStatus ?? "")
    && synthesisConfidenceQuery.data?.canValidate === true;
  const actions = actionsQuery.data ?? [];
  const sConf = synthesisConfidenceQuery.data;
  const confFmt = formatConfidence(sConf?.confidence);
  const roadmapHref = `/cockpit/brand/roadmap?strategy=${encodeURIComponent(strategyId)}`;
  const projectReviewLoading = strategyQuery.isLoading || synthesisConfidenceQuery.isLoading;
  const projectReviewError = strategyQuery.isError || synthesisConfidenceQuery.isError;
  const projectReviewUnavailable = projectReviewLoading || projectReviewError || !strategy || !sConf;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageHeader
        title="Production"
        description="Le creuset opérationnel de transformation. Validez votre stratégie, générez les projets associés et matérialisez vos livrables."
      />

      <PtahKilnTracker key={strategyId} strategyId={strategyId} />

      {/* ── Bannière confiance Pilier S ──────────────────────────────────── */}
      {activeTab === "projects" && sConf && !projectReviewUnavailable && (
        <div
          className={cn(
            "rounded-xl border p-4 space-y-3",
            sConf.hasLowConfidence
              ? "border-error/30 bg-error/5"
              : confFmt.level === "medium"
                ? "border-warning/30 bg-warning/5"
                : confFmt.level === "unknown" ? "border-border bg-background/50" : "border-success/20 bg-success/5"
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert
                className={cn(
                  "h-4 w-4 shrink-0",
                  sConf.hasLowConfidence ? "text-error" : confFmt.level === "medium" ? "text-warning" : confFmt.level === "unknown" ? "text-foreground-muted" : "text-success"
                )}
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Confiance du modèle dans la synthèse
                </p>
                <p className="text-xs text-foreground-muted mt-0.5">
                  {confFmt.level === "unknown"
                    ? "La confiance n’a pas été mesurée. Une approbation humaine ne crée pas une mesure."
                    : "Cette estimation porte sur le contenu de S. Les critères ci-dessous indiquent si ses projets peuvent être créés."}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <span className={cn("text-2xl font-black tabular-nums", confFmt.color)}>
                {confFmt.pct}
              </span>
              {sConf.isAiProposed && (
                <p className="text-[9px] font-mono uppercase tracking-widest text-error mt-0.5">
                  Proposition à relire
                </p>
              )}
            </div>
          </div>
          {/* Barre de progression */}
          {confFmt.level !== "unknown" && <div className="h-1.5 w-full rounded-full bg-background/40">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all",
                sConf.hasLowConfidence ? "bg-error" : confFmt.level === "medium" ? "bg-warning" : "bg-success"
              )}
              style={{ width: confFmt.pct }}
            />
          </div>}
        </div>
      )}

      {/* ── Modal : validation < 30% ─────────────────────────────────────── */}
      {showLowConfidenceModal && sConf && (
        <Modal
          open={showLowConfidenceModal}
          onClose={() => setShowLowConfidenceModal(false)}
          title={confFmt.level === "unknown" ? "Confiance non mesurée" : `Confiance enregistrée : ${confFmt.pct}`}
        >
          <div className="space-y-4">
            <p className="text-sm text-foreground-secondary">
              Vous approuvez la synthèse relue avec une confiance faible ou non mesurée.
              Cette décision conserve la confiance enregistrée et les sources du contenu.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={roadmapHref}
                onClick={() => setShowLowConfidenceModal(false)}
                className="flex items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
              >
                <BookOpen className="h-4 w-4" />
                Relire la synthèse et ses sources
              </a>
              <button
                type="button"
                onClick={handleForceValidate}
                className="flex items-center justify-center gap-2 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm font-medium text-error transition-colors hover:bg-error/10"
              >
                <CheckCircle2 className="h-4 w-4" />
                Confirmer mon approbation
              </button>
            </div>
          </div>
        </Modal>
      )}

      {activeTab === "projects" && validateSynthesisMutation.error && (
        <p role="alert" className="rounded-lg border border-error/30 bg-error/5 p-3 text-sm text-error">
          {validateSynthesisMutation.error.message}
        </p>
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
          Projets issus de la stratégie
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
          Créer un livrable
        </button>
      </div>

      {/* ── TAB 1 : LA FORGE (S → PROJECTS) ────────────────────────── */}
      {activeTab === "projects" && (
        <div className="space-y-6">
          {/* Strategy validation gate */}
          {projectReviewUnavailable ? (
            <section role={projectReviewError ? "alert" : "status"} aria-live="polite" className="rounded-xl border border-border bg-background/50 p-4 space-y-2">
              <p className="text-sm text-foreground">{projectReviewError
                ? "Impossible de lire les critères de cette stratégie."
                : "Lecture de la stratégie et de ses sources…"}</p>
              {projectReviewError && <button className="text-xs text-accent underline" onClick={() => { void strategyQuery.refetch(); void synthesisConfidenceQuery.refetch(); }}>Réessayer la lecture</button>}
            </section>
          ) : !isStrategyValidated ? (
            <section className="rounded-xl border border-warning/30 bg-warning/5 p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">{sConf.canValidate ? "La stratégie attend votre approbation" : "Préparer la stratégie pour créer ses projets"}</h3>
                  <p className="text-xs text-foreground-secondary leading-relaxed">
                    La synthèse de <span className="font-semibold text-foreground">{strategy?.name}</span> doit être composée et relue avant la création de projets issus de ses initiatives. Les autres travaux de marque restent accessibles.
                  </p>
                </div>
              </div>

              {/* S-Validation checklist */}
              <div className="border border-border/60 bg-background/50 rounded-lg p-4 space-y-3">
                <h4 className="text-2xs font-semibold text-foreground-secondary uppercase tracking-wider">
                  Critères de validation stratégique
                </h4>

                <p className="text-xs text-foreground-secondary" aria-live="polite">
                  {!sConf.exists ? "Aucune synthèse n’a été composée pour cette marque."
                    : sConf.canValidate ? `La version ${sConf.currentVersion} est composée et ses sources sont à jour. Relisez-la avant de l’approuver.`
                      : `La version ${sConf.currentVersion} demande une correction avant approbation.`}
                </p>
                {sConf.exists && sConf.fieldIssues.length > 0 && (
                  <details className="text-xs text-foreground-secondary" open={sConf.fieldIssues.length <= 4}>
                    <summary className="cursor-pointer text-warning">{sConf.fieldIssues.length} champ{sConf.fieldIssues.length > 1 ? "s" : ""} à corriger</summary>
                    <ul className="mt-2 ml-4 list-disc space-y-1">
                      {sConf.fieldIssues.map(issue => <li key={issue.path}><strong>{issue.label}</strong> — {issue.reason}</li>)}
                    </ul>
                  </details>
                )}
                {sConf.sources.stale && <p className="text-xs text-warning">{sConf.sources.changedPillars.length
                  ? `Les piliers ${sConf.sources.changedPillars.join(", ")} ont changé depuis la composition de cette version. Ouvrez la stratégie et recalculez le plan.`
                  : "La synthèse est marquée à réactualiser. Ouvrez la stratégie et recalculez le plan."}</p>}
                {(sConf.sources.links.length > 0 || sConf.sources.dangling.length > 0) && (
                  <details className="text-xs text-foreground-secondary">
                    <summary className="cursor-pointer text-warning">Liens à corriger ({sConf.sources.links.length + sConf.sources.dangling.length})</summary>
                    <ul className="mt-2 ml-4 list-disc space-y-1">{[...sConf.sources.links, ...sConf.sources.dangling].map((link, i) => <li key={i}>{link}</li>)}</ul>
                  </details>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  <a href={roadmapHref} className="text-xs text-accent underline">{sConf.canValidate ? "Lire cette version de la stratégie" : "Ouvrir la stratégie de cette marque"}</a>
                  <button onClick={() => void synthesisConfidenceQuery.refetch()} className="text-xs text-accent underline">Vérifier à nouveau les critères</button>
                  <button onClick={() => setActiveTab("deliverables")} className="text-xs text-accent underline">Créer un livrable indépendant</button>
                </div>
              </div>

              {sConf.canValidate && <div className="flex items-center gap-3">
                <button
                  onClick={handleValidateStrategy}
                  disabled={validateSynthesisMutation.isPending || !sConf?.canValidate || synthesisConfidenceQuery.isFetching}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-background hover:bg-accent/90 disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  {validateSynthesisMutation.isPending ? "Validation…" : "Approuver la synthèse relue"}
                </button>
              </div>}
            </section>
          ) : (
            <section className="rounded-xl border border-success/30 bg-success/5 p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-success" />
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Synthèse approuvée.</span> La confiance enregistrée reste inchangée. Vous pouvez choisir les initiatives à transformer en projets.
                </div>
              </div>
            </section>
          )}

          {/* Action to Projects Pipeline */}
          {isStrategyValidated && !projectReviewUnavailable && (
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
          {strategyId && <ProductionMixReview strategyId={strategyId} onAdopted={()=>{
            resetPreview();
            void requirements.refetch();
            if(targetKind && !previousDispatch) handleLaunch(false);
          }}/> }
          {/* ── Étape 0 — Sélecteur target kind ──────────────────────────── */}
          <section className="rounded-xl border border-border bg-background/80 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
                <span className="text-sm font-semibold">1</span>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-foreground">Que voulez-vous produire ?</h3>
                <p className="mt-0.5 text-xs text-foreground-secondary">
                  Choisissez le livrable. L’aperçu identifie les briefs nécessaires et les éléments déjà disponibles dans votre marque.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {supported.data?.kinds.map((kind) => (
                <button
                  key={kind}
                  disabled={composeMutation.isPending}
                  onClick={() => {
                    rememberPreview(null);
                    setTargetKind(kind);
                    composeMutation.reset();
                    setSelection([]);
                    setConfirmForge(false);
                  }}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    targetKind === kind
                      ? "border-accent bg-accent/10"
                      : "border-border bg-background/40 hover:border-foreground-muted"
                  )}
                >
                  <span className="text-xs font-medium text-foreground">{productionLabel(kind)}</span>
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
                    Sources disponibles dans le coffre de marque et briefs restant à préparer. Les montants affichés sont des estimations indicatives.
                  </p>
                </div>
              </div>

              {requirements.isPending && (
                <p className="text-xs text-foreground-muted">Recherche des sources nécessaires…</p>
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
                      Livrable : <span className="text-accent">{productionLabel(targetKind)}</span>
                    </span>
                  </div>

                  {requirements.data.vaultMatches && requirements.data.vaultMatches.length > 0 ? (
                    <ul className="space-y-1.5">
                      {requirements.data.vaultMatches.map((match) => (
                        <li
                          key={match.kind}
                          className="flex items-center justify-between rounded-md border border-border bg-background/40 px-3 py-2"
                        >
                          <span className="text-xs font-medium text-foreground">{productionLabel(match.kind)}</span>
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
                      Aucun brief complémentaire requis.
                    </p>
                  )}

                  <div className="flex items-center gap-3 border-t border-border pt-3 text-xs">
                    <DollarSign className="h-4 w-4 text-foreground-muted" />
                    <span className="text-foreground-secondary">Estimation de référence, distincte d’une facture</span>
                    <span className="font-semibold text-foreground">
                      ${totalEstimatedCost.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </section>
          )}

          {targetKind && strategyId && (
            <fieldset disabled={composeMutation.isPending} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs">Campagne<select value={campaignId} onChange={e => { setCampaignId(e.target.value); setCreativeProposalId(""); resetPreview(); }} className="mt-1 block w-full rounded border border-border bg-background p-2">
                  <option value="">Production de marque</option>
                  {campaigns.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></label>
                <label className="text-xs">Proposition créative validée<select value={creativeProposalId} onChange={e => { setCreativeProposalId(e.target.value); resetPreview(); }} className="mt-1 block w-full rounded border border-border bg-background p-2">
                  <option value="">{validProposals.length > 1 ? "Choisir une proposition" : validProposals.length === 1 ? "Reprendre la proposition validée" : "Aucune proposition validée"}</option>
                  {validProposals.map(p => <option key={p.id} value={p.id}>{((p.direction ?? {}) as {bigIdea?: string}).bigIdea || p.routeKey} · {new Date(p.updatedAt).toLocaleDateString("fr-FR")}</option>)}
                </select></label>
              </div>
              <ProductionSourcePicker campaignId={campaignId || undefined} strategyId={strategyId} selection={selection} onChange={next => {
              setSelection(next);
              resetPreview();
            }} /></fieldset>
          )}
          {saved.isError && previewId && <p role="alert">Cet aperçu ne peut pas être rouvert pour cette marque. <button type="button" className="underline" onClick={handleReset}>Recommencer</button></p>}
          {composeMutation.error && <p role="alert" className="rounded-lg border border-warning p-3 text-sm">{composeMutation.error.message}</p>}

          {/* ── Étape 2 — Lancement ──────────────────────────────────────── */}
          {requirements.data?.ok && !composition && !restored && (
            <section className="rounded-xl border border-border bg-background/80 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <span className="text-sm font-semibold">3</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Lancer la cascade de production
                  </h3>
                  <p className="mt-0.5 text-xs text-foreground-secondary">
                    La cascade reprend les briefs disponibles, prépare ceux qui manquent et transmet le brief final au moteur. Vous pouvez consulter le détail avant de confirmer.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLaunch(true)}
                  disabled={!canDispatch}
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-background hover:bg-accent/90 disabled:opacity-50"
                >
                  <Zap className="h-4 w-4" />
                  {composeMutation.isPending ? "Vérification…" : "Lancer la cascade de production"}
                </button>
                <button type="button" disabled={!canDispatch} onClick={() => handleLaunch(false)}
                  className="rounded-lg border border-border px-3 py-2 text-xs">Calculer l'aperçu</button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-3 py-2 text-xs text-foreground-secondary hover:border-foreground-muted"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Réinitialiser
                </button>
              </div>
            </section>
          )}

              {progress.data?.steps.length ? <ol aria-label="Étapes de la cascade" className="space-y-2 text-sm">{progress.data.steps.map(step=>
                <li key={step.kind} className="rounded border border-border p-2"><strong>{productionLabel(step.kind)}</strong> · {({
                  EXECUTING:"En cours",REUSED:"Repris du coffre",RESUMED:"Repris de la tentative précédente",GENERATED:"Brief produit",FAILED:"Échec"
                } as Record<string,string>)[step.state] ?? step.state}{step.message && <p>{step.message}</p>}</li>)}</ol> : null}

          {/* ── Étape 3 — Résultat ─────────────────────────────────────────
              Branché sur composition.status : un VETOED rendait la carte
              VERTE « Aperçu prêt » avec le bouton Forger actif (audit
              2026-07-16, `forge-veto-rendered-as-success`). */}
          {composition && !previewReady && !dispatched ? (
            <section className="rounded-xl border border-warning/40 bg-warning/5 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/15 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{composition.status === "FAILED" ? "La production a échoué" : "Production en attente"}</h3>
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
          ) : (composition || restored) && (
            <section className="rounded-xl border border-success/40 bg-success/5 p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {previewReady ? "Aperçu de production" : output?.materialStatus === "DEFERRED" ? "Génération différée" : output?.generativeTaskId ? "Tâche de génération créée" : "Brief préparé"}
                  </h3>
                  <p className="mt-2 text-xs text-foreground">{composition?.summary ?? "La sélection enregistrée a été rouverte."}</p>
                </div>
              </div>

              {manifest && manifest.sources.length > 0 && <div className="rounded border border-border p-3 text-sm">
                <p className="font-semibold">Versions dans le brief</p>
                <ul className="mt-2 space-y-2">
                  {manifest.sources.map(source => <li key={source.assetId}>
                    <details><summary className="cursor-pointer">{source.name} · v{source.version} · {source.transport === "TEXT" ? "Texte transmis au moteur" : source.transport === "ARTWORK_MASTER" ? "Master et calques verrouillés" : source.transport === "IMAGE_REFERENCE" ? "Référence visuelle pour le moteur d’image" : "Identité du fichier uniquement"}</summary>
                      <p className="mt-1 whitespace-pre-wrap break-words text-xs text-foreground-secondary">{source.text || "Les pixels de cette source ne sont pas transmis au générateur."}</p>
                    </details>
                  </li>)}
                </ul>
              </div>}
              {missing.length > 0 && <p role="status" className="rounded border border-warning/40 p-3 text-sm text-warning">Le brief peut être relu. Avant la forge, vérifiez les prérequis de la marque : {missing.map(code => ({MISSING_ACTIVE_ADVE_PILLAR:"activer un pilier ADVE", MISSING_MANIPULATION_MIX_PRIMARY:"définir le mode stratégique principal"}[code] ?? code)).join(" · ")}. {missing.includes("MISSING_MANIPULATION_MIX_PRIMARY") && <a href="#forge-mix-strategique" className="underline">Relire et choisir le mode</a>}</p>}
              {previousDispatch && <p role="status" className="rounded border border-border p-3 text-sm">Tentative enregistrée · {previousDispatch.materialStatus ?? previousDispatch.status}
                {previousDispatch.generativeTaskId && <span className="block break-all">Tâche {previousDispatch.generativeTaskId}</span>}
              </p>}
              {handoff && <p role="status" className="rounded border border-warning/40 p-3 text-sm text-warning">{handoff}</p>}
              <div className="flex flex-wrap gap-2">
                {previewReady && !previousDispatch && (
                  <button
                    type="button"
                    onClick={() => setConfirmForge(true)}
                    disabled={composeMutation.isPending || Boolean(handoff) || missing.length > 0 || !previewId}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent hover:bg-accent/15 disabled:opacity-40"
                  >
                    <Hammer className="h-3.5 w-3.5" />
                    Lancer la cascade de production
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
        title="Lancer la cascade de production ?"
        message="Les briefs manquants seront générés, les briefs périmés rafraîchis, puis le moteur produira le livrable. Cette opération peut utiliser le quota ou les crédits du service configuré. Le résultat restera à relire."
        confirmLabel="Confirmer la production"
        variant="info"
      />
    </div>
  );
}

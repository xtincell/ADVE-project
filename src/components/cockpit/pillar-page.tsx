"use client";

/**
 * PillarPage — Composant partagé pour les pages pilier du Cockpit
 *
 * Chantier 9 : chaque pilier a son propre onglet.
 * ADVE = édition guidée + bouton auto-fill
 * RTIS = gestion avancée + bouton relance protocole
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { ScoreBadge } from "@/components/shared/score-badge";
import { PageHeader } from "@/components/shared/page-header";
import { SkeletonPage } from "@/components/shared/loading-skeleton";
import { useCurrentStrategyId } from "@/components/cockpit/strategy-context";
import type { PillarKey } from "@/lib/types/advertis-vector";
import { PILLAR_SCHEMAS } from "@/lib/types/pillar-schemas";
import {
  RefreshCw, Save, AlertCircle, CheckCircle, Sparkles, Loader2,
  ThumbsUp, ThumbsDown, ChevronRight, ArrowRight,
} from "lucide-react";

// ── Config par pilier ─────────────────────────────────────────────────

const PILLAR_CONFIG: Record<string, {
  title: string;
  subtitle: string;
  pillarKey: PillarKey;
  type: "adve" | "rtis";
  accent: string;
  bgAccent: string;
}> = {
  identity: {
    title: "Identite",
    subtitle: "Qui est votre marque ? Son ADN, ses valeurs, sa vision.",
    pillarKey: "a",
    type: "adve",
    accent: "text-violet-400",
    bgAccent: "bg-violet-500/10",
  },
  positioning: {
    title: "Positionnement & Design",
    subtitle: "Comment votre marque se distingue sur le marche.",
    pillarKey: "d",
    type: "adve",
    accent: "text-blue-400",
    bgAccent: "bg-blue-500/10",
  },
  offer: {
    title: "Offre & Pricing",
    subtitle: "Votre proposition de valeur et votre modele economique.",
    pillarKey: "v",
    type: "adve",
    accent: "text-emerald-400",
    bgAccent: "bg-emerald-500/10",
  },
  engagement: {
    title: "Experience & Engagement",
    subtitle: "Comment vous creez la devotion autour de votre marque.",
    pillarKey: "e",
    type: "adve",
    accent: "text-amber-400",
    bgAccent: "bg-amber-500/10",
  },
  diagnostic: {
    title: "Diagnostic",
    subtitle: "Analyse des risques et vulnerabilites de votre strategie.",
    pillarKey: "r",
    type: "rtis",
    accent: "text-red-400",
    bgAccent: "bg-red-500/10",
  },
  market: {
    title: "Realite Marche",
    subtitle: "Ce que le marche dit de votre marque — donnees et hypotheses.",
    pillarKey: "t",
    type: "rtis",
    accent: "text-sky-400",
    bgAccent: "bg-sky-500/10",
  },
  potential: {
    title: "Potentiel",
    subtitle: "Tout ce que votre marque peut faire — le catalogue des possibles.",
    pillarKey: "i",
    type: "rtis",
    accent: "text-orange-400",
    bgAccent: "bg-orange-500/10",
  },
  roadmap: {
    title: "Strategie",
    subtitle: "Votre plan d'action pour deplacer les perceptions vers le superfan.",
    pillarKey: "s",
    type: "rtis",
    accent: "text-pink-400",
    bgAccent: "bg-pink-500/10",
  },
};

// ── Composant ─────────────────────────────────────────────────────────

interface PillarPageProps {
  pageKey: keyof typeof PILLAR_CONFIG;
}

export function PillarPage({ pageKey }: PillarPageProps) {
  const config = PILLAR_CONFIG[pageKey]!;
  const strategyId = useCurrentStrategyId();
  const [isRegenerating, setIsRegenerating] = useState(false);

  const isAdve = config.type === "adve";
  const adveKey = config.pillarKey.toUpperCase() as "A" | "D" | "V" | "E";

  const pillarQuery = trpc.pillar.get.useQuery(
    { strategyId: strategyId ?? "", key: config.pillarKey.toUpperCase() as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S" },
    { enabled: !!strategyId },
  );

  const recosQuery = trpc.pillar.getRecos.useQuery(
    { strategyId: strategyId ?? "", key: adveKey },
    { enabled: !!strategyId && isAdve },
  );

  const autoFillMutation = trpc.pillar.autoFill.useMutation({
    onSuccess: () => { pillarQuery.refetch(); if (isAdve) recosQuery.refetch(); },
  });

  const actualizeMutation = trpc.pillar.actualize.useMutation({
    onSuccess: () => pillarQuery.refetch(),
  });

  const vaultEnrichMutation = trpc.pillar.enrichFromVault.useMutation({
    onSuccess: () => { pillarQuery.refetch(); if (isAdve) recosQuery.refetch(); },
  });

  const acceptRecosMutation = trpc.pillar.acceptRecos.useMutation({
    onSuccess: () => { pillarQuery.refetch(); recosQuery.refetch(); },
  });
  const rejectRecosMutation = trpc.pillar.rejectRecos.useMutation({
    onSuccess: () => recosQuery.refetch(),
  });
  const [selectedRecos, setSelectedRecos] = useState<Set<number>>(new Set());
  const { focusedItem, openFocus, closeFocus } = useItemFocus();

  if (!strategyId) return <SkeletonPage />;
  if (pillarQuery.isLoading) return <SkeletonPage />;

  const pillar = pillarQuery.data?.pillar;
  const content = (pillar?.content ?? {}) as Record<string, unknown>;

  // Get ALL expected fields from the Zod schema (source of truth)
  const schemaKey = config.pillarKey.toUpperCase() as keyof typeof PILLAR_SCHEMAS;
  const schema = PILLAR_SCHEMAS[schemaKey];
  const allSchemaKeys = schema ? Object.keys((schema as { shape?: Record<string, unknown> }).shape ?? {}) : [];

  const isFilled = (v: unknown) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);

  // Schema keys are the source of truth. Extra keys in content that aren't in schema are ignored
  // (they're legacy data that shouldn't be displayed)
  const contentKeys = Object.keys(content);
  const extraKeys = contentKeys.filter(k => !allSchemaKeys.includes(k) && isFilled(content[k]));
  const allKeys = [...allSchemaKeys, ...extraKeys]; // Schema first, then any filled extras
  const filledFields = allKeys.filter(k => isFilled(content[k])).length;
  const totalFields = Math.max(allKeys.length, 1);
  const completionPct = Math.round((filledFields / totalFields) * 100);
  const validation = pillarQuery.data?.validation;
  const validationPct = validation?.completionPercentage ?? completionPct;

  const inlineKeys = ["secteur", "pays", "langue", "brandNature", "primaryChannel", "businessModel", "positioningArchetype", "salesChannel"];

  const handleRegenerate = async () => {
    if (!strategyId) return;
    setIsRegenerating(true);
    try {
      // 1. Vault enrichment first — scans ALL sources → produces recos
      const vaultResult = await vaultEnrichMutation.mutateAsync({
        strategyId,
        pillarKey: config.pillarKey,
      });

      // 2. If vault had no sources or no recos, fallback to auto-fill / protocol
      if (vaultResult.vaultSize === 0 || vaultResult.recommendations.length === 0) {
        if (config.type === "adve") {
          await autoFillMutation.mutateAsync({ strategyId, pillarKey: config.pillarKey });
        } else {
          await actualizeMutation.mutateAsync({ strategyId, key: config.pillarKey.toUpperCase() as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S" });
        }
      }
      // If vault produced recos → they're now in pendingRecos → panel shows them
    } finally {
      setIsRegenerating(false);
    }
  };

  // Deduplicate keys (in case schema + content have different casing or overlap)
  const dedupedKeys = [...new Set(allKeys.map(k => k.trim()))];

  // Split fields into filled vs empty, exclude inline metadata
  const filledKeys = dedupedKeys.filter(k => !inlineKeys.includes(k) && isFilled(content[k]));
  const emptyKeys = dedupedKeys.filter(k => !inlineKeys.includes(k) && !isFilled(content[k]));
  const inlineFilledKeys = dedupedKeys.filter(k => inlineKeys.includes(k) && isFilled(content[k]));

  // Classify fields for grid layout: "hero" (large), "card" (medium), "compact" (small)
  const heroFields = ["nomMarque", "fenetreOverton", "globalSwot"];
  const compactFields = ["archetype", "archetypeSecondary", "riskScore", "brandMarketFitScore", "totalActions", "coherenceScore", "globalBudget"];

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      {/* Focus modal */}
      {focusedItem ? <FocusModal item={focusedItem} onClose={closeFocus} /> : null}

      {/* ── Header: compact bar ──────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-surface-raised px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className={`text-lg font-bold ${config.accent} truncate`}>{config.title}</h1>
          {/* Inline completion */}
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-1.5 w-24 rounded-full bg-white/5">
              <div className="h-1.5 rounded-full transition-all" style={{ width: `${validationPct}%`, backgroundColor: validationPct === 100 ? "#34d399" : "#a78bfa" }} />
            </div>
            <span className="text-xs text-foreground-muted">{validationPct}%</span>
          </div>
          {/* Status badge */}
          {pillar?.validationStatus && pillar.validationStatus !== "DRAFT" ? (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              pillar.validationStatus === "VALIDATED" ? "bg-emerald-500/15 text-emerald-300" :
              pillar.validationStatus === "AI_PROPOSED" ? "bg-amber-500/15 text-amber-300" :
              "bg-white/10 text-foreground-muted"
            }`}>
              {pillar.validationStatus === "VALIDATED" ? "Valide" : pillar.validationStatus === "AI_PROPOSED" ? "IA" : pillar.validationStatus}
            </span>
          ) : null}
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            config.type === "adve"
              ? "bg-violet-600/20 text-violet-300 hover:bg-violet-600/30"
              : "bg-sky-600/20 text-sky-300 hover:bg-sky-600/30"
          } disabled:opacity-50`}
        >
          {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Enrichir
        </button>
      </div>

      {/* ── Recommendation review panel (ADVE only) ─────────────── */}
      {isAdve && recosQuery.data && (recosQuery.data as unknown as Array<Record<string, unknown>>).filter(r => r.accepted !== true).length > 0 ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-300">
                {(recosQuery.data as unknown as Array<Record<string, unknown>>).filter(r => r.accepted !== true).length} recommandation(s) R+T
              </h3>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const allIndices = (recosQuery.data as unknown as Array<Record<string, unknown>>).map((_, i) => i).filter(i => !(recosQuery.data as unknown as Array<Record<string, unknown>>)[i]?.accepted);
                  acceptRecosMutation.mutate({ strategyId: strategyId!, key: adveKey, recoIndices: allIndices });
                  setSelectedRecos(new Set());
                }}
                disabled={acceptRecosMutation.isPending}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-40"
              >
                <CheckCircle className="h-3 w-3" /> Tout accepter
              </button>
              <button
                onClick={() => {
                  const indices = Array.from(selectedRecos);
                  if (indices.length === 0) return;
                  acceptRecosMutation.mutate({ strategyId: strategyId!, key: adveKey, recoIndices: indices });
                  setSelectedRecos(new Set());
                }}
                disabled={selectedRecos.size === 0 || acceptRecosMutation.isPending}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-emerald-600/10 text-emerald-300/70 hover:bg-emerald-600/20 disabled:opacity-40"
              >
                <ThumbsUp className="h-3 w-3" /> Selection ({selectedRecos.size})
              </button>
              <button
                onClick={() => rejectRecosMutation.mutate({ strategyId: strategyId!, key: adveKey })}
                disabled={rejectRecosMutation.isPending}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium bg-red-600/20 text-red-300 hover:bg-red-600/30 disabled:opacity-40"
              >
                <ThumbsDown className="h-3 w-3" /> Tout rejeter
              </button>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {(recosQuery.data as unknown as Array<Record<string, unknown>>).map((reco, i) => {
              const isSelected = selectedRecos.has(i);
              const accepted = reco.accepted === true;
              if (accepted) return null;
              return (
                <div
                  key={i}
                  onClick={() => {
                    const next = new Set(selectedRecos);
                    if (isSelected) next.delete(i); else next.add(i);
                    setSelectedRecos(next);
                  }}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    isSelected
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          reco.operation === "ADD" ? "bg-emerald-500/15 text-emerald-300" :
                          reco.operation === "MODIFY" ? "bg-blue-500/15 text-blue-300" :
                          reco.operation === "REMOVE" ? "bg-red-500/15 text-red-300" :
                          reco.operation === "EXTEND" ? "bg-violet-500/15 text-violet-300" :
                          "bg-white/10 text-foreground-muted"
                        }`}>{String(reco.operation ?? "SET")}</span>
                        <span className="text-xs font-medium text-white">{String(reco.field)}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                          reco.impact === "HIGH" ? "bg-red-500/15 text-red-300" :
                          reco.impact === "MEDIUM" ? "bg-amber-500/15 text-amber-300" :
                          "bg-white/10 text-foreground-muted"
                        }`}>{String(reco.impact ?? "")}</span>
                        {reco.source ? <span className="text-[9px] text-foreground-muted">via {String(reco.source)}</span> : null}
                      </div>
                      <p className="text-xs text-foreground-muted">{String(reco.justification ?? "")}</p>
                    </div>
                    <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border ${
                      isSelected ? "border-emerald-400 bg-emerald-400 text-black" : "border-white/20"
                    }`}>
                      {isSelected ? <CheckCircle className="h-3 w-3" /> : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* ── Metadata badges ──────────────────────────────────────── */}
      {inlineFilledKeys.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {inlineFilledKeys.map(key => (
            <FieldRenderer key={key} fieldKey={key} value={content[key]} accent={config.accent} openFocus={openFocus} />
          ))}
        </div>
      ) : null}

      {/* ── Hero fields (full width, prominent) ──────────────────── */}
      {filledKeys.filter(k => heroFields.includes(k)).map(key => (
        <FieldRenderer key={key} fieldKey={key} value={content[key]} accent={config.accent} openFocus={openFocus} />
      ))}

      {/* ── Compact fields (grid row of small cards) ─────────────── */}
      {(() => {
        const compactFilled = filledKeys.filter(k => compactFields.includes(k));
        if (compactFilled.length === 0) return null;
        return (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {compactFilled.map(key => (
              <FieldRenderer key={key} fieldKey={key} value={content[key]} accent={config.accent} openFocus={openFocus} />
            ))}
          </div>
        );
      })()}

      {/* ── Main content — ALL fields in grid, filled + empty IN SITU ── */}
      {(() => {
        const mainKeys = allKeys.filter(k => !inlineKeys.includes(k) && !heroFields.includes(k) && !compactFields.includes(k));
        if (mainKeys.length === 0 && filledFields === 0) {
          return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 py-12 text-center">
              <AlertCircle className="mb-2 h-6 w-6 text-foreground-muted" />
              <p className="text-sm text-foreground-muted">Pilier vide</p>
              <button onClick={handleRegenerate} disabled={isRegenerating}
                className="mt-3 flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-white/15">
                {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                Generer
              </button>
            </div>
          );
        }
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {mainKeys.map(key => {
              const value = content[key];
              if (isFilled(value)) {
                return <FieldRenderer key={key} fieldKey={key} value={value} accent={config.accent} openFocus={openFocus} />;
              }
              // Empty field — visible IN SITU with dashed border
              return (
                <div key={key} className="flex items-center justify-between rounded-lg border border-dashed border-white/8 bg-white/[0.01] px-4 py-3">
                  <span className="text-xs text-foreground-muted">{fieldLabel(key)}</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted/60">vide</span>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

// ── Rich Field Renderers ──────────────────────────────────────────────

const FIELD_LABELS: Record<string, string> = {
  nomMarque: "Nom de la marque", accroche: "Accroche", description: "Description",
  secteur: "Secteur", pays: "Pays", brandNature: "Nature", langue: "Langue",
  archetype: "Archetype", archetypeSecondary: "Archetype secondaire",
  citationFondatrice: "Citation fondatrice", noyauIdentitaire: "Noyau identitaire",
  publicCible: "Public cible", promesseFondamentale: "Croyance fondamentale",
  positionnement: "Positionnement", promesseMaitre: "Promesse maitre",
  personas: "Personas", paysageConcurrentiel: "Paysage concurrentiel",
  tonDeVoix: "Ton de voix", assetsLinguistiques: "Assets linguistiques",
  directionArtistique: "Direction artistique", sousPromesses: "Sous-promesses",
  archetypalExpression: "Expression de l'archetype",
  produitsCatalogue: "Catalogue produits", productLadder: "Echelle produit",
  unitEconomics: "Unit Economics", businessModel: "Modele d'affaires",
  positioningArchetype: "Positionnement prix", salesChannel: "Canal de vente",
  pricingJustification: "Justification du pricing",
  personaSegmentMap: "Mapping persona-produit",
  touchpoints: "Touchpoints", rituels: "Rituels", aarrr: "Funnel AARRR",
  kpis: "KPIs", superfanPortrait: "Portrait du superfan",
  promesseExperience: "Promesse d'experience",
  conversionTriggers: "Triggers de conversion", barriersEngagement: "Barrieres",
  globalSwot: "SWOT", probabilityImpactMatrix: "Matrice de risques",
  mitigationPriorities: "Priorites de mitigation", riskScore: "Score de risque",
  overtonBlockers: "Blocages Overton", pillarGaps: "Diagnostic par pilier",
  triangulation: "Triangulation marche", hypothesisValidation: "Hypotheses",
  tamSamSom: "TAM / SAM / SOM", brandMarketFitScore: "Brand-Market Fit",
  overtonPosition: "Position Overton", perceptionGap: "Ecart de perception",
  catalogueParCanal: "Catalogue par canal", assetsProduisibles: "Assets produisibles",
  activationsPossibles: "Activations possibles", innovationsProduit: "Innovations",
  actionsByDevotionLevel: "Actions par niveau Devotion",
  fenetreOverton: "Fenetre d'Overton", roadmap: "Roadmap",
  sprint90Days: "Sprint 90 jours", selectedFromI: "Actions selectionnees",
  devotionFunnel: "Funnel Devotion", northStarKPI: "North Star KPI",
  valeurs: "Valeurs", herosJourney: "Parcours du heros", ikigai: "Ikigai",
  enemy: "Ennemi", prophecy: "Prophetie", doctrine: "Doctrine",
  hierarchieCommunautaire: "Hierarchie communautaire",
  equipeDirigeante: "Equipe dirigeante",
};

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
}

function FieldRenderer({ fieldKey, value, accent, openFocus }: { fieldKey: string; value: unknown; accent: string; openFocus: (item: Record<string, unknown>) => void }) {
  if (value === null || value === undefined || value === "") return null;

  // ── Brand name (large display) ────────────────────────────────
  if (fieldKey === "nomMarque" && typeof value === "string") {
    return (
      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-5">
        <p className="text-xs font-medium text-violet-400 uppercase tracking-wide">Nom de la marque</p>
        <p className="mt-1 text-2xl font-bold text-white">{value}</p>
      </div>
    );
  }

  // ── Metadata badges (secteur, pays, langue, brandNature) ──────
  if (["secteur", "pays", "langue", "brandNature", "primaryChannel"].includes(fieldKey) && typeof value === "string") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
        <span className="text-foreground-muted">{fieldLabel(fieldKey)} :</span>
        <span className="font-medium text-white">{value}</span>
      </span>
    );
  }

  // ── Archetype badge ───────────────────────────────────────────
  if (fieldKey === "archetype" && typeof value === "string") {
    return (
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-medium text-amber-400 uppercase tracking-wide">Archetype de marque</p>
        <p className="mt-1 text-lg font-bold text-amber-300">{value}</p>
      </div>
    );
  }

  // ── Persona cards ─────────────────────────────────────────────
  if (fieldKey === "personas" && Array.isArray(value)) {
    return (
      <Section title={fieldLabel(fieldKey)}>
        <div className="grid gap-2 md:grid-cols-2">
          {(value as Array<Record<string, unknown>>).map((p, i) => (
            <div key={i} onClick={() => openFocus(p)} className="cursor-pointer rounded-lg border border-white/10 bg-white/5 p-3 transition-colors hover:border-white/20 hover:bg-white/[0.08]">
              <div className="flex items-center justify-between mb-1">
                <h4 className={`text-sm font-semibold ${accent}`}>{String(p.name ?? `Persona ${i + 1}`)}</h4>
                <div className="flex items-center gap-1.5">
                  {p.devotionPotential ? <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] text-violet-300">{String(p.devotionPotential)}</span> : null}
                  {p.rank != null ? <span className="text-[9px] text-foreground-muted">#{String(p.rank)}</span> : null}
                  <ChevronRight className="h-3 w-3 text-foreground-muted/40" />
                </div>
              </div>
              {p.age != null ? <p className="text-[11px] text-foreground-muted">{String(p.age)} ans{p.csp ? ` · ${String(p.csp)}` : ""}{p.location ? ` · ${String(p.location)}` : ""}</p> : null}
              {p.motivations ? <p className="mt-1 text-xs line-clamp-2">{String(p.motivations)}</p> : null}
            </div>
          ))}
        </div>
      </Section>
    );
  }

  // ── SWOT grid ─────────────────────────────────────────────────
  if (fieldKey === "globalSwot" && typeof value === "object" && value !== null) {
    const swot = value as Record<string, unknown>;
    const quadrants = [
      { key: "strengths", label: "Forces", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" },
      { key: "weaknesses", label: "Faiblesses", color: "text-red-400 border-red-500/30 bg-red-500/5" },
      { key: "opportunities", label: "Opportunites", color: "text-blue-400 border-blue-500/30 bg-blue-500/5" },
      { key: "threats", label: "Menaces", color: "text-amber-400 border-amber-500/30 bg-amber-500/5" },
    ];
    return (
      <Section title="SWOT">
        <div className="grid gap-3 md:grid-cols-2">
          {quadrants.map(q => (
            <div key={q.key} className={`rounded-lg border p-3 ${q.color}`}>
              <h4 className="mb-2 text-sm font-semibold">{q.label}</h4>
              <ul className="space-y-1 text-xs">
                {Array.isArray(swot[q.key]) && (swot[q.key] as string[]).map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  // ── Risk matrix ───────────────────────────────────────────────
  if (fieldKey === "probabilityImpactMatrix" && Array.isArray(value)) {
    const levelColor: Record<string, string> = { LOW: "text-emerald-400", MEDIUM: "text-amber-400", HIGH: "text-red-400" };
    return (
      <Section title={fieldLabel(fieldKey)}>
        <div className="space-y-2">
          {(value as Array<Record<string, unknown>>).map((r, i) => (
            <div key={i} className="flex items-start gap-3 rounded border border-white/5 bg-white/5 p-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{String(r.risk)}</p>
                {r.mitigation ? <p className="mt-1 text-xs text-foreground-muted">{String(r.mitigation)}</p> : null}
              </div>
              <div className="flex gap-2 text-xs">
                <span className={levelColor[String(r.probability)] ?? ""}>P:{String(r.probability)}</span>
                <span className={levelColor[String(r.impact)] ?? ""}>I:{String(r.impact)}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  // ── Touchpoints list ──────────────────────────────────────────
  if (fieldKey === "touchpoints" && Array.isArray(value)) {
    return (
      <Section title={fieldLabel(fieldKey)}>
        <div className="space-y-2">
          {(value as Array<Record<string, unknown>>).map((t, i) => (
            <div key={i} className="flex items-center gap-3 rounded border border-white/5 bg-white/5 px-3 py-2">
              <span className="text-sm font-medium">{String(t.canal ?? t.type ?? `Touchpoint ${i + 1}`)}</span>
              {t.aarrStage ? <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs text-blue-300">{String(t.aarrStage)}</span> : null}
              {t.role ? <span className="text-xs text-foreground-muted">{String(t.role)}</span> : null}
            </div>
          ))}
        </div>
      </Section>
    );
  }

  // ── Roadmap phases ────────────────────────────────────────────
  if (fieldKey === "roadmap" && Array.isArray(value)) {
    return (
      <Section title={fieldLabel(fieldKey)}>
        <div className="space-y-3">
          {(value as Array<Record<string, unknown>>).map((phase, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <h4 className={`font-semibold ${accent}`}>{String(phase.phase ?? `Phase ${i + 1}`)}</h4>
                {phase.duree ? <span className="text-xs text-foreground-muted">{String(phase.duree)}</span> : null}
              </div>
              <p className="mt-1 text-sm">{String(phase.objectif ?? "")}</p>
              {phase.objectifDevotion ? <span className="mt-2 inline-block rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">{String(phase.objectifDevotion)}</span> : null}
              {phase.budget ? <span className="ml-2 text-xs text-foreground-muted">{Number(phase.budget).toLocaleString()} XAF</span> : null}
            </div>
          ))}
        </div>
      </Section>
    );
  }

  // ── Sprint 90 days ────────────────────────────────────────────
  if (fieldKey === "sprint90Days" && Array.isArray(value)) {
    return (
      <Section title={fieldLabel(fieldKey)}>
        <div className="space-y-1">
          {(value as Array<Record<string, unknown>>).map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded bg-white/5 px-3 py-2">
              <span className={`text-xs font-bold ${accent}`}>#{String(a.priority ?? i + 1)}</span>
              <span className="flex-1 text-sm">{String(a.action)}</span>
              {a.devotionImpact ? <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">{String(a.devotionImpact)}</span> : null}
              {a.kpi ? <span className="text-xs text-foreground-muted">{String(a.kpi)}</span> : null}
            </div>
          ))}
        </div>
      </Section>
    );
  }

  // ── Fenetre d'Overton ─────────────────────────────────────────
  if (fieldKey === "fenetreOverton" && typeof value === "object" && value !== null) {
    const ov = value as Record<string, unknown>;
    return (
      <Section title="Fenetre d'Overton">
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <p className="text-xs font-semibold text-red-400">Perception actuelle</p>
              <p className="mt-1 text-sm">{String(ov.perceptionActuelle ?? "Non mesure")}</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <p className="text-xs font-semibold text-emerald-400">Perception cible</p>
              <p className="mt-1 text-sm">{String(ov.perceptionCible ?? "Non defini")}</p>
            </div>
          </div>
          {ov.ecart ? (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-semibold text-amber-400">Ecart a combler</p>
              <p className="mt-1 text-sm">{String(ov.ecart)}</p>
            </div>
          ) : null}
        </div>
      </Section>
    );
  }

  // ── TAM/SAM/SOM ───────────────────────────────────────────────
  if (fieldKey === "tamSamSom" && typeof value === "object" && value !== null) {
    const tam = value as Record<string, Record<string, unknown>>;
    return (
      <Section title="TAM / SAM / SOM">
        <div className="grid gap-3 md:grid-cols-3">
          {(["tam", "sam", "som"] as const).map(k => {
            const d = tam[k];
            if (!d) return null;
            return (
              <div key={k} className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                <p className="text-xs font-semibold text-foreground-muted">{k.toUpperCase()}</p>
                <p className={`text-lg font-bold ${accent}`}>{d.value ? Number(d.value).toLocaleString() : "—"}</p>
                <p className="text-xs text-foreground-muted">{String(d.description ?? "")}</p>
                {d.source ? <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${d.source === "verified" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{d.source === "verified" ? "Verifie" : "Estimation IA"}</span> : null}
              </div>
            );
          })}
        </div>
      </Section>
    );
  }

  // ── Ikigai ────────────────────────────────────────────────────
  if (fieldKey === "ikigai" && typeof value === "object" && value !== null) {
    const ik = value as Record<string, unknown>;
    const quadrants = [
      { key: "love", label: "Ce qu'on aime", color: "text-pink-400" },
      { key: "competence", label: "Ce qu'on sait faire", color: "text-blue-400" },
      { key: "worldNeed", label: "Ce dont le monde a besoin", color: "text-emerald-400" },
      { key: "remuneration", label: "Ce pour quoi on est paye", color: "text-amber-400" },
    ];
    return (
      <Section title="Ikigai">
        <div className="grid gap-3 md:grid-cols-2">
          {quadrants.map(q => (
            <div key={q.key} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className={`text-xs font-semibold ${q.color}`}>{q.label}</p>
              <p className="mt-1 text-sm">{String(ik[q.key] ?? "—")}</p>
            </div>
          ))}
        </div>
      </Section>
    );
  }

  // ── Valeurs (Schwartz) ────────────────────────────────────────
  if (fieldKey === "valeurs" && Array.isArray(value)) {
    return (
      <Section title={fieldLabel(fieldKey)}>
        <div className="space-y-2">
          {(value as Array<Record<string, unknown>>).map((v, i) => (
            <div key={i} className="rounded border border-white/5 bg-white/5 p-3">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${accent}`}>{String(v.customName ?? v.value ?? `Valeur ${i + 1}`)}</span>
                {v.rank ? <span className="text-xs text-foreground-muted">#{String(v.rank)}</span> : null}
              </div>
              {v.justification ? <p className="mt-1 text-xs text-foreground-muted">{String(v.justification)}</p> : null}
            </div>
          ))}
        </div>
      </Section>
    );
  }

  // ── Numeric score ─────────────────────────────────────────────
  if (typeof value === "number") {
    return (
      <Section title={fieldLabel(fieldKey)}>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${accent}`}>{value}</span>
          {fieldKey.includes("Score") || fieldKey.includes("score") ? <span className="text-sm text-foreground-muted">/ 100</span> : null}
        </div>
      </Section>
    );
  }

  // ── Simple string ─────────────────────────────────────────────
  if (typeof value === "string") {
    return (
      <Section title={fieldLabel(fieldKey)}>
        <p className="whitespace-pre-wrap text-sm">{value}</p>
      </Section>
    );
  }

  // ── Generic array — compact cards, click to focus ──────────────
  if (Array.isArray(value)) {
    return (
      <Section title={`${fieldLabel(fieldKey)} (${value.length})`}>
        <div className="space-y-1">
          {value.slice(0, 12).map((item, i) => (
            <div
              key={i}
              onClick={typeof item === "object" && item !== null ? () => openFocus(item as Record<string, unknown>) : undefined}
              className={`rounded bg-white/5 px-3 py-2 text-xs ${typeof item === "object" ? "cursor-pointer hover:bg-white/[0.08] transition-colors" : ""}`}
            >
              {typeof item === "string" ? (
                <span>{item}</span>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 min-w-0">
                    {Object.entries(item as Record<string, unknown>)
                      .filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object")
                      .slice(0, 5)
                      .map(([k, v]) => (
                        <span key={k}><span className="text-foreground-muted">{k}:</span> {String(v).slice(0, 60)}</span>
                      ))}
                  </div>
                  <ChevronRight className="h-3 w-3 flex-shrink-0 text-foreground-muted/30" />
                </div>
              )}
            </div>
          ))}
          {value.length > 12 ? <p className="text-[10px] text-foreground-muted px-1">+{value.length - 12} autres</p> : null}
        </div>
      </Section>
    );
  }

  // ── Generic object — expand nested content ─────────────────
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined);
    if (entries.length === 0) return null;
    return (
      <Section title={fieldLabel(fieldKey)}>
        <div className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="rounded bg-white/5 px-3 py-2">
              <span className="text-xs font-medium text-foreground-muted">{fieldLabel(k)}</span>
              {typeof v === "string" ? (
                <p className="text-sm mt-0.5">{v}</p>
              ) : Array.isArray(v) ? (
                <div className="mt-1 space-y-1">
                  {v.slice(0, 8).map((item, i) => (
                    <div key={i} className="rounded bg-white/5 px-2 py-1 text-xs">
                      {typeof item === "string" ? item : (
                        <span className="flex flex-wrap gap-x-2">
                          {Object.entries(item as Record<string, unknown>)
                            .filter(([, val]) => val != null && val !== "")
                            .slice(0, 5)
                            .map(([ik, iv]) => (
                              <span key={ik}><span className="text-foreground-muted">{ik}:</span> {String(iv).slice(0, 60)}</span>
                            ))}
                        </span>
                      )}
                    </div>
                  ))}
                  {v.length > 8 ? <p className="text-[10px] text-foreground-muted">+{v.length - 8} autres</p> : null}
                </div>
              ) : typeof v === "object" && v !== null ? (
                <div className="mt-1 space-y-1">
                  {Object.entries(v as Record<string, unknown>)
                    .filter(([, val]) => val != null && val !== "")
                    .map(([ik, iv]) => (
                      <p key={ik} className="text-xs"><span className="text-foreground-muted">{ik}:</span> {String(iv).slice(0, 100)}</p>
                    ))}
                </div>
              ) : (
                <p className="text-sm mt-0.5">{String(v)}</p>
              )}
            </div>
          ))}
        </div>
      </Section>
    );
  }

  return null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/5 bg-surface-raised p-4">
      <h3 className="mb-3 text-sm font-semibold text-foreground-muted uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

// ── Focus Modal — click any card item to see full detail ──────────────

function FocusModal({ item, onClose }: { item: Record<string, unknown>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-1 text-foreground-muted hover:bg-white/10 hover:text-white">
          <AlertCircle className="h-4 w-4" />
        </button>
        <div className="space-y-3">
          {Object.entries(item)
            .filter(([, v]) => v !== null && v !== undefined && v !== "")
            .map(([key, value]) => (
              <div key={key}>
                <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide">{fieldLabel(key)}</p>
                {typeof value === "string" ? (
                  <p className="mt-0.5 text-sm text-white whitespace-pre-wrap">{value}</p>
                ) : Array.isArray(value) ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {value.map((v, i) => (
                      <span key={i} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white">{typeof v === "string" ? v : JSON.stringify(v)}</span>
                    ))}
                  </div>
                ) : typeof value === "object" && value !== null ? (
                  <pre className="mt-1 overflow-x-auto rounded bg-white/5 p-2 text-xs text-foreground-muted">{JSON.stringify(value, null, 2)}</pre>
                ) : (
                  <p className="mt-0.5 text-sm text-white">{String(value)}</p>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function useItemFocus() {
  const [focusedItem, setFocusedItem] = useState<Record<string, unknown> | null>(null);
  return { focusedItem, openFocus: setFocusedItem, closeFocus: () => setFocusedItem(null) };
}

export { PILLAR_CONFIG };

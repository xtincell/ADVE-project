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
import {
  RefreshCw, Save, AlertCircle, CheckCircle, Sparkles, Loader2,
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

  const pillarQuery = trpc.pillar.get.useQuery(
    { strategyId: strategyId ?? "", key: config.pillarKey.toUpperCase() as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S" },
    { enabled: !!strategyId },
  );

  const autoFillMutation = trpc.pillar.autoFill.useMutation({
    onSuccess: () => pillarQuery.refetch(),
  });

  const actualizeMutation = trpc.pillar.actualize.useMutation({
    onSuccess: () => pillarQuery.refetch(),
  });

  if (!strategyId) return <SkeletonPage />;
  if (pillarQuery.isLoading) return <SkeletonPage />;

  const pillar = pillarQuery.data?.pillar;
  const content = (pillar?.content ?? {}) as Record<string, unknown>;
  const filledFields = Object.entries(content).filter(([, v]) =>
    v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)
  ).length;
  const totalFields = Math.max(Object.keys(content).length, 1);
  const completionPct = Math.round((filledFields / totalFields) * 100);
  const validation = pillarQuery.data?.validation;
  const validationPct = validation?.completionPercentage ?? completionPct;

  const handleRegenerate = async () => {
    if (!strategyId) return;
    setIsRegenerating(true);
    try {
      if (config.type === "adve") {
        await autoFillMutation.mutateAsync({ strategyId, pillarKey: config.pillarKey });
      } else {
        await actualizeMutation.mutateAsync({ strategyId, key: config.pillarKey.toUpperCase() as "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S" });
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className={`text-2xl font-bold ${config.accent}`}>{config.title}</h1>
          <p className="mt-1 text-sm text-foreground-muted">{config.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <ScoreBadge
            score={validationPct * 2} // Approximate /200 from %
            maxScore={200}
            size="sm"
            mode="cockpit"
            showClassification={false}
          />
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              config.type === "adve"
                ? "bg-violet-600/20 text-violet-300 hover:bg-violet-600/30"
                : "bg-sky-600/20 text-sky-300 hover:bg-sky-600/30"
            } disabled:opacity-50`}
          >
            {isRegenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : config.type === "adve" ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {config.type === "adve" ? "Enrichir avec l'IA" : "Relancer le protocole"}
          </button>
        </div>
      </div>

      {/* Completion bar */}
      <div className={`rounded-lg border border-white/5 p-4 ${config.bgAccent}`}>
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-foreground-muted">Completude</span>
          <span className={`font-semibold ${config.accent}`}>{validationPct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${validationPct}%`,
              backgroundColor: `color-mix(in oklch, currentColor 60%, transparent)`,
            }}
          />
        </div>
      </div>

      {/* Validation status */}
      {pillar?.validationStatus && (
        <div className="flex items-center gap-2 text-sm">
          {pillar.validationStatus === "VALIDATED" ? (
            <CheckCircle className="h-4 w-4 text-emerald-400" />
          ) : pillar.validationStatus === "AI_PROPOSED" ? (
            <Sparkles className="h-4 w-4 text-amber-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-foreground-muted" />
          )}
          <span className="text-foreground-muted">
            Statut : {
              pillar.validationStatus === "VALIDATED" ? "Valide" :
              pillar.validationStatus === "AI_PROPOSED" ? "Proposition IA — a valider" :
              pillar.validationStatus === "LOCKED" ? "Verrouille" :
              "Brouillon"
            }
          </span>
        </div>
      )}

      {/* Content display — rich renderers by field type */}
      <div className="space-y-4">
        {/* Inline metadata badges grouped together */}
        {(() => {
          const inlineKeys = ["secteur", "pays", "langue", "brandNature", "primaryChannel", "businessModel", "positioningArchetype", "salesChannel"];
          const inlineEntries = Object.entries(content).filter(([k, v]) => inlineKeys.includes(k) && v != null && v !== "");
          if (inlineEntries.length > 0) {
            return (
              <div className="flex flex-wrap gap-2">
                {inlineEntries.map(([key, value]) => (
                  <FieldRenderer key={key} fieldKey={key} value={value} accent={config.accent} />
                ))}
              </div>
            );
          }
          return null;
        })()}

        {/* Non-inline fields */}
        {Object.entries(content).map(([key, value]) => {
          if (value === null || value === undefined) return null;
          const inlineKeys = ["secteur", "pays", "langue", "brandNature", "primaryChannel", "businessModel", "positioningArchetype", "salesChannel"];
          if (inlineKeys.includes(key)) return null; // Already rendered above
          return <FieldRenderer key={key} fieldKey={key} value={value} accent={config.accent} />;
        })}

        {filledFields === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 py-16 text-center">
            <AlertCircle className="mb-3 h-8 w-8 text-foreground-muted" />
            <p className="text-foreground-muted">Ce pilier est vide.</p>
            <button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="mt-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-foreground hover:bg-white/15"
            >
              {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {config.type === "adve" ? "Generer avec l'IA" : "Lancer le protocole"}
            </button>
          </div>
        )}
      </div>
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

function FieldRenderer({ fieldKey, value, accent }: { fieldKey: string; value: unknown; accent: string }) {
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
        <div className="grid gap-3 md:grid-cols-2">
          {(value as Array<Record<string, unknown>>).map((p, i) => (
            <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <h4 className={`font-semibold ${accent}`}>{String(p.name ?? `Persona ${i + 1}`)}</h4>
                {p.rank != null ? <span className="text-xs text-foreground-muted">#{String(p.rank)}</span> : null}
              </div>
              {p.age != null ? <p className="text-xs text-foreground-muted">{String(p.age)} ans{p.csp ? ` — ${String(p.csp)}` : ""}{p.location ? ` — ${String(p.location)}` : ""}</p> : null}
              {p.motivations ? <p className="mt-2 text-sm"><span className="font-medium text-emerald-400">Motivations :</span> {String(p.motivations)}</p> : null}
              {p.fears ? <p className="text-sm"><span className="font-medium text-red-400">Craintes :</span> {String(p.fears)}</p> : null}
              {p.hiddenDesire ? <p className="text-sm"><span className="font-medium text-amber-400">Desir cache :</span> {String(p.hiddenDesire)}</p> : null}
              {p.devotionPotential ? <span className="mt-2 inline-block rounded-full bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">{String(p.devotionPotential)}</span> : null}
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

  // ── Generic array ─────────────────────────────────────────────
  if (Array.isArray(value)) {
    return (
      <Section title={fieldLabel(fieldKey)}>
        <div className="space-y-1">
          {value.slice(0, 15).map((item, i) => (
            <div key={i} className="rounded bg-white/5 px-3 py-2 text-sm">
              {typeof item === "string" ? item : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(item as Record<string, unknown>)
                    .filter(([, v]) => v !== null && v !== undefined && v !== "")
                    .slice(0, 4)
                    .map(([k, v]) => (
                      <span key={k}><span className="text-foreground-muted">{k}:</span> {String(v).slice(0, 80)}</span>
                    ))}
                </div>
              )}
            </div>
          ))}
          {value.length > 15 && <p className="text-xs text-foreground-muted">+{value.length - 15} autres...</p>}
        </div>
      </Section>
    );
  }

  // ── Generic object ────────────────────────────────────────────
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== null && v !== undefined);
    if (entries.length === 0) return null;
    return (
      <Section title={fieldLabel(fieldKey)}>
        <div className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="rounded bg-white/5 px-3 py-2">
              <span className="text-xs font-medium text-foreground-muted">{fieldLabel(k)}</span>
              <p className="text-sm">{typeof v === "string" ? v : Array.isArray(v) ? `${v.length} items` : JSON.stringify(v)}</p>
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

export { PILLAR_CONFIG };

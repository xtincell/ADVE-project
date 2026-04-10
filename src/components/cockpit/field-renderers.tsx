"use client";

/**
 * DESIGN SYSTEM — Renderers automatiques par type de donnée
 *
 * Chaque type Zod mappe vers UN composant visuel.
 * Plus d'improvisation — le type dicte le rendu.
 *
 * Usage : <AutoField fieldKey="nomMarque" value={content.nomMarque} schema={schema} accent={accent} onFocus={openFocus} />
 */

import { useState } from "react";
import { getVariableSpec } from "@/lib/types/variable-bible";
import {
  ChevronRight, AlertCircle, Quote, Target, Zap, Shield, Flame,
  Star, Clock, DollarSign, Users, Lightbulb, BookOpen, Swords,
  Eye, FileText, Palette, Volume2, Hash, TrendingUp, Megaphone,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

interface FieldProps {
  fieldKey: string;
  label: string;
  value: unknown;
  accent: string;
  onFocus?: (item: Record<string, unknown>) => void;
  span?: 1 | 2; // grid column span
}

// ── Label Map ─────────────────────────────────────────────────────────

const LABELS: Record<string, string> = {
  nomMarque: "Nom de la marque", accroche: "Accroche", description: "Description",
  secteur: "Secteur", pays: "Pays", brandNature: "Nature", langue: "Langue",
  archetype: "Archetype", archetypeSecondary: "Archetype secondaire",
  citationFondatrice: "Citation fondatrice", noyauIdentitaire: "Noyau identitaire",
  publicCible: "Public cible", promesseFondamentale: "Croyance fondamentale",
  positionnement: "Positionnement", promesseMaitre: "Promesse maitre",
  personas: "Personas", paysageConcurrentiel: "Concurrents",
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
  coherenceRisks: "Risques de coherence", devotionVulnerabilities: "Vulnerabilites Devotion",
  triangulation: "Triangulation marche", hypothesisValidation: "Hypotheses",
  tamSamSom: "TAM / SAM / SOM", brandMarketFitScore: "Brand-Market Fit",
  overtonPosition: "Position Overton", perceptionGap: "Ecart de perception",
  riskValidation: "Validation des risques", competitorOvertonPositions: "Concurrents Overton",
  catalogueParCanal: "Catalogue par canal", assetsProduisibles: "Assets produisibles",
  activationsPossibles: "Activations", innovationsProduit: "Innovations produit",
  actionsByDevotionLevel: "Actions par Devotion", riskMitigationActions: "Actions de mitigation",
  hypothesisTestActions: "Tests d'hypotheses", formatsDisponibles: "Formats disponibles",
  fenetreOverton: "Fenetre d'Overton", roadmap: "Roadmap",
  sprint90Days: "Sprint 90 jours", selectedFromI: "Actions selectionnees depuis I",
  devotionFunnel: "Funnel Devotion", overtonMilestones: "Jalons Overton",
  northStarKPI: "North Star KPI", budgetByDevotion: "Budget par Devotion",
  axesStrategiques: "Axes strategiques", facteursClesSucces: "Facteurs cles de succes",
  valeurs: "Valeurs", herosJourney: "Parcours du heros", ikigai: "Ikigai",
  enemy: "Ennemi", prophecy: "Prophetie", doctrine: "Doctrine",
  livingMythology: "Mythologie vivante", hierarchieCommunautaire: "Hierarchie communautaire",
  equipeDirigeante: "Equipe dirigeante", equipeComplementarite: "Complementarite equipe",
  timelineNarrative: "Timeline narrative", totalActions: "Total actions",
  globalBudget: "Budget global", coherenceScore: "Coherence",
  syntheseExecutive: "Synthese executive", visionStrategique: "Vision strategique",
  promesseDeValeur: "Promesse de valeur", mvp: "MVP", proprieteIntellectuelle: "Propriete intellectuelle",
  gamification: "Gamification", principesCommunautaires: "Principes communautaires",
  sacredCalendar: "Calendrier sacre", commandments: "Commandements",
  ritesDePassage: "Rites de passage", sacraments: "Sacrements", taboos: "Tabous",
  sacredObjects: "Objets sacres", proofPoints: "Proof Points", symboles: "Symboles",
  rejectedFromI: "Actions rejetees", recommandationsPrioritaires: "Recommandations",
  marketReality: "Realite marche", weakSignalAnalysis: "Signaux faibles",
  traction: "Traction", marketDataSources: "Sources de donnees",
  brandPlatform: "Plateforme de marque", copyStrategy: "Copy strategy",
  bigIdea: "Big Idea", potentielBudget: "Budget potentiel", mediaPlan: "Plan media",
  productExperienceMap: "Experience par produit", ladderProductAlignment: "Devotion x Produit",
  channelTouchpointMap: "Canaux x Touchpoints",
  economicModels: "Modeles economiques", freeLayer: "Layer gratuit",
  kpiDashboard: "KPI Dashboard", teamStructure: "Equipe mobilisee",
  budgetBreakdown: "Ventilation budget",
  // Atom-level labels
  action: "Action", nom: "Nom", name: "Nom", format: "Format", objectif: "Objectif",
  pilierImpact: "Pilier impacte", devotionImpact: "Impact Devotion", overtonShift: "Shift Overton",
  canal: "Canal", cible: "Cible", budgetEstime: "Budget estime", activation: "Activation",
  type: "Type", feasibility: "Faisabilite", horizon: "Horizon", phase: "Phase",
  duree: "Duree", budget: "Budget", objectifDevotion: "Objectif Devotion",
  priority: "Priorite", owner: "Responsable", kpi: "KPI", isRiskMitigation: "Mitigation risque",
  sourceRef: "Source", age: "Age", csp: "CSP", location: "Localisation",
  income: "Revenu", familySituation: "Situation familiale", motivations: "Motivations",
  fears: "Craintes", hiddenDesire: "Desir cache", lifestyle: "Style de vie",
  devotionPotential: "Potentiel Devotion", rank: "Rang", prix: "Prix", cout: "Cout",
  margeUnitaire: "Marge unitaire", categorie: "Categorie", segmentCible: "Segment cible",
  phaseLifecycle: "Phase cycle de vie", lienPromesse: "Lien promesse",
  risk: "Risque", probability: "Probabilite", impact: "Impact", mitigation: "Mitigation",
  actNumber: "Acte", title: "Titre", narrative: "Recit", emotionalArc: "Arc emotionnel",
  causalLink: "Lien causal", value: "Valeur", customName: "Nom personnalise",
  justification: "Justification", costOfHolding: "Cout de maintien",
  personnalite: "Personnalite", onDit: "On dit", onNeditPas: "On ne dit pas",
  bio: "Biographie", role: "Role", competencesCles: "Competences cles",
  experiencePasse: "Experience passee", credentials: "Credentials",
  allocationPct: "Allocation temps", manifesto: "Manifesto",
  counterStrategy: "Contre-strategie", marketingCounter: "Contre marketing",
  activeOpposition: "Opposition active", passiveOpposition: "Opposition passive",
  worldTransformed: "Monde transforme", pioneers: "Pionniers", urgency: "Urgence",
  dogmas: "Dogmes", principles: "Principes", practices: "Pratiques",
  gainClientConcret: "Gain client concret",
  gainClientAbstrait: "Gain client abstrait",
  // Hierarchie & communaute
  level: "Niveau", privileges: "Privileges", entryCriteria: "Critere d'entree",
  principle: "Principe", commandment: "Commandement",
  nomSacre: "Nom sacre", reward: "Recompense", kpiMeasure: "KPI de mesure",
  frequency: "Frequence", date: "Date", significance: "Signification",
  rituelEntree: "Rituel d'entree", fromStage: "De", toStage: "Vers",
  taboo: "Tabou", consequence: "Consequence",
  // Timeline narrative sub-fields
  origine: "Origine",
  transformation: "Transformation", present: "Present", futur: "Futur",
  // Mythologie & cult marketing
  foundingMyth: "Mythe fondateur", heroicMoments: "Moments heroiques",
  sacredRituals: "Rituels sacres", canon: "Canon", extensionRules: "Regles d'extension",
  captureSystem: "Systeme de capture", sharedHatred: "Haine partagee",
  bondingRituals: "Rituels de cohesion", fraternityFuel: "Carburant de fraternite",
  overtonMap: "Carte Overton", ourPosition: "Notre position",
  enemyPosition: "Position ennemie", battleground: "Terrain de combat",
  shiftDirection: "Direction du shift", enemyBrands: "Marques ennemies",
  howTheyFight: "Leur strategie", enemySchwartzValues: "Valeurs ennemies",
  // Direction artistique
  semioticAnalysis: "Analyse semiotique", visualLandscape: "Paysage visuel",
  moodboard: "Moodboard", chromaticStrategy: "Strategie chromatique",
  typographySystem: "Systeme typographique", logoTypeRecommendation: "Recommandation logo",
  logoValidation: "Validation logo", designTokens: "Design tokens",
  motionIdentity: "Identite mouvement", brandGuidelines: "Charte graphique",
  lsiMatrix: "Matrice LSI", dominantSigns: "Signes dominants",
  gloryOutputId: "ID Glory",
  // Engagement
  personaRef: "Persona ref", productRef: "Produit ref",
  touchpointRefs: "Touchpoints", emotionalOutcome: "Resultat emotionnel",
  experienceDescription: "Experience", entryAction: "Action d'entree",
  upgradeAction: "Action d'upgrade", fromLevel: "De", toLevel: "Vers",
  trigger: "Declencheur", barrier: "Barriere", enforcement: "Application",
  // Assets & Identite
  slogan: "Slogan", tagline: "Tagline", motto: "Devise",
  mantras: "Mantras", lexiquePropre: "Lexique propre",
  languePrincipale: "Langue principale", languesSecondaires: "Langues secondaires",
  word: "Mot", definition: "Definition",
  sign: "Signe", meaning: "Signification", culturalContext: "Contexte culturel",
  archetypeVisual: "Archetype visuel", semioticTensions: "Tensions semiotiques",
  tension: "Tension", resolution: "Resolution",
  competitors: "Concurrents", visualIdentity: "Identite visuelle",
  differentiator: "Differenciateur", whitespace: "Espace blanc",
  positioningMap: "Carte de positionnement", xAxis: "Axe X", yAxis: "Axe Y",
  brandPosition: "Position de marque",
  theme: "Theme", keywords: "Mots-cles",
  colorPalette: "Palette de couleurs", hex: "Hex", usage: "Usage",
  textures: "Textures", references: "References", source: "Source",
  primaryColors: "Couleurs primaires", secondaryColors: "Couleurs secondaires",
  emotion: "Emotion", gradients: "Degrades", from: "De", to: "Vers",
  forbiddenColors: "Couleurs interdites", reason: "Raison",
  accessibilityNotes: "Notes accessibilite",
  primaryFont: "Police principale", secondaryFont: "Police secondaire",
  category: "Categorie", size: "Taille", weight: "Graisse",
  hierarchy: "Hierarchie", rules: "Regles",
  logoType: "Type de logo", rationale: "Justification",
  variations: "Variations", doNots: "A eviter",
  strengths: "Forces", weaknesses: "Faiblesses",
  recommendations: "Recommandations", culturalFit: "Adequation culturelle",
  spacing: "Espacements", borderRadius: "Rayons de bordure",
  shadows: "Ombres", breakpoints: "Points de rupture",
  personality: "Personnalite", transitions: "Transitions",
  duration: "Duree", easing: "Courbe", microInteractions: "Micro-interactions",
  animation: "Animation",
  sections: "Sections", content: "Contenu",
  dosAndDonts: "A faire / A eviter",
  applicationExamples: "Exemples d'application", medium: "Support",
  concepts: "Concepts", layers: "Couches",
  sublimationRules: "Regles de sublimation", literal: "Litteral", sublimated: "Sublime",
  // Engagement sacre
  socialSignal: "Signal social", form: "Forme", stage: "Stade",
  claim: "Affirmation",
  symbol: "Symbole", meanings: "Significations", usageContexts: "Contextes d'usage",
  // Concurrents
  partDeMarcheEstimee: "Part de marche estimee", avantagesCompetitifs: "Avantages competitifs",
  faiblesses: "Faiblesses", strategiePos: "Strategie de positionnement",
  distinctiveAssets: "Assets distinctifs", menaceNiveau: "Menace",
  // Generics
  score: "Score", gaps: "Lacunes", pillar1: "Pilier 1", pillar2: "Pilier 2",
  field1: "Champ 1", field2: "Champ 2", contradiction: "Contradiction",
  severity: "Severite", status: "Statut", evidence: "Preuve",
  hypothesis: "Hypothese", validationMethod: "Methode de validation",
  // V — Pricing & Economics
  whatIsFree: "Ce qui est gratuit",
  whatIsPaid: "Ce qui est payant", conversionLever: "Levier de conversion",
  cac: "Cout d'acquisition",
  ltv: "Valeur vie client", ltvCacRatio: "Ratio LTV/CAC",
  pointMort: "Point mort", margeNette: "Marge nette",
  roiEstime: "ROI estime", paybackPeriod: "Periode de retour",
  budgetCom: "Budget communication", caVise: "CA vise",
  riskHedging: "Couverture de risque",
  canalDistribution: "Canal distribution", disponibilite: "Disponibilite",
  skuRef: "Reference SKU", produitIds: "Produits",
  exists: "Existe", features: "Fonctionnalites",
  launchDate: "Date de lancement", userCount: "Utilisateurs",
  feedbackSummary: "Resume feedback",
  brevets: "Brevets", statut: "Statut", numero: "Numero",
  secretsCommerciaux: "Secrets commerciaux",
  technologieProprietary: "Technologie proprietaire",
  barrieresEntree: "Barrieres a l'entree", licences: "Licences",
  protectionScore: "Score de protection",
  gainMarqueConcret: "Gain marque concret", gainMarqueAbstrait: "Gain marque abstrait",
  coutClientConcret: "Cout client concret", coutClientAbstrait: "Cout client abstrait",
  coutMarqueConcret: "Cout marque concret", coutMarqueAbstrait: "Cout marque abstrait",
  valeurMarqueTangible: "Valeur marque tangible", valeurMarqueIntangible: "Valeur marque intangible",
  valeurClientTangible: "Valeur client tangible", valeurClientIntangible: "Valeur client intangible",
  coutMarqueTangible: "Cout marque tangible", coutMarqueIntangible: "Cout marque intangible",
  coutClientTangible: "Cout client tangible", coutClientIntangible: "Cout client intangible",
  // E — Engagement
  primaryChannel: "Canal principal",
  aarrStage: "Etape AARRR", aarrPrimary: "AARRR principal",
  // R — Risk
  blockingPerception: "Perception bloquante", devotionLevelBlocked: "Niveau Devotion bloque",
  churnCause: "Cause de desabonnement",
  // T — Track
  macroTrends: "Tendances macro", weakSignals: "Signaux faibles",
  currentPerception: "Perception actuelle", targetPerception: "Perception cible",
  measurementMethod: "Methode de mesure", measuredAt: "Mesure le",
  confidence: "Confiance", segment: "Segment", perception: "Perception",
  gapDescription: "Description de l'ecart", gapScore: "Score ecart",
  relativeToUs: "Position relative",
  customerInterviews: "Entretiens clients", competitiveAnalysis: "Analyse concurrentielle",
  trendAnalysis: "Analyse tendances", financialBenchmarks: "Benchmarks financiers",
  // S — Strategie
  axe: "Axe", pillarsLinked: "Piliers lies",
  perceptionActuelle: "Perception actuelle", perceptionCible: "Perception cible",
  ecart: "Ecart", strategieDeplacement: "Strategie de deplacement",
  etape: "Etape", devotionTarget: "Cible Devotion", riskRef: "Ref risque",
  hypothesisRef: "Ref hypothese", responsibility: "Responsabilite",
  pillar: "Pilier", target: "Objectif",
  spectateurs: "Spectateurs", interesses: "Interesses",
  participants: "Participants", engages: "Engages",
  ambassadeurs: "Ambassadeurs", evangelistes: "Evangelistes",
  acquisition: "Acquisition", conversion: "Conversion",
  retention: "Retention", evangelisation: "Evangelisation",
  currentValue: "Valeur actuelle", recommendation: "Recommandation",
};

export function getFieldLabel(key: string): string {
  return LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase());
}

// ── Core atoms ────────────────────────────────────────────────────────

function Card({ children, className, span }: { children: React.ReactNode; className?: string; span?: 1 | 2 }) {
  return (
    <div className={`rounded-lg border border-white/5 bg-surface-raised p-4 ${span === 2 ? "md:col-span-2" : ""} ${className ?? ""}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide mb-1.5">{children}</p>;
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-dashed border-white/8 bg-white/[0.01] px-4 py-3">
      <span className="text-xs text-foreground-muted">{label}</span>
      <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted/60">vide</span>
    </div>
  );
}

// ── Renderers ─────────────────────────────────────────────────────────

/** Hero — large title display (brand name, etc.) */
export function HeroCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <Card span={2} className={`border-violet-500/20 bg-violet-500/5`}>
      <Label>{label}</Label>
      <p className={`text-2xl font-bold text-white`}>{value}</p>
    </Card>
  );
}

/** Quote — citation with guillemets */
export function QuoteCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <Label>{label}</Label>
      <blockquote className="border-l-2 border-violet-400/50 pl-3 italic text-white/90 text-sm">
        &laquo; {value} &raquo;
      </blockquote>
    </Card>
  );
}

/** Text — simple labeled text */
export function TextCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <Label>{label}</Label>
      <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{value}</p>
    </Card>
  );
}

/** Metric — single number with label */
export function MetricCard({ label, value, suffix, accent }: { label: string; value: number; suffix?: string; accent: string }) {
  return (
    <div className="rounded-lg border border-white/5 bg-surface-raised p-3 text-center">
      <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold ${accent}`}>{value.toLocaleString()}{suffix ? <span className="text-xs text-foreground-muted ml-0.5">{suffix}</span> : null}</p>
    </div>
  );
}

/** Badge — enum/archetype as a styled badge */
export function BadgeCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}

/** Tag list — array of strings as inline badges */
export function TagList({ label, values }: { label: string; values: string[] }) {
  return (
    <Card>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v, i) => (
          <span key={i} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white">{v}</span>
        ))}
      </div>
    </Card>
  );
}

/** Item list — array of objects, compact rows, click to focus */
export function ItemList({ label, items, onFocus, nameKey }: { label: string; items: Array<Record<string, unknown>>; onFocus?: (item: Record<string, unknown>) => void; nameKey?: string }) {
  const resolvedNameKey = nameKey ?? detectNameKey(items);
  return (
    <Card>
      <Label>{label} ({items.length})</Label>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {items.slice(0, 15).map((item, i) => (
          <div
            key={i}
            onClick={onFocus ? () => onFocus(item) : undefined}
            className={`rounded bg-white/5 px-3 py-2 text-xs ${onFocus ? "cursor-pointer hover:bg-white/[0.08] transition-colors" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 min-w-0 flex-1">
                {resolvedNameKey && item[resolvedNameKey] != null ? (
                  <span className="font-medium text-white">{String(item[resolvedNameKey])}</span>
                ) : null}
                {Object.entries(item)
                  .filter(([k, v]) => k !== resolvedNameKey && v != null && v !== "" && typeof v !== "object")
                  .slice(0, 3)
                  .map(([k, v]) => (
                    <span key={k} className="text-foreground-muted">{getFieldLabel(k)}: <span className="text-white/70">{String(v).slice(0, 50)}</span></span>
                  ))}
              </div>
              {onFocus ? <ChevronRight className="h-3 w-3 flex-shrink-0 text-foreground-muted/30" /> : null}
            </div>
          </div>
        ))}
        {items.length > 15 ? <p className="text-[10px] text-foreground-muted px-1">+{items.length - 15} autres</p> : null}
      </div>
    </Card>
  );
}

/** Object card — show all sub-fields */
export function ObjectCard({ label, obj, onFocus }: { label: string; obj: Record<string, unknown>; onFocus?: (item: Record<string, unknown>) => void }) {
  const entries = Object.entries(obj).filter(([, v]) => v != null && v !== "");
  if (entries.length === 0) return null;

  return (
    <Card>
      <Label>{label}</Label>
      <div className={`space-y-1.5 ${onFocus ? "cursor-pointer" : ""}`} onClick={onFocus ? () => onFocus(obj) : undefined}>
        {entries.map(([k, v]) => (
          <div key={k} className="rounded bg-white/5 px-3 py-1.5">
            <span className="text-[10px] text-foreground-muted">{getFieldLabel(k)}</span>
            {typeof v === "string" ? (
              <p className="text-xs text-white/80 mt-0.5">{v.slice(0, 200)}{v.length > 200 ? "..." : ""}</p>
            ) : Array.isArray(v) ? (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {v.slice(0, 5).map((item, i) => (
                  <span key={i} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/70">
                    {typeof item === "string" ? item : typeof item === "number" ? item.toLocaleString() : typeof item === "object" && item !== null ? extractLabel(item as Record<string, unknown>) : String(item)}
                  </span>
                ))}
                {v.length > 5 ? <span className="text-[10px] text-foreground-muted">+{v.length - 5}</span> : null}
              </div>
            ) : typeof v === "boolean" ? (
              <span className={`text-xs ${v ? "text-emerald-400" : "text-red-400"}`}>{v ? "Oui" : "Non"}</span>
            ) : typeof v === "number" ? (
              <span className="text-xs text-white font-medium">{v.toLocaleString()}</span>
            ) : typeof v === "object" && v !== null ? (
              <div className="mt-0.5 space-y-0.5">
                {Object.entries(v as Record<string, unknown>).filter(([, sv]) => sv != null && sv !== "").slice(0, 6).map(([sk, sv]) => (
                  <div key={sk} className="flex gap-1.5 text-[10px]">
                    <span className="text-foreground-muted/60 shrink-0">{getFieldLabel(sk)}:</span>
                    <span className="text-white/60 truncate">{typeof sv === "string" ? sv.slice(0, 80) : Array.isArray(sv) ? sv.slice(0, 3).map(x => typeof x === "string" ? x : extractLabel(x as Record<string, unknown>)).join(", ") + (sv.length > 3 ? ` +${sv.length - 3}` : "") : typeof sv === "number" ? sv.toLocaleString() : String(sv)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/80 mt-0.5">{String(v)}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** SWOT grid — 4 quadrants */
export function SWOTCard({ swot }: { swot: Record<string, unknown> }) {
  const quadrants = [
    { key: "strengths", label: "Forces", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" },
    { key: "weaknesses", label: "Faiblesses", color: "text-red-400 border-red-500/30 bg-red-500/5" },
    { key: "opportunities", label: "Opportunites", color: "text-blue-400 border-blue-500/30 bg-blue-500/5" },
    { key: "threats", label: "Menaces", color: "text-amber-400 border-amber-500/30 bg-amber-500/5" },
  ];
  return (
    <Card span={2}>
      <Label>SWOT</Label>
      <div className="grid gap-2 md:grid-cols-2">
        {quadrants.map(q => (
          <div key={q.key} className={`rounded-lg border p-3 ${q.color}`}>
            <p className="text-xs font-semibold mb-1">{q.label}</p>
            <ul className="space-y-0.5 text-[11px]">
              {Array.isArray(swot[q.key]) ? (swot[q.key] as string[]).map((item, i) => (
                <li key={i}>• {item}</li>
              )) : null}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Ikigai grid — 4 colored quadrants */
export function IkigaiCard({ ikigai }: { ikigai: Record<string, unknown> }) {
  const quadrants = [
    { key: "love", label: "Ce qu'on aime", color: "text-pink-400" },
    { key: "competence", label: "Ce qu'on sait faire", color: "text-blue-400" },
    { key: "worldNeed", label: "Ce dont le monde a besoin", color: "text-emerald-400" },
    { key: "remuneration", label: "Ce pour quoi on est paye", color: "text-amber-400" },
  ];
  return (
    <Card span={2}>
      <Label>Ikigai</Label>
      <div className="grid gap-2 md:grid-cols-2">
        {quadrants.map(q => (
          <div key={q.key} className="rounded-lg border border-white/10 bg-white/5 p-3">
            <p className={`text-[10px] font-semibold ${q.color}`}>{q.label}</p>
            <p className="mt-1 text-xs text-white/80 leading-relaxed">{String(ikigai[q.key] ?? "—")}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Overton window — perception actuelle vs cible */
export function OvertonCard({ overton }: { overton: Record<string, unknown> }) {
  return (
    <Card span={2}>
      <Label>Fenetre d'Overton</Label>
      <div className="grid gap-2 md:grid-cols-2 mb-2">
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <p className="text-[10px] font-semibold text-red-400">Perception actuelle</p>
          <p className="mt-1 text-xs text-white/80">{String(overton.perceptionActuelle ?? "—")}</p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
          <p className="text-[10px] font-semibold text-emerald-400">Perception cible</p>
          <p className="mt-1 text-xs text-white/80">{String(overton.perceptionCible ?? "—")}</p>
        </div>
      </div>
      {overton.ecart ? (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
          <p className="text-[10px] font-semibold text-amber-400">Ecart</p>
          <p className="mt-1 text-xs text-white/80">{String(overton.ecart)}</p>
        </div>
      ) : null}
    </Card>
  );
}

/** TAM/SAM/SOM — 3 columns with source badges */
export function TAMCard({ tam }: { tam: Record<string, Record<string, unknown>> }) {
  return (
    <Card span={2}>
      <Label>TAM / SAM / SOM</Label>
      <div className="grid gap-2 md:grid-cols-3">
        {(["tam", "sam", "som"] as const).map(k => {
          const d = tam[k];
          if (!d) return null;
          return (
            <div key={k} className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
              <p className="text-[10px] font-semibold text-foreground-muted">{k.toUpperCase()}</p>
              <p className="text-lg font-bold text-white">{d.value ? Number(d.value).toLocaleString() : "—"}</p>
              <p className="text-[10px] text-foreground-muted">{String(d.description ?? "")}</p>
              {d.source ? (
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] ${d.source === "verified" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>
                  {d.source === "verified" ? "Verifie" : "Estimation IA"}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Focus Modal ───────────────────────────────────────────────────────

/** Render a single value recursively for FocusModal */
function FocusValue({ value }: { value: unknown }) {
  if (value == null || value === "") return null;
  if (typeof value === "string") return <p className="mt-0.5 text-sm text-white whitespace-pre-wrap">{value}</p>;
  if (typeof value === "number") return <p className="mt-0.5 text-sm text-white font-medium">{value.toLocaleString()}</p>;
  if (typeof value === "boolean") return <span className={`text-sm ${value ? "text-emerald-400" : "text-red-400"}`}>{value ? "Oui" : "Non"}</span>;
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    if (typeof value[0] === "string") {
      return (
        <div className="mt-1 flex flex-wrap gap-1">
          {value.map((v, i) => <span key={i} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white">{v}</span>)}
        </div>
      );
    }
    // Array of objects — render each as a mini-card
    return (
      <div className="mt-1 space-y-1.5">
        {(value as Array<Record<string, unknown>>).map((obj, i) => (
          <div key={i} className="rounded bg-white/5 p-2 space-y-1">
            {Object.entries(obj).filter(([, v]) => v != null && v !== "").map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-[10px] text-foreground-muted shrink-0">{getFieldLabel(k)}</span>
                <span className="text-xs text-white/80">{typeof v === "object" ? (Array.isArray(v) ? (v as string[]).join(", ") : Object.values(v as Record<string, unknown>).join(", ")) : String(v)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }
  if (typeof value === "object" && value !== null) {
    return (
      <div className="mt-1 space-y-1">
        {Object.entries(value as Record<string, unknown>).filter(([, v]) => v != null && v !== "").map(([k, v]) => (
          <div key={k} className="rounded bg-white/5 px-2.5 py-1.5">
            <span className="text-[10px] text-foreground-muted">{getFieldLabel(k)}</span>
            <FocusValue value={v} />
          </div>
        ))}
      </div>
    );
  }
  return <p className="mt-0.5 text-sm text-white">{String(value)}</p>;
}

export function FocusModal({ item, onClose }: { item: Record<string, unknown>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative mx-4 max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 rounded-full p-1.5 text-foreground-muted hover:bg-white/10 hover:text-white text-xs">✕</button>
        <div className="space-y-3">
          {Object.entries(item)
            .filter(([, v]) => v != null && v !== "")
            .map(([key, value]) => (
              <div key={key}>
                <p className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide">{getFieldLabel(key)}</p>
                <FocusValue value={value} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SPECIALIZED RENDERERS — One per business structure
// Each renderer is type-aware and visually distinct.
// ══════════════════════════════════════════════════════════════════════

// ── Helpers ──────────────────────────────────────────────────────────

function BudgetBadge({ level }: { level: string }) {
  const c = level === "HIGH" ? "bg-red-500/15 text-red-300" :
            level === "MEDIUM" ? "bg-amber-500/15 text-amber-300" :
            "bg-emerald-500/15 text-emerald-300";
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${c}`}>{level}</span>;
}

function DevotionBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    SPECTATEUR: "bg-zinc-500/15 text-zinc-300",
    INTERESSE: "bg-blue-500/15 text-blue-300",
    PARTICIPANT: "bg-sky-500/15 text-sky-300",
    ENGAGE: "bg-violet-500/15 text-violet-300",
    AMBASSADEUR: "bg-amber-500/15 text-amber-300",
    EVANGELISTE: "bg-emerald-500/15 text-emerald-300",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${colors[level] ?? "bg-white/10 text-foreground-muted"}`}>{level}</span>;
}

function FeasibilityBadge({ level }: { level: string }) {
  const c = level === "HIGH" ? "bg-emerald-500/15 text-emerald-300" :
            level === "MEDIUM" ? "bg-amber-500/15 text-amber-300" :
            "bg-red-500/15 text-red-300";
  return <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${c}`}>{level}</span>;
}

function RiskColorCell({ probability, impact }: { probability: string; impact: string }) {
  const score = (["LOW", "MEDIUM", "HIGH"].indexOf(probability) + 1) * (["LOW", "MEDIUM", "HIGH"].indexOf(impact) + 1);
  const c = score >= 6 ? "bg-red-500/20 border-red-500/30 text-red-300" :
            score >= 3 ? "bg-amber-500/20 border-amber-500/30 text-amber-300" :
            "bg-emerald-500/20 border-emerald-500/30 text-emerald-300";
  return <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium border ${c}`}>P:{probability} I:{impact}</span>;
}

// ── 1. CatalogueParCanal — Record<string, PotentialAction[]> ────────

export function CatalogueParCanalCard({ data, onFocus }: { data: Record<string, unknown[]>; onFocus?: (item: Record<string, unknown>) => void }) {
  const channels = Object.entries(data).filter(([, v]) => Array.isArray(v) && v.length > 0);
  if (channels.length === 0) return null;

  const channelColors: Record<string, string> = {
    DIGITAL: "border-blue-500/20 text-blue-400",
    EVENEMENTIEL: "border-amber-500/20 text-amber-400",
    PRINT: "border-emerald-500/20 text-emerald-400",
    RADIO: "border-purple-500/20 text-purple-400",
    TV: "border-red-500/20 text-red-400",
    OOH: "border-sky-500/20 text-sky-400",
    SOCIAL: "border-pink-500/20 text-pink-400",
    INFLUENCE: "border-orange-500/20 text-orange-400",
    PR: "border-teal-500/20 text-teal-400",
  };

  return (
    <Card span={2}>
      <Label>Catalogue par canal ({channels.reduce((sum, [, v]) => sum + v.length, 0)} actions)</Label>
      <div className="space-y-3 mt-2">
        {channels.map(([canal, actions]) => (
          <div key={canal}>
            <div className={`flex items-center gap-2 mb-1.5 border-l-2 pl-2 ${channelColors[canal] ?? "border-white/20 text-foreground-muted"}`}>
              <Megaphone className="h-3 w-3" />
              <span className="text-xs font-semibold uppercase tracking-wide">{canal}</span>
              <span className="text-[10px] text-foreground-muted">({actions.length})</span>
            </div>
            <div className="space-y-1 ml-4">
              {(actions as Array<Record<string, unknown>>).slice(0, 8).map((a, i) => (
                <div key={i}
                  onClick={onFocus ? () => onFocus(a) : undefined}
                  className={`rounded bg-white/[0.03] px-3 py-1.5 text-xs ${onFocus ? "cursor-pointer hover:bg-white/[0.06] transition-colors" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{String(a.action ?? a.name ?? "")}</span>
                    {a.format ? <span className="text-foreground-muted/60 text-[10px]">{String(a.format)}</span> : null}
                    {a.devotionImpact ? <DevotionBadge level={String(a.devotionImpact)} /> : null}
                    {onFocus ? <ChevronRight className="h-3 w-3 ml-auto flex-shrink-0 text-foreground-muted/30" /> : null}
                  </div>
                  {a.objectif ? <p className="text-[10px] text-foreground-muted mt-0.5">{String(a.objectif)}</p> : null}
                </div>
              ))}
              {actions.length > 8 ? <p className="text-[10px] text-foreground-muted px-3">+{actions.length - 8} autres</p> : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 2. Roadmap — timeline verticale ─────────────────────────────────

export function RoadmapCard({ phases }: { phases: Array<Record<string, unknown>> }) {
  return (
    <Card span={2}>
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-pink-400" />
        <Label>Roadmap</Label>
      </div>
      <div className="relative ml-3 border-l border-pink-500/30 pl-5 space-y-4">
        {phases.map((p, i) => (
          <div key={i} className="relative">
            {/* Timeline dot */}
            <div className="absolute -left-[1.625rem] top-1 h-2.5 w-2.5 rounded-full border-2 border-pink-500/50 bg-zinc-900" />
            <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white">{String(p.phase ?? `Phase ${i + 1}`)}</span>
                {p.duree ? <span className="flex items-center gap-0.5 text-[10px] text-foreground-muted"><Clock className="h-2.5 w-2.5" />{String(p.duree)}</span> : null}
                {p.budget ? <span className="flex items-center gap-0.5 text-[10px] text-emerald-300"><DollarSign className="h-2.5 w-2.5" />{Number(p.budget).toLocaleString()} XAF</span> : null}
              </div>
              <p className="text-xs text-white/70">{String(p.objectif ?? "")}</p>
              {p.objectifDevotion ? <div className="mt-1"><DevotionBadge level={String(p.objectifDevotion)} /></div> : null}
              {Array.isArray(p.actions) && p.actions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(p.actions as string[]).map((a, j) => (
                    <span key={j} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-white/60">{a}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 3. Sprint90Days — numbered priority list ────────────────────────

export function Sprint90DaysCard({ sprints }: { sprints: Array<Record<string, unknown>> }) {
  const sorted = [...sprints].sort((a, b) => (Number(a.priority) || 99) - (Number(b.priority) || 99));
  return (
    <Card span={2}>
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-pink-400" />
        <Label>Sprint 90 jours ({sprints.length} actions)</Label>
      </div>
      <div className="space-y-1.5">
        {sorted.map((s, i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg bg-white/[0.02] px-3 py-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-[10px] font-bold text-pink-300">{Number(s.priority) || i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white">{String(s.action ?? "")}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {s.owner ? <span className="text-[10px] text-foreground-muted"><Users className="inline h-2.5 w-2.5 mr-0.5" />{String(s.owner)}</span> : null}
                {s.kpi ? <span className="text-[10px] text-foreground-muted"><TrendingUp className="inline h-2.5 w-2.5 mr-0.5" />{String(s.kpi)}</span> : null}
                {s.devotionImpact ? <DevotionBadge level={String(s.devotionImpact)} /> : null}
                {s.isRiskMitigation ? <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[9px] text-red-300"><Shield className="inline h-2.5 w-2.5 mr-0.5" />Risque</span> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 4. Personas — rich profile cards ────────────────────────────────

export function PersonasCard({ personas, onFocus }: { personas: Array<Record<string, unknown>>; onFocus?: (item: Record<string, unknown>) => void }) {
  return (
    <Card span={2}>
      <Label>Personas ({personas.length})</Label>
      <div className="grid gap-2 md:grid-cols-2 mt-2">
        {personas.map((p, i) => (
          <div key={i}
            onClick={onFocus ? () => onFocus(p) : undefined}
            className={`rounded-lg border border-white/5 bg-white/[0.02] p-3 ${onFocus ? "cursor-pointer hover:bg-white/[0.05] transition-colors" : ""}`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-white">{String(p.name ?? p.nom ?? `Persona ${i + 1}`)}</span>
              <div className="flex items-center gap-1.5">
                {p.rank === 1 ? <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9px] text-violet-300">Primary</span> : null}
                {p.devotionPotential ? <DevotionBadge level={String(p.devotionPotential)} /> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-foreground-muted mb-2">
              {p.age ? <span>{String(p.age)} ans</span> : null}
              {p.csp ? <span>{String(p.csp)}</span> : null}
              {p.location ? <span>{String(p.location)}</span> : null}
              {p.income ? <span>{String(p.income)}</span> : null}
            </div>
            {p.motivations ? <p className="text-[11px] text-emerald-300/80 line-clamp-2"><Flame className="inline h-2.5 w-2.5 mr-0.5" />{String(p.motivations)}</p> : null}
            {p.fears ? <p className="text-[11px] text-red-300/70 mt-0.5 line-clamp-1"><Shield className="inline h-2.5 w-2.5 mr-0.5" />{String(p.fears)}</p> : null}
            {onFocus ? <ChevronRight className="h-3 w-3 text-foreground-muted/30 mt-1 ml-auto" /> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 5. ProduitsCatalogue — product cards ────────────────────────────

export function ProduitsCatalogueCard({ produits, onFocus }: { produits: Array<Record<string, unknown>>; onFocus?: (item: Record<string, unknown>) => void }) {
  return (
    <Card span={2}>
      <Label>Catalogue produits ({produits.length})</Label>
      <div className="grid gap-2 md:grid-cols-2 mt-2">
        {produits.slice(0, 12).map((p, i) => (
          <div key={i}
            onClick={onFocus ? () => onFocus(p) : undefined}
            className={`rounded-lg border border-white/5 bg-white/[0.02] p-3 ${onFocus ? "cursor-pointer hover:bg-white/[0.05] transition-colors" : ""}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white">{String(p.nom ?? p.name ?? "")}</span>
              {p.prix ? <span className="text-xs font-bold text-emerald-300">{Number(p.prix).toLocaleString()} XAF</span> : null}
            </div>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              {p.categorie ? <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-blue-300">{String(p.categorie)}</span> : null}
              {p.segmentCible ? <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-violet-300">{String(p.segmentCible)}</span> : null}
              {p.phaseLifecycle ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-foreground-muted">{String(p.phaseLifecycle)}</span> : null}
            </div>
            {p.margeUnitaire != null ? <p className="text-[10px] text-emerald-400/60 mt-1">Marge: {Number(p.margeUnitaire).toLocaleString()} XAF</p> : null}
            {p.lienPromesse ? <p className="text-[10px] text-foreground-muted mt-0.5 line-clamp-1">{String(p.lienPromesse)}</p> : null}
          </div>
        ))}
        {produits.length > 12 ? <p className="text-[10px] text-foreground-muted md:col-span-2">+{produits.length - 12} produits</p> : null}
      </div>
    </Card>
  );
}

// ── 6. ProbabilityImpactMatrix — risk grid ──────────────────────────

export function RiskMatrixCard({ risks, onFocus }: { risks: Array<Record<string, unknown>>; onFocus?: (item: Record<string, unknown>) => void }) {
  return (
    <Card span={2}>
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-4 w-4 text-red-400" />
        <Label>Matrice de risques ({risks.length})</Label>
      </div>
      <div className="space-y-1.5">
        {risks.map((r, i) => {
          const prob = String(r.probability ?? "MEDIUM");
          const imp = String(r.impact ?? "MEDIUM");
          return (
            <div key={i}
              onClick={onFocus ? () => onFocus(r) : undefined}
              className={`flex items-start gap-3 rounded-lg bg-white/[0.02] px-3 py-2 ${onFocus ? "cursor-pointer hover:bg-white/[0.05] transition-colors" : ""}`}>
              <RiskColorCell probability={prob} impact={imp} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white">{String(r.risk ?? "")}</p>
                {r.mitigation ? <p className="text-[10px] text-foreground-muted mt-0.5 line-clamp-1">{String(r.mitigation)}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── 7. HerosJourney — 5-act narrative timeline ──────────────────────

export function HerosJourneyCard({ acts }: { acts: Array<Record<string, unknown>> }) {
  const sorted = [...acts].sort((a, b) => (Number(a.actNumber) || 0) - (Number(b.actNumber) || 0));
  return (
    <Card span={2}>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-4 w-4 text-violet-400" />
        <Label>Parcours du heros</Label>
      </div>
      {/* Horizontal scrolling timeline on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 md:grid md:grid-cols-5 md:overflow-visible">
        {sorted.map((act, i) => (
          <div key={i} className="relative min-w-[140px] flex-shrink-0 rounded-lg border border-white/5 bg-white/[0.02] p-3 md:min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-300">
                {Number(act.actNumber) || i + 1}
              </span>
              <span className="text-xs font-semibold text-white truncate">{String(act.title ?? "")}</span>
            </div>
            <p className="text-[11px] text-white/70 leading-relaxed line-clamp-3">{String(act.narrative ?? "")}</p>
            {act.emotionalArc ? (
              <p className="mt-1.5 text-[10px] italic text-violet-300/70">{String(act.emotionalArc)}</p>
            ) : null}
            {/* Connector arrow (not on last) */}
            {i < sorted.length - 1 ? (
              <div className="absolute -right-1.5 top-1/2 hidden md:block text-foreground-muted/30">→</div>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 8. Valeurs — Schwartz values with rank ──────────────────────────

export function ValeursCard({ valeurs, onFocus }: { valeurs: Array<Record<string, unknown>>; onFocus?: (item: Record<string, unknown>) => void }) {
  const sorted = [...valeurs].sort((a, b) => (Number(a.rank) || 99) - (Number(b.rank) || 99));
  return (
    <Card span={2}>
      <div className="flex items-center gap-2 mb-3">
        <Star className="h-4 w-4 text-violet-400" />
        <Label>Valeurs ({valeurs.length})</Label>
      </div>
      <div className="space-y-1.5">
        {sorted.map((v, i) => (
          <div key={i}
            onClick={onFocus ? () => onFocus(v) : undefined}
            className={`flex items-start gap-3 rounded-lg bg-white/[0.02] px-3 py-2.5 ${onFocus ? "cursor-pointer hover:bg-white/[0.05] transition-colors" : ""}`}>
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-300">
              {Number(v.rank) || i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{String(v.customName ?? v.value ?? "")}</span>
                {v.value && v.customName ? <span className="text-[10px] text-foreground-muted/50">({String(v.value)})</span> : null}
              </div>
              {v.justification ? <p className="text-[11px] text-white/60 mt-0.5 line-clamp-2">{String(v.justification)}</p> : null}
              {v.costOfHolding ? <p className="text-[10px] text-amber-300/50 mt-0.5">Cout : {String(v.costOfHolding)}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 9. TonDeVoix — 3 sections (personalite, onDit, onNeditPas) ─────

export function TonDeVoixCard({ ton }: { ton: Record<string, unknown> }) {
  const personnalite = Array.isArray(ton.personnalite) ? ton.personnalite as string[] : [];
  const onDit = Array.isArray(ton.onDit) ? ton.onDit as string[] : [];
  const onNeditPas = Array.isArray(ton.onNeditPas) ? ton.onNeditPas as string[] : [];

  return (
    <Card span={2}>
      <div className="flex items-center gap-2 mb-3">
        <Volume2 className="h-4 w-4 text-blue-400" />
        <Label>Ton de voix</Label>
      </div>
      {/* Personnalite badges */}
      {personnalite.length > 0 ? (
        <div className="mb-3">
          <p className="text-[10px] text-foreground-muted mb-1">Personnalite</p>
          <div className="flex flex-wrap gap-1.5">
            {personnalite.map((p, i) => (
              <span key={i} className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-xs text-blue-300">{p}</span>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-2 md:grid-cols-2">
        {/* On dit */}
        {onDit.length > 0 ? (
          <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 p-3">
            <p className="text-[10px] font-semibold text-emerald-400 mb-1.5">On dit</p>
            <ul className="space-y-1">
              {onDit.map((o, i) => (
                <li key={i} className="text-[11px] text-white/80 flex items-start gap-1.5">
                  <span className="text-emerald-400 shrink-0">✓</span> {o}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {/* On ne dit pas */}
        {onNeditPas.length > 0 ? (
          <div className="rounded-lg border border-red-500/15 bg-red-500/5 p-3">
            <p className="text-[10px] font-semibold text-red-400 mb-1.5">On ne dit pas</p>
            <ul className="space-y-1">
              {onNeditPas.map((o, i) => (
                <li key={i} className="text-[11px] text-white/80 flex items-start gap-1.5">
                  <span className="text-red-400 shrink-0">✕</span> {o}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

// ── 10. DirectionArtistique — grid of sub-sections ──────────────────

export function DirectionArtistiqueCard({ da, onFocus }: { da: Record<string, unknown>; onFocus?: (item: Record<string, unknown>) => void }) {
  const sections = Object.entries(da).filter(([, v]) => v != null && typeof v === "object" && !Array.isArray(v));
  const sectionIcons: Record<string, string> = {
    semioticAnalysis: "Semiotique", visualLandscape: "Paysage visuel",
    moodboard: "Moodboard", chromaticStrategy: "Chromatique",
    typographySystem: "Typographie", logoTypeRecommendation: "Logo",
    logoValidation: "Validation logo", designTokens: "Tokens",
    motionIdentity: "Motion", brandGuidelines: "Guidelines", lsiMatrix: "LSI",
  };

  return (
    <Card span={2}>
      <div className="flex items-center gap-2 mb-3">
        <Palette className="h-4 w-4 text-blue-400" />
        <Label>Direction artistique ({sections.length} sections)</Label>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {sections.map(([key, val]) => {
          const obj = val as Record<string, unknown>;
          const filledCount = Object.values(obj).filter(v => v != null && v !== "").length;
          return (
            <div key={key}
              onClick={onFocus ? () => onFocus({ _section: key, ...obj }) : undefined}
              className={`rounded-lg border border-white/5 bg-white/[0.02] p-3 ${onFocus ? "cursor-pointer hover:bg-white/[0.05] transition-colors" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-white">{sectionIcons[key] ?? getFieldLabel(key)}</span>
                <span className="text-[9px] text-foreground-muted/50">{filledCount} champs</span>
              </div>
              {/* Preview first non-null string */}
              {(() => {
                const preview = Object.entries(obj).find(([k, v]) => typeof v === "string" && v.length > 0 && k !== "gloryOutputId");
                return preview ? <p className="text-[10px] text-foreground-muted line-clamp-2">{preview[1] as string}</p> : null;
              })()}
              {onFocus ? <ChevronRight className="h-3 w-3 text-foreground-muted/30 mt-1 ml-auto" /> : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── 11. EquipeDirigeante — team member cards ────────────────────────

export function EquipeDirigenteCard({ equipe, onFocus }: { equipe: Array<Record<string, unknown>>; onFocus?: (item: Record<string, unknown>) => void }) {
  return (
    <Card span={2}>
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-violet-400" />
        <Label>Equipe dirigeante ({equipe.length})</Label>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {equipe.map((m, i) => (
          <div key={i}
            onClick={onFocus ? () => onFocus(m) : undefined}
            className={`rounded-lg border border-white/5 bg-white/[0.02] p-3 ${onFocus ? "cursor-pointer hover:bg-white/[0.05] transition-colors" : ""}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold text-white">{String(m.nom ?? "")}</span>
              <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-300">{String(m.role ?? "")}</span>
            </div>
            {m.bio ? <p className="text-[11px] text-white/60 line-clamp-2 mb-1.5">{String(m.bio)}</p> : null}
            {Array.isArray(m.competencesCles) ? (
              <div className="flex flex-wrap gap-1">
                {(m.competencesCles as string[]).slice(0, 4).map((c, j) => (
                  <span key={j} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted">{c}</span>
                ))}
              </div>
            ) : null}
            {m.allocationPct != null ? <p className="text-[9px] text-foreground-muted/50 mt-1">{Number(m.allocationPct)}% du temps</p> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 12. Enemy — adversary card ──────────────────────────────────────

export function EnemyCard({ enemy, onFocus }: { enemy: Record<string, unknown>; onFocus?: (item: Record<string, unknown>) => void }) {
  const rawName = String(enemy.name ?? "Ennemi");
  const rawManifesto = enemy.manifesto ? String(enemy.manifesto) : null;
  // If name IS the manifesto (data quality issue), use it as manifesto and show "Ennemi" as title
  const nameIsManifesto = rawName.length > 80;
  const displayName = nameIsManifesto ? "L'Ennemi" : rawName;
  const manifesto = nameIsManifesto ? rawName : rawManifesto;
  // Avoid duplication: if manifesto equals name, don't show twice
  const showManifesto = manifesto && manifesto !== rawName;
  const showManifestoFromName = nameIsManifesto;

  return (
    <Card span={2}>
      <div
        onClick={onFocus ? () => onFocus(enemy) : undefined}
        className={`rounded-lg border border-red-500/20 bg-red-500/5 p-4 ${onFocus ? "cursor-pointer hover:bg-red-500/[0.08] transition-colors" : ""}`}>
        <div className="flex items-center gap-2 mb-3">
          <Swords className="h-4 w-4 text-red-400" />
          <span className="text-base font-bold text-red-300">{displayName}</span>
        </div>
        {(showManifesto || showManifestoFromName) ? (
          <blockquote className="border-l-2 border-red-400/40 pl-3 italic text-sm text-white/70 mb-3 leading-relaxed">
            &laquo; {String(manifesto ?? rawName)} &raquo;
          </blockquote>
        ) : null}
        {enemy.narrative && String(enemy.narrative) !== String(manifesto) ? (
          <p className="text-xs text-white/60 mb-3 leading-relaxed">{String(enemy.narrative)}</p>
        ) : null}
        {/* Counter strategy */}
        {enemy.counterStrategy && typeof enemy.counterStrategy === "object" ? (
          <div className="rounded bg-emerald-500/5 border border-emerald-500/15 p-3 mb-2">
            <p className="text-[10px] font-semibold text-emerald-400 mb-1">Contre-strategie</p>
            {(enemy.counterStrategy as Record<string, unknown>).marketingCounter ?
              <p className="text-xs text-white/70 leading-relaxed">{String((enemy.counterStrategy as Record<string, unknown>).marketingCounter)}</p> : null}
            {Array.isArray((enemy.counterStrategy as Record<string, unknown>).alliances) ? (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {((enemy.counterStrategy as Record<string, unknown>).alliances as string[]).map((a, i) => (
                  <span key={i} className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">{a}</span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {/* Oppositions */}
        {Array.isArray(enemy.activeOpposition) && (enemy.activeOpposition as string[]).length > 0 ? (
          <div className="mb-2">
            <p className="text-[10px] text-foreground-muted mb-1">Opposition active</p>
            <div className="flex flex-wrap gap-1">
              {(enemy.activeOpposition as string[]).map((a, i) => (
                <span key={i} className="rounded bg-red-500/10 border border-red-500/15 px-2 py-0.5 text-[10px] text-red-300">{a}</span>
              ))}
            </div>
          </div>
        ) : null}
        {Array.isArray(enemy.passiveOpposition) && (enemy.passiveOpposition as string[]).length > 0 ? (
          <div>
            <p className="text-[10px] text-foreground-muted mb-1">Opposition passive</p>
            <div className="flex flex-wrap gap-1">
              {(enemy.passiveOpposition as string[]).map((a, i) => (
                <span key={i} className="rounded bg-amber-500/10 border border-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300">{a}</span>
              ))}
            </div>
          </div>
        ) : null}
        {onFocus ? <ChevronRight className="h-3 w-3 text-red-300/30 mt-2 ml-auto" /> : null}
      </div>
    </Card>
  );
}

// ── 13. Prophecy — vision card ──────────────────────────────────────

export function ProphecyCard({ prophecy }: { prophecy: Record<string, unknown> | string }) {
  if (typeof prophecy === "string") {
    return (
      <Card span={2}>
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-violet-400" />
            <Label>Prophetie</Label>
          </div>
          <p className="text-sm text-white/80 italic leading-relaxed">{prophecy}</p>
        </div>
      </Card>
    );
  }
  const wt = String(prophecy.worldTransformed ?? "");
  // Adapt text size: short vision = large, long paragraph = smaller
  const textSize = wt.length > 200 ? "text-sm" : wt.length > 80 ? "text-base font-semibold" : "text-lg font-bold";
  return (
    <Card span={2}>
      <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-violet-400" />
          <Label>Prophetie</Label>
          {prophecy.urgency ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] text-amber-300">{String(prophecy.urgency)}</span> : null}
        </div>
        <p className={`${textSize} text-white leading-snug mb-2`}>{wt}</p>
        {prophecy.pioneers ? <p className="text-xs text-violet-300/70"><Users className="inline h-3 w-3 mr-1" />Pionniers : {String(prophecy.pioneers)}</p> : null}
        {prophecy.horizon ? <p className="text-xs text-foreground-muted mt-1"><Clock className="inline h-3 w-3 mr-1" />Horizon : {String(prophecy.horizon)}</p> : null}
      </div>
    </Card>
  );
}

// ── 14. Doctrine — dogmas + principles ──────────────────────────────

export function DoctrineCard({ doctrine }: { doctrine: Record<string, unknown> | string }) {
  if (typeof doctrine === "string") {
    return <TextCard label="Doctrine" value={doctrine} />;
  }
  const dogmas = Array.isArray(doctrine.dogmas) ? doctrine.dogmas as string[] : [];
  const principles = Array.isArray(doctrine.principles) ? doctrine.principles as string[] : [];
  const practices = Array.isArray(doctrine.practices) ? doctrine.practices as string[] : [];

  return (
    <Card span={2}>
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-4 w-4 text-violet-400" />
        <Label>Doctrine</Label>
      </div>
      {dogmas.length > 0 ? (
        <div className="mb-3">
          <p className="text-[10px] text-foreground-muted mb-1.5">Dogmes</p>
          <ol className="space-y-1 list-decimal list-inside">
            {dogmas.map((d, i) => (
              <li key={i} className="text-xs text-white/80">{d}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {principles.length > 0 ? (
        <div className="mb-3">
          <p className="text-[10px] text-foreground-muted mb-1.5">Principes</p>
          <div className="flex flex-wrap gap-1.5">
            {principles.map((p, i) => (
              <span key={i} className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2.5 py-0.5 text-xs text-violet-300">{p}</span>
            ))}
          </div>
        </div>
      ) : null}
      {practices.length > 0 ? (
        <div>
          <p className="text-[10px] text-foreground-muted mb-1.5">Pratiques</p>
          <div className="flex flex-wrap gap-1.5">
            {practices.map((p, i) => (
              <span key={i} className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-foreground-muted">{p}</span>
            ))}
          </div>
        </div>
      ) : null}
    </Card>
  );
}

// ── 15. ActivationsPossibles — activation cards ─────────────────────

export function ActivationsCard({ activations, onFocus }: { activations: Array<Record<string, unknown>>; onFocus?: (item: Record<string, unknown>) => void }) {
  return (
    <Card span={2}>
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="h-4 w-4 text-orange-400" />
        <Label>Activations possibles ({activations.length})</Label>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {activations.slice(0, 10).map((a, i) => (
          <div key={i}
            onClick={onFocus ? () => onFocus(a) : undefined}
            className={`rounded-lg border border-white/5 bg-white/[0.02] p-3 ${onFocus ? "cursor-pointer hover:bg-white/[0.05] transition-colors" : ""}`}>
            <span className="text-xs font-semibold text-white">{String(a.activation ?? a.name ?? "")}</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {a.canal ? <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-300">{String(a.canal)}</span> : null}
              {a.cible ? <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] text-violet-300">{String(a.cible)}</span> : null}
              {a.budgetEstime ? <BudgetBadge level={String(a.budgetEstime)} /> : null}
            </div>
          </div>
        ))}
        {activations.length > 10 ? <p className="text-[10px] text-foreground-muted md:col-span-2">+{activations.length - 10} activations</p> : null}
      </div>
    </Card>
  );
}

// ── 16. InnovationsProduit — innovation cards ───────────────────────

export function InnovationsCard({ innovations, onFocus }: { innovations: Array<Record<string, unknown>>; onFocus?: (item: Record<string, unknown>) => void }) {
  return (
    <Card span={2}>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-orange-400" />
        <Label>Innovations produit ({innovations.length})</Label>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {innovations.map((inn, i) => (
          <div key={i}
            onClick={onFocus ? () => onFocus(inn) : undefined}
            className={`rounded-lg border border-white/5 bg-white/[0.02] p-3 ${onFocus ? "cursor-pointer hover:bg-white/[0.05] transition-colors" : ""}`}>
            <span className="text-xs font-semibold text-white">{String(inn.name ?? "")}</span>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {inn.type ? <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] text-orange-300">{String(inn.type)}</span> : null}
              {inn.feasibility ? <FeasibilityBadge level={String(inn.feasibility)} /> : null}
              {inn.horizon ? <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-foreground-muted">{String(inn.horizon)}</span> : null}
              {inn.devotionImpact ? <DevotionBadge level={String(inn.devotionImpact)} /> : null}
            </div>
            {inn.description ? <p className="text-[10px] text-foreground-muted mt-1 line-clamp-2">{String(inn.description)}</p> : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── 17. LivingMythology — structured narrative ──────────────────────

export function LivingMythologyCard({ myth }: { myth: Record<string, unknown> }) {
  return (
    <Card span={2}>
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="h-4 w-4 text-violet-400" />
        <Label>Mythologie vivante</Label>
      </div>
      <div className="space-y-2">
        {myth.canon ? (
          <div className="rounded-lg border border-violet-500/15 bg-violet-500/5 p-3">
            <p className="text-[10px] font-semibold text-violet-400 mb-1">Canon</p>
            <p className="text-sm text-white/80 leading-relaxed">{String(myth.canon)}</p>
          </div>
        ) : null}
        {myth.extensionRules ? (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[10px] font-semibold text-foreground-muted mb-1">Regles d&apos;extension</p>
            <p className="text-xs text-white/70 leading-relaxed">{String(myth.extensionRules)}</p>
          </div>
        ) : null}
        {myth.captureSystem ? (
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <p className="text-[10px] font-semibold text-foreground-muted mb-1">Systeme de capture</p>
            <p className="text-xs text-white/70 leading-relaxed">{String(myth.captureSystem)}</p>
          </div>
        ) : null}
        {/* Handle legacy nested object with foundingMyth, heroicMoments, sacredRituals */}
        {myth.foundingMyth || myth.heroicMoments || myth.sacredRituals ? (
          <div className="space-y-2">
            {myth.foundingMyth ? (
              <div className="rounded-lg border border-violet-500/15 bg-violet-500/5 p-3">
                <p className="text-[10px] font-semibold text-violet-400 mb-1">Mythe fondateur</p>
                <p className="text-sm text-white/80 leading-relaxed">{typeof myth.foundingMyth === "string" ? myth.foundingMyth : ""}</p>
              </div>
            ) : null}
            {Array.isArray(myth.heroicMoments) ? (
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[10px] font-semibold text-foreground-muted mb-1.5">Moments heroiques</p>
                <div className="space-y-1">
                  {(myth.heroicMoments as string[]).map((m, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white/70">
                      <Star className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />{typeof m === "string" ? m : extractLabel(m as Record<string, unknown>)}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {Array.isArray(myth.sacredRituals) ? (
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[10px] font-semibold text-foreground-muted mb-1.5">Rituels sacres</p>
                <div className="space-y-1">
                  {(myth.sacredRituals as string[]).map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-white/70">
                      <Flame className="h-3 w-3 text-violet-400 shrink-0 mt-0.5" />{typeof r === "string" ? r : extractLabel(r as Record<string, unknown>)}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

// ── Auto-detect name key for item lists ───────────────────────────────

/** Extract a human-readable label from an object — NEVER returns JSON */
function extractLabel(obj: Record<string, unknown>): string {
  const keys = ["name", "nom", "title", "action", "activation", "axe", "phase", "risk",
    "hypothesis", "asset", "value", "customName", "label", "canal", "description",
    "commandment", "principle", "taboo", "symbol", "word"];
  for (const k of keys) {
    if (typeof obj[k] === "string" && obj[k] !== "") return obj[k] as string;
  }
  // Fallback: first non-empty string value
  const firstStr = Object.values(obj).find(v => typeof v === "string" && v.length > 0);
  if (typeof firstStr === "string") return firstStr.slice(0, 60);
  // Fallback: count of fields
  return `(${Object.keys(obj).length} champs)`;
}

function detectNameKey(items: Array<Record<string, unknown>>): string | null {
  if (items.length === 0) return null;
  const first = items[0]!;
  const candidates = ["name", "nom", "title", "action", "value", "axe", "phase", "risk", "hypothesis", "activation", "asset"];
  return candidates.find(k => k in first && typeof first[k] === "string") ?? null;
}

// ── Master renderer — maps type → component automatically ─────────────

// Special field → renderer mapping (overrides type-based auto-detection)
const SPECIAL_FIELDS: Record<string, string> = {
  // Existing
  nomMarque: "hero",
  citationFondatrice: "quote",
  accroche: "hero-sm",
  archetype: "badge-amber",
  archetypeSecondary: "badge-grey",
  globalSwot: "swot",
  ikigai: "ikigai",
  fenetreOverton: "overton",
  tamSamSom: "tam",
  riskScore: "metric",
  brandMarketFitScore: "metric",
  totalActions: "metric",
  coherenceScore: "metric",
  globalBudget: "metric-xaf",
  // New specialized renderers
  catalogueParCanal: "catalogue-par-canal",
  roadmap: "roadmap",
  sprint90Days: "sprint-90",
  personas: "personas",
  produitsCatalogue: "produits",
  probabilityImpactMatrix: "risk-matrix",
  herosJourney: "heros-journey",
  valeurs: "valeurs",
  tonDeVoix: "ton-de-voix",
  directionArtistique: "direction-artistique",
  equipeDirigeante: "equipe",
  enemy: "enemy",
  prophecy: "prophecy",
  doctrine: "doctrine",
  activationsPossibles: "activations",
  innovationsProduit: "innovations",
  livingMythology: "living-mythology",
  // R pillar
  mitigationPriorities: "risk-matrix",
  // S pillar
  kpiDashboard: "kpi-dashboard",
  // E pillar
  conversionTriggers: "conversion-triggers",
};

// Inline metadata fields (rendered as badges, not cards)
const INLINE_FIELDS = new Set(["secteur", "pays", "langue", "brandNature", "primaryChannel", "businessModel", "positioningArchetype", "salesChannel", "economicModels"]);

export function isInlineField(key: string): boolean {
  return INLINE_FIELDS.has(key);
}

export function InlineBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs">
      <span className="text-foreground-muted">{label} :</span>
      <span className="font-medium text-white">{value}</span>
    </span>
  );
}

export function AutoField({ fieldKey, value, accent, onFocus, pillarKey }: {
  fieldKey: string;
  value: unknown;
  accent: string;
  onFocus?: (item: Record<string, unknown>) => void;
  pillarKey?: string;
}) {
  const label = getFieldLabel(fieldKey);
  const isFilled = value != null && value !== "" && !(Array.isArray(value) && value.length === 0);
  const spec = pillarKey ? getVariableSpec(pillarKey, fieldKey) : undefined;

  // Empty field — show bible description as hint
  if (!isFilled) {
    return (
      <div className="flex flex-col rounded-lg border border-dashed border-white/8 bg-white/[0.01] px-4 py-3 gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-foreground-muted">{label}</span>
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-foreground-muted/60">vide</span>
        </div>
        {spec?.description ? <p className="text-[10px] text-foreground-muted/40 italic">{spec.description}</p> : null}
      </div>
    );
  }

  // Inline fields
  if (INLINE_FIELDS.has(fieldKey)) {
    return <InlineBadge label={label} value={Array.isArray(value) ? value.join(", ") : String(value)} />;
  }

  // Special fields
  const special = SPECIAL_FIELDS[fieldKey];
  if (special) {
    switch (special) {
      case "hero": return <HeroCard label={label} value={String(value)} accent={accent} />;
      case "hero-sm": return <Card><Label>{label}</Label><p className="text-lg font-semibold text-white/90">{String(value)}</p></Card>;
      case "quote": return <QuoteCard label={label} value={String(value)} />;
      case "badge-amber": return <BadgeCard label={label} value={String(value)} color="text-amber-400 border-amber-500/20 bg-amber-500/5" />;
      case "badge-grey": return <BadgeCard label={label} value={String(value)} color="text-foreground-muted border-white/10 bg-white/5" />;
      case "swot": return <SWOTCard swot={value as Record<string, unknown>} />;
      case "ikigai": return <IkigaiCard ikigai={value as Record<string, unknown>} />;
      case "overton": return <OvertonCard overton={value as Record<string, unknown>} />;
      case "tam": return <TAMCard tam={value as Record<string, Record<string, unknown>>} />;
      case "metric": return <MetricCard label={label} value={Number(value)} accent={accent} />;
      case "metric-xaf": return <MetricCard label={label} value={Number(value)} suffix="XAF" accent={accent} />;
      // New specialized renderers
      case "catalogue-par-canal": return <CatalogueParCanalCard data={value as Record<string, unknown[]>} onFocus={onFocus} />;
      case "roadmap": return <RoadmapCard phases={value as Array<Record<string, unknown>>} />;
      case "sprint-90": return <Sprint90DaysCard sprints={value as Array<Record<string, unknown>>} />;
      case "personas": return <PersonasCard personas={value as Array<Record<string, unknown>>} onFocus={onFocus} />;
      case "produits": return <ProduitsCatalogueCard produits={value as Array<Record<string, unknown>>} onFocus={onFocus} />;
      case "risk-matrix": return <RiskMatrixCard risks={value as Array<Record<string, unknown>>} onFocus={onFocus} />;
      case "heros-journey": return <HerosJourneyCard acts={value as Array<Record<string, unknown>>} />;
      case "valeurs": return <ValeursCard valeurs={value as Array<Record<string, unknown>>} onFocus={onFocus} />;
      case "ton-de-voix": return <TonDeVoixCard ton={value as Record<string, unknown>} />;
      case "direction-artistique": return <DirectionArtistiqueCard da={value as Record<string, unknown>} onFocus={onFocus} />;
      case "equipe": return <EquipeDirigenteCard equipe={value as Array<Record<string, unknown>>} onFocus={onFocus} />;
      case "enemy": return <EnemyCard enemy={value as Record<string, unknown>} onFocus={onFocus} />;
      case "prophecy": return <ProphecyCard prophecy={value as Record<string, unknown> | string} />;
      case "doctrine": return <DoctrineCard doctrine={value as Record<string, unknown> | string} />;
      case "activations": return <ActivationsCard activations={value as Array<Record<string, unknown>>} onFocus={onFocus} />;
      case "innovations": return <InnovationsCard innovations={value as Array<Record<string, unknown>>} onFocus={onFocus} />;
      case "living-mythology": return <LivingMythologyCard myth={value as Record<string, unknown>} />;
      case "kpi-dashboard": return <ItemList label={label} items={value as Array<Record<string, unknown>>} onFocus={onFocus} nameKey="name" />;
      case "conversion-triggers": return <ItemList label={label} items={value as Array<Record<string, unknown>>} onFocus={onFocus} nameKey="trigger" />;
    }
  }

  // Type-based auto-detection
  if (typeof value === "string") return <TextCard label={label} value={value} />;
  if (typeof value === "number") return <MetricCard label={label} value={value} accent={accent} />;
  if (typeof value === "boolean") return <Card><Label>{label}</Label><span className={value ? "text-emerald-400 text-sm" : "text-red-400 text-sm"}>{value ? "Oui" : "Non"}</span></Card>;

  if (Array.isArray(value)) {
    if (value.length === 0) return <Empty label={label} />;
    if (typeof value[0] === "string") return <TagList label={label} values={value as string[]} />;
    if (typeof value[0] === "object" && value[0] !== null) return <ItemList label={label} items={value as Array<Record<string, unknown>>} onFocus={onFocus} />;
    return <TagList label={label} values={value.map(String)} />;
  }

  if (typeof value === "object" && value !== null) {
    return <ObjectCard label={label} obj={value as Record<string, unknown>} onFocus={onFocus} />;
  }

  return <TextCard label={label} value={String(value)} />;
}

export { Empty, Card, Label };

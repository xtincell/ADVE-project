/**
 * ORACLE — Composers déterministes des sections 22-35 (fallback sans LLM).
 *
 * Mandat mégasprint « dernière ligne droite » : « la compilation de l'Oracle
 * doit fonctionner même sans LLM (fallback déterministe) ». Les 21 sections
 * CORE sont déjà PURE_MAPPER (0 LLM). Les 14 sections BIG4/DISTINCTIVE/Neteru
 * Ground (22-35) passaient par des séquences Artemis LLM sans aucun fallback —
 * sans clé API, l'Oracle restait troué.
 *
 * Doctrine (Blueprint §3.5) : « ~95 % des outils sont COMPOSE ou CALC —
 * déterministes, reproductibles, sans hasard. Le LLM est réservé à la
 * génération créative pure. » Ces composers sont des COMPOSE : ils assemblent
 * les DONNÉES RÉELLES de la stratégie (piliers, snapshots, campagnes, signaux)
 * dans la shape exacte que les composants §22-35 consomment. Aucune invention :
 * une donnée absente produit une lacune visible (EmptyState honnête), jamais
 * un contenu halluciné.
 *
 * Chaque composer écrit son BrandAsset via `promoteSectionToBrandAsset`
 * (writeback canonique, Loi 1 — ACTIVE jamais écrasé) puis retourne le payload
 * pour l'OracleSection. Provenance tracée : `_provenance: DETERMINISTIC_COMPOSE`
 * (les clés `_*` sont strippées de l'UI mais restent en DB pour l'audit).
 */

import { db } from "@/lib/db";
import { collectInitiatives } from "@/lib/types/pillar-schemas";
import { resolveCultIndexTier } from "@/domain/cult-index-tier";
import type { SectionMeta } from "./types";
// section-writeback (pas enrich-oracle) — évite le cycle index → composers →
// enrich-oracle → index, ce qui autorise assemblePresentation à composer en
// read-time fallback (audit galileo).
import { promoteSectionToBrandAsset } from "./section-writeback";

// ── Disponibilité LLM (check déterministe, zéro réseau) ───────────────

/**
 * true si AU MOINS un provider LLM est configuré. Utilisé par le handler
 * GENERATE_ORACLE_SECTION pour court-circuiter directement vers le composer
 * déterministe quand aucun LLM n'est joignable par construction.
 */
export function isAnyLLMProviderConfigured(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.OLLAMA_BASE_URL,
  );
}

// ── Types internes ─────────────────────────────────────────────────────

type Blob = Record<string, unknown>;

interface ComposerContext {
  strategy: {
    id: string;
    name: string;
    businessContext: Blob | null;
    manipulationMix: Blob | null;
  };
  pillars: Partial<Record<string, Blob>>;
  cultSnapshot: {
    compositeScore: number;
    tier: string;
    engagementDepth: number;
    superfanVelocity: number;
    communityCohesion: number;
    brandDefenseRate: number;
    ugcGenerationRate: number;
    ritualAdoption: number;
    evangelismScore: number;
    measuredAt: Date;
  } | null;
  devotionSnapshot: {
    spectateur: number;
    interesse: number;
    participant: number;
    engage: number;
    ambassadeur: number;
    evangeliste: number;
    devotionScore: number;
    measuredAt: Date;
  } | null;
  superfanCount: number;
  signals: Array<{ type: string; data: unknown; createdAt: Date }>;
  campaigns: Array<{
    name: string;
    budget: unknown;
    status: string;
    budgetLines: Array<{ category: string; planned: unknown; currency: string }>;
  }>;
}

export interface DeterministicSectionResult {
  payload: { sectionMeta: { id: string; number: string; title: string }; runner: { kind: string; ref: string }; content: Blob };
  confidence: number;
}

// ── Helpers purs ───────────────────────────────────────────────────────

function str(v: unknown, max = 400): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function names(items: unknown[], keys: string[] = ["nom", "name", "titre", "title", "action", "valeur"]): string[] {
  return items
    .map((it) => {
      if (typeof it === "string") return it;
      if (it && typeof it === "object") {
        for (const k of keys) {
          const v = (it as Blob)[k];
          if (typeof v === "string" && v.trim()) return v.trim();
        }
      }
      return null;
    })
    .filter((s): s is string => Boolean(s));
}

/** Score /10 déterministe = ratio de présence des sources d'une dimension. */
function presenceScore(present: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((present / total) * 10 * 10) / 10;
}

// ── Chargement contexte (1 requête groupée) ────────────────────────────

/**
 * Charge le contexte de composition (1 requête groupée). Exporté pour le
 * read-time fallback de `assemblePresentation` : il charge le contexte UNE
 * fois puis compose toutes les sections §22-35 manquantes via
 * `composeSectionContent` (sans writeback).
 */
export async function loadComposerContext(strategyId: string): Promise<ComposerContext | null> {
  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    include: {
      pillars: { select: { key: true, content: true } },
      cultIndexSnapshots: { orderBy: { measuredAt: "desc" }, take: 1 },
      devotionSnapshots: { orderBy: { measuredAt: "desc" }, take: 1 },
      signals: { orderBy: { createdAt: "desc" }, take: 40, select: { type: true, data: true, createdAt: true } },
      campaigns: {
        select: {
          name: true,
          budget: true,
          status: true,
          budgetLines: { select: { category: true, planned: true, currency: true } },
        },
      },
      _count: { select: { superfanProfiles: true } },
    },
  });
  if (!strategy) return null;

  const pillars: Partial<Record<string, Blob>> = {};
  for (const p of strategy.pillars) {
    pillars[p.key.toLowerCase()] = (p.content ?? {}) as Blob;
  }

  return {
    strategy: {
      id: strategy.id,
      name: strategy.name,
      businessContext: (strategy.businessContext ?? null) as Blob | null,
      manipulationMix: (strategy.manipulationMix ?? null) as Blob | null,
    },
    pillars,
    cultSnapshot: strategy.cultIndexSnapshots[0] ?? null,
    devotionSnapshot: strategy.devotionSnapshots[0] ?? null,
    superfanCount: strategy._count.superfanProfiles,
    signals: strategy.signals,
    campaigns: strategy.campaigns,
  };
}

// ── Composers par section ──────────────────────────────────────────────

async function composeCrewProgram(ctx: ComposerContext): Promise<Blob> {
  const { draftCrewProgram } = await import("@/server/services/imhotep");
  const sector = str(ctx.strategy.businessContext?.sector) ?? str(ctx.pillars.a?.secteur) ?? undefined;
  const draft = await draftCrewProgram({ strategyId: ctx.strategy.id, sector });
  return {
    crewProgram: {
      status: draft.status,
      summary: draft.placeholder,
      rolesRequired: draft.rolesRequired ?? [],
      estimatedBudgetUsd: draft.estimatedBudgetUsd ?? null,
    },
  };
}

async function composeCommsPlan(ctx: ComposerContext): Promise<Blob> {
  const { draftCommsPlan } = await import("@/server/services/anubis");
  const draft = await draftCommsPlan({ strategyId: ctx.strategy.id });
  // Canaux réellement déclarés par la marque (E.touchpoints) en tête,
  // complétés par les canaux par défaut du draft Anubis.
  const declared = names(arr(ctx.pillars.e?.touchpoints), ["canal", "channel", "nom", "name"]);
  const channels = [...new Set([...declared, ...(draft.channels ?? []).map(String)])];
  return {
    commsPlan: {
      status: draft.status,
      summary: draft.placeholder,
      channels,
    },
  };
}

function compose7S(ctx: ComposerContext): Blob {
  const a = ctx.pillars.a ?? {};
  const d = ctx.pillars.d ?? {};
  const s = ctx.pillars.s ?? {};
  const i = ctx.pillars.i ?? {};

  const vision = str(s.visionStrategique, 300);
  const roadmapPhases = arr(s.roadmap).length;
  const equipe = arr(a.equipeDirigeante);
  const valeurs = names(arr(a.valeurs));
  const ton = (d.tonDeVoix ?? null) as Blob | null;
  const personnalite = ton ? names(arr(ton.personnalite)).join(", ") : null;
  const canaux = i.catalogueParCanal && typeof i.catalogueParCanal === "object"
    ? Object.keys(i.catalogueParCanal as Blob)
    : [];
  const initiatives = collectInitiatives(i) as Blob[];
  const competences = equipe.flatMap((m) => names(arr((m as Blob)?.competences ?? (m as Blob)?.skills)));

  const dim = (state: string | null, sources: Array<unknown>, gapLabel: string, reco: string) => {
    const present = sources.filter((x) => x != null && (Array.isArray(x) ? x.length > 0 : String(x).trim() !== "")).length;
    return {
      state: state ?? `Donnée non déclarée — ${gapLabel}`,
      gap: present < sources.length ? gapLabel : "Aligné avec les données déclarées",
      recommendation: present < sources.length ? reco : "Maintenir et mesurer",
      score: presenceScore(present, sources.length),
    };
  };

  return {
    mckinsey7s: {
      strategy: dim(
        vision ?? (roadmapPhases > 0 ? `Roadmap structurée en ${roadmapPhases} phase(s)` : null),
        [vision, roadmapPhases > 0 ? roadmapPhases : null],
        "Vision stratégique S incomplète",
        "Compléter s.visionStrategique via SYNTHESIZE_S",
      ),
      structure: dim(
        equipe.length > 0 ? `${equipe.length} profil(s) dirigeant(s) déclaré(s) : ${names(equipe).slice(0, 4).join(", ")}` : null,
        [equipe.length > 0 ? equipe : null],
        "Équipe dirigeante non déclarée (a.equipeDirigeante)",
        "Renseigner a.equipeDirigeante via OPERATOR_AMEND_PILLAR",
      ),
      systems: dim(
        canaux.length > 0 ? `${initiatives.length} initiative(s) sur ${canaux.length} canal/canaux : ${canaux.slice(0, 5).join(", ")}` : null,
        [canaux.length > 0 ? canaux : null, ctx.campaigns.length > 0 ? ctx.campaigns : null],
        "Catalogue d'actions I vide ou aucune campagne",
        "Générer le catalogue via GENERATE_I_ACTIONS",
      ),
      shared_values: dim(
        valeurs.length > 0 ? `Valeurs hiérarchisées : ${valeurs.slice(0, 5).join(" · ")}` : null,
        [valeurs.length > 0 ? valeurs : null],
        "Valeurs A non déclarées",
        "Renseigner a.valeurs (min 3, avec justification)",
      ),
      style: dim(
        personnalite ? `Ton de voix : ${personnalite}` : null,
        [personnalite],
        "Ton de voix D non défini",
        "Renseigner d.tonDeVoix",
      ),
      staff: dim(
        equipe.length > 0 ? `${equipe.length} membre(s) clé(s) — ${ctx.superfanCount} superfan(s) trackés en orbite` : null,
        [equipe.length > 0 ? equipe : null],
        "Effectifs non déclarés",
        "Compléter l'équipe + brancher Imhotep crew",
      ),
      skills: dim(
        competences.length > 0 ? `Compétences couvertes : ${[...new Set(competences)].slice(0, 6).join(", ")}` : null,
        [competences.length > 0 ? competences : null],
        "Compétences de l'équipe non détaillées",
        "Détailler les compétences par profil (a.equipeDirigeante[].competences)",
      ),
    },
  };
}

function composeBcgPortfolio(ctx: ComposerContext): Blob {
  const v = ctx.pillars.v ?? {};
  const i = ctx.pillars.i ?? {};
  const s = ctx.pillars.s ?? {};

  const offres = arr(v.sacrements);
  const ladder = arr(v.productLadder);
  const innovations = arr(i.innovationsProduit);
  const roadmapText = JSON.stringify(s.roadmap ?? "").toLowerCase();

  // Règles déterministes documentées :
  //  - cash_cows : offres déclarées au catalogue (revenu courant).
  //  - stars     : offres explicitement citées dans la roadmap S (croissance investie).
  //  - question_marks : innovations produit I (paris non prouvés).
  //  - dogs      : jamais auto-accusé sans donnée de performance (liste vide).
  const offreNames = names(offres.length > 0 ? offres : ladder);
  const stars = offreNames.filter((n) => n.length > 2 && roadmapText.includes(n.toLowerCase()));
  const cashCows = offreNames.filter((n) => !stars.includes(n));
  const questionMarks = names(innovations);

  const quadrantsFilled = [stars, cashCows, questionMarks].filter((q) => q.length > 0).length;
  return {
    bcgPortfolio: {
      stars: stars.map((n) => ({ name: n, source: "roadmap S" })),
      cash_cows: cashCows.map((n) => ({ name: n, source: "offres V déclarées" })),
      question_marks: questionMarks.map((n) => ({ name: n, source: "innovations I" })),
      dogs: [],
    },
    bcgHealthScore: Math.round((quadrantsFilled / 3) * 100) / 10, // /10
    methodologie:
      "Classement déterministe : offres V = vaches à lait ; offres investies dans la roadmap S = étoiles ; innovations I = dilemmes. Aucun produit n'est classé 'poids mort' sans donnée de performance mesurée.",
  };
}

function composeBainNps(ctx: ComposerContext): Blob {
  const e = ctx.pillars.e ?? {};
  const d = ctx.pillars.d ?? {};
  const declared = num((ctx.pillars.a ?? {}).eNps) ?? num(e.eNps);

  let score: number | null = declared;
  let methode = "eNPS déclaré par l'opérateur";
  const snap = ctx.devotionSnapshot;
  if (score === null && snap) {
    const total =
      snap.spectateur + snap.interesse + snap.participant + snap.engage + snap.ambassadeur + snap.evangeliste;
    if (total > 0) {
      // Proxy déterministe : promoteurs = ambassadeurs+évangélistes ;
      // détracteurs = spectateurs (audience non convertie).
      // lafusee:allow-adhoc-completion — score NPS proxy (Devotion Ladder), pas de la complétion pillaire
      score = Math.round(((snap.ambassadeur + snap.evangeliste - snap.spectateur) / total) * 100);
      methode = "Proxy déterministe depuis la Devotion Ladder (promoteurs = ambassadeurs+évangélistes, détracteurs = spectateurs)";
    }
  }

  const personas = arr(d.personas) as Blob[];
  const promoterDrivers = personas.flatMap((p) => names(arr(p.motivations))).slice(0, 5);
  const detractorDrivers = [
    ...personas.flatMap((p) => names(arr(p.barriers ?? p.freins))),
    ...names(arr(e.barriersEngagement)),
  ].slice(0, 5);

  if (score === null && promoterDrivers.length === 0 && detractorDrivers.length === 0) return {};

  const snapTotal = snap
    ? snap.spectateur + snap.interesse + snap.participant + snap.engage + snap.ambassadeur + snap.evangeliste
    : 0;
  return {
    bainNps: {
      score,
      promoters: snap && snapTotal > 0 ? Math.round(((snap.ambassadeur + snap.evangeliste) / snapTotal) * 100) : null,
      drivers: { promoters: promoterDrivers, detractors: detractorDrivers },
      methode,
    },
  };
}

function composeGreenhouse(ctx: ComposerContext): Blob {
  const a = ctx.pillars.a ?? {};
  const i = ctx.pillars.i ?? {};
  const equipe = arr(a.equipeDirigeante) as Blob[];
  if (equipe.length === 0) return {};

  const profiles = equipe.map((m) => ({
    nom: str(m.nom ?? m.name) ?? "Profil",
    role: str(m.role ?? m.poste) ?? null,
    competences: names(arr(m.competences ?? m.skills)),
  }));
  const roles = [...new Set(profiles.map((p) => p.role).filter(Boolean))];
  const canaux = i.catalogueParCanal && typeof i.catalogueParCanal === "object" ? Object.keys(i.catalogueParCanal as Blob) : [];
  const couvertes = new Set(profiles.flatMap((p) => p.competences.map((c) => c.toLowerCase())));
  const gaps = canaux.filter((c) => ![...couvertes].some((comp) => comp.includes(c.toLowerCase().slice(0, 5))));

  return {
    deloitteGreenhouse: {
      team_profiles: profiles,
      complementarity_score: Math.round((roles.length / Math.max(1, profiles.length)) * 10 * 10) / 10,
      execution_capacity: `${ctx.campaigns.filter((c) => c.status === "ACTIVE" || c.status === "IN_PROGRESS").length} campagne(s) active(s) / ${ctx.campaigns.length} totale(s)`,
      skill_gaps: gaps.length > 0 ? gaps.map((g) => `Canal ${g} sans compétence interne déclarée`) : ["Aucun gap détecté sur les canaux déclarés"],
    },
  };
}

function compose3Horizons(ctx: ComposerContext): Blob {
  const i = ctx.pillars.i ?? {};
  const s = ctx.pillars.s ?? {};
  const initiatives = collectInitiatives(i) as Blob[];

  const isShort = (it: Blob) => it.timeframe === "SPRINT_90" || it.timeframe === "PHASE_1";
  const selected = initiatives.filter((it) => it.status === "SELECTED_FOR_ROADMAP");
  const h1 = names(selected.filter(isShort), ["action", "titre", "title", "nom"]);
  const h2 = names(selected.filter((it) => !isShort(it)), ["action", "titre", "title", "nom"]);
  const h3 = [
    ...names(arr(i.innovationsProduit)),
    ...(str(s.visionStrategique, 200) ? [str(s.visionStrategique, 200)!] : []),
  ];

  const total = h1.length + h2.length + h3.length;
  if (total === 0) return {};
  // lafusee:allow-adhoc-completion — répartition McKinsey 3-Horizons (h1/h2/h3), pas de la complétion pillaire
  const pct = (n: number) => Math.round((n / total) * 100);

  return {
    mckinsey3Horizons: {
      h1: { label: "Cœur — exécution 90 jours", items: h1 },
      h2: { label: "Émergent — phases suivantes de la roadmap", items: h2 },
      h3: { label: "Transformationnel — innovations + vision", items: h3 },
      allocation: { h1: pct(h1.length), h2: pct(h2.length), h3: pct(h3.length) },
    },
  };
}

function composeStrategyPalette(ctx: ComposerContext): Blob {
  const t = ctx.pillars.t ?? {};
  const d = ctx.pillars.d ?? {};
  const marketReality = (t.marketReality ?? {}) as Blob;
  const trends = arr(marketReality.macroTrends);
  const weakSignals = arr(marketReality.weakSignals).length + ctx.signals.length;
  const concurrents = arr(d.paysageConcurrentiel).length;

  if (trends.length === 0 && concurrents === 0 && weakSignals === 0) return {};

  // Classification déterministe BCG Palette :
  //   prévisibilité ← volume de turbulence observée (tendances + signaux faibles)
  //   malléabilité  ← densité concurrentielle (marché fragmenté = façonnable)
  const turbulence = trends.length + Math.min(weakSignals, 10);
  const predictable = turbulence <= 4;
  const malleable = concurrents <= 3;
  const environment = predictable
    ? malleable ? "Visionary (prévisible · façonnable)" : "Classical (prévisible · non façonnable)"
    : malleable ? "Shaping (imprévisible · façonnable)" : "Adaptive (imprévisible · non façonnable)";
  const approche = predictable
    ? malleable ? "Créer le marché : être le premier à structurer la catégorie." : "Planifier : analyse, positionnement, exécution séquencée."
    : malleable ? "Orchestrer l'écosystème : coalitions, standards, plateforme." : "Expérimenter vite : cycles courts, portefeuille de paris.";

  return {
    bcgStrategyPalette: {
      environnement: environment,
      approche_recommandee: approche,
      signaux_utilises: {
        tendances_macro: trends.length,
        signaux_faibles: weakSignals,
        concurrents_declares: concurrents,
      },
      justification: `Classement déterministe : turbulence observée=${turbulence} (seuil 4), densité concurrentielle=${concurrents} (seuil 3).`,
    },
  };
}

function composeBudget(ctx: ComposerContext): Blob {
  const i = ctx.pillars.i ?? {};
  const initiatives = collectInitiatives(i) as Blob[];

  let total = 0;
  let currency = "FCFA";
  const byCategory: Record<string, number> = {};
  for (const c of ctx.campaigns) {
    const b = num(c.budget);
    if (b) total += b;
    for (const line of c.budgetLines) {
      const planned = num(line.planned);
      if (planned) {
        byCategory[line.category] = (byCategory[line.category] ?? 0) + planned;
        currency = line.currency || currency;
      }
    }
  }

  const histo: Record<string, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  for (const it of initiatives) {
    const b = String(it.budgetEstime ?? "");
    if (b in histo) histo[b] = (histo[b] ?? 0) + 1;
  }
  const economiques = names(initiatives.filter((it) => it.budgetEstime === "LOW"), ["action", "titre", "nom"]).slice(0, 5);

  if (total === 0 && Object.keys(byCategory).length === 0 && initiatives.length === 0) return {};

  return {
    deloitteBudget: {
      total_budget: total > 0 ? `${total.toLocaleString("fr-FR")} ${currency}` : "Aucun budget campagne engagé à date",
      allocation_par_categorie: byCategory,
      repartition_initiatives_par_intensite: histo,
      alternatives_economiques: economiques.length > 0 ? economiques : ["Aucune initiative LOW-budget cataloguée"],
      methodologie: "Consolidation déterministe : budgets campagnes + lignes budgétaires réelles + intensités déclarées du catalogue I.",
    },
  };
}

function composeCultIndex(ctx: ComposerContext): Blob {
  const snap = ctx.cultSnapshot;
  if (!snap) return {};
  return {
    cultIndex: {
      score: Math.round(snap.compositeScore * 10) / 10,
      // CultIndexTier résolu — même résolveur que §01/§15/§16 (mappers) pour
      // qu'un tier sale en DB ("FUNCTIONAL" lu par l'ancien parseDevotionLadder)
      // ne rende plus §31 incohérent avec l'Executive Summary (audit galileo).
      tier: resolveCultIndexTier(snap.tier, snap.compositeScore),
      components: {
        engagementDepth: snap.engagementDepth,
        superfanVelocity: snap.superfanVelocity,
        communityCohesion: snap.communityCohesion,
        brandDefenseRate: snap.brandDefenseRate,
        ugcGenerationRate: snap.ugcGenerationRate,
        ritualAdoption: snap.ritualAdoption,
        evangelismScore: snap.evangelismScore,
      },
      measuredAt: snap.measuredAt.toISOString(),
    },
  };
}

function composeManipulationMatrix(ctx: ComposerContext): Blob {
  const mix = ctx.strategy.manipulationMix;
  const e = ctx.pillars.e ?? {};
  const rituels = names(arr(e.rituels), ["nom", "name", "rituel"]);
  const touchpoints = names(arr(e.touchpoints), ["canal", "channel", "nom", "name"]);

  // Mix uniforme implicite si non back-fillé (doctrine MANIPULATION-MATRIX).
  const weights: Record<string, number> = {
    peddler: num(mix?.peddler) ?? 0.25,
    dealer: num(mix?.dealer) ?? 0.25,
    facilitator: num(mix?.facilitator) ?? 0.25,
    entertainer: num(mix?.entertainer) ?? 0.25,
  };
  const dominant = Object.entries(weights).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "facilitator";

  return {
    manipulationMatrix: {
      evaluations: Object.entries(weights).map(([mode, weight]) => ({
        mode,
        weight,
        observed: mode === dominant ? "Mode dominant du mix stratégique déclaré" : "Présent dans le mix",
      })),
      summary: {
        dominantMode: dominant,
        mixSource: mix ? "Strategy.manipulationMix déclaré" : "Mix uniforme implicite (0.25 par mode — à back-filler)",
        rituelsDeclares: rituels.slice(0, 6),
        touchpointsDeclares: touchpoints.slice(0, 6),
      },
    },
  };
}

function composeDevotionLadder(ctx: ComposerContext): Blob {
  const snap = ctx.devotionSnapshot;
  const e = ctx.pillars.e ?? {};
  const portrait = (e.superfanPortrait ?? null) as Blob | null;
  if (!snap && !portrait && ctx.superfanCount === 0) return {};

  const niveaux = snap
    ? [
        { niveau: "Spectateur", valeur: snap.spectateur },
        { niveau: "Intéressé", valeur: snap.interesse },
        { niveau: "Participant", valeur: snap.participant },
        { niveau: "Engagé", valeur: snap.engage },
        { niveau: "Ambassadeur", valeur: snap.ambassadeur },
        { niveau: "Prescripteur", valeur: snap.evangeliste },
      ]
    : [];

  return {
    devotionLadder: {
      ...(snap
        ? {
            distribution: niveaux,
            devotionScore: snap.devotionScore,
            mesure: snap.measuredAt.toISOString(),
          }
        : {}),
      superfansTrackes: ctx.superfanCount,
      conversionTriggers: arr(e.conversionTriggers).slice(0, 6),
      ...(portrait ? { portraitSuperfan: portrait } : {}),
    },
  };
}

function composeOverton(ctx: ComposerContext): Blob {
  const s = ctx.pillars.s ?? {};
  const d = ctx.pillars.d ?? {};
  const fo = (s.fenetreOverton ?? {}) as Blob;
  const current = str(fo.perceptionActuelle, 300);
  const target = str(fo.perceptionCible, 300);
  const positionnement = str(d.positionnement, 300);
  if (!current && !target && !positionnement) return {};

  const axes: Array<Blob> = [];
  if (current || target) {
    axes.push({
      name: "Perception sectorielle (fenêtre Overton)",
      current_position: current ?? "Non mesurée",
      target_position: target ?? "Non définie",
      gap: str(fo.ecart, 300) ?? (current && target ? "Écart qualitatif déclaré entre perception actuelle et cible" : "Données partielles"),
    });
  }
  if (positionnement) {
    axes.push({
      name: "Positionnement déclaré (D)",
      current_position: positionnement,
      target_position: target ?? positionnement,
      gap: target ? "La cible Overton est portée par la roadmap S" : "Cible non encore formalisée",
    });
  }
  const maneuvers = arr(fo.strategieDeplacment ?? fo.strategieDeplacement);

  return { overtonDistinctive: { axes, maneuvers } };
}

function composeTarsisSignals(ctx: ComposerContext): Blob {
  const tarsisLike = ctx.signals.filter(
    (sg) => sg.type.toUpperCase().includes("TARSIS") || sg.type.toUpperCase().includes("WEAK") || sg.type.toUpperCase().includes("SIGNAL"),
  );
  if (tarsisLike.length === 0) return {};

  const signals = tarsisLike.slice(0, 12).map((sg) => {
    const data = (sg.data ?? {}) as Blob;
    return {
      description: str(data.description ?? data.summary ?? data.title, 300) ?? sg.type,
      category: str(data.category) ?? sg.type,
      impact: num(data.impact) ?? num(data.impactScore) ?? null,
      horizon: str(data.horizon) ?? null,
      action: str(data.action ?? data.recommendation, 200) ?? null,
      confidence: num(data.confidence) ?? null,
      detectedAt: sg.createdAt.toISOString(),
    };
  });

  return { tarsisWeakSignals: { signals, top3: signals.slice(0, 3) } };
}

// ── Dispatch ───────────────────────────────────────────────────────────

const COMPOSERS: Record<string, (ctx: ComposerContext) => Blob | Promise<Blob>> = {
  "imhotep-crew-program": composeCrewProgram,
  "anubis-plan-comms": composeCommsPlan,
  "mckinsey-7s": compose7S,
  "bcg-portfolio": composeBcgPortfolio,
  "bain-nps": composeBainNps,
  "deloitte-greenhouse": composeGreenhouse,
  "mckinsey-3-horizons": compose3Horizons,
  "bcg-strategy-palette": composeStrategyPalette,
  "deloitte-budget": composeBudget,
  "cult-index": composeCultIndex,
  "manipulation-matrix": composeManipulationMatrix,
  "devotion-ladder": composeDevotionLadder,
  "overton-distinctive": composeOverton,
  "tarsis-weak-signals": composeTarsisSignals,
};

/** true si la section a un composer déterministe disponible. */
export function hasDeterministicComposer(sectionId: string): boolean {
  return sectionId in COMPOSERS;
}

const MEASURED_SECTIONS = new Set(["cult-index", "devotion-ladder", "tarsis-weak-signals"]);

/**
 * Compose le content d'une section §22-35 depuis un contexte DÉJÀ chargé —
 * **sans writeback ni accès DB** (hors §22/§23 qui délèguent aux drafts
 * déterministes Imhotep/Anubis). C'est le cœur réutilisable :
 *   - `composeSectionDeterministic` l'enveloppe + writeback (compose-path).
 *   - `assemblePresentation` l'appelle en read-time fallback (read-path),
 *     contexte chargé une seule fois pour les N sections manquantes.
 *
 * Retourne `null` si la section n'a pas de composer ; un content `{}` (vide)
 * si la donnée source est absente (EmptyState honnête — jamais d'invention).
 * Confidence : 0.8 (snapshots mesurés) / 0.6 (compositions dérivées).
 */
export async function composeSectionContent(
  ctx: ComposerContext,
  meta: SectionMeta,
): Promise<{ content: Blob; confidence: number } | null> {
  const composer = COMPOSERS[meta.id];
  if (!composer) return null;
  const content = await composer(ctx);
  return { content, confidence: MEASURED_SECTIONS.has(meta.id) ? 0.8 : 0.6 };
}

/**
 * Compose la section déterministiquement depuis les données réelles, écrit le
 * BrandAsset (writeback canonique) et retourne le payload OracleSection.
 * Chemin de génération (GENERATE_ORACLE_SECTION). Retourne null si pas de composer.
 */
export async function composeSectionDeterministic(
  strategyId: string,
  meta: SectionMeta,
): Promise<DeterministicSectionResult | null> {
  if (!hasDeterministicComposer(meta.id)) return null;

  const ctx = await loadComposerContext(strategyId);
  if (!ctx) throw new Error(`Strategy ${strategyId} not found for deterministic composer`);

  const composed = await composeSectionContent(ctx, meta);
  if (!composed) return null;
  const enriched: Blob = {
    ...composed.content,
    _provenance: "DETERMINISTIC_COMPOSE",
    _composedAt: new Date().toISOString(),
  };

  // Writeback BrandAsset (même chemin que la séquence LLM — Loi 1 respectée).
  if (meta.brandAssetKind && Object.keys(composed.content).length > 0) {
    await promoteSectionToBrandAsset({
      strategyId,
      sectionId: meta.id,
      kind: meta.brandAssetKind,
      content: enriched,
    }).catch((err) => {
      console.warn(`[deterministic-composer] writeback BrandAsset failed for ${meta.id}:`, err instanceof Error ? err.message : err);
    });
  }

  return {
    payload: {
      sectionMeta: { id: meta.id, number: meta.number, title: meta.title },
      runner: { kind: "DETERMINISTIC_COMPOSE", ref: meta.id },
      content: enriched,
    },
    confidence: composed.confidence,
  };
}

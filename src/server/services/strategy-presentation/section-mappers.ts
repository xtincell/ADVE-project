/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Strategy Presentation — Section Mappers
 * Pure functions that map raw Prisma data → typed section objects.
 * Each mapper extracts its section from the single comprehensive query result.
 * When real data is missing, coherent defaults are generated from brand context.
 * Note: Uses `any` for strategy param since Prisma complex includes resist clean typing.
 */

import type { AdvertisVector, BrandClassification } from "@/lib/types/advertis-vector";
import { resolveCultIndexTier } from "@/domain/cult-index-tier";
import { collectNormalizedInitiatives, type NormalizedInitiative } from "@/lib/types/pillar-schemas";
// section-defaults n'est plus consommé par les mappers (audit galileo) : les
// modules dévorent les vraies données ADVERTIS (multi-clés + sources
// alternatives) et n'inventent plus de contenu generique. Cf. ADR-0095.
// ADR-0094 (Slice B2) : le catalogue Oracle lit le normalizer canonique
// (`collectNormalizedInitiatives`) qui sert aussi le materializer BrandAction.
import type {
  ExecutiveSummarySection,
  ContexteDefiSection,
  AuditDiagnosticSection,
  PlateformeStrategiqueSection,
  TerritoireCreatifSection,
  PlanActivationSection,
  ProductionLivrablesSection,
  MediasDistributionSection,
  KpisMesureSection,
  BudgetSection,
  TimelineGouvernanceSection,
  EquipeSection,
  ConditionsEtapesSection,
  StrategyPresentationDocument,
  CompletenessReport,
  SectionCompleteness,
  PropositionValeurSection,
  ExperienceEngagementSection,
  SwotInterneSection,
  SwotExterneSection,
  SignauxOpportunitesSection,
  CatalogueActionsSection,
  FenetreOvertonSection,
  ProfilSuperfanSection,
  CroissanceEvolutionSection,
} from "./types";

// ─── Utilities ───────────────────────────────────────────────────────────────

function getPillarContent(strategy: any, key: string): Record<string, unknown> | null {
  const pillar = strategy.pillars.find((p: any) => p.key === key);
  return (pillar?.content as Record<string, unknown>) ?? null;
}

function getGloryOutput(strategy: any, toolSlug: string): Record<string, unknown> | null {
  const output = strategy.gloryOutputs.find((g: any) => g.toolSlug === toolSlug);
  return (output?.output as Record<string, unknown>) ?? null;
}

function safeStr(val: unknown): string | null {
  return typeof val === "string" && val.length > 0 ? val : null;
}

function safeArr(val: unknown): unknown[] {
  return Array.isArray(val) ? val : [];
}

function safeNum(val: unknown): number | null {
  return typeof val === "number" ? val : null;
}

// ─── 01: Executive Summary ───────────────────────────────────────────────────

export function mapExecutiveSummary(
  strategy: any,
  vector: AdvertisVector,
  classification: BrandClassification
): ExecutiveSummarySection {
  const cultSnap = strategy.cultIndexSnapshots[0] ?? null;
  const devSnap = strategy.devotionSnapshots[0] ?? null;

  // Forces / Faiblesses qualitatives — contenu textuel issu du pilier R
  // `globalSwot.strengths/weaknesses` (Zod requires min 3 each per
  // SWOTQuadrantSchema). Un score chiffré "Authenticité 23/25" n'EST PAS une
  // force au sens marketing — c'est une métrique de complétude. La force
  // marketing est une affirmation qualitative ("réseau partenaires solide",
  // "pricing premium justifié"). Le screenshot du 2026-05-06 a confirmé
  // que rendre des scores /25 dans la box "Forces" trompe le lecteur.
  const pillarR = getPillarContent(strategy, "r");
  const globalSwot = (pillarR?.globalSwot ?? null) as {
    strengths?: unknown;
    weaknesses?: unknown;
  } | null;
  const asStringArray = (val: unknown): string[] =>
    Array.isArray(val)
      ? val.filter((v): v is string => typeof v === "string" && v.trim().length > 0).slice(0, 3)
      : [];
  const topStrengths = asStringArray(globalSwot?.strengths);
  const topWeaknesses = asStringArray(globalSwot?.weaknesses);

  // Cult Index — read-only from CultIndexSnapshot. Le fallback magic `× 0.45`
  // a été supprimé (ADR-0046). Le `tier` est un CultIndexTier (GHOST→CULT),
  // l'échelle que `cult-index-engine` écrit réellement. `resolveCultIndexTier`
  // prend le tier stocké s'il est valide, sinon le dérive du score — donc un
  // snapshot mesuré affiche TOUJOURS son palier (audit galileo 2026-06-13 :
  // l'ancien parseDevotionLadderTier rejetait "FUNCTIONAL" → cultIndex perdu).
  const derivedCultIndex = cultSnap
    ? { score: cultSnap.compositeScore, tier: resolveCultIndexTier(cultSnap.tier, cultSnap.compositeScore) }
    : null;

  // Derive devotion from vector engagement pillar when no snapshot
  const derivedDevotion = devSnap?.devotionScore ?? (vector.e > 0 ? Math.round(vector.e * 4) : null);

  const compositeClamped = Math.min(200, Math.max(0, vector.composite));
  const highlights: string[] = [];
  highlights.push(`Marque classifiée ${classification} — score composite ${compositeClamped.toFixed(0)}/200`);
  if (derivedCultIndex) {
    highlights.push(`Cult Index : ${derivedCultIndex.score.toFixed(1)} — Tier ${derivedCultIndex.tier}`);
  }
  if (strategy.superfanProfiles.length > 0) {
    highlights.push(`${strategy.superfanProfiles.length} superfans identifiés`);
  } else if (classification === "ICONE" || classification === "CULTE") {
    // Invariant APOGEE Loi 4 — un brand classifié ICONE/CULTE sans superfans
    // est une incohérence (cf. CLAUDE.md "ICONE = superfans en orbite stable").
    // On le signale explicitement plutôt que de saluer "fort potentiel".
    highlights.push(
      `⚠ Classification ${classification} sans superfans identifiés — recompute du cult-index ou enrichissement audience requis.`,
    );
  } else if (vector.e >= 15) {
    highlights.push("Fort potentiel de superfans à activer");
  }

  return {
    vector,
    classification,
    cultIndex: derivedCultIndex,
    devotionScore: derivedDevotion,
    superfanCount: strategy.superfanProfiles.length,
    brandName: strategy.name,
    topStrengths,
    topWeaknesses,
    highlights,
  };
}

// ─── 02: Contexte & Defi ────────────────────────────────────────────────────

export function mapContexteDefi(strategy: any): ContexteDefiSection {
  const bCtx = (strategy.businessContext as Record<string, unknown>) ?? {};
  const pillarA = getPillarContent(strategy, "a");
  const pillarD = getPillarContent(strategy, "d");

  const enemy = pillarA?.enemy as Record<string, unknown> | null;
  const prophecy = pillarA?.prophecy as Record<string, unknown> | null;

  // Personas RÉELLES uniquement (audit galileo). Le seed/onboarding stocke des
  // profils riches sous clés variées (`name`/`nom`, `age`/`trancheAge`,
  // `fears`/`barriers`, `hiddenDesire`/`insightCle`, `motivations` str|array).
  // On dévore toutes ces formes ; on n'invente PLUS de persona générique
  // (defaultPersonas "Le Client Exigeant") qui jetait la vraie donnée par-dessus.
  const personas = safeArr(pillarD?.personas)
    .map((p: unknown) => {
      const px = p as Record<string, unknown>;
      return {
        nom: pickStr(px, ["nom", "name", "titre", "label"]),
        trancheAge: pickStr(px, ["trancheAge", "age", "tranche", "ageRange"]),
        csp: pickStr(px, ["csp", "profession", "metier", "occupation", "income"]),
        insightCle: pickStr(px, ["insightCle", "insight", "hiddenDesire", "whatTheyActuallyBuy"]),
        freinsAchat: pickArr(px, ["freinsAchat", "freins", "barriers", "fears", "objections"]),
        motivations: pickArr(px, ["motivations", "motivation", "jobsToBeDone", "drivers"]),
      };
    })
    .filter((p) => p.nom || p.insightCle || p.motivations.length > 0);

  // ADR-0037 PR-K3 — surface des fields canon manuel narratifs A/D/V dans Oracle.
  const originMyth = pillarA?.originMyth as Record<string, unknown> | null;
  const sacrificeRequisRaw = (getPillarContent(strategy, "v") as Record<string, unknown> | null)?.sacrificeRequis as Record<string, unknown> | null;
  const canonNarrativeFields = {
    missionStatement: safeStr(pillarA?.missionStatement),
    originMythElevator: safeStr(originMyth?.elevator),
    positionnementEmotionnel: safeStr(pillarD?.positionnementEmotionnel),
    sacrificeRequis: sacrificeRequisRaw
      ? {
          prix: safeStr(sacrificeRequisRaw.prix),
          temps: safeStr(sacrificeRequisRaw.temps),
          effort: safeStr(sacrificeRequisRaw.effort),
          justification: safeStr(sacrificeRequisRaw.justification),
        }
      : null,
  };

  return {
    businessContext: {
      sector: safeStr(bCtx.sector),
      businessModel: safeStr(bCtx.businessModel),
      positioningArchetype: safeStr(bCtx.positioningArchetype),
      economicModels: safeArr(bCtx.economicModels) as string[],
      salesChannels: safeArr(bCtx.salesChannels) as string[],
    },
    enemy: enemy
      ? {
          name: safeStr(enemy.name) ?? "",
          manifesto: safeStr(enemy.manifesto) ?? "",
          narrative: safeStr(enemy.narrative) ?? "",
        }
      : null,
    prophecy: prophecy
      ? {
          worldTransformed: safeStr(prophecy.worldTransformed) ?? "",
          urgency: safeStr(prophecy.urgency) ?? "",
          horizon: safeStr(prophecy.horizon) ?? "",
        }
      : null,
    client: strategy.client
      ? {
          sector: strategy.client.sector,
          country: strategy.client.country,
          contactName: strategy.client.contactName,
        }
      : null,
    personas,
    canonNarrativeFields,
  };
}

// ─── 03: Audit & Diagnostic ─────────────────────────────────────────────────

export function mapAuditDiagnostic(strategy: any): AuditDiagnosticSection {
  const pillarD = getPillarContent(strategy, "d");
  const rawComp = safeArr(pillarD?.paysageConcurrentiel);

  const competitors = rawComp.map((c: unknown) => {
    const cx = c as Record<string, unknown>;
    return {
      nom: safeStr(cx.nom) ?? "",
      positionnement: safeStr(cx.positionnement) ?? "",
      forces: safeArr(cx.avantagesCompetitifs) as string[],
      faiblesses: safeArr(cx.faiblesses) as string[],
      partDeMarche: safeStr(cx.partDeMarcheEstimee),
    };
  });

  const da = pillarD?.directionArtistique as Record<string, unknown> | null;
  const semio = da?.semioticAnalysis as Record<string, unknown> | null;

  return {
    competitors,
    semioticAnalysis: semio
      ? {
          dominantSigns: safeArr(semio.dominantSigns) as string[],
          archetypeVisual: safeStr(semio.archetypeVisual) ?? "",
          recommendations: safeArr(semio.recommendations) as string[],
        }
      : null,
    gloryOutput: getGloryOutput(strategy, "semiotic-brand-analyzer"),
    diagnosticSummary: null,
  };
}

// ─── 04: Plateforme Strategique ──────────────────────────────────────────────

export function mapPlateformeStrategique(strategy: any): PlateformeStrategiqueSection {
  const pillarA = getPillarContent(strategy, "a");
  const pillarD = getPillarContent(strategy, "d");

  const ikigai = pillarA?.ikigai as Record<string, unknown> | null;
  const tonDeVoix = pillarD?.tonDeVoix as Record<string, unknown> | null;
  const assets = pillarD?.assetsLinguistiques as Record<string, unknown> | null;
  // Valeurs RÉELLES (audit galileo) — clés variées : `valeur`/`value`/`customName`,
  // `rang`/`rank`. On ne fabrique PLUS de valeurs Schwartz génériques
  // (defaultValeurs) qui écrasaient les vraies valeurs de marque.
  const valeurs = safeArr(pillarA?.valeurs)
    .map((v: unknown, i: number) => {
      const vx = v as Record<string, unknown>;
      return {
        valeur: pickStr(vx, ["customName", "valeur", "value", "nom", "name"]),
        rang: (typeof vx.rang === "number" ? vx.rang : typeof vx.rank === "number" ? vx.rank : i + 1) as number,
        justification: pickStr(vx, ["justification", "rationale", "why", "description"]),
      };
    })
    .filter((v) => v.valeur)
    .sort((a, b) => a.rang - b.rang);

  // Messaging framework dérivé des personas RÉELLES (multi-clés). Vide si pas
  // de personas — aucune audience/CTA inventée.
  const messagingFramework = safeArr(pillarD?.personas)
    .slice(0, 3)
    .map((p: unknown) => {
      const px = p as Record<string, unknown>;
      return {
        audience: pickStr(px, ["nom", "name", "titre"]),
        messagePrincipal: pickStr(px, ["insightCle", "insight", "hiddenDesire", "whatTheyActuallyBuy"]),
        messagesSupport: pickArr(px, ["motivations", "jobsToBeDone", "drivers"]),
        callToAction: pickStr(px, ["callToAction", "cta"]),
      };
    })
    .filter((m) => m.messagePrincipal || m.messagesSupport.length > 0);

  return {
    archetype: safeStr(pillarA?.archetype),
    citationFondatrice: safeStr(pillarA?.citationFondatrice),
    doctrine: safeStr(pillarA?.doctrine),
    ikigai: ikigai
      ? {
          love: safeStr(ikigai.love) ?? "",
          competence: safeStr(ikigai.competence) ?? "",
          worldNeed: safeStr(ikigai.worldNeed) ?? "",
          remuneration: safeStr(ikigai.remuneration) ?? "",
        }
      : null,
    valeurs,
    positionnement: safeStr(pillarD?.positionnement),
    promesseMaitre: safeStr(pillarD?.promesseMaitre),
    // Forme duale (union ADR-0168) : chaîne nue OU {promesse, preuve}. On coerce en
    // chaîne lisible (sinon `.join(" | ")` produisait « [object Object] » dans l'Oracle).
    sousPromesses: safeArr(pillarD?.sousPromesses).map((s) =>
      typeof s === "string" ? s : ((s as { promesse?: unknown })?.promesse != null ? String((s as { promesse: unknown }).promesse) : ""),
    ).filter(Boolean) as string[],
    tonDeVoix: tonDeVoix
      ? {
          personnalite: safeArr(tonDeVoix.personnalite) as string[],
          onDit: safeArr(tonDeVoix.onDit) as string[],
          onNeDitPas: safeArr(tonDeVoix.onNeDitPas) as string[],
        }
      : null,
    assetsLinguistiques: assets
      ? {
          slogan: safeStr(assets.slogan),
          tagline: safeStr(assets.tagline),
          motto: safeStr(assets.motto),
          mantras: safeArr(assets.mantras) as string[],
        }
      : null,
    messagingFramework,
  };
}

// ─── 05: Territoire Creatif ─────────────────────────────────────────────────

export function mapTerritoireCreatif(strategy: any): TerritoireCreatifSection {
  const pillarD = getPillarContent(strategy, "d");
  const da = pillarD?.directionArtistique as Record<string, unknown> | null;

  return {
    conceptGenerator: getGloryOutput(strategy, "concept-generator"),
    moodboard: da?.moodboard as Record<string, unknown> | null ?? getGloryOutput(strategy, "visual-moodboard-generator"),
    chromaticStrategy: da?.chromaticStrategy as Record<string, unknown> | null ?? getGloryOutput(strategy, "chromatic-strategy-builder"),
    directionArtistique: da ?? null,
    kvPrompts: getGloryOutput(strategy, "kv-banana-prompt-generator"),
    typographySystem: da?.typographySystem as Record<string, unknown> | null ?? getGloryOutput(strategy, "typography-system-architect"),
    logoAdvice: getGloryOutput(strategy, "logo-type-advisor"),
  };
}

// ─── 06: Plan d'Activation ──────────────────────────────────────────────────

export function mapPlanActivation(strategy: any): PlanActivationSection {
  const pillarE = getPillarContent(strategy, "e");

  const campaigns = strategy.campaigns.map((c: any) => ({
    name: c.name,
    status: c.status,
    budget: c.budget,
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    aarrTargets: c.aarrTargets as Record<string, unknown> | null,
    actions: c.actions.map((a: any) => ({
      name: a.name,
      category: a.category,
      actionType: a.actionType,
      driverName: null as string | null,
      budget: a.budget,
      aarrStage: a.aarrStage,
    })),
  }));

  // Touchpoints RÉELS (audit galileo). Le seed stocke parfois sans `nom`
  // (UPgraders : {canal, type, stadeAarrr}) → on dérive nom←canal au lieu
  // d'inventer "Site web / Landing page". channelTouchpointMap est une source
  // alternative quand `touchpoints` est absent. Aucun touchpoint fabriqué.
  const rawTp = safeArr(pillarE?.touchpoints);
  const tpSource = rawTp.length > 0 ? rawTp : safeArr((pillarE as any)?.channelTouchpointMap);
  const touchpoints = tpSource.map((t: unknown) => {
    const tx = t as Record<string, unknown>;
    const canal = pickStr(tx, ["canal", "channel"]);
    return {
      nom: pickStr(tx, ["nom", "name", "titre"]) || canal,
      canal,
      type: pickStr(tx, ["type", "format"]) || canal,
      stadeAarrr: pickStr(tx, ["stadeAarrr", "aarrStage", "stade"]),
      niveauDevotion: pickStr(tx, ["niveauDevotion", "devotionLevel"]),
    };
  }).filter((t) => t.nom || t.canal);

  const rituels = safeArr(pillarE?.rituels).map((r: unknown) => {
    const rx = r as Record<string, unknown>;
    return {
      nom: pickStr(rx, ["nom", "name", "titre"]),
      frequence: pickStr(rx, ["frequence", "frequency", "cadence"]),
      description: pickStr(rx, ["description", "desc", "detail"]),
    };
  }).filter((r) => r.nom);

  const drivers = arr(strategy.drivers).map((d: any) => ({
    name: d.name, channel: d.channel, channelType: d.channelType, status: d.status,
  }));

  // AARRR réel (E.aarrr) — sinon objet vide (pas de funnel inventé à zéros).
  const aarrr = (pillarE?.aarrr as Record<string, unknown> | null) ?? {};

  return { campaigns, aarrr, touchpoints, rituels, drivers };
}

// ─── 07: Production & Livrables ─────────────────────────────────────────────

export function mapProductionLivrables(strategy: any): ProductionLivrablesSection {
  const missions = strategy.missions.map((m: any) => ({
    title: m.title,
    status: m.status,
    mode: m.mode ?? "DISPATCH",
    priority: m.priority?.toString() ?? null,
    budget: m.budget,
    driverName: m.driver?.name ?? "Non assigne",
    deliverables: m.deliverables.map((d: any) => ({
      label: d.title,
      format: null as string | null,
      status: d.status,
    })),
  }));

  // Group glory outputs by layer using slug prefix heuristic + known registry
  const LAYER_SLUGS: Record<string, string> = {};
  const crSlugs = ["concept-generator", "script-writer", "long-copy-craftsman", "dialogue-writer", "claim-baseline-factory", "naming-engine", "manifesto-forge", "social-copy-engine", "hashtag-strategist", "brief-creatif-interne"];
  const dcSlugs = ["campaign-architecture-planner", "creative-evaluation-matrix", "idea-killer-saver", "client-presentation-strategist", "creative-territory-mapper", "award-case-builder", "trend-to-concept-bridge", "cultural-pulse-scanner", "kv-banana-prompt-generator"];
  const hybridSlugs = ["campaign-360-simulator", "content-calendar-strategist", "brand-guardian-system", "touchpoint-optimizer", "crisis-response-generator", "partnership-matchmaker", "experiential-designer", "data-storyteller", "growth-hack-lab", "localization-adapter", "digital-planner"];
  const brandSlugs = ["semiotic-brand-analyzer", "visual-landscape-mapper", "visual-moodboard-generator", "chromatic-strategy-builder", "typography-system-architect", "logo-type-advisor", "logo-validation-protocol", "design-token-architect", "motion-identity-designer", "brand-guidelines-generator"];

  crSlugs.forEach((s) => (LAYER_SLUGS[s] = "CR"));
  dcSlugs.forEach((s) => (LAYER_SLUGS[s] = "DC"));
  hybridSlugs.forEach((s) => (LAYER_SLUGS[s] = "HYBRID"));
  brandSlugs.forEach((s) => (LAYER_SLUGS[s] = "BRAND"));

  const gloryOutputsByLayer: Record<string, Array<{ toolSlug: string; toolName: string; createdAt: string }>> = {
    CR: [],
    DC: [],
    HYBRID: [],
    BRAND: [],
  };

  for (const g of strategy.gloryOutputs) {
    const layer = LAYER_SLUGS[g.toolSlug] ?? "HYBRID";
    gloryOutputsByLayer[layer]!.push({
      toolSlug: g.toolSlug,
      toolName: g.toolSlug.replace(/-/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase()),
      createdAt: g.createdAt.toISOString(),
    });
  }

  // Livrables RÉELS uniquement (audit galileo) : les vrais Glory outputs + les
  // missions/deliverables réels (ci-dessus). On ne fabrique PLUS un pipeline
  // fictif (defaultGloryOutputsByLayer "manifesto-forge" qui faisait croire que
  // des outils avaient tourné). Si rien n'a été produit, les couches restent
  // vides — état honnête.
  return { missions, gloryOutputsByLayer };
}

// ─── 08: Medias & Distribution ──────────────────────────────────────────────

export function mapMediasDistribution(strategy: any): MediasDistributionSection {
  const iContent = getPillarContent(strategy, "i") as any;

  // Drivers RÉELS (relationnel). Sinon dérivés des canaux réellement déclarés
  // dans le calendrier média I (annualCalendar[].drivers / mediaPlan) — jamais
  // de drivers fabriqués (defaultMediaDrivers "Instagram/LinkedIn").
  let drivers = arr(strategy.drivers).map((d: any) => ({
    name: d.name, channel: d.channel, channelType: d.channelType, status: d.status,
  }));
  if (drivers.length === 0) {
    const declaredChannels = [
      ...new Set(arr(iContent?.annualCalendar).flatMap((e: any) => arr(e.drivers).map(str)).filter(Boolean)),
    ];
    drivers = declaredChannels.map((ch) => ({ name: str(ch), channel: str(ch), channelType: "OWNED", status: "PLANNED" }));
  }

  // Actions média RÉELLES : campagnes (ATL/MEDIA/DIGITAL) → catalogue I
  // (canaux média) → calendrier annuel I (name/budget/drivers). Aucune action
  // inventée (defaultMediaActions supprimé).
  let mediaActions = strategy.campaigns.flatMap((c: any) =>
    c.actions
      .filter((a: any) => a.category === "ATL" || a.category === "MEDIA" || a.category === "DIGITAL")
      .map((a: any) => ({ name: a.name, category: a.category, budget: a.budget, driverName: null as string | null })),
  );
  if (mediaActions.length === 0) {
    const catalogue = (iContent?.catalogueParCanal ?? {}) as Record<string, any[]>;
    const MEDIA_CHANNELS = ["DIGITAL", "MEDIA_TRADITIONNEL", "MEDIA", "PR_INFLUENCE", "ATL"];
    mediaActions = MEDIA_CHANNELS.flatMap((canal) =>
      arr(catalogue[canal]).slice(0, 4).map((a: any) => ({
        name: str(a.action ?? a.name), category: canal, budget: null as number | null, driverName: null as string | null,
      })),
    ).filter((a: any) => a.name).slice(0, 10);
  }
  if (mediaActions.length === 0) {
    mediaActions = arr(iContent?.annualCalendar).map((e: any) => ({
      name: str(e.name ?? e.objective), category: arr(e.drivers).map(str)[0] ?? "MEDIA",
      budget: typeof e.budget === "number" ? e.budget : null, driverName: arr(e.drivers).map(str).join(", ") || null,
    })).filter((a: any) => a.name).slice(0, 10);
  }

  return {
    drivers,
    digitalPlannerOutput: getGloryOutput(strategy, "digital-planner"),
    mediaActions,
  };
}

// ─── 09: KPIs & Mesure ──────────────────────────────────────────────────────

export function mapKpisMesure(strategy: any): KpisMesureSection {
  const pillarE = getPillarContent(strategy, "e");
  const pillarS = getPillarContent(strategy, "s") as any;

  // KPIs RÉELS : E.kpis → tableau de bord S (kpiDashboard / northStarKPI) →
  // vide. On ne fabrique PLUS 12 KPIs génériques (defaultKpis "Notoriete
  // assistee…") qui n'ont aucun lien avec la marque.
  let kpis = safeArr(pillarE?.kpis).map((k: unknown) => {
    const kx = k as Record<string, unknown>;
    return {
      name: pickStr(kx, ["name", "nom", "kpi", "metric"]),
      metricType: pickStr(kx, ["metricType", "type", "unit"]),
      target: pickStr(kx, ["target", "cible", "objectif", "goal"]),
      frequency: pickStr(kx, ["frequency", "frequence", "cadence"]),
    };
  }).filter((k) => k.name);
  if (kpis.length === 0) {
    const dash = arr(pillarS?.kpiDashboard).length > 0 ? arr(pillarS?.kpiDashboard) : arr(pillarS?.northStarKPI);
    kpis = dash.map((k: any) => ({
      name: pickStr(k, ["name", "nom", "kpi", "metric", "label"]),
      metricType: pickStr(k, ["metricType", "type", "unit"]),
      target: pickStr(k, ["target", "cible", "objectif", "goal", "value"]),
      frequency: pickStr(k, ["frequency", "frequence", "cadence"]),
    })).filter((k: any) => k.name);
  }

  // Défensif : si l'appelant charge la strategy avec un include partiel, on
  // dégrade en « pas de mesure » au lieu de crasher (bug prod §16, 2026-07-16).
  const devSnap = (strategy.devotionSnapshots ?? [])[0] ?? null;
  const cultSnap = (strategy.cultIndexSnapshots ?? [])[0] ?? null;

  const superfans = (strategy.superfanProfiles ?? []).map((sf: any) => ({
    platform: sf.platform,
    handle: sf.handle,
    engagementDepth: sf.engagementDepth,
    segment: sf.segment,
  }));

  const communitySnapshots = (strategy.communitySnapshots ?? []).map((cs: any) => ({
    platform: cs.platform,
    size: cs.size,
    engagement: cs.health,
    growth: cs.velocity,
  }));

  // Devotion : distribution MESURÉE (DevotionSnapshot) uniquement. Pas de
  // distribution inventée (l'ancien fallback 40/25/15/10/7/3 fabriquait une
  // pyramide depuis vector.e — un chiffre halluciné, audit galileo).
  const devotion = devSnap
    ? {
        spectateur: devSnap.spectateur,
        interesse: devSnap.interesse,
        participant: devSnap.participant,
        engage: devSnap.engage,
        ambassadeur: devSnap.ambassadeur,
        evangeliste: devSnap.evangeliste,
        devotionScore: devSnap.devotionScore,
      }
    : null;

  // Cult index — ADR-0046 (no magic fallback). Si pas de snapshot SESHAT, on
  // retourne null (état honnête « pas mesuré ») au lieu d'inventer un score.
  // Avec snapshot : le tier est un CultIndexTier résolu (stocké si valide,
  // sinon dérivé du score) — cohérent avec §01/§15/§31 (audit galileo).
  const cultIndex = cultSnap
    ? {
        compositeScore: cultSnap.compositeScore,
        tier: resolveCultIndexTier(cultSnap.tier, cultSnap.compositeScore),
        engagementVelocity: cultSnap.engagementDepth,
        communityHealth: cultSnap.communityCohesion,
        superfanVelocity: cultSnap.superfanVelocity,
      }
    : null;

  return {
    kpis,
    devotion,
    cultIndex,
    superfans,
    communitySnapshots,
    aarrr: (pillarE?.aarrr as Record<string, unknown> | null) ?? {},
  };
}

// ─── 10: Budget ─────────────────────────────────────────────────────────────

export function mapBudget(strategy: any): BudgetSection {
  const pillarV = getPillarContent(strategy, "v");
  const pillarS = getPillarContent(strategy, "s");
  const pillarI = getPillarContent(strategy, "i");
  const ue = pillarV?.unitEconomics as Record<string, unknown> | null;

  const campaignBudgets = strategy.campaigns.map((c: any) => ({
    name: c.name,
    budget: c.budget,
    status: c.status,
  }));

  const totalBudget = campaignBudgets.reduce((sum: number, c: any) => sum + (c.budget ?? 0), 0);

  // Enveloppe globale + ventilation : pilier S canonique → pilier I (certaines
  // marques y stockent globalBudget/budgetBreakdown, ex. CIMENCAM). Audit
  // galileo : brancher la vraie source quel que soit le pilier de stockage.
  const rawGlobalBudget = pillarS?.globalBudget ?? pillarI?.globalBudget;
  const globalBudget = typeof rawGlobalBudget === "number" && Number.isFinite(rawGlobalBudget)
    ? rawGlobalBudget
    : null;
  const rawBreakdown = (pillarS?.budgetBreakdown ?? pillarI?.budgetBreakdown) as Record<string, unknown> | null | undefined;
  const budgetBreakdown = rawBreakdown && typeof rawBreakdown === "object" && Object.keys(rawBreakdown).length > 0
    ? {
        production: safeNum(rawBreakdown.production) ?? undefined,
        media: safeNum(rawBreakdown.media) ?? undefined,
        talent: safeNum(rawBreakdown.talent) ?? undefined,
        logistics: safeNum(rawBreakdown.logistics) ?? undefined,
        technology: safeNum(rawBreakdown.technology) ?? undefined,
        contingency: safeNum(rawBreakdown.contingency) ?? undefined,
        agencyFees: safeNum(rawBreakdown.agencyFees) ?? undefined,
      }
    : null;

  return {
    unitEconomics: ue
      ? {
          cac: safeNum(ue.cac),
          ltv: safeNum(ue.ltv),
          ltvCacRatio: safeNum(ue.ltvCacRatio),
          margeNette: safeNum(ue.margeNette),
          roiEstime: safeNum(ue.roiEstime),
          budgetCom: safeNum(ue.budgetCom),
          caVise: safeNum(ue.caVise),
        }
      : null,
    campaignBudgets,
    totalBudget,
    globalBudget,
    budgetBreakdown,
  };
}

// ─── 11: Timeline & Gouvernance ─────────────────────────────────────────────

export function mapTimelineGouvernance(strategy: any): TimelineGouvernanceSection {
  const campaigns = strategy.campaigns.map((c: any) => ({
    name: c.name,
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    status: c.status,
    milestones: c.milestones.map((m: any) => ({
      title: m.title,
      dueDate: m.dueDate?.toISOString() ?? null,
      status: m.status,
    })),
  }));

  const missions = strategy.missions.slice(0, 20).map((m: any) => ({
    title: m.title,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    deadline: m.slaDeadline?.toISOString() ?? null,
  }));

  const teamMembers = strategy.campaigns.flatMap((c: any) =>
    c.teamMembers.map((tm: any) => ({
      name: tm.user.name ?? "Inconnu",
      role: tm.role,
      email: tm.user.email,
    }))
  );

  // Deduplicate team members by email
  const seen = new Set<string>();
  const uniqueTeam = teamMembers.filter((tm: any) => {
    const key = tm.email ?? tm.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // ── Timeline réelle : sans campagne lancée, la roadmap S OU le calendrier
  // annuel I OU le sprint 90 jours I EST la timeline — jamais un "Plan
  // directeur" + jalons génériques inventés (audit galileo).
  const sContent = getPillarContent(strategy, "s") as any;
  const iContent = getPillarContent(strategy, "i") as any;
  const hasAnyMilestones = campaigns.some((c: any) => c.milestones.length > 0);
  let finalCampaigns = campaigns;

  if (!hasAnyMilestones) {
    const roadmapPhases = arr(sContent?.roadmap);
    const overtonMilestones = arr(sContent?.overtonMilestones);
    const annualCalendar = arr(iContent?.annualCalendar);
    const sprint = arr(iContent?.sprint90Days);

    let derivedCampaigns: any[] = [];
    if (roadmapPhases.length > 0) {
      derivedCampaigns = roadmapPhases.map((r: any, i: number) => ({
        name: str(r.phase) || `Phase ${i + 1}`,
        startDate: null as string | null,
        endDate: null as string | null,
        status: i === 0 ? "ACTIVE" : "PLANNED",
        milestones: [
          ...(str(r.objectifDevotion) ? [{ title: `Devotion : ${str(r.objectifDevotion)}`, dueDate: null as string | null, status: "PENDING" }] : []),
          ...(str(overtonMilestones[i]?.targetPerception) ? [{ title: `Overton : ${str(overtonMilestones[i].targetPerception)}`, dueDate: null as string | null, status: "PENDING" }] : []),
          ...arr(r.actions).slice(0, 3).map((a: any) => ({ title: str(typeof a === "string" ? a : a.action ?? a.name), dueDate: null as string | null, status: "PENDING" })),
        ].filter((m: any) => m.title),
      }));
    } else if (annualCalendar.length > 0) {
      // Le calendrier annuel I (par trimestre) comme timeline réelle.
      derivedCampaigns = annualCalendar.map((e: any, i: number) => ({
        name: str(e.name ?? e.objective) || `Q${str(e.quarter)}`,
        startDate: null as string | null, endDate: null as string | null,
        status: i === 0 ? "ACTIVE" : "PLANNED",
        milestones: [] as Array<{ title: string; dueDate: string | null; status: string }>,
      }));
      // Sprint 90 jours comme jalons de la 1re phase.
      if (derivedCampaigns[0] && sprint.length > 0) {
        derivedCampaigns[0].milestones = sprint.map((a: any) => ({ title: str(a.action), dueDate: null as string | null, status: "PENDING" })).filter((m: any) => m.title);
      }
    } else if (sprint.length > 0) {
      derivedCampaigns = [{
        name: "Sprint 90 jours", startDate: null as string | null, endDate: null as string | null, status: "ACTIVE",
        milestones: sprint.map((a: any) => ({ title: str(a.action), dueDate: null as string | null, status: "PENDING" })).filter((m: any) => m.title),
      }];
    }
    finalCampaigns = finalCampaigns.length > 0 ? finalCampaigns.concat(derivedCampaigns) : derivedCampaigns;
  }

  // ── Gouvernance : équipe campagnes → teamStructure déclarée (I/S) →
  // propriétaire seul. Plus d'équipe fictive (defaultTeamMembers).
  const owner = { name: strategy.user.name, email: strategy.user.email };
  const declaredTeam = [...arr(iContent?.teamStructure), ...arr(sContent?.teamStructure)].map((t: any) => ({
    name: pickStr(t, ["name", "nom"]), role: pickStr(t, ["title", "role", "responsibility", "responsabilite"]), email: null as string | null,
  })).filter((t: any) => t.name);
  const finalTeam = uniqueTeam.length > 0
    ? uniqueTeam
    : declaredTeam.length > 0
      ? declaredTeam
      : (owner.name || owner.email)
        ? [{ name: owner.name ?? "Propriétaire", role: "Strategy Owner", email: owner.email ?? null }]
        : [];

  return { campaigns: finalCampaigns, missions, teamMembers: finalTeam };
}

// ─── 12: Equipe ─────────────────────────────────────────────────────────────

export function mapEquipe(strategy: any): EquipeSection {
  const owner = { name: strategy.user.name, email: strategy.user.email, image: strategy.user.image };

  const teamMembers = strategy.campaigns.flatMap((c: any) =>
    c.teamMembers.map((tm: any) => ({
      name: tm.user.name ?? "Inconnu",
      role: tm.role,
      email: tm.user.email,
      image: tm.user.image,
    }))
  );

  const seen = new Set<string>();
  const uniqueTeam = teamMembers.filter((tm: any) => {
    const key = tm.email ?? tm.name;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Équipe RÉELLE (audit galileo) : membres des campagnes → équipe déclarée de
  // la stratégie (I/S.teamStructure {name,title,responsibility}) → propriétaire
  // seul. Plus de "Directeur de creation"/"Chef de projet" fictifs.
  const iContent = getPillarContent(strategy, "i") as any;
  const sContentEq = getPillarContent(strategy, "s") as any;
  const declaredTeamEq = [...arr(iContent?.teamStructure), ...arr(sContentEq?.teamStructure)].map((t: any) => ({
    name: pickStr(t, ["name", "nom"]), role: pickStr(t, ["title", "role", "responsibility", "responsabilite"]),
    email: null as string | null, image: null as string | null,
  })).filter((t: any) => t.name);
  const finalTeam = uniqueTeam.length > 0
    ? uniqueTeam
    : declaredTeamEq.length > 0
      ? declaredTeamEq
      : (owner.name || owner.email)
        ? [{ name: owner.name ?? "Propriétaire", role: "Strategy Owner", email: owner.email ?? null, image: owner.image ?? null }]
        : [];

  // Opérateur RÉEL (relationnel) — null si absent (plus de "LaFusee" fabriqué).
  const operator = strategy.operator
    ? { name: strategy.operator.name, slug: strategy.operator.slug }
    : null;

  // Équipe dirigeante : Pilier A → sinon teamStructure I/S (mêmes profils réels).
  const aContent = getPillarContent(strategy, "a") as any;
  const rawEquipe = arr(aContent?.equipeDirigeante).length > 0
    ? arr(aContent?.equipeDirigeante)
    : [...arr(iContent?.teamStructure), ...arr(sContentEq?.teamStructure)];
  const equipeDirigeante = rawEquipe.map((m: any) => ({
    nom: pickStr(m, ["nom", "name"]),
    role: pickStr(m, ["role", "title", "poste"]),
    bio: pickStr(m, ["bio", "description", "responsibility", "responsabilite"]),
    experiencePasse: pickArr(m, ["experiencePasse", "experience"]),
    competencesCles: pickArr(m, ["competencesCles", "skills", "competences"]),
    credentials: pickArr(m, ["credentials", "certifications"]),
  })).filter((m: any) => m.nom);

  const equipeComplementarite = aContent?.equipeComplementarite ? {
    scoreGlobal: aContent.equipeComplementarite.scoreGlobal ?? 0,
    couvertureTechnique: !!aContent.equipeComplementarite.couvertureTechnique,
    couvertureCommerciale: !!aContent.equipeComplementarite.couvertureCommerciale,
    couvertureOperationnelle: !!aContent.equipeComplementarite.couvertureOperationnelle,
    capaciteExecution: str(aContent.equipeComplementarite.capaciteExecution ?? "inconnue"),
    lacunes: arr(aContent.equipeComplementarite.lacunes).map(str),
    verdict: str(aContent.equipeComplementarite.verdict ?? ""),
  } : null;

  // ── Berkus aggregate — pull scores from framework results ─────────────
  const berkusFrameworks = arr(strategy.frameworkResults ?? []);
  const berkusTeam = berkusFrameworks.find((f: any) => f.framework?.slug === "fw-25-berkus-team-assessment");
  const berkusTraction = berkusFrameworks.find((f: any) => f.framework?.slug === "fw-26-berkus-traction");
  const berkusProduct = berkusFrameworks.find((f: any) => f.framework?.slug === "fw-27-berkus-product");
  const berkusIp = berkusFrameworks.find((f: any) => f.framework?.slug === "fw-28-berkus-ip");

  const bTeam = berkusTeam?.score ?? null;
  const bTraction = berkusTraction?.score ?? null;
  const bProduct = berkusProduct?.score ?? null;
  const bIp = berkusIp?.score ?? null;
  const hasAny = bTeam !== null || bTraction !== null || bProduct !== null || bIp !== null;

  const berkus = hasAny ? {
    teamScore: bTeam,
    tractionScore: bTraction,
    productScore: bProduct,
    ipScore: bIp,
    totalScore: (bTeam ?? 0) + (bTraction ?? 0) + (bProduct ?? 0) + (bIp ?? 0),
  } : null;

  return {
    operator,
    owner: { name: strategy.user.name, email: strategy.user.email },
    teamMembers: finalTeam,
    equipeDirigeante,
    equipeComplementarite,
    berkus,
  };
}

// ─── 13: Conditions & Prochaines Etapes ─────────────────────────────────────

export function mapConditionsEtapes(strategy: any): ConditionsEtapesSection {
  // Generate client context from strategy owner when no client record
  const client = strategy.client
    ? {
        contactName: strategy.client.contactName,
        contactEmail: strategy.client.contactEmail,
        sector: strategy.client.sector,
      }
    : {
        contactName: strategy.user.name ?? strategy.name ?? null,
        contactEmail: strategy.user.email ?? null,
        sector: str((strategy.businessContext as any)?.sector) || null,
      };

  // ── Contrats : RÉELS uniquement. L'ancien fallback `defaultContracts`
  // fabriquait un contrat "ACTIVE" fictif affiché au client — supprimé
  // (audit NEFER 2026-06-11 : un livrable client ne montre jamais un
  // engagement contractuel inventé). Liste vide = honnête.
  const contracts = strategy.contracts.map((c: any) => ({
    title: c.title,
    contractType: c.contractType,
    status: c.status,
    value: c.value,
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    signedAt: c.signedAt?.toISOString() ?? null,
  }));

  // ── Prochaines étapes : sprint 90 jours réel — sous S OU sous I selon la
  // marque (CIMENCAM le stocke sous I). Fallback : recommandations prioritaires
  // S. Audit galileo : brancher la vraie source quel que soit le pilier.
  const sContent = getPillarContent(strategy, "s") as any;
  const iContent = getPillarContent(strategy, "i") as any;
  const sprintSource = arr(sContent?.sprint90Days).length > 0 ? arr(sContent?.sprint90Days) : arr(iContent?.sprint90Days);
  let prochainesEtapes = sprintSource
    .slice()
    .sort((a: any, b: any) => (a.priority ?? 99) - (b.priority ?? 99))
    .slice(0, 6)
    .map((a: any) => ({
      action: str(a.action),
      owner: str(a.owner ?? ""),
      kpi: str(a.kpi ?? ""),
      devotionImpact: str(a.devotionImpact ?? ""),
    }))
    .filter((a: any) => a.action);
  if (prochainesEtapes.length === 0) {
    prochainesEtapes = arr(sContent?.recommandationsPrioritaires)
      .slice()
      .sort((a: any, b: any) => (a.priority ?? 99) - (b.priority ?? 99))
      .slice(0, 6)
      .map((r: any) => ({ action: str(r.recommendation ?? r.reco ?? r.action), owner: str(r.source ?? ""), kpi: "", devotionImpact: "" }))
      .filter((a: any) => a.action);
  }

  return {
    client,
    contracts,
    prochainesEtapes,
    strategyStatus: strategy.status,
  };
}

// ─── Completeness Check ─────────────────────────────────────────────────────

export function checkSectionCompleteness(doc: StrategyPresentationDocument): CompletenessReport {
  const s = doc.sections;

  function check(hasData: boolean, hasRichData: boolean): SectionCompleteness {
    if (hasRichData) return "complete";
    if (hasData) return "partial";
    return "empty";
  }

  return {
    // Phase 1: ADVE
    "executive-summary": check(doc.meta.vector.composite > 0, doc.meta.vector.confidence > 0.5),
    "contexte-defi": check(!!s.contexteDefi.enemy || !!s.contexteDefi.client, s.contexteDefi.personas.length > 0),
    "plateforme-strategique": check(!!s.plateformeStrategique.archetype, !!s.plateformeStrategique.promesseMaitre && s.plateformeStrategique.valeurs.length > 0),
    "proposition-valeur": check(!!s.propositionValeur.pricing, s.propositionValeur.proofPoints.length > 0),
    "territoire-creatif": check(!!s.territoireCreatif.conceptGenerator, !!s.territoireCreatif.directionArtistique),
    "experience-engagement": check(s.experienceEngagement.touchpoints.length > 0, !!s.experienceEngagement.devotionPathway),
    // Phase 2: R+T
    "swot-interne": check(s.swotInterne.forces.length > 0, s.swotInterne.mitigations.length > 0),
    "swot-externe": check(s.swotExterne.concurrents.length > 0, !!s.swotExterne.brandMarketFit),
    "signaux-opportunites": check(s.signaux.signauxFaibles.length > 0, s.signaux.opportunitesPriseDeParole.length > 0),
    // Phase 3: I+S
    "catalogue-actions": check(s.catalogueActions.totalActions > 0, Object.keys(s.catalogueActions.parCanal).length > 0),
    "plan-activation": check(s.planActivation.campaigns.length > 0, s.planActivation.touchpoints.length > 0),
    "fenetre-overton": check(!!s.fenetreOverton.perceptionActuelle, s.fenetreOverton.roadmap.length > 0),
    "medias-distribution": check(s.mediasDistribution.drivers.length > 0, s.mediasDistribution.mediaActions.length > 0),
    "production-livrables": check(s.productionLivrables.missions.length > 0, Object.values(s.productionLivrables.gloryOutputsByLayer).some((arr: any) => arr.length > 0)),
    // Mesure & Superfan
    "profil-superfan": check(!!s.profilSuperfan.portrait, s.profilSuperfan.parcoursDevotionCible.length > 0),
    "kpis-mesure": check(s.kpisMesure.kpis.length > 0, !!s.kpisMesure.devotion && !!s.kpisMesure.cultIndex),
    "croissance-evolution": check(s.croissanceEvolution.bouclesCroissance.length > 0, s.croissanceEvolution.pipelineInnovation.length > 0),
    // Operationnel
    // Phase 18 (ADR-0043) — Budget découplé de Campaigns. `complete`
    // accepte aussi `pillarS.globalBudget > 0`. Permet aux marques BOOT
    // (sans Campaign lancée) de chiffrer une section budget complete.
    "budget": check(
      !!s.budget.unitEconomics || (typeof s.budget.globalBudget === "number" && s.budget.globalBudget > 0),
      s.budget.campaignBudgets.length > 0
        || (typeof s.budget.globalBudget === "number" && s.budget.globalBudget > 0),
    ),
    "timeline-gouvernance": check(s.timelineGouvernance.campaigns.length > 0, s.timelineGouvernance.teamMembers.length > 0),
    "equipe": check(!!s.equipe.operator || s.equipe.equipeDirigeante.length > 0, s.equipe.equipeDirigeante.length > 0 && !!s.equipe.equipeComplementarite),
    "conditions-etapes": check(!!s.conditionsEtapes.client, s.conditionsEtapes.contracts.length > 0),
  };
}

// ─── NEW SECTION MAPPERS (v3 Oracle enrichment) ─────────────────────────────

export function mapPropositionValeur(strategy: any): PropositionValeurSection {
  const vContent = getPillarContent(strategy, "v") as any;
  const eContent = getPillarContent(strategy, "e") as any;
  const iContent = getPillarContent(strategy, "i") as any;

  // Pricing RÉEL (audit galileo) : V.pricingJustification + échelle réelle
  // (productLadder, sinon produitsCatalogue). null si rien — plus de pricing
  // générique inventé ("Echelle de prix a definir…").
  const ladder = arr(vContent?.productLadder).length > 0 ? arr(vContent?.productLadder) : arr(vContent?.produitsCatalogue);
  const ladderDescription = ladder.length > 0
    ? ladder.map((t: any) => `${pickStr(t, ["tier", "nom", "name"])}${typeof t.prix === "number" ? ` (${t.prix.toLocaleString("fr-FR")} FCFA)` : ""} — ${pickStr(t, ["cible", "segmentCible", "description", "position"])}`.replace(/ — $/, "")).join(" · ")
    : "";
  const pricingStrategy = pickStr(vContent, ["pricingJustification", "pricingStrategy", "pricing"]);
  const pricing = (pricingStrategy || ladderDescription) ? {
    strategy: pricingStrategy || `Échelle structurée en ${ladder.length} paliers`,
    ladderDescription: ladderDescription || pickStr(vContent, ["pricingLadder"]),
    competitorComparison: pickStr(vContent, ["competitorPricing"]) || null,
  } : null;

  // Preuves RÉELLES : V.roiProofs (cas clients chiffrés) → valeur client
  // tangible. Vide si aucune preuve déclarée (plus de "Expertise reconnue…").
  const roiProofs = arr(vContent?.roiProofs).map((p: any) =>
    [str(p.client), str(p.beforeMetric) && str(p.afterMetric) ? `${str(p.beforeMetric)} → ${str(p.afterMetric)}` : str(p.lift), str(p.timeframe)]
      .filter(Boolean).join(" : "),
  ).filter(Boolean);
  const proofPoints = roiProofs.length > 0
    ? roiProofs
    : [
        ...arr(vContent?.valeurClientTangible).map(str),
        ...arr(vContent?.proofPoints ?? vContent?.preuves).map(str),
      ].filter(Boolean);

  // Garanties RÉELLES : promesse de valeur V + promesse d'expérience E. Vide
  // sinon (plus de "Engagement qualite sur chaque livrable" générique).
  const guarantees = [pickStr(vContent, ["promesseDeValeur"]), pickStr(eContent, ["promesseExperience"])]
    .concat(arr(vContent?.guarantees ?? vContent?.garanties).map(str))
    .filter(Boolean);

  // Pipeline innovation RÉEL : I.innovationsProduit → V.innovation. Vide sinon.
  let innovationPipeline = arr(iContent?.innovationsProduit)
    .map((p: any) => `${pickStr(p, ["name", "nom"])}${pickStr(p, ["horizon"]) ? ` (horizon ${pickStr(p, ["horizon"]).toLowerCase()})` : ""}`)
    .filter((s: string) => s.trim().length > 0);
  if (innovationPipeline.length === 0) {
    innovationPipeline = arr(vContent?.innovation ?? vContent?.innovationPipeline).map(str).filter(Boolean);
  }

  return {
    pricing,
    proofPoints,
    guarantees,
    innovationPipeline,
    unitEconomics: vContent?.unitEconomics ? {
      cac: vContent.unitEconomics.cac ?? null,
      ltv: vContent.unitEconomics.ltv ?? null,
      ltvCacRatio: vContent.unitEconomics.ltvCacRatio ?? null,
    } : null,
  };
}

export function mapExperienceEngagement(strategy: any): ExperienceEngagementSection {
  const eContent = getPillarContent(strategy, "e") as any;

  // Touchpoints RÉELS (audit galileo) : nom←canal si nom absent (cas UPgraders),
  // channelTouchpointMap en source alternative. Plus de touchpoints inventés.
  const rawTp = arr(eContent?.touchpoints);
  const tpSource = rawTp.length > 0 ? rawTp : arr(eContent?.channelTouchpointMap);
  const touchpoints = tpSource.map((t: any) => {
    const canal = pickStr(t, ["canal", "channel"]);
    return {
      nom: pickStr(t, ["nom", "name", "titre"]) || canal,
      canal,
      qualite: pickStr(t, ["qualite", "quality"]) || "standard",
      stadeAarrr: pickStr(t, ["stadeAarrr", "aarrStage", "stade"]),
    };
  }).filter((t: any) => t.nom || t.canal);

  const rituels = arr(eContent?.rituels ?? eContent?.rituals).map((r: any) => ({
    nom: pickStr(r, ["nom", "name", "titre"]), frequence: pickStr(r, ["frequence", "frequency", "cadence"]),
    description: pickStr(r, ["description", "desc"]), adoptionScore: typeof r.adoptionScore === "number" ? r.adoptionScore : null,
  })).filter((r: any) => r.nom);

  // Devotion pathway : distribution MESURÉE (snapshot) uniquement + triggers/
  // barrières RÉELS du pilier E. Plus de distribution 40/25/15… ni de
  // triggers/barriers génériques inventés. null si aucune donnée réelle.
  const devSnap = strategy.devotionSnapshots?.[0];
  const realTriggers = arr(eContent?.conversionTriggers).map((t: any) => ({
    from: pickStr(t, ["fromLevel", "from"]), to: pickStr(t, ["toLevel", "to"]), trigger: str(t.trigger),
  })).filter((t: any) => t.trigger);
  const realBarriers = arr(eContent?.barriersEngagement ?? eContent?.barriers).map(str).filter(Boolean);
  const hasPathway = !!devSnap || realTriggers.length > 0 || realBarriers.length > 0;
  const currentDistribution: Record<string, number> = devSnap
    ? { spectateur: devSnap.spectateur, interesse: devSnap.interesse, participant: devSnap.participant, engage: devSnap.engage, ambassadeur: devSnap.ambassadeur, evangeliste: devSnap.evangeliste }
    : {};
  const devotionPathway = hasPathway ? { currentDistribution, conversionTriggers: realTriggers, barriers: realBarriers } : null;

  // Community strategy : champs canoniques E (communityStrategy → principes +
  // communityBuilding). Vide ("") si rien de déclaré — plus de phrase générique.
  const cb = (eContent?.communityBuilding ?? {}) as any;
  const principes = arr(eContent?.principesCommunautaires).map(str).filter(Boolean);
  const cbParts = [
    Array.isArray(cb.platforms) && cb.platforms.length > 0 ? `Plateformes : ${cb.platforms.map(str).join(", ")}` : "",
    str(cb.growthMechanics),
  ].filter(Boolean);
  const communityStrategy = str(eContent?.communityStrategy ?? eContent?.community)
    || [principes.slice(0, 3).join(" · "), ...cbParts].filter(Boolean).join(" — ")
    || null;

  return {
    touchpoints,
    rituels,
    devotionPathway,
    communityStrategy,
  };
}

export function mapSwotInterne(strategy: any): SwotInterneSection {
  const rContent = getPillarContent(strategy, "r") as any;
  const tContent = getPillarContent(strategy, "t") as any;
  const dContent = getPillarContent(strategy, "d") as any;
  const swot = (rContent?.globalSwot ?? {}) as any;

  // SWOT RÉEL (audit galileo) : R.globalSwot canonique (4 quadrants). Menaces/
  // opportunités à défaut : signaux/tendances marché T + paysage concurrentiel D
  // (vraies données), jamais des risques génériques (defaultSwot). Plus de SWOT
  // fabriqué depuis les scores du vecteur.
  const forces = arr(swot.strengths ?? rContent?.forces).map(str).filter(Boolean);
  const faiblesses = arr(swot.weaknesses ?? rContent?.faiblesses).map(str).filter(Boolean);
  let menaces = arr(swot.threats ?? rContent?.menaces).map(str).filter(Boolean);
  let opportunites = arr(swot.opportunities ?? rContent?.opportunites).map(str).filter(Boolean);
  if (menaces.length === 0) {
    menaces = arr(dContent?.paysageConcurrentiel)
      .map((c: any) => { const n = pickStr(c, ["nom", "name"]); return n ? `Concurrence : ${n}` : ""; }).filter(Boolean);
  }
  if (opportunites.length === 0) {
    opportunites = [
      ...arr(tContent?.marketReality?.weakSignals).map(str),
      ...arr(tContent?.marketReality?.macroTrends).map(str),
    ].filter(Boolean).slice(0, 5);
  }

  // Mitigations RÉELLES : R.mitigationPriorities. Vide si absent (pas de risques
  // génériques inventés).
  const mitigations = arr(rContent?.mitigationPriorities).map((m: any) => ({
    risque: pickStr(m, ["risk", "risque"]), action: pickStr(m, ["action", "mitigation"]),
    priorite: pickStr(m, ["priority", "priorite"]) || "MEDIUM",
  })).filter((m: any) => m.risque || m.action);

  return {
    forces,
    faiblesses,
    menaces,
    opportunites,
    mitigations,
    resilienceScore: typeof rContent?.resilienceScore === "number" ? rContent.resilienceScore
      : typeof rContent?.riskScore === "number" ? rContent.riskScore : null,
    artemisResults: [],
  };
}

export function mapSwotExterne(strategy: any): SwotExterneSection {
  const tContent = getPillarContent(strategy, "t") as any;
  const dContent = getPillarContent(strategy, "d") as any;

  // ── Marché : T.tamSamSom canonique ({tam,sam,som} objets {value, description}).
  // Fallback legacy : triangulation.tam / tContent.tam (anciennes shapes texte).
  const tss = (tContent?.tamSamSom ?? {}) as any;
  const tri = (tContent?.triangulation ?? {}) as any;
  const fmtMarket = (seg: any, legacy: unknown): string | null => {
    if (seg && typeof seg === "object") {
      const v = typeof seg.value === "number" ? `${seg.value.toLocaleString("fr-FR")} XAF` : null;
      const d = str(seg.description);
      const out = [v, d].filter(Boolean).join(" — ");
      return out || null;
    }
    return str(legacy) || null;
  };
  const marche = {
    tam: fmtMarket(tss.tam, tri.tam ?? tContent?.tam),
    sam: fmtMarket(tss.sam, tri.sam ?? tContent?.sam),
    som: fmtMarket(tss.som, tri.som ?? tContent?.som),
    growth: str(tri.growth ?? tContent?.marketGrowth) || null,
  };

  // ── Concurrents : D.paysageConcurrentiel (riche) en source primaire,
  // complété par T.competitorOvertonPositions (perception Overton relative).
  const overtonByName = new Map<string, any>(
    arr(tContent?.competitorOvertonPositions).map((c: any) => [str(c.competitorName), c]),
  );
  let concurrents = arr(dContent?.paysageConcurrentiel).map((c: any) => {
    const nom = str(c.name ?? c.nom);
    const ov = overtonByName.get(nom);
    return {
      nom,
      forces: arr(c.avantagesCompetitifs ?? c.forces ?? c.strengths).map(str).filter(Boolean),
      faiblesses: arr(c.faiblesses ?? c.weaknesses).map(str).filter(Boolean),
      partDeMarche: str(c.partDeMarcheEstimee ?? c.partDeMarche ?? c.marketShare) || (ov ? `Overton : ${str(ov.relativeToUs)}` : null),
    };
  });
  if (concurrents.length === 0) {
    concurrents = arr(tContent?.competitorOvertonPositions).map((c: any) => ({
      nom: str(c.competitorName),
      forces: [str(c.overtonPosition)].filter(Boolean),
      faiblesses: [],
      partDeMarche: str(c.relativeToUs) || null,
    }));
  }
  if (concurrents.length === 0) {
    concurrents = arr(tContent?.competitors ?? tContent?.concurrents).map((c: any) => ({
      nom: str(c.nom ?? c.name), forces: arr(c.forces ?? c.strengths).map(str),
      faiblesses: arr(c.faiblesses ?? c.weaknesses).map(str), partDeMarche: str(c.partDeMarche ?? c.marketShare) || null,
    }));
  }

  // Tendances RÉELLES : T.marketReality.macroTrends. Vide si aucune veille
  // déclarée (plus de tendances génériques "Digitalisation acceleree…").
  const tendances = arr(tContent?.marketReality?.macroTrends ?? tContent?.trends ?? tContent?.tendances).map(str).filter(Boolean);

  // Brand-market fit RÉEL : T.brandMarketFitScore mesuré. null si non mesuré
  // (plus de score fabriqué depuis vector.t × 4 + gaps/opportunités génériques).
  const bmfScore = typeof tContent?.brandMarketFitScore === "number" ? tContent.brandMarketFitScore : null;
  const percGap = (tContent?.perceptionGap ?? {}) as any;
  const brandMarketFit = bmfScore !== null
    ? {
        score: bmfScore,
        gaps: [str(percGap.gapDescription)].filter(Boolean),
        opportunities: arr(tContent?.marketReality?.weakSignals).map(str).filter(Boolean).slice(0, 4),
      }
    : tContent?.brandMarketFit
      ? {
          score: tContent.brandMarketFit.score ?? null,
          gaps: arr(tContent.brandMarketFit.gaps).map(str),
          opportunities: arr(tContent.brandMarketFit.opportunities).map(str),
        }
      : null;

  // ── Validation terrain : synthèse T.hypothesisValidation + riskValidation.
  const hypos = arr(tContent?.hypothesisValidation);
  const riskVal = arr(tContent?.riskValidation);
  const validationTerrain = str(tContent?.validation ?? tContent?.validationTerrain)
    || (hypos.length > 0
      ? `${hypos.length} hypothese(s) de marche suivies — ${hypos.filter((h: any) => h.status === "TESTING").length} en test, ${hypos.filter((h: any) => h.status === "VALIDATED").length} validee(s).${riskVal.length > 0 ? ` ${riskVal.length} risque(s) confrontes au terrain.` : ""}`
      : null);

  return {
    marche,
    concurrents,
    tendances,
    brandMarketFit,
    validationTerrain,
  };
}

export function mapSignauxOpportunites(strategy: any): SignauxOpportunitesSection {
  const tContent = getPillarContent(strategy, "t") as any;
  const iContent = getPillarContent(strategy, "i") as any;
  const signals = arr(strategy.signals ?? []);

  // ── Signaux faibles : T.weakSignalAnalysis (analyses Tarsis structurées)
  // en source primaire, puis T.marketReality.weakSignals (strings), puis
  // les Signal rows DB, puis defaults.
  const analyzedSignals = arr(tContent?.weakSignalAnalysis).map((w: any) => ({
    signal: str(w.thesis ?? w.rawEvent),
    source: str(w.rawEvent && w.thesis ? `Observé : ${str(w.rawEvent)}` : "Tarsis — analyse signaux faibles"),
    severity: str(w.urgency ?? w.impactCategory ?? "MEDIUM"),
    detectedAt: "",
  })).filter((w: any) => w.signal);

  const marketWeakSignals = arr(tContent?.marketReality?.weakSignals).map((s: unknown) => ({
    signal: str(s),
    source: "Veille marché (pilier T)",
    severity: "MEDIUM",
    detectedAt: "",
  })).filter((w: any) => w.signal);

  const dbSignals = signals
    .filter((s: any) => s.type === "WEAK" || s.layer === "WEAK")
    .map((s: any) => ({
      signal: str(s.data?.title ?? s.type),
      source: str(s.data?.source ?? "Signal interne"),
      severity: str(s.data?.severity ?? "LOW"),
      detectedAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString("fr-FR") : "",
    }));

  const weakSignals = [...analyzedSignals, ...marketWeakSignals, ...dbSignals].slice(0, 8);

  // ── Opportunités : recommandations des analyses Tarsis + activations du
  // catalogue I, puis Signal rows DB, puis defaults.
  const tarsisOpportunities = arr(tContent?.weakSignalAnalysis)
    .filter((w: any) => str(w.recommendedAction))
    .map((w: any) => ({
      contexte: str(w.recommendedAction),
      canal: str((arr(w.relatedPillars).map(str)).join(", ")),
      timing: str(w.urgency ?? ""),
      impact: str(w.impactCategory ?? "MEDIUM"),
    }));

  const activationOpportunities = arr(iContent?.activationsPossibles).slice(0, 4).map((a: any) => ({
    contexte: str(a.activation),
    canal: str(a.canal ?? ""),
    timing: "",
    impact: str(a.budgetEstime ?? "MEDIUM"),
  })).filter((o: any) => o.contexte);

  const opportunitySignals = signals.filter((s: any) => s.data?.opportunity && s.data.opportunity !== s.data.title);
  const dbOpportunities = opportunitySignals.map((s: any) => ({
    contexte: str(s.data.opportunity),
    canal: str(s.data?.channel ?? ""),
    timing: str(s.data?.timing ?? ""),
    impact: str(s.data?.impact ?? "MEDIUM"),
  }));

  // Opportunités + signaux faibles RÉELS uniquement (audit galileo) : analyses
  // Tarsis T + activations I + Signal rows DB. Vides si rien d'observé — plus
  // d'opportunités/signaux génériques inventés ("Evolution des attentes…").
  const opportunities = [...tarsisOpportunities, ...activationOpportunities, ...dbOpportunities].slice(0, 8);

  return {
    signauxFaibles: weakSignals,
    opportunitesPriseDeParole: opportunities,
    // `mestorInsights`/`seshatReferences` supprimés (audit 2026-07-13, T2) : deux
    // champs promis par le type mais hardcodés [] depuis leur naissance — un
    // placeholder mensonger n'est pas un EmptyState. Réintroduction = source
    // réelle branchée d'abord.
  };
}

const BUDGET_ESTIME_LABEL: Record<string, string> = { LOW: "Faible", MEDIUM: "Moyen", HIGH: "Élevé" };

/** Pure cost label for an initiative — numeric FCFA if known, else the qualitative estimate, else null. */
function initiativeCost(init: NormalizedInitiative): string | null {
  if (init.budget > 0) {
    if (init.budget >= 1_000_000) return `${(init.budget / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M FCFA`;
    if (init.budget >= 1_000) return `${Math.round(init.budget / 1_000)} k FCFA`;
    return `${Math.round(init.budget)} FCFA`;
  }
  return init.budgetEstime ? (BUDGET_ESTIME_LABEL[init.budgetEstime] ?? init.budgetEstime) : null;
}

export function mapCatalogueActions(strategy: any): CatalogueActionsSection {
  const iContent = getPillarContent(strategy, "i") as any;

  // ADR-0094 (Slice B2) — the Oracle catalogue reads the SAME canonical
  // normalizer (`collectNormalizedInitiatives`) that backs the BrandAction
  // materializer, not the raw heterogeneous blob collections (catalogueParCanal
  // / actionsByDevotionLevel / actionsByOvertonPhase). ONE homogeneous, deduped
  // projection for both the cockpit (DB materialization) and the Oracle (derived
  // fresh here). Honest emptiness — an empty brand renders an empty section.
  const initiatives = collectNormalizedInitiatives(iContent);

  // Media drivers stay a distinct concept (campaign drivers, not I-actions).
  const drivers = arr(strategy.drivers).map((d: any) => ({
    name: str(d.name), channel: str(d.channel), status: str(d.status),
  }));

  // ── Par canal : groupé sur le `channel` canonique de chaque initiative.
  const parCanal: CatalogueActionsSection["parCanal"] = {};
  for (const init of initiatives) {
    const canal = init.channel || "AUTRE";
    (parCanal[canal] ??= []).push({
      action: init.action,
      format: init.format,
      cout: initiativeCost(init),
      impact: init.pilierImpact ?? "",
    });
  }

  // ── Par pilier : groupé sur le `pilierImpact` ADVE de chaque initiative.
  const parPilier: CatalogueActionsSection["parPilier"] = {};
  for (const init of initiatives) {
    const pilier = init.pilierImpact ?? "TRANSVERSE";
    (parPilier[pilier] ??= []).push({
      action: init.action,
      objectif: init.objectif,
    });
  }

  return {
    parCanal,
    parPilier,
    totalActions: initiatives.length,
    drivers,
  };
}

export function mapFenetreOverton(strategy: any): FenetreOvertonSection {
  const sContent = getPillarContent(strategy, "s") as any;
  const dContent = getPillarContent(strategy, "d") as any;
  const iContent = getPillarContent(strategy, "i") as any;
  const tContent = getPillarContent(strategy, "t") as any;

  // Perceptions RÉELLES (audit galileo) : S.fenetreOverton / champs S → sinon
  // positionnement D (perception actuelle) + vision S (cible) + perceptionGap T
  // (écart). Plus de phrase-template fabriquée ("X est percu comme un acteur
  // emergent…"). null honnête si aucune donnée.
  const fo = sContent?.fenetreOverton as any;
  const perceptionActuelle = str(sContent?.perceptionActuelle ?? fo?.perceptionActuelle ?? sContent?.currentPerception ?? dContent?.positionnement) || null;
  const perceptionCible = str(sContent?.perceptionCible ?? fo?.perceptionCible ?? sContent?.targetPerception ?? sContent?.ambition ?? sContent?.visionStrategique) || null;
  const ecart = str(sContent?.ecart ?? fo?.ecart ?? sContent?.gap ?? tContent?.perceptionGap?.gapDescription) || null;

  // Stratégie de déplacement : overtonStrategy déclarée → axes stratégiques S
  // (chaque axe est un mouvement Overton réel, ses pillarsLinked = canaux) →
  // recommandations prioritaires S. Plus d'étapes génériques (defaultOverton).
  let strategieDeplacment = arr(sContent?.overtonStrategy ?? sContent?.displacementStrategy ?? fo?.strategieDeplacement).map((s: any) => ({
    etape: str(s.etape ?? s.step), action: str(s.action),
    canal: str(s.canal ?? s.channel), horizon: str(s.horizon ?? s.timeline),
  })).filter((s: any) => s.etape || s.action);
  if (strategieDeplacment.length === 0) {
    strategieDeplacment = arr(sContent?.axesStrategiques).map((a: any) => ({
      etape: str(a.axe ?? a.axis ?? a.nom), action: arr(a.kpis).map(str).join(" · ") || str(a.action),
      canal: arr(a.pillarsLinked).map(str).join(", "), horizon: "",
    })).filter((s: any) => s.etape);
  }
  if (strategieDeplacment.length === 0) {
    strategieDeplacment = arr(sContent?.recommandationsPrioritaires).map((r: any) => ({
      etape: `Priorité ${str(r.priority ?? "")}`.trim(), action: str(r.recommendation ?? r.reco ?? r.action),
      canal: str(r.source), horizon: "",
    })).filter((s: any) => s.action);
  }

  // Roadmap : S.roadmap → calendrier annuel I (chaque entrée = phase réelle avec
  // budget/objectif/drivers) → axes stratégiques S. Plus de roadmap 7-phases
  // générique (defaultRoadmap "Phase 1 — Fondations").
  let roadmap = arr(sContent?.roadmap).map((r: any) => ({
    phase: str(r.phase), objectif: str(r.objectif ?? r.objective),
    livrables: arr(r.livrables ?? r.deliverables).map(str).filter(Boolean),
    budget: typeof r.budget === "number" ? r.budget : null, duree: str(r.duree ?? r.duration),
  })).filter((r: any) => r.phase || r.objectif);
  if (roadmap.length === 0) {
    roadmap = arr(iContent?.annualCalendar).map((e: any) => ({
      phase: str(e.name) || `Q${str(e.quarter)}`, objectif: str(e.objective ?? e.objectif),
      livrables: arr(e.drivers).map(str).filter(Boolean),
      budget: typeof e.budget === "number" ? e.budget : null, duree: e.quarter ? `Q${str(e.quarter)}` : "",
    })).filter((r: any) => r.phase || r.objectif);
  }
  if (roadmap.length === 0) {
    roadmap = arr(sContent?.axesStrategiques).map((a: any) => ({
      phase: str(a.axe ?? a.axis ?? a.nom), objectif: arr(a.kpis).map(str).join(" · "),
      livrables: arr(a.pillarsLinked).map(str).filter(Boolean), budget: null, duree: "",
    })).filter((r: any) => r.phase);
  }

  // Jalons : S.jalons / overtonMilestones → sprint 90 jours I (chaque action
  // priorisée est un jalon réel, son KPI = critère de succès). Plus de jalons
  // génériques datés (defaultJalons).
  let jalons = arr(sContent?.jalons ?? sContent?.milestones ?? sContent?.overtonMilestones).map((j: any) => ({
    date: str(j.date), milestone: str(j.milestone ?? j.label ?? j.targetPerception), critereSucces: str(j.critere ?? j.criteria ?? j.successCriteria),
  })).filter((j: any) => j.milestone);
  if (jalons.length === 0) {
    jalons = arr(iContent?.sprint90Days).map((a: any) => ({
      date: "", milestone: str(a.action), critereSucces: str(a.kpi),
    })).filter((j: any) => j.milestone);
  }

  // ADR-0088 — 3 trajectoires pure-computed depuis S.computed.roadmapRoutes.
  // ADR-0089 — ambition retenue + jeu de stratégie par route.
  const computed = sContent?.computed as any;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  const selectedRouteKey = typeof computed?.selectedRouteKey === "string" ? computed.selectedRouteKey : null;
  const roadmapRoutes = arr(computed?.roadmapRoutes).map((r: any) => ({
    key: str(r.key),
    label: str(r.label),
    recommended: Boolean(r.recommended),
    selected: typeof r.selected === "boolean" ? r.selected : (selectedRouteKey !== null && str(r.key) === selectedRouteKey),
    projectedGrowthPct: typeof r.projectedGrowthPct === "number" ? r.projectedGrowthPct : 0,
    projectedRevenue: typeof r.projectedRevenue === "number" ? r.projectedRevenue : null,
    targetCultIndex: typeof r.targetCultIndex === "number" ? r.targetCultIndex : 0,
    description: str(r.description),
    initiativeCount: num(r.initiativeCount),
    totalBudget: num(r.totalBudget),
    riskCoverage: num(r.riskCoverage),
  }));
  const computedDashboard = computed
    ? {
        totalBudget: num(computed.totalBudget),
        riskCoverage: num(computed.riskCoverage),
        selectedInitiativeCount: num(computed.selectedInitiativeCount),
        coherenceScore: num(computed.coherenceScore),
        budgetByPhase: Object.entries((computed.budgetByPhase ?? {}) as Record<string, unknown>)
          .filter(([, b]) => typeof b === "number")
          .map(([phase, b]) => ({ phase, budget: b as number })),
      }
    : null;

  return {
    perceptionActuelle,
    perceptionCible,
    ecart,
    strategieDeplacment,
    roadmap,
    jalons,
    roadmapRoutes,
    selectedRouteKey,
    computedDashboard,
  };
}

export function mapProfilSuperfan(strategy: any): ProfilSuperfanSection {
  const eContent = getPillarContent(strategy, "e") as any;
  const dContent = getPillarContent(strategy, "d") as any;
  const superfans = arr(strategy.superfanProfiles);
  const cultSnap = strategy.cultIndexSnapshots?.[0];

  // Portrait superfan RÉEL (audit galileo) : E.superfanPortrait canonique →
  // sinon DÉRIVÉ de la persona D au plus fort devotionPotential (les profils
  // personas portent devotionPotential AMBASSADEUR/EVANGELISTE + motivations/
  // freins riches). Plus de "Le Superfan <marque>" générique fabriqué de toutes
  // pièces (defaultSuperfanPortrait). null honnête si aucune source.
  const rawPortrait = eContent?.superfanPortrait ?? eContent?.idealCustomer;
  const DEVOTION_RANK = ["SPECTATEUR", "INTERESSE", "PARTICIPANT", "ENGAGE", "AMBASSADEUR", "EVANGELISTE"];
  const bestPersona = arr(dContent?.personas)
    .slice()
    .sort((a: any, b: any) =>
      DEVOTION_RANK.indexOf(String(b?.devotionPotential ?? "").toUpperCase()) -
      DEVOTION_RANK.indexOf(String(a?.devotionPotential ?? "").toUpperCase()),
    )[0];

  let portrait: ProfilSuperfanSection["portrait"] = null;
  if (rawPortrait) {
    const ref = str(rawPortrait.personaRef);
    const refP = ref ? arr(dContent?.personas).find((p: any) => p.id === ref || str(p.nom ?? p.name) === ref) : null;
    portrait = {
      nom: pickStr(rawPortrait, ["nom", "name"]) || pickStr(refP ?? {}, ["nom", "name"]) || pickStr(bestPersona ?? {}, ["nom", "name"]),
      trancheAge: pickStr(rawPortrait, ["trancheAge", "age"]) || pickStr(refP ?? {}, ["trancheAge", "age"]),
      description: pickStr(rawPortrait, ["profile", "description", "profil"]),
      motivations: pickArr(rawPortrait, ["motivations", "jobsToBeDone"]),
      freins: pickArr(rawPortrait, ["barriers", "freins", "fears"]),
    };
  } else if (bestPersona) {
    portrait = {
      nom: pickStr(bestPersona, ["nom", "name", "titre"]),
      trancheAge: pickStr(bestPersona, ["trancheAge", "age"]),
      description: pickStr(bestPersona, ["whatTheyActuallyBuy", "hiddenDesire", "lifestyle", "insightCle", "profile"]),
      motivations: pickArr(bestPersona, ["motivations", "jobsToBeDone", "drivers"]),
      freins: pickArr(bestPersona, ["fears", "barriers", "freins", "freinsAchat"]),
    };
  }
  if (portrait && !portrait.nom && !portrait.description && portrait.motivations.length === 0) portrait = null;

  // Parcours Devotion : conversionTriggers E → devotionJourney → dérivé des
  // touchpoints E (niveauDevotion + stade). Plus de parcours générique inventé.
  let parcoursDevotionCible = arr(eContent?.conversionTriggers).map((p: any) => ({
    palier: [str(p.fromLevel), str(p.toLevel)].filter(Boolean).join(" → ") || str(p.palier ?? p.tier),
    trigger: str(p.trigger),
    experience: str(p.channel ?? p.experience),
  })).filter((p: any) => p.palier || p.trigger);
  if (parcoursDevotionCible.length === 0) {
    parcoursDevotionCible = arr(eContent?.devotionJourney).map((p: any) => ({
      palier: str(p.palier ?? p.tier), trigger: str(p.trigger), experience: str(p.experience),
    })).filter((p: any) => p.palier || p.trigger);
  }
  if (parcoursDevotionCible.length === 0) {
    parcoursDevotionCible = arr(eContent?.touchpoints)
      .filter((t: any) => str(t.niveauDevotion ?? t.devotionLevel))
      .map((t: any) => ({ palier: str(t.niveauDevotion ?? t.devotionLevel), trigger: pickStr(t, ["nom", "name", "canal", "channel"]), experience: str(t.stadeAarrr ?? t.aarrStage) }))
      .filter((p: any) => p.palier);
  }

  const actifs = superfans.filter((s: any) => s.engagementDepth >= 0.8).length;
  const evangelistes = superfans.filter((s: any) => s.segment === "evangeliste" || s.engagementDepth >= 0.95).length;

  // Cult index — ADR-0046 ; no magic fallback. CultIndexTier résolu (galileo).
  const cultIndex = cultSnap
    ? { score: cultSnap.compositeScore, tier: resolveCultIndexTier(cultSnap.tier, cultSnap.compositeScore) }
    : null;

  return {
    portrait,
    parcoursDevotionCible,
    metriquesSuperfan: {
      actifs,
      evangelistes,
      // lafusee:allow-adhoc-completion: Oracle section enrichment progress (sections compiled ratio, not pillar field completion)
      ratio: superfans.length > 0 ? Math.round((actifs / superfans.length) * 100) : 0,
      velocite: null,
    },
    cultIndex,
  };
}

export function mapCroissanceEvolution(strategy: any): CroissanceEvolutionSection {
  const iContent = getPillarContent(strategy, "i") as any;
  const sContent = getPillarContent(strategy, "s") as any;
  const eContent = getPillarContent(strategy, "e") as any;
  const vContent = getPillarContent(strategy, "v") as any;

  // Boucles de croissance RÉELLES (audit galileo) : programme d'évangélisation E
  // → growthLoops déclarés → rituels E (vraies boucles d'engagement récurrentes).
  // Plus aucune boucle générique fabriquée (defaultGrowthLoops "Boucle referral
  // organique" avec potentielViral 0.3 inventé).
  const prog = (eContent?.programmeEvangelisation ?? {}) as any;
  let bouclesCroissance: Array<{ nom: string; type: string; potentielViral: number | null; plan: string }> = [
    prog.referralProgram ? { nom: "Boucle referral", type: "referral", potentielViral: null, plan: str(prog.referralProgram) } : null,
    prog.brandAdvocacyProgram ? { nom: "Boucle advocacy", type: "evangelisation", potentielViral: null, plan: str(prog.brandAdvocacyProgram) } : null,
    prog.communityRecruitment ? { nom: "Boucle communautaire", type: "communaute", potentielViral: null, plan: str(prog.communityRecruitment) } : null,
  ].filter(Boolean) as any;
  if (bouclesCroissance.length === 0) {
    bouclesCroissance = arr(sContent?.growthLoops ?? iContent?.growthLoops).map((b: any) => ({
      nom: str(b.nom ?? b.name), type: str(b.type) || "organique",
      potentielViral: typeof b.viralPotential === "number" ? b.viralPotential : null, plan: str(b.plan ?? b.description),
    })).filter((b: any) => b.nom);
  }
  if (bouclesCroissance.length === 0) {
    // Les rituels de marque SONT des boucles d'engagement réelles.
    bouclesCroissance = arr(eContent?.rituels).map((r: any) => ({
      nom: str(r.nom ?? r.name), type: "rituel", potentielViral: null,
      plan: str(r.description) || `Rituel ${str(r.frequence ?? r.frequency)}`.trim(),
    })).filter((b: any) => b.nom);
  }

  // Expansion RÉELLE : phases tardives de la roadmap S → expansion déclarée →
  // axes stratégiques S (leviers d'expansion réels). Plus de marchés génériques
  // (defaultExpansion "Afrique de l'Ouest (CEDEAO)").
  let expansionStrategy = arr(sContent?.roadmap).slice(2).map((r: any, i: number) => ({
    marche: str(r.phase), priorite: i + 1, planEntree: str(r.objectif ?? r.objective),
  })).filter((e: any) => e.marche && e.planEntree);
  if (expansionStrategy.length === 0) {
    expansionStrategy = arr(sContent?.expansion).map((e: any) => ({
      marche: str(e.marche ?? e.market), priorite: e.priorite ?? e.priority ?? 0, planEntree: str(e.plan ?? e.entryPlan),
    })).filter((e: any) => e.marche);
  }
  if (expansionStrategy.length === 0) {
    expansionStrategy = arr(sContent?.axesStrategiques).map((a: any, i: number) => ({
      marche: str(a.axe ?? a.axis ?? a.nom), priorite: i + 1, planEntree: arr(a.kpis).map(str).join(" · "),
    })).filter((e: any) => e.marche);
  }

  // Évolution : vision/synthèse RÉELLES + scénarios = routes calculées (ADR-0089)
  // → recommandations prioritaires S. Extensions = innovations EXTENSION I →
  // catégories réelles du catalogue V. Plus de pivots/extensions génériques.
  const computed = (sContent?.computed ?? {}) as any;
  const routeScenarios = arr(computed.roadmapRoutes).map((r: any) =>
    `${str(r.label)}${r.selected ? " (retenue)" : r.recommended ? " (recommandée)" : ""} — +${r.projectedGrowthPct}% de croissance projetée, Cult Index cible ${r.targetCultIndex}/100. ${str(r.description)}`,
  ).filter(Boolean);
  const recoScenarios = arr(sContent?.recommandationsPrioritaires)
    .map((r: any) => str(r.recommendation ?? r.reco ?? r.action)).filter(Boolean);

  const extensionInnovations = arr(iContent?.innovationsProduit)
    .filter((p: any) => typeof p.type === "string" && p.type.startsWith("EXTENSION"))
    .map((p: any) => `${str(p.name)} — ${str(p.description)}`.replace(/ — $/, "")).filter(Boolean);
  const catalogueCategories = [
    ...new Set(arr(vContent?.produitsCatalogue).map((p: any) => str(p.categorie ?? p.category)).filter(Boolean)),
  ];

  const evolutionMarque = {
    trajectoire: str(sContent?.visionStrategique) || str(sContent?.syntheseExecutive).slice(0, 300),
    scenariosPivot: routeScenarios.length > 0 ? routeScenarios : recoScenarios,
    extensionsMarque: extensionInnovations.length > 0 ? extensionInnovations : catalogueCategories,
  };

  // Pipeline innovation RÉEL : innovations produit I → pipeline déclaré → offres
  // V en phase d'introduction/croissance (vrais paris produit). Plus de pipeline
  // générique (defaultInnovationPipeline "Experience digitale immersive").
  let pipelineInnovation = arr(iContent?.innovationsProduit).map((p: any) => ({
    initiative: str(p.name), impact: str(p.devotionImpact ?? p.type),
    faisabilite: str(p.feasibility), timeToMarket: str(p.horizon),
  })).filter((p: any) => p.initiative);
  if (pipelineInnovation.length === 0) {
    pipelineInnovation = arr(iContent?.innovationPipeline ?? sContent?.innovationPipeline).map((p: any) => ({
      initiative: str(p.initiative ?? p.name), impact: str(p.impact),
      faisabilite: str(p.feasibility ?? p.faisabilite), timeToMarket: str(p.ttm ?? p.timeToMarket),
    })).filter((p: any) => p.initiative);
  }
  if (pipelineInnovation.length === 0) {
    pipelineInnovation = arr(vContent?.produitsCatalogue)
      .filter((p: any) => ["INTRODUCTION", "GROWTH", "CROISSANCE"].includes(String(p.phaseLifecycle ?? "").toUpperCase()))
      .map((p: any) => ({ initiative: str(p.nom ?? p.name), impact: str(p.lienPromesse).slice(0, 120), faisabilite: "", timeToMarket: str(p.phaseLifecycle) }))
      .filter((p: any) => p.initiative);
  }

  return { bouclesCroissance, expansionStrategy, evolutionMarque, pipelineInnovation };
}

// Aliases for new mappers (reuse existing helpers)
function str(val: unknown): string {
  return safeStr(val) ?? (typeof val === "number" ? String(val) : "");
}
function arr(val: unknown): any[] {
  return safeArr(val) as any[];
}

// ─── Multi-key readers (audit galileo : dévorer les vraies structures) ──────
// Le seed/onboarding stocke les mêmes concepts sous des clés variées
// (`name`/`nom`, `age`/`trancheAge`, `value`/`valeur`, `rank`/`rang`,
// `fears`/`barriers`/`freins`). Les mappers lisaient une seule clé → rataient
// la donnée riche → tombaient en default inventé. Ces lecteurs essaient
// plusieurs clés avant d'abandonner. Mission : ne rien inventer, mais aussi
// ne rien laisser sur la table.
function pickStr(obj: any, keys: string[]): string {
  if (!obj || typeof obj !== "object") return "";
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return "";
}
/** Lit la 1ère clé présente ; normalise string|string[]→string[] (split si CSV/string). */
function pickArr(obj: any, keys: string[]): string[] {
  if (!obj || typeof obj !== "object") return [];
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) {
      const out = v.map((x) => (typeof x === "string" ? x.trim() : str(x))).filter(Boolean);
      if (out.length > 0) return out;
    } else if (typeof v === "string" && v.trim()) {
      return [v.trim()];
    }
  }
  return [];
}


/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Strategy Presentation — Section Mappers
 * Pure functions that map raw Prisma data → typed section objects.
 * Each mapper extracts its section from the single comprehensive query result.
 * When real data is missing, coherent defaults are generated from brand context.
 * Note: Uses `any` for strategy param since Prisma complex includes resist clean typing.
 */

import { classifyBrand, createEmptyVector } from "@/lib/types/advertis-vector";
import type { AdvertisVector, BrandClassification } from "@/lib/types/advertis-vector";
import { parseDevotionLadderTier } from "@/domain/devotion-ladder";
import {
  extractBrandContext,
  defaultPersonas,
  defaultValeurs,
  defaultMessagingFramework,
  defaultTouchpoints,
  defaultRituels,
  defaultSwot,
  defaultMitigations,
  defaultKpis,
  defaultAarrr,
  defaultRoadmap,
  defaultOvertonStrategy,
  defaultJalons,
  defaultMediaDrivers,
  defaultMediaActions,
  defaultSuperfanPortrait,
  defaultDevotionJourney,
  defaultGrowthLoops,
  defaultExpansion,
  defaultInnovationPipeline,
  defaultGloryOutputsByLayer,
  defaultTeamMembers,
  defaultOperator,
} from "./section-defaults";
import type { BrandContext } from "./section-defaults";
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
  // a été supprimé (ADR-0046). Le `tier` legacy stocké en string libre côté
  // Prisma est canonicalisé via `parseDevotionLadderTier` (ADR-0047) ; valeurs
  // invalides en DB (ex: `"APPRENTI"` du GuildTier creator) → `cultIndex: null`
  // au lieu d'un mix non-typé qui s'affichait brut côté Oracle.
  const derivedCultIndex = (() => {
    if (!cultSnap) return null;
    const parsedTier = parseDevotionLadderTier(cultSnap.tier);
    if (!parsedTier) {
      console.warn(
        `[mapExecutiveSummary] cultIndexSnapshot.tier=${JSON.stringify(cultSnap.tier)} is not a valid DevotionLadderTier — returning null (ADR-0047)`,
      );
      return null;
    }
    return { score: cultSnap.compositeScore, tier: parsedTier };
  })();

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
  const ctx = _brandCtx(strategy);

  const enemy = pillarA?.enemy as Record<string, unknown> | null;
  const prophecy = pillarA?.prophecy as Record<string, unknown> | null;

  const rawPersonas = safeArr(pillarD?.personas);
  let personas = rawPersonas.map((p: unknown) => {
    const px = p as Record<string, unknown>;
    return {
      nom: safeStr(px.nom) ?? "",
      trancheAge: safeStr(px.trancheAge) ?? "",
      csp: safeStr(px.csp) ?? "",
      insightCle: safeStr(px.insightCle) ?? "",
      freinsAchat: safeArr(px.freinsAchat) as string[],
      motivations: safeArr(px.motivations) as string[],
    };
  });

  // Fill persona gaps with defaults — missing fields get backfilled
  const defs = defaultPersonas(ctx);
  if (personas.length === 0) {
    personas = defs;
  } else {
    personas = personas.map((p, i) => {
      const def = defs[i] ?? defs[0]!;
      return {
        nom: p.nom || def.nom,
        trancheAge: p.trancheAge || def.trancheAge,
        csp: p.csp || def.csp,
        insightCle: p.insightCle || def.insightCle,
        freinsAchat: p.freinsAchat.length > 0 ? p.freinsAchat : def.freinsAchat,
        motivations: p.motivations.length > 0 ? p.motivations : def.motivations,
      };
    });
  }

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
  const ctx = _brandCtx(strategy);

  const ikigai = pillarA?.ikigai as Record<string, unknown> | null;
  const tonDeVoix = pillarD?.tonDeVoix as Record<string, unknown> | null;
  const assets = pillarD?.assetsLinguistiques as Record<string, unknown> | null;
  const rawValeurs = safeArr(pillarA?.valeurs);

  let valeurs = rawValeurs.map((v: unknown) => {
    const vx = v as Record<string, unknown>;
    return {
      valeur: safeStr(vx.valeur) ?? "",
      rang: (vx.rang as number) ?? 0,
      justification: safeStr(vx.justification) ?? "",
    };
  });

  // Default valeurs when empty or all zero
  if (valeurs.length === 0 || valeurs.every(v => !v.valeur)) {
    valeurs = defaultValeurs(ctx);
  } else {
    // Backfill missing fields
    const defV = defaultValeurs(ctx);
    valeurs = valeurs.map((v, i) => ({
      valeur: v.valeur || defV[i]?.valeur || `Valeur ${i + 1}`,
      rang: v.rang || i + 1,
      justification: v.justification || defV[i]?.justification || "",
    }));
  }

  // Build messaging framework from personas + pillar D
  const rawPersonas = safeArr(pillarD?.personas);
  let messagingFramework = rawPersonas.slice(0, 3).map((p: unknown) => {
    const px = p as Record<string, unknown>;
    return {
      audience: safeStr(px.nom) ?? "",
      messagePrincipal: safeStr(px.insightCle) ?? "",
      messagesSupport: safeArr(px.motivations) as string[],
      callToAction: "",
    };
  });

  // Default messaging when empty or incomplete
  const isMessagingEmpty = messagingFramework.length === 0 || messagingFramework.every(m => !m.messagePrincipal && m.messagesSupport.length === 0);
  if (isMessagingEmpty) {
    const personas = defaultPersonas(ctx);
    messagingFramework = defaultMessagingFramework(ctx, personas);
  } else {
    // Backfill missing messaging fields
    const defPersonas = defaultPersonas(ctx);
    const defMsg = defaultMessagingFramework(ctx, defPersonas);
    messagingFramework = messagingFramework.map((m, i) => ({
      audience: m.audience || defMsg[i]?.audience || `Audience ${i + 1}`,
      messagePrincipal: m.messagePrincipal || defMsg[i]?.messagePrincipal || "",
      messagesSupport: m.messagesSupport.length > 0 ? m.messagesSupport : defMsg[i]?.messagesSupport ?? [],
      callToAction: m.callToAction || defMsg[i]?.callToAction || "En savoir plus",
    }));
  }

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
    sousPromesses: safeArr(pillarD?.sousPromesses) as string[],
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
  const ctx = _brandCtx(strategy);

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

  const rawTouchpoints = safeArr(pillarE?.touchpoints);
  let touchpoints = rawTouchpoints.map((t: unknown) => {
    const tx = t as Record<string, unknown>;
    return {
      nom: safeStr(tx.nom) ?? "",
      canal: safeStr(tx.canal) ?? "",
      type: safeStr(tx.type) ?? "",
      stadeAarrr: safeStr(tx.stadeAarrr) ?? "",
      niveauDevotion: safeStr(tx.niveauDevotion) ?? "",
    };
  });

  // Default touchpoints when empty or names missing
  if (touchpoints.length === 0 || touchpoints.every(t => !t.nom)) {
    const defs = defaultTouchpoints(ctx);
    if (touchpoints.length === 0) {
      touchpoints = defs.map(d => ({ nom: d.nom, canal: d.canal, type: d.canal, stadeAarrr: d.stadeAarrr, niveauDevotion: d.niveauDevotion ?? "" }));
    } else {
      touchpoints = touchpoints.map((t, i) => {
        const def = defs[i] ?? defs[0]!;
        return {
          nom: t.nom || def.nom,
          canal: t.canal || def.canal,
          type: t.type || def.canal,
          stadeAarrr: t.stadeAarrr || def.stadeAarrr,
          niveauDevotion: t.niveauDevotion || (def.niveauDevotion ?? ""),
        };
      });
    }
  }

  const rawRituels = safeArr(pillarE?.rituels);
  let rituels = rawRituels.map((r: unknown) => {
    const rx = r as Record<string, unknown>;
    return {
      nom: safeStr(rx.nom) ?? "",
      frequence: safeStr(rx.frequence) ?? "",
      description: safeStr(rx.description) ?? "",
    };
  });

  if (rituels.length === 0) {
    rituels = defaultRituels(ctx).map(r => ({ nom: r.nom, frequence: r.frequence, description: r.description }));
  }

  let drivers = strategy.drivers.map((d: any) => ({
    name: d.name,
    channel: d.channel,
    channelType: d.channelType,
    status: d.status,
  }));

  if (drivers.length === 0) {
    drivers = defaultMediaDrivers(ctx);
  }

  // Default AARRR funnel when missing
  const aarrr = (pillarE?.aarrr as Record<string, unknown> | null) ?? defaultAarrr();

  return {
    campaigns,
    aarrr,
    touchpoints,
    rituels,
    drivers,
  };
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

  // When no Glory outputs exist, generate the expected production pipeline
  const hasAnyOutputs = Object.values(gloryOutputsByLayer).some(arr => arr.length > 0);
  const finalOutputs = hasAnyOutputs ? gloryOutputsByLayer : defaultGloryOutputsByLayer(_brandCtx(strategy));

  return { missions, gloryOutputsByLayer: finalOutputs };
}

// ─── 08: Medias & Distribution ──────────────────────────────────────────────

export function mapMediasDistribution(strategy: any): MediasDistributionSection {
  const ctx = _brandCtx(strategy);

  let drivers = strategy.drivers.map((d: any) => ({
    name: d.name,
    channel: d.channel,
    channelType: d.channelType,
    status: d.status,
  }));

  if (drivers.length === 0) {
    drivers = defaultMediaDrivers(ctx);
  }

  let mediaActions = strategy.campaigns.flatMap((c: any) =>
    c.actions
      .filter((a: any) => a.category === "ATL" || a.category === "MEDIA" || a.category === "DIGITAL")
      .map((a: any) => ({
        name: a.name,
        category: a.category,
        budget: a.budget,
        driverName: null as string | null,
      }))
  );

  // ── Fallback pilier I : sans campagne lancée, la section surface le
  // potentiel média du catalogue (canaux DIGITAL / MEDIA / PR) plutôt que
  // des actions inventées (audit NEFER 2026-06-11).
  if (mediaActions.length === 0) {
    const iContent = getPillarContent(strategy, "i") as any;
    const catalogue = (iContent?.catalogueParCanal ?? {}) as Record<string, any[]>;
    const MEDIA_CHANNELS = ["DIGITAL", "MEDIA_TRADITIONNEL", "MEDIA", "PR_INFLUENCE", "ATL"];
    mediaActions = MEDIA_CHANNELS.flatMap((canal) =>
      arr(catalogue[canal]).slice(0, 4).map((a: any) => ({
        name: str(a.action ?? a.name),
        category: canal,
        budget: null as number | null,
        driverName: null as string | null,
      })),
    ).filter((a: any) => a.name).slice(0, 10);
  }

  if (mediaActions.length === 0) {
    mediaActions = defaultMediaActions(ctx);
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
  const ctx = _brandCtx(strategy);
  const rawKpis = safeArr(pillarE?.kpis);

  let kpis = rawKpis.map((k: unknown) => {
    const kx = k as Record<string, unknown>;
    return {
      name: safeStr(kx.name) ?? "",
      metricType: safeStr(kx.metricType) ?? "",
      target: safeStr(kx.target) ?? "",
      frequency: safeStr(kx.frequency) ?? "",
    };
  });

  // Default KPIs when empty or targets are all blank
  if (kpis.length === 0) {
    kpis = defaultKpis(ctx);
  } else if (kpis.every(k => !k.target)) {
    // Backfill targets from defaults
    const defKpis = defaultKpis(ctx);
    kpis = kpis.map((k, i) => ({
      ...k,
      target: k.target || defKpis[i]?.target || "A definir",
    }));
  }

  const devSnap = strategy.devotionSnapshots[0] ?? null;
  const cultSnap = strategy.cultIndexSnapshots[0] ?? null;
  const vector = ctx.vector;

  const superfans = strategy.superfanProfiles.map((sf: any) => ({
    platform: sf.platform,
    handle: sf.handle,
    engagementDepth: sf.engagementDepth,
    segment: sf.segment,
  }));

  const communitySnapshots = strategy.communitySnapshots.map((cs: any) => ({
    platform: cs.platform,
    size: cs.size,
    engagement: cs.health,
    growth: cs.velocity,
  }));

  // Default devotion distribution from vector when no snapshot
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
    : vector.e > 0
    ? {
        spectateur: 40,
        interesse: 25,
        participant: 15,
        engage: 10,
        ambassadeur: 7,
        evangeliste: 3,
        devotionScore: Math.round(vector.e * 4),
      }
    : null;

  // Cult index — ADR-0046 (no magic fallback) + ADR-0047 (DevotionLadderTier
  // strict). Si pas de snapshot SESHAT, on retourne null (état honnête « pas
  // mesuré ») au lieu d'inventer un score via `composite × 0.45`. Si le tier
  // legacy stocké en DB n'est pas un rung Devotion Ladder valide, idem null.
  const cultIndex = (() => {
    if (!cultSnap) return null;
    const parsedTier = parseDevotionLadderTier(cultSnap.tier);
    if (!parsedTier) return null;
    return {
      compositeScore: cultSnap.compositeScore,
      tier: parsedTier,
      engagementVelocity: cultSnap.engagementDepth,
      communityHealth: cultSnap.communityCohesion,
      superfanVelocity: cultSnap.superfanVelocity,
    };
  })();

  return {
    kpis,
    devotion,
    cultIndex,
    superfans,
    communitySnapshots,
    aarrr: (pillarE?.aarrr as Record<string, unknown> | null) ?? defaultAarrr(),
  };
}

// ─── 10: Budget ─────────────────────────────────────────────────────────────

export function mapBudget(strategy: any): BudgetSection {
  const pillarV = getPillarContent(strategy, "v");
  const pillarS = getPillarContent(strategy, "s");
  const ue = pillarV?.unitEconomics as Record<string, unknown> | null;

  const campaignBudgets = strategy.campaigns.map((c: any) => ({
    name: c.name,
    budget: c.budget,
    status: c.status,
  }));

  const totalBudget = campaignBudgets.reduce((sum: number, c: any) => sum + (c.budget ?? 0), 0);

  // Phase 18 (ADR-0043) — Lecture pillar S enveloppe globale + ventilation.
  // Permet aux marques BOOT (0 Campaign) de chiffrer leur budget Oracle.
  const rawGlobalBudget = pillarS?.globalBudget;
  const globalBudget = typeof rawGlobalBudget === "number" && Number.isFinite(rawGlobalBudget)
    ? rawGlobalBudget
    : null;
  const rawBreakdown = pillarS?.budgetBreakdown as Record<string, unknown> | null | undefined;
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
  const ctx = _brandCtx(strategy);

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

  // ── Timeline réelle : sans campagne lancée, la roadmap S (phases +
  // objectifs Devotion + jalons Overton) EST la timeline de la stratégie —
  // pas un "Plan directeur" inventé (audit NEFER 2026-06-11).
  const sContent = getPillarContent(strategy, "s") as any;
  const hasAnyMilestones = campaigns.some((c: any) => c.milestones.length > 0);
  let finalCampaigns = campaigns;

  if (!hasAnyMilestones) {
    const roadmapPhases = arr(sContent?.roadmap);
    const overtonMilestones = arr(sContent?.overtonMilestones);

    if (roadmapPhases.length > 0) {
      const phaseAsCampaign = (r: any, i: number) => ({
        name: str(r.phase) || `Phase ${i + 1}`,
        startDate: null as string | null,
        endDate: null as string | null,
        status: i === 0 ? "ACTIVE" : "PLANNED",
        milestones: [
          ...(str(r.objectifDevotion) ? [{ title: `Devotion : ${str(r.objectifDevotion)}`, dueDate: null as string | null, status: "PENDING" }] : []),
          ...(str(overtonMilestones[i]?.targetPerception) ? [{ title: `Overton : ${str(overtonMilestones[i].targetPerception)}`, dueDate: null as string | null, status: "PENDING" }] : []),
          ...arr(r.actions).slice(0, 3).map((a: any) => ({ title: str(typeof a === "string" ? a : a.action ?? a.name), dueDate: null as string | null, status: "PENDING" })),
        ].filter((m: any) => m.title),
      });
      const roadmapCampaigns = roadmapPhases.map(phaseAsCampaign);
      finalCampaigns = finalCampaigns.length > 0
        ? finalCampaigns.concat(roadmapCampaigns)
        : roadmapCampaigns;
    } else {
      const defMilestones = defaultJalons(ctx).map(j => ({
        title: j.milestone,
        dueDate: new Date(j.date).toISOString(),
        status: "PENDING",
      }));
      if (finalCampaigns.length > 0) {
        finalCampaigns = finalCampaigns.map((c: any, i: number) => i === 0
          ? { ...c, milestones: defMilestones }
          : c
        );
      } else {
        finalCampaigns = [{
          name: `Strategie ${ctx.name} — Plan directeur`,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          status: "PLANNED",
          milestones: defMilestones,
        }];
      }
    }
  }

  // ── Gouvernance : équipe campagnes > S.teamStructure (équipe déclarée de la
  // stratégie) > defaults.
  const owner = { name: strategy.user.name, email: strategy.user.email };
  const declaredTeam = arr(sContent?.teamStructure).map((t: any) => ({
    name: str(t.name), role: str(t.title ?? t.responsibility ?? ""), email: null as string | null,
  })).filter((t: any) => t.name);
  const finalTeam = uniqueTeam.length > 0
    ? uniqueTeam
    : declaredTeam.length > 0
      ? declaredTeam
      : defaultTeamMembers(ctx, owner).map(t => ({ name: t.name, role: t.role, email: t.email }));

  return { campaigns: finalCampaigns, missions, teamMembers: finalTeam };
}

// ─── 12: Equipe ─────────────────────────────────────────────────────────────

export function mapEquipe(strategy: any): EquipeSection {
  const ctx = _brandCtx(strategy);
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

  // Generate real team when no campaign team members exist
  const finalTeam = uniqueTeam.length > 0 ? uniqueTeam : defaultTeamMembers(ctx, owner);

  // Ensure operator is always set — use real or default
  const operator = strategy.operator
    ? { name: strategy.operator.name, slug: strategy.operator.slug }
    : defaultOperator(ctx);

  // ── Berkus: Equipe dirigeante from Pillar A ───────────────────────────
  const aContent = getPillarContent(strategy, "a") as any;
  const rawEquipe = arr(aContent?.equipeDirigeante);
  const equipeDirigeante = rawEquipe.map((m: any) => ({
    nom: str(m.nom ?? m.name ?? ""),
    role: str(m.role ?? m.title ?? ""),
    bio: str(m.bio ?? m.description ?? ""),
    experiencePasse: arr(m.experiencePasse ?? m.experience).map(str),
    competencesCles: arr(m.competencesCles ?? m.skills).map(str),
    credentials: arr(m.credentials ?? m.certifications).map(str),
  }));

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
  const ctx = _brandCtx(strategy);

  // Generate client context from strategy owner when no client record
  const client = strategy.client
    ? {
        contactName: strategy.client.contactName,
        contactEmail: strategy.client.contactEmail,
        sector: strategy.client.sector,
      }
    : {
        contactName: strategy.user.name ?? ctx.name,
        contactEmail: strategy.user.email ?? null,
        sector: ctx.sector,
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

  // ── Prochaines étapes : S.sprint90Days (actions réelles priorisées du
  // sprint) — la section s'appelle "Conditions & Prochaines Etapes" mais
  // n'exposait AUCUNE étape (audit NEFER 2026-06-11).
  const sContent = getPillarContent(strategy, "s") as any;
  const prochainesEtapes = arr(sContent?.sprint90Days)
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
  const ctx = _brandCtx(strategy);

  // ── Pricing : V.pricingJustification (canonique) + échelle V.productLadder.
  // Les champs `pricing/pricingStrategy/pricingLadder` legacy n'ont jamais
  // existé dans le schéma — la section rendait toujours les defaults
  // (audit NEFER 2026-06-11).
  const ladder = arr(vContent?.productLadder);
  const ladderDescription = ladder.length > 0
    ? ladder.map((t: any) => `${str(t.tier)}${typeof t.prix === "number" ? ` (${t.prix.toLocaleString("fr-FR")} XAF)` : ""} — ${str(t.cible ?? t.description ?? t.position ?? "")}`.replace(/ — $/, "")).join(" · ")
    : "";

  const pricingStrategy = str(vContent?.pricingJustification ?? vContent?.pricingStrategy ?? vContent?.pricing);
  const pricing = pricingStrategy || ladderDescription ? {
    strategy: pricingStrategy || `Positionnement prix structure en ${ladder.length} paliers`,
    ladderDescription: ladderDescription || str(vContent?.pricingLadder ?? ""),
    competitorComparison: str(vContent?.competitorPricing) || null,
  } : {
    strategy: `Positionnement prix ${ctx.classification === "ICONE" || ctx.classification === "CULTE" ? "premium justifie par la valeur percue" : "competitif avec montee en valeur progressive"}`,
    ladderDescription: "Echelle de prix a definir selon segmentation client et offre concurrentielle",
    competitorComparison: null,
  };

  // ── Preuves : V.roiProofs (cas clients chiffrés) + valeur client tangible.
  const roiProofs = arr(vContent?.roiProofs).map((p: any) =>
    [str(p.client), str(p.beforeMetric) && str(p.afterMetric) ? `${str(p.beforeMetric)} → ${str(p.afterMetric)}` : str(p.lift), str(p.timeframe)]
      .filter(Boolean).join(" : "),
  ).filter(Boolean);
  let proofPoints = roiProofs.length > 0
    ? roiProofs
    : arr(vContent?.valeurClientTangible ?? vContent?.proofPoints ?? vContent?.preuves).map(str).filter(Boolean);
  if (proofPoints.length === 0) {
    proofPoints = [
      "Expertise reconnue dans le secteur " + ctx.sector,
      "Temoignages clients et cas d'usage documentes",
      "Methodologie proprietaire validee sur le terrain",
    ];
  }

  // ── Garanties : promesse de valeur V + promesse d'expérience E (engagements
  // réellement déclarés par la marque).
  let guarantees = [str(vContent?.promesseDeValeur), str(eContent?.promesseExperience)]
    .concat(arr(vContent?.guarantees ?? vContent?.garanties).map(str))
    .filter(Boolean);
  if (guarantees.length === 0) {
    guarantees = [
      "Engagement qualite sur chaque livrable",
      "Accompagnement personnalise et suivi de performance",
    ];
  }

  // ── Pipeline innovation : I.innovationsProduit (canonique).
  let innovationPipeline = arr(iContent?.innovationsProduit)
    .map((p: any) => `${str(p.name)}${str(p.horizon) ? ` (horizon ${str(p.horizon).toLowerCase()})` : ""}`)
    .filter((s: string) => s.trim().length > 0);
  if (innovationPipeline.length === 0) {
    innovationPipeline = arr(vContent?.innovation ?? vContent?.innovationPipeline).map(str).filter(Boolean);
  }
  if (innovationPipeline.length === 0) {
    innovationPipeline = [
      "R&D continue sur l'experience client",
      "Veille technologique et sectorielle integree",
    ];
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
  const ctx = _brandCtx(strategy);

  let touchpoints = arr(eContent?.touchpoints).map((t: any) => ({
    nom: str(t.nom ?? t.name), canal: str(t.canal ?? t.channel),
    qualite: str(t.qualite ?? "standard"), stadeAarrr: str(t.stadeAarrr ?? t.aarrStage ?? ""),
  }));

  // Backfill touchpoint names/fields
  if (touchpoints.length === 0 || touchpoints.every((t: any) => !t.nom)) {
    const defs = defaultTouchpoints(ctx);
    if (touchpoints.length === 0) {
      touchpoints = defs.map(d => ({ nom: d.nom, canal: d.canal, qualite: d.qualite, stadeAarrr: d.stadeAarrr }));
    } else {
      touchpoints = touchpoints.map((t: any, i: number) => {
        const def = defs[i] ?? defs[0]!;
        return { nom: t.nom || def.nom, canal: t.canal || def.canal, qualite: t.qualite || def.qualite, stadeAarrr: t.stadeAarrr || def.stadeAarrr };
      });
    }
  }

  let rituels = arr(eContent?.rituels ?? eContent?.rituals).map((r: any) => ({
    nom: str(r.nom ?? r.name), frequence: str(r.frequence ?? r.frequency),
    description: str(r.description), adoptionScore: r.adoptionScore ?? null,
  }));

  if (rituels.length === 0) {
    rituels = defaultRituels(ctx);
  }

  // ── Devotion pathway : triggers + barrières RÉELS du pilier E (canonique :
  // conversionTriggers {fromLevel,toLevel,trigger,channel} + barriersEngagement)
  // même sans snapshot DB — seuls les defaults de DISTRIBUTION restent quand
  // aucune mesure n'existe (audit NEFER 2026-06-11).
  const devSnap = strategy.devotionSnapshots?.[0];
  const realTriggers = arr(eContent?.conversionTriggers).map((t: any) => ({
    from: str(t.fromLevel ?? t.from), to: str(t.toLevel ?? t.to), trigger: str(t.trigger),
  })).filter((t: any) => t.trigger);
  const realBarriers = arr(eContent?.barriersEngagement ?? eContent?.barriers).map(str).filter(Boolean);
  const devotionPathway = {
    currentDistribution: devSnap ?? { spectateur: 40, interesse: 25, participant: 15, engage: 10, ambassadeur: 7, evangeliste: 3 },
    conversionTriggers: realTriggers.length > 0 ? realTriggers : [
      { from: "Spectateur", to: "Interesse", trigger: "Premier contenu engageant" },
      { from: "Interesse", to: "Participant", trigger: "Premier achat / essai" },
      { from: "Participant", to: "Engage", trigger: "Participation a un rituel de marque" },
      { from: "Engage", to: "Ambassadeur", trigger: "Premiere recommandation spontanee" },
      { from: "Ambassadeur", to: "Evangeliste", trigger: "Creation de contenu pro-marque" },
    ],
    barriers: realBarriers.length > 0 ? realBarriers : ["Manque de visibilite initiale", "Friction dans le parcours d'achat", "Absence de programme de fidelite structure"],
  };

  // ── Community strategy : champs canoniques E (principesCommunautaires +
  // communityBuilding) — `communityStrategy/community` n'ont jamais existé.
  const cb = (eContent?.communityBuilding ?? {}) as any;
  const principes = arr(eContent?.principesCommunautaires).map(str).filter(Boolean);
  const cbParts = [
    Array.isArray(cb.platforms) && cb.platforms.length > 0 ? `Plateformes : ${cb.platforms.map(str).join(", ")}` : "",
    str(cb.growthMechanics),
  ].filter(Boolean);
  const communityStrategy = str(eContent?.communityStrategy ?? eContent?.community)
    || [principes.slice(0, 3).join(" · "), ...cbParts].filter(Boolean).join(" — ")
    || `Construire une communaute engagee autour de ${ctx.name} via des rituels reguliers et du contenu co-cree`;

  return {
    touchpoints,
    rituels,
    devotionPathway,
    communityStrategy,
  };
}

export function mapSwotInterne(strategy: any): SwotInterneSection {
  const rContent = getPillarContent(strategy, "r") as any;
  const swot = (rContent?.globalSwot ?? {}) as any;
  const ctx = _brandCtx(strategy);

  let forces = arr(swot.strengths ?? rContent?.forces).map(str);
  let faiblesses = arr(swot.weaknesses ?? rContent?.faiblesses).map(str);
  let menaces = arr(swot.threats ?? rContent?.menaces).map(str);
  let opportunites = arr(swot.opportunities ?? rContent?.opportunites).map(str);

  // Default SWOT from vector scores when empty
  if (forces.length === 0 && faiblesses.length === 0) {
    const defSwot = defaultSwot(ctx);
    forces = defSwot.forces;
    faiblesses = defSwot.faiblesses;
    menaces = defSwot.menaces;
    opportunites = defSwot.opportunites;
  } else {
    if (menaces.length === 0) menaces = defaultSwot(ctx).menaces;
    if (opportunites.length === 0) opportunites = defaultSwot(ctx).opportunites;
  }

  let mitigations = arr(rContent?.mitigationPriorities).map((m: any) => ({
    risque: str(m.risk ?? m.risque), action: str(m.action), priorite: str(m.priority ?? m.priorite ?? "MEDIUM"),
  }));

  // Backfill risque names or use defaults
  if (mitigations.length === 0) {
    mitigations = defaultMitigations(ctx);
  } else if (mitigations.some((m: any) => !m.risque)) {
    const defMit = defaultMitigations(ctx);
    mitigations = mitigations.map((m: any, i: number) => ({
      risque: m.risque || defMit[i]?.risque || `Risque ${i + 1}`,
      action: m.action || defMit[i]?.action || "",
      priorite: m.priorite || defMit[i]?.priorite || "MEDIUM",
    }));
  }

  return {
    forces,
    faiblesses,
    menaces,
    opportunites,
    mitigations,
    resilienceScore: rContent?.resilienceScore ?? (ctx.vector.r > 0 ? Math.round(ctx.vector.r * 4) : null),
    artemisResults: [],
  };
}

export function mapSwotExterne(strategy: any): SwotExterneSection {
  const tContent = getPillarContent(strategy, "t") as any;
  const dContent = getPillarContent(strategy, "d") as any;
  const ctx = _brandCtx(strategy);

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

  // ── Tendances : T.marketReality.macroTrends (canonique) avant defaults.
  let tendances = arr(tContent?.marketReality?.macroTrends ?? tContent?.trends ?? tContent?.tendances).map(str).filter(Boolean);
  if (tendances.length === 0) {
    tendances = [
      `Digitalisation acceleree du secteur ${ctx.sector}`,
      "Montee en puissance des attentes d'authenticite et de transparence",
      "Emergence de communautes de marque comme levier de croissance",
      "Personnalisation de l'experience client comme standard",
    ];
  }

  // ── Brand-market fit : T.brandMarketFitScore canonique (0-100), gaps depuis
  // perceptionGap, opportunités depuis les signaux faibles marché.
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
      : ctx.vector.t > 0
        ? {
            score: Math.round(ctx.vector.t * 4),
            gaps: ["Notoriete a developper sur les segments secondaires", "Presence digitale a renforcer"],
            opportunities: ["Potentiel de croissance sur le marche domestique", "Niches sous-exploitees dans le secteur"],
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
  const ctx = _brandCtx(strategy);
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

  let opportunities = [...tarsisOpportunities, ...activationOpportunities, ...dbOpportunities].slice(0, 8);

  // Default opportunities when empty
  if (opportunities.length === 0) {
    opportunities = [
      { contexte: `Positionnement ${ctx.name} sur les tendances ${ctx.sector}`, canal: "Contenu expert + PR", timing: "Court terme", impact: "HIGH" },
      { contexte: "Activation communautaire sur evenements sectoriels", canal: "Social media + Evenementiel", timing: "Moyen terme", impact: "MEDIUM" },
      { contexte: "Partenariats strategiques avec acteurs complementaires", canal: "B2B / Co-branding", timing: "Moyen terme", impact: "HIGH" },
    ];
  }

  // Default weak signals when empty
  const finalSignals = weakSignals.length > 0 ? weakSignals : [
    { signal: `Evolution des attentes consommateurs dans le secteur ${ctx.sector}`, source: "Veille sectorielle", severity: "MEDIUM", detectedAt: new Date().toLocaleDateString("fr-FR") },
    { signal: "Emergence de nouveaux acteurs digitaux sur le marche", source: "Veille concurrentielle", severity: "LOW", detectedAt: new Date().toLocaleDateString("fr-FR") },
    { signal: "Changement reglementaire ou normatif impactant le secteur", source: "Veille reglementaire", severity: "LOW", detectedAt: new Date().toLocaleDateString("fr-FR") },
  ];

  return {
    signauxFaibles: finalSignals,
    opportunitesPriseDeParole: opportunities,
    mestorInsights: [],
    seshatReferences: [],
  };
}

export function mapCatalogueActions(strategy: any): CatalogueActionsSection {
  const iContent = getPillarContent(strategy, "i") as any;

  // ADR-0094 (Slice B2) — honest emptiness : no fabricated drivers/catalogue.
  // The catalogue reflects the real I-pillar content (materialized into the
  // BrandAction projection) ; an empty brand renders an empty section, not
  // invented actions that mislead the operator.
  const drivers = arr(strategy.drivers).map((d: any) => ({
    name: str(d.name), channel: str(d.channel), status: str(d.status),
  }));

  // ── Catalogue par canal : I.catalogueParCanal CANONIQUE (le champ `parCanal`
  // legacy n'a jamais existé dans le schéma — la section rendait toujours les
  // defaults inventés, audit NEFER 2026-06-11). Fallback legacy conservé.
  const rawParCanal = (iContent?.catalogueParCanal ?? iContent?.parCanal) as Record<string, any[]> | undefined;
  const hasRealCatalogue = !!rawParCanal && Object.values(rawParCanal).some((a) => Array.isArray(a) && a.length > 0);
  const parCanal = hasRealCatalogue ? rawParCanal! : {};

  // ── Par pilier : dérivé du catalogue réel via `pilierImpact` de chaque
  // action (champ canonique du schéma I). Fallback : actionsByDevotionLevel,
  // puis defaults.
  const derivedParPilier: Record<string, any[]> = {};
  if (hasRealCatalogue) {
    for (const actions of Object.values(rawParCanal!)) {
      if (!Array.isArray(actions)) continue;
      for (const a of actions) {
        const p = str((a as any)?.pilierImpact) || "TRANSVERSE";
        (derivedParPilier[p] ??= []).push(a);
      }
    }
  }
  const rawParPilier = (Object.keys(derivedParPilier).length > 0
    ? derivedParPilier
    : (iContent?.actionsByDevotionLevel ?? iContent?.parPilier)) as Record<string, any[]> | undefined;
  const parPilier = (rawParPilier && Object.keys(rawParPilier).length > 0)
    ? rawParPilier
    : {};

  const totalFromCanal = Object.values(parCanal).reduce((sum, actions) => sum + (Array.isArray(actions) ? actions.length : 0), 0);
  const totalActions = typeof iContent?.totalActions === "number" && iContent.totalActions > 0
    ? iContent.totalActions
    : Math.max(drivers.length + arr(iContent?.actions).length, totalFromCanal);

  return {
    parCanal,
    parPilier,
    totalActions,
    drivers,
  };
}

export function mapFenetreOverton(strategy: any): FenetreOvertonSection {
  const sContent = getPillarContent(strategy, "s") as any;
  const ctx = _brandCtx(strategy);

  // ADR-0088 — perceptions/strategy live under S.fenetreOverton (nested).
  const fo = sContent?.fenetreOverton as any;
  const perceptionActuelle = str(sContent?.perceptionActuelle ?? fo?.perceptionActuelle ?? sContent?.currentPerception) || `${ctx.name} est percu comme un acteur ${ctx.classification === "ICONE" || ctx.classification === "CULTE" ? "majeur" : "emergent"} du secteur ${ctx.sector}`;
  const perceptionCible = str(sContent?.perceptionCible ?? fo?.perceptionCible ?? sContent?.targetPerception ?? sContent?.ambition) || `${ctx.name} comme reference incontournable et marque a laquelle on s'identifie dans le ${ctx.sector}`;
  const ecart = str(sContent?.ecart ?? fo?.ecart ?? sContent?.gap) || "Combler le gap entre notoriete actuelle et statut de marque culturelle aspirationnel";

  let strategieDeplacment = arr(sContent?.overtonStrategy ?? sContent?.displacementStrategy ?? fo?.strategieDeplacement).map((s: any) => ({
    etape: str(s.etape ?? s.step), action: str(s.action),
    canal: str(s.canal ?? s.channel ?? ""), horizon: str(s.horizon ?? s.timeline ?? ""),
  }));

  if (strategieDeplacment.length === 0) {
    strategieDeplacment = defaultOvertonStrategy(ctx);
  }

  let roadmap = arr(sContent?.roadmap).map((r: any) => ({
    phase: str(r.phase), objectif: str(r.objectif ?? r.objective),
    livrables: arr(r.livrables ?? r.deliverables).map(str),
    budget: r.budget ?? null, duree: str(r.duree ?? r.duration ?? ""),
  }));

  // Backfill roadmap objectifs/livrables or use defaults
  if (roadmap.length === 0 || roadmap.every((r: any) => !r.objectif && r.livrables.length === 0)) {
    roadmap = defaultRoadmap(ctx);
  } else {
    const defR = defaultRoadmap(ctx);
    roadmap = roadmap.map((r: any, i: number) => ({
      phase: r.phase || defR[i]?.phase || `Phase ${i + 1}`,
      objectif: r.objectif || defR[i]?.objectif || "",
      livrables: r.livrables.length > 0 ? r.livrables : defR[i]?.livrables ?? [],
      budget: r.budget ?? defR[i]?.budget ?? null,
      duree: r.duree || defR[i]?.duree || "",
    }));
  }

  let jalons = arr(sContent?.jalons ?? sContent?.milestones).map((j: any) => ({
    date: str(j.date), milestone: str(j.milestone ?? j.label), critereSucces: str(j.critere ?? j.criteria ?? ""),
  }));

  if (jalons.length === 0) {
    jalons = defaultJalons(ctx);
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
  const ctx = _brandCtx(strategy);
  const superfans = arr(strategy.superfanProfiles);
  const cultSnap = strategy.cultIndexSnapshots?.[0];

  // ── Portrait : E.superfanPortrait canonique = {personaRef, motivations,
  // barriers, profile}. `nom/age/description` legacy n'existent pas dans le
  // schéma (audit NEFER 2026-06-11) — le nom est résolu via personaRef →
  // D.personas, la description vient de `profile`.
  const rawPortrait = eContent?.superfanPortrait ?? eContent?.idealCustomer;
  const dContent = getPillarContent(strategy, "d") as any;
  const personaName = (() => {
    const ref = str(rawPortrait?.personaRef);
    if (!ref) return "";
    const persona = arr(dContent?.personas).find((p: any) => p.id === ref || str(p.nom ?? p.name) === ref);
    return str(persona?.nom ?? persona?.name ?? ref);
  })();
  const portrait = rawPortrait ? {
    nom: str(rawPortrait.nom ?? rawPortrait.name) || personaName || `Le Superfan ${ctx.name}`,
    trancheAge: str(rawPortrait.age ?? rawPortrait.trancheAge) || "25-40",
    description: str(rawPortrait.profile ?? rawPortrait.description) || defaultSuperfanPortrait(ctx).description,
    motivations: arr(rawPortrait.motivations).map(str).filter(Boolean),
    freins: arr(rawPortrait.barriers ?? rawPortrait.freins).map(str).filter(Boolean),
  } : defaultSuperfanPortrait(ctx);

  // Ensure motivations/freins are never empty
  if (portrait.motivations.length === 0) portrait.motivations = defaultSuperfanPortrait(ctx).motivations;
  if (portrait.freins.length === 0) portrait.freins = defaultSuperfanPortrait(ctx).freins;

  // ── Parcours Devotion : E.conversionTriggers canonique
  // ({fromLevel, toLevel, trigger, channel}) — la progression réelle déclarée.
  let parcoursDevotionCible = arr(eContent?.conversionTriggers).map((p: any) => ({
    palier: [str(p.fromLevel), str(p.toLevel)].filter(Boolean).join(" → ") || str(p.palier ?? p.tier),
    trigger: str(p.trigger),
    experience: str(p.channel ?? p.experience ?? ""),
  })).filter((p: any) => p.palier || p.trigger);

  if (parcoursDevotionCible.length === 0) {
    parcoursDevotionCible = arr(eContent?.devotionJourney).map((p: any) => ({
      palier: str(p.palier ?? p.tier), trigger: str(p.trigger), experience: str(p.experience ?? ""),
    }));
  }

  if (parcoursDevotionCible.length === 0) {
    parcoursDevotionCible = defaultDevotionJourney();
  }

  const actifs = superfans.filter((s: any) => s.engagementDepth >= 0.8).length;
  const evangelistes = superfans.filter((s: any) => s.segment === "evangeliste" || s.engagementDepth >= 0.95).length;

  // Cult index — ADR-0046 + ADR-0047 ; no magic fallback, DevotionLadderTier strict.
  const cultIndex = (() => {
    if (!cultSnap) return null;
    const parsedTier = parseDevotionLadderTier(cultSnap.tier);
    if (!parsedTier) return null;
    return { score: cultSnap.compositeScore, tier: parsedTier };
  })();

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
  const ctx = _brandCtx(strategy);

  // ── Boucles de croissance : E.programmeEvangelisation (referral / advocacy /
  // recrutement communautaire) + E.gamification — les vraies boucles déclarées
  // du pilier Engagement (audit NEFER 2026-06-11 : growthLoops n'a jamais
  // existé dans les schémas). Fallback legacy puis defaults.
  const prog = (eContent?.programmeEvangelisation ?? {}) as any;
  const evangelisationLoops = [
    prog.referralProgram ? { nom: "Boucle referral", type: "referral", potentielViral: null, plan: str(prog.referralProgram) } : null,
    prog.brandAdvocacyProgram ? { nom: "Boucle advocacy", type: "evangelisation", potentielViral: null, plan: str(prog.brandAdvocacyProgram) } : null,
    prog.communityRecruitment ? { nom: "Boucle communautaire", type: "communaute", potentielViral: null, plan: str(prog.communityRecruitment) } : null,
  ].filter(Boolean) as Array<{ nom: string; type: string; potentielViral: null; plan: string }>;

  let bouclesCroissance = evangelisationLoops.length > 0
    ? evangelisationLoops
    : arr(sContent?.growthLoops ?? iContent?.growthLoops).map((b: any) => ({
        nom: str(b.nom ?? b.name), type: str(b.type ?? "organique"),
        potentielViral: b.viralPotential ?? null, plan: str(b.plan ?? b.description ?? ""),
      }));

  if (bouclesCroissance.length === 0) {
    bouclesCroissance = defaultGrowthLoops(ctx);
  }

  // ── Expansion : phases tardives de la roadmap S (au-delà de 6 mois) —
  // la trajectoire d'expansion réellement planifiée. Fallback legacy/defaults.
  const roadmapPhases = arr(sContent?.roadmap);
  const expansionFromRoadmap = roadmapPhases.slice(2).map((r: any, i: number) => ({
    marche: str(r.phase),
    priorite: i + 1,
    planEntree: str(r.objectif ?? ""),
  })).filter((e: any) => e.marche && e.planEntree);

  let expansionStrategy = expansionFromRoadmap.length > 0
    ? expansionFromRoadmap
    : arr(sContent?.expansion).map((e: any) => ({
        marche: str(e.marche ?? e.market), priorite: e.priorite ?? e.priority ?? 0,
        planEntree: str(e.plan ?? e.entryPlan ?? ""),
      }));

  // Default expansion when empty or all fields blank
  if (expansionStrategy.length === 0 || expansionStrategy.every((e: any) => !e.marche && !e.planEntree)) {
    expansionStrategy = defaultExpansion(ctx);
  }

  // ── Évolution de marque : S.visionStrategique / syntheseExecutive comme
  // trajectoire ; les 3 trajectoires calculées (ADR-0089) comme scénarios —
  // données réelles à la place des pivots génériques.
  const computed = (sContent?.computed ?? {}) as any;
  const routeScenarios = arr(computed.roadmapRoutes).map((r: any) =>
    `${str(r.label)}${r.selected ? " (retenue)" : r.recommended ? " (recommandée)" : ""} — +${r.projectedGrowthPct}% de croissance projetée, Cult Index cible ${r.targetCultIndex}/100. ${str(r.description)}`,
  ).filter(Boolean);

  const trajectoire = str(sContent?.visionStrategique)
    || str(sContent?.syntheseExecutive).slice(0, 300)
    || `${ctx.name} evolue de marque ${ctx.classification.toLowerCase()} vers un statut culturel en consolidant ses 4 piliers ADVE`;

  const extensionInnovations = arr(iContent?.innovationsProduit)
    .filter((p: any) => typeof p.type === "string" && p.type.startsWith("EXTENSION"))
    .map((p: any) => `${str(p.name)} — ${str(p.description)}`.replace(/ — $/, ""))
    .filter(Boolean);

  const evolutionMarque = {
    trajectoire,
    scenariosPivot: routeScenarios.length > 0 ? routeScenarios : arr(sContent?.evolution?.pivotScenarios).map(str).filter(Boolean).length > 0
      ? arr(sContent.evolution.pivotScenarios).map(str)
      : [
          "Pivot premium — monter en gamme pour renforcer la perception de valeur",
          "Pivot communautaire — investir massivement dans l'engagement pour creer un mouvement",
          "Pivot digital-first — concentrer les ressources sur l'experience numerique",
        ],
    extensionsMarque: extensionInnovations.length > 0 ? extensionInnovations : [
      "Extension de gamme verticale (montee en gamme)",
      "Extension horizontale (categories adjacentes)",
      "Extension experiencielle (services complementaires)",
    ],
  };

  // ── Pipeline innovation : I.innovationsProduit CANONIQUE
  // ({name, type, description, feasibility, horizon, devotionImpact}).
  let pipelineInnovation = arr(iContent?.innovationsProduit).map((p: any) => ({
    initiative: str(p.name),
    impact: str(p.devotionImpact ?? p.type ?? ""),
    faisabilite: str(p.feasibility ?? ""),
    timeToMarket: str(p.horizon ?? ""),
  })).filter((p: any) => p.initiative);

  if (pipelineInnovation.length === 0) {
    pipelineInnovation = arr(iContent?.innovationPipeline ?? sContent?.innovationPipeline).map((p: any) => ({
      initiative: str(p.initiative ?? p.name), impact: str(p.impact ?? ""),
      faisabilite: str(p.feasibility ?? p.faisabilite ?? ""), timeToMarket: str(p.ttm ?? p.timeToMarket ?? ""),
    }));
  }

  // Default innovation pipeline when empty
  if (pipelineInnovation.length === 0) {
    pipelineInnovation = defaultInnovationPipeline(ctx);
  }

  return {
    bouclesCroissance,
    expansionStrategy,
    evolutionMarque,
    pipelineInnovation,
  };
}

// ─── Brand context cache for mappers ────────────────────────────────────────

const _ctxCache = new WeakMap<object, BrandContext>();

function _brandCtx(strategy: any): BrandContext {
  if (_ctxCache.has(strategy)) return _ctxCache.get(strategy)!;
  const vector = (strategy.advertis_vector as AdvertisVector | null) ?? createEmptyVector();
  const classification = classifyBrand(vector.composite);
  const ctx = extractBrandContext(strategy, vector, classification);
  _ctxCache.set(strategy, ctx);
  return ctx;
}

// Aliases for new mappers (reuse existing helpers)
function str(val: unknown): string {
  return safeStr(val) ?? (typeof val === "number" ? String(val) : "");
}
function arr(val: unknown): any[] {
  return safeArr(val) as any[];
}

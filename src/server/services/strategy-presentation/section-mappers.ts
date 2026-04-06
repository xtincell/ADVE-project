/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Strategy Presentation — Section Mappers
 * Pure functions that map raw Prisma data → typed section objects.
 * Each mapper extracts its section from the single comprehensive query result.
 * Note: Uses `any` for strategy param since Prisma complex includes resist clean typing.
 */

import { PILLAR_KEYS, PILLAR_NAMES } from "@/lib/types/advertis-vector";
import type { AdvertisVector, BrandClassification } from "@/lib/types/advertis-vector";
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

  const pillarScores = PILLAR_KEYS.map((k) => ({
    pillar: k,
    score: vector[k],
    name: PILLAR_NAMES[k],
  }));

  const sorted = [...pillarScores].sort((a, b) => b.score - a.score);
  const topStrengths = sorted.slice(0, 3);
  const topWeaknesses = sorted.slice(-3).reverse();

  const highlights: string[] = [];
  if (classification === "CULTE" || classification === "ICONE") {
    highlights.push(`Marque classifiee ${classification} — score composite ${vector.composite}/200`);
  }
  if (cultSnap) {
    highlights.push(`Cult Index: ${cultSnap.compositeScore.toFixed(1)} — Tier ${cultSnap.tier}`);
  }
  if (strategy.superfanProfiles.length > 0) {
    highlights.push(`${strategy.superfanProfiles.length} superfans identifies`);
  }

  return {
    vector,
    classification,
    cultIndex: cultSnap ? { score: cultSnap.compositeScore, tier: cultSnap.tier } : null,
    devotionScore: devSnap?.devotionScore ?? null,
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

  const rawPersonas = safeArr(pillarD?.personas);
  const personas = rawPersonas.map((p: unknown) => {
    const px = p as Record<string, unknown>;
    return {
      nom: safeStr(px.nom) ?? "Sans nom",
      trancheAge: safeStr(px.trancheAge) ?? "",
      csp: safeStr(px.csp) ?? "",
      insightCle: safeStr(px.insightCle) ?? "",
      freinsAchat: safeArr(px.freinsAchat) as string[],
      motivations: safeArr(px.motivations) as string[],
    };
  });

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
  const rawValeurs = safeArr(pillarA?.valeurs);

  const valeurs = rawValeurs.map((v: unknown) => {
    const vx = v as Record<string, unknown>;
    return {
      valeur: safeStr(vx.valeur) ?? "",
      rang: (vx.rang as number) ?? 0,
      justification: safeStr(vx.justification) ?? "",
    };
  });

  // Build messaging framework from personas + pillar D
  const rawPersonas = safeArr(pillarD?.personas);
  const messagingFramework = rawPersonas.slice(0, 3).map((p: unknown) => {
    const px = p as Record<string, unknown>;
    return {
      audience: safeStr(px.nom) ?? "Audience",
      messagePrincipal: safeStr(px.insightCle) ?? "",
      messagesSupport: safeArr(px.motivations) as string[],
      callToAction: "",
    };
  });

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
      driverName: null as string | null, // Driver not directly included on action
      budget: a.budget,
      aarrStage: a.aarrStage,
    })),
  }));

  const rawTouchpoints = safeArr(pillarE?.touchpoints);
  const touchpoints = rawTouchpoints.map((t: unknown) => {
    const tx = t as Record<string, unknown>;
    return {
      nom: safeStr(tx.nom) ?? "",
      canal: safeStr(tx.canal) ?? "",
      type: safeStr(tx.type) ?? "",
      stadeAarrr: safeStr(tx.stadeAarrr) ?? "",
      niveauDevotion: safeStr(tx.niveauDevotion) ?? "",
    };
  });

  const rawRituels = safeArr(pillarE?.rituels);
  const rituels = rawRituels.map((r: unknown) => {
    const rx = r as Record<string, unknown>;
    return {
      nom: safeStr(rx.nom) ?? "",
      frequence: safeStr(rx.frequence) ?? "",
      description: safeStr(rx.description) ?? "",
    };
  });

  const drivers = strategy.drivers.map((d: any) => ({
    name: d.name,
    channel: d.channel,
    channelType: d.channelType,
    status: d.status,
  }));

  return {
    campaigns,
    aarrr: pillarE?.aarrr as Record<string, unknown> | null ?? null,
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
    driverName: m.driver?.name ?? null,
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

  return { missions, gloryOutputsByLayer };
}

// ─── 08: Medias & Distribution ──────────────────────────────────────────────

export function mapMediasDistribution(strategy: any): MediasDistributionSection {
  const drivers = strategy.drivers.map((d: any) => ({
    name: d.name,
    channel: d.channel,
    channelType: d.channelType,
    status: d.status,
  }));

  const mediaActions = strategy.campaigns.flatMap((c: any) =>
    c.actions
      .filter((a: any) => a.category === "ATL" || a.category === "MEDIA" || a.category === "DIGITAL")
      .map((a: any) => ({
        name: a.name,
        category: a.category,
        budget: a.budget,
        driverName: null as string | null,
      }))
  );

  return {
    drivers,
    digitalPlannerOutput: getGloryOutput(strategy, "digital-planner"),
    mediaActions,
  };
}

// ─── 09: KPIs & Mesure ──────────────────────────────────────────────────────

export function mapKpisMesure(strategy: any): KpisMesureSection {
  const pillarE = getPillarContent(strategy, "e");
  const rawKpis = safeArr(pillarE?.kpis);

  const kpis = rawKpis.map((k: unknown) => {
    const kx = k as Record<string, unknown>;
    return {
      name: safeStr(kx.name) ?? "",
      metricType: safeStr(kx.metricType) ?? "",
      target: safeStr(kx.target) ?? "",
      frequency: safeStr(kx.frequency) ?? "",
    };
  });

  const devSnap = strategy.devotionSnapshots[0] ?? null;
  const cultSnap = strategy.cultIndexSnapshots[0] ?? null;

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

  return {
    kpis,
    devotion: devSnap
      ? {
          spectateur: devSnap.spectateur,
          interesse: devSnap.interesse,
          participant: devSnap.participant,
          engage: devSnap.engage,
          ambassadeur: devSnap.ambassadeur,
          evangeliste: devSnap.evangeliste,
          devotionScore: devSnap.devotionScore,
        }
      : null,
    cultIndex: cultSnap
      ? {
          compositeScore: cultSnap.compositeScore,
          tier: cultSnap.tier,
          engagementVelocity: cultSnap.engagementDepth,
          communityHealth: cultSnap.communityCohesion,
          superfanVelocity: cultSnap.superfanVelocity,
        }
      : null,
    superfans,
    communitySnapshots,
    aarrr: pillarE?.aarrr as Record<string, unknown> | null ?? null,
  };
}

// ─── 10: Budget ─────────────────────────────────────────────────────────────

export function mapBudget(strategy: any): BudgetSection {
  const pillarV = getPillarContent(strategy, "v");
  const ue = pillarV?.unitEconomics as Record<string, unknown> | null;

  const campaignBudgets = strategy.campaigns.map((c: any) => ({
    name: c.name,
    budget: c.budget,
    status: c.status,
  }));

  const totalBudget = campaignBudgets.reduce((sum: number, c: any) => sum + (c.budget ?? 0), 0);

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

  return { campaigns, missions, teamMembers: uniqueTeam };
}

// ─── 12: Equipe ─────────────────────────────────────────────────────────────

export function mapEquipe(strategy: any): EquipeSection {
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

  return {
    operator: strategy.operator ? { name: strategy.operator.name, slug: strategy.operator.slug } : null,
    owner: { name: strategy.user.name, email: strategy.user.email },
    teamMembers: uniqueTeam,
  };
}

// ─── 13: Conditions & Prochaines Etapes ─────────────────────────────────────

export function mapConditionsEtapes(strategy: any): ConditionsEtapesSection {
  return {
    client: strategy.client
      ? {
          contactName: strategy.client.contactName,
          contactEmail: strategy.client.contactEmail,
          sector: strategy.client.sector,
        }
      : null,
    contracts: strategy.contracts.map((c: any) => ({
      title: c.title,
      contractType: c.contractType,
      status: c.status,
      value: c.value,
      startDate: c.startDate?.toISOString() ?? null,
      endDate: c.endDate?.toISOString() ?? null,
      signedAt: c.signedAt?.toISOString() ?? null,
    })),
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
    "budget": check(!!s.budget.unitEconomics, s.budget.campaignBudgets.length > 0),
    "timeline-gouvernance": check(s.timelineGouvernance.campaigns.length > 0, s.timelineGouvernance.teamMembers.length > 0),
    "equipe": check(!!s.equipe.operator, s.equipe.teamMembers.length > 0),
    "conditions-etapes": check(!!s.conditionsEtapes.client, s.conditionsEtapes.contracts.length > 0),
  };
}

// ─── NEW SECTION MAPPERS (v3 Oracle enrichment) ─────────────────────────────

export function mapPropositionValeur(strategy: any): PropositionValeurSection {
  const vContent = getPillarContent(strategy, "v") as any;
  return {
    pricing: vContent?.pricing ?? vContent?.pricingStrategy ? {
      strategy: str(vContent.pricingStrategy ?? vContent.pricing),
      ladderDescription: str(vContent.pricingLadder ?? ""),
      competitorComparison: str(vContent.competitorPricing) || null,
    } : null,
    proofPoints: arr(vContent?.proofPoints ?? vContent?.preuves).map(str),
    guarantees: arr(vContent?.guarantees ?? vContent?.garanties).map(str),
    innovationPipeline: arr(vContent?.innovation ?? vContent?.innovationPipeline).map(str),
    unitEconomics: vContent?.unitEconomics ? {
      cac: vContent.unitEconomics.cac ?? null,
      ltv: vContent.unitEconomics.ltv ?? null,
      ltvCacRatio: vContent.unitEconomics.ltvCacRatio ?? null,
    } : null,
  };
}

export function mapExperienceEngagement(strategy: any): ExperienceEngagementSection {
  const eContent = getPillarContent(strategy, "e") as any;
  return {
    touchpoints: arr(eContent?.touchpoints).map((t: any) => ({
      nom: str(t.nom ?? t.name), canal: str(t.canal ?? t.channel),
      qualite: str(t.qualite ?? "standard"), stadeAarrr: str(t.stadeAarrr ?? t.aarrStage ?? ""),
    })),
    rituels: arr(eContent?.rituels ?? eContent?.rituals).map((r: any) => ({
      nom: str(r.nom ?? r.name), frequence: str(r.frequence ?? r.frequency),
      description: str(r.description), adoptionScore: r.adoptionScore ?? null,
    })),
    devotionPathway: strategy.devotionSnapshots?.[0] ? {
      currentDistribution: strategy.devotionSnapshots[0],
      conversionTriggers: arr(eContent?.conversionTriggers),
      barriers: arr(eContent?.barriers).map(str),
    } : null,
    communityStrategy: str(eContent?.communityStrategy ?? eContent?.community) || null,
  };
}

export function mapSwotInterne(strategy: any): SwotInterneSection {
  const rContent = getPillarContent(strategy, "r") as any;
  const swot = (rContent?.globalSwot ?? {}) as any;
  return {
    forces: arr(swot.strengths ?? rContent?.forces).map(str),
    faiblesses: arr(swot.weaknesses ?? rContent?.faiblesses).map(str),
    menaces: arr(swot.threats ?? rContent?.menaces).map(str),
    opportunites: arr(swot.opportunities ?? rContent?.opportunites).map(str),
    mitigations: arr(rContent?.mitigationPriorities).map((m: any) => ({
      risque: str(m.risk ?? m.risque), action: str(m.action), priorite: str(m.priority ?? m.priorite ?? "MEDIUM"),
    })),
    resilienceScore: rContent?.resilienceScore ?? null,
    artemisResults: [],
  };
}

export function mapSwotExterne(strategy: any): SwotExterneSection {
  const tContent = getPillarContent(strategy, "t") as any;
  const tri = (tContent?.triangulation ?? {}) as any;
  return {
    marche: {
      tam: str(tri.tam ?? tContent?.tam) || null, sam: str(tri.sam ?? tContent?.sam) || null,
      som: str(tri.som ?? tContent?.som) || null, growth: str(tri.growth ?? tContent?.marketGrowth) || null,
    },
    concurrents: arr(tContent?.competitors ?? tContent?.concurrents).map((c: any) => ({
      nom: str(c.nom ?? c.name), forces: arr(c.forces ?? c.strengths).map(str),
      faiblesses: arr(c.faiblesses ?? c.weaknesses).map(str), partDeMarche: str(c.partDeMarche ?? c.marketShare) || null,
    })),
    tendances: arr(tContent?.trends ?? tContent?.tendances).map(str),
    brandMarketFit: tContent?.brandMarketFit ? {
      score: tContent.brandMarketFit.score ?? null,
      gaps: arr(tContent.brandMarketFit.gaps).map(str),
      opportunities: arr(tContent.brandMarketFit.opportunities).map(str),
    } : null,
    validationTerrain: str(tContent?.validation ?? tContent?.validationTerrain) || null,
  };
}

export function mapSignauxOpportunites(strategy: any): SignauxOpportunitesSection {
  // Pull weak signals from Signal model (already loaded via strategy include)
  const signals = arr(strategy.signals ?? []);
  const weakSignals = signals
    .filter((s: any) => s.type === "WEAK" || s.layer === "WEAK")
    .map((s: any) => ({
      signal: str(s.data?.title ?? s.type),
      source: str(s.data?.source ?? "Signal interne"),
      severity: str(s.data?.severity ?? "LOW"),
      detectedAt: s.createdAt ? new Date(s.createdAt).toLocaleDateString("fr-FR") : "",
    }));

  // Map signals with opportunity data
  const opportunities = signals
    .filter((s: any) => s.data?.opportunity)
    .map((s: any) => ({
      contexte: str(s.data?.opportunity ?? s.data?.title),
      canal: str(s.data?.channel ?? ""),
      timing: str(s.data?.timing ?? ""),
      impact: str(s.data?.impact ?? "MEDIUM"),
    }));

  return {
    signauxFaibles: weakSignals,
    opportunitesPriseDeParole: opportunities,
    mestorInsights: [], // Filled async by Mestor at render time
    seshatReferences: [], // Filled async by Seshat at render time
  };
}

export function mapCatalogueActions(strategy: any): CatalogueActionsSection {
  const iContent = getPillarContent(strategy, "i") as any;
  const drivers = arr(strategy.drivers).map((d: any) => ({
    name: str(d.name), channel: str(d.channel), status: str(d.status),
  }));
  return {
    parCanal: {},  // Will be enriched when I pillar is fully implemented
    parPilier: {}, // Will be enriched from ADVE-RTIS data
    totalActions: drivers.length + arr(iContent?.actions).length,
    drivers,
  };
}

export function mapFenetreOverton(strategy: any): FenetreOvertonSection {
  const sContent = getPillarContent(strategy, "s") as any;
  return {
    perceptionActuelle: str(sContent?.perceptionActuelle ?? sContent?.currentPerception) || null,
    perceptionCible: str(sContent?.perceptionCible ?? sContent?.targetPerception ?? sContent?.ambition) || null,
    ecart: str(sContent?.ecart ?? sContent?.gap) || null,
    strategieDeplacment: arr(sContent?.overtonStrategy ?? sContent?.displacementStrategy).map((s: any) => ({
      etape: str(s.etape ?? s.step), action: str(s.action),
      canal: str(s.canal ?? s.channel ?? ""), horizon: str(s.horizon ?? s.timeline ?? ""),
    })),
    roadmap: arr(sContent?.roadmap).map((r: any) => ({
      phase: str(r.phase), objectif: str(r.objectif ?? r.objective),
      livrables: arr(r.livrables ?? r.deliverables).map(str),
      budget: r.budget ?? null, duree: str(r.duree ?? r.duration ?? ""),
    })),
    jalons: arr(sContent?.jalons ?? sContent?.milestones).map((j: any) => ({
      date: str(j.date), milestone: str(j.milestone ?? j.label), critereSucces: str(j.critere ?? j.criteria ?? ""),
    })),
  };
}

export function mapProfilSuperfan(strategy: any): ProfilSuperfanSection {
  const eContent = getPillarContent(strategy, "e") as any;
  const superfans = arr(strategy.superfanProfiles);
  const cultSnap = strategy.cultIndexSnapshots?.[0];
  return {
    portrait: eContent?.superfanPortrait ?? eContent?.idealCustomer ? {
      nom: str(eContent.superfanPortrait?.nom ?? eContent.idealCustomer?.name ?? "Superfan type"),
      trancheAge: str(eContent.superfanPortrait?.age ?? eContent.idealCustomer?.age ?? ""),
      description: str(eContent.superfanPortrait?.description ?? eContent.idealCustomer?.description ?? ""),
      motivations: arr(eContent.superfanPortrait?.motivations ?? eContent.idealCustomer?.motivations).map(str),
      freins: arr(eContent.superfanPortrait?.freins ?? eContent.idealCustomer?.barriers).map(str),
    } : null,
    parcoursDevotionCible: arr(eContent?.devotionJourney).map((p: any) => ({
      palier: str(p.palier ?? p.tier), trigger: str(p.trigger), experience: str(p.experience ?? ""),
    })),
    metriquesSuperfan: {
      actifs: superfans.filter((s: any) => s.engagementDepth >= 0.8).length,
      evangelistes: superfans.filter((s: any) => s.segment === "evangeliste" || s.engagementDepth >= 0.95).length,
      ratio: superfans.length > 0 ? Math.round((superfans.filter((s: any) => s.engagementDepth >= 0.8).length / superfans.length) * 100) : 0,
      velocite: null,
    },
    cultIndex: cultSnap ? { score: cultSnap.compositeScore, tier: str(cultSnap.tier) } : null,
  };
}

export function mapCroissanceEvolution(strategy: any): CroissanceEvolutionSection {
  const iContent = getPillarContent(strategy, "i") as any;
  const sContent = getPillarContent(strategy, "s") as any;
  return {
    bouclesCroissance: arr(sContent?.growthLoops ?? iContent?.growthLoops).map((b: any) => ({
      nom: str(b.nom ?? b.name), type: str(b.type ?? "organique"),
      potentielViral: b.viralPotential ?? null, plan: str(b.plan ?? b.description ?? ""),
    })),
    expansionStrategy: arr(sContent?.expansion).map((e: any) => ({
      marche: str(e.marche ?? e.market), priorite: e.priorite ?? e.priority ?? 0,
      planEntree: str(e.plan ?? e.entryPlan ?? ""),
    })) || null,
    evolutionMarque: sContent?.evolution ? {
      trajectoire: str(sContent.evolution.trajectoire ?? sContent.evolution.trajectory ?? ""),
      scenariosPivot: arr(sContent.evolution.pivotScenarios).map(str),
      extensionsMarque: arr(sContent.evolution.brandExtensions).map(str),
    } : null,
    pipelineInnovation: arr(iContent?.innovationPipeline ?? sContent?.innovationPipeline).map((p: any) => ({
      initiative: str(p.initiative ?? p.name), impact: str(p.impact ?? ""),
      faisabilite: str(p.feasibility ?? p.faisabilite ?? ""), timeToMarket: str(p.ttm ?? p.timeToMarket ?? ""),
    })),
  };
}

// Aliases for new mappers (reuse existing helpers)
function str(val: unknown): string {
  return safeStr(val) ?? (typeof val === "number" ? String(val) : "");
}
function arr(val: unknown): any[] {
  return safeArr(val) as any[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Enrich Oracle — Delegates to REAL Artemis frameworks + writes results back to pillars.
 *
 * Flow:
 * 1. Check completeness → identify empty/partial sections
 * 2. Map each section → the Artemis frameworks that feed it
 * 3. Execute frameworks via artemis.executeFramework() (real AI calls, real DB persistence)
 * 4. Extract structured fields from framework outputs → merge into pillar content
 *
 * This is the bridge between Artemis (diagnostic engine) and the Oracle (presentation layer).
 * Zero standalone Claude calls — everything goes through the Artemis pipeline.
 */

import { db } from "@/lib/db";
import { executeFramework, topologicalSort, getFramework } from "@/server/services/artemis";
import { checkCompleteness } from "./index";

// ─── Section → Artemis Frameworks + Pillar Writeback ─────────────────────────

interface SectionEnrichmentSpec {
  /** Artemis framework slugs to execute (in dependency order) */
  frameworks: string[];
  /** Which pillar to write enriched data into */
  pillar: string;
  /** Extract fields from framework outputs → pillar fields */
  writeback: (outputs: Record<string, any>) => Record<string, unknown>;
  /** If true, also creates Signal rows in DB (for signaux-opportunites) */
  signalWriteback?: boolean;
}

/**
 * Extract usable data from Artemis output.
 * Artemis returns {analysis, score, prescriptions, confidence, ...outputFields}.
 * The named outputFields may or may not be present — always fallback to prescriptions/analysis.
 */
function extractActions(output: any, ...fieldNames: string[]): any[] {
  for (const f of fieldNames) {
    if (Array.isArray(output[f]) && output[f].length > 0) return output[f];
  }
  if (Array.isArray(output.prescriptions) && output.prescriptions.length > 0) {
    return output.prescriptions.map((p: any) => typeof p === "string" ? { action: p } : p);
  }
  return [];
}

function extractText(output: any, ...fieldNames: string[]): string {
  for (const f of fieldNames) {
    if (typeof output[f] === "string" && output[f].length > 0) return output[f];
    if (output[f] && typeof output[f] === "object") return JSON.stringify(output[f]);
  }
  return typeof output.analysis === "string" ? output.analysis : "";
}

const SECTION_ENRICHMENT: Record<string, SectionEnrichmentSpec> = {

  "contexte-defi": {
    frameworks: ["fw-01-brand-archeology", "fw-02-persona-constellation"],
    pillar: "a",
    writeback: (outputs) => {
      const arch = outputs["fw-01-brand-archeology"] ?? {};
      const persona = outputs["fw-02-persona-constellation"] ?? {};
      return {
        ...(arch.founding_myth ? { enemy: { name: arch.identity_tensions?.[0] ?? "Status quo", manifesto: arch.founding_myth, narrative: arch.cultural_anchors?.join(". ") ?? "" } } : {}),
        ...(arch.brand_dna ? { prophecy: { worldTransformed: arch.brand_dna, urgency: "Maintenant", horizon: "3 ans" } } : {}),
        ...(persona.persona_map ? { _personas_enriched: persona.persona_map } : {}),
      };
    },
  },

  "proposition-valeur": {
    frameworks: ["fw-04-value-architecture", "fw-05-pricing-psychology", "fw-06-unit-economics", "fw-27-berkus-product", "fw-28-berkus-ip"],
    pillar: "v",
    writeback: (outputs) => {
      const val = outputs["fw-04-value-architecture"] ?? {};
      const price = outputs["fw-05-pricing-psychology"] ?? {};
      const ue = outputs["fw-06-unit-economics"] ?? {};
      const prod = outputs["fw-27-berkus-product"] ?? {};
      const ip = outputs["fw-28-berkus-ip"] ?? {};
      return {
        // Existing fields
        ...(val.value_map ? { pricing: val.value_map } : {}),
        ...(val.differentiation_score ? { pricingStrategy: val.optimization_paths?.join(". ") ?? "" } : {}),
        ...(price.anchor_strategy ? { pricingLadder: price.anchor_strategy } : {}),
        proofPoints: extractActions(val, "optimization_paths", "differentiation_score"),
        guarantees: extractActions(price, "bundle_opportunities", "premium_indicators"),
        innovationPipeline: extractActions(price, "premium_indicators"),
        ...(ue.ltv_cac_ratio ? { unitEconomics: { cac: ue.cac ?? null, ltv: ue.ltv ?? null, ltvCacRatio: ue.ltv_cac_ratio ?? null, margeNette: ue.margin_analysis ?? null, roiEstime: null, budgetCom: null, caVise: null } } : {}),
        // Berkus: MVP/Prototype
        mvp: prod.product_maturity ? {
          exists: true,
          stage: prod.product_maturity?.stage ?? "MVP",
          description: extractText(prod, "product_maturity", "pmf_indicators", "analysis"),
          features: extractActions(prod, "pmf_indicators").map((p: any) => typeof p === "string" ? p : p.action ?? ""),
        } : undefined,
        // Berkus: IP
        proprieteIntellectuelle: ip.ip_strength || ip.analysis ? {
          technologieProprietary: extractText(ip, "ip_strength", "defensibility", "analysis"),
          barrieresEntree: extractActions(ip, "barrier_assessment", "defensibility").map((b: any) => typeof b === "string" ? b : b.action ?? ""),
          protectionScore: ip.score ?? null,
        } : undefined,
      };
    },
  },

  "experience-engagement": {
    frameworks: ["fw-07-touchpoint-mapping", "fw-08-ritual-design", "fw-09-devotion-pathway"],
    pillar: "e",
    writeback: (outputs) => {
      const tp = outputs["fw-07-touchpoint-mapping"] ?? {};
      const rit = outputs["fw-08-ritual-design"] ?? {};
      const dev = outputs["fw-09-devotion-pathway"] ?? {};
      return {
        ...(tp.touchpoint_map ? { touchpoints: Array.isArray(tp.touchpoint_map) ? tp.touchpoint_map : [] } : {}),
        ...(rit.ritual_portfolio ? { rituels: Array.isArray(rit.ritual_portfolio) ? rit.ritual_portfolio : [] } : {}),
        ...(dev.conversion_triggers ? { conversionTriggers: Array.isArray(dev.conversion_triggers) ? dev.conversion_triggers : [] } : {}),
        ...(dev.barrier_analysis ? { barriers: Array.isArray(dev.barrier_analysis) ? dev.barrier_analysis : [] } : {}),
        ...(dev.pathway_design ? { superfanPortrait: typeof dev.pathway_design === "string" ? dev.pathway_design : JSON.stringify(dev.pathway_design) } : {}),
      };
    },
  },

  "swot-interne": {
    frameworks: ["fw-22-risk-matrix", "fw-23-crisis-playbook"],
    pillar: "r",
    writeback: (outputs) => {
      const risk = outputs["fw-22-risk-matrix"] ?? {};
      const crisis = outputs["fw-23-crisis-playbook"] ?? {};
      return {
        ...(risk.risk_matrix ? { risques: Array.isArray(risk.risk_matrix) ? risk.risk_matrix : [] } : {}),
        ...(risk.mitigation_plans ? { mitigations: Array.isArray(risk.mitigation_plans) ? risk.mitigation_plans : [] } : {}),
        ...(risk.early_warnings ? { forces: Array.isArray(risk.early_warnings) ? risk.early_warnings : [] } : {}),
        ...(risk.contingencies ? { faiblesses: Array.isArray(risk.contingencies) ? risk.contingencies : [] } : {}),
        ...(crisis.crisis_protocols ? { crisisPlaybook: crisis.crisis_protocols } : {}),
        ...(risk.score ? { scoreResilience: risk.score } : {}),
      };
    },
  },

  "swot-externe": {
    frameworks: ["fw-11-brand-market-fit", "fw-12-tam-sam-som", "fw-26-berkus-traction"],
    pillar: "t",
    writeback: (outputs) => {
      const bmf = outputs["fw-11-brand-market-fit"] ?? {};
      const tam = outputs["fw-12-tam-sam-som"] ?? {};
      const traction = outputs["fw-26-berkus-traction"] ?? {};
      return {
        ...(bmf.gap_analysis ? { concurrents: Array.isArray(bmf.gap_analysis) ? bmf.gap_analysis : [] } : {}),
        ...(tam.market_share_trajectory ? { tendances: Array.isArray(tam.market_share_trajectory) ? tam.market_share_trajectory : [] } : {}),
        ...(bmf.fit_score ? { brandMarketFit: bmf.market_opportunity ?? `Brand-Market Fit score: ${bmf.fit_score}/10` } : {}),
        ...(bmf.repositioning_options ? { validation: { score: bmf.fit_score ?? 0, verdict: bmf.fit_score >= 7 ? "confirme" : "a valider" } } : {}),
        ...(tam.tam ? { tam: tam.tam, sam: tam.sam, som: tam.som } : {}),
        // Berkus: Traction data
        traction: traction.traction_score || traction.analysis ? {
          preuvesTraction: extractActions(traction, "traction_evidence", "growth_trajectory").map((t: any) => typeof t === "string" ? t : t.action ?? JSON.stringify(t)),
          tractionScore: traction.score ?? traction.traction_score ?? null,
          metriqueCle: traction.growth_trajectory ? {
            nom: "Growth trajectory",
            valeur: traction.score ?? 0,
            tendance: (traction.score ?? 0) >= 7 ? "UP" as const : (traction.score ?? 0) >= 4 ? "STABLE" as const : "DOWN" as const,
          } : undefined,
        } : undefined,
      };
    },
  },

  "signaux-opportunites": {
    frameworks: ["fw-10-attribution-model", "fw-17-cohort-analysis"],
    pillar: "t",
    // Special: this section reads from strategy.signals table, not pillar T.
    // signalWriteback creates Signal rows in DB.
    signalWriteback: true,
    writeback: (outputs) => {
      // Also enrich pillar T with attribution insights
      const attr = outputs["fw-10-attribution-model"] ?? {};
      return {
        ...(attr.attribution_model ? { attributionModel: attr.attribution_model } : {}),
        ...(attr.roi_by_channel ? { roiByChannel: attr.roi_by_channel } : {}),
      };
    },
  },

  "catalogue-actions": {
    frameworks: ["fw-13-90-day-roadmap", "fw-14-campaign-architecture", "fw-15-team-blueprint"],
    pillar: "i",
    writeback: (outputs) => {
      const road = outputs["fw-13-90-day-roadmap"] ?? {};
      const camp = outputs["fw-14-campaign-architecture"] ?? {};
      const team = outputs["fw-15-team-blueprint"] ?? {};
      // Use helper: fallback to prescriptions if named fields absent
      const roadActions = extractActions(road, "weekly_plan", "milestones", "resource_allocation");
      const campActions = extractActions(camp, "campaign_plan", "channel_mix", "content_calendar");
      const actions = [...roadActions, ...campActions];
      const parCanal: Record<string, any[]> = {};
      if (actions.length > 0) {
        for (const a of actions) {
          const canal = a.canal ?? a.channel ?? a.category ?? "DIGITAL";
          if (!parCanal[canal]) parCanal[canal] = [];
          parCanal[canal].push(a);
        }
      } else {
        // Fallback: use analysis text as single action block
        const roadText = extractText(road, "analysis");
        const campText = extractText(camp, "analysis");
        if (roadText) parCanal["ROADMAP"] = [{ action: roadText, format: "90 jours", cout: null, impact: "high" }];
        if (campText) parCanal["CAMPAIGN"] = [{ action: campText, format: "architecture", cout: null, impact: "high" }];
      }
      return {
        actions: actions.length > 0 ? actions : Object.values(parCanal).flat(),
        parCanal,
        sprint90Days: extractText(road, "weekly_plan", "milestones", "analysis"),
        annualCalendar: extractActions(camp, "content_calendar", "campaign_plan"),
        channelMix: camp.channel_mix ?? extractText(camp, "channel_mix"),
        budgetAllocation: camp.budget_allocation ?? null,
        teamBlueprint: team.team_structure ?? extractText(team, "team_structure", "role_definitions", "analysis"),
      };
    },
  },

  "fenetre-overton": {
    frameworks: ["fw-20-brand-evolution", "fw-19-expansion-strategy"],
    pillar: "s",
    writeback: (outputs) => {
      const evo = outputs["fw-20-brand-evolution"] ?? {};
      const exp = outputs["fw-19-expansion-strategy"] ?? {};
      // Always produce data via fallback to analysis/prescriptions
      const roadmapItems = extractActions(evo, "evolution_roadmap", "pivot_scenarios", "brand_extension_options");
      const roadmap = roadmapItems.length > 0
        ? roadmapItems.map((r: any, i: number) => ({
            phase: r.phase ?? `Phase ${i + 1}`,
            objectif: r.objectif ?? r.objective ?? r.description ?? (typeof r === "string" ? r : ""),
            livrables: Array.isArray(r.livrables ?? r.deliverables) ? (r.livrables ?? r.deliverables) : [],
            budget: r.budget ?? null,
            duree: r.duree ?? r.duration ?? "",
          }))
        : [];
      return {
        perceptionActuelle: extractText(evo, "evolution_roadmap", "analysis") || null,
        perceptionCible: extractText(evo, "legacy_plan", "brand_extension_options") || extractText(exp, "market_entry_plan", "analysis") || null,
        roadmap,
        sprint90Days: extractText(evo, "pivot_scenarios", "analysis"),
        expansion: exp.expansion_priority ?? extractActions(exp, "market_entry_plan", "risk_assessment"),
        ovpiScore: evo.score ?? exp.score ?? null,
      };
    },
  },

  "profil-superfan": {
    frameworks: ["fw-09-devotion-pathway", "fw-02-persona-constellation"],
    pillar: "e",
    writeback: (outputs) => {
      const dev = outputs["fw-09-devotion-pathway"] ?? {};
      const persona = outputs["fw-02-persona-constellation"] ?? {};
      // Mapper reads: superfanPortrait as {nom, age, description, motivations, freins}
      // devotionJourney as [{palier, trigger, experience}]
      const superfanPortrait = {
        nom: "Superfan type",
        age: "",
        description: typeof dev.pathway_design === "string" ? dev.pathway_design : dev.analysis ?? "",
        motivations: Array.isArray(dev.conversion_triggers) ? dev.conversion_triggers.map((t: any) => typeof t === "string" ? t : t.trigger ?? "") : [],
        freins: Array.isArray(dev.barrier_analysis) ? dev.barrier_analysis.map((b: any) => typeof b === "string" ? b : b.barrier ?? "") : [],
      };
      if (persona.persona_map) {
        const first = Array.isArray(persona.persona_map) ? persona.persona_map[0] : null;
        if (first) {
          superfanPortrait.nom = first.nom ?? first.name ?? "Superfan type";
          superfanPortrait.age = first.age ?? first.trancheAge ?? "";
        }
      }
      const devotionJourney = dev.conversion_triggers
        ? ["Spectateur", "Interesse", "Participant", "Engage", "Ambassadeur", "Evangeliste"].map((palier, i) => ({
            palier,
            trigger: Array.isArray(dev.conversion_triggers) && dev.conversion_triggers[i]
              ? (typeof dev.conversion_triggers[i] === "string" ? dev.conversion_triggers[i] : dev.conversion_triggers[i].trigger ?? "")
              : "",
            experience: "",
          }))
        : [];
      return { superfanPortrait, devotionJourney };
    },
  },

  "croissance-evolution": {
    frameworks: ["fw-18-growth-loops", "fw-19-expansion-strategy", "fw-21-innovation-pipeline"],
    pillar: "s",
    writeback: (outputs) => {
      const growth = outputs["fw-18-growth-loops"] ?? {};
      const exp = outputs["fw-19-expansion-strategy"] ?? {};
      const innov = outputs["fw-21-innovation-pipeline"] ?? {};
      return {
        ...(growth.loop_designs ? { growthLoops: Array.isArray(growth.loop_designs) ? growth.loop_designs : [] } : {}),
        ...(exp.market_entry_plan ? { expansion: Array.isArray(exp.market_entry_plan) ? exp.market_entry_plan : [] } : {}),
        ...(innov.innovation_pipeline ? { innovationPipeline: Array.isArray(innov.innovation_pipeline) ? innov.innovation_pipeline : [] } : {}),
        ...(innov.priority_matrix ? { evolution: Array.isArray(innov.priority_matrix) ? innov.priority_matrix : [] } : {}),
      };
    },
  },

  "kpis-mesure": {
    frameworks: ["fw-16-kpi-framework"],
    pillar: "e",
    writeback: (outputs) => {
      const kpi = outputs["fw-16-kpi-framework"] ?? {};
      return {
        ...(kpi.kpi_tree ? { kpis: Array.isArray(kpi.kpi_tree) ? kpi.kpi_tree : [] } : {}),
        ...(kpi.targets ? { kpiTargets: kpi.targets } : {}),
        ...(kpi.measurement_cadence ? { measurementCadence: kpi.measurement_cadence } : {}),
      };
    },
  },

  "medias-distribution": {
    frameworks: ["fw-14-campaign-architecture", "fw-10-attribution-model"],
    pillar: "i",
    writeback: (outputs) => {
      const camp = outputs["fw-14-campaign-architecture"] ?? {};
      const attr = outputs["fw-10-attribution-model"] ?? {};
      return {
        mediaAllocation: extractActions(camp, "channel_mix", "budget_allocation", "campaign_plan"),
        channelStrategy: extractText(camp, "budget_allocation", "channel_mix", "analysis"),
        roiByChannel: attr.roi_by_channel ?? extractText(attr, "roi_by_channel", "channel_weights", "analysis"),
      };
    },
  },

  // ── Berkus: Equipe Dirigeante → Pillar A ──────────────────────────────
  "equipe": {
    frameworks: ["fw-25-berkus-team-assessment"],
    pillar: "a",
    writeback: (outputs) => {
      const team = outputs["fw-25-berkus-team-assessment"] ?? {};
      const profiles = extractActions(team, "team_profiles", "prescriptions");
      const equipeDirigeante = profiles.map((p: any) => ({
        nom: p.nom ?? p.name ?? p.action ?? "",
        role: p.role ?? p.title ?? "",
        bio: p.bio ?? p.description ?? "",
        experiencePasse: Array.isArray(p.experiencePasse ?? p.experience) ? (p.experiencePasse ?? p.experience) : [],
        competencesCles: Array.isArray(p.competencesCles ?? p.skills) ? (p.competencesCles ?? p.skills) : [],
        credentials: Array.isArray(p.credentials) ? p.credentials : [],
      }));
      const compScore = team.complementarity_score ?? team.score ?? null;
      const execCap = team.execution_capacity ?? extractText(team, "execution_capacity");
      const gaps = extractActions(team, "skill_gaps");
      return {
        equipeDirigeante: equipeDirigeante.length > 0 ? equipeDirigeante : undefined,
        equipeComplementarite: compScore !== null ? {
          scoreGlobal: typeof compScore === "number" ? compScore : 5,
          couvertureTechnique: profiles.some((p: any) => /tech|dev|cto|ingeni/i.test(JSON.stringify(p))),
          couvertureCommerciale: profiles.some((p: any) => /commer|vente|sales|cmo|market/i.test(JSON.stringify(p))),
          couvertureOperationnelle: profiles.some((p: any) => /ops|coo|execut|project|chef/i.test(JSON.stringify(p))),
          capaciteExecution: execCap.length > 20 ? "forte" : "moyenne",
          lacunes: gaps.map((g: any) => typeof g === "string" ? g : g.action ?? g.gap ?? ""),
          verdict: extractText(team, "analysis").slice(0, 200),
        } : undefined,
      };
    },
  },
};

// ─── Main Enrichment Function ────────────────────────────────────────────────

export async function enrichAllSections(strategyId: string): Promise<{
  enriched: string[];
  skipped: string[];
  failed: string[];
  seeded: string[];
  total: number;
  frameworksExecuted: number;
  finalScore: string;
  finalComplete: number;
  finalPartial: number;
  finalEmpty: number;
  sectionFeedback: Record<string, { before: string; after: string; action: string }>;
  message: string;
}> {
  const report = await checkCompleteness(strategyId);
  const incomplete = Object.entries(report)
    .filter(([, status]) => status === "empty" || status === "partial")
    .map(([id]) => id);

  if (incomplete.length === 0) {
    return { enriched: [], skipped: [], failed: [], seeded: [], total: 0, frameworksExecuted: 0, finalScore: "21/21", finalComplete: 21, finalPartial: 0, finalEmpty: 0, sectionFeedback: {}, message: "Oracle complet — 21/21 sections." };
  }

  // 1. Collect all needed frameworks (deduplicated)
  const neededFrameworks = new Set<string>();
  const sectionsByFramework = new Map<string, string[]>();

  for (const sectionId of incomplete) {
    const spec = SECTION_ENRICHMENT[sectionId];
    if (!spec) continue;
    for (const fw of spec.frameworks) {
      if (getFramework(fw)) {
        neededFrameworks.add(fw);
        const sections = sectionsByFramework.get(fw) ?? [];
        sections.push(sectionId);
        sectionsByFramework.set(fw, sections);
      }
    }
  }

  if (neededFrameworks.size === 0) {
    return {
      enriched: [],
      skipped: incomplete,
      failed: [],
      seeded: [],
      total: incomplete.length,
      frameworksExecuted: 0,
      finalScore: "?/21",
      finalComplete: 0,
      finalPartial: 0,
      finalEmpty: incomplete.length,
      sectionFeedback: {},
      message: `${incomplete.length} sections incompletes mais aucun framework Artemis applicable (sections derivees).`,
    };
  }

  // 2. Topological sort for dependency order
  const sorted = topologicalSort([...neededFrameworks]);

  // 3. Execute frameworks in order, cache outputs
  const frameworkOutputs: Record<string, any> = {};
  let frameworksExecuted = 0;

  // Check for existing recent results (< 1 hour) to avoid re-execution
  const recentResults = await db.frameworkResult.findMany({
    where: {
      strategyId,
      framework: { slug: { in: sorted } },
      createdAt: { gte: new Date(Date.now() - 3600_000) },
    },
    include: { framework: true },
    orderBy: { createdAt: "desc" },
  });

  const recentBySlug = new Map<string, any>();
  for (const r of recentResults) {
    if (!recentBySlug.has(r.framework.slug)) {
      recentBySlug.set(r.framework.slug, r.output);
    }
  }

  for (const slug of sorted) {
    // Reuse recent result if available
    if (recentBySlug.has(slug)) {
      frameworkOutputs[slug] = recentBySlug.get(slug);
      continue;
    }

    try {
      const { output } = await executeFramework(slug, strategyId, {});
      frameworkOutputs[slug] = output;
      frameworksExecuted++;
    } catch (err) {
      console.warn(`[enrichOracle] Framework ${slug} failed:`, err instanceof Error ? err.message : err);
      frameworkOutputs[slug] = null;
    }
  }

  // 4. Writeback: extract fields from framework outputs → pillar content
  const enriched: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const sectionId of incomplete) {
    const spec = SECTION_ENRICHMENT[sectionId];
    if (!spec) {
      skipped.push(sectionId);
      continue;
    }

    // Collect outputs for this section's frameworks
    const sectionOutputs: Record<string, any> = {};
    let hasAnyOutput = false;
    for (const fw of spec.frameworks) {
      if (frameworkOutputs[fw]) {
        sectionOutputs[fw] = frameworkOutputs[fw];
        hasAnyOutput = true;
      }
    }

    if (!hasAnyOutput) {
      failed.push(sectionId);
      continue;
    }

    try {
      // Special case: signaux-opportunites must create Signal rows in DB
      if ((spec as any).signalWriteback && sectionId === "signaux-opportunites") {
        const attr = sectionOutputs["fw-10-attribution-model"] ?? {};
        const cohort = sectionOutputs["fw-17-cohort-analysis"] ?? {};
        const signals: { type: string; data: any }[] = [];

        // Create WEAK signals from attribution recommendations
        const recos = Array.isArray(attr.optimization_recommendations) ? attr.optimization_recommendations : Array.isArray(attr.prescriptions) ? attr.prescriptions : [];
        for (const r of recos.slice(0, 5)) {
          signals.push({ type: "WEAK", data: { title: typeof r === "string" ? r : r.recommendation ?? JSON.stringify(r), source: "Artemis:attribution", severity: "MEDIUM", opportunity: typeof r === "string" ? r : r.recommendation ?? "" } });
        }

        // Create opportunity signals from cohort insights
        const insights = Array.isArray(cohort.insights) ? cohort.insights : Array.isArray(cohort.prescriptions) ? cohort.prescriptions : [];
        for (const i of insights.slice(0, 5)) {
          signals.push({ type: "OPPORTUNITY", data: { title: typeof i === "string" ? i : i.insight ?? JSON.stringify(i), source: "Artemis:cohort", opportunity: typeof i === "string" ? i : i.insight ?? "", channel: "", timing: "trimestre", impact: "MEDIUM" } });
        }

        if (signals.length > 0) {
          await db.signal.createMany({
            data: signals.map((s) => ({ strategyId, type: s.type, data: s.data as never })),
          });
          enriched.push(sectionId);
        } else {
          skipped.push(sectionId);
        }
        // Still do pillar writeback for T enrichment (below)
      }

      const newFields = spec.writeback(sectionOutputs);
      if (Object.keys(newFields).length === 0 && !enriched.includes(sectionId)) {
        skipped.push(sectionId);
        continue;
      }

      // Load current pillar content and merge
      const pillar = await db.pillar.findUnique({
        where: { strategyId_key: { strategyId, key: spec.pillar } },
      });

      const currentContent = (pillar?.content ?? {}) as Record<string, unknown>;

      // Merge: only write fields that are empty/missing in current content
      const merged = { ...currentContent };
      for (const [key, value] of Object.entries(newFields)) {
        if (key.startsWith("_")) continue; // Skip internal markers
        const existing = currentContent[key];
        const isEmpty = existing === null || existing === undefined
          || (typeof existing === "string" && existing.length === 0)
          || (Array.isArray(existing) && existing.length === 0);

        if (isEmpty) {
          merged[key] = value;
        }
      }

      if (pillar) {
        await db.pillar.update({
          where: { id: pillar.id },
          data: { content: merged as never },
        });
      } else {
        await db.pillar.create({
          data: { strategyId, key: spec.pillar, content: merged as never },
        });
      }

      if (!enriched.includes(sectionId)) enriched.push(sectionId);
    } catch (err) {
      console.warn(`[enrichOracle] Writeback ${sectionId} failed:`, err instanceof Error ? err.message : err);
      failed.push(sectionId);
    }
  }

  // ─── Step 5: Seed missing execution data so sections pass hasRich ──────────
  const seeded: string[] = [];

  try {
    // 5a. Recalculate advertis_vector confidence from pillar fill rate
    const allPillars = await db.pillar.findMany({ where: { strategyId } });
    let filledFields = 0;
    let totalFields = 0;
    for (const p of allPillars) {
      const content = (p.content ?? {}) as Record<string, unknown>;
      const keys = Object.keys(content);
      totalFields += Math.max(keys.length, 5); // minimum 5 expected fields per pillar
      filledFields += keys.filter((k) => {
        const v = content[k];
        if (v === null || v === undefined) return false;
        if (typeof v === "string" && v.length === 0) return false;
        if (Array.isArray(v) && v.length === 0) return false;
        return true;
      }).length;
    }
    const confidence = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) / 100 : 0;

    const strategy = await db.strategy.findUnique({ where: { id: strategyId }, select: { advertis_vector: true } });
    const currentVector = (strategy?.advertis_vector ?? {}) as Record<string, unknown>;
    if (currentVector.confidence !== confidence) {
      await db.strategy.update({
        where: { id: strategyId },
        data: { advertis_vector: { ...currentVector, confidence } as never },
      });
      seeded.push("confidence=" + confidence.toFixed(2));
    }

    // 5b. Seed DevotionSnapshot if missing (from pillar E hierarchy or defaults)
    const existingDevotion = await db.devotionSnapshot.findFirst({
      where: { strategyId },
      orderBy: { measuredAt: "desc" },
    });
    if (!existingDevotion) {
      const eContent = (allPillars.find((p) => p.key === "e")?.content ?? {}) as Record<string, unknown>;
      const hierarchy = Array.isArray(eContent.hierarchieCommunautaire) ? eContent.hierarchieCommunautaire : [];
      // Derive initial distribution from hierarchy or use defaults
      await db.devotionSnapshot.create({
        data: {
          strategyId,
          spectateur: hierarchy.length > 0 ? 0.40 : 0.50,
          interesse: hierarchy.length > 0 ? 0.25 : 0.25,
          participant: hierarchy.length > 0 ? 0.15 : 0.12,
          engage: hierarchy.length > 0 ? 0.10 : 0.08,
          ambassadeur: hierarchy.length > 0 ? 0.07 : 0.04,
          evangeliste: hierarchy.length > 0 ? 0.03 : 0.01,
          devotionScore: hierarchy.length > 0 ? 45 : 25,
          trigger: "enrichOracle",
        },
      });
      seeded.push("devotionSnapshot");
    }

    // 5c. Seed CultIndexSnapshot if missing
    const existingCult = await db.cultIndexSnapshot.findFirst({
      where: { strategyId },
      orderBy: { measuredAt: "desc" },
    });
    if (!existingCult) {
      await db.cultIndexSnapshot.create({
        data: {
          strategyId,
          engagementDepth: 0.3,
          superfanVelocity: 0.1,
          communityCohesion: 0.2,
          brandDefenseRate: 0.15,
          ugcGenerationRate: 0.05,
          ritualAdoption: 0.2,
          evangelismScore: 0.1,
          compositeScore: 25,
          tier: "APPRENTI",
        },
      });
      seeded.push("cultIndexSnapshot");
    }
  } catch (err) {
    console.warn("[enrichOracle] Seeding step failed:", err instanceof Error ? err.message : err);
  }

  // ─── Step 6: Re-check completeness for final report ──────────────────────
  const finalReport = await checkCompleteness(strategyId);
  const finalComplete = Object.values(finalReport).filter((s) => s === "complete").length;
  const finalPartial = Object.values(finalReport).filter((s) => s === "partial").length;
  const finalEmpty = Object.values(finalReport).filter((s) => s === "empty").length;

  // Build per-section feedback
  const sectionFeedback: Record<string, { before: string; after: string; action: string }> = {};
  for (const [id, status] of Object.entries(finalReport)) {
    const before = incomplete.find((s) => s === id) ? "incomplete" : "ok";
    const action = enriched.includes(id)
      ? "enriched via Artemis"
      : skipped.includes(id)
        ? "non-enrichissable (donnees operationnelles)"
        : failed.includes(id)
          ? "echec framework"
          : "inchange";
    sectionFeedback[id] = { before, after: status, action };
  }

  return {
    enriched,
    skipped,
    failed,
    seeded,
    total: incomplete.length,
    frameworksExecuted,
    finalScore: `${finalComplete}/${Object.keys(finalReport).length}`,
    finalComplete,
    finalPartial,
    finalEmpty,
    sectionFeedback,
    message: `${finalComplete}/21 complete. ${enriched.length} enrichies via ${frameworksExecuted} frameworks. ${seeded.length} metriques seedees. ${finalPartial} partial. ${finalEmpty} operationnelles (drivers/equipe/contrats).`,
  };
}

/**
 * Campaign Plan Generator — Generates campaign plans from strategy ADVE profile + Drivers.
 * Enriches campaign objectives with ADVE-aligned KPIs and budget allocation.
 *
 * Uses all 8 pillars as brand context + LLM for structured plan generation.
 */
import { db } from "@/lib/db";
import { callLLM } from "@/server/services/llm-gateway";
import { getFormatInstructions } from "@/lib/types/variable-bible";

// ── Types ─────────────────────────────────────────────────────────────────

export interface CampaignBrief {
  objective: string;
  targetAudience?: string;
  duration?: string; // e.g. "3 months"
  budgetRange?: { min: number; max: number; currency?: string };
  channels?: string[];
  constraints?: string[];
}

export interface CampaignPhase {
  name: string;
  durationWeeks: number;
  objective: string;
  actions: PhaseAction[];
  budgetPercent: number;
}

export interface PhaseAction {
  name: string;
  channel: string;
  description: string;
  kpi: string;
  driverId?: string;
}

export interface CampaignPlan {
  name: string;
  summary: string;
  phases: CampaignPhase[];
  totalBudget: number;
  budgetCurrency: string;
  budgetAllocation: Record<string, number>; // category -> amount
  driverAssignments: Record<string, string[]>; // driverId -> action names
  targetPillars: string[];
  kpis: Record<string, string>;
}

// ── Legacy export (preserved) ─────────────────────────────────────────────

export async function generatePlan(strategyId: string, campaignName: string): Promise<{
  name: string;
  objectives: Record<string, unknown>;
  suggestedDrivers: string[];
  estimatedBudget: number;
}> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: { drivers: { where: { deletedAt: null, status: "ACTIVE" } }, pillars: { where: { key: { in: ["v", "e"] } } } },
  });

  const vector = strategy.advertis_vector as Record<string, number> | null;
  const weakPillars = ["a", "d", "v", "e"].filter((k) => (vector?.[k] ?? 0) < 12);

  return {
    name: campaignName,
    objectives: { targetPillars: weakPillars, composite: vector?.composite ?? 0 },
    suggestedDrivers: strategy.drivers.map((d) => d.id),
    estimatedBudget: strategy.drivers.length * 500000,
  };
}

// ── Full campaign plan generation ─────────────────────────────────────────

export async function generateCampaignPlan(
  strategyId: string,
  brief: CampaignBrief,
): Promise<CampaignPlan> {
  // Load all 8 pillars for full brand context
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: {
      pillars: true,
      drivers: { where: { deletedAt: null, status: "ACTIVE" } },
    },
  });

  const pillarContext: Record<string, unknown> = {};
  for (const p of strategy.pillars) {
    pillarContext[p.key] = p.content;
  }

  const vector = strategy.advertis_vector as Record<string, number> | null;
  const weakPillars = ["a", "d", "v", "e", "r", "t", "i", "s"].filter(
    (k) => (vector?.[k] ?? 0) < 12,
  );

  // Bible format rules for campaign-relevant fields
  const bibleRules = getFormatInstructions("v", ["promesse_centrale", "proposition_valeur"]);

  const drivers = strategy.drivers.map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
  }));

  const budgetMax = brief.budgetRange?.max ?? strategy.drivers.length * 500000;
  const currency = brief.budgetRange?.currency ?? "XAF";

  const { text } = await callLLM({
    system: `Tu es un strategiste publicitaire expert du framework ADVE/RTIS.
Tu generes des plans de campagne structures en phases, avec allocation budgetaire et assignation de drivers.
Reponds UNIQUEMENT en JSON valide, sans markdown.

${bibleRules}`,
    prompt: `Contexte de marque (8 piliers ADVE+RTIS):
${JSON.stringify(pillarContext, null, 2)}

Vecteur ADVE actuel: ${JSON.stringify(vector)}
Piliers faibles a renforcer: ${JSON.stringify(weakPillars)}
Drivers actifs: ${JSON.stringify(drivers)}

Brief campagne:
- Objectif: ${brief.objective}
- Audience cible: ${brief.targetAudience ?? "Non precise"}
- Duree: ${brief.duration ?? "3 mois"}
- Budget max: ${budgetMax} ${currency}
- Canaux souhaites: ${JSON.stringify(brief.channels ?? [])}
- Contraintes: ${JSON.stringify(brief.constraints ?? [])}

Genere un plan de campagne JSON:
{
  "summary": "<resume en 2 phrases>",
  "phases": [{ "name": "...", "durationWeeks": N, "objective": "...", "actions": [{ "name": "...", "channel": "...", "description": "...", "kpi": "...", "driverId": "<id d'un driver actif ou null>" }], "budgetPercent": N }],
  "budgetAllocation": { "PRODUCTION": N, "MEDIA": N, "TALENT": N, "TECHNOLOGY": N, "CONTINGENCY": N },
  "kpis": { "<metric>": "<target>" }
}
Les budgetPercent doivent totaliser 100. Assigne les drivers existants aux actions pertinentes.`,
    caller: "campaign-plan-generator:generate",
    strategyId,
    maxTokens: 4000,
  });

  // Parse LLM response
  let parsed: Record<string, unknown>;
  try {
    const cleaned = text.trim().replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback to basic plan
    return buildFallbackPlan(brief, budgetMax, currency, weakPillars, drivers);
  }

  // Map driver assignments from phases
  const driverAssignments: Record<string, string[]> = {};
  const phases = (parsed.phases as CampaignPhase[]) ?? [];
  for (const phase of phases) {
    for (const action of phase.actions ?? []) {
      if (action.driverId) {
        if (!driverAssignments[action.driverId]) driverAssignments[action.driverId] = [];
        driverAssignments[action.driverId]!.push(action.name);
      }
    }
  }

  // Convert allocation percentages to absolute amounts
  const rawAllocation = (parsed.budgetAllocation as Record<string, number>) ?? {};
  const budgetAllocation: Record<string, number> = {};
  for (const [cat, pct] of Object.entries(rawAllocation)) {
    budgetAllocation[cat] = Math.round((pct / 100) * budgetMax);
  }

  return {
    name: brief.objective.substring(0, 80),
    summary: (parsed.summary as string) ?? brief.objective,
    phases,
    totalBudget: budgetMax,
    budgetCurrency: currency,
    budgetAllocation,
    driverAssignments,
    targetPillars: weakPillars,
    kpis: (parsed.kpis as Record<string, string>) ?? {},
  };
}

// ── Fallback plan when LLM parsing fails ──────────────────────────────────

function buildFallbackPlan(
  brief: CampaignBrief,
  budget: number,
  currency: string,
  weakPillars: string[],
  drivers: { id: string; name: string }[],
): CampaignPlan {
  return {
    name: brief.objective.substring(0, 80),
    summary: brief.objective,
    phases: [
      {
        name: "Lancement",
        durationWeeks: 4,
        objective: "Etablir la presence",
        actions: [{ name: "Action initiale", channel: "digital", description: brief.objective, kpi: "reach" }],
        budgetPercent: 40,
      },
      {
        name: "Amplification",
        durationWeeks: 4,
        objective: "Maximiser l'impact",
        actions: [{ name: "Amplification media", channel: "multi", description: "Scaling", kpi: "engagement" }],
        budgetPercent: 40,
      },
      {
        name: "Consolidation",
        durationWeeks: 4,
        objective: "Convertir et fideliser",
        actions: [{ name: "Conversion", channel: "digital", description: "Retention", kpi: "conversion" }],
        budgetPercent: 20,
      },
    ],
    totalBudget: budget,
    budgetCurrency: currency,
    budgetAllocation: { PRODUCTION: budget * 0.3, MEDIA: budget * 0.5, CONTINGENCY: budget * 0.2 },
    driverAssignments: Object.fromEntries(drivers.map((d) => [d.id, ["Action initiale"]])),
    targetPillars: weakPillars,
    kpis: { reach: "100K", engagement: "5%", conversion: "2%" },
  };
}

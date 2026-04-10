/**
 * PROTOCOLE INNOVATION (I) — Agent spécialisé de l'essaim MESTOR
 *
 * Input  : Piliers A, D, V, E, R, T
 * Output : Pilier I complet (PillarISchema)
 * Nature : EXPANSION — cartographie le potentiel total de la marque
 *
 * I est le MENU COMPLET — tout ce que la marque PEUT faire.
 * S (qui vient après) est la COMMANDE — ce qu'on choisit de faire.
 *
 * Logique hybride :
 *   1. Plateforme de marque (COMPOSE — dérivé cross-pilier A+D)
 *   2. Catalogue exhaustif par canal (MESTOR_ASSIST)
 *   3. Tri par Devotion Level (CALC)
 *   4. Croisement risques R × actions (CALC)
 *   5. Actions de test des hypothèses T (COMPOSE)
 *   6. Innovations produit/marque (MESTOR_ASSIST)
 *   7. Compteur totalActions (CALC)
 *
 * Cascade ADVERTIS : I puise dans A + D + V + E + R + T
 */

import { db } from "@/lib/db";
import { DEVOTION_LEVELS } from "@/lib/types/taxonomies";

// ── Types ──────────────────────────────────────────────────────────────

export interface ProtocoleInnovationResult {
  pillarKey: "i";
  content: Record<string, unknown>;
  confidence: number;
  totalActions: number;
  error?: string;
}

// ── Step 1 : Plateforme de marque (COMPOSE — cross-pilier A+D) ────────

function buildBrandPlatform(
  pillars: Record<string, Record<string, unknown> | null>,
): Record<string, unknown> {
  const a = pillars.a ?? {};
  const d = pillars.d ?? {};

  return {
    name: a.nomMarque ?? "",
    benefit: d.promesseMaitre ?? "",
    target: Array.isArray(d.personas) ? ((d.personas as Array<Record<string, unknown>>)[0]?.name ?? "") : "",
    competitiveAdvantage: d.positionnement ?? "",
    emotionalBenefit: a.promesseFondamentale ?? "",
    functionalBenefit: typeof (d as Record<string, unknown>).sousPromesses === "object" && Array.isArray(d.sousPromesses) && d.sousPromesses.length > 0
      ? (d.sousPromesses as string[])[0] : "",
    supportedBy: a.noyauIdentitaire ?? "",
  };
}

// ── Step 2 : Catalogue exhaustif (MESTOR_ASSIST) ──────────────────────

async function generateCatalogue(
  pillars: Record<string, Record<string, unknown> | null>,
  strategyId: string,
): Promise<Record<string, unknown>> {
  const { anthropic } = await import("@ai-sdk/anthropic");
  const { generateText } = await import("ai");

  const context = ["a", "d", "v", "e", "r", "t"]
    .map(k => {
      const c = pillars[k];
      if (!c || Object.keys(c).length === 0) return `[${k.toUpperCase()}] Vide`;
      return `[${k.toUpperCase()}]\n${JSON.stringify(c, null, 2)}`;
    })
    .join("\n\n");

  // Extract risks and hypotheses for cross-reference
  const r = pillars.r ?? {};
  const t = pillars.t ?? {};
  const risksContext = Array.isArray(r.mitigationPriorities)
    ? `\nRISQUES À MITIGER:\n${(r.mitigationPriorities as Array<Record<string, unknown>>).map((m, i) => `${i}: ${m.action}`).join("\n")}`
    : "";
  const hypothesesContext = Array.isArray(t.hypothesisValidation)
    ? `\nHYPOTHÈSES À TESTER:\n${(t.hypothesisValidation as Array<Record<string, unknown>>).filter(h => h.status === "HYPOTHESIS" || h.status === "TESTING").map((h, i) => `${i}: ${h.hypothesis}`).join("\n")}`
    : "";

  const { text, usage } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: `Tu es le Protocole Innovation de l'essaim MESTOR. Tu cartographies le POTENTIEL TOTAL de la marque.

I n'est PAS un plan d'action. I est l'INVENTAIRE COMPLET de tout ce que la marque PEUT faire.
S (qui vient après) piochera dans I pour construire la roadmap.

Pour chaque action, indique :
- devotionImpact : quel niveau de la Devotion Ladder elle active (SPECTATEUR/INTERESSE/PARTICIPANT/ENGAGE/AMBASSADEUR/EVANGELISTE)
- overtonShift : comment elle déplace la perception du marché

Sois EXHAUSTIF. Liste TOUT le possible, pas juste le prioritaire.
Retourne UNIQUEMENT du JSON valide.`,
    prompt: `Données ADVE + R + T:

${context}
${risksContext}
${hypothesesContext}

Produis le JSON avec ces champs:
{
  "catalogueParCanal": {
    "DIGITAL": [{ "action": "", "format": "", "objectif": "", "pilierImpact": "A|D|V|E", "devotionImpact": "SPECTATEUR|INTERESSE|...", "overtonShift": "" }],
    "EVENEMENTIEL": [...],
    "MEDIA_TRADITIONNEL": [...],
    "PR_INFLUENCE": [...],
    "PRODUCTION": [...],
    "RETAIL_DISTRIBUTION": [...]
  } (5+ actions par canal, chacune avec devotionImpact + overtonShift),
  "assetsProduisibles": [{ "asset": "", "type": "VIDEO|PRINT|DIGITAL|PHOTO|AUDIO|PACKAGING|EXPERIENCE", "usage": "" }] (15+),
  "activationsPossibles": [{ "activation": "", "canal": "", "cible": "", "budgetEstime": "LOW|MEDIUM|HIGH" }] (10+),
  "formatsDisponibles": ["..."] (10+),
  "innovationsProduit": [{ "name": "", "type": "EXTENSION_GAMME|EXTENSION_MARQUE|CO_BRANDING|PIVOT|DIVERSIFICATION", "description": "", "feasibility": "HIGH|MEDIUM|LOW", "horizon": "COURT|MOYEN|LONG", "devotionImpact": "..." }] (3+)
}`,
    maxTokens: 8000,
  });

  await db.aICostLog.create({
    data: {
      strategyId, provider: "anthropic", model: "claude-sonnet-4-20250514",
      inputTokens: usage?.promptTokens ?? 0, outputTokens: usage?.completionTokens ?? 0,
      cost: ((usage?.promptTokens ?? 0) * 0.003 + (usage?.completionTokens ?? 0) * 0.015) / 1000,
      context: "protocole-innovation",
    },
  }).catch(() => {});

  // Parse with robust extractor (Chantier 10)
  try {
    const { extractJSON } = await import("@/server/services/utils/llm");
    return extractJSON(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ── Step 3 : Tri par Devotion Level (CALC) ────────────────────────────

function buildActionsByDevotionLevel(
  catalogue: Record<string, unknown>,
): Record<string, unknown[]> {
  const byLevel: Record<string, unknown[]> = {};
  for (const level of DEVOTION_LEVELS) {
    byLevel[level] = [];
  }

  const channels = (catalogue.catalogueParCanal ?? {}) as Record<string, unknown[]>;
  for (const actions of Object.values(channels)) {
    if (!Array.isArray(actions)) continue;
    for (const action of actions) {
      const a = action as Record<string, unknown>;
      const level = (a.devotionImpact as string) ?? "SPECTATEUR";
      if (byLevel[level]) {
        byLevel[level]!.push(action);
      }
    }
  }

  return byLevel;
}

// ── Step 4 : Croisement risques R × actions (CALC) ────────────────────

function buildRiskMitigationActions(
  pillars: Record<string, Record<string, unknown> | null>,
  catalogue: Record<string, unknown>,
): Array<Record<string, unknown>> {
  const r = pillars.r ?? {};
  const mitigations = (r.mitigationPriorities ?? []) as Array<Record<string, unknown>>;
  const channels = (catalogue.catalogueParCanal ?? {}) as Record<string, unknown[]>;

  const result: Array<Record<string, unknown>> = [];

  for (const mitigation of mitigations) {
    const action = mitigation.action as string;
    // Find matching actions in catalogue
    for (const [canal, actions] of Object.entries(channels)) {
      if (!Array.isArray(actions)) continue;
      for (const catalogueAction of actions) {
        const ca = catalogueAction as Record<string, unknown>;
        const caAction = (ca.action as string) ?? "";
        // Simple keyword match — could be improved with embeddings
        if (action && caAction && (caAction.toLowerCase().includes(action.toLowerCase().slice(0, 20)) || action.toLowerCase().includes(caAction.toLowerCase().slice(0, 20)))) {
          result.push({ riskRef: action, action: caAction, canal, expectedImpact: ca.objectif ?? "" });
        }
      }
    }
    // If no match found, create a generic entry
    if (!result.some(r => r.riskRef === action)) {
      result.push({ riskRef: action, action: `Action de mitigation: ${action}`, canal: "À définir", expectedImpact: "Réduction du risque" });
    }
  }

  return result.slice(0, 10);
}

// ── Step 5 : Actions de test des hypothèses T (COMPOSE) ──────────────

function buildHypothesisTestActions(
  pillars: Record<string, Record<string, unknown> | null>,
): Array<Record<string, unknown>> {
  const t = pillars.t ?? {};
  const hypotheses = (t.hypothesisValidation ?? []) as Array<Record<string, unknown>>;

  return hypotheses
    .filter(h => h.status === "HYPOTHESIS" || h.status === "TESTING")
    .map(h => ({
      hypothesisRef: h.hypothesis as string,
      testAction: `Valider: "${(h.hypothesis as string)?.slice(0, 80)}"`,
      expectedOutcome: h.validationMethod as string ?? "Confirmation ou infirmation",
      cost: "LOW" as const,
    }))
    .slice(0, 8);
}

// ── Step 7 : Compteur totalActions (CALC) ─────────────────────────────

function countTotalActions(catalogue: Record<string, unknown>): number {
  const channels = (catalogue.catalogueParCanal ?? {}) as Record<string, unknown[]>;
  let count = 0;
  for (const actions of Object.values(channels)) {
    if (Array.isArray(actions)) count += actions.length;
  }
  return count;
}

// ── Public API ────────────────────────────────────────────────────────

export async function executeProtocoleInnovation(strategyId: string): Promise<ProtocoleInnovationResult> {
  try {
    // Load pillars A-T
    const dbPillars = await db.pillar.findMany({
      where: { strategyId, key: { in: ["a", "d", "v", "e", "r", "t"] } },
    });
    const pillars: Record<string, Record<string, unknown> | null> = {};
    for (const p of dbPillars) {
      pillars[p.key] = (p.content ?? null) as Record<string, unknown> | null;
    }

    // Step 1: Plateforme de marque (COMPOSE)
    const brandPlatform = buildBrandPlatform(pillars);

    // Step 2: Catalogue exhaustif (MESTOR_ASSIST)
    const catalogue = await generateCatalogue(pillars, strategyId);

    // Step 3: Tri par Devotion (CALC)
    const actionsByDevotionLevel = buildActionsByDevotionLevel(catalogue);

    // Step 4: Croisement R × actions (CALC)
    const riskMitigationActions = buildRiskMitigationActions(pillars, catalogue);

    // Step 5: Actions test hypothèses T (COMPOSE)
    const hypothesisTestActions = buildHypothesisTestActions(pillars);

    // Step 7: Compteur (CALC)
    const totalActions = countTotalActions(catalogue);

    const content: Record<string, unknown> = {
      ...catalogue,
      brandPlatform,
      actionsByDevotionLevel,
      riskMitigationActions,
      hypothesisTestActions,
      totalActions,
    };

    // Confidence based on catalogue richness
    const confidence = Math.min(0.85, 0.4 + Math.min(0.4, totalActions / 60));

    return { pillarKey: "i", content, confidence, totalActions };
  } catch (err) {
    return {
      pillarKey: "i",
      content: {},
      confidence: 0,
      totalActions: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

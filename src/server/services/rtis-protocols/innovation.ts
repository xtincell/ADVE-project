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

import { z } from "zod";
import { db } from "@/lib/db";
import { DEVOTION_LEVELS } from "@/lib/types/taxonomies";
import { PillarISchema } from "@/lib/types/pillar-schemas";
import { wrapUntrusted, UNTRUSTED_NOTICE } from "@/server/services/utils/untrusted-content";

// ADR-0063 / PR-K3-ter — sous-schémas. Le mega-appel (5 champs) est ÉCLATÉ en
// 3 sous-appels focalisés ; chacun valide sa sous-partie. `.pick().partial()`
// garde chaque champ strictement validé quand présent (le pruner droppe les
// items invalides avant persistance → plus de cartes vides).
const CatalogueLLMSchema = PillarISchema.pick({ catalogueParCanal: true }).partial();
const AssetsLLMSchema = PillarISchema.pick({ assetsProduisibles: true, formatsDisponibles: true }).partial();
const ActivationsLLMSchema = PillarISchema.pick({ activationsPossibles: true, innovationsProduit: true }).partial();

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

/**
 * Un appel LLM focalisé pour le protocole Innovation : une seule sous-partie du
 * pilier I, validée par son propre sous-schéma. Retourne {} si l'appel échoue.
 */
async function callInnovationJSON(args: {
  strategyId: string;
  label: string;
  schema: z.ZodTypeAny;
  system: string;
  prompt: string;
  maxOutputTokens: number;
}): Promise<Record<string, unknown>> {
  // LLM Gateway obligatoire (jamais @ai-sdk/anthropic direct) : circuit breaker
  // + fallback provider + substitution Ollama locale + budget/cost tracking.
  const { callLLM } = await import("@/server/services/llm-gateway");
  const { parseAndValidateLLM } = await import("@/server/services/utils/llm");
  try {
    const { text } = await callLLM({
      caller: `mestor:protocole-innovation:${args.label}`,
      strategyId: args.strategyId,
      model: "claude-sonnet-4-20250514",
      // LOT 1e — entrée non fiable neutralisée (anti-injection) : le prompt
      // porte le contexte ADVE+R+T (piliers dérivés de la saisie fondateur,
      // wrappés via wrapUntrusted plus bas) → rappel sécurité dans le system.
      system: `${UNTRUSTED_NOTICE}\n\n${args.system}`,
      prompt: args.prompt,
      maxOutputTokens: args.maxOutputTokens,
    });
    const result = parseAndValidateLLM(text, args.schema, {
      context: `protocole-innovation:${args.label}`,
      mode: "prune",
    });
    if (result.partial) {
      console.warn(
        `[protocole-innovation:${args.label}] strategy=${args.strategyId} dropped ${result.droppedPaths.length} invalid paths:`,
        result.droppedPaths.slice(0, 10),
      );
    }
    return (result.data ?? {}) as Record<string, unknown>;
  } catch (err) {
    console.warn(
      `[protocole-innovation:${args.label}] strategy=${args.strategyId} appel/validation échoué:`,
      err instanceof Error ? err.message : String(err),
    );
    return {};
  }
}

async function generateCatalogue(
  pillars: Record<string, Record<string, unknown> | null>,
  strategyId: string,
): Promise<Record<string, unknown>> {
  // LLM Gateway obligatoire (jamais @ai-sdk/anthropic direct) : circuit
  // breaker + fallback provider (gpt-5.5) + budget governance + cost tracking.
  const { callLLM } = await import("@/server/services/llm-gateway");

  // LOT 1e — entrée non fiable neutralisée (anti-injection) : le contenu des
  // piliers A/D/V/E/R/T dérive de la saisie fondateur → chaque bloc est encadré
  // comme DONNÉE (jamais instruction) avant d'entrer dans le prompt.
  const context = ["a", "d", "v", "e", "r", "t"]
    .map(k => {
      const c = pillars[k];
      if (!c || Object.keys(c).length === 0) return `[${k.toUpperCase()}] Vide`;
      return wrapUntrusted(`PILIER ${k.toUpperCase()}`, JSON.stringify(c, null, 2), { max: 8000 });
    })
    .join("\n\n");

  // Extract risks and hypotheses for cross-reference
  const r = pillars.r ?? {};
  const t = pillars.t ?? {};
  // LOT 1e — entrée non fiable neutralisée (anti-injection) : actions de
  // mitigation (R) et hypothèses (T) dérivent de l'ADVE fondateur → wrappées.
  const risksContext = Array.isArray(r.mitigationPriorities)
    ? `\n${wrapUntrusted("RISQUES À MITIGER", (r.mitigationPriorities as Array<Record<string, unknown>>).map((m, i) => `${i}: ${m.action}`).join("\n"), { max: 4000 })}`
    : "";
  const hypothesesContext = Array.isArray(t.hypothesisValidation)
    ? `\n${wrapUntrusted("HYPOTHÈSES À TESTER", (t.hypothesisValidation as Array<Record<string, unknown>>).filter(h => h.status === "HYPOTHESIS" || h.status === "TESTING").map((h, i) => `${i}: ${h.hypothesis}`).join("\n"), { max: 4000 })}`
    : "";

  const baseSystem = `Tu es le Protocole Innovation de l'essaim MESTOR. Tu cartographies le POTENTIEL TOTAL de la marque.

I n'est PAS un plan d'action. I est l'INVENTAIRE COMPLET de tout ce que la marque PEUT faire.
S (qui vient après) piochera dans I pour construire la roadmap.

Pour chaque action, indique :
- devotionImpact : quel niveau de la Devotion Ladder elle active (SPECTATEUR/INTERESSE/PARTICIPANT/ENGAGE/AMBASSADEUR/EVANGELISTE)
- overtonShift : comment elle déplace la perception du marché

Sois EXHAUSTIF mais ancré dans les données. Retourne UNIQUEMENT du JSON valide, sans markdown.`;

  const baseData = `Données ADVE + R + T:\n\n${context}\n${risksContext}\n${hypothesesContext}`;

  // Mega-appel (5 champs, 8000 tokens) ÉCLATÉ en 3 sous-appels focalisés. Le
  // catalogue par canal (de loin le plus lourd) est ISOLÉ : le modèle s'y
  // consacre seul → JSON fiable. Indépendants → parallèles (Ollama sérialise
  // sur le GPU local). Un sous-appel raté retombe sur {}.
  const [catalogue, assets, activations] = await Promise.all([
    callInnovationJSON({
      strategyId, label: "catalogue", schema: CatalogueLLMSchema, maxOutputTokens: 4000,
      system: baseSystem,
      prompt: `${baseData}\n\nProduis UNIQUEMENT le catalogue exhaustif par canal (5+ actions par canal, chacune avec devotionImpact + overtonShift) :\n{ "catalogueParCanal": { "DIGITAL": [{ "action": "", "format": "", "objectif": "", "pilierImpact": "A|D|V|E", "devotionImpact": "SPECTATEUR", "overtonShift": "" }], "EVENEMENTIEL": [], "MEDIA_TRADITIONNEL": [], "PR_INFLUENCE": [], "PRODUCTION": [], "RETAIL_DISTRIBUTION": [] } }`,
    }),
    callInnovationJSON({
      strategyId, label: "assets", schema: AssetsLLMSchema, maxOutputTokens: 2000,
      system: baseSystem,
      prompt: `${baseData}\n\nProduis UNIQUEMENT les assets produisibles et les formats disponibles :\n{ "assetsProduisibles": [{ "asset": "", "type": "VIDEO|PRINT|DIGITAL|PHOTO|AUDIO|PACKAGING|EXPERIENCE", "usage": "" }] (15+), "formatsDisponibles": ["..."] (10+) }`,
    }),
    callInnovationJSON({
      strategyId, label: "activations", schema: ActivationsLLMSchema, maxOutputTokens: 2500,
      system: baseSystem,
      prompt: `${baseData}\n\nProduis UNIQUEMENT les activations possibles et les innovations produit/marque :\n{ "activationsPossibles": [{ "activation": "", "canal": "", "cible": "", "budgetEstime": "LOW|MEDIUM|HIGH" }] (10+), "innovationsProduit": [{ "name": "", "type": "EXTENSION_GAMME|EXTENSION_MARQUE|CO_BRANDING|PIVOT|DIVERSIFICATION", "description": "", "feasibility": "HIGH|MEDIUM|LOW", "horizon": "COURT|MOYEN|LONG", "devotionImpact": "" }] (3+) }`,
    }),
  ]);

  // Fusion des 3 sous-réponses (champs disjoints → pas de collision).
  return { ...catalogue, ...assets, ...activations };
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

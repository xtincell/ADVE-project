/**
 * Weak Signal Analyzer — Heuristic causal chain reasoning
 *
 * Core idea: each raw market event is analyzed through a causal chain to deduce
 * its potential impact on the brand. Example:
 *   "Wheat field fire in Ukraine" → wheat shortage → flour price increase → bakery margin squeeze
 *
 * Each weak signal accumulates supporting signals that reinforce the theory's
 * confidence score. Signals are grouped by impact thesis.
 */

import { callLLM } from "@/server/services/llm-gateway";
import { db } from "@/lib/db";
import type { CollectedSignal } from "./signal-collector";

export interface CausalStep {
  from: string;
  to: string;
  mechanism: string;
  confidence: number;  // 0-1
}

export interface SupportingSignal {
  title: string;
  content: string;
  addedConfidence: number;  // how much this signal adds to the theory (0-0.3)
  link: string;             // how this signal connects to the causal chain
}

export interface WeakSignal {
  id: string;
  thesis: string;              // "L'inflation de la farine va impacter les marges des boulangeries"
  rawEvent: string;            // Original triggering event
  causalChain: CausalStep[];   // Step-by-step inference
  impactCategory: "SUPPLY_CHAIN" | "PRICING" | "DEMAND" | "REGULATORY" | "COMPETITIVE" | "TECHNOLOGICAL" | "SOCIAL";
  brandImpact: string;         // Specific impact on THIS brand
  confidence: number;          // 0-1, increases with supporting signals
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  relatedPillars: string[];    // ["V", "R"]
  supportingSignals: SupportingSignal[];  // Signals that reinforce this theory
  recommendedAction: string;   // What the brand should consider
}

export interface SearchContext {
  sector: string;
  market?: string;
  keywords: string[];
  competitors: string[];
  brandIdentity: string;
  positioning: string;
  products: string;
  riskFactors: string;
}

/**
 * Analyze collected signals to produce weak signal insights with causal chains
 * and group supporting signals that reinforce each theory.
 */
export async function analyzeWeakSignals(
  signals: CollectedSignal[],
  brandContext: SearchContext,
  strategyId: string,
): Promise<WeakSignal[]> {
  if (signals.length === 0) return [];

  const signalsText = signals
    .map((s, i) => `[Signal ${i + 1}] ${s.title}\n${s.content} (source: ${s.sourceType}, relevance: ${s.relevance})`)
    .join("\n\n");

  const systemPrompt = `Tu es un expert en intelligence économique et en analyse de signaux faibles.
Ton expertise : détecter les menaces et opportunités AVANT qu'elles ne deviennent évidentes.

Contexte marque :
- Secteur : ${brandContext.sector}${brandContext.market ? ` | Marché : ${brandContext.market}` : ""}
- Identité : ${brandContext.brandIdentity}
- Positionnement : ${brandContext.positioning}
- Produits : ${brandContext.products}
- Facteurs de risque existants : ${brandContext.riskFactors}

Tu dois :
1. Analyser chaque signal et construire des THÈSES (théories prédictives)
2. Pour chaque thèse, construire une CHAÎNE CAUSALE (événement → effet 1 → effet 2 → impact marque)
3. Regrouper les signaux qui RENFORCENT la même thèse (signaux de soutien)
4. Chaque signal de soutien AUGMENTE le pourcentage de confiance de la thèse
5. La confiance de base d'une thèse = 0.2, chaque signal de soutien ajoute 0.05-0.30

Format JSON strict — tableau de WeakSignal :
[{
  "thesis": "Thèse prédictive en une phrase",
  "rawEvent": "L'événement déclencheur original",
  "causalChain": [
    {"from": "cause", "to": "effet", "mechanism": "explication", "confidence": 0.0-1.0}
  ],
  "impactCategory": "SUPPLY_CHAIN | PRICING | DEMAND | REGULATORY | COMPETITIVE | TECHNOLOGICAL | SOCIAL",
  "brandImpact": "Impact spécifique sur cette marque",
  "confidence": 0.0-1.0,
  "urgency": "LOW | MEDIUM | HIGH | CRITICAL",
  "relatedPillars": ["V", "R"],
  "supportingSignals": [
    {"title": "Signal de soutien", "content": "Détail", "addedConfidence": 0.05-0.30, "link": "Comment ce signal renforce la thèse"}
  ],
  "recommendedAction": "Action recommandée pour la marque"
}]`;

  const result = await callLLM({
    system: systemPrompt,
    prompt: `Analyse ces ${signals.length} signaux de marché et produis des thèses prédictives avec chaînes causales et signaux de soutien :\n\n${signalsText}\n\nJSON uniquement.`,
    caller: "mestor:weak-signal-analyzer",
    strategyId,
  });

  try {
    const match = result.text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const weakSignals = JSON.parse(match[0]) as WeakSignal[];

    // Assign IDs and persist
    for (const ws of weakSignals) {
      ws.id = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // If high urgency, create an alert signal for the feedback loop
      if (ws.urgency === "HIGH" || ws.urgency === "CRITICAL") {
        await db.signal.create({
          data: {
            strategyId,
            type: "WEAK_SIGNAL_ALERT",
            data: JSON.parse(JSON.stringify({
              thesis: ws.thesis,
              causalChain: ws.causalChain,
              impactCategory: ws.impactCategory,
              brandImpact: ws.brandImpact,
              confidence: ws.confidence,
              urgency: ws.urgency,
              relatedPillars: ws.relatedPillars,
              supportingSignalCount: ws.supportingSignals.length,
              recommendedAction: ws.recommendedAction,
            })),
          },
        });
      }
    }

    // Persist all weak signals as knowledge entry for cross-brand sharing
    await db.knowledgeEntry.create({
      data: {
        entryType: "SECTOR_BENCHMARK",
        sector: brandContext.sector,
        market: brandContext.market,
        data: JSON.parse(JSON.stringify({
          type: "weak_signal_analysis",
          signals: weakSignals,
          analyzedAt: new Date().toISOString(),
        })),
        successScore: weakSignals.length > 0
          ? weakSignals.reduce((sum, ws) => sum + ws.confidence, 0) / weakSignals.length
          : 0,
        sampleSize: signals.length,
      },
    });

    return weakSignals;
  } catch {
    console.warn("[weak-signal-analyzer] Failed to parse weak signals");
    return [];
  }
}

/**
 * Build search context from brand's ADVE pillars
 */
export async function buildSearchContext(strategyId: string): Promise<SearchContext> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: strategyId },
    include: { pillars: true },
  });

  const pillarMap: Record<string, Record<string, unknown>> = {};
  for (const p of strategy.pillars) {
    pillarMap[p.key.toUpperCase()] = (p.content as Record<string, unknown>) ?? {};
  }

  const a = pillarMap["A"] ?? {};
  const d = pillarMap["D"] ?? {};
  const v = pillarMap["V"] ?? {};
  const r = pillarMap["R"] ?? {};

  // Extract sector from strategy metadata
  const bCtx = (strategy as Record<string, unknown>).businessContext as Record<string, unknown> | null;
  const sector = String(bCtx?.sector ?? bCtx?.industry ?? strategy.description ?? "");
  const market = String(bCtx?.market ?? bCtx?.country ?? "");

  // Derive keywords from brand content
  const keywords: string[] = [];
  if (typeof a.noyauIdentitaire === "string") keywords.push(...a.noyauIdentitaire.split(" ").filter(w => w.length > 5).slice(0, 5));
  if (typeof d.positionnement === "string") keywords.push(...d.positionnement.split(" ").filter(w => w.length > 5).slice(0, 5));
  // Add product names
  if (Array.isArray(v.produitsCatalogue)) {
    for (const p of v.produitsCatalogue.slice(0, 5)) {
      const prod = p as Record<string, unknown>;
      if (typeof prod.nom === "string") keywords.push(prod.nom);
    }
  }

  // Extract competitors from D pillar
  const competitors: string[] = [];
  const landscape = d.paysageConcurrentiel;
  if (Array.isArray(landscape)) {
    for (const c of landscape.slice(0, 5)) {
      const comp = c as Record<string, unknown>;
      if (typeof comp.nom === "string") competitors.push(comp.nom);
      if (typeof comp.name === "string") competitors.push(comp.name);
    }
  }

  // Extract risk factors from R
  const swot = r.globalSwot as Record<string, unknown> | undefined;
  const threats = Array.isArray(swot?.threats) ? (swot.threats as string[]).slice(0, 3).join("; ") : "";

  return {
    sector,
    market: market || undefined,
    keywords: [...new Set(keywords)].slice(0, 15),
    competitors: [...new Set(competitors)],
    brandIdentity: String(a.noyauIdentitaire ?? a.prophecy ?? ""),
    positioning: String(d.positionnement ?? d.promesseMaitre ?? ""),
    products: Array.isArray(v.produitsCatalogue)
      ? (v.produitsCatalogue as Array<Record<string, unknown>>).slice(0, 3).map(p => String(p.nom ?? "")).join(", ")
      : "",
    riskFactors: threats,
  };
}

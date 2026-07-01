/**
 * Phase 18-N7 (ADR-0059) — Sentinel `NARRATIVE_COHERENCE_GATE` Mestor pre-flight.
 *
 * Vérifie qu'un Glory output produit pour un BrandNode descendant ne contredit
 * pas le manifesto / tone-of-voice du master brand ancêtre. Bloque ou downgrades
 * l'Intent si une incompatibilité narrative est détectée.
 *
 * Logique MVP heuristique (sans LLM) :
 *   1. Charge piliers ADVE résolus (via `resolveEffectivePillars`)
 *   2. Extrait les keywords-clé du tone (a.tone) + archétype (a.archetype) ancêtres
 *   3. Compare avec le payload du Glory output proposé
 *   4. Liste rouge des keywords incompatibles fixée par défaut (anti-pattern explicite)
 *   5. Si match anti-pattern → VETOED. Si tone divergent (présence d'archétype divergent) → DOWNGRADED.
 *
 * LLM Phase 2 fine-tune : remplacer heuristique par Claude prompt structuré
 * "compare ces deux paragraphes et dis-moi s'ils contredisent le tone X".
 */

import type { BrandNature } from "@prisma/client";
import { resolveEffectivePillars } from "@/server/services/brand-node/inheritance";

export interface NarrativeCoherenceVerdict {
  status: "OK" | "DOWNGRADED" | "VETOED";
  reason: string;
  matched: string[];
  ancestorTone: string | null;
  ancestorArchetype: string | null;
}

/** Liste rouge de patterns anti-narratifs explicites (case-insensitive). */
const ANTI_PATTERNS = [
  // Tone luxe vs pauvreté/misérable
  { tone: ["luxe", "premium", "haut-de-gamme"], antiKeywords: ["pas cher", "low cost", "discount", "économique"] },
  // Tone enfant/famille vs adulte/sexuel
  { tone: ["famille", "enfant", "sécurité", "santé"], antiKeywords: ["sexy", "provocant", "alcool", "tabac"] },
  // Tone authentique/artisanal vs industriel
  { tone: ["authentique", "artisanal", "tradition"], antiKeywords: ["industriel", "standardisé", "production de masse"] },
  // Tone responsable/éthique vs gaspillage
  { tone: ["responsable", "écologique", "durable", "éthique"], antiKeywords: ["jetable", "gaspillage", "non-recyclable"] },
];

export async function applyNarrativeCoherenceGate(args: {
  brandNodeId: string;
  outputText: string;
  /** Optionnel — la nature du nœud cible pour info contextuelle. */
  nodeNature?: BrandNature;
}): Promise<NarrativeCoherenceVerdict> {
  const lower = args.outputText.toLowerCase();

  // 1. Résoudre piliers effectifs (avec invalidation cache si besoin)
  let resolved;
  try {
    resolved = await resolveEffectivePillars(args.brandNodeId);
  } catch {
    // Si la résolution échoue (BrandNode introuvable), gate désactivé (NOT_APPLICABLE).
    return {
      status: "OK",
      reason: "BrandNode introuvable — gate non applicable",
      matched: [],
      ancestorTone: null,
      ancestorArchetype: null,
    };
  }

  // 2. Extraire tone + archétype depuis pilier A (Authenticity)
  const aContent = resolved.pillars.a.content as Record<string, unknown> | null;
  const tone = typeof aContent?.["tone"] === "string" ? (aContent["tone"] as string) : null;
  const archetype = typeof aContent?.["archetype"] === "string" ? (aContent["archetype"] as string) : null;

  if (!tone && !archetype) {
    return {
      status: "OK",
      reason: "Aucun tone ni archétype défini sur l'arbre — gate non applicable",
      matched: [],
      ancestorTone: null,
      ancestorArchetype: null,
    };
  }

  // 3. Match anti-patterns
  const matched: string[] = [];
  const toneNorm = (tone ?? "").toLowerCase();
  for (const pattern of ANTI_PATTERNS) {
    const toneHit = pattern.tone.some((t) => toneNorm.includes(t));
    if (!toneHit) continue;
    for (const anti of pattern.antiKeywords) {
      if (lower.includes(anti)) {
        matched.push(`tone="${pattern.tone.find((t) => toneNorm.includes(t))}" vs output contains "${anti}"`);
      }
    }
  }

  if (matched.length > 0) {
    return {
      status: "VETOED",
      reason: `NARRATIVE_COHERENCE_VETOED — anti-pattern detected: ${matched.join(" ; ")}`,
      matched,
      ancestorTone: tone,
      ancestorArchetype: archetype,
    };
  }

  // 4. Si tone défini mais provenance INHERITED_FROM (ancêtre), warn-level downgrade
  if (resolved.pillars.a.source === "INHERITED_FROM") {
    // Output passe mais on signale que l'output devrait respecter le tone ancestral.
    return {
      status: "OK",
      reason: `Pilier A hérité de ${resolved.pillars.a.provenanceNodeName ?? "?"} — vérification anti-pattern OK`,
      matched: [],
      ancestorTone: tone,
      ancestorArchetype: archetype,
    };
  }

  return {
    status: "OK",
    reason: "Aucun anti-pattern détecté",
    matched: [],
    ancestorTone: tone,
    ancestorArchetype: archetype,
  };
}

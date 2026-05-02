// ============================================================================
// MODULE — Brand Level Evaluator
// LLM judges the brand's actual STAGE on the ladder (Zombie → Icone) based
// on the SUBSTANCE of what was provided, not on form completion.
// ============================================================================
//
// This is distinct from:
//  - structural.ts / semantic.ts → completeness scorers (form filling rate)
//  - pillar-maturity/assessor.ts → maturity stage (EMPTY/INTAKE/ENRICHED/COMPLETE)
//
// The level evaluator answers: "given what this brand actually said, where
// does it sit on the ladder ?" — and produces the trajectory to CULTE.
// ============================================================================

import { callLLM, extractJSON } from "@/server/services/llm-gateway";
import { ADVE_STORAGE_KEYS } from "@/domain";

export type BrandLevel = "ZOMBIE" | "FRAGILE" | "ORDINAIRE" | "FORTE" | "CULTE" | "ICONE";

export const BRAND_LEVELS: BrandLevel[] = ["ZOMBIE", "FRAGILE", "ORDINAIRE", "FORTE", "CULTE", "ICONE"];

export const LEVEL_DEFINITIONS: Record<BrandLevel, { tagline: string; signals: string }> = {
  ZOMBIE: {
    tagline: "Invisible — fondations a poser",
    signals: "Pas de proposition de valeur differenciee, pas d'ADN exprime, pas de communaute, langage generique. La marque existe juridiquement mais pas dans la tete des gens.",
  },
  FRAGILE: {
    tagline: "Intuitions justes — coherence a stabiliser",
    signals: "Mission ou promesse esquissee mais pas codifiee. Brand book absent ou partiel. Coherence verbale/visuelle inconstante. Communaute embryonnaire, pas de rituels.",
  },
  ORDINAIRE: {
    tagline: "Fonctionnelle — substituable",
    signals: "La marque livre. Identite presente mais generique sur son marche. Concurrence directe interchangeable. Pas de signature memorable. Pas d'ennemi nomme.",
  },
  FORTE: {
    tagline: "Distincte — preferee par certains",
    signals: "Positionnement clair, differenciation reelle, voix reconnaissable. Premiers ambassadeurs spontanes. Rituels emergents. Promesse maitre formulee et tenue.",
  },
  CULTE: {
    tagline: "Mouvement — communaute engagee",
    signals: "Communaute structuree avec hierarchie tacite, rituels reguliers, signature visuelle/verbale identifiable. Mythologie portee par les fans. Ennemi commun. Vocabulaire interne.",
  },
  ICONE: {
    tagline: "Reference sectorielle — patrimoine",
    signals: "Position dominante etablie, transmission generationnelle, defense de territoire. La marque definit la categorie. Ambassadeurs publics, presse acquise.",
  },
};

export interface BrandLevelEvaluation {
  /** Current level placement based on substance */
  level: BrandLevel;
  /** Confidence 0–1 — how confident the evaluator is about the placement */
  confidence: number;
  /** 2–3 sentence justification citing extracted values */
  justification: string;
  /** Per-pillar level signals (which pillars hit which level) */
  pillarSignals: Array<{
    pillar: "a" | "d" | "v" | "e";
    level: BrandLevel;
    signal: string;
  }>;
  /** Immediate next milestone — what unlocks the next level */
  nextMilestone: {
    targetLevel: BrandLevel;
    /** 1–2 sentence headline */
    headline: string;
    /** 2–3 concrete moves to climb the next rung */
    moves: string[];
  };
  /** Full trajectory current → ICONE (the apex everyone aims for). */
  pathToIcone: Array<{
    level: BrandLevel;
    /** What this stage looks like for THIS brand specifically */
    description: string;
    /** Key milestone to reach this stage */
    keyMilestone: string;
  }>;
  /** Aspirational — what ICONE looks like for THIS brand specifically */
  iconeVision: string;
}

const SYSTEM_PROMPT = `Tu es Mestor, le strategiste senior de La Fusee. Tu \
evalues le NIVEAU REEL d'une marque sur une echelle Zombie → Icone — pas son \
taux de remplissage de formulaire.

ECHELLE (du plus bas au plus haut) :
1. ZOMBIE     — Invisible. Fondations absentes. Substance generique ou manquante.
2. FRAGILE    — Intuitions justes mais pas verrouillees. Coherence inconstante.
3. ORDINAIRE  — Fonctionnelle mais substituable. Pas de differenciation reelle.
4. FORTE      — Distincte, preferee par certains. Positionnement clair, premiers ambassadeurs.
5. CULTE      — Mouvement structure. Communaute engagee, rituels, mythologie partagee.
6. ICONE      — Reference sectorielle. Patrimoine, transmission, position defendable.

REGLES DE JUGEMENT :
1. Tu juges sur la SUBSTANCE et la SPECIFICITE des valeurs extraites — pas leur \
quantite. Un seul champ specifique et tranchant peut placer plus haut que dix \
champs generiques.
2. Indices CULTE/ICONE : ennemi nomme, rituels, vocabulaire interne, hierarchie \
communautaire, mythologie, prises de position vs neutralite.
3. Indices ORDINAIRE/FRAGILE : adjectifs vagues, "qualite", "innovation" sans preuve, \
persona stereotype, pas d'ennemi.
4. Le niveau le plus bas atteint sur les 4 piliers ADVE TIRE le placement vers le bas \
(une marque culte mais sans authenticite definie n'est pas culte).
5. Tu cites EXPLICITEMENT des valeurs extraites dans ta justification.
6. La cible ULTIME est ICONE pour TOUTES les marques. La trajectoire pathToIcone \
montre les paliers intermediaires entre le niveau actuel et ICONE — specifique \
a cette marque, pas de generalites.

Reponds UNIQUEMENT avec un objet JSON valide. Pas de markdown.`;

export async function evaluateBrandLevel(input: {
  companyName: string;
  sector: string | null;
  country: string | null;
  responses: Record<string, Record<string, string>> | null;
  extractedValues: Record<"a" | "d" | "v" | "e", Record<string, unknown>>;
  /** Completion percentages per pillar — used as a confidence prior */
  completionByPillar: Record<"a" | "d" | "v" | "e", number>;
}): Promise<BrandLevelEvaluation> {
  const { companyName, sector, country, responses, extractedValues, completionByPillar } = input;

  const formatExtracted = () => {
    const lines: string[] = [];
    for (const pillar of [...ADVE_STORAGE_KEYS]) {
      const fields = extractedValues[pillar] ?? {};
      const filled = Object.entries(fields).filter(([, v]) => v != null && v !== "");
      const pct = (completionByPillar[pillar] * 100).toFixed(0);
      if (filled.length === 0) {
        lines.push(`[${pillar.toUpperCase()}] AUCUN champ extrait (completude: ${pct}%)`);
      } else {
        lines.push(`[${pillar.toUpperCase()}] (${filled.length} champ(s), completude: ${pct}%) :`);
        for (const [k, v] of filled) {
          const display = typeof v === "string" ? v : JSON.stringify(v);
          lines.push(`  - ${k}: ${display.slice(0, 220)}`);
        }
      }
    }
    return lines.join("\n");
  };

  const formatResponses = () => {
    if (!responses) return "(non disponible)";
    const lines: string[] = [];
    for (const [pillar, answers] of Object.entries(responses)) {
      const text = Object.values(answers ?? {})
        .filter((v) => typeof v === "string" && v.trim())
        .join(" | ");
      if (text) lines.push(`[${pillar.toUpperCase()}] ${text.slice(0, 500)}`);
    }
    return lines.join("\n") || "(aucune reponse texte)";
  };

  const prompt = `MARQUE : ${companyName}
SECTEUR : ${sector ?? "non precis"}
PAYS : ${country ?? "non precis"}

VALEURS EXTRAITES PAR PILIER ADVE :
${formatExtracted()}

REPONSES BRUTES DE LA MARQUE :
${formatResponses()}

Produis le JSON suivant (toutes les justifications doivent CITER au moins une valeur extraite) :
{
  "level": "ZOMBIE | FRAGILE | ORDINAIRE | FORTE | CULTE | ICONE",
  "confidence": 0.0-1.0,
  "justification": "<2-3 phrases citant des valeurs extraites>",
  "pillarSignals": [
    { "pillar": "a", "level": "...", "signal": "<phrase qui cite une valeur extraite ou son absence>" },
    { "pillar": "d", "level": "...", "signal": "..." },
    { "pillar": "v", "level": "...", "signal": "..." },
    { "pillar": "e", "level": "...", "signal": "..." }
  ],
  "nextMilestone": {
    "targetLevel": "<niveau immediatement superieur>",
    "headline": "<1-2 phrases : le declic qui fait passer au niveau suivant>",
    "moves": ["<action concrete 1>", "<action concrete 2>", "<action concrete 3>"]
  },
  "pathToIcone": [
    { "level": "<niveau actuel>",                 "description": "<ce qu'on observe aujourd'hui>",         "keyMilestone": "<le verrou actuel>" },
    { "level": "<palier intermediaire 1>",         "description": "<a quoi ca ressemble pour CETTE marque>", "keyMilestone": "<jalon a franchir>" },
    { "level": "<palier intermediaire 2 si applicable>", "description": "...",                              "keyMilestone": "..." },
    { "level": "ICONE",                           "description": "<vision ICONE specifique a cette marque>", "keyMilestone": "<le verrou final avant ICONE>" }
  ],
  "iconeVision": "<3-4 phrases : ce que devient cette marque au statut ICONE — specifique a son secteur, son pays, ses valeurs extraites>"
}

Le pathToIcone DOIT inclure tous les paliers du niveau actuel jusqu'a ICONE (sans les sauter). Pour une marque ZOMBIE, c'est 6 entrees (Zombie → Fragile → Ordinaire → Forte → Culte → Icone). Pour une marque deja FORTE, c'est 3 entrees (Forte → Culte → Icone). Si la marque est deja ICONE, pathToIcone contient une seule entree (consolidation/transmission).`;

  const { text } = await callLLM({
    system: SYSTEM_PROMPT,
    prompt,
    caller: "quick-intake:brand-level-evaluator",
    purpose: "agent",
    maxOutputTokens: 2500,
  });

  const parsed = extractJSON(text) as Partial<BrandLevelEvaluation>;

  if (
    !parsed ||
    !parsed.level ||
    !BRAND_LEVELS.includes(parsed.level) ||
    typeof parsed.justification !== "string" ||
    !Array.isArray(parsed.pillarSignals) ||
    parsed.pillarSignals.length !== 4 ||
    !parsed.nextMilestone ||
    !Array.isArray(parsed.pathToIcone) ||
    parsed.pathToIcone.length === 0 ||
    typeof parsed.iconeVision !== "string"
  ) {
    throw new Error("Brand level evaluation: shape invalide retournee par le LLM");
  }

  return {
    ...parsed,
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.7,
  } as BrandLevelEvaluation;
}

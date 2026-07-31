import {
  ADVE_STORAGE_KEYS,
  BRAND_TIERS,
  type BrandTier,
  TIER_DEFINITIONS,
  classifyTier,
  nextTier,
  tierIndex,
  compareTiers,
  normalizePalier,
} from "@/domain";
import { sectorDisplayLabel } from "@/domain/sector-taxonomy";
import { getAllQuestions } from "./question-bank";

/**
 * Nombre de volets du diagnostic, DÉRIVÉ de la banque de questions plutôt
 * qu'écrit en dur : ajouter un pilier au questionnaire ne doit pas laisser
 * cette base mentir en silence (aujourd'hui 9 — biz + A/D/V/E + R/T/I/S).
 */
const TOTAL_INTAKE_PHASES = Object.keys(getAllQuestions()).length;

// ============================================================================
// MODULE — Brand Level Evaluator
// Judges the brand's actual STAGE on the ladder (Latent → Icone) based on the
// SUBSTANCE of what was provided, not on form completion.
//
// Two modes:
//  - LLM mode (default)  : nuanced substance read (ennemi nommé, rituels, …).
//  - DETERMINISTIC mode  : pure rules from completion + extracted-field density.
//    Always available, used as fallback when the LLM is unavailable or returns
//    an invalid shape — so the intake NEVER blocks on the model (mandate:
//    "compilation fonctionne même sans LLM").
// ============================================================================
//
// This is distinct from:
//  - structural.ts / semantic.ts → completeness scorers (form filling rate)
//  - pillar-maturity/assessor.ts → maturity stage (EMPTY/INTAKE/ENRICHED/COMPLETE)
//
// The level evaluator answers: "given what this brand actually said, where
// does it sit on the ladder ?" — and produces the trajectory to ICONE.
// ============================================================================

import { callLLM, extractJSON } from "@/server/services/llm-gateway";
import { wrapUntrusted, sanitizeInline, UNTRUSTED_NOTICE } from "@/server/services/utils/untrusted-content";

// The ladder is canonical (`@/domain/brand-tier`). These aliases keep the
// historical export surface (BrandLevel / BRAND_LEVELS / LEVEL_DEFINITIONS).
export type BrandLevel = BrandTier;

export const BRAND_LEVELS: readonly BrandLevel[] = BRAND_TIERS;

export const LEVEL_DEFINITIONS: Record<BrandLevel, { tagline: string; signals: string }> =
  Object.fromEntries(
    BRAND_TIERS.map((t) => [t, { tagline: TIER_DEFINITIONS[t].tagline, signals: TIER_DEFINITIONS[t].signals }]),
  ) as Record<BrandLevel, { tagline: string; signals: string }>;

export interface BrandLevelEvaluation {
  /** Current level placement based on substance */
  level: BrandLevel;
  /** Confidence 0–1 — how confident the evaluator is about the placement */
  confidence: number;
  /**
   * SUR QUOI ce niveau repose (2026-07-31).
   *
   * Signalement opérateur : « Irawo est LATENT alors que c'est une marque
   * forte ». Vérifié en base — l'intake ne portait qu'UNE phase déclarée sur
   * neuf, le pilier D était vide, et la règle canon (« la fondation la plus
   * faible tire le placement ») produisait donc LATENT. Le calcul était
   * juste ; ce que le rapport en disait ne l'était pas : il annonçait un
   * VERDICT SUR LA MARQUE là où il ne mesurait qu'un formulaire peu rempli.
   *
   * Le niveau ne peut plus voyager sans sa base. Quand elle est trop mince,
   * `provisional` passe à vrai et le rapport doit le dire au lieu de laisser
   * croire à un jugement établi — même doctrine que le « score provisoire »
   * du /scorer (ADR-0187).
   */
  basis: {
    /** Phases du questionnaire réellement renseignées. */
    declaredPhases: number;
    /** Phases attendues au total. */
    totalPhases: number;
    /** Piliers ADVE entièrement vides — ceux qui tirent le placement vers le bas. */
    emptyPillars: Array<"a" | "d" | "v" | "e">;
    /** true = trop peu déclaré pour qu'un palier soit un verdict. */
    provisional: boolean;
    /**
     * Le SECOND axe : ce que le public constate, indépendamment de ce que la
     * marque a déclaré. `null` = aucun scan, donc rien à constater.
     *
     * Le niveau se lit sur les deux : le déclaratif dit ce que la marque SAIT
     * d'elle-même, la constatation dit ce que le monde VOIT. Une marque peut
     * être muette au questionnaire et parfaitement visible dehors — c'était le
     * cas d'Irawo, classée « invisible » avec cinq réseaux et un prix.
     */
    observed?: { site: boolean; socials: number; press: number; publishing: boolean; signals: number } | null;
    /**
     * Renseigné quand la présence constatée a RELEVÉ le palier : le rapport
     * doit dire qu'un plancher s'est appliqué, et depuis quoi.
     */
    visibilityFloorApplied?: { from: BrandTier; to: BrandTier } | null;
    /**
     * Renseigné quand la preuve disponible a ÉCRÊTÉ le palier : le LLM
     * annonçait plus haut que ce que la déclaration + la constatation peuvent
     * payer (cas « Naruto » classé CULTE sur du vide). Même doctrine que le
     * plancher : jamais d'ajustement silencieux.
     */
    evidenceCeilingApplied?: { from: BrandTier; to: BrandTier } | null;
  };
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
evalues le NIVEAU REEL d'une marque sur une echelle Latent → Icone — pas son \
taux de remplissage de formulaire.

ECHELLE (du plus bas au plus haut) :
1. LATENT     — Invisible. Fondations absentes. Substance generique ou manquante.
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
7. CECITE AU NOM (imperatif) : tu ne sais RIEN de cette marque en dehors des \
valeurs extraites ci-dessus. Si le nom t'est celebre — personnage de fiction, \
franchise, entreprise mondialement connue — tu n'importes RIEN de ta culture \
generale : ni communaute, ni rituels, ni mythologie que les valeurs extraites \
ne contiennent pas. Un nom celebre avec une substance vide est une substance \
vide. (Defaut mesure : « Naruto » saisi dans le formulaire a ete classe CULTE \
sur une justification entierement fabriquee depuis la notoriete de l'anime.)
8. Tu reponds INTEGRALEMENT en francais — c'est un rapport client francophone.

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
    for (const pillar of ADVE_STORAGE_KEYS) {
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
    return lines.join("\n") || "(aucune réponse texte)";
  };

  // LOT 1e — entrées non fiables neutralisées (anti-injection). Nom/secteur/pays
  // inline ; valeurs extraites + réponses brutes (texte founder) balisées en bloc.
  const prompt = `MARQUE : ${sanitizeInline(companyName, { max: 120 })}
SECTEUR : ${sanitizeInline(sectorDisplayLabel(sector) ?? sector ?? "non precis", { max: 80 })}
PAYS : ${sanitizeInline(country ?? "non precis", { max: 60 })}

${wrapUntrusted("VALEURS EXTRAITES PAR PILIER ADVE", formatExtracted(), { max: 8000 })}

${wrapUntrusted("REPONSES BRUTES DE LA MARQUE", formatResponses(), { max: 8000 })}

Produis le JSON suivant (toutes les justifications doivent CITER au moins une valeur extraite) :
{
  "level": "LATENT | FRAGILE | ORDINAIRE | FORTE | CULTE | ICONE",
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

Le pathToIcone DOIT inclure tous les paliers du niveau actuel jusqu'a ICONE (sans les sauter). Pour une marque LATENT, c'est 6 entrees (Latent → Fragile → Ordinaire → Forte → Culte → Icone). Pour une marque deja FORTE, c'est 3 entrees (Forte → Culte → Icone). Si la marque est deja ICONE, pathToIcone contient une seule entree (consolidation/transmission).`;

  // Deterministic baseline — always computable, no LLM. Used as the fallback
  // when the model is unavailable or returns an invalid shape.
  const deterministic = deriveBrandLevelDeterministic(input);

  // Gate (PR-K3-ter — économie d'appels + anti-hallucination). Le LLM n'apporte
  // une lecture « substance » nuancée (ennemi nommé, rituels, mythologie →
  // CULTE/ICONE) que s'il y a assez de matière. Sur un intake pauvre, le modèle
  // ne peut que fabriquer un palier ; la lecture déterministe est alors tout
  // aussi fiable et gratuite. On exige BOTH thin (champs extraits ET texte brut)
  // pour ne jamais court-circuiter un intake riche en formulaire mais avare en prose.
  const totalFilledFields = ADVE_STORAGE_KEYS.reduce((n, k) => {
    const fields = extractedValues[k] ?? {};
    return (
      n +
      Object.values(fields).filter(
        (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0),
      ).length
    );
  }, 0);
  const totalResponseChars = responses
    ? Object.values(responses).reduce(
        (n, answers) =>
          n +
          Object.values(answers ?? {})
            .filter((v) => typeof v === "string")
            .join(" ").length,
        0,
      )
    : 0;
  if (totalFilledFields < 6 && totalResponseChars < 400) {
    return deterministic;
  }

  let text: string;
  try {
    const res = await callLLM({
      system: `${UNTRUSTED_NOTICE}\n\n${SYSTEM_PROMPT}`,
      prompt,
      caller: "quick-intake:brand-level-evaluator",
      purpose: "agent",
      maxOutputTokens: 2500,
    });
    text = res.text;
  } catch {
    // No LLM / gateway error → ship the deterministic evaluation.
    return deterministic;
  }

  let parsed: Partial<BrandLevelEvaluation>;
  try {
    parsed = extractJSON(text) as Partial<BrandLevelEvaluation>;
  } catch {
    return deterministic;
  }

  // Tolerant normalisation: the model may still emit the deprecated "ZOMBIE"
  // (few-shot residue) or a stray-case level. normalizePalier maps it back.
  const normLevel = normalizePalier(parsed?.level);

  if (
    !parsed ||
    !normLevel ||
    typeof parsed.justification !== "string" ||
    !Array.isArray(parsed.pillarSignals) ||
    parsed.pillarSignals.length !== 4 ||
    !parsed.nextMilestone ||
    !Array.isArray(parsed.pathToIcone) ||
    parsed.pathToIcone.length === 0 ||
    typeof parsed.iconeVision !== "string"
  ) {
    // Invalid LLM shape → deterministic fallback rather than throwing.
    return deterministic;
  }

  // Normalise nested levels too (pillarSignals, nextMilestone, pathToIcone).
  const pillarSignals = parsed.pillarSignals.map((p) => ({
    ...p,
    level: normalizePalier(p?.level) ?? normLevel,
  }));
  const nextMilestone = {
    ...parsed.nextMilestone,
    targetLevel: normalizePalier(parsed.nextMilestone.targetLevel) ?? (nextTier(normLevel) ?? "ICONE"),
  };
  const pathToIcone = parsed.pathToIcone.map((step) => ({
    ...step,
    level: normalizePalier(step?.level) ?? normLevel,
  }));

  // La base vaut pour LES DEUX voies (2026-07-31). Le `as` ci-dessous masquait
  // son absence sur le chemin LLM — c'est-à-dire sur la voie PRINCIPALE : le
  // rapport aurait annoncé un palier sans jamais dire sur combien de volets il
  // reposait, exactement le défaut signalé sur Irawo.
  const basis = computeLevelBasis({ responses, extractedValues });

  // Le plancher de visibilité vaut aussi ici — trouvé par l'audit du
  // 2026-07-31 : il n'était appliqué qu'à la voie déterministe, c'est-à-dire
  // à la voie de SECOURS. La voie principale aurait continué de rendre
  // « invisible » une marque constatée. Même règle, même seuil, même trace.
  const observedLlm = basis.observed ?? null;
  const floorAppliesLlm =
    normLevel === "LATENT" && (observedLlm?.signals ?? 0) >= VISIBILITY_FLOOR_SIGNALS;
  let finalLevel: BrandTier = floorAppliesLlm ? "FRAGILE" : normLevel;
  if (floorAppliesLlm) {
    basis.visibilityFloorApplied = { from: normLevel, to: finalLevel };
  }

  // Plafond de preuve — le LLM ne peut pas annoncer un palier que la
  // déclaration + la constatation ne peuvent pas payer (cas « Naruto »,
  // classé CULTE sur une justification fabriquée depuis la notoriété de
  // l'anime). Quand le plafond écrête, ce n'est pas seulement le palier qui
  // tombe : la justification ENTIÈRE est suspecte — elle cite des preuves qui
  // n'existent pas. La voie déterministe fait alors foi, avec la trace.
  const ceilingLlm = evidenceCeiling({
    declaredPhases: basis.declaredPhases,
    observedSignals: observedLlm?.signals ?? 0,
    extractedE: extractedValues.e ?? {},
  });
  if (compareTiers(finalLevel, ceilingLlm) > 0) {
    deterministic.basis.evidenceCeilingApplied = { from: finalLevel, to: deterministic.level };
    return deterministic;
  }

  // Le LLM a rédigé sa justification en croyant LATENT : si le plancher
  // relève le palier, on énonce le constat AVANT son texte — sinon le rapport
  // affiche « Fragile » au-dessus d'un paragraphe qui explique « invisible ».
  const justification = floorAppliesLlm
    ? `${describeObserved(observedLlm)} ${companyName} n'est donc pas une marque invisible — le niveau Fragile le reconnaît, et ce qui suit décrit la substance déclarée, qui reste le vrai chantier. ${parsed.justification}`
    : parsed.justification;

  return {
    ...parsed,
    level: finalLevel,
    justification,
    basis,
    pillarSignals,
    nextMilestone,
    pathToIcone,
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.7,
  } as BrandLevelEvaluation;
}

/**
 * Sur quoi un niveau repose — partagé par les DEUX voies (LLM et règles).
 *
 * Un palier calculé sur un volet déclaré sur neuf n'est pas un verdict sur la
 * marque : c'est la mesure d'un formulaire peu rempli. Signalement opérateur
 * 2026-07-31 sur « Irawo », vérifié en base — 1 phase déclarée, pilier D vide,
 * donc LATENT par la règle canon. Le calcul était juste, sa restitution non.
 */
/**
 * Présence PUBLIQUE constatée, lue dans l'empreinte du pilier E.
 *
 * ── Pourquoi ce garde-fou existe (2026-07-31) ──
 *
 * Mandat opérateur : « je veux que le déclaratif ET la constatation jouent de
 * pair pour afficher le vrai niveau — une marque qui n'est pas latente ne peut
 * pas être dans le même lot que le reste ».
 *
 * L'échelle définit LATENT comme « **Invisible**. Fondations absentes. » Or le
 * placement se prend sur le pilier ADVE le plus FAIBLE : un `d` vide suffit à
 * classer « invisible » une marque dotée d'un site joignable, de cinq réseaux,
 * de trois retombées presse et d'un prix international (cas Irawo, mesuré).
 * Le classement contredisait donc sa propre définition.
 *
 * Sur les six échelons, LATENT est le SEUL qui parle de visibilité — les cinq
 * autres parlent de substance stratégique. Le niveau mélangeait deux
 * dimensions et n'en mesurait qu'une.
 *
 * `null` = aucun scan (rien à constater, aucun plancher). Deux signaux
 * indépendants sont exigés : un site seul peut être une coquille vide, deux
 * sources concordantes attestent une existence publique réelle.
 */
export function observedVisibility(
  eContent: Record<string, unknown> | undefined,
): { site: boolean; socials: number; press: number; publishing: boolean; signals: number } | null {
  const wp = eContent?.webPresence as Record<string, unknown> | undefined;
  if (!wp || typeof wp !== "object") return null;
  const site = (wp.site as Record<string, unknown> | null)?.reachable === true;
  const socials = Array.isArray(wp.socials) ? wp.socials.length : 0;
  const press = Array.isArray(wp.press) ? wp.press.length : 0;
  const publishing = Boolean((wp.feed as Record<string, unknown> | undefined)?.lastPublishedAt);
  const signals = [site, socials >= 2, press >= 1, publishing].filter(Boolean).length;
  return { site, socials, press, publishing, signals };
}

/** Deux signaux concordants = la marque existe publiquement, donc pas « invisible ». */
const VISIBILITY_FLOOR_SIGNALS = 2;

/**
 * Plafond de PREUVE du niveau — miroir du plafond de preuve du composite.
 *
 * Défaut mesuré en production (2026-07-31) : « Naruto » saisi dans le
 * formulaire a été classé **CULTE** (composite 16,5) sur une justification
 * entièrement fabriquée depuis la notoriété de l'anime — « communauté mondiale
 * structurée, rituels ancrés » — sans un volet déclaré ni un signal constaté.
 * Pendant ce temps une marque de test (TEST-NEFER) lisait ORDINAIRE au-dessus
 * du FRAGILE de la vraie star du corpus. Le LLM jugeait sur sa culture
 * générale ; rien ne le bornait.
 *
 * La règle : un palier doit être PAYABLE en preuve — déclarée ou constatée.
 * Le plafond ne relève jamais (c'est le rôle du plancher de visibilité) ; il
 * écrête ce que la preuve disponible ne peut pas soutenir :
 *
 *   CULTE   exige une déclaration substantielle ET des marqueurs de culte
 *           déclarés (rituels, sacrements, commandements, rites) — c'est la
 *           définition même de l'échelon ;
 *   FORTE   exige une déclaration substantielle (≥4 volets sur 9) ;
 *   ORDINAIRE exige un début de déclaration (≥2 volets) OU une visibilité
 *           constatée nette (≥3 signaux) ;
 *   FRAGILE exige au moins UN volet déclaré ou la visibilité plancher ;
 *   ICONE   n'est jamais accessible depuis un intake (règle existante).
 */
export function evidenceCeiling(input: {
  declaredPhases: number;
  observedSignals: number;
  extractedE: Record<string, unknown>;
}): BrandTier {
  const { declaredPhases: d, observedSignals: s } = input;
  const e = input.extractedE ?? {};
  const cultMarkers = ["rituels", "sacraments", "commandments", "ritesDePassage", "sacredCalendar"].some(
    (k) => Array.isArray(e[k]) && (e[k] as unknown[]).length > 0,
  );
  if (d >= 4 && cultMarkers) return "CULTE";
  if (d >= 4) return "FORTE";
  if (d >= 2 || s >= 3) return "ORDINAIRE";
  if (d >= 1 || s >= VISIBILITY_FLOOR_SIGNALS) return "FRAGILE";
  return "LATENT";
}

/** « Ce que le public voit : … » — partagé par les deux voies (LLM et règles). */
function describeObserved(obs: ReturnType<typeof observedVisibility>): string {
  if (!obs) return "";
  const constate: string[] = [];
  if (obs.site) constate.push("un site actif");
  if (obs.socials > 0) constate.push(`${obs.socials} réseau${obs.socials > 1 ? "x" : ""}`);
  if (obs.press > 0) constate.push(`${obs.press} retombée${obs.press > 1 ? "s" : ""} presse`);
  if (obs.publishing) constate.push("des publications datées");
  return constate.length > 0 ? `Ce que le public voit : ${constate.join(", ")}.` : "";
}

function computeLevelBasis(input: {
  responses: Record<string, Record<string, string>> | null;
  extractedValues: Record<"a" | "d" | "v" | "e", Record<string, unknown>>;
}): BrandLevelEvaluation["basis"] {
  const declaredPhases = Object.values(input.responses ?? {}).filter(
    (slice) => slice && typeof slice === "object" && Object.values(slice).some((v) => v != null && v !== ""),
  ).length;
  const emptyPillars = (ADVE_STORAGE_KEYS as readonly ("a" | "d" | "v" | "e")[]).filter(
    (k) => Object.values(input.extractedValues[k] ?? {}).filter((v) => v != null && v !== "").length === 0,
  );
  return {
    declaredPhases,
    totalPhases: TOTAL_INTAKE_PHASES,
    emptyPillars,
    // Provisoire dès qu'un pilier ADVE entier manque OU que moins d'un tiers
    // du questionnaire a été renseigné : dans les deux cas le palier mesure
    // l'entrée, pas la marque.
    provisional: emptyPillars.length > 0 || declaredPhases * 3 < TOTAL_INTAKE_PHASES,
    // Le SECOND axe. Sans lui, le rapport n'énoncerait que le déclaratif et le
    // plancher de visibilité s'appliquerait en silence — une nouvelle boîte
    // noire, exactement ce qu'on vient de fermer ailleurs.
    observed: observedVisibility(input.extractedValues.e),
  };
}

// ============================================================================
// DETERMINISTIC EVALUATOR — pure rules, no LLM.
// ============================================================================

/**
 * ADVE-only level from completion + extracted-field density. Caps at FORTE:
 * CULTE/ICONE are defined by proven community/mass the rules can't observe
 * from an intake form, so the deterministic path never claims them.
 *
 * Tuned to NOT block new brands: a brand with a genuinely complete, dense
 * intake reaches FORTE; a sparse one sits at LATENT/FRAGILE — honestly.
 */
export function deriveBrandLevelDeterministic(input: {
  companyName: string;
  sector: string | null;
  country: string | null;
  responses: Record<string, Record<string, string>> | null;
  extractedValues: Record<"a" | "d" | "v" | "e", Record<string, unknown>>;
  completionByPillar: Record<"a" | "d" | "v" | "e", number>;
}): BrandLevelEvaluation {
  const { companyName, sector, extractedValues, completionByPillar } = input;
  // Libellé humain, jamais le CODE canon (« dans AUTRE » — fix 2026-07-20).
  const sectorLabel = sectorDisplayLabel(sector) ?? "son secteur";

  // Per-pillar density: fraction of extracted fields that are non-empty.
  const pillarDensity = (k: "a" | "d" | "v" | "e"): number => {
    const fields = extractedValues[k] ?? {};
    const entries = Object.values(fields);
    if (entries.length === 0) return 0;
    const filled = entries.filter((v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length;
    return filled / entries.length;
  };

  // Per-pillar score (0-1): weight declared completion + extracted density.
  const pillarScore = (k: "a" | "d" | "v" | "e"): number =>
    Math.min(1, (completionByPillar[k] ?? 0) * 0.6 + pillarDensity(k) * 0.4);

  const pillarLevelOf = (k: "a" | "d" | "v" | "e"): BrandTier => {
    const lvl = classifyTier(pillarScore(k) * 100, 100);
    return capAtForte(lvl);
  };

  // Overall = the WEAKEST ADVE pillar pulls the placement down (canon rule:
  // "le niveau le plus bas atteint sur les 4 piliers tire le placement").
  const overallScore = Math.min(...(ADVE_STORAGE_KEYS as readonly ("a" | "d" | "v" | "e")[]).map(pillarScore));
  const declaredLevel = capAtForte(classifyTier(overallScore * 100, 100));

  // ── Plancher de visibilité : le déclaratif et le constaté jouent de pair ──
  //
  // La règle du pilier le plus faible est juste pour la SUBSTANCE — un `d` vide
  // est une fondation manquante. Mais elle produisait « LATENT », défini par
  // l'échelle comme « **Invisible** », pour une marque dont on constate le
  // site, cinq réseaux, trois retombées presse et un prix international.
  //
  // Une existence publique CONSTATÉE ne relève donc que LATENT, et rien
  // au-dessus : l'empreinte prouve que la marque n'est pas invisible, elle ne
  // prouve rien sur sa substance stratégique. Prétendre l'inverse gonflerait
  // le palier sur du vide — le défaut qu'on passe la journée à corriger.
  const observed = observedVisibility(extractedValues.e);
  const floorApplies =
    declaredLevel === "LATENT" && (observed?.signals ?? 0) >= VISIBILITY_FLOOR_SIGNALS;
  const level: BrandTier = floorApplies ? "FRAGILE" : declaredLevel;

  const pillarSignals = (ADVE_STORAGE_KEYS as readonly ("a" | "d" | "v" | "e")[]).map((k) => {
    const fields = extractedValues[k] ?? {};
    const filled = Object.values(fields).filter((v) => v != null && v !== "").length;
    return {
      pillar: k,
      level: pillarLevelOf(k),
      signal:
        filled === 0
          ? `Aucune donnée exploitable sur le pilier ${k.toUpperCase()} — fondation à poser.`
          : `${filled} champ(s) renseigné(s) sur le pilier ${k.toUpperCase()} (densité ${(pillarDensity(k) * 100).toFixed(0)}%).`,
    };
  });

  const target = nextTier(level) ?? "ICONE";
  const nextMilestone = {
    targetLevel: target,
    headline: `Pour viser ${TIER_DEFINITIONS[target].label}, ${companyName} doit ${MILESTONE_MOVE[target]}.`,
    moves: DETERMINISTIC_MOVES[target],
  };

  // Build the full path current → ICONE.
  const startIdx = tierIndex(level);
  const pathToIcone = BRAND_TIERS.slice(startIdx).map((t) => ({
    level: t,
    description: `${TIER_DEFINITIONS[t].tagline} — pour ${companyName} dans ${sectorLabel}.`,
    keyMilestone: MILESTONE_MOVE[t],
  }));

  const basis = {
    ...computeLevelBasis({ responses: input.responses, extractedValues }),
    // Dit à l'écran qu'un plancher s'est appliqué, et depuis quel palier : un
    // relèvement silencieux serait aussi opaque que le « LATENT » sans raison
    // qu'il corrige.
    visibilityFloorApplied: floorApplies ? { from: declaredLevel, to: level } : null,
  };
  const { declaredPhases, emptyPillars } = basis;

  return {
    level,
    basis,
    confidence: 0.55, // honest: a rules read is less certain than a substance read
    // Langage fondateur (2026-07-20) : « Évaluation déterministe (sans LLM) »
    // est du jargon interne — le client n'a pas à connaître notre machinerie.
    // Depuis le 2026-07-31, la justification DIT SA BASE quand elle est mince :
    // annoncer « LATENT » sur un formulaire vide se lisait comme un jugement
    // sur la marque alors que c'était un constat sur l'entrée.
    justification: buildJustification({ companyName, level, basis, declaredPhases, emptyPillars }),
    pillarSignals,
    nextMilestone,
    pathToIcone,
    iconeVision: `Au statut Icône, ${companyName} deviendrait la référence de ${sectorLabel} : catégorie redéfinie autour d'elle, transmission générationnelle, masse de superfans en orbite stable.`,
  };
}

/**
 * Le texte du palier ÉNONCE les deux axes.
 *
 * Le déclaratif dit ce que la marque sait d'elle-même, la constatation dit ce
 * que le public voit. Les taire l'un ou l'autre, c'est ce qui a produit un
 * « LATENT » sans explication devant un fondateur qui savait sa marque visible.
 */
function buildJustification(input: {
  companyName: string;
  level: BrandTier;
  basis: BrandLevelEvaluation["basis"];
  declaredPhases: number;
  emptyPillars: Array<"a" | "d" | "v" | "e">;
}): string {
  const { companyName, level, basis, declaredPhases, emptyPillars } = input;

  // Ce que le public constate — énoncé AVANT le reproche sur le déclaratif :
  // un fondateur dont la marque est vivante doit lire d'abord ce qui est vu.
  const vu = describeObserved(basis.observed ?? null);

  if (basis.visibilityFloorApplied) {
    return `${vu} ${companyName} n'est donc pas une marque invisible — le niveau ${TIER_DEFINITIONS[level].label} le reconnaît. Ce qui manque n'est pas la présence mais la SUBSTANCE déclarée : ${declaredPhases} des ${TOTAL_INTAKE_PHASES} volets renseignés${emptyPillars.length > 0 ? `, ${emptyPillars.length === 1 ? "une fondation vide" : `${emptyPillars.length} fondations vides`}` : ""}. Le diagnostic complet est ce qui permettrait de juger votre stratégie, pas seulement votre visibilité.`.trim();
  }

  if (basis.provisional) {
    return `${vu} Évaluation provisoire : ${companyName} n'a renseigné que ${declaredPhases} des ${TOTAL_INTAKE_PHASES} volets du diagnostic${emptyPillars.length > 0 ? ` et ${emptyPillars.length === 1 ? "une fondation reste vide" : `${emptyPillars.length} fondations restent vides`}` : ""}. Le niveau ${TIER_DEFINITIONS[level].label} reflète donc ce qui a été déclaré, pas la valeur réelle de la marque — complétez le diagnostic pour un placement établi.`.trim();
  }

  return `${vu} Évaluation automatique à partir de vos réponses : chaque marque est tirée par sa fondation la plus faible — la vôtre place ${companyName} au niveau ${TIER_DEFINITIONS[level].label}. ${TIER_DEFINITIONS[level].signals}`.trim();
}

function capAtForte(t: BrandTier): BrandTier {
  return compareTiers(t, "FORTE") > 0 ? "FORTE" : t;
}

const MILESTONE_MOVE: Record<BrandTier, string> = {
  LATENT: "poser des fondations identitaires lisibles (mission, promesse, ADN)",
  FRAGILE: "codifier sa cohérence verbale et visuelle dans un brand book",
  ORDINAIRE: "trancher un positionnement distinctif et nommer un ennemi",
  FORTE: "structurer ses premiers ambassadeurs en rituels réguliers",
  CULTE: "installer une mythologie portée par la communauté",
  ICONE: "consolider sa position dominante et la transmettre",
};

const DETERMINISTIC_MOVES: Record<BrandTier, string[]> = {
  LATENT: ["Formuler une mission en une phrase", "Définir 3 valeurs distinctives", "Nommer la cible précise"],
  FRAGILE: ["Rédiger un brand book minimal", "Fixer un ton de voix", "Aligner les visuels existants"],
  ORDINAIRE: ["Choisir un angle de différenciation tranché", "Nommer l'ennemi/le statu quo", "Créer une signature mémorable"],
  FORTE: ["Identifier les premiers ambassadeurs", "Créer un rituel de marque récurrent", "Documenter les preuves de préférence"],
  CULTE: ["Écrire la mythologie de marque", "Structurer la hiérarchie communautaire", "Installer un vocabulaire interne"],
  ICONE: ["Défendre le territoire de catégorie", "Organiser la transmission", "Activer la presse acquise"],
};

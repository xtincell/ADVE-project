/**
 * I-Pillar Sequenced Generation — « éclater et séquencer l'output »
 *
 * Problème : le pilier I (Potentiel) est le schéma le plus dense du framework
 * (catalogue exhaustif : 6 canaux × 5+ actions, assets, activations, formats).
 * Le générer en UN SEUL appel LLM produit ~13k caractères de JSON. Un modèle
 * local 8B (hermes3) tronque au plafond `maxOutputTokens` → JSON aux accolades
 * non fermées → `extractJSON` échoue → le pilier entier est perdu (cf. logs
 * `[quick-intake] Pillar i extraction failed`).
 *
 * Solution : générer le catalogue SECTION PAR SECTION. Chaque appel produit un
 * petit fragment (un canal = 5-8 actions, ~800 chars) que même un 8B émet
 * proprement. On passe par le LLM Gateway → Ollama en mode 100% local, repli
 * cloud si crédits. `response_format: json_object` force du JSON valide ; en
 * secours, une 2e tentative SANS json_mode + un parseur tolérant rattrapent les
 * ratés ponctuels (un 8B rate ~1 section sur 6 au 1er jet).
 *
 * Chaque section est isolée : si elle échoue 2× → tableau vide (catalogue
 * partiel > échec total). `totalActions` est recalculé localement.
 */

import { callLLM } from "@/server/services/llm-gateway";
import { extractJSON } from "@/server/services/utils/llm";

// Canaux du catalogue I (cf. RTIS_PROMPTS.I dans rtis-cascade.ts)
export const I_CHANNELS = [
  "DIGITAL",
  "EVENEMENTIEL",
  "MEDIA_TRADITIONNEL",
  "PR_INFLUENCE",
  "PRODUCTION",
  "RETAIL_DISTRIBUTION",
] as const;

export type ICatalogue = {
  catalogueParCanal: Record<string, Array<Record<string, unknown>>>;
  assetsProduisibles: Array<Record<string, unknown>>;
  activationsPossibles: Array<Record<string, unknown>>;
  formatsDisponibles: string[];
  totalActions: number;
};

const SYSTEM = `Tu es Mestor, le moteur d'intelligence stratégique du framework ADVE-RTIS.
Tu produis le PILIER I (Potentiel) — l'inventaire EXHAUSTIF de ce qu'une marque PEUT faire — section par section.
Tu réponds TOUJOURS et UNIQUEMENT en JSON valide : pas de markdown, pas de commentaire, pas de texte autour.`;

/**
 * Modèle Ollama pour le pilier I. Par défaut `hermes3:8b` (ctx 4K, tient en
 * VRAM sur une GTX 1080 → ~42 tok/s, 100% GPU) plutôt que le `hermes3-ctx`
 * (ctx 64K) de la ModelPolicy qui déborde la VRAM → spill CPU → ~7 tok/s.
 * Les sections I sont petites (≤3K tokens), 4K de contexte suffisent largement.
 * Surcharge possible via env `OLLAMA_FAST_MODEL`.
 */
export const I_OLLAMA_MODEL = process.env.OLLAMA_FAST_MODEL ?? "hermes3:8b";

/** Résume un pilier en gardant la forme + l'intention sans saturer la fenêtre d'entrée du 8B. */
function compactPillar(content: unknown, cap = 1100): string {
  if (!content || typeof content !== "object") return "(vide)";
  const json = JSON.stringify(content);
  if (json.length <= cap) return json;
  const summary: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(content as Record<string, unknown>)) {
    if (v == null || v === "") continue;
    if (typeof v === "string") summary[k] = v.length > 150 ? v.slice(0, 150) + "…" : v;
    else if (Array.isArray(v)) summary[k] = `[${v.length} éléments]`;
    else if (typeof v === "object") summary[k] = `{${Object.keys(v as object).slice(0, 6).join(", ")}}`;
    else summary[k] = v;
  }
  const s = JSON.stringify(summary);
  return s.length <= cap ? s : s.slice(0, cap) + "…";
}

/** Contexte marque compact (ADVE + R + T) réutilisé pour chaque appel de section. */
export function buildContext(pillars: Record<string, unknown>): string {
  return ["A", "D", "V", "E", "R", "T"]
    .map((k) => `[PILIER ${k}]\n${compactPillar(pillars[k])}`)
    .join("\n\n");
}

/** Un appel LLM pour une section, via le gateway (Ollama en local). */
async function callSection(
  strategyId: string | undefined,
  context: string,
  instruction: string,
  maxOutputTokens: number,
  callerTag: string,
  jsonMode: boolean,
): Promise<string> {
  const tail = jsonMode ? "" : "\n\nIMPORTANT : réponds par le JSON BRUT uniquement (commence par { ), rien d'autre.";
  const { text } = await callLLM({
    system: SYSTEM,
    prompt: `CONTEXTE MARQUE (piliers ADVE + R + T, condensés) :\n${context}\n\n${instruction}${tail}`,
    caller: `mestor:i-seq:${callerTag}`,
    strategyId,
    purpose: "agent", // substituable Ollama (allowOllamaSubstitution=true)
    ollamaModel: I_OLLAMA_MODEL, // modèle rapide 4K ctx (cf. note ci-dessus)
    responseFormat: jsonMode ? "json_object" : "text",
    maxOutputTokens,
  });
  return text;
}

/** Extrait un tableau de la réponse, tolérant : {key:[...]}, [...] nu, 1er array trouvé, ou dict-d'objets. */
function parseArray(text: string, key: string): Array<Record<string, unknown>> {
  let obj: unknown;
  try {
    obj = extractJSON(text);
  } catch {
    return [];
  }
  if (Array.isArray(obj)) return obj as Array<Record<string, unknown>>;
  if (obj && typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    const direct = o[key];
    if (Array.isArray(direct)) return direct as Array<Record<string, unknown>>;
    // 1er array de valeur trouvé
    for (const v of Object.values(o)) {
      if (Array.isArray(v)) return v as Array<Record<string, unknown>>;
    }
    // Le modèle a parfois renvoyé un dict-d'objets ({ "1": {...}, "2": {...} })
    // au lieu d'un array. Si ≥2 valeurs sont des objets, on les collecte.
    const objVals = Object.values(o).filter((v) => v && typeof v === "object" && !Array.isArray(v));
    if (objVals.length >= 2) return objVals as Array<Record<string, unknown>>;
  }
  return [];
}

/** Extrait un tableau de strings (formats). */
function parseStringArray(text: string, key: string): string[] {
  const arr = parseArray(text, key);
  const flat: string[] = [];
  for (const item of arr as unknown[]) {
    if (typeof item === "string") flat.push(item);
    else if (item && typeof item === "object") {
      const v = Object.values(item as Record<string, unknown>).find((x) => typeof x === "string");
      if (typeof v === "string") flat.push(v);
    }
  }
  return flat;
}

/**
 * Une section, avec retry-on-empty : tentative 1 en json_mode ; si vide,
 * tentative 2 SANS json_mode (tactique diversifiée — un 8B qui a raté le
 * format contraint produit souvent un JSON brut correct au 2e jet).
 */
export async function sectionArray(args: {
  strategyId?: string;
  context: string;
  instruction: string;
  arrayKey: string;
  maxOutputTokens: number;
  tag: string;
  onProgress?: (msg: string) => void;
}): Promise<Array<Record<string, unknown>>> {
  const { strategyId, context, instruction, arrayKey, maxOutputTokens, tag, onProgress } = args;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const text = await callSection(strategyId, context, instruction, maxOutputTokens, tag, attempt === 1);
      const arr = parseArray(text, arrayKey);
      if (arr.length > 0) return arr;
      onProgress?.(`${tag}: vide (tentative ${attempt}/2)`);
    } catch (err) {
      onProgress?.(`${tag}: échec tentative ${attempt}/2 (${err instanceof Error ? err.message : String(err)})`);
    }
  }
  return [];
}

/**
 * Génère le catalogue I en séquençant l'output (1 appel par section, +retry).
 * Lecture seule : ne persiste rien — l'appelant (actualizePillar) sauvegarde.
 */
export async function generateICatalogueSequenced(args: {
  strategyId?: string;
  pillars: Record<string, unknown>;
  onProgress?: (msg: string) => void;
}): Promise<ICatalogue> {
  const { strategyId, pillars, onProgress } = args;
  const context = buildContext(pillars);
  const log = (m: string) => { onProgress?.(m); console.log(`[i-seq] ${m}`); };

  // ── 1. Catalogue par canal — 1 appel par canal (le gros morceau) ──────────
  const catalogueParCanal: Record<string, Array<Record<string, unknown>>> = {};
  for (const canal of I_CHANNELS) {
    const actions = await sectionArray({
      strategyId, context, arrayKey: "actions", maxOutputTokens: 1200, tag: `canal-${canal}`, onProgress: log,
      instruction: `Pour le CANAL « ${canal} », génère un inventaire de 5 à 8 actions marketing CONCRÈTES, spécifiques à CETTE marque (pas générique).
Chaque action = objet { "action": string, "format": string, "objectif": string, "pilierImpact": "A"|"D"|"V"|"E" }.
Réponds STRICTEMENT au format : { "actions": [ …5 à 8 objets… ] }`,
    });
    catalogueParCanal[canal] = actions;
    log(`canal ${canal}: ${actions.length} actions`);
  }

  // ── 2. Assets produisibles (10 — comme les activations, count qui passe) ──
  const assetsProduisibles = await sectionArray({
    strategyId, context, arrayKey: "assets", maxOutputTokens: 1600, tag: "assets", onProgress: log,
    instruction: `Génère 10 ASSETS produisibles pour cette marque.
Chaque asset = objet { "asset": string, "type": "VIDEO"|"PRINT"|"DIGITAL"|"PHOTO"|"AUDIO"|"PACKAGING"|"EXPERIENCE", "usage": string }.
Réponds STRICTEMENT au format : { "assets": [ …10 objets dans un TABLEAU… ] }`,
  });
  log(`assets: ${assetsProduisibles.length}`);

  // ── 3. Activations possibles ──────────────────────────────────────────────
  const activationsPossibles = await sectionArray({
    strategyId, context, arrayKey: "activations", maxOutputTokens: 1500, tag: "activations", onProgress: log,
    instruction: `Génère 10 ACTIVATIONS possibles pour cette marque.
Chaque activation = objet { "activation": string, "canal": string, "cible": string, "budgetEstime": "LOW"|"MEDIUM"|"HIGH" }.
Réponds STRICTEMENT au format : { "activations": [ …10 objets… ] }`,
  });
  log(`activations: ${activationsPossibles.length}`);

  // ── 4. Formats disponibles (léger) ────────────────────────────────────────
  let formatsDisponibles: string[] = [];
  for (let attempt = 1; attempt <= 2 && formatsDisponibles.length === 0; attempt++) {
    try {
      const text = await callSection(
        strategyId, context,
        `Liste 12 FORMATS de contenu disponibles pour cette marque (ex: reels, billboards, podcasts, newsletters, packaging, événements…).
Réponds STRICTEMENT au format : { "formats": [ …12 strings… ] }`,
        700, "formats", attempt === 1,
      );
      formatsDisponibles = parseStringArray(text, "formats");
    } catch { /* retry */ }
  }
  log(`formats: ${formatsDisponibles.length}`);

  // ── 5. totalActions = somme des actions de tous les canaux (calcul local) ──
  const totalActions = Object.values(catalogueParCanal).reduce(
    (acc, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
    0,
  );

  return { catalogueParCanal, assetsProduisibles, activationsPossibles, formatsDisponibles, totalActions };
}

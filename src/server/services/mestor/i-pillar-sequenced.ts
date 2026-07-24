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
import { wrapUntrusted, sanitizeInline, UNTRUSTED_NOTICE } from "@/server/services/utils/untrusted-content";

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
  /** Enveloppe budgétaire DÉTERMINISTE dérivée de V.unitEconomics.budgetCom (jamais inventée par le LLM). */
  potentielBudget?: Record<string, number>;
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
    else if (Array.isArray(v)) {
      // Garde les IDENTITÉS des items (name/nom/label) au lieu d'un opaque « [N éléments] » —
      // sans ça, une action I ne peut pas citer un persona par son nom (D condensé). Cap serré.
      const ids = v
        .slice(0, 5)
        .map((it) => {
          if (it && typeof it === "object" && !Array.isArray(it)) {
            const r = it as Record<string, unknown>;
            const id = r.name ?? r.nom ?? r.label ?? r.titre ?? r.title;
            if (typeof id === "string" && id.trim()) return id.length > 40 ? id.slice(0, 40) + "…" : id;
          }
          return null;
        })
        .filter(Boolean);
      summary[k] = ids.length > 0
        ? `[${v.length} éléments : ${ids.join(", ")}${v.length > ids.length ? ", …" : ""}]`
        : `[${v.length} éléments]`;
    }
    else if (typeof v === "object") summary[k] = `{${Object.keys(v as object).slice(0, 6).join(", ")}}`;
    else summary[k] = v;
  }
  const s = JSON.stringify(summary);
  return s.length <= cap ? s : s.slice(0, cap) + "…";
}

/** Contexte marque compact (ADVE + R + T) réutilisé pour chaque appel de section. */
export function buildContext(pillars: Record<string, unknown>): string {
  // LOT 1e — entrée non fiable neutralisée (anti-injection) : contenu des
  // piliers (dérivé du fondateur) balisé bloc par bloc ; la clé pilier est interne.
  return ["A", "D", "V", "E", "R", "T"]
    .map((k) => wrapUntrusted(`PILIER ${k}`, compactPillar(pillars[k]), { max: 1100 }))
    .join("\n\n");
}

const fcfaShort = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));

/**
 * Bloc de grounding ÉCONOMIQUE + MARCHÉ — chiffres RÉELS de V (budget) et T
 * (TAM/marché), NON tronqués (≠ compactPillar). Injecté dans chaque appel de
 * section pour que le catalogue I soit cohérent avec l'enveloppe budgétaire et
 * le marché réels (pas un blockbuster pour un budget de PME). Retourne aussi le
 * budgetCom pour le calcul déterministe de potentielBudget.
 */
function buildEconomicGrounding(pillars: Record<string, unknown>): { block: string; budgetCom: number | null } {
  const v = (pillars.V ?? {}) as Record<string, unknown>;
  const t = (pillars.T ?? {}) as Record<string, unknown>;
  const ue = (v.unitEconomics ?? {}) as Record<string, unknown>;
  const budgetCom = typeof ue.budgetCom === "number" && ue.budgetCom > 0 ? ue.budgetCom : null;
  const caVise = typeof ue.caVise === "number" ? ue.caVise : null;
  const tam = (t.tamSamSom ?? {}) as Record<string, { value?: unknown }>;
  const tamVal = typeof tam.tam?.value === "number" ? tam.tam.value : null;
  const samVal = typeof tam.sam?.value === "number" ? tam.sam.value : null;
  const bmf = typeof t.brandMarketFitScore === "number" ? t.brandMarketFitScore : null;
  const mr = (t.marketReality ?? {}) as Record<string, unknown>;
  // LOT 1e — entrée non fiable neutralisée (anti-injection) : tendances marché
  // (texte libre dérivé du pilier T) ; les montants budget/TAM sont des nombres calculés.
  const trends = Array.isArray(mr.macroTrends) ? mr.macroTrends.slice(0, 4).map((t) => sanitizeInline(t, { max: 200 })) : [];
  const lines = [
    "ENVELOPPE ÉCONOMIQUE & MARCHÉ (chiffres RÉELS — propose des actions cohérentes avec CE budget et CE marché) :",
    budgetCom != null ? `- Budget marketing annuel disponible : ${fcfaShort(budgetCom)} FCFA (les actions doivent tenir dans cette enveloppe)` : "- Budget marketing : non renseigné (V.unitEconomics.budgetCom)",
    caVise != null ? `- CA visé : ${fcfaShort(caVise)} FCFA` : null,
    (tamVal != null || samVal != null) ? `- Marché : TAM ${tamVal != null ? fcfaShort(tamVal) : "?"}${samVal != null ? ` / SAM ${fcfaShort(samVal)}` : ""}` : null,
    bmf != null ? `- Brand-Market Fit : ${bmf}/100` : null,
    trends.length ? `- Tendances marché (T) : ${trends.join(" ; ")}` : null,
  ].filter(Boolean);
  return { block: "\n\n" + lines.join("\n"), budgetCom };
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
  // LOT 1e — entrée non fiable neutralisée (anti-injection) : le `context`
  // (piliers fondateur) est déjà balisé par buildContext ; rappel sécurité au system.
  const { text } = await callLLM({
    system: `${UNTRUSTED_NOTICE}\n\n${SYSTEM}`,
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
  const grounding = buildEconomicGrounding(pillars);
  const context = buildContext(pillars) + grounding.block;
  const log = (m: string) => { onProgress?.(m); console.log(`[i-seq] ${m}`); };

  // ── 1. Catalogue par canal — 1 appel par canal (le gros morceau) ──────────
  // Chaque action porte le BACKBONE structuré (ADR-0088) requis par le
  // materializer BrandAction ET par l'agrégation S : `channel` + `status` +
  // `budgetEstime` (→ budget numérique via BUDGET_ESTIME_FCFA). status =
  // RECOMMENDED (proposé par l'IA, pas encore retenu) ; la promotion en
  // SELECTED_FOR_ROADMAP est faite par le protocole S à la sélection.
  const VALID_BUDGET = new Set(["LOW", "MEDIUM", "HIGH"]);
  const catalogueParCanal: Record<string, Array<Record<string, unknown>>> = {};
  for (const canal of I_CHANNELS) {
    const actions = await sectionArray({
      strategyId, context, arrayKey: "actions", maxOutputTokens: 1400, tag: `canal-${canal}`, onProgress: log,
      instruction: `Pour le CANAL « ${canal} », génère un inventaire de 5 à 8 actions marketing CONCRÈTES, spécifiques à CETTE marque (pas générique).
Chaque action = objet { "action": string, "format": string, "objectif": string, "pilierImpact": "A"|"D"|"V"|"E", "budgetEstime": "LOW"|"MEDIUM"|"HIGH" }.
Réponds STRICTEMENT au format : { "actions": [ …5 à 8 objets… ] }`,
    });
    // Enrichissement déterministe du backbone (ne dépend pas du 8B pour les enums critiques).
    catalogueParCanal[canal] = actions.map((a) => ({
      ...a,
      channel: canal,
      status: "RECOMMENDED",
      budgetEstime: VALID_BUDGET.has(String(a.budgetEstime)) ? a.budgetEstime : "MEDIUM",
    }));
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

  // potentielBudget DÉTERMINISTE depuis l'enveloppe V (jamais inventé par le LLM).
  const bc = grounding.budgetCom;
  const potentielBudget = bc != null
    ? { total: bc, media: Math.round(bc * 0.45), production: Math.round(bc * 0.30), talent: Math.round(bc * 0.15), technology: Math.round(bc * 0.10) }
    : undefined;

  return { catalogueParCanal, assetsProduisibles, activationsPossibles, formatsDisponibles, totalActions, ...(potentielBudget ? { potentielBudget } : {}) };
}

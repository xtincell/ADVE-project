/**
 * pillar-conformance.ts — le gate anti-corruption au seuil d'écriture d'un pilier
 * (ADR-0172, décision opérateur « normaliser vers le strict », appliquée honnêtement
 * à de la donnée DRAFT).
 *
 * Constat (audit ADVE 2026-07-22) : le canon et le schéma Zod strict sont deux
 * modèles de données différents (~450 divergences/canon). Les forcer toutes à zéro
 * exigerait soit d'assouplir le schéma (écarté), soit d'INVENTER du contenu (interdit
 * NEFER n°3 — placeholders « à calibrer » → number, bios non publiques…).
 *
 * Le gate distingue donc ce qui **casse le rendu** (à refuser) de ce qui est un état
 * DRAFT légitime (à tolérer, visiblement) :
 *
 *   - SHAPE (corruption structurelle, HARD-FAIL) : un objet ou un tableau attendu là
 *     où on reçoit un scalaire (ou l'inverse). Le renderer fait `.map()`/`.champ` →
 *     écran blanc. C'est reshapeable sans fabriquer. **Refusé.**
 *   - TYPE (advisory) : deux scalaires qui divergent (number attendu, string reçue —
 *     souvent un placeholder « à calibrer »). Rend correctement en l'état ; le forcer
 *     fabriquerait. Toléré + journalisé.
 *   - ENUM (advisory) : valeur hors enum mais chaîne lisible (« mensuelle » vs MONTHLY).
 *     Rend en l'état. La traduction FR→enum est un chantier tracé, pas un bloqueur.
 *   - LENGTH (advisory) : trop long/court. Rend en l'état.
 *   - MISSING (toléré, DRAFT) : champ absent. Le seed marque `validationStatus DRAFT` +
 *     `fieldCertainty INFERRED` précisément parce que c'est incomplet — l'opérateur
 *     complète via l'amendement de pilier (needsHuman).
 *
 * Le normaliseur (`normalizeToSchema`) tourne AVANT la classification : il absorbe les
 * enums foldables (accents/casse), les ids lisibles→UUID, les numériques extractibles.
 * Ce qui reste après lui est la vraie divergence.
 */
import { normalizeToSchema } from "@/domain/schema-normalizer";
import { PILLAR_SCHEMAS, validatePillarContent, type PillarKey } from "./pillar-schemas";

export type ConformanceClass = "SHAPE" | "TYPE" | "ENUM" | "LENGTH" | "MISSING";

export interface RawPillarError {
  path: string;
  message: string;
  code?: string;
  expected?: string;
  received?: string;
}

export interface ClassifiedError extends RawPillarError {
  kind: ConformanceClass;
}

export interface PillarConformance {
  /** true ssi aucune corruption structurelle (SHAPE) — la seule classe bloquante. */
  ok: boolean;
  /** Contenu normalisé (à persister — coercions leaf appliquées). */
  normalized: unknown;
  shape: ClassifiedError[];
  type: ClassifiedError[];
  enum: ClassifiedError[];
  length: ClassifiedError[];
  missing: ClassifiedError[];
  all: ClassifiedError[];
}

const isContainer = (t?: string) => t === "object" || t === "array" || t === "tuple" || t === "record" || t === "map" || t === "set";

/** Type runtime d'une valeur, aligné sur le vocabulaire Zod (`array`/`object`/scalaires). */
function runtimeType(v: unknown): string {
  if (v === undefined) return "undefined";
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

/** Valeur au chemin pointé `a.b.0.c` (indices numériques comme clés — Array["0"] marche). */
function valueAtPath(content: unknown, path: string): unknown {
  if (!path) return content;
  let cur: unknown = content;
  for (const seg of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/**
 * Classe une divergence Zod. Par `code` d'abord (robuste — insensible aux messages
 * custom/i18n), avec repli sur le texte du message. Cf. doctrine en tête de fichier.
 */
export function classifyConformanceError(err: RawPillarError): ConformanceClass {
  const { code, expected, received, message } = err;

  // 1. Par code Zod (chemin robuste).
  switch (code) {
    case "too_big":
    case "too_small":
      return "LENGTH";
    case "invalid_value":       // Zod 4 : enum / littéral
    case "invalid_enum_value":  // Zod 3
      return "ENUM";
    case "invalid_union": {
      // Zod émet `invalid_union` pour TOUTE divergence dans une arme — y compris un
      // simple scalaire mal typé (ex. `charismaScore:"8/10"` dans un union number|objet).
      // Nos unions sont scalaire|objet (stringOrShape/numberOrShape/listOfStringOr/…) :
      // une valeur SCALAIRE reçue rend correctement (l'arme scalaire) → advisory TYPE,
      // pas SHAPE. Seul un CONTENEUR reçu qui ne matche aucune arme est une vraie
      // corruption. `received` est résolu depuis le contenu réel (classifyPillarConformance).
      if (received === "undefined") return "MISSING";
      if (received && !isContainer(received)) return "TYPE";
      return "SHAPE";
    }
    case "invalid_format":      // uuid/url/email sur valeur présente → placeholder toléré
      return "TYPE";
    case "unrecognized_keys":
      return "TYPE";            // clés en trop : non bloquant (Zod strip par défaut ailleurs)
    case "invalid_type": {
      // Zod 4 n'expose pas toujours `received` : se rabattre sur le message.
      const mm = message.match(/expected (\w+), received (\w+)/);
      const exp = expected ?? mm?.[1];
      const rec = received ?? mm?.[2];
      if (rec === "undefined") return "MISSING";
      if (isContainer(exp) || isContainer(rec)) return "SHAPE";
      return "TYPE";
    }
  }

  // 2. Repli message (codes absents / anciens).
  if (/received undefined/.test(message)) return "MISSING";
  if (/^Invalid option/.test(message)) return "ENUM";
  if (/^Too (big|small)|caract[eè]res?/.test(message)) return "LENGTH";
  if (message.trim() === "Invalid input") return "SHAPE";
  const m = message.match(/expected (\w+), received (\w+)/);
  if (m) {
    const [, exp, rec] = m;
    if (isContainer(exp) || isContainer(rec)) return "SHAPE";
    return "TYPE";
  }
  return "SHAPE"; // inconnu → fail-safe visible
}

/**
 * Normalise `content` puis classe ses divergences au schéma strict du pilier.
 * `ok` est vrai ssi il ne reste **aucune** corruption structurelle (SHAPE).
 */
export function classifyPillarConformance(key: PillarKey, content: unknown): PillarConformance {
  const schema = PILLAR_SCHEMAS[key];
  const normalized = schema ? normalizeToSchema(content, schema) : content;
  const errors = validatePillarContent(key, normalized).errors ?? [];
  // Enrichit `received` avec le TYPE RÉEL de la valeur au chemin quand Zod ne le donne
  // pas (cas `invalid_union` notamment) — permet de distinguer un scalaire toléré d'un
  // conteneur structurellement corrompu.
  const all: ClassifiedError[] = errors.map((e) => {
    const received = e.received ?? runtimeType(valueAtPath(normalized, e.path));
    return { ...e, received, kind: classifyConformanceError({ ...e, received }) };
  });
  const by = (k: ConformanceClass) => all.filter((e) => e.kind === k);
  const shape = by("SHAPE");
  return {
    ok: shape.length === 0,
    normalized,
    shape,
    type: by("TYPE"),
    enum: by("ENUM"),
    length: by("LENGTH"),
    missing: by("MISSING"),
    all,
  };
}

/**
 * Gate de seed/ingestion. Normalise, classe, et **jette** si une corruption
 * structurelle subsiste (elle casserait le rendu). Retourne le contenu normalisé
 * à persister + le détail des advisories (à journaliser par l'appelant).
 *
 * @throws Error listant les erreurs SHAPE si `content` est structurellement corrompu.
 */
export function assertPillarConforms(
  key: PillarKey,
  content: unknown,
  label = "",
): PillarConformance {
  const c = classifyPillarConformance(key, content);
  if (!c.ok) {
    const lines = c.shape.map((e) => `  · ${e.path}: ${e.message}`).join("\n");
    throw new Error(
      `[pillar-conformance] pilier ${key}${label ? ` (${label})` : ""} : ${c.shape.length} corruption(s) structurelle(s) — un objet/tableau est attendu là où une valeur scalaire est fournie (casse le rendu). Reshape la donnée vers la forme stricte :\n${lines}`,
    );
  }
  return c;
}

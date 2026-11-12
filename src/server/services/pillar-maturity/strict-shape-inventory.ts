/**
 * Inventaire en LECTURE SEULE des formes ADVE refusées par leur schéma strict
 * (RESIDUAL-DEBT « Formats ADVE legacy », étape 1 du plan concret).
 *
 * Les piliers A/D/V/E gardent leur tolérance aux brouillons (ADR-0172) : leur
 * maturité n'est pas bornée par le schéma strict (`STRICT_CONTENT_PILLARS` = S seul).
 * Des formes stockées peuvent donc être rendues ou comptées présentes alors que le
 * schéma strict les refuse. Avant toute normalisation — sémantique, revue par un
 * humain, admise par les rails existants — il faut savoir exactement QUOI est
 * refusé, OÙ, avec quelle origine, quelle source et quelle écriture.
 *
 * Ce module ne fait que lire et rapporter :
 *  - aucune écriture, aucune normalisation, aucun renommage proposé, aucun appel de
 *    modèle ; la lecture en base passe par une transaction PostgreSQL READ ONLY en
 *    REPEATABLE READ (un instantané cohérent, toute écriture refusée par la base) ;
 *  - validation par le validateur strict existant (`validatePillarContent`, via
 *    `classifyStoredPillarContent`) et la classification existante du gate (ADR-0172),
 *    sur le contenu TEL QU'IL EST STOCKÉ — le normaliseur d'écriture n'est pas
 *    appliqué : ses coercions (enum, nombre, identifiant lisible → UUID) peuvent
 *    changer le sens et relèvent de la revue humaine de l'étape suivante ;
 *  - origine par le lecteur canonique `fieldStatusFor` (`_fieldProvenance` puis
 *    `fieldCertainty`), présence comptée par l'évaluateur de maturité existant
 *    (`assessPillar`), écriture retrouvée dans les archives `PillarVersion`
 *    (contenu AVANT chaque écriture) et ses reçus documentaires (`readCheckpoint`).
 *
 * Une clé hors schéma à côté d'un champ canonique absent est SIGNALÉE, jamais
 * rapprochée d'un champ canonique : deviner une correspondance serait inventer.
 */
import { isDeepStrictEqual } from "node:util";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { ADVE_STORAGE_KEYS } from "@/domain/pillars";
import { fieldStatusFor, provenanceTopKey } from "@/domain/field-provenance";
import { resolvePillarPath } from "@/domain/pillar-path";
import { documentEdition } from "@/domain/source-document";
import { classifyStoredPillarContent, type ConformanceClass } from "@/lib/types/pillar-conformance";
import { declaredObjectKeys } from "@/lib/types/pillar-maturity-contracts";
import type { PillarKey } from "@/lib/types/pillar-schemas";
import { readSourceReceipts, sourceFingerprint } from "@/server/services/ingestion-pipeline/source-usage";
import { readCheckpoint } from "@/server/services/pillar-versioning/checkpoint";
import { assessPillar } from "./assessor";

export const ADVE_INVENTORY_PILLARS = ADVE_STORAGE_KEYS;
export type AdveInventoryPillar = (typeof ADVE_INVENTORY_PILLARS)[number];
export const STRICT_SHAPE_INVENTORY_FORMAT = "adve-strict-shape-inventory-v1" as const;

/**
 * Situation d'un chemin refusé — le tri dont la revue a besoin :
 *  - PRESENT_REFUSED : une valeur est stockée à ce chemin et le schéma strict la refuse ;
 *  - ABSENT_BESIDE_UNDECLARED_KEYS : le champ canonique manque, mais son objet parent
 *    porte des clés que le schéma ne déclare pas (forme legacy probable, aucune
 *    correspondance supposée) ;
 *  - ABSENT : le champ manque et rien d'autre n'est stocké à côté (complétion, pas
 *    normalisation).
 */
export type ShapeSituation = "PRESENT_REFUSED" | "ABSENT_BESIDE_UNDECLARED_KEYS" | "ABSENT";

export interface InventorySourceReceipt { sourceId: string; contentHash: string }

/** Dernière écriture CONSERVÉE après laquelle le chemin porte sa valeur actuelle. */
export type RetainedChange =
  | { status: "NO_RETAINED_HISTORY" }
  | { status: "UNCHANGED_IN_RETAINED_HISTORY"; oldestRetainedVersion: number; retainedArchives: number }
  | {
      status: "CHANGED";
      /** Version archivée (contenu avant l'écriture). */
      fromVersion: number;
      /** Version produite par l'écriture. */
      producedVersion: number;
      at: string;
      author: string | null;
      reason: string | null;
      intentId: string | null;
      intentKind: string | null;
      /** Reçus documentaires de cette écriture ; null si l'archive n'a pas de point de contrôle. */
      sourceReceiptsUsed: InventorySourceReceipt[] | null;
    };

export interface StrictShapeFinding {
  /** Chemin tel que le validateur strict le liste (`valeurs.0.value`). */
  path: string;
  /** Même chemin en notation pilier (`valeurs[0].value`). */
  pillarPath: string;
  topKey: string;
  kind: ConformanceClass;
  situation: ShapeSituation;
  code: string | null;
  expected: string | null;
  /** Type de la valeur stockée (`undefined` quand le champ est absent). */
  found: string;
  message: string;
  /** Extrait court, masqué (courriels, numéros) et tronqué ; null si absent ou désactivé. */
  excerpt: string | null;
  /** Clés stockées dans l'objet parent que le schéma strict ne déclare pas. */
  undeclaredSiblingKeys: string[];
  /** Origine connue du champ (HUMAN/SOURCE/INFERRED/…, ou certitude legacy), sinon null. */
  provenance: string | null;
  /** Exigences de maturité satisfaites qui couvrent ce chemin (comptées présentes). */
  countedPresentBy: string[];
  lastRetainedChange: RetainedChange;
  /** Sources rattachées à ce chemin : reçus de l'écriture retrouvée et entrées legacy par champ. */
  sourceIds: string[];
}

export interface InventorySourceDetail {
  sourceId: string;
  /** Empreinte du reçu (null pour une entrée legacy sans reçu). */
  receiptHash: string | null;
  attachedToPillar: boolean;
  /** Nombre de chemins refusés qui citent cette source. */
  citedByFindings: number;
  lookup: "NOT_READ" | "NOT_FOUND" | "FOUND";
  sameStrategy: boolean | null;
  sourceType: string | null;
  certainty: string | null;
  /** L'empreinte actuelle du document égale celle du reçu ; null sans reçu ou sans lecture. */
  receiptMatchesCurrent: boolean | null;
  edition: { family: string; kind: string; label: string; edition: number; status: string } | null;
}

export interface PillarShapeInventory {
  strategyId: string;
  strategyName: string | null;
  strategyStatus: string | null;
  pillarKey: AdveInventoryPillar;
  pillarId: string | null;
  currentVersion: number | null;
  validationStatus: string | null;
  contentState: "ABSENT" | "PRESENT";
  maturity: { stage: string; completionPct: number } | null;
  /** Clés de premier niveau hors schéma (les métadonnées `_…` sont exclues). */
  undeclaredTopKeys: string[];
  sources: InventorySourceDetail[];
  findings: StrictShapeFinding[];
}

export interface StrictShapeInventoryTotals {
  strategies: number;
  pillarsRead: number;
  pillarsWithContent: number;
  pillarsRefused: number;
  findings: number;
  bySituation: Record<ShapeSituation, number>;
  byKind: Record<ConformanceClass, number>;
  byPillar: Record<AdveInventoryPillar, number>;
  presentCountedByMaturity: number;
}

export interface StrictShapeInventory {
  format: typeof STRICT_SHAPE_INVENTORY_FORMAT;
  mode: "DATABASE" | "CANONS";
  pillars: AdveInventoryPillar[];
  strategyFilter: string[] | null;
  /** État de la transaction de lecture, relu dans la base ; null hors base. */
  snapshot: { readOnly: boolean; isolation: string } | null;
  totals: StrictShapeInventoryTotals;
  entries: PillarShapeInventory[];
}

/** Archive d'une écriture (ligne `PillarVersion`). */
export interface PillarArchive {
  id?: string;
  version: number;
  content: unknown;
  author?: string | null;
  reason?: string | null;
  intentId?: string | null;
  createdAt: Date | string;
  checkpoint?: unknown;
}

export interface SourceRow {
  id: string;
  strategyId: string;
  sourceType: string;
  certainty: string;
  rawContent: string | null;
  rawData: unknown;
  extractedFields: unknown;
  fileName: string | null;
  fileType: string | null;
}

export interface PillarInventoryInput {
  strategyId: string;
  strategyName?: string | null;
  strategyStatus?: string | null;
  pillarKey: AdveInventoryPillar;
  pillarId?: string | null;
  content: unknown;
  fieldCertainty?: unknown;
  currentVersion?: number | null;
  validationStatus?: string | null;
  /** `Pillar.sources` tel que stocké. */
  sources?: unknown;
  archives?: readonly PillarArchive[];
  intentKinds?: ReadonlyMap<string, string>;
  sourceRows?: ReadonlyMap<string, SourceRow>;
  includeExcerpts?: boolean;
}

// ─── Lecture pure d'un pilier ────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function runtimeType(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  return Array.isArray(value) ? "array" : typeof value;
}

/** `valeurs.0.value` → `valeurs[0].value`, en suivant les tableaux réellement stockés. */
export function toPillarPath(content: unknown, dotPath: string): string {
  if (!dotPath) return "";
  let out = "";
  let cur: unknown = content;
  for (const seg of dotPath.split(".")) {
    if (Array.isArray(cur) && /^\d+$/.test(seg)) {
      out += `[${seg}]`;
      cur = cur[Number(seg)];
    } else {
      out += out ? `.${seg}` : seg;
      cur = isRecord(cur) ? cur[seg] : undefined;
    }
  }
  return out;
}

function parentPillarPath(pillarPath: string): string {
  const cut = Math.max(pillarPath.lastIndexOf("."), pillarPath.lastIndexOf("["));
  return cut <= 0 ? "" : pillarPath.slice(0, cut);
}

const EMAIL = /[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}/gi;
const PHONE = /\+?\d[\d\s().-]{6,}\d/g;

/**
 * Extrait court et non sensible : courriels et suites de chiffres de type téléphone
 * masqués, 48 caractères au plus ; pour un conteneur, sa seule forme (taille, clés).
 */
export function shortExcerpt(value: unknown): string | null {
  if (value === undefined) return null;
  if (value === null || typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") {
    const masked = value.replace(EMAIL, "[courriel]").replace(PHONE, "[numéro]").replace(/\s+/g, " ").trim();
    return JSON.stringify(masked.length > 48 ? `${masked.slice(0, 47)}…` : masked);
  }
  if (Array.isArray(value)) return `[tableau de ${value.length} élément${value.length > 1 ? "s" : ""}]`;
  if (isRecord(value)) {
    const keys = Object.keys(value);
    const shown = keys.slice(0, 6).join(", ");
    return `{objet : ${shown}${keys.length > 6 ? `, +${keys.length - 6}` : ""}}`;
  }
  return `[${typeof value}]`;
}

/** Tri naturel des chemins : segments numériques comparés comme nombres. */
export function comparePaths(a: string, b: string): number {
  const sa = a.split("."), sb = b.split(".");
  for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
    const x = sa[i], y = sb[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y);
    if (nx && ny) return Number(x) - Number(y);
    return x < y ? -1 : 1;
  }
  return 0;
}

function toDotPath(path: string): string {
  return path.replace(/\[(\d+)\]/g, ".$1");
}

function sortedArchives(archives: readonly PillarArchive[]): PillarArchive[] {
  const at = (a: PillarArchive) => new Date(a.createdAt).getTime();
  return [...archives].sort((a, b) => a.version - b.version || at(a) - at(b) || String(a.id ?? "").localeCompare(String(b.id ?? "")));
}

function receiptsOf(archive: PillarArchive): InventorySourceReceipt[] | null {
  try {
    return readCheckpoint(archive.checkpoint, archive.version).sourceReceiptsUsed.map(r => ({ sourceId: r.sourceId, contentHash: r.contentHash }));
  } catch {
    return null; // archive antérieure aux points de contrôle (ADR-0207) : rien n'est deviné
  }
}

/**
 * Écriture conservée après laquelle `path` porte sa valeur actuelle : la plus récente
 * archive dont la valeur diffère de la valeur courante a été remplacée par cette
 * écriture. Des écritures non archivées peuvent exister entre deux archives ; le
 * résultat est donc la dernière écriture CONSERVÉE, pas une certitude d'auteur.
 */
export function lastRetainedChange(
  current: Record<string, unknown>, pillarPath: string, archives: readonly PillarArchive[],
  intentKinds?: ReadonlyMap<string, string>,
): RetainedChange {
  if (archives.length === 0) return { status: "NO_RETAINED_HISTORY" };
  const ordered = sortedArchives(archives);
  const now = resolvePillarPath(current, pillarPath);
  for (let i = ordered.length - 1; i >= 0; i--) {
    const archive = ordered[i]!;
    const then = isRecord(archive.content) ? resolvePillarPath(archive.content, pillarPath) : undefined;
    if (isDeepStrictEqual(then, now)) continue;
    const at = new Date(archive.createdAt);
    return {
      status: "CHANGED",
      fromVersion: archive.version,
      producedVersion: archive.version + 1,
      at: Number.isNaN(at.getTime()) ? String(archive.createdAt) : at.toISOString(),
      author: archive.author ?? null,
      reason: archive.reason ?? null,
      intentId: archive.intentId ?? null,
      intentKind: archive.intentId ? intentKinds?.get(archive.intentId) ?? null : null,
      sourceReceiptsUsed: receiptsOf(archive),
    };
  }
  return { status: "UNCHANGED_IN_RETAINED_HISTORY", oldestRetainedVersion: ordered[0]!.version, retainedArchives: ordered.length };
}

/** Entrées legacy `Pillar.sources` `{ sourceId, field }` sans reçu d'empreinte. */
function legacyFieldSources(sources: unknown): Array<{ sourceId: string; field: string | null }> {
  if (!Array.isArray(sources)) return [];
  return sources.flatMap((entry: unknown) => {
    if (!isRecord(entry) || typeof entry.sourceId !== "string") return [];
    if (typeof entry.contentHash === "string" && /^[a-f0-9]{64}$/.test(entry.contentHash)) return [];
    return [{ sourceId: entry.sourceId, field: typeof entry.field === "string" ? entry.field : null }];
  });
}

function describeSource(
  sourceId: string, receiptHash: string | null, attachedToPillar: boolean, citedByFindings: number,
  strategyId: string, rows: ReadonlyMap<string, SourceRow> | undefined,
): InventorySourceDetail {
  const base = { sourceId, receiptHash, attachedToPillar, citedByFindings };
  if (!rows) {
    return { ...base, lookup: "NOT_READ", sameStrategy: null, sourceType: null, certainty: null, receiptMatchesCurrent: null, edition: null };
  }
  const row = rows.get(sourceId);
  if (!row) {
    return { ...base, lookup: "NOT_FOUND", sameStrategy: null, sourceType: null, certainty: null, receiptMatchesCurrent: null, edition: null };
  }
  const doc = documentEdition(row.rawData);
  return {
    ...base, lookup: "FOUND", sameStrategy: row.strategyId === strategyId,
    sourceType: row.sourceType, certainty: row.certainty,
    receiptMatchesCurrent: receiptHash ? sourceFingerprint(row) === receiptHash : null,
    edition: doc ? { family: doc.family, kind: doc.kind, label: doc.label, edition: doc.edition, status: doc.status } : null,
  };
}

/** Inventaire d'UN pilier. Pur : n'écrit rien, ne normalise rien, n'appelle aucun modèle. */
export function inventoryPillarContent(input: PillarInventoryInput): PillarShapeInventory {
  const key = input.pillarKey;
  const base = {
    strategyId: input.strategyId,
    strategyName: input.strategyName ?? null,
    strategyStatus: input.strategyStatus ?? null,
    pillarKey: key,
    pillarId: input.pillarId ?? null,
    currentVersion: input.currentVersion ?? null,
    validationStatus: input.validationStatus ?? null,
  };
  const attached = readSourceReceipts(input.sources);
  const legacy = legacyFieldSources(input.sources);
  if (!isRecord(input.content)) {
    const sources = [
      ...attached.map(r => describeSource(r.sourceId, r.contentHash, true, 0, input.strategyId, input.sourceRows)),
      ...legacy.map(l => describeSource(l.sourceId, null, true, 0, input.strategyId, input.sourceRows)),
    ];
    return { ...base, contentState: "ABSENT", maturity: null, undeclaredTopKeys: [], sources, findings: [] };
  }
  const content = input.content;
  const status = fieldStatusFor(
    isRecord(input.fieldCertainty) ? input.fieldCertainty as Record<string, string> : null,
    key, content._fieldProvenance,
  );
  const assessment = assessPillar(key, content);
  const satisfied = assessment.satisfied.map(toDotPath);
  const rootDeclared = declaredObjectKeys(key, "") ?? [];
  const undeclaredTopKeys = Object.keys(content).filter(k => !k.startsWith("_") && !rootDeclared.includes(k)).sort();
  const archives = input.archives ?? [];

  const findings = classifyStoredPillarContent(key.toUpperCase() as PillarKey, content).map((issue): StrictShapeFinding => {
    const pillarPath = toPillarPath(content, issue.path);
    const value = issue.path ? resolvePillarPath(content, pillarPath) : content;
    const present = value !== undefined;
    const parentPath = parentPillarPath(pillarPath);
    const parent = parentPath ? resolvePillarPath(content, parentPath) : content;
    let undeclaredSiblingKeys: string[] = [];
    if (isRecord(parent)) {
      const declared = parentPath ? declaredObjectKeys(key, parentPath) : rootDeclared;
      if (declared) undeclaredSiblingKeys = Object.keys(parent).filter(k => !k.startsWith("_") && !declared.includes(k)).sort();
    }
    const situation: ShapeSituation = present ? "PRESENT_REFUSED"
      : undeclaredSiblingKeys.length > 0 ? "ABSENT_BESIDE_UNDECLARED_KEYS" : "ABSENT";
    const topKey = issue.path.split(".")[0] ?? "";
    const change = issue.path ? lastRetainedChange(content, pillarPath, archives, input.intentKinds) : { status: "NO_RETAINED_HISTORY" as const };
    const fromWrite = change.status === "CHANGED" ? (change.sourceReceiptsUsed ?? []).map(r => r.sourceId) : [];
    const fromLegacy = legacy.filter(l => l.field !== null && provenanceTopKey(l.field, key) === topKey).map(l => l.sourceId);
    return {
      path: issue.path,
      pillarPath,
      topKey,
      kind: issue.kind,
      situation,
      code: issue.code ?? null,
      expected: issue.expected ?? null,
      found: runtimeType(value),
      message: issue.message,
      excerpt: input.includeExcerpts === false ? null : shortExcerpt(value),
      undeclaredSiblingKeys,
      provenance: (issue.path ? status(pillarPath) : undefined) ?? null,
      countedPresentBy: satisfied.filter(r => issue.path === r || issue.path.startsWith(`${r}.`) || r.startsWith(`${issue.path}.`)),
      lastRetainedChange: change,
      sourceIds: [...new Set([...fromWrite, ...fromLegacy])].sort(),
    };
  }).sort((a, b) => comparePaths(a.path, b.path) || a.message.localeCompare(b.message));

  // Une source par (document, empreinte) : deux éditions d'un même document restent distinctes.
  const refs = new Map<string, { sourceId: string; hash: string | null; attached: boolean; cited: number }>();
  const ref = (sourceId: string, hash: string | null) => {
    const k = `${sourceId}@${hash ?? ""}`;
    if (!refs.has(k)) refs.set(k, { sourceId, hash, attached: false, cited: 0 });
    return refs.get(k)!;
  };
  for (const r of attached) ref(r.sourceId, r.contentHash).attached = true;
  for (const l of legacy) ref(l.sourceId, null).attached = true;
  for (const f of findings) {
    const fromWrite = f.lastRetainedChange.status === "CHANGED" ? f.lastRetainedChange.sourceReceiptsUsed ?? [] : [];
    for (const r of fromWrite) ref(r.sourceId, r.contentHash).cited++;
    for (const id of f.sourceIds) if (!fromWrite.some(r => r.sourceId === id)) ref(id, null).cited++;
  }
  const sources = [...refs.values()]
    .sort((a, b) => a.sourceId.localeCompare(b.sourceId) || (a.hash ?? "").localeCompare(b.hash ?? ""))
    .map(r => describeSource(r.sourceId, r.hash, r.attached, r.cited, input.strategyId, input.sourceRows));

  return {
    ...base, contentState: "PRESENT",
    maturity: { stage: assessment.currentStage, completionPct: assessment.completionPct },
    undeclaredTopKeys, sources, findings,
  };
}

// ─── Assemblage, totaux, résumé ──────────────────────────────────────────────

function emptyTotals(): StrictShapeInventoryTotals {
  return {
    strategies: 0, pillarsRead: 0, pillarsWithContent: 0, pillarsRefused: 0, findings: 0,
    bySituation: { PRESENT_REFUSED: 0, ABSENT_BESIDE_UNDECLARED_KEYS: 0, ABSENT: 0 },
    byKind: { SHAPE: 0, TYPE: 0, ENUM: 0, LENGTH: 0, MISSING: 0 },
    byPillar: { a: 0, d: 0, v: 0, e: 0 },
    presentCountedByMaturity: 0,
  };
}

const PILLAR_ORDER: Record<AdveInventoryPillar, number> = { a: 0, d: 1, v: 2, e: 3 };

export function assembleInventory(
  entries: PillarShapeInventory[],
  meta: Pick<StrictShapeInventory, "mode" | "pillars" | "strategyFilter" | "snapshot">,
): StrictShapeInventory {
  const ordered = [...entries].sort((a, b) =>
    a.strategyId.localeCompare(b.strategyId) || PILLAR_ORDER[a.pillarKey] - PILLAR_ORDER[b.pillarKey]);
  const totals = emptyTotals();
  totals.strategies = new Set(ordered.map(e => e.strategyId)).size;
  totals.pillarsRead = ordered.length;
  for (const e of ordered) {
    if (e.contentState === "PRESENT") totals.pillarsWithContent++;
    if (e.findings.length > 0) totals.pillarsRefused++;
    for (const f of e.findings) {
      totals.findings++;
      totals.bySituation[f.situation]++;
      totals.byKind[f.kind]++;
      totals.byPillar[e.pillarKey]++;
      if (f.situation === "PRESENT_REFUSED" && f.countedPresentBy.length > 0) totals.presentCountedByMaturity++;
    }
  }
  return { format: STRICT_SHAPE_INVENTORY_FORMAT, ...meta, totals, entries: ordered };
}

export interface CanonInventorySource {
  name: string;
  pillars: ReadonlyArray<{ key: string; content: unknown }>;
  /** Certitudes par pilier telles que le seed les pose (`{ a: { "a.valeurs": "OFFICIAL" } }`). */
  fieldCertainty?: Partial<Record<string, unknown>>;
}

/**
 * Inventaire des canons du dépôt chargés en mémoire (aucune base) : même lecture
 * pure que pour la production, sans historique ni source (un canon n'en a pas).
 */
export function inventoryCanons(
  canons: readonly CanonInventorySource[],
  options: { pillars?: readonly AdveInventoryPillar[]; includeExcerpts?: boolean } = {},
): StrictShapeInventory {
  const pillars = [...new Set(options.pillars?.length ? options.pillars : ADVE_INVENTORY_PILLARS)]
    .sort((a, b) => PILLAR_ORDER[a] - PILLAR_ORDER[b]);
  const entries = canons.flatMap(canon => canon.pillars
    .filter((p): p is { key: AdveInventoryPillar; content: unknown } => (pillars as readonly string[]).includes(p.key))
    .map(p => inventoryPillarContent({
      strategyId: `canon:${canon.name}`, strategyName: canon.name, pillarKey: p.key, content: p.content,
      fieldCertainty: canon.fieldCertainty?.[p.key], includeExcerpts: options.includeExcerpts,
    })));
  return assembleInventory(entries, { mode: "CANONS", pillars, strategyFilter: null, snapshot: null });
}

function describeExpected(f: StrictShapeFinding): string {
  if (f.expected) return `attendu ${f.expected}`;
  return f.message.length > 90 ? `${f.message.slice(0, 89)}…` : f.message;
}

function describeChange(change: RetainedChange): string {
  if (change.status === "NO_RETAINED_HISTORY") return "aucune archive";
  if (change.status === "UNCHANGED_IN_RETAINED_HISTORY") return `inchangé depuis la plus ancienne archive (v${change.oldestRetainedVersion})`;
  return `dernière écriture conservée v${change.fromVersion}→v${change.producedVersion} du ${change.at.slice(0, 10)}`
    + `${change.intentKind ? ` (${change.intentKind})` : change.author ? ` (${change.author})` : ""}`;
}

/** Résumé lisible, en français. Les chemins absents sans clé voisine ne sont que comptés. */
export function summarizeInventory(inventory: StrictShapeInventory): string {
  const t = inventory.totals;
  const lines = [
    "Inventaire des formes ADVE refusées par le schéma strict — lecture seule",
    `Mode : ${inventory.mode === "DATABASE" ? "base de données" : "canons du dépôt chargés en mémoire"}`
      + (inventory.snapshot ? ` · transaction ${inventory.snapshot.readOnly ? "en lecture seule" : "NON en lecture seule"}, isolation ${inventory.snapshot.isolation}` : ""),
    `Stratégies : ${t.strategies} · piliers lus : ${t.pillarsRead} · avec contenu : ${t.pillarsWithContent} · refusés : ${t.pillarsRefused}`,
    `Chemins refusés : ${t.findings} — valeur présente refusée : ${t.bySituation.PRESENT_REFUSED}`
      + ` (dont comptées présentes par la maturité : ${t.presentCountedByMaturity}) · absents à côté de clés hors schéma : ${t.bySituation.ABSENT_BESIDE_UNDECLARED_KEYS}`
      + ` · absents : ${t.bySituation.ABSENT}`,
    `Par classe : SHAPE ${t.byKind.SHAPE} · TYPE ${t.byKind.TYPE} · ENUM ${t.byKind.ENUM} · LENGTH ${t.byKind.LENGTH} · MISSING ${t.byKind.MISSING}`,
    `Par pilier : A ${t.byPillar.a} · D ${t.byPillar.d} · V ${t.byPillar.v} · E ${t.byPillar.e}`,
  ];
  let currentStrategy = "";
  for (const e of inventory.entries) {
    if (e.strategyId !== currentStrategy) {
      currentStrategy = e.strategyId;
      lines.push("", `Stratégie ${e.strategyName ?? "(sans nom)"} — ${e.strategyId}${e.strategyStatus ? ` · ${e.strategyStatus}` : ""}`);
    }
    if (e.contentState === "ABSENT") {
      lines.push(`  ${e.pillarKey.toUpperCase()} : pas de contenu`);
      continue;
    }
    const absent = e.findings.filter(f => f.situation === "ABSENT").length;
    lines.push(`  ${e.pillarKey.toUpperCase()}${e.currentVersion !== null ? ` v${e.currentVersion}` : ""}${e.validationStatus ? ` · ${e.validationStatus}` : ""}`
      + ` · maturité ${e.maturity?.stage ?? "?"} ${e.maturity?.completionPct ?? "?"} %`
      + ` · ${e.findings.length} chemin${e.findings.length > 1 ? "s" : ""} refusé${e.findings.length > 1 ? "s" : ""}${absent ? ` (dont ${absent} absents)` : ""}`
      + (e.undeclaredTopKeys.length ? ` · clés hors schéma : ${e.undeclaredTopKeys.join(", ")}` : ""));
    for (const f of e.findings) {
      if (f.situation === "ABSENT") continue;
      const head = f.situation === "PRESENT_REFUSED"
        ? `${describeExpected(f)} · trouvé ${f.found}${f.excerpt ? ` ${f.excerpt}` : ""}`
        : `absent, clés voisines hors schéma : ${f.undeclaredSiblingKeys.join(", ")}`;
      lines.push(`    - ${f.path} [${f.kind}] ${head}`
        + ` · origine ${f.provenance ?? "inconnue"}`
        + (f.countedPresentBy.length ? ` · comptée présente (${f.countedPresentBy.join(", ")})` : "")
        + ` · ${describeChange(f.lastRetainedChange)}`
        + (f.sourceIds.length ? ` · sources ${f.sourceIds.join(", ")}` : ""));
    }
    for (const s of e.sources) {
      lines.push(`    source ${s.sourceId} · ${s.lookup === "FOUND" ? `${s.sourceType} ${s.certainty}${s.edition ? ` · ${s.edition.family} · ${s.edition.label} (édition ${s.edition.edition}, ${s.edition.status})` : ""}`
        + `${s.receiptMatchesCurrent === null ? "" : s.receiptMatchesCurrent ? " · reçu = document actuel" : " · document modifié depuis le reçu"}${s.sameStrategy === false ? " · autre marque" : ""}` : s.lookup === "NOT_FOUND" ? "introuvable" : "non lue"}`
        + `${s.attachedToPillar ? " · rattachée au pilier" : ""}${s.citedByFindings ? ` · citée par ${s.citedByFindings} chemin(s)` : ""}`);
    }
  }
  return lines.join("\n");
}

// ─── Lecture en base (transaction READ ONLY, REPEATABLE READ) ────────────────

export interface ReadInventoryOptions {
  strategyIds?: readonly string[];
  pillars?: readonly AdveInventoryPillar[];
  includeExcerpts?: boolean;
  /** Durée maximale de la transaction de lecture (ms). */
  timeoutMs?: number;
}

type InventoryClient = Pick<PrismaClient, "$transaction">;

/**
 * Lit les piliers ADVE demandés et produit l'inventaire. Toute la lecture tient dans
 * UNE transaction `READ ONLY` en `REPEATABLE READ` : instantané cohérent entre
 * piliers, archives, journal et sources, et toute écriture y serait refusée par
 * PostgreSQL. L'état de la transaction est relu dans la base et rapporté.
 */
export async function readAdveStrictShapeInventory(
  options: ReadInventoryOptions = {}, client: InventoryClient = db,
): Promise<StrictShapeInventory> {
  const pillars = [...new Set(options.pillars?.length ? options.pillars : ADVE_INVENTORY_PILLARS)]
    .sort((a, b) => PILLAR_ORDER[a] - PILLAR_ORDER[b]);
  const strategyFilter = options.strategyIds?.length ? [...new Set(options.strategyIds)].sort() : null;
  return client.$transaction(async (tx) => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const [ro] = await tx.$queryRaw<Array<{ transaction_read_only: string }>>`SHOW transaction_read_only`;
    const [iso] = await tx.$queryRaw<Array<{ transaction_isolation: string }>>`SHOW transaction_isolation`;
    const rows = await tx.pillar.findMany({
      where: { key: { in: pillars }, ...(strategyFilter ? { strategyId: { in: strategyFilter } } : {}) },
      select: { id: true, strategyId: true, key: true, content: true, fieldCertainty: true, currentVersion: true, validationStatus: true, sources: true },
      orderBy: [{ strategyId: "asc" }, { key: "asc" }],
    });
    const strategies = await tx.strategy.findMany({
      where: { id: { in: [...new Set(rows.map(r => r.strategyId))] } },
      select: { id: true, name: true, status: true },
    });
    const strategyById = new Map(strategies.map(s => [s.id, s]));
    const inputs = rows.map((row): PillarInventoryInput => ({
      strategyId: row.strategyId,
      strategyName: strategyById.get(row.strategyId)?.name ?? null,
      strategyStatus: strategyById.get(row.strategyId)?.status ?? null,
      pillarKey: row.key as AdveInventoryPillar,
      pillarId: row.id,
      content: row.content,
      fieldCertainty: row.fieldCertainty,
      currentVersion: row.currentVersion,
      validationStatus: row.validationStatus,
      sources: row.sources,
      includeExcerpts: options.includeExcerpts,
    }));

    // Les archives ne sont lues que pour les piliers effectivement refusés.
    const refused = inputs.filter(i => inventoryPillarContent(i).findings.length > 0);
    const archives = refused.length ? await tx.pillarVersion.findMany({
      where: { pillarId: { in: refused.map(i => i.pillarId!) } },
      select: { id: true, pillarId: true, version: true, content: true, author: true, reason: true, intentId: true, createdAt: true, checkpoint: true },
      orderBy: [{ pillarId: "asc" }, { version: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    }) : [];
    const archivesByPillar = new Map<string, PillarArchive[]>();
    for (const a of archives) archivesByPillar.set(a.pillarId, [...(archivesByPillar.get(a.pillarId) ?? []), a]);

    const intentIds = [...new Set(archives.flatMap(a => a.intentId ? [a.intentId] : []))];
    const emissions = intentIds.length ? await tx.intentEmission.findMany({
      where: { id: { in: intentIds } }, select: { id: true, intentKind: true, strategyId: true },
    }) : [];
    // Le journal n'est lu que dans la marque de l'écriture (même règle que l'historique du catalogue).
    const kindsFor = (strategyId: string) => new Map(emissions.filter(e => e.strategyId === strategyId).map(e => [e.id, e.intentKind]));

    const withHistory = inputs.map(i => archivesByPillar.has(i.pillarId!)
      ? { ...i, archives: archivesByPillar.get(i.pillarId!), intentKinds: kindsFor(i.strategyId) } : i);
    const sourceIds = [...new Set(withHistory.flatMap(i => inventoryPillarContent(i).sources.map(s => s.sourceId)))];
    const sourceRows = sourceIds.length ? await tx.brandDataSource.findMany({
      where: { id: { in: sourceIds } },
      select: { id: true, strategyId: true, sourceType: true, certainty: true, rawContent: true, rawData: true, extractedFields: true, fileName: true, fileType: true },
    }) : [];
    const sourceMap = new Map<string, SourceRow>(sourceRows.map(s => [s.id, s]));

    const entries = withHistory.map(i => inventoryPillarContent({ ...i, sourceRows: sourceMap }));
    return assembleInventory(entries, {
      mode: "DATABASE", pillars, strategyFilter,
      snapshot: { readOnly: ro?.transaction_read_only === "on", isolation: (iso?.transaction_isolation ?? "inconnue").toUpperCase() },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    timeout: options.timeoutMs ?? 120_000,
    maxWait: 10_000,
  });
}

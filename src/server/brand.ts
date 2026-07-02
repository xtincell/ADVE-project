import type {
  Prisma,
  PrismaClient,
  Pillar,
  PillarRevision,
  BrandScore as BrandScoreRow,
  Deliverable,
} from "@prisma/client";
import { getDb } from "@/lib/db";
import type { SessionPayload } from "@/lib/session-token";
import { ADVE_PILLARS, isAdve, PILLARS, RTIS_PILLARS, type PillarKey } from "@/domain/pillars";
import { getFieldDef, PILLAR_FIELDS, PILLAR_LABELS, type FieldDef } from "@/domain/pillar-fields";
import {
  isFilled,
  scoreBrand,
  scorePillarContent,
  type BrandPillarsContent,
  type BrandScore as DomainBrandScore,
} from "@/domain/scoring";
import { deriveRtisDraft, type AdvePillarsContent } from "@/domain/rtis";
import { diffRevisionFields, type RevisionFieldDiff } from "@/domain/revision-diff";
import { computeSelfHash } from "./audit-hash";
import { logAudit } from "./audit";

/**
 * Brand — le cœur marque de l'espace client (WP-005).
 *
 * Deux mutations, toutes deux transactionnelles + AuditLog (doctrine
 * REBUILD-PLAN §4) + PillarRevision hash-chaînée (l'audit de la méthode) :
 *   - `amendPillarField`  — amendement opérateur d'un champ du socle ADVE
 *                           (certainty passe à DECLARED). Refuse RTIS.
 *   - `deriveRtis`        — dérivation déterministe des piliers R/T/I/S
 *                           depuis le socle (certainty INFERRED partout).
 * Chaque mutation recalcule le BrandScore (moteur déterministe /200) et
 * synchronise `Brand.level`.
 */

// ── Erreurs métier (messages FR, prêts à afficher) ────────────────────

export type BrandErrorCode =
  | "BRAND_NOT_FOUND"
  | "RTIS_READONLY"
  | "UNKNOWN_FIELD"
  | "ADVE_EMPTY";

export class BrandError extends Error {
  constructor(
    public readonly code: BrandErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BrandError";
  }
}

// ── Helpers JSON (les colonnes Json de Prisma arrivent en `unknown`) ──

/** Coercition sûre d'une colonne Json vers un record — {} pour tout le reste. */
export function jsonRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

/** Contenus des 8 piliers indexés par clé — l'entrée des moteurs domaine. */
export function brandPillarsContent(
  pillars: ReadonlyArray<Pick<Pillar, "key" | "content">>,
): BrandPillarsContent {
  const out: BrandPillarsContent = {};
  for (const pillar of pillars) {
    out[pillar.key] = jsonRecord(pillar.content);
  }
  return out;
}

/** Le socle ADVE est-il entièrement vide ? (aucun champ rempli sur A/D/V/E) */
export function adveIsEmpty(content: BrandPillarsContent): boolean {
  return ADVE_PILLARS.every(
    (key) => scorePillarContent(content[key], PILLAR_FIELDS[key]).filled.length === 0,
  );
}

// ── Lecture ───────────────────────────────────────────────────────────

export type BrandForSession = Prisma.BrandGetPayload<{ include: { pillars: true } }> & {
  /** Dernier BrandScore persisté (historique) — null si jamais calculé. */
  latestScore: BrandScoreRow | null;
};

/**
 * La marque du workspace de session, avec ses piliers et son dernier score
 * persisté. Une seule marque par workspace en V1 : la plus ancienne fait foi.
 * Null si le workspace n'a pas encore de marque (CTA /intake côté UI).
 */
export async function getBrandForSession(
  session: SessionPayload,
): Promise<BrandForSession | null> {
  const db = getDb();
  const brand = await db.brand.findFirst({
    where: { workspaceId: session.workspaceId },
    orderBy: { createdAt: "asc" },
    include: {
      pillars: true,
      scores: { orderBy: { computedAt: "desc" }, take: 1 },
    },
  });
  if (!brand) return null;
  const { scores, ...rest } = brand;
  return { ...rest, latestScore: scores[0] ?? null };
}

/** Révisions d'un pilier, plus récentes d'abord (historique d'édition). */
export async function getPillarRevisions(
  pillarId: string,
  take = 50,
): Promise<PillarRevision[]> {
  const db = getDb();
  return db.pillarRevision.findMany({
    where: { pillarId },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    take,
  });
}

// ── Écriture — mécanique commune (revision chaînée + score) ───────────

type Tx = Prisma.TransactionClient;
type BrandRef = { id: string; workspaceId: string };

/**
 * Écrit un pilier (upsert) + sa PillarRevision hash-chaînée. La chaîne est
 * PAR PILIER : chaque révision pointe le selfHash de la précédente
 * (même principe que l'AuditLog — falsifier une révision casse la chaîne).
 */
async function writePillarWithRevision(
  tx: Tx,
  brand: BrandRef,
  key: PillarKey,
  content: Record<string, unknown>,
  certainty: Record<string, unknown>,
  reason: "operator_amend" | "rtis_refresh",
  actorId: string,
): Promise<Pillar> {
  const existing = await tx.pillar.findUnique({
    where: { brandId_key: { brandId: brand.id, key } },
    select: { id: true, version: true },
  });
  const version = (existing?.version ?? 0) + 1;

  const contentJson = content as Prisma.InputJsonValue;
  const certaintyJson = certainty as Prisma.InputJsonValue;
  const pillar = existing
    ? await tx.pillar.update({
        where: { id: existing.id },
        data: { content: contentJson, certainty: certaintyJson, version },
      })
    : await tx.pillar.create({
        data: { brandId: brand.id, key, content: contentJson, certainty: certaintyJson, version },
      });

  const prev = await tx.pillarRevision.findFirst({
    where: { pillarId: pillar.id },
    orderBy: [{ version: "desc" }, { createdAt: "desc" }],
    select: { selfHash: true },
  });
  const prevHash = prev?.selfHash ?? null;
  const selfHash = computeSelfHash(prevHash, {
    workspaceId: brand.workspaceId,
    actorId,
    action: `pillar.${reason}`,
    entity: "Pillar",
    entityId: pillar.id,
    payload: { key, version, content },
  });
  await tx.pillarRevision.create({
    data: {
      pillarId: pillar.id,
      version,
      content: contentJson,
      reason,
      actorId,
      prevHash,
      selfHash,
    },
  });

  return pillar;
}

/**
 * Recalcule le BrandScore depuis l'état réel des piliers (dans la même
 * transaction que la mutation) : nouvelle ligne BrandScore (historique
 * append-only) + synchronisation de `Brand.level`.
 */
async function recomputeBrandScore(tx: Tx, brand: BrandRef): Promise<DomainBrandScore> {
  const pillars = await tx.pillar.findMany({
    where: { brandId: brand.id },
    select: { key: true, content: true },
  });
  const score = scoreBrand(brandPillarsContent(pillars));
  await tx.brandScore.create({
    data: {
      brandId: brand.id,
      total: score.total,
      dimensions: score.byPillar as unknown as Prisma.InputJsonValue,
      level: score.level,
    },
  });
  await tx.brand.update({ where: { id: brand.id }, data: { level: score.level } });
  return score;
}

async function requireBrand(db: PrismaClient | Tx, brandId: string): Promise<BrandRef> {
  const brand = await db.brand.findUnique({
    where: { id: brandId },
    select: { id: true, workspaceId: true },
  });
  if (!brand) {
    throw new BrandError("BRAND_NOT_FOUND", "Marque introuvable — elle a peut-être été supprimée.");
  }
  return brand;
}

// ── Amendement opérateur d'un champ ADVE ──────────────────────────────

export type AmendPillarFieldInput = {
  brandId: string;
  pillarKey: PillarKey;
  fieldId: string;
  /**
   * Valeur brute : string (textarea) ou tableau. Normalisée selon le type du
   * champ — `liste` : une entrée par ligne ; `texte` : trim simple.
   * Valeur vide = le champ est effacé (contenu ET certainty retirés).
   */
  value: unknown;
  actorId: string;
};

export type AmendPillarFieldResult = {
  pillar: Pillar;
  score: DomainBrandScore;
  /** true si l'amendement a effacé le champ (valeur vide soumise). */
  cleared: boolean;
};

/** Normalise la valeur soumise selon la nature du champ. */
function normalizeFieldValue(field: FieldDef, value: unknown): unknown {
  if (field.type === "liste") {
    const items = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(/\r?\n/)
        : [];
    return items
      .map((item) => (typeof item === "string" ? item.trim() : item))
      .filter((item) => isFilled(item));
  }
  if (typeof value === "string") return value.trim();
  return value;
}

/**
 * Amende UN champ d'un pilier du socle ADVE (l'acte fondateur de la méthode :
 * l'humain déclare, l'IA au mieux propose). Transaction unique :
 *   Pillar.content[fieldId] ← valeur · certainty[fieldId] ← "DECLARED" ·
 *   version++ · PillarRevision chaînée (reason "operator_amend") ·
 *   BrandScore recalculé · AuditLog "pillar.amend".
 * Refuse tout pilier RTIS : les dérivés ne s'éditent JAMAIS à la main.
 */
export async function amendPillarField(
  input: AmendPillarFieldInput,
): Promise<AmendPillarFieldResult> {
  const { brandId, pillarKey, fieldId, actorId } = input;

  if (!isAdve(pillarKey)) {
    throw new BrandError(
      "RTIS_READONLY",
      `Le pilier ${PILLAR_LABELS[pillarKey]} (${pillarKey}) est dérivé du socle — il ne s'édite jamais à la main. ` +
        "Modifiez les piliers Authenticité, Distinction, Valeur ou Engagement, puis relancez « Dériver RTIS depuis le socle ».",
    );
  }
  const field = getFieldDef(pillarKey, fieldId);
  if (!field) {
    throw new BrandError(
      "UNKNOWN_FIELD",
      `Champ « ${fieldId} » inconnu pour le pilier ${PILLAR_LABELS[pillarKey]}.`,
    );
  }

  const normalized = normalizeFieldValue(field, input.value);
  const cleared = !isFilled(normalized);

  const db = getDb();
  return db.$transaction(async (tx) => {
    const brand = await requireBrand(tx, brandId);
    const existing = await tx.pillar.findUnique({
      where: { brandId_key: { brandId: brand.id, key: pillarKey } },
      select: { content: true, certainty: true },
    });
    const content = jsonRecord(existing?.content);
    const certainty = jsonRecord(existing?.certainty);

    if (cleared) {
      // Effacement explicite : le champ redevient vide — plus rien à certifier.
      delete content[fieldId];
      delete certainty[fieldId];
    } else {
      content[fieldId] = normalized;
      certainty[fieldId] = "DECLARED"; // validé par l'humain — plus un draft IA
    }

    const pillar = await writePillarWithRevision(
      tx,
      brand,
      pillarKey,
      content,
      certainty,
      "operator_amend",
      actorId,
    );
    const score = await recomputeBrandScore(tx, brand);
    await logAudit(
      {
        workspaceId: brand.workspaceId,
        actorId,
        action: "pillar.amend",
        entity: "Pillar",
        entityId: pillar.id,
        payload: { pillarKey, fieldId, version: pillar.version, cleared },
      },
      tx,
    );
    return { pillar, score, cleared };
  });
}

// ── Dérivation RTIS ───────────────────────────────────────────────────

export type DeriveRtisInput = { brandId: string; actorId: string };

export type DeriveRtisResult = {
  score: DomainBrandScore;
  /** Clés dérivées (toujours R/T/I/S — exposées pour l'audit UI). */
  derived: PillarKey[];
};

/**
 * Dérive les piliers R/T/I/S depuis le socle ADVE (`deriveRtisDraft`,
 * 100 % déterministe — même socle, même draft). Transaction unique :
 * upsert des 4 piliers (certainty INFERRED sur chaque champ dérivé rempli —
 * on ne « certifie » pas une donnée absente), PillarRevision chaînée
 * (reason "rtis_refresh"), BrandScore recalculé, AuditLog "rtis.derive".
 * Refuse un socle entièrement vide : rien ne se dérive de rien.
 */
export async function deriveRtis(input: DeriveRtisInput): Promise<DeriveRtisResult> {
  const { brandId, actorId } = input;
  const db = getDb();

  return db.$transaction(async (tx) => {
    const brand = await requireBrand(tx, brandId);
    const advePillars = await tx.pillar.findMany({
      where: { brandId: brand.id, key: { in: [...ADVE_PILLARS] } },
      select: { key: true, content: true },
    });
    const adve: AdvePillarsContent = {};
    for (const pillar of advePillars) {
      if (isAdve(pillar.key)) adve[pillar.key] = jsonRecord(pillar.content);
    }

    if (adveIsEmpty(adve)) {
      throw new BrandError(
        "ADVE_EMPTY",
        "Le socle ADVE est vide — complétez au moins un champ des piliers Authenticité, " +
          "Distinction, Valeur ou Engagement avant de dériver les piliers RTIS.",
      );
    }

    const draft = deriveRtisDraft(adve);
    for (const key of RTIS_PILLARS) {
      const content = draft[key];
      const certainty: Record<string, unknown> = {};
      for (const field of PILLAR_FIELDS[key]) {
        if (isFilled(content[field.id])) certainty[field.id] = "INFERRED";
      }
      await writePillarWithRevision(tx, brand, key, content, certainty, "rtis_refresh", actorId);
    }

    const score = await recomputeBrandScore(tx, brand);
    await logAudit(
      {
        workspaceId: brand.workspaceId,
        actorId,
        action: "rtis.derive",
        entity: "Brand",
        entityId: brand.id,
        payload: { pillars: [...RTIS_PILLARS] },
      },
      tx,
    );
    return { score, derived: [...RTIS_PILLARS] };
  });
}

// ══════════════════════════════════════════════════════════════════════
// Lectures cockpit (WP-016 — vues de profondeur). LECTURE SEULE :
// aucune fonction ci-dessous n'écrit quoi que ce soit.
// ══════════════════════════════════════════════════════════════════════

// ── Historique BrandScore (/app/diagnostic) ───────────────────────────

/** Historique des scores persistés, plus récents d'abord (append-only). */
export async function getBrandScores(brandId: string, take = 24): Promise<BrandScoreRow[]> {
  const db = getDb();
  return db.brandScore.findMany({
    where: { brandId },
    orderBy: [{ computedAt: "desc" }, { id: "desc" }],
    take,
  });
}

/**
 * Lecture tolérante de `BrandScore.dimensions` (Json) → score25 par pilier.
 * La colonne persiste `scoreBrand().byPillar` ; on n'en relit que les nombres
 * réellement présents — jamais de valeur par défaut inventée.
 */
export function scoreDimensions25(value: unknown): Partial<Record<PillarKey, number>> {
  const out: Partial<Record<PillarKey, number>> = {};
  const root = jsonRecord(value);
  for (const key of PILLARS) {
    const entry = root[key];
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) continue;
    const score25 = (entry as Record<string, unknown>)["score25"];
    if (typeof score25 === "number" && Number.isFinite(score25)) out[key] = score25;
  }
  return out;
}

// ── Livrables (/app/exports) ──────────────────────────────────────────

/** Tous les livrables d'une marque, plus récents d'abord. */
export async function getBrandDeliverables(brandId: string): Promise<Deliverable[]> {
  const db = getDb();
  return db.deliverable.findMany({
    where: { brandId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
}

// ── Vérification de la chaîne de hash des révisions (/app/revisions) ──
//
// La chaîne est PAR PILIER (cf. writePillarWithRevision) : chaque révision
// pointe le selfHash de la précédente. La vérification recompose chaque
// selfHash depuis les données stockées, avec le format d'enregistrement de
// l'écrivain d'origine :
//   - reason "intake" (funnel.ts, v1)            → action "pillar.revision",
//     payload { version, reason, content }
//   - autres reasons (brand.ts, ai/apply-draft)  → action "pillar.<reason>",
//     payload { key, version, content }
// Falsifier une révision a posteriori casse le recalcul ; réécrire la chaîne
// casse le chaînage prevHash→selfHash suivant.

export type RevisionCheckStatus = "ok" | "unsigned" | "broken_link" | "hash_mismatch";

export type ChainRevisionInput = {
  version: number;
  reason: string;
  actorId: string | null;
  content: unknown;
  prevHash: string | null;
  selfHash: string | null;
  createdAt: Date;
};

export type ChainStatus = "OK" | "RUPTURE" | "NON_SIGNEE" | "VIDE";

export type ChainVerification = {
  pillarKey: PillarKey;
  revisionCount: number;
  status: ChainStatus;
  /** Première anomalie rencontrée (version + nature) — null si chaîne saine. */
  firstBreak: { version: number; kind: RevisionCheckStatus } | null;
  /** Statut par version (index aligné sur l'ordre chronologique). */
  byRevision: Array<{ version: number; status: RevisionCheckStatus }>;
};

/** Record de hash d'une révision, au format de son écrivain d'origine. */
function revisionHashRecord(
  rev: ChainRevisionInput,
  pillarId: string,
  pillarKey: PillarKey,
  workspaceId: string,
) {
  if (rev.reason === "intake") {
    return {
      workspaceId,
      actorId: rev.actorId,
      action: "pillar.revision",
      entity: "Pillar",
      entityId: pillarId,
      payload: { version: rev.version, reason: rev.reason, content: rev.content },
    };
  }
  return {
    workspaceId,
    actorId: rev.actorId,
    action: `pillar.${rev.reason}`,
    entity: "Pillar",
    entityId: pillarId,
    payload: { key: pillarKey, version: rev.version, content: rev.content },
  };
}

/**
 * Vérifie la chaîne d'un pilier — fonction PURE (zéro IO, testable sans DB).
 * Deux contrôles par révision : le chaînage (prevHash = selfHash précédent)
 * et l'intégrité (selfHash recalculé = selfHash stocké). Une révision sans
 * selfHash est « non signée » : invérifiable, sans être une falsification.
 */
export function verifyRevisionChain(input: {
  pillarId: string;
  pillarKey: PillarKey;
  workspaceId: string;
  revisions: ChainRevisionInput[];
}): ChainVerification {
  const ordered = [...input.revisions].sort(
    (a, b) => a.version - b.version || a.createdAt.getTime() - b.createdAt.getTime(),
  );

  const byRevision: Array<{ version: number; status: RevisionCheckStatus }> = [];
  let firstBreak: ChainVerification["firstBreak"] = null;
  let hasUnsigned = false;
  let expectedPrev: string | null = null;

  for (const rev of ordered) {
    let status: RevisionCheckStatus = "ok";

    if (rev.prevHash !== expectedPrev) {
      status = "broken_link";
    } else if (rev.selfHash === null) {
      status = "unsigned";
      hasUnsigned = true;
    } else {
      const recomputed = computeSelfHash(
        rev.prevHash,
        revisionHashRecord(rev, input.pillarId, input.pillarKey, input.workspaceId),
      );
      if (recomputed !== rev.selfHash) status = "hash_mismatch";
    }

    if ((status === "broken_link" || status === "hash_mismatch") && firstBreak === null) {
      firstBreak = { version: rev.version, kind: status };
    }
    byRevision.push({ version: rev.version, status });
    // La suite de la chaîne se juge contre ce que la DB affirme (selfHash
    // stocké) — une rupture ne masque pas les suivantes.
    expectedPrev = rev.selfHash;
  }

  const status: ChainStatus =
    ordered.length === 0 ? "VIDE" : firstBreak !== null ? "RUPTURE" : hasUnsigned ? "NON_SIGNEE" : "OK";

  return {
    pillarKey: input.pillarKey,
    revisionCount: ordered.length,
    status,
    firstBreak,
    byRevision,
  };
}

// ── Timeline cross-piliers + audit de chaîne (/app/revisions) ─────────

export type BrandRevisionEntry = {
  id: string;
  pillarKey: PillarKey;
  version: number;
  reason: string;
  createdAt: Date;
  actorId: string | null;
  /** Nom (ou email) de l'acteur — null si acteur inconnu/système. */
  actorLabel: string | null;
  /** Champs métier modifiés vs la révision précédente du même pilier. */
  diff: RevisionFieldDiff;
  /** Statut de vérification de CETTE révision dans sa chaîne. */
  check: RevisionCheckStatus;
  selfHash: string | null;
};

export type BrandRevisionAudit = {
  /** Timeline cross-piliers, plus récentes d'abord. */
  timeline: BrandRevisionEntry[];
  /** Vérification de chaîne par pilier (piliers réellement écrits uniquement). */
  chains: ChainVerification[];
  /** Nombre total de révisions de la marque. */
  total: number;
};

/**
 * Timeline complète des révisions d'une marque + état réel des chaînes de
 * hash. Charge TOUTES les révisions (le diff et la vérification exigent
 * l'historique intégral) — volumes V1 faibles par construction (une marque,
 * 8 piliers). Lecture seule.
 */
export async function getBrandRevisionAudit(brand: {
  id: string;
  workspaceId: string;
}): Promise<BrandRevisionAudit> {
  const db = getDb();
  const rows = await db.pillarRevision.findMany({
    where: { pillar: { brandId: brand.id } },
    orderBy: [{ createdAt: "asc" }, { version: "asc" }],
    include: { pillar: { select: { id: true, key: true } } },
  });

  // Acteurs : résolution des ids vers nom/email (affichage « qui »).
  const actorIds = [...new Set(rows.map((r) => r.actorId).filter((id): id is string => !!id))];
  const users =
    actorIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const actorLabels = new Map(users.map((u) => [u.id, u.name?.trim() || u.email]));

  // Groupement par pilier (ordre chronologique conservé).
  const byPillar = new Map<string, { key: PillarKey; rows: typeof rows }>();
  for (const row of rows) {
    const group = byPillar.get(row.pillar.id) ?? { key: row.pillar.key, rows: [] };
    group.rows.push(row);
    byPillar.set(row.pillar.id, group);
  }

  const checkByRevisionId = new Map<string, RevisionCheckStatus>();
  const chains: ChainVerification[] = [];
  const diffByRevisionId = new Map<string, RevisionFieldDiff>();

  for (const [pillarId, group] of byPillar) {
    const ordered = [...group.rows].sort(
      (a, b) => a.version - b.version || a.createdAt.getTime() - b.createdAt.getTime(),
    );
    const verification = verifyRevisionChain({
      pillarId,
      pillarKey: group.key,
      workspaceId: brand.workspaceId,
      revisions: ordered.map((r) => ({
        version: r.version,
        reason: r.reason,
        actorId: r.actorId,
        content: r.content,
        prevHash: r.prevHash,
        selfHash: r.selfHash,
        createdAt: r.createdAt,
      })),
    });
    chains.push(verification);
    ordered.forEach((row, i) => {
      checkByRevisionId.set(row.id, verification.byRevision[i]?.status ?? "ok");
      diffByRevisionId.set(
        row.id,
        diffRevisionFields(i > 0 ? ordered[i - 1]!.content : null, row.content),
      );
    });
  }

  // Chaînes triées dans l'ordre canonique des piliers.
  chains.sort((a, b) => PILLARS.indexOf(a.pillarKey) - PILLARS.indexOf(b.pillarKey));

  const timeline: BrandRevisionEntry[] = rows
    .map((row) => ({
      id: row.id,
      pillarKey: row.pillar.key,
      version: row.version,
      reason: row.reason,
      createdAt: row.createdAt,
      actorId: row.actorId,
      actorLabel: row.actorId ? (actorLabels.get(row.actorId) ?? null) : null,
      diff: diffByRevisionId.get(row.id) ?? { added: [], changed: [], removed: [] },
      check: checkByRevisionId.get(row.id) ?? "ok",
      selfHash: row.selfHash,
    }))
    .reverse(); // rows est chargé ascendant → timeline descendante

  return { timeline, chains, total: rows.length };
}

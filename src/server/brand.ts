import type { Prisma, PrismaClient, Pillar, PillarRevision, BrandScore as BrandScoreRow } from "@prisma/client";
import { getDb } from "@/lib/db";
import type { SessionPayload } from "@/lib/session-token";
import { ADVE_PILLARS, isAdve, RTIS_PILLARS, type PillarKey } from "@/domain/pillars";
import { getFieldDef, PILLAR_FIELDS, PILLAR_LABELS, type FieldDef } from "@/domain/pillar-fields";
import {
  isFilled,
  scoreBrand,
  scorePillarContent,
  type BrandPillarsContent,
  type BrandScore as DomainBrandScore,
} from "@/domain/scoring";
import { deriveRtisDraft, type AdvePillarsContent } from "@/domain/rtis";
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

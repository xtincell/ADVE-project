import type { Deliverable, Prisma } from "@prisma/client";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { composeOracle, type OracleBrandInfo, type OracleDocument } from "@/domain/oracle";
import { brandPillarsContent, BrandError } from "./brand";
import { logAudit } from "./audit";

/**
 * Deliverables — registre des kinds + composition de l'Oracle (WP-006).
 *
 * L'Oracle est UN kind parmi N (doctrine héritée : notable par sa taille,
 * pas par son statut). La composition est 100 % déterministe
 * (`domain/oracle.composeOracle`) et n'a lieu QUE sur action explicite —
 * jamais de mutation au fil d'une visite de page. La staleness est calculée
 * à la lecture (piliers modifiés après `composedAt`), sans écrire en base.
 */

// ── Registre des kinds (en code, comme le schéma l'annonce) ───────────

export const DELIVERABLE_KINDS = {
  oracle: { label: "Oracle", description: "Document stratégique composé depuis les piliers." },
} as const;

export type DeliverableKind = keyof typeof DELIVERABLE_KINDS;
export const ORACLE_KIND: DeliverableKind = "oracle";

// ── Lecture ───────────────────────────────────────────────────────────

/** Dernier livrable d'un kind pour une marque (null si jamais composé). */
export async function getLatestDeliverable(
  brandId: string,
  kind: DeliverableKind,
): Promise<Deliverable | null> {
  const db = getDb();
  return db.deliverable.findFirst({
    where: { brandId, kind },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * STALE si un pilier a été modifié après la composition. `composedAt` null
 * (jamais composé) = stale par définition. Fonction pure, zéro IO.
 */
export function oracleIsStale(
  composedAt: Date | null,
  pillars: ReadonlyArray<{ updatedAt: Date }>,
): boolean {
  if (!composedAt) return true;
  return pillars.some((pillar) => pillar.updatedAt.getTime() > composedAt.getTime());
}

// ── Relecture sûre du contenu persisté (colonne Json → OracleDocument) ─

const oracleSectionSchema = z.object({
  id: z.string(),
  number: z.string(),
  titre: z.string(),
  status: z.enum(["ok", "insuffisant"]),
  markdown: z.string(),
  sources: z.array(z.string()),
  missing: z.array(z.string()),
});

const oracleDocumentSchema = z.object({
  brand: z.object({ name: z.string(), sector: z.string().optional() }),
  score: z.object({
    total: z.number(),
    max: z.number(),
    level: z.string(),
    levelLabel: z.string(),
  }),
  sections: z.array(oracleSectionSchema),
});

/**
 * Parse le contenu Json d'un Deliverable oracle. Null si la forme ne matche
 * pas (ancienne version, contenu corrompu) — l'UI propose alors de recomposer,
 * jamais d'affichage d'un document douteux.
 */
export function parseOracleDocument(value: unknown): OracleDocument | null {
  const parsed = oracleDocumentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

// ── Composition (mutation explicite, transactionnelle, auditée) ───────

export type ComposeOracleInput = { brandId: string; actorId: string };

export type ComposeOracleResult = {
  deliverable: Deliverable;
  document: OracleDocument;
};

/**
 * Compose (ou recompose) l'Oracle depuis l'état réel des piliers et le
 * persiste : upsert du Deliverable kind "oracle" (status READY, content=doc,
 * composedAt=now) + AuditLog "deliverable.compose". Une marque = un Oracle
 * vivant (le dernier remplace le précédent — l'historique des données vit
 * dans PillarRevision, pas en dupliquant des documents).
 */
export async function composeOracleDeliverable(
  input: ComposeOracleInput,
): Promise<ComposeOracleResult> {
  const { brandId, actorId } = input;
  const db = getDb();

  return db.$transaction(async (tx) => {
    const brand = await tx.brand.findUnique({
      where: { id: brandId },
      include: { pillars: { select: { key: true, content: true } } },
    });
    if (!brand) {
      throw new BrandError("BRAND_NOT_FOUND", "Marque introuvable — impossible de composer l'Oracle.");
    }

    const brandInfo: OracleBrandInfo = brand.sector
      ? { name: brand.name, sector: brand.sector }
      : { name: brand.name };
    const document = composeOracle(brandInfo, brandPillarsContent(brand.pillars));

    const data = {
      title: `Oracle — ${brand.name}`,
      status: "READY" as const,
      content: document as unknown as Prisma.InputJsonValue,
      composedAt: new Date(),
    };
    const existing = await tx.deliverable.findFirst({
      where: { brandId: brand.id, kind: ORACLE_KIND },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const deliverable = existing
      ? await tx.deliverable.update({ where: { id: existing.id }, data })
      : await tx.deliverable.create({ data: { brandId: brand.id, kind: ORACLE_KIND, ...data } });

    await logAudit(
      {
        workspaceId: brand.workspaceId,
        actorId,
        action: "deliverable.compose",
        entity: "Deliverable",
        entityId: deliverable.id,
        payload: {
          kind: ORACLE_KIND,
          sections: document.sections.length,
          insufficient: document.sections.filter((s) => s.status === "insuffisant").length,
          scoreTotal: document.score.total,
        },
      },
      tx,
    );

    return { deliverable, document };
  });
}

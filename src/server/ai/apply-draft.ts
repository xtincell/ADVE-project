/**
 * Application des brouillons IA sur un pilier ADVE (WP-010).
 *
 * Vit dans `server/ai` (brand.ts est hors périmètre WP-010) mais respecte
 * EXACTEMENT la mécanique d'écriture pilier du produit (cf. `server/brand.ts`) :
 * transaction unique, PillarRevision hash-chaînée (reason "ai_draft",
 * `computeSelfHash` réutilisé), BrandScore recalculé + `Brand.level`
 * synchronisé, AuditLog "pillar.ai_draft".
 *
 * Doctrine : un brouillon IA ne touche QUE les champs vides, est marqué
 * certainty INFERRED (« à valider » dans l'UI), et n'écrase JAMAIS une donnée
 * existante — le flip vers DECLARED reste l'amendement humain.
 */
import type { Pillar, Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { isAdve, type PillarKey } from "@/domain/pillars";
import { getFieldDef, PILLAR_FIELDS, PILLAR_LABELS, type FieldDef } from "@/domain/pillar-fields";
import { isFilled, scoreBrand, type BrandScore as DomainBrandScore } from "@/domain/scoring";
import { BrandError, brandPillarsContent, jsonRecord } from "../brand";
import { computeSelfHash } from "../audit-hash";
import { logAudit } from "../audit";

export type ApplyPillarDraftInput = {
  brandId: string;
  pillarKey: PillarKey;
  /** Brouillons fieldId → texte (listes : une entrée par ligne). */
  drafts: Record<string, string>;
  actorId: string;
};

export type ApplyPillarDraftResult = {
  /** Ids des champs effectivement remplis (vides avant, INFERRED après). */
  applied: string[];
  /** Ids ignorés : champ inconnu, déjà rempli, ou brouillon vide. */
  skipped: string[];
  /** Score recalculé — null si rien n'a été appliqué (aucune écriture). */
  score: DomainBrandScore | null;
  pillar: Pillar | null;
};

/** Même normalisation que l'amendement opérateur : liste = une entrée par ligne. */
function normalizeDraftValue(field: FieldDef, value: string): unknown {
  if (field.type === "liste") {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item) => isFilled(item));
  }
  return value.trim();
}

/**
 * Applique des brouillons IA sur les champs VIDES d'un pilier ADVE.
 * Transaction unique : Pillar.content (champs vides uniquement) + certainty
 * INFERRED + version++ + PillarRevision chaînée (reason "ai_draft") +
 * BrandScore recalculé + AuditLog "pillar.ai_draft". Si aucun champ n'est
 * applicable, AUCUNE écriture n'a lieu.
 */
export async function applyPillarDraft(
  input: ApplyPillarDraftInput,
): Promise<ApplyPillarDraftResult> {
  const { brandId, pillarKey, drafts, actorId } = input;

  if (!isAdve(pillarKey)) {
    throw new BrandError(
      "RTIS_READONLY",
      `Le pilier ${PILLAR_LABELS[pillarKey]} (${pillarKey}) est dérivé du socle — ` +
        "aucun brouillon IA ne s'y applique. Relancez « Dériver RTIS depuis le socle ».",
    );
  }

  const db = getDb();
  return db.$transaction(async (tx) => {
    const brand = await tx.brand.findUnique({
      where: { id: brandId },
      select: { id: true, workspaceId: true },
    });
    if (!brand) {
      throw new BrandError("BRAND_NOT_FOUND", "Marque introuvable — elle a peut-être été supprimée.");
    }

    const existing = await tx.pillar.findUnique({
      where: { brandId_key: { brandId: brand.id, key: pillarKey } },
      select: { id: true, version: true, content: true, certainty: true },
    });
    const content = jsonRecord(existing?.content);
    const certainty = jsonRecord(existing?.certainty);

    const applied: string[] = [];
    const skipped: string[] = [];

    // Ordre de la bible (déterministe), pas l'ordre des clés du record IA.
    for (const field of PILLAR_FIELDS[pillarKey]) {
      const raw = drafts[field.id];
      if (raw === undefined) continue;
      if (isFilled(content[field.id])) {
        // Jamais d'écrasement : le brouillon IA ne touche que le vide.
        skipped.push(field.id);
        continue;
      }
      const normalized = normalizeDraftValue(field, raw);
      if (!isFilled(normalized)) {
        skipped.push(field.id);
        continue;
      }
      content[field.id] = normalized;
      certainty[field.id] = "INFERRED"; // draft IA — l'humain validera (DECLARED)
      applied.push(field.id);
    }
    // Clés proposées hors bible du pilier (défense en profondeur).
    for (const key of Object.keys(drafts)) {
      if (getFieldDef(pillarKey, key) === undefined) skipped.push(key);
    }

    if (applied.length === 0) {
      return { applied, skipped, score: null, pillar: null };
    }

    // ── Écriture pilier + révision chaînée (même mécanique que brand.ts) ──
    const version = (existing?.version ?? 0) + 1;
    const contentJson = content as Prisma.InputJsonValue;
    const certaintyJson = certainty as Prisma.InputJsonValue;
    const pillar = existing
      ? await tx.pillar.update({
          where: { id: existing.id },
          data: { content: contentJson, certainty: certaintyJson, version },
        })
      : await tx.pillar.create({
          data: { brandId: brand.id, key: pillarKey, content: contentJson, certainty: certaintyJson, version },
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
      action: "pillar.ai_draft",
      entity: "Pillar",
      entityId: pillar.id,
      payload: { key: pillarKey, version, content },
    });
    await tx.pillarRevision.create({
      data: {
        pillarId: pillar.id,
        version,
        content: contentJson,
        reason: "ai_draft",
        actorId,
        prevHash,
        selfHash,
      },
    });

    // ── BrandScore recalculé + Brand.level synchronisé ──
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

    await logAudit(
      {
        workspaceId: brand.workspaceId,
        actorId,
        action: "pillar.ai_draft",
        entity: "Pillar",
        entityId: pillar.id,
        payload: { pillarKey, fields: applied, skipped, version: pillar.version },
      },
      tx,
    );

    return { applied, skipped, score, pillar };
  });
}

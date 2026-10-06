import { z } from "zod";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { assertWritableSpecimen } from ".";

export const bindPublicationInput = z.object({
  strategyId: z.string().min(1), applicationId: z.string().min(1), specimenId: z.string().min(1),
  actionId: z.string().min(1).optional(), assetId: z.string().min(1).optional(),
  evidenceUrl: z.url().refine(v => new URL(v).protocol === "https:"),
  attestation: z.string().trim().min(15).max(1000),
}).refine(v => !!v.actionId || !!v.assetId, "Rattacher une action ou un actif de la marque.");

/** Human-confirmed identity link, immutable and independent of whether the trial succeeds. */
export async function bindRecipePublication(input: z.infer<typeof bindPublicationInput>, userId: string, client: PrismaClient = db) {
  input = bindPublicationInput.parse(input);
  return client.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`recipe-publication:${input.applicationId}`}))`;
    const app = await tx.recipeApplication.findFirstOrThrow({ where: { id: input.applicationId, strategyId: input.strategyId } });
    if (app.resolvedAt) throw new Error("Cet essai est déjà résolu.");
    const specimen = await assertWritableSpecimen(tx, input.specimenId, input.strategyId);
    if (specimen.publishedAt < app.createdAt || specimen.publishedAt > app.deadline) throw new Error("Publication hors de la fenêtre d'essai.");
    if (app.actionId && app.actionId !== input.actionId || app.assetId && app.assetId !== input.assetId) throw new Error("La publication doit correspondre à l'action et à l'actif déclarés.");
    if (input.actionId && !await tx.campaignAction.findFirst({ where: { id: input.actionId, campaign: { strategyId: input.strategyId } }, select: { id: true } })) throw new Error("Action indisponible dans cette marque.");
    const asset = input.assetId ? await tx.brandAsset.findFirst({ where: { id: input.assetId, strategyId: input.strategyId }, select: { id: true, sourceAssetVersionId: true } }) : null;
    if (input.assetId && !asset) throw new Error("Actif indisponible dans cette marque.");
    if (asset?.sourceAssetVersionId && !await tx.assetVersion.findFirst({ where: { id: asset.sourceAssetVersionId, strategyId: input.strategyId } })) throw new Error("Version matérielle indisponible dans cette marque.");
    if (app.publicationBinding) {
      const old = app.publicationBinding as { specimenId?: string; sourceUrl?: string };
      if (old.specimenId !== specimen.id || old.sourceUrl !== specimen.sourceUrl) throw new Error("Cet essai est déjà lié à une autre publication.");
      return app;
    }
    const binding = { schema: "recipe-publication-v1", specimenId: specimen.id, platform: specimen.platform, accountId: specimen.accountId, externalId: specimen.externalId, sourceUrl: specimen.sourceUrl, actionId: input.actionId, assetId: input.assetId, assetVersionId: asset?.sourceAssetVersionId, evidenceUrl: input.evidenceUrl, attestation: input.attestation, confirmedBy: userId, confirmedAt: new Date().toISOString() };
    return tx.recipeApplication.update({ where: { id: app.id }, data: { publicationBinding: JSON.parse(JSON.stringify(binding)) as Prisma.InputJsonValue, actionId: input.actionId, assetId: input.assetId } });
  });
}

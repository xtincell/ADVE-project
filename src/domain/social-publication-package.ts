import { z } from "zod";

export const SOCIAL_PUBLICATION_PACKAGE = "social-publication-package/v1";
const id = z.string().min(1);
const hash = z.string().regex(/^[a-f0-9]{64}$/);

export const prepareSocialPublication = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("SELECT"), strategyId: id, briefId: id,
    briefVersion: z.number().int().positive(), assetVersionId: id }).strict(),
  z.object({ operation: z.literal("REVIEW"), strategyId: id, packageId: id,
    contentHash: hash, approved: z.literal(true) }).strict(),
]);

/** A generation author, a selection and an editorial review are separate facts. */
export const socialPublicationContent = z.object({
  schema: z.literal(SOCIAL_PUBLICATION_PACKAGE),
  calendar: z.object({ sourceId: id, version: hash, postKey: id, origin: z.string(), date: z.string().nullable() }),
  brief: z.object({ id, version: z.number().int().positive(), contentHash: hash }),
  material: z.object({ id, contentHash: hash, taskId: id, width: z.number().positive(), height: z.number().positive(),
    author: z.object({ provider: id, model: id, generatedAt: z.string() }) }),
  delivery: z.object({ encoding: z.literal("jpeg-q95-white-v1"), contentHash: hash,
    mimeType: z.literal("image/jpeg"), width: z.number().positive(), height: z.number().positive(),
    byteLength: z.number().int().positive(), placement: z.enum(["FEED", "STORIES"]).nullable() }),
  platform: z.string().min(1), format: z.string().nullable(), caption: z.string(), hashtags: z.array(z.string()),
  publicationText: z.string(),
});
export type SocialPublicationContent = z.infer<typeof socialPublicationContent>;
export type PrepareSocialPublication = z.infer<typeof prepareSocialPublication>;

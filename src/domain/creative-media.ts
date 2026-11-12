import { z } from "zod";

export const archiveMediaInput = z.object({
  strategyId: z.string().min(1).optional(), specimenId: z.string().min(1),
  rights: z.enum(["OWNED", "LICENSED", "PUBLIC_DOMAIN"]),
  rightsEvidenceUrl: z.url().max(2000).refine(v => new URL(v).protocol === "https:"),
  rightsNote: z.string().trim().min(10).max(1000),
  // An explicit end date; durable storage does not mean irrevocable storage.
  retainUntil: z.coerce.date(),
});
export const removeMediaInput = z.object({ strategyId: z.string().min(1).optional(), specimenId: z.string().min(1), reason: z.string().trim().min(5).max(500) });
export const archiveReceiptSchema = z.object({
  schema: z.literal("creative-media-archive-v1"), state: z.enum(["PENDING", "STORED", "PURGED"]),
  objectKey: z.string().regex(/^[a-f0-9]{64}$/), storage: z.enum(["VOLUME", "HTTP_BLOB"]),
  backendId: z.string().regex(/^[a-f0-9]{64}$/), keyId: z.string().min(1), contentHash: z.string().regex(/^[a-f0-9]{64}$/), byteLength: z.number().int().positive(),
  mediaType: z.enum(["video/mp4", "image/jpeg", "image/png"]),
  rights: archiveMediaInput.shape.rights, rightsEvidenceUrl: archiveMediaInput.shape.rightsEvidenceUrl,
  rightsNote: archiveMediaInput.shape.rightsNote, retainUntil: z.iso.datetime(), recordedBy: z.string(),
  recordedAt: z.iso.datetime(), purgedAt: z.iso.datetime().optional(), purgeReason: z.string().optional(),
});
export type ArchiveReceipt = z.infer<typeof archiveReceiptSchema>;

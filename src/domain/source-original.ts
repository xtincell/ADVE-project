import { z } from "zod";

/** Receipt of the received bytes, never a claim about their truth or approval. */
export const sourceOriginalReceiptSchema = z.object({
  schema: z.literal("source-original-v1"),
  state: z.enum(["PENDING", "STORED"]),
  objectKey: z.string().regex(/^[a-f0-9]{64}$/),
  storage: z.enum(["VOLUME", "HTTP_BLOB"]),
  backendId: z.string(),
  keyId: z.string(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  byteLength: z.number().int().positive().max(10 * 1024 * 1024),
  fileType: z.string(),
  receivedAt: z.string().datetime(),
});
export type SourceOriginalReceipt = z.infer<typeof sourceOriginalReceiptSchema>;
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

export function sourceOriginalSummary(value: unknown) {
  const parsed = sourceOriginalReceiptSchema.safeParse(value);
  if (!parsed.success) return null;
  const { state, contentHash, byteLength, receivedAt } = parsed.data;
  return { state, contentHash, byteLength, receivedAt };
}

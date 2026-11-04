import { z } from "zod";

export const artworkSlot = z.object({
  photoLayerId: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_.:-]{0,119}$/),
  photoPolicy: z.enum(["GENERATED_CANDIDATE", "LOCKED_MASTER"]),
}).strict();

export const productionArtwork = artworkSlot.extend({
  assetId: z.string().trim().min(1).max(180),
  version: z.number().int().positive(),
  originalHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type ProductionArtwork = z.infer<typeof productionArtwork>;

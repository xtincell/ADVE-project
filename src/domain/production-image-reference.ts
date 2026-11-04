import { z } from "zod";
import { productionPin } from "./production-sources";

const imageReference = productionPin.pick({ assetId: true, version: true }).extend({
  originalHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type ProductionImageReference = z.infer<typeof imageReference>;
export const productionImageReferences = z.array(imageReference).min(1).max(12)
  .refine((rows) => new Set(rows.map((row) => row.assetId)).size === rows.length, "Référence visuelle en double.");

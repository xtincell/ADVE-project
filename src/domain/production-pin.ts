import { z } from "zod";
import { artworkSlot } from "./production-artwork";

export const productionSourceRole = z.enum(["ART_DIRECTION", "COPY", "REFERENCE", "MATERIAL"]);
export const productionPin = z.object({
  assetId: z.string().trim().min(1).max(180), version: z.number().int().positive(), role: productionSourceRole,
  artwork: artworkSlot.optional(),
  sections: z.array(z.string().regex(/^[a-f0-9]{64}$/)).min(1).max(80).refine(a => new Set(a).size === a.length, "Passage en double.").optional(),
}).strict();
export type ProductionPin = z.infer<typeof productionPin>;
export const productionPins = z.array(productionPin).max(12).superRefine((pins, ctx) => {
  const used = new Set<string>();
  const singleton = new Set<string>();
  for (const p of pins) {
    if (used.has(p.assetId)) ctx.addIssue({ code: "custom", message: "Attribuez un seul usage à chaque source." });
    used.add(p.assetId);
    if (p.artwork && (p.role !== "MATERIAL" || p.sections || singleton.has("master"))) ctx.addIssue({code:"custom",message:"Retenez un seul master intégral en tant que matériau."});
    if (p.artwork) singleton.add("master");
    if (["COPY", "ART_DIRECTION"].includes(p.role) && singleton.has(p.role))
      ctx.addIssue({ code: "custom", message: "Retenez une seule direction et un seul texte." });
    singleton.add(p.role);
  }
});

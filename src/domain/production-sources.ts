/** Versioned copy, art direction, visual references and material requirements for the forge. */
import { z } from "zod";
import { productionArtwork } from "./production-artwork";
import { calendarBriefSource } from "./calendar-brief-source";

export { productionPins, productionPin, productionSourceRole, type ProductionPin } from "./production-pin";
import { productionPin } from "./production-pin";
const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const productionSourceManifest = z.object({
  schema: z.literal("production-sources/v1"),
  calendarBrief:calendarBriefSource.optional(),
  productionArtwork:productionArtwork.optional(),
  sources: z.array(productionPin.extend({
    name: z.string(), kind: z.string(), state: z.string(),
    text: z.string(), transport: z.enum(["TEXT", "IDENTITY_ONLY", "IMAGE_REFERENCE", "ARTWORK_MASTER"]),
    documentId: z.string().nullable(), documentHash: digest.nullable(), originalHash: digest.nullable(),
    fingerprint: digest,
  })),
  creativeProposal: z.object({ id: z.string(), routeKey: z.string(), direction: z.string(), revision: z.string(), fingerprint: digest }).nullable(),
});
export type ProductionSourceManifest = z.infer<typeof productionSourceManifest>;

export function materialHandoffBlock(manifest: ProductionSourceManifest): string | null {
  if (manifest.calendarBrief && /carrousel|carousel|vidéo|video|reels?/i.test(manifest.calendarBrief.format ?? "")) return "Ce format exige plusieurs images ou un rendu vidéo. Le brief est prêt ; la forge image unique ne peut pas livrer ce format complet.";
  if(manifest.calendarBrief?.hasArtDirection===false && manifest.productionArtwork?.photoPolicy!=="LOCKED_MASTER" && !manifest.creativeProposal && !manifest.sources.some(s=>s.role==="ART_DIRECTION" && s.text.trim())) return "Aucune direction artistique applicable à ce post. Renseignez la direction dans D, retenez une proposition créative ou associez une source de DA versionnée avant de produire.";
  const master = manifest.productionArtwork;
  const materials = manifest.sources.filter(s => s.role === "MATERIAL" && !(master && s.transport==="ARTWORK_MASTER" && master.assetId===s.assetId && master.version===s.version && master.originalHash===s.originalHash));
  return materials.length ? `Incorporation non raccordée pour : ${materials.map(s => s.name + " v" + s.version).join(", ")}. Le moteur transmet du texte, pas les fichiers à intégrer. Utilisez un montage avec les originaux ou révisez la sélection.` : null;
}

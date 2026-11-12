/** Private pixels exist only in the provider call. The persisted brief contains versioned identifiers. */
import { createHash } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { productionImageReferences } from "@/domain/production-image-reference";
import { db } from "@/lib/db";
import { MAX_SOURCE_BYTES } from "@/domain/source-original";
import { readAssetOriginal } from "@/server/services/brand-vault/original";
import { assertUsablePin } from "@/server/services/deliverable-orchestrator/production-sources";
import type { ForgeBrief, ProviderName } from "./types";

const stored = z.object({
  original: z.object({
    state: z.literal("STORED"),
    contentHash: z.string(),
    byteLength: z.number().int().positive().max(MAX_SOURCE_BYTES),
  }),
});
const imageTypes = new Map([["png", "image/png"], ["jpeg", "image/jpeg"], ["webp", "image/webp"]]);
type ReferenceScope = { strategyId: string; operatorId: string; campaignId?: string | null };

export async function briefForImageProvider(brief: ForgeBrief, provider: ProviderName, scope: ReferenceScope) {
  const params = brief.forgeSpec.parameters;
  if (params.productionReferences === undefined) return brief;
  const checked = productionImageReferences.safeParse(params.productionReferences);
  if (!checked.success || params.referenceImageUrls !== undefined) {
    throw new Error("Sélection de références visuelles invalide. Préparez un nouvel aperçu.");
  }
  if (provider !== "openai" || !["image", "icon"].includes(brief.forgeSpec.kind)) {
    throw new Error("Le moteur choisi ne peut pas recevoir les références visuelles de ce brief.");
  }
  const assets = await db.brandAsset.findMany({
    where: {
      strategyId: scope.strategyId,
      id: { in: checked.data.map((pin) => pin.assetId) },
      // Legacy assets can inherit their operator from the already-admitted strategy.
      OR: [{ operatorId: scope.operatorId }, { operatorId: null }],
    },
    select: {
      id: true,
      name: true,
      state: true,
      version: true,
      staleAt: true,
      campaignId: true,
      fileSize: true,
      metadata: true,
      mimeType: true,
    },
  });
  const selections = checked.data.map((pin) => {
    const asset = assets.find((row) => row.id === pin.assetId);
    if (!asset) throw new Error("Référence visuelle inaccessible dans cette marque.");
    assertUsablePin(asset, { ...pin, role: "REFERENCE" }, scope.campaignId ?? undefined);
    const meta = stored.safeParse(asset.metadata);
    if (
      !meta.success || !asset.mimeType || ![...imageTypes.values()].includes(asset.mimeType) ||
      meta.data.original.contentHash !== pin.originalHash ||
      (asset.fileSize !== null && asset.fileSize !== meta.data.original.byteLength)
    ) {
      throw new Error(
        "La référence visuelle a changé, dépasse la taille autorisée ou ne possède pas d’original image lisible.",
      );
    }
    return { pin, mimeType: asset.mimeType, byteLength: meta.data.original.byteLength };
  });
  if (selections.reduce((bytes, s) => bytes + s.byteLength, 0) > MAX_SOURCE_BYTES) {
    throw new Error("Les références visuelles dépassent ensemble 10 Mio. Sélectionnez des versions plus légères.");
  }

  const urls: string[] = [];
  for (const { pin, mimeType, byteLength } of selections) {
    const original = await readAssetOriginal(pin.assetId);
    if (
      !original || original.receipt.contentHash !== pin.originalHash || original.receipt.fileType !== mimeType ||
      original.bytes.length !== byteLength ||
      createHash("sha256").update(original.bytes).digest("hex") !== pin.originalHash
    ) {
      throw new Error("Les octets reçus ne correspondent pas à la version de référence sélectionnée.");
    }
    const raster = sharp(original.bytes, { limitInputPixels: 20_000_000, failOn: "warning" });
    const info = await raster.metadata().catch(() => null);
    if (
      !info?.format || !info.width || !info.height || info.width * info.height > 20_000_000 ||
      imageTypes.get(info.format) !== mimeType
    ) {
      throw new Error("L’original sélectionné n’est pas une image PNG, JPEG ou WebP conforme à son type annoncé.");
    }
    // Metadata alone can be read from a truncated header. Exercise decoding but send the original bytes.
    try {
      await raster.resize(1, 1).raw().toBuffer();
    } catch {
      throw new Error("L’image de référence est endommagée et ne peut pas être décodée.");
    }
    urls.push(`data:${mimeType};base64,${original.bytes.toString("base64")}`);
  }
  return { ...brief, forgeSpec: { ...brief.forgeSpec, parameters: { ...params, referenceImageUrls: urls } } };
}

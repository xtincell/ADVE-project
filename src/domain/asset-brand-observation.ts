import { z } from "zod";

export const ASSET_BRAND_OBSERVATION = "published-brand-variation/v1";
export const ASSET_OBSERVATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const id = z.string().min(1);
const sample = z.object({ id, measuredAt: z.string().datetime(), score: z.number().finite() });

/** A brand-level comparison around a proved publication, never asset attribution. */
export const assetBrandObservation = z.object({
  schema: z.literal(ASSET_BRAND_OBSERVATION), assetVersionId: id, strategyId: id,
  publication: z.object({
    packageId: id, packageHash: z.string().regex(/^[a-f0-9]{64}$/), actionId: id,
    socialPostId: id, connectionId: id, externalPostId: id, publishedAt: z.string().datetime(),
  }),
  before: sample, after: sample, delta: z.number().finite(),
}).refine((value) => {
  const publishedAt = Date.parse(value.publication.publishedAt);
  return value.before.id !== value.after.id
    && Date.parse(value.before.measuredAt) < publishedAt
    && Date.parse(value.after.measuredAt) >= publishedAt + ASSET_OBSERVATION_WINDOW_MS
    && value.delta === Math.round((value.after.score - value.before.score) * 100) / 100;
});
export type AssetBrandObservation = z.infer<typeof assetBrandObservation>;

/** Old unproven deltas are not upgraded to evidence on read. */
export function readAssetBrandObservation(metadata: unknown, assetVersionId: string, strategyId: string): AssetBrandObservation | null {
  if (!metadata || typeof metadata !== "object" || !("brandVariationObservation" in metadata)) return null;
  const parsed = assetBrandObservation.safeParse(metadata.brandVariationObservation);
  return parsed.success && parsed.data.assetVersionId === assetVersionId && parsed.data.strategyId === strategyId
    ? parsed.data : null;
}

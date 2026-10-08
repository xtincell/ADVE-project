import { z } from "zod";

/** A public edition of existing brand guidelines, never a strategy export. */
export const PUBLIC_BRAND_FORMAT = "public-brand-v1";
export const PublicWebUrl = z.string().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      && !url.search && !url.hash;
  } catch { return false; }
}, "Utilisez une adresse https publique, sans paramètres ni accès privé.");

export const PublicBrandContent = z.object({
  name: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(240),
  tagline: z.string().trim().max(600),
  description: z.string().trim().max(2400),
  // Only an explicitly chosen, public logo. Never signed/private-media URLs.
  logoUrl: PublicWebUrl.nullable(),
  links: z.array(z.object({ label: z.string().trim().min(1).max(80), url: PublicWebUrl }).strict()).max(12),
}).strict();
export type PublicBrandContent = z.infer<typeof PublicBrandContent>;

export const PublicBrandPublicationInput = z.object({
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
  expectedPublishedId: z.string().nullable(),
  content: PublicBrandContent,
  restoreId: z.string().optional(),
}).strict();

export const PublicBrandEdition = z.object({
  schema: z.literal(PUBLIC_BRAND_FORMAT),
  slug: z.string().regex(/^LFA-[a-z0-9]+(?:-[a-z0-9]+)*$/),
  edition: z.string(),
  version: z.number().int().positive(),
  publishedAt: z.string().datetime(),
  selection: z.enum(["observed", "chosen"]),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  content: PublicBrandContent,
}).strict();

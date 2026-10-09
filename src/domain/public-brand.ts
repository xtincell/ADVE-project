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

export const PUBLIC_BRAND_IDENTITY_FORMAT = "public-brand-v2";
export const PUBLIC_COLOR_ROLES = ["ink", "signature", "community", "paper", "warm", "soft"] as const;
export const PUBLIC_MASCOT_ROLES = ["greeting", "curious", "guide"] as const;
const AssetChoice = z.object({ assetId: z.string().min(1).max(100), version: z.number().int().positive() }).strict();
const Colors = z.object(Object.fromEntries(PUBLIC_COLOR_ROLES.map(role => [role, z.string().regex(/^#[a-fA-F0-9]{6}$/)])) as Record<(typeof PUBLIC_COLOR_ROLES)[number], z.ZodString>).strict();
const Faces = z.array(AssetChoice.extend({ weight: z.number().int().min(100).max(900).multipleOf(100) }).strict()).min(1).max(6)
  .refine(rows => new Set(rows.map(row => row.weight)).size === rows.length, "Choisissez une seule police par graisse.");
const FontChoice = z.object({ family: z.string().trim().min(1).max(100), faces: Faces }).strict();
export const PublicIdentityChoice = z.object({
  referenceSourceId: z.string().min(1).max(100),
  palette: AssetChoice.extend({ roles: Colors }).strict().nullable(),
  typography: AssetChoice.extend({ display: FontChoice, body: FontChoice }).strict().nullable(),
  mascots: AssetChoice.extend({ uses: z.array(AssetChoice.extend({ role: z.enum(PUBLIC_MASCOT_ROLES), alt: z.string().trim().min(1).max(240) }).strict()).min(1).max(3)
    .refine(rows => new Set(rows.map(row => row.role)).size === rows.length, "Choisissez une seule illustration par usage.") }).strict().nullable(),
  voice: z.object({ quote: z.string().trim().min(1).max(600), attribution: z.string().trim().min(1).max(120) }).strict().nullable(),
}).strict();
export type PublicIdentityChoice = z.infer<typeof PublicIdentityChoice>;
export const PublicIdentityFile = z.object({ url: PublicWebUrl, hash: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z.number().int().positive().max(10_000_000), type: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "font/otf", "font/ttf"]) }).strict();
const PublicFont = z.object({ family: z.string().min(1).max(100), faces: z.array(z.object({ weight: z.number().int().min(100).max(900).multipleOf(100),
  file: PublicIdentityFile.refine(file => file.type.startsWith("font/")) }).strict()).min(1).max(6)
  .refine(rows => new Set(rows.map(row => row.weight)).size === rows.length) }).strict();
export const PublicIdentity = z.object({
  palette: Colors.nullable(),
  typography: z.object({ display: PublicFont, body: PublicFont }).strict().nullable(),
  mascots: z.array(z.object({ role: z.enum(PUBLIC_MASCOT_ROLES), alt: z.string().min(1).max(240),
    file: PublicIdentityFile.refine(file => file.type.startsWith("image/")) }).strict()).max(3)
    .refine(rows => new Set(rows.map(row => row.role)).size === rows.length),
  voice: z.object({ quote: z.string().min(1).max(600), attribution: z.string().min(1).max(120) }).strict().nullable(),
}).strict();
export type PublicIdentity = z.infer<typeof PublicIdentity>;
export const PublicBrandContentV2 = PublicBrandContent.extend({ identity: PublicIdentity.nullable() }).strict();

export const PublicBrandPublicationInput = z.object({
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
  expectedPublishedId: z.string().nullable(),
  content: PublicBrandContent,
  restoreId: z.string().optional(),
  // Private publication choice; the public v1 content remains unchanged.
  logoAssetId: z.string().min(1).optional(),
  // Private, explicit source/asset/version/role choices; never a private charter export.
  identity: PublicIdentityChoice.nullable().optional(),
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
export const PublicBrandEditionV2 = PublicBrandEdition.extend({ schema: z.literal(PUBLIC_BRAND_IDENTITY_FORMAT), content: PublicBrandContentV2 }).strict();
export const AnyPublicBrandEdition = z.union([PublicBrandEdition, PublicBrandEditionV2]);

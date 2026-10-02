import { z } from "zod";

/** Identity links, never copied business state. ADR-0193. */
export const PortfolioReferenceSchema = z.object({
  system: z.enum(["LA_BARRE", "LA_FUSEE", "WEB", "GITHUB"]),
  kind: z.enum(["client", "brand", "range", "sku", "project", "strategy", "repository", "site"]),
  id: z.string().min(1).max(200),
  label: z.string().max(200).optional(),
  url: z.string().url().refine((s) => {
    const url = new URL(s);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  }, "Lien HTTP sans identifiants attendu").optional(),
}).superRefine((ref, ctx) => {
  const allowed: Record<string, string[]> = {
    LA_BARRE: ["client", "brand", "range", "sku", "project"],
    LA_FUSEE: ["strategy"], WEB: ["site"], GITHUB: ["repository"],
  };
  if (!allowed[ref.system]?.includes(ref.kind)) ctx.addIssue({ code: "custom", path: ["kind"], message: "Ce type de dossier n’appartient pas à cet outil." });
  if ((ref.system === "WEB" || ref.system === "GITHUB") && !ref.url) ctx.addIssue({ code: "custom", path: ["url"], message: "Le lien d’accès est nécessaire." });
  if (ref.kind === "range" && !/^[^:]+:.+$/.test(ref.id)) ctx.addIssue({ code: "custom", path: ["id"], message: "Une gamme utilise l’identifiant marque:gamme." });
});
export const PortfolioReferencesSchema = z.array(PortfolioReferenceSchema).max(40)
  .refine((rows) => new Set(rows.map((r) => `${r.system}:${r.kind}:${r.id}`)).size === rows.length,
    "Cette référence est déjà reliée");
export type PortfolioReference = z.infer<typeof PortfolioReferenceSchema>;

export function readPortfolioReferences(value: unknown): PortfolioReference[] {
  const parsed = PortfolioReferencesSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

export const PORTFOLIO_KIND_LABELS: Record<string, string> = {
  CORPORATE: "Groupe", MASTER_BRAND: "Marque", STANDALONE_BRAND: "Marque",
  REGIONAL_CLUSTER: "Région", REGIONAL_BRAND: "Marché", PRODUCT_LINE: "Gamme",
  PRODUCT_VARIANT: "Variante", SKU: "Référence produit", COMPANY: "Entreprise",
  PLATFORM: "Plateforme", MARKET: "Marché", FEATURE_LINE: "Produit ou service",
  FEATURE_VERSION: "Version", SERVICE_BRAND: "Marque de service", OFFER: "Offre",
};

export const PORTFOLIO_LIFECYCLE_LABELS: Record<string, string> = {
  ACTIVE: "Actif", DRAFT: "À achever", ARCHIVED: "Archivé", DEPRECATED: "Retiré",
};

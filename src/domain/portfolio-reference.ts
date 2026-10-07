import { z } from "zod";

// The existing connector reads this one depot. Never pretend to resolve another instance.
export const PORTFOLIO_BARRE_INSTANCE = "barre-matanga";
const instanceSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);
const projectSchema = z.object({
  system: z.literal("LA_BARRE"), instance: z.literal(PORTFOLIO_BARRE_INSTANCE),
  kind: z.literal("project"), id: z.string().min(1).max(200),
}).strict();

/** Identity links, never copied business state. ADR-0193/0200. */
export const PortfolioReferenceSchema = z.object({
  system: z.enum(["LA_BARRE", "LA_FUSEE", "WEB", "GITHUB", "RADAR"]),
  kind: z.enum(["client", "brand", "range", "sku", "project", "strategy", "repository", "site", "brief"]),
  instance: instanceSchema.optional(),
  project: projectSchema.optional(),
  id: z.string().min(1).max(200),
  label: z.string().max(200).optional(),
  url: z.string().url().refine((s) => {
    const url = new URL(s);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  }, "Lien HTTP sans identifiants attendu").optional(),
}).strict().superRefine((ref, ctx) => {
  const allowed: Record<string, string[]> = {
    LA_BARRE: ["client", "brand", "range", "sku", "project"],
    LA_FUSEE: ["strategy"], WEB: ["site"], GITHUB: ["repository"], RADAR: ["brief"],
  };
  if (!allowed[ref.system]?.includes(ref.kind)) ctx.addIssue({ code: "custom", path: ["kind"], message: "Ce type de dossier n’appartient pas à cet outil." });
  if ((ref.system === "WEB" || ref.system === "GITHUB") && !ref.url) ctx.addIssue({ code: "custom", path: ["url"], message: "Le lien d’accès est nécessaire." });
  if (ref.kind === "range" && !/^[^:]+:.+$/.test(ref.id)) ctx.addIssue({ code: "custom", path: ["id"], message: "Une gamme utilise l’identifiant marque:gamme." });
  if (ref.system === "RADAR") {
    if (!ref.instance) ctx.addIssue({ code: "custom", path: ["instance"], message: "Précisez l’instance Radar qui conserve le dossier." });
    if (!/^[1-9]\d*$/.test(ref.id)) ctx.addIssue({ code: "custom", path: ["id"], message: "Utilisez l’identifiant numérique stable du dossier Radar, pas son code affiché." });
  } else {
    if (ref.project) ctx.addIssue({ code: "custom", path: ["project"], message: "Le projet source qualifie uniquement un suivi Radar." });
    if (ref.instance && !(ref.system === "LA_BARRE" && ref.instance === PORTFOLIO_BARRE_INSTANCE)) {
      ctx.addIssue({ code: "custom", path: ["instance"], message: "Cette instance n’est pas raccordée au portefeuille." });
    }
  }
});
export const PortfolioReferencesSchema = z.array(PortfolioReferenceSchema).max(40)
  .refine((rows) => new Set(rows.map(portfolioReferenceKey)).size === rows.length,
    "Cette référence est déjà reliée");
export type PortfolioReference = z.infer<typeof PortfolioReferenceSchema>;

export function portfolioReferenceKey(ref: PortfolioReference): string {
  return JSON.stringify([ref.system, ref.instance ?? (ref.system === "LA_BARRE" ? PORTFOLIO_BARRE_INSTANCE : ""), ref.kind, ref.id]);
}

/** Tolerant reading is never a license to overwrite rejected historical entries. */
export function inspectPortfolioReferences(value: unknown): {
  references: PortfolioReference[]; issues: Array<{ index: number | null; message: string }>;
} {
  if (value == null) return { references: [], issues: [] };
  if (!Array.isArray(value)) return { references: [], issues: [{ index: null, message: "Le format des raccordements est à réparer." }] };
  const references: PortfolioReference[] = [], issues: Array<{ index: number | null; message: string }> = [];
  const seen = new Set<string>();
  if (value.length > 40) issues.push({ index: null, message: "Le dossier dépasse les 40 raccordements autorisés." });
  value.forEach((row, index) => {
    const parsed = PortfolioReferenceSchema.safeParse(row);
    if (!parsed.success) { issues.push({ index, message: `Lien ${index + 1} : ${parsed.error.issues.map((i) => i.message).join(" · ")}` }); return; }
    const key = portfolioReferenceKey(parsed.data);
    if (seen.has(key)) { issues.push({ index, message: `Lien ${index + 1} : cette identité est déjà reliée.` }); return; }
    seen.add(key); references.push(parsed.data);
  });
  return { references, issues };
}

export function readPortfolioReferences(value: unknown): PortfolioReference[] {
  return inspectPortfolioReferences(value).references;
}

/** One shared follow-up appears once per project, even across several brand nodes. */
export function portfolioProjectFollowUps(references: PortfolioReference[], projectId: string): PortfolioReference[] {
  return [...new Map(references.filter((r) => r.system === "RADAR" && r.project?.id === projectId &&
    r.project.instance === PORTFOLIO_BARRE_INSTANCE).map((r) => [portfolioReferenceKey(r), r])).values()];
}

/** Browser links to native files may be root-relative. Never accept credentials,
 * executable schemes, protocol-relative hosts or ambiguous backslashes. */
export function portfolioFileUrl(value: string | null | undefined): string | null {
  if (!value || /[\u0000-\u0020\\]/.test(value)) return null;
  try {
    if (value.startsWith("/")) {
      const decoded = decodeURIComponent(value);
      if (decoded.startsWith("//") || decoded.includes("\\")) return null;
      return value;
    }
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
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

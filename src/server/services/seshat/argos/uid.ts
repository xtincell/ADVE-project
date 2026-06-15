/**
 * Argos — UID hiérarchiques déterministes (pur, testable). ADR-0100.
 * ref = brandUid[--campaignUid]. Slug URL-safe, sans accents.
 */

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function brandUid(brand: string): string {
  return slugify(brand) || "marque";
}

export function campaignUid(campaign: string): string {
  return slugify(campaign);
}

export function dossierRef(brand: string, campaign?: string | null): string {
  const b = brandUid(brand);
  const c = campaign ? campaignUid(campaign) : "";
  return c ? `${b}--${c}` : b;
}

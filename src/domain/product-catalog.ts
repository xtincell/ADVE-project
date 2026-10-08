/**
 * product-catalog.ts — intégrité du socle produit (ADR-0171).
 *
 * Le catalogue `V.produitsCatalogue` est la SOURCE DE VÉRITÉ produit. Les gammes
 * (`V.productLadder.produitIds`), la carte persona×segment
 * (`V.personaSegmentMap.productNames`) et le système produit
 * (`V.productSystem.*.relatedProductIds` / `anchorProductIds`) **reposent** sur
 * lui — mais rien ne garantissait que ces références RÉSOLVENT (l'`id` produit
 * était optionnel et jamais assigné → références fantômes).
 *
 * Ce module (Layer-0 pur) donne :
 *   - des **ids stables** (`ensureProductIds` — slug déterministe de `nom`, dédup) ;
 *   - une **résolution tolérante** (`resolveProductRef` — par id OU nom, robuste
 *     même sur les catalogues historiques sans id) ;
 *   - la **détection des références fantômes** (`danglingProductRefs`) pour le
 *     cross-validator (surfacer honnêtement les liens cassés, jamais les cacher).
 */

export interface CatalogueProduct {
  id?: string;
  nom?: string;
  [k: string]: unknown;
}

/** Conditions déclarées, sans extraire ni inventer montant, période ou fiscalité. */
export function cataloguePriceLabel(product: CatalogueProduct): string {
  if (Object.hasOwn(product, "conditionsTarifaires") && product.conditionsTarifaires != null) {
    return typeof product.conditionsTarifaires === "string" && product.conditionsTarifaires.trim()
      ? product.conditionsTarifaires.trim()
      : "Conditions tarifaires à vérifier";
  }
  const price = product.prix;
  if (typeof price === "number" && Number.isFinite(price) && price >= 0) {
    return price === 0 ? "Gratuit" : `${new Intl.NumberFormat("fr-FR").format(price)} FCFA`;
  }
  // Les anciennes chaînes restent lisibles : aucune conversion Number("…/mois").
  return typeof price === "string" && price.trim() ? price.trim() : "Prix non renseigné";
}

/**
 * Référence scalaire legacy, PAS panier mesuré. Une liste de prix différents
 * n'a pas de pondération de ventes ; les conditions textuelles peuvent contenir
 * plusieurs périodes/bases. Dans ces cas on s'abstient, jamais une moyenne ou 0.
 */
export function catalogueReferencePrice(products: unknown): number | null {
  if (!Array.isArray(products) || products.length === 0) return null;
  const amounts: number[] = [];
  for (const product of products) {
    if (!product || typeof product !== "object" || Array.isArray(product)) return null;
    if (Object.hasOwn(product, "conditionsTarifaires") && product.conditionsTarifaires != null) return null;
    const amount: unknown = product.prix;
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return null;
    amounts.push(amount);
  }
  return amounts.every(amount => amount === amounts[0]) ? amounts[0]! : null;
}

/** La gamme lit son produit canonique ; son ancien prix ne masque ni évolution ni lien cassé. */
export function productLadderPriceLabel(tier: CatalogueProduct, catalogue: unknown): string {
  const rawRefs = tier.produitIds;
  if (rawRefs === undefined) return cataloguePriceLabel(tier); // Ancienne gamme sans liens.
  if (!Array.isArray(rawRefs) || rawRefs.length === 0 || !rawRefs.every(ref => typeof ref === "string" && ref.trim())) return "Références produit à vérifier";
  const products: CatalogueProduct[] = Array.isArray(catalogue)
    ? catalogue.filter((p): p is CatalogueProduct => p !== null && typeof p === "object" && !Array.isArray(p))
    : [];
  const resolved = rawRefs.map(ref => ({ ref, product: resolveProductRef(products, ref as string) }));
  const missing = resolved.filter(r => !r.product);
  if (missing.length > 0) return missing.map(r => `Produit « ${r.ref} » introuvable`).join("\n");
  const labels = resolved.map(r => cataloguePriceLabel(r.product!));
  if (labels.every(label => label === labels[0])) return labels[0]!;
  return resolved.map((r, i) => `${r.product!.nom ?? r.ref} : ${labels[i]}`).join("\n");
}

/** Slug déterministe d'un nom de produit (ascii, kebab, borné). */
export function productSlug(nom: string): string {
  const base = (nom || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "produit";
}

/**
 * Backfill des ids manquants (déterministe, dédupliqué). Ne touche JAMAIS un id
 * existant (stabilité des références). Retourne une NOUVELLE liste.
 */
export function ensureProductIds<T extends CatalogueProduct>(catalogue: readonly T[]): T[] {
  const used = new Set<string>();
  for (const p of catalogue) if (typeof p.id === "string" && p.id) used.add(p.id);
  return catalogue.map((p) => {
    if (typeof p.id === "string" && p.id) return p;
    let candidate = productSlug(typeof p.nom === "string" ? p.nom : "");
    let n = 2;
    while (used.has(candidate)) candidate = `${productSlug(typeof p.nom === "string" ? p.nom : "")}-${n++}`;
    used.add(candidate);
    return { ...p, id: candidate };
  });
}

/** Normalise une chaîne pour comparaison tolérante (nom/id). */
function norm(s: unknown): string {
  return typeof s === "string" ? s.trim().toLowerCase() : "";
}

/**
 * Résout une référence (id OU nom OU slug) vers un produit du catalogue.
 * Tolérant : fonctionne même si les produits n'ont pas d'id (match par nom).
 */
export function resolveProductRef<T extends CatalogueProduct>(
  catalogue: readonly T[],
  ref: string,
): T | null {
  const r = norm(ref);
  if (!r) return null;
  return (
    catalogue.find((p) => norm(p.id) === r) ??
    catalogue.find((p) => norm(p.nom) === r) ??
    catalogue.find((p) => productSlug(typeof p.nom === "string" ? p.nom : "") === r) ??
    null
  );
}

export interface DanglingRef {
  source: string; // ex. "productLadder[0].produitIds"
  ref: string; // la référence qui ne résout pas
}

/** Extrait un tableau depuis un contenu inconnu. */
function arr(v: unknown): Array<Record<string, unknown>> {
  return Array.isArray(v) ? (v as Array<Record<string, unknown>>) : [];
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/**
 * Recense toutes les références produit qui NE RÉSOLVENT PAS vers le catalogue.
 * Couvre gammes (produitIds), persona×segment (productNames) et système produit
 * (anchorProductIds + modes/artifacts/archetypes .relatedProductIds).
 */
export function danglingProductRefs(vContent: Record<string, unknown> | null | undefined): DanglingRef[] {
  const v = vContent ?? {};
  const catalogue = arr(v.produitsCatalogue) as CatalogueProduct[];
  const out: DanglingRef[] = [];
  const check = (refs: string[], source: string) => {
    for (const ref of refs) if (!resolveProductRef(catalogue, ref)) out.push({ source, ref });
  };

  arr(v.productLadder).forEach((tier, i) => check(strArr(tier.produitIds), `productLadder[${i}].produitIds`));
  arr(v.personaSegmentMap).forEach((m, i) => check(strArr(m.productNames), `personaSegmentMap[${i}].productNames`));

  const ps = (v.productSystem ?? {}) as Record<string, unknown>;
  check(strArr(ps.anchorProductIds), "productSystem.anchorProductIds");
  for (const dim of ["modes", "artifacts", "archetypes"] as const) {
    arr(ps[dim]).forEach((el, i) => check(strArr(el.relatedProductIds), `productSystem.${dim}[${i}].relatedProductIds`));
  }
  return out;
}

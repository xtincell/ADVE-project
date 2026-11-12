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

import { acquireEntityIds } from "./entity-ids";

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
 * Ids manquants : reprend un nom EXACT et non ambigu de l'état précédent,
 * sinon alloue un slug dédupliqué. Ne réutilise pas l'id d'un produit supprimé
 * et ne déduit jamais une identité de la position dans le tableau.
 * `reserved` porte les identifiants de tout l'historique (produits retirés
 * compris) : un nouvel homonyme d'un produit retiré n'hérite jamais de son id.
 * Ne touche JAMAIS un id existant. Retourne une NOUVELLE liste.
 */
export function ensureProductIds<T extends CatalogueProduct>(
  catalogue: readonly T[], previous: readonly CatalogueProduct[] = [], reserved: Iterable<string> = [],
): T[] {
  return acquireEntityIds(catalogue, previous, "nom", (product, attempt) => {
    const slug = productSlug(typeof product.nom === "string" ? product.nom : "");
    return attempt ? `${slug}-${attempt + 1}` : slug;
  }, reserved);
}

// ── Historique des identités (ADR-0205, amendement 568) ────────────────

/** Écriture gouvernée qui a fait passer le catalogue d'une version à la suivante. */
export interface CatalogueWrite {
  at: string;
  author: string | null;
  reason: string | null;
  intentId: string | null;
  /** Écriture compensée : la nouvelle version restaure une archive (ADR-0207). */
  compensatedFrom: string | null;
}

/** État archivé du catalogue à `version`, et l'écriture qui l'a remplacé. */
export interface CatalogueArchive<W extends CatalogueWrite = CatalogueWrite> {
  version: number;
  catalogue: unknown;
  write: W;
}

export type CatalogueIdentityEventKind = "APPEARED" | "RETIRED" | "REINTRODUCED" | "RENAMED";

export interface CatalogueIdentityEvent<W extends CatalogueWrite = CatalogueWrite> {
  kind: CatalogueIdentityEventKind;
  productId: string;
  name: string | null;
  /** Nom avant renommage, ou dernier nom connu avant le retrait pour une réintroduction. */
  previousName: string | null;
  /** null : présent dès la plus ancienne version conservée. */
  fromVersion: number | null;
  toVersion: number;
  /** null : aucune écriture unique conservée entre ces deux versions. */
  write: W | null;
  /**
   * Réintroduction seulement. RESTORATION : restauration d'une version conservée ;
   * NONE : identifiant repris sans restauration (écritures antérieures à la règle),
   * à vérifier ; UNKNOWN : écriture non conservée.
   */
  proof: "RESTORATION" | "NONE" | "UNKNOWN" | null;
}

export interface CatalogueIdentityHistory<W extends CatalogueWrite = CatalogueWrite> {
  events: CatalogueIdentityEvent<W>[];
  /** Identifiants déjà acquis et absents du catalogue courant. */
  retiredIds: string[];
  /** Produits sans identifiant : non suivis, jamais rapprochés par nom ou position. */
  unidentified: { current: number; archivedVersions: number };
  /** Passages de version sans écriture unique conservée. */
  unattributed: Array<{ fromVersion: number; toVersion: number }>;
}

const productRecords = (value: unknown): CatalogueProduct[] => Array.isArray(value)
  ? value.filter((p): p is CatalogueProduct => p !== null && typeof p === "object" && !Array.isArray(p)) : [];
const acquiredId = (product: CatalogueProduct): string | null =>
  typeof product.id === "string" && product.id.trim() ? product.id : null;
const productName = (product: CatalogueProduct): string | null => typeof product.nom === "string" ? product.nom : null;

/** Identités d'un état, dans l'ordre du catalogue ; un id répété garde sa première entrée. */
function identities(value: unknown): Map<string, CatalogueProduct> {
  const result = new Map<string, CatalogueProduct>();
  for (const product of productRecords(value)) {
    const id = acquiredId(product);
    if (id && !result.has(id)) result.set(id, product);
  }
  return result;
}

/**
 * Identités retirées : la dernière entrée connue de chaque produit de l'historique
 * absent de l'état courant — par id quand il en a un, sinon par nom exact. Les
 * identifiants de tout l'historique sont réservés à l'allocation.
 */
export function retiredCatalogueIdentities(history: readonly unknown[], current: unknown): {
  reservedIds: Set<string>; retired: CatalogueProduct[];
} {
  const now = productRecords(current);
  const presentIds = new Set(now.flatMap(p => acquiredId(p) ? [acquiredId(p)!] : []));
  const presentNames = new Set(now.flatMap(p => productName(p) !== null ? [productName(p)!] : []));
  const reservedIds = new Set(presentIds);
  const last = new Map<string, CatalogueProduct>();
  for (const state of history) {
    for (const product of productRecords(state)) {
      const id = acquiredId(product);
      if (id) reservedIds.add(id);
      const name = productName(product);
      const key = id ? `id:${id}` : name !== null && name.trim() ? `nom:${name}` : null;
      if (!key) continue;
      last.delete(key); // ordre : dernière apparition
      last.set(key, product);
    }
  }
  const retired = [...last.entries()].filter(([key, product]) => key.startsWith("id:")
    ? !presentIds.has(acquiredId(product)!) : !presentNames.has(productName(product)!)).map(([, product]) => product);
  return { reservedIds, retired };
}

/**
 * Historique lisible des identités du catalogue, dérivé des versions archivées.
 * Une archive `PillarVersion` porte l'état AVANT une écriture et cette écriture ;
 * l'état courant clôt la suite. L'écriture n'est attribuée que si la version
 * suivante est exactement la suivante et l'archive unique — sinon `write: null`.
 * Aucune identité déduite d'un nom, d'une ressemblance ou d'une position.
 */
export function catalogueIdentityHistory<W extends CatalogueWrite>(
  archives: readonly CatalogueArchive<W>[], current: { version: number; catalogue: unknown },
): CatalogueIdentityHistory<W> {
  const ordered = [...archives].sort((a, b) => a.version - b.version);
  const perVersion = new Map<number, number>();
  for (const archive of ordered) perVersion.set(archive.version, (perVersion.get(archive.version) ?? 0) + 1);
  const states = [...ordered.map(a => ({ version: a.version, catalogue: a.catalogue })), current];
  const events: CatalogueIdentityEvent<W>[] = [];
  const unattributed: CatalogueIdentityHistory<W>["unattributed"] = [];
  const lastName = new Map<string, string | null>();
  const event = (kind: CatalogueIdentityEventKind, productId: string, product: CatalogueProduct,
    previousName: string | null, fromVersion: number | null, toVersion: number, write: W | null) => {
    events.push({ kind, productId, name: productName(product), previousName, fromVersion, toVersion, write,
      proof: kind !== "REINTRODUCED" ? null : !write ? "UNKNOWN" : write.compensatedFrom ? "RESTORATION" : "NONE" });
  };

  const first = states[0]!;
  for (const [id, product] of identities(first.catalogue)) {
    event("APPEARED", id, product, null, null, first.version, null);
    lastName.set(id, productName(product));
  }
  for (let i = 0; i + 1 < states.length; i++) {
    const before = states[i]!, after = states[i + 1]!;
    const write = after.version === before.version + 1 && perVersion.get(before.version) === 1 ? ordered[i]!.write : null;
    if (!write) unattributed.push({ fromVersion: before.version, toVersion: after.version });
    const was = identities(before.catalogue), now = identities(after.catalogue);
    for (const [id, product] of now) {
      const old = was.get(id);
      if (!old) event(lastName.has(id) ? "REINTRODUCED" : "APPEARED", id, product, lastName.get(id) ?? null, before.version, after.version, write);
      else if (productName(old) !== productName(product)) event("RENAMED", id, product, productName(old), before.version, after.version, write);
    }
    for (const [id, product] of was) if (!now.has(id)) event("RETIRED", id, product, null, before.version, after.version, write);
    for (const [id, product] of now) lastName.set(id, productName(product));
  }

  const present = identities(current.catalogue);
  const unnamed = (value: unknown) => productRecords(value).filter(p => !acquiredId(p)).length;
  return {
    events,
    retiredIds: [...lastName.keys()].filter(id => !present.has(id)).sort(),
    unidentified: { current: unnamed(current.catalogue), archivedVersions: ordered.filter(a => unnamed(a.catalogue) > 0).length },
    unattributed,
  };
}

/**
 * À l'édition du catalogue, conserve la destination des références historiques.
 * Les champs *Ids prennent l'id acquis ; productNames conserve un nom lisible.
 * Correspondances EXACTES et uniques seulement, sans rapprocher un produit retiré
 * d'un nouveau produit homonyme. Aucun prix, origine ou autre champ n'est réécrit.
 * `retired` (produits retirés plus tôt dans l'historique) : une référence à leur
 * id ou à un nom qu'ils portaient reste telle quelle, à corriger par une décision.
 */
export function rebindProductRefs(
  content: Record<string, unknown>, previous: readonly CatalogueProduct[],
  products: readonly CatalogueProduct[], retired: readonly CatalogueProduct[] = [],
): Record<string, unknown> {
  const unique = (list: readonly CatalogueProduct[], key: "id" | "nom", ref: string) => {
    const matches = list.filter(p => p[key] === ref);
    return matches.length === 1 ? matches[0] : undefined;
  };
  const destination = (ref: string): CatalogueProduct | undefined => {
    const byId = unique(products, "id", ref);
    if (byId) return byId;
    if (unique(previous, "id", ref)) return undefined;
    // Une ancienne identité acquise ne peut pas basculer vers un homonyme.
    const oldNames = previous.filter(p => p.nom === ref);
    if (oldNames.length > 1) return undefined;
    const old = oldNames[0];
    if (old?.id) return unique(products, "id", old.id);
    if (!old && retired.some(p => p.id === ref || p.nom === ref)) return undefined;
    return unique(products, "nom", ref);
  };
  const refs = (value: unknown, names = false) => Array.isArray(value)
    ? value.map(ref => {
      if (typeof ref !== "string") return ref;
      const product = destination(ref);
      return (names ? product?.nom : product?.id) || ref;
    }) : value;
  const records = (value: unknown, key: string, names = false) => Array.isArray(value)
    ? value.map(item => item && typeof item === "object" && !Array.isArray(item) && Object.hasOwn(item, key)
      ? { ...item, [key]: refs(item[key], names) } : item) : value;
  const result = { ...content };
  if (Object.hasOwn(content, "productLadder")) result.productLadder = records(content.productLadder, "produitIds");
  if (Object.hasOwn(content, "personaSegmentMap")) result.personaSegmentMap = records(content.personaSegmentMap, "productNames", true);
  const ps = content.productSystem;
  if (ps && typeof ps === "object" && !Array.isArray(ps)) {
    const system = { ...ps } as Record<string, unknown>;
    if (Object.hasOwn(system, "anchorProductIds")) system.anchorProductIds = refs(system.anchorProductIds);
    for (const key of ["modes", "artifacts", "archetypes"]) {
      if (Object.hasOwn(system, key)) system[key] = records(system[key], "relatedProductIds");
    }
    result.productSystem = system;
  }
  return result;
}

/** Normalise une chaîne pour comparaison tolérante (nom/id). */
function norm(s: unknown): string {
  return typeof s === "string" ? s.trim().toLowerCase() : "";
}

/**
 * Résout une référence (id OU nom OU slug) vers un produit du catalogue.
 * Tolérant : fonctionne même si les produits n'ont pas d'id (match par nom).
 * Une identité acquise prime ; chaque niveau doit résoudre UN produit.
 * Un homonyme ou un slug ambigu ne devient jamais « le premier du tableau ».
 */
export function resolveProductRef<T extends CatalogueProduct>(
  catalogue: readonly T[],
  ref: string,
): T | null {
  const r = norm(ref);
  if (!r) return null;
  const byId = catalogue.filter((p) => norm(p.id) === r);
  if (byId.length) return byId.length === 1 ? byId[0]! : null;
  const byName = catalogue.filter((p) => norm(p.nom) === r);
  if (byName.length) return byName.length === 1 ? byName[0]! : null;
  const bySlug = catalogue.filter((p) => typeof p.nom === "string" && p.nom.trim() && productSlug(p.nom) === r);
  return bySlug.length === 1 ? bySlug[0]! : null;
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

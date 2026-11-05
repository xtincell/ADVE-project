import type { NavGroup, NavItem } from "./types";

/**
 * Résolution de l'item actif — « le préfixe correspondant le plus long
 * gagne » (lot 10, audit UX 2026-07-11 §B).
 *
 * Remplace le simple `pathname.startsWith(href)` par item : chaque item
 * matche sur son `href` + ses `activePrefixes` (hubs, onglets), et un seul
 * item s'allume — celui dont le préfixe matché est le plus long. Un href
 * imbriqué (« Abonnement » /cockpit/settings/billing sous « Réglages »
 * /cockpit/settings) gagne donc sur son parent, et les pages hors nav
 * rattachées à un hub (pages piliers, guidelines, onglets rapports)
 * allument leur hub au lieu de ne rien allumer.
 *
 * Le premier item du premier groupe (racine du portail, ex. /cockpit) ne
 * matche son propre href qu'en exact — sinon il serait préfixe de tout le
 * portail — mais ses `activePrefixes` matchent normalement.
 */
export function resolveActiveHref(navGroups: NavGroup[], pathname: string, search = ""): string | null {
  const routePath = (href: string) => href.split(/[?#]/)[0]!;
  const currentQuery = new URLSearchParams(search);
  const basePath = routePath(navGroups[0]?.items[0]?.href || "/");

  const prefixMatches = (prefix: string): boolean => {
    if (prefix === basePath) return pathname === basePath;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  };

  let bestHref: string | null = null;
  let bestLen = -1;
  let bestQueryCount = -1;
  for (const group of navGroups) {
    for (const item of group.items) {
      for (const href of [item.href, ...(item.activePrefixes ?? [])]) {
        const prefix = routePath(href);
        // Brand/team context does not define a page. An explicit tab does.
        const query = [...new URL(href, "https://navigation.local").searchParams]
          .filter(([key]) => !["strategy", "strategyId", "operator"].includes(key));
        if (!query.every(([key, value]) => currentQuery.get(key) === value)) continue;
        if (prefixMatches(prefix) && (prefix.length > bestLen
          || (prefix.length === bestLen && query.length > bestQueryCount))) {
          bestLen = prefix.length;
          bestQueryCount = query.length;
          bestHref = item.href;
        }
      }
    }
  }
  return bestHref;
}

/** Carry only explicit brand/team context between cockpit pages, never page filters. */
export function withCockpitContext(href: string, search: string): string {
  if (href !== "/cockpit" && !href.startsWith("/cockpit/") && !href.startsWith("/cockpit?")) return href;
  const destination = new URL(href, "https://navigation.local");
  const source = new URLSearchParams(search);
  if (!destination.searchParams.has("strategy") && !destination.searchParams.has("strategyId")) {
    const strategy = source.get("strategy") || source.get("strategyId");
    if (strategy) destination.searchParams.set("strategy", strategy);
  }
  if (!destination.searchParams.has("operator") && source.get("operator")) {
    destination.searchParams.set("operator", source.get("operator")!);
  }
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

/** Libellé localisé d'un item (pilier → slug i18n, sinon labelKey, sinon littéral FR). */
export const navItemLabel = (item: NavItem, t: (key: string) => string): string =>
  item.pillarSlug ? t(`nav.${item.pillarSlug}.name`) : item.labelKey ? t(item.labelKey) : item.label;

/** Sous-libellé localisé d'un item (même précédence que `navItemLabel`). */
export const navItemSublabel = (item: NavItem, t: (key: string) => string): string | undefined =>
  item.pillarSlug ? t(`nav.${item.pillarSlug}.role`) : item.sublabelKey ? t(item.sublabelKey) : item.sublabel;

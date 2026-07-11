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
export function resolveActiveHref(navGroups: NavGroup[], pathname: string): string | null {
  const basePath = navGroups[0]?.items[0]?.href || "/";

  const prefixMatches = (prefix: string): boolean => {
    if (prefix === basePath) return pathname === basePath;
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  };

  let bestHref: string | null = null;
  let bestLen = -1;
  for (const group of navGroups) {
    for (const item of group.items) {
      for (const prefix of [item.href, ...(item.activePrefixes ?? [])]) {
        if (prefixMatches(prefix) && prefix.length > bestLen) {
          bestLen = prefix.length;
          bestHref = item.href;
        }
      }
    }
  }
  return bestHref;
}

/** Libellé localisé d'un item (pilier → slug i18n, sinon labelKey, sinon littéral FR). */
export const navItemLabel = (item: NavItem, t: (key: string) => string): string =>
  item.pillarSlug ? t(`nav.${item.pillarSlug}.name`) : item.labelKey ? t(item.labelKey) : item.label;

/** Sous-libellé localisé d'un item (même précédence que `navItemLabel`). */
export const navItemSublabel = (item: NavItem, t: (key: string) => string): string | undefined =>
  item.pillarSlug ? t(`nav.${item.pillarSlug}.role`) : item.sublabelKey ? t(item.sublabelKey) : item.sublabel;

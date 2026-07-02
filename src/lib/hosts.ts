/**
 * Hosts — architecture par sous-domaines (WP-025), un SEUL déploiement.
 *
 * Le site vit sur une racine (`ROOT_DOMAIN`, fallback l'instance Coolify) et
 * trois sous-domaines servis par le même process Next, routés par
 * `src/middleware.ts` :
 *
 *   upgraders.<racine>         → site AGENCE (home = UPgraders) ; les chemins
 *                                produit /lafusee* et /tarifs y redirigent 308
 *                                vers le sous-domaine produit
 *   lafusee.<racine>           → univers PRODUIT : `/` → /lafusee,
 *                                `/tarifs` → /lafusee/tarifs (rewrites) ;
 *                                intake/connexion/app accessibles tels quels
 *   laguilde.<racine>          → `/` → /la-guilde (marketplace publique)
 *   argos.<racine>             → `/` → /argos
 *
 * Tout hôte inconnu (localhost, previews, ancienne URL) est servi tel quel —
 * aucun redirect : le dev local et les URLs historiques restent utilisables.
 * Module PUR (string ops uniquement, compatible edge) — testé dans
 * `tests/hosts.test.ts`.
 */

export const DEFAULT_ROOT_DOMAIN = "upgraders.76-13-128-23.sslip.io";

export const PRODUCT_SUBDOMAIN = "lafusee";
export const GUILD_SUBDOMAIN = "laguilde";
export const ARGOS_SUBDOMAIN = "argos";

/** Préfixe interne des pages produit dans l'app (`src/app/(public)/lafusee`). */
export const PRODUCT_PREFIX = "/lafusee";

/**
 * Table d'alias de l'hôte produit : chemin public court → page interne.
 * Étendre ici quand une nouvelle page produit gagne un alias de premier
 * niveau sur lafusee.<racine>.
 */
export const PRODUCT_ALIASES: Readonly<Record<string, string>> = {
  "/": PRODUCT_PREFIX,
  "/tarifs": `${PRODUCT_PREFIX}/tarifs`,
};

export type HostKind = "root" | "product" | "guild" | "argos" | "unknown";

export type HostDecision =
  | { action: "next" }
  | { action: "rewrite"; pathname: string }
  | { action: "redirect"; host: string; pathname: string };

/** Racine des domaines — env `ROOT_DOMAIN`, fallback l'instance Coolify. */
export function rootDomain(env: string | undefined = process.env.ROOT_DOMAIN): string {
  const raw = env?.trim().toLowerCase().replace(/\.+$/, "");
  return raw ? raw : DEFAULT_ROOT_DOMAIN;
}

/** En-tête Host normalisé : minuscules, sans port, sans point final. */
export function normalizeHost(hostHeader: string | null | undefined): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.trim().toLowerCase();
  if (!host) return null;
  // Littéral IPv6 « [::1]:3000 » — on garde les crochets, on retire le port.
  const bare = host.startsWith("[")
    ? (/^\[[^\]]*\]/.exec(host)?.[0] ?? "")
    : (host.split(":")[0] ?? "");
  const cleaned = bare.replace(/\.+$/, "");
  return cleaned ? cleaned : null;
}

/** Univers servi par un hôte donné. Inconnu = passthrough intégral. */
export function classifyHost(host: string | null, root: string = rootDomain()): HostKind {
  if (!host) return "unknown";
  if (host === root || host === `www.${root}`) return "root";
  if (host === `${PRODUCT_SUBDOMAIN}.${root}`) return "product";
  if (host === `${GUILD_SUBDOMAIN}.${root}`) return "guild";
  if (host === `${ARGOS_SUBDOMAIN}.${root}`) return "argos";
  return "unknown";
}

/** true si le chemin appartient à l'arborescence interne produit /lafusee*. */
export function isProductPath(pathname: string): boolean {
  return pathname === PRODUCT_PREFIX || pathname.startsWith(`${PRODUCT_PREFIX}/`);
}

/** /lafusee[/x] → chemin canonique côté hôte produit (« / » ou « /x »). */
export function stripProductPrefix(pathname: string): string {
  if (!isProductPath(pathname)) return pathname;
  const rest = pathname.slice(PRODUCT_PREFIX.length);
  return rest === "" ? "/" : rest;
}

/**
 * Table de routage host-based — décision PURE consommée par le middleware.
 * Les gardes auth (/app, /admin) sont hors de cette table : elles s'appliquent
 * avant, sur tous les hôtes, sans réécriture.
 */
export function resolveHostRoute(
  kind: HostKind,
  pathname: string,
  root: string = rootDomain(),
): HostDecision {
  const productHost = `${PRODUCT_SUBDOMAIN}.${root}`;

  switch (kind) {
    case "root": {
      // L'univers produit vit sur son sous-domaine — 308, chemin conservé.
      if (isProductPath(pathname)) {
        return { action: "redirect", host: productHost, pathname: stripProductPrefix(pathname) };
      }
      // Les alias produit de premier niveau (ex-/tarifs) suivent le produit.
      if (pathname !== "/" && pathname in PRODUCT_ALIASES) {
        return { action: "redirect", host: productHost, pathname };
      }
      return { action: "next" };
    }
    case "product": {
      const alias = PRODUCT_ALIASES[pathname];
      if (alias) return { action: "rewrite", pathname: alias };
      // Canonicalisation : les chemins internes /lafusee* ont un alias court.
      if (isProductPath(pathname)) {
        return { action: "redirect", host: productHost, pathname: stripProductPrefix(pathname) };
      }
      return { action: "next" };
    }
    case "guild": {
      if (pathname === "/") return { action: "rewrite", pathname: "/la-guilde" };
      return { action: "next" };
    }
    case "argos": {
      if (pathname === "/") return { action: "rewrite", pathname: "/argos" };
      return { action: "next" };
    }
    case "unknown":
      return { action: "next" };
  }
}

// ── URLs absolues (liens cross-univers, sitemap, metadataBase) ──────────

/** URL absolue du site agence (racine). Sans slash final. */
export function rootSiteUrl(root: string = rootDomain()): string {
  return `https://${root}`;
}

/**
 * URL absolue d'une page produit sur son sous-domaine. Accepte le chemin
 * interne (/lafusee/tarifs) comme l'alias court (/tarifs) — même résultat.
 */
export function productSiteUrl(path = "/", root: string = rootDomain()): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const short = stripProductPrefix(normalized);
  return `https://${PRODUCT_SUBDOMAIN}.${root}${short === "/" ? "/" : short}`;
}

/**
 * Quick Intake — Empreinte web publique (Vague 10).
 *
 * Mandat : « l'intake doit pouvoir collecter les données publiques de
 * l'empreinte web du client (articles, liens, social media…) dans le cadre
 * des étapes préliminaires à la rédaction du rapport — pour alimenter
 * fidèlement le pilier E/Engagement. »
 *
 * 100 % déterministe : fetch HTTP + parseurs HTML purs (regex sur meta/og/
 * liens), AUCUN LLM, AUCUN moteur de recherche (fragiles/anti-bot). Sources :
 *   1. le site déclaré (title, description, og:*, liens) ;
 *   2. les liens sociaux découverts SUR le site + ceux déclarés à l'intake ;
 *   3. les articles/actualités du site (sitemap.xml puis heuristique de
 *      chemins /blog|/actualites|/news…).
 *
 * Sécurité (l'URL vient de l'utilisateur) : https/http public uniquement,
 * IP privées/localhost/link-local REFUSÉES (anti-SSRF), 8 s de timeout par
 * fetch, 600 KB max par page, 12 fetches max par collecte.
 * Best-effort by design : toute erreur est collectée dans `errors[]`,
 * jamais propagée — l'intake n'échoue JAMAIS à cause de l'empreinte.
 */

import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { mentionsEntity } from "@/server/services/seshat/entity-gate";

// ── Types ──────────────────────────────────────────────────────────────

export interface SocialProfile {
  platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINKEDIN" | "TWITTER" | "YOUTUBE" | "WHATSAPP";
  url: string;
  handle: string | null;
  /** Titre OG de la page publique si récupérable. */
  title?: string | null;
  /** Indice followers parsé de l'og:description publique (best-effort). */
  followersHint?: number | null;
}

export interface FootprintArticle {
  url: string;
  title: string | null;
  source: "SITEMAP" | "SITE_LINK";
}

export interface SiteTech {
  cms: string | null;
  https: boolean;
  hasMetaDescription: boolean;
  hasOgTags: boolean;
  hasRobotsTxt: boolean | null;
  hasSitemap: boolean | null;
}

export interface WebFootprint {
  site: {
    url: string;
    reachable: boolean;
    title: string | null;
    description: string | null;
    ogImage: string | null;
    language: string | null;
    /** ADR-0121 vague A — analyse tech/SEO déterministe du site. */
    tech?: SiteTech;
  } | null;
  socials: SocialProfile[];
  articles: FootprintArticle[];
  /** Canaux déduits — alimentent e.touchpoints (canal + url). */
  channels: Array<{ canal: string; url: string; source: "EMPREINTE_WEB" }>;
  collectedAt: string;
  errors: string[];
}

// ── Constantes ─────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8_000;
const MAX_BYTES = 600_000;
const MAX_FETCHES = 12;
const MAX_ARTICLES = 8;
const UA =
  "Mozilla/5.0 (compatible; LaFuseeBot/1.0; +https://lafusee.upgraders.io/trust-center) AppleWebKit/537.36";

const SOCIAL_PATTERNS: Array<{ platform: SocialProfile["platform"]; re: RegExp; handleRe: RegExp }> = [
  { platform: "INSTAGRAM", re: /https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.\-/]+/gi, handleRe: /instagram\.com\/([A-Za-z0-9_.]+)/i },
  { platform: "FACEBOOK", re: /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9_.\-/]+/gi, handleRe: /facebook\.com\/([A-Za-z0-9_.]+)/i },
  { platform: "TIKTOK", re: /https?:\/\/(?:www\.)?tiktok\.com\/@?[A-Za-z0-9_.\-/]+/gi, handleRe: /tiktok\.com\/@?([A-Za-z0-9_.]+)/i },
  { platform: "LINKEDIN", re: /https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:company|in)\/[A-Za-z0-9_%.\-/]+/gi, handleRe: /linkedin\.com\/(?:company|in)\/([A-Za-z0-9_%.\-]+)/i },
  { platform: "TWITTER", re: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[A-Za-z0-9_/]+/gi, handleRe: /(?:twitter|x)\.com\/([A-Za-z0-9_]+)/i },
  { platform: "YOUTUBE", re: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/|user\/)[A-Za-z0-9_\-/]+/gi, handleRe: /youtube\.com\/(?:@|channel\/|c\/|user\/)([A-Za-z0-9_\-]+)/i },
  { platform: "WHATSAPP", re: /https?:\/\/(?:wa\.me|api\.whatsapp\.com\/send)[^\s"'<>]*/gi, handleRe: /wa\.me\/(\d+)/i },
];

const ARTICLE_PATH_HINTS = /\/(blog|actualites?|news|articles?|presse|press|media|publications?)(\/|$)/i;

// ── Parseurs purs (testés sur fixtures, zéro IO) ───────────────────────

export function parseHtmlMeta(html: string): {
  title: string | null;
  description: string | null;
  ogImage: string | null;
  language: string | null;
} {
  const pick = (re: RegExp): string | null => {
    const m = html.match(re);
    return m?.[1] ? decodeEntities(m[1].trim()).slice(0, 300) : null;
  };
  const meta = (name: string): string | null =>
    pick(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i")) ??
    pick(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, "i"));

  return {
    title: meta("og:title") ?? pick(/<title[^>]*>([^<]+)<\/title>/i),
    description: meta("og:description") ?? meta("description"),
    ogImage: meta("og:image"),
    language: pick(/<html[^>]+lang=["']([a-zA-Z-]{2,8})["']/i),
  };
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)) {
    const href = m[1]!.trim();
    if (href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      out.add(new URL(href, baseUrl).toString());
    } catch {
      /* lien malformé — ignoré */
    }
    if (out.size >= 400) break;
  }
  return [...out];
}

export function detectSocialLinks(htmlOrLinks: string): SocialProfile[] {
  const found = new Map<string, SocialProfile>();
  for (const { platform, re, handleRe } of SOCIAL_PATTERNS) {
    for (const m of htmlOrLinks.matchAll(re)) {
      const raw = m[0]!.replace(/[),.;'"]+$/, "");
      // Exclut les liens de partage (sharer, intent) — pas des profils.
      if (/sharer|share\.php|intent\/|\/share(\/|\?|$)/i.test(raw)) continue;
      const handle = raw.match(handleRe)?.[1] ?? null;
      // Chemins réservés de plateforme ≠ profils (round 12 test BK Abidjan :
      // tiktok.com/discover/burger-king-abidjan → handle « discover »).
      if (
        handle &&
        /^(p|reels?|posts?|watch|hashtag|share|sharer|home|search|discover|explore|stories|story|live|videos?|music|foryou|tag|tags|pages|groups|events|about|help|legal|privacy|terms|business|directory|mentions)$/i.test(
          handle,
        )
      )
        continue;
      const key = `${platform}:${(handle ?? raw).toLowerCase()}`;
      if (!found.has(key)) found.set(key, { platform, url: raw, handle });
    }
  }
  return [...found.values()];
}

/** « 12,345 Followers » / « 12 345 abonnés » dans l'og:description publique. */
export function parseFollowersHint(description: string | null): number | null {
  if (!description) return null;
  const m = description.match(/([\d][\d\s.,]{1,14})\s*(followers|abonn[ée]s)/i);
  if (!m) return null;
  const n = parseInt(m[1]!.replace(/[\s.,]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const CMS_SIGNATURES: Array<{ cms: string; re: RegExp }> = [
  { cms: "WordPress", re: /wp-content|wp-includes|<meta[^>]+generator[^>]+wordpress/i },
  { cms: "Shopify", re: /cdn\.shopify\.com|Shopify\.theme/i },
  { cms: "Wix", re: /static\.wixstatic\.com|wix\.com\/website/i },
  { cms: "Webflow", re: /assets(?:-global)?\.website-files\.com|<meta[^>]+generator[^>]+webflow/i },
  { cms: "Squarespace", re: /static1?\.squarespace\.com|<meta[^>]+generator[^>]+squarespace/i },
  { cms: "PrestaShop", re: /<meta[^>]+generator[^>]+prestashop|prestashop/i },
  { cms: "Joomla", re: /<meta[^>]+generator[^>]+joomla/i },
  { cms: "Drupal", re: /<meta[^>]+generator[^>]+drupal|\/sites\/default\/files/i },
  { cms: "Next.js", re: /__NEXT_DATA__|\/_next\//i },
];

/**
 * ADR-0121 vague A — analyse tech/SEO déterministe (regex sur l'HTML déjà
 * fetché). Pur : robots/sitemap sont renseignés par l'appelant (fetchs
 * séparés) — null = non vérifié.
 */
export function analyzeSiteTech(html: string, siteUrl: string): SiteTech {
  const cms = CMS_SIGNATURES.find(({ re }) => re.test(html))?.cms ?? null;
  return {
    cms,
    https: siteUrl.startsWith("https://"),
    hasMetaDescription: /<meta[^>]+(?:name|property)=["']description["']/i.test(html) || /<meta[^>]+(?:name|property)=["']og:description["']/i.test(html),
    hasOgTags: /<meta[^>]+property=["']og:/i.test(html),
    hasRobotsTxt: null,
    hasSitemap: null,
  };
}

export function extractSitemapUrls(xml: string): string[] {
  const urls: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    urls.push(m[1]!);
    if (urls.length >= 200) break;
  }
  return urls;
}

export function pickArticleCandidates(urls: string[], siteHost: string): string[] {
  return urls
    .filter((u) => {
      try {
        const parsed = new URL(u);
        return parsed.host.replace(/^www\./, "") === siteHost && ARTICLE_PATH_HINTS.test(parsed.pathname) && parsed.pathname.length > 8;
      } catch {
        return false;
      }
    })
    .slice(0, MAX_ARTICLES);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

// ── Garde SSRF + fetch borné ───────────────────────────────────────────

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    // IPv6 : loopback, link-local, unique-local, mapped IPv4 privé
    const low = ip.toLowerCase();
    return low === "::1" || low.startsWith("fe80:") || low.startsWith("fc") || low.startsWith("fd") || low.startsWith("::ffff:127.") || low.startsWith("::ffff:10.") || low.startsWith("::ffff:192.168.");
  }
  const parts = ip.split(".").map(Number);
  const [a, b] = [parts[0] ?? -1, parts[1] ?? -1];
  return (
    a === 127 || a === 10 || a === 0 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 169 && b === 254) ||
    a >= 224
  );
}

export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Protocole refusé: ${url.protocol}`);
  }
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error(`Hôte interne refusé: ${host}`);
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error(`IP privée refusée: ${host}`);
    return url;
  }
  const resolved = await dnsLookup(host, { all: true }).catch(() => []);
  if (resolved.length === 0) throw new Error(`DNS introuvable: ${host}`);
  for (const { address } of resolved) {
    if (isPrivateIp(address)) throw new Error(`Hôte résout vers une IP privée: ${host}`);
  }
  return url;
}

async function fetchPublic(rawUrl: string): Promise<{ ok: boolean; status: number; body: string }> {
  const url = await assertPublicUrl(rawUrl);
  // 3 tentatives sur échec RÉSEAU pur (connect ETIMEDOUT quasi instantané —
  // résolveurs round-robin servant parfois une IP injoignable, mesuré test BK
  // Abidjan 2026-07-20). Une réponse HTTP (même 4xx/5xx) est déterministe →
  // rendue telle quelle, jamais re-tentée.
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url.toString(), {
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,application/xml" },
      });
      const reader = res.body?.getReader();
      let received = 0;
      const chunks: Uint8Array[] = [];
      if (reader) {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            received += value.byteLength;
            chunks.push(value);
            if (received >= MAX_BYTES) {
              controller.abort();
              break;
            }
          }
        }
      }
      const body = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf8");
      return { ok: res.ok, status: res.status, body };
    } catch (err) {
      lastErr = err;
      clearTimeout(timer);
      if (attempt === 3) break;
      await new Promise((r) => setTimeout(r, 200));
      continue;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// ── Auto-découverte du site officiel (déterministe, zéro clé) ────────────
// Précondition de l'évidence révélée (ADR-0149 revealed-gates) : sans site
// déclaré NI Brave, une marque nationale n'a ni domaine daté ni tech site →
// le Scoreur la cape LATENT par artefact. On devine des domaines candidats
// depuis le nom + TLD pays et on les probe, avec garde anti-faux-positif
// STRICTE (le candidat doit mentionner la marque). Jamais de fabrication : rien
// trouvé → null honnête.

/** Slug de marque compact pour un nom de domaine (`Chococam SA` → `chococam`). */
export function brandDomainSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\b(sa|sarl|inc|ltd|llc|group|groupe|company|cie)\b/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

const COUNTRY_TLD: Record<string, string> = {
  CM: "cm", CI: "ci", SN: "sn", FR: "fr", MA: "ma", NG: "ng", GH: "gh",
  TN: "tn", CD: "cd", BJ: "bj", TG: "tg", GA: "ga", BF: "bf", ML: "ml",
};

/**
 * Domaines candidats (déterministe) : TLD du pays déclaré D'ABORD (le marché
 * du client — pour une franchise, `burgerking.ci` représente mieux le client
 * d'Abidjan que le `.com` global ; test BK 2026-07-20, ADR-0162), puis `.com`
 * + génériques. Max 5. Tous sont probés en parallèle — l'ordre n'est que la
 * préférence de sélection.
 */
export function candidateDomains(name: string, countryCode?: string | null): string[] {
  const slug = brandDomainSlug(name);
  if (slug.length < 2) return [];
  const tlds: string[] = [];
  const cc = countryCode?.trim().toUpperCase();
  if (cc && COUNTRY_TLD[cc]) tlds.push(COUNTRY_TLD[cc]);
  tlds.push("com");
  for (const t of ["net", "africa", "co"]) tlds.push(t);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tld of tlds) {
    const host = `${slug}.${tld}`;
    if (seen.has(host)) continue;
    seen.add(host);
    out.push(`https://${host}`);
  }
  return out.slice(0, 5);
}

/**
 * Probe les domaines candidats en parallèle ; retourne le 1er atteignable dont
 * le contenu MENTIONNE la marque (garde anti-faux-positif — un domaine parké ou
 * homonyme est rejeté). Préférence à l'ordre des candidats (`.com` d'abord).
 * Best-effort, borné en temps, jamais de throw.
 *
 * Garde (ADR-0162) : mention en FRONTIÈRE DE MOT via l'entity-gate Seshat —
 * l'ancienne garde en sous-chaîne validait `top.com` pour la marque « Top »
 * dès que la page contenait « top » n'importe où (« desktop », « top of
 * page »). `opts.validate` permet à l'appelant d'imposer le verdict complet
 * du gate (discriminants exigés pour un nom ambigu).
 */
export async function discoverOfficialSite(
  name: string,
  countryCode?: string | null,
  opts: { timeoutMs?: number; validate?: (pageText: string) => boolean } = {},
): Promise<string | null> {
  const candidates = candidateDomains(name, countryCode);
  if (candidates.length === 0) return null;
  const perProbe = opts.timeoutMs ?? 4_000;
  const validate = opts.validate ?? ((pageText: string) => mentionsEntity(pageText, name));

  const results = await Promise.all(
    candidates.map(async (url) => {
      try {
        const raced = await Promise.race([
          fetchPublic(url),
          new Promise<{ ok: false; status: 0; body: "" }>((r) =>
            setTimeout(() => r({ ok: false, status: 0, body: "" }), perProbe),
          ),
        ]);
        if (!raced.ok) return null;
        const meta = parseHtmlMeta(raced.body);
        const pageText = `${meta.title ?? ""} ${meta.description ?? ""} ${raced.body.slice(0, 4_000)}`;
        return validate(pageText) ? url : null;
      } catch {
        return null;
      }
    }),
  );
  for (let i = 0; i < candidates.length; i++) {
    const r = results[i];
    if (r) return r;
  }
  return null;
}

// ── Collecteur ─────────────────────────────────────────────────────────

export interface CollectFootprintInput {
  websiteUrl?: string | null;
  /** Liens sociaux déclarés à l'intake (un par ligne ou tableau). */
  declaredSocialUrls?: readonly string[] | null;
  companyName: string;
}

export async function collectWebFootprint(input: CollectFootprintInput): Promise<WebFootprint> {
  const errors: string[] = [];
  let fetches = 0;
  const budgetedFetch = async (url: string) => {
    if (fetches >= MAX_FETCHES) throw new Error("Budget de fetch épuisé");
    fetches += 1;
    return fetchPublic(url);
  };

  const footprint: WebFootprint = {
    site: null,
    socials: [],
    articles: [],
    channels: [],
    collectedAt: new Date().toISOString(),
    errors,
  };

  const socialsByKey = new Map<string, SocialProfile>();
  const addSocial = (p: SocialProfile) => {
    const key = `${p.platform}:${(p.handle ?? p.url).toLowerCase()}`;
    if (!socialsByKey.has(key)) socialsByKey.set(key, p);
  };

  // ── 0. Sociaux DÉCLARÉS (prioritaires — la parole du founder) ──
  for (const raw of input.declaredSocialUrls ?? []) {
    const detected = detectSocialLinks(raw);
    if (detected[0]) addSocial(detected[0]);
    else if (raw.trim()) errors.push(`Lien social non reconnu: ${raw.trim().slice(0, 80)}`);
  }

  // ── 1. Site déclaré ──
  const siteUrl = input.websiteUrl?.trim();
  let siteHost: string | null = null;
  if (siteUrl) {
    const normalized = /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`;
    try {
      const res = await budgetedFetch(normalized);
      const meta = parseHtmlMeta(res.body);
      siteHost = new URL(normalized).hostname.replace(/^www\./, "");
      const tech = analyzeSiteTech(res.body, normalized);
      // robots.txt : 1 fetch bon marché (best-effort, null = non vérifié)
      try {
        const robots = await budgetedFetch(new URL("/robots.txt", normalized).toString());
        tech.hasRobotsTxt = robots.ok;
      } catch {
        /* non vérifié */
      }
      footprint.site = { url: normalized, reachable: res.ok, ...meta, tech };

      // 1b. Sociaux découverts SUR le site (footer/header)
      for (const p of detectSocialLinks(res.body)) addSocial(p);

      // 1c. Articles : sitemap d'abord, heuristique de liens internes sinon
      const links = extractLinks(res.body, normalized);
      let articleUrls: Array<{ url: string; source: FootprintArticle["source"] }> = [];
      try {
        const sm = await budgetedFetch(new URL("/sitemap.xml", normalized).toString());
        tech.hasSitemap = sm.ok && sm.body.includes("<loc>");
        if (sm.ok && sm.body.includes("<loc>")) {
          articleUrls = pickArticleCandidates(extractSitemapUrls(sm.body), siteHost).map((u) => ({ url: u, source: "SITEMAP" as const }));
        }
      } catch (err) {
        errors.push(`sitemap: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (articleUrls.length === 0) {
        articleUrls = pickArticleCandidates(links, siteHost).map((u) => ({ url: u, source: "SITE_LINK" as const }));
      }
      // Titres des articles (3 fetches max — le reste garde l'URL seule)
      for (const candidate of articleUrls.slice(0, MAX_ARTICLES)) {
        let title: string | null = null;
        if (fetches < MAX_FETCHES - 1 && footprint.articles.length < 3) {
          try {
            const page = await budgetedFetch(candidate.url);
            title = parseHtmlMeta(page.body).title;
          } catch {
            /* titre best-effort */
          }
        }
        footprint.articles.push({ url: candidate.url, title, source: candidate.source });
      }
    } catch (err) {
      footprint.site = { url: normalized, reachable: false, title: null, description: null, ogImage: null, language: null };
      errors.push(`site: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── 2. Enrichir les profils sociaux (OG public, followersHint) ──
  for (const profile of socialsByKey.values()) {
    if (fetches >= MAX_FETCHES) break;
    if (profile.platform === "WHATSAPP") continue; // pas de page OG utile
    try {
      const page = await budgetedFetch(profile.url);
      if (page.ok) {
        const meta = parseHtmlMeta(page.body);
        profile.title = meta.title;
        profile.followersHint = parseFollowersHint(meta.description);
      }
    } catch {
      /* les plateformes bloquent souvent les bots — le lien reste l'empreinte */
    }
  }

  footprint.socials = [...socialsByKey.values()];

  // ── 3. Canaux pour le pilier E ──
  if (footprint.site?.reachable) {
    footprint.channels.push({ canal: "Site web", url: footprint.site.url, source: "EMPREINTE_WEB" });
  }
  for (const p of footprint.socials) {
    footprint.channels.push({ canal: platformLabel(p.platform), url: p.url, source: "EMPREINTE_WEB" });
  }

  return footprint;
}

function platformLabel(p: SocialProfile["platform"]): string {
  const labels: Record<SocialProfile["platform"], string> = {
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    TIKTOK: "TikTok",
    LINKEDIN: "LinkedIn",
    TWITTER: "X (Twitter)",
    YOUTUBE: "YouTube",
    WHATSAPP: "WhatsApp",
  };
  return labels[p];
}

// ── Writeback pilier E (merge pur, jamais d'écrasement) ────────────────

/**
 * Fusionne l'empreinte dans le contenu du pilier E : touchpoints détectés
 * APPEND-dédupliqués par canal (le déclaré prime), bloc `webPresence`
 * factuel (site/sociaux/articles). Pur — testé sans IO.
 */
export function mergeFootprintIntoPillarE(
  eContent: Record<string, unknown>,
  footprint: WebFootprint,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...eContent };

  const existing = Array.isArray(out.touchpoints) ? [...(out.touchpoints as unknown[])] : [];
  const existingCanals = new Set(
    existing
      .map((t) => (t && typeof t === "object" ? String((t as Record<string, unknown>).canal ?? (t as Record<string, unknown>).nom ?? "") : String(t)))
      .map((c) => c.toLowerCase().trim())
      .filter(Boolean),
  );
  for (const ch of footprint.channels) {
    if (!existingCanals.has(ch.canal.toLowerCase())) {
      existing.push({ canal: ch.canal, type: "Présence détectée", url: ch.url, stadeAarrr: "Acquisition", source: "EMPREINTE_WEB" });
      existingCanals.add(ch.canal.toLowerCase());
    }
  }
  if (existing.length > 0) out.touchpoints = existing;

  out.webPresence = {
    site: footprint.site,
    socials: footprint.socials.map((s) => ({ platform: s.platform, url: s.url, handle: s.handle, followersHint: s.followersHint ?? null })),
    articles: footprint.articles,
    collectedAt: footprint.collectedAt,
  };

  return out;
}

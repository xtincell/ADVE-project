/**
 * Lecture STRUCTURÉE du site déjà téléchargé — ce que la marque déclare
 * elle-même, dans un HTML que le collecteur avait en main et jetait.
 *
 * ── Le constat (2026-07-31) ──
 *
 * Signalement opérateur : « les masterclass, formations et newsletter ne sont
 * relevées par aucun collecteur — c'est un problème, le collecteur doit être
 * parfait. »
 *
 * `parseHtmlMeta` ne retenait que `title`, `description`, `og:image`. Mesuré
 * sur `irawotalents.com` — 326 Ko déjà téléchargés à chaque scan :
 *
 *   sameAs déclarés : facebook · x · instagram · linkedin · youtube  (5)
 *     …alors que la découverte par recherche n'en trouvait que 4 (pas YouTube)
 *   flux RSS déclaré : /feed/ → 6 entrées datées, dont
 *     « Irawo reçoit le prestigieux prix Cartier Women's Initiative Award »
 *     « Irawo & LemFi s'associent pour propulser les talents »
 *   dernière parution : 13/07/2026 — la marque est vivante, c'est mesurable
 *
 * ── Le principe ──
 *
 * On ne lit que du DÉCLARÉ STRUCTURÉ : JSON-LD (schema.org) et flux normalisé.
 * Aucune détection par mots-clés — trouver « masterclass » dans un menu de
 * navigation n'établit pas qu'une masterclass existe, et l'écrire comme un
 * fait serait exactement ce qu'interdit l'ADR-0046.
 *
 * ── L'honnêteté sur la couverture ──
 *
 * Le gisement est INÉGAL, mesuré le même jour : `motion19.com`,
 * `chococam.com` et `orange.cm` n'exposent AUCUN JSON-LD. L'absence de
 * données structurées n'est donc pas une absence d'activité — le rapport doit
 * dire « ce site n'expose pas de données structurées », jamais « cette marque
 * ne publie rien ». `null` porte cette distinction dans tout ce module.
 *
 * Pur — zéro IO, zéro LLM. Le fetch du flux reste à l'appelant.
 */

import { decodeEntities } from "@/lib/html-entities";

/** Réseau officiel DÉCLARÉ par le site de la marque (schema.org `sameAs`). */
export interface DeclaredProfile {
  url: string;
  /** Plateforme reconnue depuis l'hôte, `null` si hors nomenclature. */
  platform: string | null;
}

export interface StructuredSiteData {
  /**
   * Comptes que la marque revendique sur son propre site. C'est la preuve
   * d'appartenance la plus forte disponible : plus forte qu'une corroboration
   * par recherche, et elle TRANCHE l'homonymie (le piège « Irawo Studio »).
   */
  declaredProfiles: DeclaredProfile[];
  /** URL du flux RSS/Atom déclaré en `<link rel="alternate">`. */
  feedUrl: string | null;
  /** Un formulaire d'inscription ou un fournisseur d'emailing est présent. */
  hasNewsletter: boolean;
  /** Fournisseur identifié quand il l'est (Mailchimp, Brevo…), sinon `null`. */
  newsletterProvider: string | null;
  /** Types schema.org rencontrés — trace de ce que le site publie. */
  schemaTypes: string[];
  /** Événements déclarés en JSON-LD (`@type: Event`). */
  events: Array<{ name: string; startDate: string | null; location: string | null }>;
  /** Formations déclarées en JSON-LD (`@type: Course`). */
  courses: Array<{ name: string; provider: string | null }>;
  /**
   * `false` = le site n'expose aucune donnée structurée. À dire tel quel : ce
   * n'est PAS un constat d'inactivité, seulement l'absence d'un canal de
   * lecture.
   */
  hasStructuredData: boolean;
}

/** Entrée d'un flux, telle que publiée — aucune interprétation. */
export interface FeedEntry {
  title: string;
  link: string | null;
  publishedAt: string | null;
}

export interface FeedActivity {
  entries: FeedEntry[];
  /** Date ISO de la parution la plus récente. */
  lastPublishedAt: string | null;
  /**
   * Jours médians entre deux parutions consécutives — `null` sous 2 entrées
   * datées (une cadence ne se déduit pas d'un point unique).
   */
  medianDaysBetweenPosts: number | null;
}

const PLATFORM_BY_HOST: Array<[RegExp, string]> = [
  [/(^|\.)instagram\.com$/i, "INSTAGRAM"],
  [/(^|\.)facebook\.com$/i, "FACEBOOK"],
  [/(^|\.)tiktok\.com$/i, "TIKTOK"],
  [/(^|\.)linkedin\.com$/i, "LINKEDIN"],
  [/(^|\.)(twitter|x)\.com$/i, "TWITTER"],
  [/(^|\.)youtube\.com$/i, "YOUTUBE"],
  [/(^|\.)(wa\.me|whatsapp\.com)$/i, "WHATSAPP"],
];

/** Fournisseurs d'emailing reconnaissables dans le HTML. */
const NEWSLETTER_PROVIDERS: Array<[RegExp, string]> = [
  [/mailchimp|list-manage\.com/i, "Mailchimp"],
  [/substack\.com/i, "Substack"],
  [/(brevo|sendinblue)\.com/i, "Brevo"],
  [/mailerlite\.com/i, "MailerLite"],
  [/klaviyo\.com/i, "Klaviyo"],
  [/convertkit\.com|ck\.page/i, "ConvertKit"],
  [/hubspot|hsforms\.(com|net)/i, "HubSpot"],
];

function platformOf(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    return PLATFORM_BY_HOST.find(([re]) => re.test(host))?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Parcourt un JSON-LD (arbitrairement imbriqué) sans jamais lever. */
function walkJsonLd(node: unknown, visit: (obj: Record<string, unknown>) => void, depth = 0): void {
  if (depth > 8 || node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) walkJsonLd(n, visit, depth + 1);
    return;
  }
  const obj = node as Record<string, unknown>;
  visit(obj);
  for (const v of Object.values(obj)) walkJsonLd(v, visit, depth + 1);
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/**
 * Extrait tout ce que le site DÉCLARE de façon structurée.
 *
 * Ne lève jamais : un JSON-LD invalide est fréquent en production et ne doit
 * pas faire tomber une collecte. Il est simplement ignoré.
 */
export function extractStructuredSiteData(html: string): StructuredSiteData {
  const schemaTypes = new Set<string>();
  const profileUrls = new Set<string>();
  const events: StructuredSiteData["events"] = [];
  const courses: StructuredSiteData["courses"] = [];

  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1]!.trim());
    } catch {
      continue; // JSON-LD cassé : fréquent, jamais bloquant
    }
    walkJsonLd(parsed, (obj) => {
      const rawType = obj["@type"];
      const types = (Array.isArray(rawType) ? rawType : [rawType]).filter((t): t is string => typeof t === "string");
      types.forEach((t) => schemaTypes.add(t));

      if (Array.isArray(obj.sameAs)) {
        for (const s of obj.sameAs) {
          const u = asString(s);
          if (u && /^https?:\/\//i.test(u)) profileUrls.add(u);
        }
      }
      if (types.includes("Event")) {
        const name = asString(obj.name);
        if (name) {
          const loc = obj.location;
          events.push({
            name,
            startDate: asString(obj.startDate),
            location: asString(loc) ?? asString((loc as Record<string, unknown> | null)?.name),
          });
        }
      }
      if (types.includes("Course")) {
        const name = asString(obj.name);
        if (name) {
          const p = obj.provider;
          courses.push({ name, provider: asString(p) ?? asString((p as Record<string, unknown> | null)?.name) });
        }
      }
    });
  }

  const feedUrl =
    html.match(
      /<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]*href=["']([^"']+)["']/i,
    )?.[1] ??
    html.match(
      /<link[^>]+href=["']([^"']+)["'][^>]*type=["']application\/(?:rss|atom)\+xml["']/i,
    )?.[1] ??
    null;

  const provider = NEWSLETTER_PROVIDERS.find(([re]) => re.test(html))?.[1] ?? null;
  // Un `input[type=email]` seul suffit : c'est la forme minimale d'une
  // inscription. On ne cherche PAS le mot « newsletter » — un lien de menu
  // n'établit pas qu'une inscription existe.
  const hasEmailInput = /<input[^>]+type=["']email["']/i.test(html);

  return {
    declaredProfiles: [...profileUrls].map((url) => ({ url, platform: platformOf(url) })),
    feedUrl,
    hasNewsletter: hasEmailInput || provider !== null,
    newsletterProvider: provider,
    schemaTypes: [...schemaTypes],
    events,
    courses,
    hasStructuredData: schemaTypes.size > 0,
  };
}

function toIso(raw: string | null): string | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/**
 * Lit un flux RSS ou Atom déjà téléchargé.
 *
 * La CADENCE est la seule chose qu'on dérive, et elle l'est arithmétiquement :
 * la médiane des écarts entre parutions. Sous deux entrées datées elle vaut
 * `null` — une régularité ne se déduit pas d'un point unique.
 */
export function parseFeed(xml: string, limit = 10): FeedActivity {
  const chunks = [
    ...[...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0]),
    ...[...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0]),
  ];

  const text = (chunk: string, tag: string): string | null => {
    const m = chunk.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i"));
    return m?.[1]?.replace(/<[^>]+>/g, "").trim() || null;
  };

  const entries: FeedEntry[] = [];
  for (const c of chunks) {
    const title = text(c, "title");
    if (!title) continue;
    entries.push({
      title: decodeEntities(title).slice(0, 300),
      link: text(c, "link") ?? c.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ?? null,
      publishedAt: toIso(text(c, "pubDate") ?? text(c, "published") ?? text(c, "updated")),
    });
  }

  const dated = entries
    .map((e) => e.publishedAt)
    .filter((d): d is string => d !== null)
    .map((d) => Date.parse(d))
    .sort((a, b) => b - a);

  let medianDaysBetweenPosts: number | null = null;
  if (dated.length >= 2) {
    const gaps = dated.slice(0, -1).map((d, i) => (d - dated[i + 1]!) / 86_400_000).sort((a, b) => a - b);
    const mid = Math.floor(gaps.length / 2);
    const median = gaps.length % 2 === 0 ? (gaps[mid - 1]! + gaps[mid]!) / 2 : gaps[mid]!;
    medianDaysBetweenPosts = Math.round(median * 10) / 10;
  }

  return {
    entries: entries.slice(0, limit),
    lastPublishedAt: dated.length > 0 ? new Date(dated[0]!).toISOString() : null,
    medianDaysBetweenPosts,
  };
}

/**
 * Thot — resolve an I-pillar action descriptor → ActionCostTemplate.actionKey
 * (ADR-0094, bridges the I action catalogue to the ADR-0093 cost catalog).
 *
 * 100% deterministic, zero-LLM, pure (no DB, no @prisma/client import) so it is
 * testable in isolation and usable inside the BrandAction materializer. Keyed off
 * channel/touchpoint/format/title keywords. Returns null when nothing matches —
 * the action then simply has no auto-cost (honest, no fabricated estimate).
 *
 * The target keys MUST exist in `ACTION_COST_CATALOG` (catalog.ts). A parity test
 * (`resolve-template.test.ts`) locks every returned key against the catalog.
 */

/** Catalog keys this resolver may emit — kept in sync with catalog.ts (asserted by test). */
export type ActionTemplateKey =
  | "PHOTO_SESSION_HALF_DAY"
  | "VIDEO_SHOOT_1DAY"
  | "SOCIAL_CONTENT_BATCH"
  | "RADIO_SPOT_30S"
  | "TV_SPOT_30S"
  | "EVENT_ACTIVATION_DAY"
  | "OOH_CAMPAIGN_PANEL"
  | "INFLUENCER_POST"
  | "PRINT_KV"
  | "PR_PRESS_EVENT"
  | "PACKAGING_DESIGN"
  | "LANDING_PAGE";

export interface ActionDescriptor {
  title?: string | null;
  format?: string | null;
  channel?: string | null;
  touchpoint?: string | null;
  objectif?: string | null;
}

/**
 * Ordered rules: first matching wins. Each rule = a set of keyword fragments
 * (lowercased, accent-insensitive) tested against the concatenated descriptor.
 * Order matters — more specific archetypes come before generic social/digital.
 */
const RULES: Array<{ key: ActionTemplateKey; any: string[] }> = [
  { key: "TV_SPOT_30S", any: ["spot tv", "tvc", "film publicitaire", " tv "] },
  { key: "RADIO_SPOT_30S", any: ["radio", "spot audio", "jingle", "podcast"] },
  { key: "OOH_CAMPAIGN_PANEL", any: ["ooh", "affichage", "panneau", "billboard", "abribus"] },
  { key: "INFLUENCER_POST", any: ["influence", "influenceu", "ambassad", "ugc", "micro-influence", "creatrice", "createur de contenu"] },
  { key: "PR_PRESS_EVENT", any: ["presse", "press", "relations publiques", "rp ", "conference", "media kit", "kit media"] },
  { key: "PACKAGING_DESIGN", any: ["packaging", "emballage", "sticker", "cartes collectibles", "carte collectible", "carte spawt"] },
  { key: "EVENT_ACTIVATION_DAY", any: ["event", "evenement", "événement", "activation", "pop-up", "popup", "food tour", "stand", "tour", "festival", "atelier", "crew night"] },
  { key: "VIDEO_SHOOT_1DAY", any: ["tournage", "captation", "video shoot", "film ", "clip"] },
  { key: "PRINT_KV", any: ["key visual", " kv", "print", "affiche", "flyer", "infographie"] },
  { key: "LANDING_PAGE", any: ["landing", "site web", "site vitrine", "page web", "mini-jeu", "mini jeu", "onboarding", "app ", "application", "web one-page", "webflow"] },
  // Generic social/digital catch-alls come last.
  { key: "SOCIAL_CONTENT_BATCH", any: ["tiktok", "instagram", "reel", "reels", "story", "stories", "post", "social", "content", "contenu", "newsletter", "email", "whatsapp", "chatbot", "carousel"] },
  { key: "VIDEO_SHOOT_1DAY", any: ["video", "vidéo"] },
];

const ACCENTS: Record<string, string> = { à: "a", â: "a", ä: "a", é: "e", è: "e", ê: "e", ë: "e", î: "i", ï: "i", ô: "o", ö: "o", û: "u", ü: "u", ç: "c" };

function normalize(s: string): string {
  return s.toLowerCase().replace(/[àâäéèêëîïôöûüç]/g, (c) => ACCENTS[c] ?? c);
}

/** Resolve the cost template archetype for an action, or null if undeterminable. */
export function resolveActionTemplateKey(d: ActionDescriptor): ActionTemplateKey | null {
  const hay = normalize(
    [d.title, d.format, d.channel, d.touchpoint, d.objectif].filter(Boolean).join(" · "),
  );
  if (!hay.trim()) return null;
  for (const rule of RULES) {
    if (rule.any.some((kw) => hay.includes(normalize(kw)))) return rule.key;
  }
  return null;
}

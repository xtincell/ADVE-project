/**
 * Quick Intake — types partagés de l'empreinte publique (ADR-0121).
 *
 * Module FEUILLE extrait pour rompre le cycle d'import statique
 * `footprint-score.ts` ↔ `public-enrichment.ts` : les deux se référençaient
 * mutuellement (footprint-score importe `EnrichedFootprint` ; public-enrichment
 * référence `FootprintScore` via le champ `EnrichedFootprint.score`). Types
 * purs uniquement — aucune logique, aucun import runtime, aucun back-edge.
 */

import type { WebFootprint } from "./web-footprint";

export interface FollowerCountEntry {
  platform: string;
  handle: string;
  followerCount: number;
  source: "APIFY" | "CONNECTOR";
  capturedAt: string;
}

export interface PressMention {
  title: string;
  url: string;
  sourceName: string | null;
  publishedAt: string | null;
}

/**
 * Citation web (ADR-0164) — toute trace publique de la marque hors presse :
 * annuaire, avis, blog, page sociale, article. Une marque, même micro, laisse
 * TOUJOURS des traces — le rapport doit les montrer (retour opérateur
 * 2026-07-20). Gate d'entité appliqué (ADR-0162), jamais d'homonyme.
 */
export interface WebMention {
  title: string;
  url: string;
  /** Hôte lisible (ex : facebook.com, tripadvisor.fr). */
  host: string;
}

export interface WebMentionsBlock {
  status: "LIVE" | "EMPTY" | "DEFERRED_NO_KEY" | "ERROR";
  items: WebMention[];
}

/**
 * Profil public de la marque tel que publié sur un réseau CONNECTÉ (OAuth
 * ADR-0128, `SocialConnection.metadata.profile`) — donnée exacte de l'API,
 * pas une estimation scrapée. Alimente le pilier E (empreinte publique).
 */
export interface ConnectedProfileEntry {
  platform: string;
  accountName: string;
  bio: string | null;
  website: string | null;
  category: string | null;
  location: string | null;
  mediaCount: number | null;
  totalViews: number | null;
}

export interface FootprintDimension {
  key: "site" | "social" | "reviews" | "press" | "citations" | "email" | "domain" | "perf";
  label: string;
  weight: number;
  measured: boolean;
  /** 0-100 sur la dimension, null si non mesurée. */
  score: number | null;
  details: string;
}

export interface FootprintScore {
  total: number | null;
  outOf: 100;
  measuredWeight: number;
  dimensions: FootprintDimension[];
}

export interface EnrichedFootprint extends WebFootprint {
  followerCounts: FollowerCountEntry[];
  /** Profils publics exacts des réseaux connectés (source CONNECTOR). */
  connectedProfiles?: ConnectedProfileEntry[];
  press: PressMention[];
  /** Citations web toutes sources (ADR-0164) — optionnel : rétro-compat JSON persistés. */
  webMentions?: WebMentionsBlock;
  /**
   * Rapport du gate d'entité (ADR-0162) : ambiguïté du nom, discriminants
   * utilisés, mode de jugement (déterministe seul ou + réfutation LLM) et
   * comptes de candidats écartés par source. Optionnel — rétro-compat avec
   * les webFootprint JSON persistés avant le gate.
   */
  entityGate?: import("@/server/services/seshat/entity-gate").EntityGateReport;
  discovery: {
    attempted: boolean;
    queries: string[];
    status: "OK" | "DEFERRED_NO_KEY" | "ERROR" | "SKIPPED_DECLARED";
  };
  enrichment: {
    apify: "LIVE" | "DEFERRED" | "DEGRADED" | "SKIPPED";
    press: "LIVE" | "EMPTY" | "ERROR";
    totalMs: number;
    errors: string[];
  };
  // ── ADR-0121 vague A — empreinte ENTIÈRE (tous optionnels : rétro-compat
  // avec les webFootprint JSON déjà persistés). Chaque bloc porte son statut.
  maps?: import("./footprint-collectors").MapsPresence;
  youtube?: import("./footprint-collectors").YouTubeStats;
  domain?: import("./footprint-collectors").DomainInfo;
  emailInfra?: import("./footprint-collectors").EmailInfra;
  performance?: import("./footprint-collectors").SitePerformance;
  ads?: import("./footprint-collectors").AdsPresence;
  score?: FootprintScore;
  narrative?: { text: string; source: "LLM" | "TEMPLATE" };
}

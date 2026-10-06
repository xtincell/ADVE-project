/** ADR-0195 — acquisition capabilities, distinct from credentials or live observations. */
import { z } from "zod";
import { specimenInputSchema, metricValuesSchema } from "./creative-intelligence";
import { creativeSourceSchema } from "./creative-source-types";
export { creativeSourceSchema } from "./creative-source-types";

export const collectCreativeSourceSchema = z.object({
  strategyId: z.string().min(1).optional(),
  provider: creativeSourceSchema,
  account: z.string().trim().min(1).max(200),
  sector: specimenInputSchema.shape.sector,
  countryCode: specimenInputSchema.shape.countryCode,
  limit: z.number().int().min(1).max(50).default(20),
  since: z.coerce.date().optional(),
  until: z.coerce.date().optional(),
  // YouTube Data API has no reliable isShort flag. Do not infer it from duration.
  youtubeFormat: z.enum(["SHORT_VIDEO", "LONG_VIDEO", "VIDEO_UNCLASSIFIED"]).default("VIDEO_UNCLASSIFIED"),
});
export type CreativeSourceInput = z.infer<typeof collectCreativeSourceSchema>;
export const acquiredContentSchema = z.object({
  specimen: specimenInputSchema,
  measurement: metricValuesSchema.optional(),
});
export type AcquiredContent = z.infer<typeof acquiredContentSchema>;
export const creativeExportSchema = z.object({
  schemaVersion: z.literal("creative-source-export-v1"),
  strategyId: z.string().min(1).optional(),
  items: z.array(acquiredContentSchema).min(1).max(50),
}).superRefine((v, ctx) => {
  for (const [i, item] of v.items.entries()) {
    if (item.specimen.strategyId !== v.strategyId || item.specimen.visibility !== (v.strategyId ? "BRAND" : "PUBLIC")) ctx.addIssue({ code: "custom", path: ["items", i], message: "Toutes les observations doivent appartenir au périmètre déclaré." });
  }
});

/** Adapter availability is code state; it is never a declaration that a vendor is connected. */
export const CREATIVE_SOURCE_CAPABILITIES = [
  { id: "BLUESKY", name: "Bluesky", path: "DIRECT", access: "PUBLIC", provides: "Publications, likes, réponses et republications. Aucune vue disponible.", docs: "https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/feed/getAuthorFeed.json" },
  { id: "YOUTUBE", name: "YouTube", path: "DIRECT", access: "API_KEY", provides: "Vidéos de chaîne, vues, likes et commentaires actuels ; pas de média vidéo ni historique rétroactif.", docs: "https://developers.google.com/youtube/v3/docs/videos" },
  { id: "FOREPLAY", name: "Foreplay", path: "DIRECT", access: "API_KEY", provides: "Publicités et médias de Discovery ; aucune preuve de ROAS ou de surperformance organique.", docs: "https://docs.foreplay.co/" },
  { id: "CONNECTED_SOCIAL", name: "Réseaux de la marque", path: "EXISTING_CONNECTION", access: "OAUTH", provides: "Métadonnées Facebook/Instagram déjà synchronisées ; les nouveaux Insights mesurés rejoignent le corpus via le raccord existant. Les compteurs historiques par défaut ne sont pas importés.", docs: "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/insights/" },
  { id: "META_AD_LIBRARY", name: "Meta Ad Library", path: "DIRECT", access: "APP_APPROVAL", provides: "Créations et transparence publicitaire selon les périmètres autorisés ; couverture Afrique à vérifier.", docs: "https://developers.facebook.com/docs/graph-api/reference/ads_archive/" },
  { id: "TIKTOK_COMMERCIAL", name: "TikTok Commercial Content", path: "DIRECT", access: "APP_APPROVAL", provides: "Contenus commerciaux dans les pays pris en charge ; pas une collecte organique mondiale.", docs: "https://developers.tiktok.com/doc/commercial-content-api-query-commercial-content/" },
  { id: "TIKTOK_RESEARCH", name: "TikTok Research", path: "DIRECT", access: "ELIGIBILITY", provides: "Accès soumis à éligibilité et projet approuvé. Une application commerciale ne présume pas cet accès.", docs: "https://developers.tiktok.com/doc/research-api-faq/" },
  { id: "INSTAGRAM_DISCOVERY", name: "Instagram Business Discovery", path: "DIRECT", access: "OAUTH", provides: "Comptes professionnels accessibles via les permissions Meta requises ; pas tous les comptes ni leurs Insights privés.", docs: "https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery/" },
  { id: "BUZZSUMO", name: "BuzzSumo", path: "QUALIFY_OR_EXPORT", access: "SUBSCRIPTION", provides: "Contenus et distribution. Vérifier le contrat et les unités avant de transformer les données en mesures.", docs: "https://help.buzzsumo.com/en/articles/1633314-does-buzzsumo-have-an-api" },
  { id: "EXPLODING_TOPICS", name: "Exploding Topics", path: "SIGNALS_ONLY", access: "SUBSCRIPTION", provides: "Trajectoires de sujets ; un volume de recherches n'est pas la performance d'un contenu.", docs: "https://api.explodingtopics.com/" },
  { id: "BRANDWATCH", name: "Brandwatch", path: "DIRECT", access: "SUBSCRIPTION", provides: "Conversations et contexte. Contrat, couverture et droits à qualifier.", docs: "https://developers.brandwatch.com/" },
  { id: "APIFY", name: "Apify", path: "DIRECT", access: "ACTOR_CONTRACT", provides: "Lecture d'un dataset déjà normalisé au contrat d'import créatif. Aucun acteur lancé, aucune métrique déduite d'un format inconnu.", docs: "https://docs.apify.com/api/v2" },
  { id: "RSS", name: "Presse et flux RSS", path: "DIRECT", access: "PUBLIC", provides: "Radar Tarsis existant : articles et signaux, sans compteurs de performance inventés.", docs: "https://www.rssboard.org/rss-specification" },
  { id: "REDDIT", name: "Reddit", path: "DIRECT", access: "OAUTH_CONTRACT", provides: "Discussions et votes selon accès approuvé ; votes et vues restent distincts.", docs: "https://www.redditinc.com/policies/data-api-terms" },
  { id: "X", name: "X", path: "DIRECT", access: "API_PLAN", provides: "Publications et métriques autorisées selon le contrat ; comptes propres déjà raccordables via les connexions existantes.", docs: "https://docs.x.com/x-api/posts/lookup/introduction" },
  { id: "LINKEDIN", name: "LinkedIn", path: "DIRECT", access: "OAUTH_APPROVAL", provides: "Comptes et pages autorisés ; aucune lecture générale des concurrents présumée.", docs: "https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api" },
] as const;

/** Per-operator credentials only; platform versions and permissions are explicit. */
export const CREATIVE_SOURCE_CONNECTIONS = {
  YOUTUBE: { type: "youtube-data", fields: ["apiKey"], env: "YOUTUBE_API_KEY" },
  FOREPLAY: { type: "foreplay", fields: ["apiKey"], env: "FOREPLAY_API_KEY" },
  META_AD_LIBRARY: { type: "creative-meta-library", fields: ["apiKey", "apiVersion", "adType"], env: "" },
  INSTAGRAM_DISCOVERY: { type: "creative-instagram", fields: ["apiKey", "apiVersion", "actorId"], env: "" },
  TIKTOK_RESEARCH: { type: "creative-tiktok-research", fields: ["apiKey"], env: "" },
  TIKTOK_COMMERCIAL: { type: "creative-tiktok-commercial", fields: ["apiKey"], env: "" },
  REDDIT: { type: "creative-reddit", fields: ["apiKey", "userAgent"], env: "" },
  X: { type: "creative-x", fields: ["apiKey"], env: "" },
  LINKEDIN: { type: "creative-linkedin", fields: ["apiKey", "apiVersion"], env: "" },
  BRANDWATCH: { type: "creative-brandwatch", fields: ["apiKey", "projectId"], env: "" },
  APIFY: { type: "creative-apify-dataset", fields: ["apiKey"], env: "" },
} as const;
export type CreativeCredentials = { apiKey?: string; apiVersion?: string; actorId?: string; projectId?: string; adType?: string; userAgent?: string };

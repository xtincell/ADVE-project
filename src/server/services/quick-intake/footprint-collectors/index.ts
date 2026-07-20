/**
 * Empreinte digitale — collecteurs par source (ADR-0121 vague A).
 * Tous : time-boxés, best-effort (jamais de throw), statuts honnêtes,
 * données publiques uniquement, zéro fabrication.
 */

export { fetchDomainInfo, registrableDomain, parseRdapResponse, type DomainInfo } from "./domain-rdap";
export { checkEmailInfrastructure, detectMxProvider, hasSpfRecord, hasDmarcRecord, type EmailInfra } from "./email-dns";
export { fetchYouTubeChannelStats, parseYouTubeChannelResponse, type YouTubeStats } from "./youtube";
export {
  fetchGoogleBusinessPresence,
  startGoogleBusinessRun,
  collectGoogleBusinessRun,
  parseMapsPlaceItem,
  type MapsPresence,
  type MapsRunStart,
} from "./google-maps";
export { fetchSitePerformance, parsePsiResponse, type SitePerformance } from "./pagespeed";
export { fetchAdsPresence, parseAdsItems, type AdsPresence } from "./ads-library";

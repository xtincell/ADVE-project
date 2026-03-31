/**
 * Campaign Manager 360 — 100+ Action Types across ATL/BTL/TTL
 */

export type ActionCategory = "ATL" | "BTL" | "TTL";

export interface ActionType {
  slug: string;
  name: string;
  category: ActionCategory;
  drivers: string[];
  requiredFields: string[];
  kpiTemplates: string[];
}

export const ACTION_TYPES: ActionType[] = [
  // ==================== ATL (Above The Line) ====================
  { slug: "tv-spot-30s", name: "Spot TV 30s", category: "ATL", drivers: ["TV"], requiredFields: ["script", "storyboard", "duration"], kpiTemplates: ["grp", "reach", "frequency"] },
  { slug: "tv-spot-15s", name: "Spot TV 15s", category: "ATL", drivers: ["TV"], requiredFields: ["script", "duration"], kpiTemplates: ["grp", "reach"] },
  { slug: "tv-sponsorship", name: "Sponsoring TV", category: "ATL", drivers: ["TV"], requiredFields: ["program", "format"], kpiTemplates: ["reach", "association"] },
  { slug: "radio-spot-30s", name: "Spot Radio 30s", category: "ATL", drivers: ["RADIO"], requiredFields: ["script", "voiceover"], kpiTemplates: ["grp", "reach"] },
  { slug: "radio-spot-15s", name: "Spot Radio 15s", category: "ATL", drivers: ["RADIO"], requiredFields: ["script"], kpiTemplates: ["reach"] },
  { slug: "radio-sponsorship", name: "Sponsoring Radio", category: "ATL", drivers: ["RADIO"], requiredFields: ["program", "format"], kpiTemplates: ["reach"] },
  { slug: "ooh-billboard", name: "Affichage Billboard", category: "ATL", drivers: ["OOH"], requiredFields: ["dimensions", "location", "duration"], kpiTemplates: ["impressions", "coverage"] },
  { slug: "ooh-bus-shelter", name: "Abribus", category: "ATL", drivers: ["OOH"], requiredFields: ["dimensions", "location"], kpiTemplates: ["impressions"] },
  { slug: "ooh-digital-screen", name: "Ecran Digital OOH", category: "ATL", drivers: ["OOH"], requiredFields: ["dimensions", "rotation", "location"], kpiTemplates: ["impressions", "dwell_time"] },
  { slug: "print-press-ad", name: "Annonce Presse", category: "ATL", drivers: ["PRINT"], requiredFields: ["publication", "format", "placement"], kpiTemplates: ["readership", "recall"] },
  { slug: "print-magazine-ad", name: "Annonce Magazine", category: "ATL", drivers: ["PRINT"], requiredFields: ["publication", "format"], kpiTemplates: ["readership"] },
  { slug: "cinema-spot", name: "Spot Cinéma", category: "ATL", drivers: ["VIDEO"], requiredFields: ["duration", "theaters"], kpiTemplates: ["attendance", "recall"] },

  // ==================== BTL (Below The Line) ====================
  { slug: "social-post-organic", name: "Post Social Organique", category: "BTL", drivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"], requiredFields: ["visual", "copy", "hashtags"], kpiTemplates: ["engagement_rate", "reach", "impressions"] },
  { slug: "social-story", name: "Story Social", category: "BTL", drivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK"], requiredFields: ["visual", "duration"], kpiTemplates: ["views", "completion_rate"] },
  { slug: "social-reel", name: "Reel / Short Video", category: "BTL", drivers: ["INSTAGRAM", "TIKTOK"], requiredFields: ["video", "music", "copy"], kpiTemplates: ["views", "shares", "engagement_rate"] },
  { slug: "social-carousel", name: "Carousel", category: "BTL", drivers: ["INSTAGRAM", "LINKEDIN"], requiredFields: ["slides", "copy"], kpiTemplates: ["engagement_rate", "saves"] },
  { slug: "social-live", name: "Live Streaming", category: "BTL", drivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK"], requiredFields: ["topic", "duration", "host"], kpiTemplates: ["concurrent_viewers", "total_views"] },
  { slug: "email-campaign", name: "Campagne Email", category: "BTL", drivers: ["WEBSITE"], requiredFields: ["subject", "body", "segment"], kpiTemplates: ["open_rate", "ctr", "conversion_rate"] },
  { slug: "sms-blast", name: "SMS Blast", category: "BTL", drivers: ["WEBSITE"], requiredFields: ["message", "segment"], kpiTemplates: ["delivery_rate", "ctr"] },
  { slug: "landing-page", name: "Landing Page", category: "BTL", drivers: ["WEBSITE"], requiredFields: ["content", "cta", "form"], kpiTemplates: ["conversion_rate", "bounce_rate"] },
  { slug: "blog-article", name: "Article Blog", category: "BTL", drivers: ["WEBSITE"], requiredFields: ["title", "content", "seo_keywords"], kpiTemplates: ["pageviews", "time_on_page", "shares"] },
  { slug: "newsletter", name: "Newsletter", category: "BTL", drivers: ["WEBSITE"], requiredFields: ["content", "segment"], kpiTemplates: ["open_rate", "ctr"] },
  { slug: "packaging-design", name: "Design Packaging", category: "BTL", drivers: ["PACKAGING"], requiredFields: ["product", "dimensions", "materials"], kpiTemplates: ["shelf_appeal", "recognition"] },
  { slug: "packaging-limited-edition", name: "Packaging Edition Limitée", category: "BTL", drivers: ["PACKAGING"], requiredFields: ["product", "concept", "quantity"], kpiTemplates: ["sell_through", "social_mentions"] },
  { slug: "plv-counter-display", name: "PLV Comptoir", category: "BTL", drivers: ["PACKAGING"], requiredFields: ["dimensions", "material"], kpiTemplates: ["visibility", "uplift"] },
  { slug: "plv-floor-stand", name: "PLV Sol", category: "BTL", drivers: ["PACKAGING"], requiredFields: ["dimensions", "material"], kpiTemplates: ["visibility", "uplift"] },
  { slug: "event-launch", name: "Événement de Lancement", category: "BTL", drivers: ["EVENT"], requiredFields: ["venue", "date", "guest_list", "program"], kpiTemplates: ["attendance", "media_coverage", "social_mentions"] },
  { slug: "event-activation", name: "Activation Terrain", category: "BTL", drivers: ["EVENT"], requiredFields: ["location", "date", "team", "mechanic"], kpiTemplates: ["contacts", "sampling", "conversion"] },
  { slug: "event-popup", name: "Pop-up Store", category: "BTL", drivers: ["EVENT"], requiredFields: ["location", "duration", "concept"], kpiTemplates: ["footfall", "revenue", "social_mentions"] },
  { slug: "event-workshop", name: "Workshop / Masterclass", category: "BTL", drivers: ["EVENT"], requiredFields: ["topic", "host", "venue"], kpiTemplates: ["attendance", "satisfaction", "nps"] },
  { slug: "sampling", name: "Distribution Échantillons", category: "BTL", drivers: ["EVENT"], requiredFields: ["product", "quantity", "locations"], kpiTemplates: ["units_distributed", "conversion_rate"] },
  { slug: "pr-press-release", name: "Communiqué de Presse", category: "BTL", drivers: ["PR"], requiredFields: ["title", "body", "contact_list"], kpiTemplates: ["pickups", "reach", "sentiment"] },
  { slug: "pr-media-event", name: "Événement Presse", category: "BTL", drivers: ["PR"], requiredFields: ["venue", "guest_list", "kit"], kpiTemplates: ["attendance", "articles", "reach"] },
  { slug: "pr-influencer-seeding", name: "Seeding Influenceurs", category: "BTL", drivers: ["PR"], requiredFields: ["influencer_list", "product", "brief"], kpiTemplates: ["posts", "reach", "engagement"] },
  { slug: "pr-interview", name: "Interview / Portrait", category: "BTL", drivers: ["PR"], requiredFields: ["interviewee", "media", "angle"], kpiTemplates: ["reach", "sentiment"] },
  { slug: "partnership-collab", name: "Collaboration Marque", category: "BTL", drivers: ["EVENT"], requiredFields: ["partner", "concept", "deliverables"], kpiTemplates: ["reach", "engagement", "revenue"] },
  { slug: "loyalty-program", name: "Programme Fidélité", category: "BTL", drivers: ["WEBSITE"], requiredFields: ["mechanics", "rewards"], kpiTemplates: ["enrollment", "active_rate", "retention"] },
  { slug: "referral-program", name: "Programme Parrainage", category: "BTL", drivers: ["WEBSITE"], requiredFields: ["mechanics", "reward"], kpiTemplates: ["referrals", "conversion", "cac"] },
  { slug: "ugc-challenge", name: "Challenge UGC", category: "BTL", drivers: ["INSTAGRAM", "TIKTOK"], requiredFields: ["mechanic", "hashtag", "prize"], kpiTemplates: ["submissions", "views", "engagement"] },
  { slug: "contest-giveaway", name: "Jeu Concours", category: "BTL", drivers: ["INSTAGRAM", "FACEBOOK"], requiredFields: ["mechanic", "prize", "rules"], kpiTemplates: ["entries", "followers_gained", "engagement"] },

  // ==================== TTL (Through The Line) ====================
  { slug: "paid-social-awareness", name: "Social Ads - Notoriété", category: "TTL", drivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"], requiredFields: ["creative", "targeting", "budget"], kpiTemplates: ["reach", "impressions", "cpv", "cpm"] },
  { slug: "paid-social-engagement", name: "Social Ads - Engagement", category: "TTL", drivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK"], requiredFields: ["creative", "targeting", "budget"], kpiTemplates: ["engagement", "cpe", "shares"] },
  { slug: "paid-social-conversion", name: "Social Ads - Conversion", category: "TTL", drivers: ["INSTAGRAM", "FACEBOOK"], requiredFields: ["creative", "targeting", "budget", "pixel"], kpiTemplates: ["conversions", "cpa", "roas"] },
  { slug: "paid-social-retargeting", name: "Retargeting Social", category: "TTL", drivers: ["INSTAGRAM", "FACEBOOK"], requiredFields: ["audience", "creative", "budget"], kpiTemplates: ["conversions", "roas", "cpa"] },
  { slug: "google-search", name: "Google Search Ads", category: "TTL", drivers: ["WEBSITE"], requiredFields: ["keywords", "ad_copy", "budget"], kpiTemplates: ["clicks", "ctr", "cpc", "conversions"] },
  { slug: "google-display", name: "Google Display", category: "TTL", drivers: ["WEBSITE"], requiredFields: ["banners", "targeting", "budget"], kpiTemplates: ["impressions", "cpm", "clicks"] },
  { slug: "youtube-preroll", name: "YouTube Pre-roll", category: "TTL", drivers: ["VIDEO"], requiredFields: ["video", "targeting", "budget"], kpiTemplates: ["views", "cpv", "completion_rate"] },
  { slug: "youtube-discovery", name: "YouTube Discovery", category: "TTL", drivers: ["VIDEO"], requiredFields: ["thumbnail", "title", "budget"], kpiTemplates: ["clicks", "watch_time"] },
  { slug: "influencer-sponsored", name: "Contenu Sponsorisé Influenceur", category: "TTL", drivers: ["INSTAGRAM", "TIKTOK"], requiredFields: ["influencer", "brief", "budget"], kpiTemplates: ["reach", "engagement", "cpe"] },
  { slug: "influencer-takeover", name: "Takeover Influenceur", category: "TTL", drivers: ["INSTAGRAM", "TIKTOK"], requiredFields: ["influencer", "brief", "schedule"], kpiTemplates: ["views", "engagement", "followers_gained"] },
  { slug: "native-content", name: "Contenu Natif / Advertorial", category: "TTL", drivers: ["WEBSITE", "PRINT"], requiredFields: ["publisher", "content", "budget"], kpiTemplates: ["pageviews", "time_on_page", "ctr"] },
  { slug: "branded-content-video", name: "Branded Content Vidéo", category: "TTL", drivers: ["VIDEO"], requiredFields: ["concept", "production", "distribution"], kpiTemplates: ["views", "completion_rate", "shares"] },
  { slug: "podcast-sponsorship", name: "Sponsoring Podcast", category: "TTL", drivers: ["RADIO"], requiredFields: ["podcast", "format", "episodes"], kpiTemplates: ["downloads", "reach", "recall"] },
  { slug: "programmatic-display", name: "Programmatique Display", category: "TTL", drivers: ["WEBSITE"], requiredFields: ["creative", "audience", "budget"], kpiTemplates: ["impressions", "cpm", "viewability"] },
  { slug: "programmatic-video", name: "Programmatique Vidéo", category: "TTL", drivers: ["VIDEO"], requiredFields: ["video", "audience", "budget"], kpiTemplates: ["views", "cpv", "completion_rate"] },
  { slug: "integrated-campaign-360", name: "Campagne Intégrée 360°", category: "TTL", drivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "TV", "OOH", "EVENT"], requiredFields: ["concept", "channels", "timeline", "budget"], kpiTemplates: ["reach", "frequency", "engagement", "conversions", "roi"] },
];

export function getActionType(slug: string): ActionType | undefined {
  return ACTION_TYPES.find((a) => a.slug === slug);
}

export function getActionsByCategory(category: ActionCategory): ActionType[] {
  return ACTION_TYPES.filter((a) => a.category === category);
}

export function getActionsByDriver(driver: string): ActionType[] {
  return ACTION_TYPES.filter((a) => a.drivers.includes(driver));
}

export function searchActions(query: string): ActionType[] {
  const lower = query.toLowerCase();
  return ACTION_TYPES.filter(
    (a) => a.name.toLowerCase().includes(lower) || a.slug.includes(lower) || a.category.toLowerCase().includes(lower)
  );
}

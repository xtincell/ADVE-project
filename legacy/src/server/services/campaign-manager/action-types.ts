/**
 * Campaign Manager 360 — 100+ Action Types across ATL/BTL/TTL
 *
 * Classification rules:
 *   ATL  = mass media, paid, one-to-many (TV, Radio, Cinema, Press, OOH, DOOH, Transit, Aerial, Ambient)
 *   BTL  = direct / experiential / earned media (events, sampling, street, PR, organic social, packaging, UGC)
 *   TTL  = blended paid+owned digital, CRM, performance marketing, community
 */

export type ActionCategory = "ATL" | "BTL" | "TTL";

export interface ActionType {
  slug: string;
  name: string;
  category: ActionCategory;
  drivers: string[];
  requiredFields: string[];
  kpiTemplates: string[];
  defaultAarrStage?: string;
  defaultUniteCosting?: string; // CPM, CPC, CPL, CPA, FLAT
}

export const ACTION_TYPES: ActionType[] = [
  // ═══════════════════════════════════════════════════════════════════
  //  ATL — Above The Line  (10 drivers: TV, RADIO, CINEMA, PRESSE,
  //         AFFICHAGE, OOH, TRANSIT, DOOH, AMBIENT, AERIAL)
  // ═══════════════════════════════════════════════════════════════════

  // --- TV ---
  { slug: "tv-spot-30s", name: "Spot TV 30s", category: "ATL", drivers: ["TV"], requiredFields: ["script", "storyboard", "duration"], kpiTemplates: ["grp", "reach", "frequency"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "tv-spot-15s", name: "Spot TV 15s", category: "ATL", drivers: ["TV"], requiredFields: ["script", "duration"], kpiTemplates: ["grp", "reach"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "tv-sponsorship", name: "Sponsoring TV", category: "ATL", drivers: ["TV"], requiredFields: ["program", "format"], kpiTemplates: ["reach", "association"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "tv-infomercial", name: "Infomercial TV", category: "ATL", drivers: ["TV"], requiredFields: ["script", "duration", "cta"], kpiTemplates: ["grp", "reach", "calls"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPM" },

  // --- RADIO ---
  { slug: "radio-spot-30s", name: "Spot Radio 30s", category: "ATL", drivers: ["RADIO"], requiredFields: ["script", "voiceover"], kpiTemplates: ["grp", "reach"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "radio-spot-15s", name: "Spot Radio 15s", category: "ATL", drivers: ["RADIO"], requiredFields: ["script"], kpiTemplates: ["reach"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "radio-sponsorship", name: "Sponsoring Radio", category: "ATL", drivers: ["RADIO"], requiredFields: ["program", "format"], kpiTemplates: ["reach"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "radio-jingle", name: "Jingle Radio", category: "ATL", drivers: ["RADIO"], requiredFields: ["script", "music", "duration"], kpiTemplates: ["recall", "reach"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- CINEMA ---
  { slug: "cinema-spot", name: "Spot Cinéma", category: "ATL", drivers: ["CINEMA"], requiredFields: ["duration", "theaters"], kpiTemplates: ["attendance", "recall"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "cinema-preshow", name: "Pré-show Cinéma", category: "ATL", drivers: ["CINEMA"], requiredFields: ["duration", "theaters", "creative"], kpiTemplates: ["attendance", "recall", "dwell_time"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },

  // --- PRESSE ---
  { slug: "print-press-ad", name: "Annonce Presse", category: "ATL", drivers: ["PRESSE"], requiredFields: ["publication", "format", "placement"], kpiTemplates: ["readership", "recall"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "print-magazine-ad", name: "Annonce Magazine", category: "ATL", drivers: ["PRESSE"], requiredFields: ["publication", "format"], kpiTemplates: ["readership"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "print-insert", name: "Encart Presse", category: "ATL", drivers: ["PRESSE"], requiredFields: ["publication", "format", "quantity"], kpiTemplates: ["readership", "coupon_redemption"], defaultAarrStage: "Acquisition", defaultUniteCosting: "FLAT" },

  // --- AFFICHAGE / OOH ---
  { slug: "ooh-billboard", name: "Affichage Billboard", category: "ATL", drivers: ["AFFICHAGE", "OOH"], requiredFields: ["dimensions", "location", "duration"], kpiTemplates: ["impressions", "coverage"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "ooh-bus-shelter", name: "Abribus", category: "ATL", drivers: ["AFFICHAGE", "OOH"], requiredFields: ["dimensions", "location"], kpiTemplates: ["impressions"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "ooh-mega-billboard", name: "Méga-Affichage", category: "ATL", drivers: ["AFFICHAGE", "OOH"], requiredFields: ["dimensions", "location", "duration"], kpiTemplates: ["impressions", "coverage", "dwell_time"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- DOOH ---
  { slug: "dooh-digital-screen", name: "Écran Digital OOH", category: "ATL", drivers: ["DOOH", "OOH"], requiredFields: ["dimensions", "rotation", "location"], kpiTemplates: ["impressions", "dwell_time"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "dooh-mall-screen", name: "Écran Centre Commercial", category: "ATL", drivers: ["DOOH"], requiredFields: ["mall", "screen_format", "rotation"], kpiTemplates: ["impressions", "footfall"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "dooh-programmatic", name: "DOOH Programmatique", category: "ATL", drivers: ["DOOH"], requiredFields: ["audience", "creative", "budget"], kpiTemplates: ["impressions", "cpm", "reach"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },

  // --- TRANSIT ---
  { slug: "transit-bus-wrap", name: "Habillage Bus", category: "ATL", drivers: ["TRANSIT", "OOH"], requiredFields: ["route", "duration", "creative"], kpiTemplates: ["impressions", "coverage"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "transit-metro-ad", name: "Affichage Métro", category: "ATL", drivers: ["TRANSIT", "OOH"], requiredFields: ["station", "format", "duration"], kpiTemplates: ["impressions", "footfall"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "transit-taxi-ad", name: "Publicité Taxi", category: "ATL", drivers: ["TRANSIT"], requiredFields: ["fleet_size", "creative", "duration"], kpiTemplates: ["impressions"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- AMBIENT ---
  { slug: "ambient-guerrilla", name: "Guérilla Marketing", category: "ATL", drivers: ["AMBIENT"], requiredFields: ["concept", "location", "permits"], kpiTemplates: ["impressions", "social_mentions", "earned_media"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "ambient-projection", name: "Projection Urbaine", category: "ATL", drivers: ["AMBIENT"], requiredFields: ["location", "content", "duration"], kpiTemplates: ["impressions", "social_mentions"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- AERIAL ---
  { slug: "aerial-banner", name: "Banderole Aérienne", category: "ATL", drivers: ["AERIAL"], requiredFields: ["route", "message", "duration"], kpiTemplates: ["impressions", "coverage"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "aerial-drone-show", name: "Spectacle Drones", category: "ATL", drivers: ["AERIAL"], requiredFields: ["location", "concept", "drone_count"], kpiTemplates: ["attendance", "social_mentions", "earned_media"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // ═══════════════════════════════════════════════════════════════════
  //  BTL — Below The Line  (38 drivers: SAMPLING, STREET_MARKETING,
  //         ACTIVATION_PDV, EVENEMENTIEL, LANCEMENT_PRODUIT, etc.)
  // ═══════════════════════════════════════════════════════════════════

  // --- Social Organic (earned media — stays BTL) ---
  { slug: "social-post-organic", name: "Post Social Organique", category: "BTL", drivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"], requiredFields: ["visual", "copy", "hashtags"], kpiTemplates: ["engagement_rate", "reach", "impressions"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "social-story", name: "Story Social", category: "BTL", drivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK"], requiredFields: ["visual", "duration"], kpiTemplates: ["views", "completion_rate"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "social-reel", name: "Reel / Short Video", category: "BTL", drivers: ["INSTAGRAM", "TIKTOK"], requiredFields: ["video", "music", "copy"], kpiTemplates: ["views", "shares", "engagement_rate"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "social-carousel", name: "Carousel", category: "BTL", drivers: ["INSTAGRAM", "LINKEDIN"], requiredFields: ["slides", "copy"], kpiTemplates: ["engagement_rate", "saves"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "social-live", name: "Live Streaming", category: "BTL", drivers: ["INSTAGRAM", "FACEBOOK", "TIKTOK"], requiredFields: ["topic", "duration", "host"], kpiTemplates: ["concurrent_viewers", "total_views"], defaultAarrStage: "Activation", defaultUniteCosting: "FLAT" },
  { slug: "social-thread", name: "Thread / Fil", category: "BTL", drivers: ["X", "LINKEDIN"], requiredFields: ["content", "visuals"], kpiTemplates: ["impressions", "engagement_rate", "shares"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- Sampling ---
  { slug: "sampling", name: "Distribution Échantillons", category: "BTL", drivers: ["SAMPLING"], requiredFields: ["product", "quantity", "locations"], kpiTemplates: ["units_distributed", "conversion_rate"], defaultAarrStage: "Activation", defaultUniteCosting: "CPA" },
  { slug: "sampling-door-to-door", name: "Échantillonnage Porte-à-Porte", category: "BTL", drivers: ["SAMPLING"], requiredFields: ["product", "quantity", "zones"], kpiTemplates: ["units_distributed", "coverage"], defaultAarrStage: "Activation", defaultUniteCosting: "CPA" },
  { slug: "sampling-in-store", name: "Dégustation en Magasin", category: "BTL", drivers: ["SAMPLING", "ACTIVATION_PDV"], requiredFields: ["product", "stores", "team"], kpiTemplates: ["units_distributed", "uplift", "conversion_rate"], defaultAarrStage: "Activation", defaultUniteCosting: "CPA" },

  // --- Street Marketing ---
  { slug: "street-marketing-flyer", name: "Distribution Flyers", category: "BTL", drivers: ["STREET_MARKETING"], requiredFields: ["flyer_design", "quantity", "locations", "team"], kpiTemplates: ["units_distributed", "contacts"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "street-marketing-animation", name: "Animation Rue", category: "BTL", drivers: ["STREET_MARKETING"], requiredFields: ["concept", "location", "team", "permits"], kpiTemplates: ["contacts", "social_mentions", "engagement"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "street-marketing-flashmob", name: "Flash Mob", category: "BTL", drivers: ["STREET_MARKETING"], requiredFields: ["choreography", "location", "team"], kpiTemplates: ["views", "social_mentions", "earned_media"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- Activation PDV (Point de Vente) ---
  { slug: "activation-pdv-demo", name: "Démonstration en Magasin", category: "BTL", drivers: ["ACTIVATION_PDV"], requiredFields: ["product", "stores", "team", "mechanic"], kpiTemplates: ["contacts", "uplift", "conversion_rate"], defaultAarrStage: "Activation", defaultUniteCosting: "FLAT" },
  { slug: "activation-pdv-promo", name: "Promotion Point de Vente", category: "BTL", drivers: ["ACTIVATION_PDV"], requiredFields: ["product", "stores", "offer", "duration"], kpiTemplates: ["sell_through", "uplift", "revenue"], defaultAarrStage: "Revenue", defaultUniteCosting: "FLAT" },

  // --- PLV / Signalétique ---
  { slug: "plv-counter-display", name: "PLV Comptoir", category: "BTL", drivers: ["ACTIVATION_PDV"], requiredFields: ["dimensions", "material"], kpiTemplates: ["visibility", "uplift"], defaultAarrStage: "Activation", defaultUniteCosting: "FLAT" },
  { slug: "plv-floor-stand", name: "PLV Sol", category: "BTL", drivers: ["ACTIVATION_PDV"], requiredFields: ["dimensions", "material"], kpiTemplates: ["visibility", "uplift"], defaultAarrStage: "Activation", defaultUniteCosting: "FLAT" },
  { slug: "signaletique-indoor", name: "Signalétique Intérieure", category: "BTL", drivers: ["ACTIVATION_PDV"], requiredFields: ["format", "location", "quantity"], kpiTemplates: ["visibility", "footfall_direction"], defaultAarrStage: "Activation", defaultUniteCosting: "FLAT" },
  { slug: "signaletique-outdoor", name: "Signalétique Extérieure", category: "BTL", drivers: ["ACTIVATION_PDV"], requiredFields: ["format", "location", "permits"], kpiTemplates: ["visibility", "footfall"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- Événementiel ---
  { slug: "event-launch", name: "Événement de Lancement", category: "BTL", drivers: ["EVENEMENTIEL", "LANCEMENT_PRODUIT"], requiredFields: ["venue", "date", "guest_list", "program"], kpiTemplates: ["attendance", "media_coverage", "social_mentions"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "event-activation", name: "Activation Terrain", category: "BTL", drivers: ["EVENEMENTIEL"], requiredFields: ["location", "date", "team", "mechanic"], kpiTemplates: ["contacts", "sampling", "conversion"], defaultAarrStage: "Activation", defaultUniteCosting: "FLAT" },
  { slug: "event-popup", name: "Pop-up Store", category: "BTL", drivers: ["EVENEMENTIEL"], requiredFields: ["location", "duration", "concept"], kpiTemplates: ["footfall", "revenue", "social_mentions"], defaultAarrStage: "Activation", defaultUniteCosting: "FLAT" },
  { slug: "event-workshop", name: "Workshop / Masterclass", category: "BTL", drivers: ["EVENEMENTIEL"], requiredFields: ["topic", "host", "venue"], kpiTemplates: ["attendance", "satisfaction", "nps"], defaultAarrStage: "Retention", defaultUniteCosting: "FLAT" },
  { slug: "event-gala", name: "Soirée Gala", category: "BTL", drivers: ["EVENEMENTIEL"], requiredFields: ["venue", "date", "guest_list", "theme"], kpiTemplates: ["attendance", "media_coverage", "earned_media"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "event-conference", name: "Conférence / Panel", category: "BTL", drivers: ["EVENEMENTIEL"], requiredFields: ["venue", "speakers", "topic", "date"], kpiTemplates: ["attendance", "satisfaction", "leads"], defaultAarrStage: "Acquisition", defaultUniteCosting: "FLAT" },

  // --- Sponsoring ---
  { slug: "sponsoring-event", name: "Sponsoring Événement", category: "BTL", drivers: ["SPONSORING"], requiredFields: ["event", "package", "deliverables"], kpiTemplates: ["impressions", "association", "leads"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "sponsoring-sport", name: "Sponsoring Sportif", category: "BTL", drivers: ["SPONSORING"], requiredFields: ["team_or_athlete", "contract", "deliverables"], kpiTemplates: ["impressions", "association", "recall"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "sponsoring-culture", name: "Sponsoring Culturel", category: "BTL", drivers: ["SPONSORING"], requiredFields: ["institution", "package", "deliverables"], kpiTemplates: ["impressions", "association", "earned_media"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- Direct Mail ---
  { slug: "direct-mail-letter", name: "Courrier Adressé", category: "BTL", drivers: ["DIRECT_MAIL"], requiredFields: ["copy", "design", "segment", "quantity"], kpiTemplates: ["delivery_rate", "response_rate", "conversion_rate"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPA" },
  { slug: "direct-mail-catalog", name: "Catalogue Postal", category: "BTL", drivers: ["DIRECT_MAIL"], requiredFields: ["design", "products", "segment", "quantity"], kpiTemplates: ["delivery_rate", "orders", "revenue"], defaultAarrStage: "Revenue", defaultUniteCosting: "CPA" },

  // --- Fashion Show ---
  { slug: "fashion-show", name: "Défilé de Mode", category: "BTL", drivers: ["FASHION_SHOW", "EVENEMENTIEL"], requiredFields: ["venue", "collection", "models", "guest_list"], kpiTemplates: ["attendance", "media_coverage", "social_mentions", "earned_media"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "fashion-show-digital", name: "Défilé Digital", category: "BTL", drivers: ["FASHION_SHOW"], requiredFields: ["platform", "collection", "production"], kpiTemplates: ["views", "engagement", "social_mentions"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- Activation Campus ---
  { slug: "activation-campus", name: "Activation Campus", category: "BTL", drivers: ["ACTIVATION_CAMPUS"], requiredFields: ["university", "concept", "team", "date"], kpiTemplates: ["contacts", "sign_ups", "engagement"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPL" },
  { slug: "activation-campus-ambassador", name: "Programme Ambassadeurs Campus", category: "BTL", drivers: ["ACTIVATION_CAMPUS"], requiredFields: ["universities", "ambassador_count", "brief"], kpiTemplates: ["sign_ups", "referrals", "engagement"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPL" },

  // --- Sensibilisation ---
  { slug: "sensibilisation-campaign", name: "Campagne de Sensibilisation", category: "BTL", drivers: ["SENSIBILISATION"], requiredFields: ["cause", "message", "channels", "partners"], kpiTemplates: ["reach", "engagement", "sentiment", "behavioral_change"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- PR ---
  { slug: "pr-press-release", name: "Communiqué de Presse", category: "BTL", drivers: ["PR"], requiredFields: ["title", "body", "contact_list"], kpiTemplates: ["pickups", "reach", "sentiment"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "pr-media-event", name: "Événement Presse", category: "BTL", drivers: ["PR"], requiredFields: ["venue", "guest_list", "kit"], kpiTemplates: ["attendance", "articles", "reach"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "pr-influencer-seeding", name: "Seeding Influenceurs", category: "BTL", drivers: ["PR"], requiredFields: ["influencer_list", "product", "brief"], kpiTemplates: ["posts", "reach", "engagement"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "pr-interview", name: "Interview / Portrait", category: "BTL", drivers: ["PR"], requiredFields: ["interviewee", "media", "angle"], kpiTemplates: ["reach", "sentiment"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- Packaging ---
  { slug: "packaging-design", name: "Design Packaging", category: "BTL", drivers: ["PACKAGING"], requiredFields: ["product", "dimensions", "materials"], kpiTemplates: ["shelf_appeal", "recognition"], defaultAarrStage: "Activation", defaultUniteCosting: "FLAT" },
  { slug: "packaging-limited-edition", name: "Packaging Édition Limitée", category: "BTL", drivers: ["PACKAGING"], requiredFields: ["product", "concept", "quantity"], kpiTemplates: ["sell_through", "social_mentions"], defaultAarrStage: "Revenue", defaultUniteCosting: "FLAT" },
  { slug: "packaging-co-brand", name: "Packaging Co-brandé", category: "BTL", drivers: ["PACKAGING"], requiredFields: ["partner", "product", "concept"], kpiTemplates: ["sell_through", "association", "social_mentions"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- Partnerships / Collabs ---
  { slug: "partnership-collab", name: "Collaboration Marque", category: "BTL", drivers: ["SPONSORING"], requiredFields: ["partner", "concept", "deliverables"], kpiTemplates: ["reach", "engagement", "revenue"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- UGC / Contests ---
  { slug: "ugc-challenge", name: "Challenge UGC", category: "BTL", drivers: ["INSTAGRAM", "TIKTOK"], requiredFields: ["mechanic", "hashtag", "prize"], kpiTemplates: ["submissions", "views", "engagement"], defaultAarrStage: "Activation", defaultUniteCosting: "FLAT" },
  { slug: "contest-giveaway", name: "Jeu Concours", category: "BTL", drivers: ["INSTAGRAM", "FACEBOOK"], requiredFields: ["mechanic", "prize", "rules"], kpiTemplates: ["entries", "followers_gained", "engagement"], defaultAarrStage: "Acquisition", defaultUniteCosting: "FLAT" },

  // --- Landing / Blog (owned media, BTL) ---
  { slug: "landing-page", name: "Landing Page", category: "BTL", drivers: ["WEBSITE"], requiredFields: ["content", "cta", "form"], kpiTemplates: ["conversion_rate", "bounce_rate"], defaultAarrStage: "Acquisition", defaultUniteCosting: "FLAT" },
  { slug: "blog-article", name: "Article Blog", category: "BTL", drivers: ["WEBSITE"], requiredFields: ["title", "content", "seo_keywords"], kpiTemplates: ["pageviews", "time_on_page", "shares"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- Ambient Marketing (BTL-specific, experiential) ---
  { slug: "ambient-marketing-stunt", name: "Ambient Marketing Stunt", category: "BTL", drivers: ["AMBIENT_MARKETING"], requiredFields: ["concept", "location", "team", "permits"], kpiTemplates: ["contacts", "social_mentions", "earned_media"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "ambient-marketing-installation", name: "Installation Éphémère", category: "BTL", drivers: ["AMBIENT_MARKETING"], requiredFields: ["concept", "location", "duration"], kpiTemplates: ["footfall", "social_mentions", "dwell_time"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- Aerial Marketing (BTL-specific, local) ---
  { slug: "aerial-marketing-skywriter", name: "Skywriting", category: "BTL", drivers: ["AERIAL_MARKETING"], requiredFields: ["message", "location", "date"], kpiTemplates: ["impressions", "social_mentions"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- Transit Ad (BTL-specific, local) ---
  { slug: "transit-ad-interior", name: "Affichage Transport Intérieur", category: "BTL", drivers: ["TRANSIT_AD"], requiredFields: ["route", "format", "duration"], kpiTemplates: ["impressions", "footfall"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },

  // --- Véhicule Wrap ---
  { slug: "vehicule-wrap", name: "Habillage Véhicule", category: "BTL", drivers: ["VEHICULE_WRAP"], requiredFields: ["vehicle_type", "creative", "quantity", "duration"], kpiTemplates: ["impressions", "coverage"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },

  // --- Stand ---
  { slug: "stand-salon", name: "Stand Salon / Foire", category: "BTL", drivers: ["STAND"], requiredFields: ["event", "surface", "design", "team"], kpiTemplates: ["footfall", "leads", "contacts"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPL" },
  { slug: "stand-outdoor", name: "Stand Terrain / Extérieur", category: "BTL", drivers: ["STAND"], requiredFields: ["location", "concept", "team", "permits"], kpiTemplates: ["contacts", "sampling", "sign_ups"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPL" },

  // --- Newsletter (owned, BTL) ---
  { slug: "newsletter", name: "Newsletter", category: "BTL", drivers: ["WEBSITE"], requiredFields: ["content", "segment"], kpiTemplates: ["open_rate", "ctr"], defaultAarrStage: "Retention", defaultUniteCosting: "FLAT" },

  // ═══════════════════════════════════════════════════════════════════
  //  TTL — Through The Line  (27 drivers: SOCIAL_AD, SEA, INFLUENCER,
  //         CONTENT_MARKETING, CRM, EMAILING, SMS_MARKETING,
  //         LOYALTY_PROGRAM, APP_INSTALL, COMMUNITY_MANAGEMENT, etc.)
  // ═══════════════════════════════════════════════════════════════════

  // --- Social Ads ---
  { slug: "paid-social-awareness", name: "Social Ads - Notoriété", category: "TTL", drivers: ["SOCIAL_AD", "INSTAGRAM", "FACEBOOK", "TIKTOK", "LINKEDIN"], requiredFields: ["creative", "targeting", "budget"], kpiTemplates: ["reach", "impressions", "cpv", "cpm"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "paid-social-engagement", name: "Social Ads - Engagement", category: "TTL", drivers: ["SOCIAL_AD", "INSTAGRAM", "FACEBOOK", "TIKTOK"], requiredFields: ["creative", "targeting", "budget"], kpiTemplates: ["engagement", "cpe", "shares"], defaultAarrStage: "Activation", defaultUniteCosting: "CPM" },
  { slug: "paid-social-conversion", name: "Social Ads - Conversion", category: "TTL", drivers: ["SOCIAL_AD", "INSTAGRAM", "FACEBOOK"], requiredFields: ["creative", "targeting", "budget", "pixel"], kpiTemplates: ["conversions", "cpa", "roas"], defaultAarrStage: "Revenue", defaultUniteCosting: "CPA" },
  { slug: "paid-social-retargeting", name: "Retargeting Social", category: "TTL", drivers: ["SOCIAL_AD", "INSTAGRAM", "FACEBOOK"], requiredFields: ["audience", "creative", "budget"], kpiTemplates: ["conversions", "roas", "cpa"], defaultAarrStage: "Revenue", defaultUniteCosting: "CPA" },
  { slug: "paid-social-lead-gen", name: "Social Ads - Lead Gen", category: "TTL", drivers: ["SOCIAL_AD", "FACEBOOK", "LINKEDIN"], requiredFields: ["form", "creative", "targeting", "budget"], kpiTemplates: ["leads", "cpl", "conversion_rate"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPL" },

  // --- SEA (Search Engine Advertising) ---
  { slug: "google-search", name: "Google Search Ads", category: "TTL", drivers: ["SEA"], requiredFields: ["keywords", "ad_copy", "budget"], kpiTemplates: ["clicks", "ctr", "cpc", "conversions"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPC" },
  { slug: "google-display", name: "Google Display", category: "TTL", drivers: ["SEA"], requiredFields: ["banners", "targeting", "budget"], kpiTemplates: ["impressions", "cpm", "clicks"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "google-shopping", name: "Google Shopping", category: "TTL", drivers: ["SEA"], requiredFields: ["feed", "budget"], kpiTemplates: ["clicks", "cpc", "roas", "conversions"], defaultAarrStage: "Revenue", defaultUniteCosting: "CPC" },
  { slug: "bing-search", name: "Bing Search Ads", category: "TTL", drivers: ["SEA"], requiredFields: ["keywords", "ad_copy", "budget"], kpiTemplates: ["clicks", "ctr", "cpc"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPC" },

  // --- YouTube / Video Ads ---
  { slug: "youtube-preroll", name: "YouTube Pre-roll", category: "TTL", drivers: ["SOCIAL_AD", "VIDEO"], requiredFields: ["video", "targeting", "budget"], kpiTemplates: ["views", "cpv", "completion_rate"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "youtube-discovery", name: "YouTube Discovery", category: "TTL", drivers: ["SOCIAL_AD", "VIDEO"], requiredFields: ["thumbnail", "title", "budget"], kpiTemplates: ["clicks", "watch_time"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPC" },
  { slug: "youtube-shorts-ad", name: "YouTube Shorts Ad", category: "TTL", drivers: ["SOCIAL_AD", "VIDEO"], requiredFields: ["video", "targeting", "budget"], kpiTemplates: ["views", "cpv", "engagement"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },

  // --- Influencer (paid TTL) ---
  { slug: "influencer-sponsored", name: "Contenu Sponsorisé Influenceur", category: "TTL", drivers: ["INFLUENCER", "INSTAGRAM", "TIKTOK"], requiredFields: ["influencer", "brief", "budget"], kpiTemplates: ["reach", "engagement", "cpe"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "influencer-takeover", name: "Takeover Influenceur", category: "TTL", drivers: ["INFLUENCER", "INSTAGRAM", "TIKTOK"], requiredFields: ["influencer", "brief", "schedule"], kpiTemplates: ["views", "engagement", "followers_gained"], defaultAarrStage: "Awareness", defaultUniteCosting: "FLAT" },
  { slug: "influencer-affiliate", name: "Influenceur Affiliation", category: "TTL", drivers: ["INFLUENCER", "AFFILIATE"], requiredFields: ["influencer", "commission_model", "tracking"], kpiTemplates: ["clicks", "conversions", "revenue", "cpa"], defaultAarrStage: "Revenue", defaultUniteCosting: "CPA" },

  // --- Content Marketing ---
  { slug: "native-content", name: "Contenu Natif / Advertorial", category: "TTL", drivers: ["CONTENT_MARKETING"], requiredFields: ["publisher", "content", "budget"], kpiTemplates: ["pageviews", "time_on_page", "ctr"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "branded-content-video", name: "Branded Content Vidéo", category: "TTL", drivers: ["CONTENT_MARKETING", "VIDEO"], requiredFields: ["concept", "production", "distribution"], kpiTemplates: ["views", "completion_rate", "shares"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "content-marketing-series", name: "Série Éditoriale", category: "TTL", drivers: ["CONTENT_MARKETING"], requiredFields: ["theme", "episodes", "channels"], kpiTemplates: ["views", "engagement", "subscribers"], defaultAarrStage: "Retention", defaultUniteCosting: "FLAT" },

  // --- CRM ---
  { slug: "crm-onboarding-flow", name: "CRM Parcours Onboarding", category: "TTL", drivers: ["CRM"], requiredFields: ["segments", "triggers", "content", "channels"], kpiTemplates: ["activation_rate", "retention", "nps"], defaultAarrStage: "Activation", defaultUniteCosting: "FLAT" },
  { slug: "crm-win-back", name: "CRM Réactivation", category: "TTL", drivers: ["CRM"], requiredFields: ["segments", "offer", "channels"], kpiTemplates: ["reactivation_rate", "revenue", "roi"], defaultAarrStage: "Retention", defaultUniteCosting: "FLAT" },
  { slug: "crm-lifecycle", name: "CRM Cycle de Vie", category: "TTL", drivers: ["CRM"], requiredFields: ["segments", "triggers", "journeys"], kpiTemplates: ["ltv", "retention", "churn_rate"], defaultAarrStage: "Retention", defaultUniteCosting: "FLAT" },

  // --- Emailing (moved from BTL to TTL) ---
  { slug: "email-campaign", name: "Campagne Email", category: "TTL", drivers: ["EMAILING"], requiredFields: ["subject", "body", "segment"], kpiTemplates: ["open_rate", "ctr", "conversion_rate"], defaultAarrStage: "Activation", defaultUniteCosting: "CPM" },
  { slug: "email-drip", name: "Séquence Email Drip", category: "TTL", drivers: ["EMAILING", "CRM"], requiredFields: ["sequence", "triggers", "segment"], kpiTemplates: ["open_rate", "ctr", "conversion_rate", "unsubscribe_rate"], defaultAarrStage: "Activation", defaultUniteCosting: "CPM" },
  { slug: "email-transactional", name: "Email Transactionnel", category: "TTL", drivers: ["EMAILING", "CRM"], requiredFields: ["trigger", "template", "content"], kpiTemplates: ["delivery_rate", "open_rate"], defaultAarrStage: "Retention", defaultUniteCosting: "FLAT" },

  // --- SMS Marketing (moved from BTL to TTL) ---
  { slug: "sms-blast", name: "SMS Blast", category: "TTL", drivers: ["SMS_MARKETING"], requiredFields: ["message", "segment"], kpiTemplates: ["delivery_rate", "ctr"], defaultAarrStage: "Activation", defaultUniteCosting: "CPM" },
  { slug: "sms-conversational", name: "SMS Conversationnel", category: "TTL", drivers: ["SMS_MARKETING", "CRM"], requiredFields: ["flow", "triggers", "segment"], kpiTemplates: ["response_rate", "conversion_rate"], defaultAarrStage: "Activation", defaultUniteCosting: "CPM" },

  // --- Loyalty Program (moved from BTL to TTL) ---
  { slug: "loyalty-program", name: "Programme Fidélité", category: "TTL", drivers: ["LOYALTY_PROGRAM", "CRM"], requiredFields: ["mechanics", "rewards"], kpiTemplates: ["enrollment", "active_rate", "retention"], defaultAarrStage: "Retention", defaultUniteCosting: "FLAT" },
  { slug: "loyalty-program-vip", name: "Programme VIP", category: "TTL", drivers: ["LOYALTY_PROGRAM", "CRM"], requiredFields: ["tiers", "benefits", "criteria"], kpiTemplates: ["enrollment", "ltv", "retention"], defaultAarrStage: "Retention", defaultUniteCosting: "FLAT" },

  // --- Referral (moved from BTL to TTL) ---
  { slug: "referral-program", name: "Programme Parrainage", category: "TTL", drivers: ["LOYALTY_PROGRAM", "CRM"], requiredFields: ["mechanics", "reward"], kpiTemplates: ["referrals", "conversion", "cac"], defaultAarrStage: "Referral", defaultUniteCosting: "CPA" },

  // --- App Install ---
  { slug: "app-install-campaign", name: "Campagne App Install", category: "TTL", drivers: ["APP_INSTALL"], requiredFields: ["platform", "creative", "targeting", "budget"], kpiTemplates: ["installs", "cpi", "retention_d7"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPA" },
  { slug: "app-install-asa", name: "Apple Search Ads", category: "TTL", drivers: ["APP_INSTALL", "SEA"], requiredFields: ["keywords", "budget"], kpiTemplates: ["installs", "cpi", "ctr"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPC" },

  // --- Community Management ---
  { slug: "community-management", name: "Community Management", category: "TTL", drivers: ["COMMUNITY_MANAGEMENT"], requiredFields: ["platforms", "guidelines", "team"], kpiTemplates: ["response_rate", "sentiment", "engagement_rate", "growth_rate"], defaultAarrStage: "Retention", defaultUniteCosting: "FLAT" },
  { slug: "community-forum", name: "Forum / Communauté en Ligne", category: "TTL", drivers: ["COMMUNITY_MANAGEMENT"], requiredFields: ["platform", "moderation_rules", "content_plan"], kpiTemplates: ["active_members", "posts", "retention"], defaultAarrStage: "Retention", defaultUniteCosting: "FLAT" },

  // --- Chatbot ---
  { slug: "chatbot-support", name: "Chatbot Support Client", category: "TTL", drivers: ["CHATBOT"], requiredFields: ["platform", "flows", "knowledge_base"], kpiTemplates: ["resolution_rate", "satisfaction", "deflection_rate"], defaultAarrStage: "Retention", defaultUniteCosting: "FLAT" },
  { slug: "chatbot-lead-gen", name: "Chatbot Lead Gen", category: "TTL", drivers: ["CHATBOT"], requiredFields: ["platform", "flows", "form"], kpiTemplates: ["leads", "qualification_rate", "cpl"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPL" },

  // --- Webinar ---
  { slug: "webinar", name: "Webinaire", category: "TTL", drivers: ["WEBINAR"], requiredFields: ["topic", "speakers", "platform", "date"], kpiTemplates: ["registrations", "attendance", "engagement", "leads"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPL" },
  { slug: "webinar-on-demand", name: "Webinaire On Demand", category: "TTL", drivers: ["WEBINAR", "CONTENT_MARKETING"], requiredFields: ["topic", "recording", "landing_page"], kpiTemplates: ["views", "leads", "cpl"], defaultAarrStage: "Acquisition", defaultUniteCosting: "CPL" },

  // --- Podcast Own ---
  { slug: "podcast-own", name: "Podcast de Marque", category: "TTL", drivers: ["PODCAST_OWN", "CONTENT_MARKETING"], requiredFields: ["concept", "host", "episodes", "distribution"], kpiTemplates: ["downloads", "subscribers", "completion_rate"], defaultAarrStage: "Retention", defaultUniteCosting: "FLAT" },
  { slug: "podcast-sponsorship", name: "Sponsoring Podcast", category: "TTL", drivers: ["PODCAST_OWN"], requiredFields: ["podcast", "format", "episodes"], kpiTemplates: ["downloads", "reach", "recall"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },

  // --- SEO ---
  { slug: "seo-on-page", name: "SEO On-Page", category: "TTL", drivers: ["SEO"], requiredFields: ["pages", "keywords", "meta_tags"], kpiTemplates: ["organic_traffic", "rankings", "ctr"], defaultAarrStage: "Acquisition", defaultUniteCosting: "FLAT" },
  { slug: "seo-link-building", name: "SEO Link Building", category: "TTL", drivers: ["SEO"], requiredFields: ["target_sites", "content", "outreach"], kpiTemplates: ["backlinks", "domain_authority", "organic_traffic"], defaultAarrStage: "Acquisition", defaultUniteCosting: "FLAT" },
  { slug: "seo-technical", name: "SEO Technique", category: "TTL", drivers: ["SEO"], requiredFields: ["audit", "fixes", "sitemap"], kpiTemplates: ["page_speed", "crawl_errors", "index_coverage"], defaultAarrStage: "Acquisition", defaultUniteCosting: "FLAT" },

  // --- Affiliate ---
  { slug: "affiliate-program", name: "Programme Affiliation", category: "TTL", drivers: ["AFFILIATE"], requiredFields: ["commission_model", "creatives", "tracking"], kpiTemplates: ["clicks", "conversions", "revenue", "cpa"], defaultAarrStage: "Revenue", defaultUniteCosting: "CPA" },
  { slug: "affiliate-network", name: "Réseau Affiliation", category: "TTL", drivers: ["AFFILIATE"], requiredFields: ["network", "commission_model", "budget"], kpiTemplates: ["publishers", "clicks", "conversions", "roas"], defaultAarrStage: "Revenue", defaultUniteCosting: "CPA" },

  // --- Marketplace Ad ---
  { slug: "marketplace-ad-amazon", name: "Amazon Sponsored Ads", category: "TTL", drivers: ["MARKETPLACE_AD"], requiredFields: ["products", "keywords", "budget"], kpiTemplates: ["impressions", "clicks", "acos", "roas"], defaultAarrStage: "Revenue", defaultUniteCosting: "CPC" },
  { slug: "marketplace-ad-jumia", name: "Jumia Sponsored Ads", category: "TTL", drivers: ["MARKETPLACE_AD"], requiredFields: ["products", "budget"], kpiTemplates: ["impressions", "clicks", "conversion_rate", "roas"], defaultAarrStage: "Revenue", defaultUniteCosting: "CPC" },

  // --- Programmatic ---
  { slug: "programmatic-display", name: "Programmatique Display", category: "TTL", drivers: ["SEA"], requiredFields: ["creative", "audience", "budget"], kpiTemplates: ["impressions", "cpm", "viewability"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "programmatic-video", name: "Programmatique Vidéo", category: "TTL", drivers: ["SEA", "VIDEO"], requiredFields: ["video", "audience", "budget"], kpiTemplates: ["views", "cpv", "completion_rate"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
  { slug: "programmatic-audio", name: "Programmatique Audio", category: "TTL", drivers: ["SEA"], requiredFields: ["audio", "audience", "budget"], kpiTemplates: ["listens", "cpl", "completion_rate"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },

  // --- Integrated ---
  { slug: "integrated-campaign-360", name: "Campagne Intégrée 360°", category: "TTL", drivers: ["SOCIAL_AD", "SEA", "INFLUENCER", "TV", "OOH", "EVENEMENTIEL"], requiredFields: ["concept", "channels", "timeline", "budget"], kpiTemplates: ["reach", "frequency", "engagement", "conversions", "roi"], defaultAarrStage: "Awareness", defaultUniteCosting: "CPM" },
];

// ═══════════════════════════════════════════════════════════════════
//  Utility functions
// ═══════════════════════════════════════════════════════════════════

export function getActionType(slug: string): ActionType | undefined {
  return ACTION_TYPES.find((a) => a.slug === slug);
}

export function getActionsByCategory(category: ActionCategory): ActionType[] {
  return ACTION_TYPES.filter((a) => a.category === category);
}

export function getActionsByDriver(driver: string): ActionType[] {
  return ACTION_TYPES.filter((a) => a.drivers.includes(driver));
}

export function getActionsByAarrStage(stage: string): ActionType[] {
  return ACTION_TYPES.filter((a) => a.defaultAarrStage === stage);
}

export function getActionsByCostingUnit(unit: string): ActionType[] {
  return ACTION_TYPES.filter((a) => a.defaultUniteCosting === unit);
}

export function searchActions(query: string): ActionType[] {
  const lower = query.toLowerCase();
  return ACTION_TYPES.filter(
    (a) =>
      a.name.toLowerCase().includes(lower) ||
      a.slug.includes(lower) ||
      a.category.toLowerCase().includes(lower) ||
      a.drivers.some((d) => d.toLowerCase().includes(lower))
  );
}

/** Quick stats for validation */
export function getActionTypeCounts(): Record<ActionCategory, number> {
  return {
    ATL: getActionsByCategory("ATL").length,
    BTL: getActionsByCategory("BTL").length,
    TTL: getActionsByCategory("TTL").length,
  };
}

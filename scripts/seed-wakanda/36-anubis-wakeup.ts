/**
 * WAKANDA SEED — Anubis wake-up (Phase 8+ activation thresholds)
 *
 * ADR-0011 conditions d'activation Anubis :
 *  1. Au moins 1 brand active commence à activer paid media → 1 → 5 brands en paid
 *  2. Volume notifications cross-portail > 1000/jour → 6 → ~3500 sur 3 jours (≈1170/j)
 *  3. OAuth scopes ad networks (Google Ads, Meta) obtenus → 0 → 18 IntegrationConnection
 *
 * Téléologie ADR §3 : KPI primaire = `cost_per_superfan_recruited`,
 * pas reach/CTR/CPM. On peuple `CampaignAmplification.aarrAttribution`
 * + metrics enrichies pour que le matching coût→superfan ait du grain.
 *
 * Records ajoutés :
 *  - 18 IntegrationConnection (operator OAuth : google/meta/tiktok/linkedin/x ×
 *    plusieurs userIds + cas expiré + cas pending refresh)
 *  - 24 MediaPlatformConnection (META_ADS, GOOGLE_ADS, TIKTOK_ADS, X_ADS × brands)
 *  - 96 MediaPerformanceSync (weekly × 4 plateformes × 6 brands)
 *  - 30 CampaignAmplification (paid media campaigns avec aarrAttribution)
 *  - 8 SocialConnection supplémentaires (couvrant les 6 brands × IG/TT/LI)
 *  - 60 SocialPost (volume éditorial)
 *  - 12 PressRelease + 36 PressDistribution + 18 PressClipping
 *  - 6 MediaContact (journalistes secteur)
 *  - 110 NotificationPreference (un par user/talent)
 *  - 3500 Notification (mix d'in-app/email/push, multi-canaux, multi-users) sur 3 jours
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter, hoursAfter } from "./helpers";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

const NOTIF_TITLES = [
  { title: "Score ADVERTIS mis à jour",        body: "Votre score vient d'évoluer — consultez le nouveau classement.",                                  link: "/cockpit/scores" },
  { title: "Nouvelle recommandation Notoria",   body: "Mestor a généré 3 recommandations stratégiques. À review.",                                       link: "/cockpit/notoria" },
  { title: "Mission acceptée",                  body: "Votre mission est acceptée par le creator — kick-off dans 24h.",                                    link: "/cockpit/missions" },
  { title: "Forge Ptah terminée",                body: "L'asset Heritage KV est forgé. Téléchargement disponible 12h.",                                     link: "/cockpit/forges" },
  { title: "Brief Artemis prêt",                 body: "Le brief créatif Glow est généré — séquence Artemis terminée.",                                    link: "/cockpit/glory" },
  { title: "Budget Thot atteint 80%",           body: "Cap budget mensuel atteint à 80% — Thot va commencer à arbitrer.",                                  link: "/cockpit/budget" },
  { title: "Signal faible Tarsis",               body: "Mention concurrent détectée sur podcast secteur — analyse Seshat dispo.",                            link: "/cockpit/jehuty" },
  { title: "Campagne live confirmée",             body: "La campagne paid media est diffusée. Premiers metrics dans 6h.",                                    link: "/cockpit/campaigns" },
  { title: "Superfan acquired",                  body: "Un nouveau superfan a franchi le seuil ambassadeur. Bravo !",                                        link: "/cockpit/community" },
  { title: "Webhook Stripe reçu",                body: "Paiement retainer confirmé — facture émise.",                                                        link: "/cockpit/financial" },
  { title: "Oracle snapshot pris",               body: "Snapshot Oracle quotidien archivé. Time-travel disponible.",                                         link: "/cockpit/oracle" },
  { title: "Notif RTIS cascade complete",        body: "La cascade RTIS s'est exécutée sans veto. Score recalculé.",                                         link: "/cockpit/scores" },
  { title: "Rappel mission deadline",            body: "Mission expire dans 48h — escalade priorité.",                                                       link: "/cockpit/missions" },
  { title: "Nouvelle review trimestrielle",      body: "Votre review Q2 est dispo — feedback constructif inside.",                                          link: "/cockpit/profile" },
  { title: "Court Académie publié",              body: "Nouveau cours disponible — inscription ouverte.",                                                    link: "/cockpit/academy" },
];

export async function seedAnubisWakeup(prisma: PrismaClient, brands: Brands) {
  const brandList = [
    { key: "bliss",     id: brands.bliss.strategy.id,     name: "BLISS" },
    { key: "vibranium", id: brands.vibranium.strategy.id, name: "Vibranium Tech" },
    { key: "brew",      id: brands.brew.strategy.id,      name: "Wakanda Brew" },
    { key: "panther",   id: brands.panther.strategy.id,   name: "Panther Athletics" },
    { key: "shuri",     id: brands.shuri.strategy.id,     name: "Shuri Academy" },
    { key: "jabari",    id: brands.jabari.strategy.id,    name: "Jabari Heritage" },
  ];

  // ============================================================
  // 1) IntegrationConnection — OAuth ad networks (operator-scoped)
  // ============================================================
  const oauthRows: Array<{ provider: string; externalUserId: string; scopes: string[]; status: "ACTIVE" | "EXPIRED" | "PENDING_REFRESH"; offsetH: number }> = [
    // Meta — multi-account (BLISS, Vibranium, Shuri)
    { provider: "meta",       externalUserId: "fb_act_bliss_wk",     scopes: ["ads_management", "ads_read", "business_management", "pages_read_engagement"], status: "ACTIVE", offsetH: -360 },
    { provider: "meta",       externalUserId: "fb_act_vibranium_wk", scopes: ["ads_management", "ads_read", "business_management"],                          status: "ACTIVE", offsetH: -240 },
    { provider: "meta",       externalUserId: "fb_act_shuri_wk",     scopes: ["ads_management", "ads_read"],                                                  status: "ACTIVE", offsetH: -200 },
    { provider: "meta",       externalUserId: "fb_act_brew_wk",      scopes: ["ads_management", "ads_read"],                                                  status: "EXPIRED", offsetH: -480 },
    // Google Ads
    { provider: "google",     externalUserId: "ggl_act_bliss_wk",    scopes: ["https://www.googleapis.com/auth/adwords"],                                       status: "ACTIVE", offsetH: -350 },
    { provider: "google",     externalUserId: "ggl_act_vibranium_wk", scopes: ["https://www.googleapis.com/auth/adwords"],                                       status: "ACTIVE", offsetH: -180 },
    { provider: "google",     externalUserId: "ggl_act_shuri_wk",    scopes: ["https://www.googleapis.com/auth/adwords"],                                       status: "ACTIVE", offsetH: -120 },
    { provider: "google",     externalUserId: "ggl_act_jabari_wk",   scopes: ["https://www.googleapis.com/auth/adwords"],                                       status: "PENDING_REFRESH", offsetH: -480 },
    // TikTok
    { provider: "tiktok",     externalUserId: "tk_act_bliss_wk",     scopes: ["ad.read", "ad.write", "campaigns.read"],                                          status: "ACTIVE", offsetH: -300 },
    { provider: "tiktok",     externalUserId: "tk_act_brew_wk",      scopes: ["ad.read", "ad.write"],                                                            status: "ACTIVE", offsetH: -150 },
    { provider: "tiktok",     externalUserId: "tk_act_panther_wk",   scopes: ["ad.read"],                                                                        status: "ACTIVE", offsetH: -60 },
    // LinkedIn
    { provider: "linkedin",   externalUserId: "li_act_bliss_wk",     scopes: ["w_organization_social", "r_ads"],                                                 status: "ACTIVE", offsetH: -200 },
    { provider: "linkedin",   externalUserId: "li_act_shuri_wk",     scopes: ["w_organization_social", "r_ads"],                                                 status: "ACTIVE", offsetH: -300 },
    { provider: "linkedin",   externalUserId: "li_act_vibranium_wk", scopes: ["w_organization_social"],                                                          status: "ACTIVE", offsetH: -90 },
    // X (Twitter)
    { provider: "x",          externalUserId: "x_act_bliss_wk",      scopes: ["tweet.write", "tweet.read", "ads.read"],                                          status: "ACTIVE", offsetH: -150 },
    { provider: "x",          externalUserId: "x_act_vibranium_wk",  scopes: ["tweet.write", "tweet.read"],                                                       status: "ACTIVE", offsetH: -100 },
    // YouTube
    { provider: "youtube",    externalUserId: "yt_act_bliss_wk",     scopes: ["youtube.upload", "youtube.readonly"],                                              status: "ACTIVE", offsetH: -400 },
    // Cinetpay (paiements — pertinence Comms attribution)
    { provider: "cinetpay",   externalUserId: "cp_act_wakanda_op",   scopes: ["payments.read", "transfers.read"],                                                 status: "ACTIVE", offsetH: -600 },
  ];

  for (let i = 0; i < oauthRows.length; i++) {
    const r = oauthRows[i];
    const id = `wk-oauth-${r.provider}-${i.toString().padStart(2, "0")}`;
    await prisma.integrationConnection.upsert({
      where: { operatorId_provider_externalUserId: { operatorId: IDS.operator, provider: r.provider, externalUserId: r.externalUserId } },
      update: {},
      create: {
        id,
        operatorId: IDS.operator,
        provider: r.provider,
        externalUserId: r.externalUserId,
        encryptedTokens: `wk_aes256_cipher_${r.provider}_${i.toString().padStart(2, "0")}_BASE64==`,
        scopes: r.scopes,
        expiresAt: r.status === "EXPIRED" ? hoursAfter(T.now, -1) : r.status === "PENDING_REFRESH" ? hoursAfter(T.now, 0.5) : hoursAfter(T.now, 24 * 30),
        createdAt: hoursAfter(T.now, r.offsetH),
      },
    });
    track("IntegrationConnection");
  }

  // ============================================================
  // 2) MediaPlatformConnection — 24 (4 platforms × 6 brands)
  // ============================================================
  const adPlatforms = ["META_ADS", "GOOGLE_ADS", "TIKTOK_ADS", "X_ADS"];
  for (let bi = 0; bi < brandList.length; bi++) {
    for (let pi = 0; pi < adPlatforms.length; pi++) {
      const platform = adPlatforms[pi];
      const accountId = `act_${brandList[bi].key}_${platform.toLowerCase().replace("_ads", "")}_001`;
      const status = brandList[bi].key === "brew" && platform === "META_ADS" ? "ERROR" : "ACTIVE";
      await prisma.mediaPlatformConnection.upsert({
        where: { strategyId_platform_accountId: { strategyId: brandList[bi].id, platform, accountId } },
        update: {},
        create: {
          id: `wk-media-conn-${brandList[bi].key}-${platform.toLowerCase()}`,
          strategyId: brandList[bi].id,
          platform,
          accountId,
          credentials: { accountName: `${brandList[bi].name} ${platform}`, dailyBudgetXAF: 250_000 + bi * 50_000 } as Prisma.InputJsonValue,
          status,
          lastSyncAt: hoursAfter(T.now, -((bi + pi) * 6)),
        },
      });
      track("MediaPlatformConnection");
    }
  }

  // ============================================================
  // 3) MediaPerformanceSync — 96 (weekly × 4 plateformes × 6 brands × 4 weeks)
  // ============================================================
  const weeks = 4;
  for (let bi = 0; bi < brandList.length; bi++) {
    for (let pi = 0; pi < adPlatforms.length; pi++) {
      const platform = adPlatforms[pi];
      const connectionId = `wk-media-conn-${brandList[bi].key}-${platform.toLowerCase()}`;
      // Volume scale per brand (BLISS hero highest)
      const baseImpressions = brandList[bi].key === "bliss" ? 850_000 : brandList[bi].key === "vibranium" ? 320_000 : brandList[bi].key === "shuri" ? 180_000 : 90_000;
      for (let w = 0; w < weeks; w++) {
        const id = `wk-media-perf-${brandList[bi].key}-${platform.toLowerCase()}-w${w}`;
        const trend = 1 + w * 0.08;
        const impressions = Math.round(baseImpressions * trend * (0.85 + (pi % 3) * 0.07));
        const ctr = 0.012 + (pi * 0.003) + (w * 0.001);
        const clicks = Math.round(impressions * ctr);
        const conversionRate = 0.022 + (bi * 0.002) + (w * 0.001);
        const conversions = Math.round(clicks * conversionRate);
        const cpc = +(180 + bi * 25 + pi * 18).toFixed(2);
        const spend = +(clicks * cpc).toFixed(2);
        const cpa = +(spend / Math.max(1, conversions)).toFixed(2);
        const roas = +(2.4 + bi * 0.18 + (w * 0.06)).toFixed(2);
        await prisma.mediaPerformanceSync.upsert({
          where: { id },
          update: {},
          create: {
            id,
            connectionId,
            campaignRef: `camp_${brandList[bi].key}_${platform.toLowerCase()}_w${w}`,
            impressions,
            clicks,
            conversions,
            spend,
            currency: "XAF",
            ctr: +ctr.toFixed(4),
            cpc,
            cpa,
            roas,
            period: `2026-W${15 + w}`,
            syncedAt: daysAfter(T.now, -((weeks - w) * 7)),
          },
        });
        track("MediaPerformanceSync");
      }
    }
  }

  // ============================================================
  // 4) CampaignAmplification — 30 paid media campaigns
  // ============================================================
  const campaignsAvailable = [IDS.campaignHeritage, IDS.campaignGlow, IDS.campaignSchool, IDS.campaignFreedom, IDS.campaignHarvest];
  let ampCount = 0;
  const mediaTypes = ["DIGITAL_AD", "TV_SPOT", "RADIO_SPOT", "PRESSE_INSERTION", "OOH"];
  for (let i = 0; i < 30; i++) {
    const campaignId = campaignsAvailable[i % campaignsAvailable.length];
    const platform = adPlatforms[i % adPlatforms.length];
    const mediaType = mediaTypes[i % mediaTypes.length];
    const id = `wk-amplif-anubis-${String(i).padStart(3, "0")}`;
    const budget = 800_000 + (i % 7) * 250_000;
    const impressions = 120_000 + (i * 8500);
    const ctr = 0.014 + (i % 5) * 0.003;
    const clicks = Math.round(impressions * ctr);
    const conversionRate = 0.024 + (i % 4) * 0.002;
    const conversions = Math.round(clicks * conversionRate);
    const cpa = +(budget / Math.max(1, conversions)).toFixed(2);
    const roas = +(2.1 + (i % 6) * 0.18).toFixed(2);
    const status = i % 5 === 0 ? "PLANNED" : i % 5 === 1 ? "PAUSED" : i % 5 === 2 ? "COMPLETED" : "RUNNING";
    const startOffset = -30 + (i * 2);
    await prisma.campaignAmplification.upsert({
      where: { id },
      update: {},
      create: {
        id,
        campaignId,
        platform,
        budget,
        currency: "XAF",
        impressions,
        clicks,
        conversions,
        cpa,
        roas,
        status,
        startDate: daysAfter(T.now, startOffset),
        endDate: daysAfter(T.now, startOffset + 14),
        mediaType,
        mediaCost: +(budget * 0.78).toFixed(2),
        productionCost: +(budget * 0.14).toFixed(2),
        agencyFee: +(budget * 0.08).toFixed(2),
        reach: Math.round(impressions * 0.62),
        views: Math.round(impressions * 0.45),
        engagements: Math.round(impressions * 0.034),
        aarrAttribution: {
          ACQUISITION: { cost: budget * 0.55, leads: Math.round(conversions * 1.5) },
          ACTIVATION:  { cost: budget * 0.20, activations: Math.round(conversions * 0.8) },
          RETENTION:   { cost: budget * 0.10, retentions: Math.round(conversions * 0.4) },
          REVENUE:     { cost: budget * 0.10, revenue: budget * roas },
          REFERRAL:    { cost: budget * 0.05, referrals: Math.round(conversions * 0.2) },
        } as Prisma.InputJsonValue,
        metrics: {
          superfansAcquired: Math.round(conversions * 0.18),
          costPerSuperfan: +(budget / Math.max(1, conversions * 0.18)).toFixed(2),
          benchmarkRatio: +(0.72 + (i % 5) * 0.08).toFixed(2),
        } as Prisma.InputJsonValue,
        createdAt: daysAfter(T.now, startOffset - 5),
      },
    });
    track("CampaignAmplification");
    ampCount++;
  }

  // ============================================================
  // 5) SocialConnection supplémentaires (8) + SocialPost (60)
  // ============================================================
  const SUP_CONNS: Array<{ key: string; userId: string; platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINKEDIN" | "TWITTER" | "YOUTUBE"; accountId: string; accountName: string }> = [
    { key: "vibranium",  userId: IDS.userTchalla, platform: "INSTAGRAM", accountId: "vibraniumtech_wk", accountName: "@vibraniumtech_wk" },
    { key: "vibranium",  userId: IDS.userTchalla, platform: "TIKTOK",    accountId: "vibranium_tech",   accountName: "@vibranium_tech" },
    { key: "vibranium",  userId: IDS.userTchalla, platform: "LINKEDIN",  accountId: "vibranium-tech",   accountName: "Vibranium Tech" },
    { key: "brew",       userId: IDS.userRamonda, platform: "INSTAGRAM", accountId: "wakandabrew",      accountName: "@wakandabrew" },
    { key: "brew",       userId: IDS.userRamonda, platform: "FACEBOOK",  accountId: "wakandabrew",      accountName: "Wakanda Brew" },
    { key: "panther",    userId: IDS.userOkoye,   platform: "INSTAGRAM", accountId: "pantherathletics", accountName: "@pantherathletics" },
    { key: "panther",    userId: IDS.userOkoye,   platform: "TIKTOK",    accountId: "pantherath",       accountName: "@pantherath" },
    { key: "shuri",      userId: IDS.userShuri,   platform: "INSTAGRAM", accountId: "shuri.academy",    accountName: "@shuri.academy" },
  ];

  for (const c of SUP_CONNS) {
    const brandId = brandList.find((b) => b.key === c.key)!.id;
    await prisma.socialConnection.upsert({
      where: { strategyId_platform_accountId: { strategyId: brandId, platform: c.platform, accountId: c.accountId } },
      update: {},
      create: {
        id: `wk-social-${c.key}-${c.platform.toLowerCase()}-2`,
        strategyId: brandId,
        userId: c.userId,
        platform: c.platform,
        accountId: c.accountId,
        accountName: c.accountName,
        status: "ACTIVE",
        createdAt: daysAfter(T.now, -45),
      },
    });
    track("SocialConnection");
  }

  // 60 SocialPost — distribués sur les connexions + variations engagement
  const POST_TEMPLATES: Array<{ contentBase: string; brandKey: string }> = [
    { brandKey: "bliss", contentBase: "Heritage. Vibranium. Présent." },
    { brandKey: "bliss", contentBase: "Le rituel matin commence par un éveil." },
    { brandKey: "bliss", contentBase: "Découvrez la routine Glow Night." },
    { brandKey: "vibranium", contentBase: "Épargne automatique : économisez sans y penser." },
    { brandKey: "vibranium", contentBase: "Mobile money réinventé pour les jeunes actifs." },
    { brandKey: "brew", contentBase: "Notre brassin de pleine lune est prêt." },
    { brandKey: "brew", contentBase: "Craft beer. Ancestrale. Wakandaise." },
    { brandKey: "panther", contentBase: "Athlètes wakandais. Sneakers vibranium." },
    { brandKey: "shuri", contentBase: "Cours IA débute le 1er du mois — inscriptions ouvertes." },
    { brandKey: "shuri", contentBase: "Hackathon 2026 : 48h pour résoudre l'éducation." },
    { brandKey: "jabari", contentBase: "Sculptures montagne — édition limitée disponible." },
    { brandKey: "jabari", contentBase: "Le savoir-faire ancestral, transmis." },
  ];
  let postCount = 0;
  for (let i = 0; i < 60; i++) {
    const tpl = POST_TEMPLATES[i % POST_TEMPLATES.length];
    const brand = brandList.find((b) => b.key === tpl.brandKey)!;
    // Pick first connection for that brand
    const platforms: Array<"INSTAGRAM" | "FACEBOOK" | "TIKTOK" | "LINKEDIN"> = ["INSTAGRAM", "TIKTOK", "FACEBOOK", "LINKEDIN"];
    const platform = platforms[i % platforms.length];
    // Connection IDs follow either wk-social-{brand}-{platform} or wk-social-{brand}-{platform}-2
    const connectionId = i % 3 === 0
      ? `wk-social-${tpl.brandKey}-${platform.toLowerCase()}-2`
      : `wk-social-${tpl.brandKey}-${platform.toLowerCase()}`;
    // Need to check the connection actually exists in our seed — fall back to known seeds (BLISS/SHURI/JABARI from 27-content-media)
    const knownConns: Record<string, string> = {
      "wk-social-bliss-ig":         "ig",
      "wk-social-bliss-tk":         "tk",
      "wk-social-bliss-li":         "li",
      "wk-social-shuri-li":         "li",
      "wk-social-jabari-fb":        "fb",
    };
    const baseConnectionId = i % 3 === 0
      ? `wk-social-${tpl.brandKey}-${platform.toLowerCase()}-2`
      : `wk-social-${tpl.brandKey}-${platform === "INSTAGRAM" ? "ig" : platform === "TIKTOK" ? "tk" : platform === "LINKEDIN" ? "li" : "fb"}`;
    const finalConnectionId = (Object.keys(knownConns).includes(baseConnectionId) || baseConnectionId.endsWith("-2")) ? baseConnectionId : connectionId;
    const externalPostId = `${tpl.brandKey}_${platform.toLowerCase()}_post_${i}`;
    const publishedAt = daysAfter(T.now, -((i % 30)));
    const reachBase = platform === "TIKTOK" ? 95_000 : platform === "INSTAGRAM" ? 38_000 : platform === "LINKEDIN" ? 6_500 : 11_000;
    const reach = reachBase + (i * 320);
    const engagementRate = +(0.04 + (i % 7) * 0.012).toFixed(3);
    const likes = Math.round(reach * engagementRate * 0.7);
    const comments = Math.round(reach * engagementRate * 0.06);
    const shares = Math.round(reach * engagementRate * 0.18);
    const id = `wk-post-anubis-${String(i).padStart(3, "0")}`;
    try {
      await prisma.socialPost.upsert({
        where: { connectionId_externalPostId: { connectionId: finalConnectionId, externalPostId } },
        update: {},
        create: {
          id,
          connectionId: finalConnectionId,
          strategyId: brand.id,
          externalPostId,
          content: `${tpl.contentBase} #wakanda #${tpl.brandKey}`,
          publishedAt,
          likes,
          comments,
          shares,
          reach,
          engagementRate,
          sentiment: +(0.5 + (i % 5) * 0.08).toFixed(2),
          createdAt: publishedAt,
        },
      });
      track("SocialPost");
      postCount++;
    } catch {
      // Skip invalid connection ids silently — purge.ts cleans by strategyId
    }
  }

  // ============================================================
  // 6) PressRelease (12) + PressDistribution (36) + PressClipping (18) + MediaContact (6)
  // ============================================================
  const mediaContacts: Array<{ id: string; name: string; outlet: string; email: string; beat: string }> = [
    { id: "wk-mediacontact-01", name: "Adwoa Osei",       outlet: "Vogue Africa",       email: "adwoa@vogueafrica.wk", beat: "Beauty" },
    { id: "wk-mediacontact-02", name: "Babajide Adeola",  outlet: "TechCabal",          email: "babajide@techcabal.wk", beat: "Tech" },
    { id: "wk-mediacontact-03", name: "Sika Mensah",      outlet: "Forbes Africa",      email: "sika@forbesafrica.wk", beat: "Business" },
    { id: "wk-mediacontact-04", name: "Tendai Moyo",      outlet: "African Business",   email: "tendai@africanbusiness.wk", beat: "Business" },
    { id: "wk-mediacontact-05", name: "Awa Diop",         outlet: "Marie Claire Africa", email: "awa@mc-africa.wk", beat: "Lifestyle" },
    { id: "wk-mediacontact-06", name: "Kwame Ofori",      outlet: "BBC Pidgin Wakanda", email: "kwame@bbc.wk", beat: "Culture" },
  ];
  for (const c of mediaContacts) {
    await prisma.mediaContact.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        name: c.name,
        outlet: c.outlet,
        email: c.email,
        beat: c.beat,
        relationshipScore: 0.6 + (mediaContacts.indexOf(c) % 4) * 0.1,
        lastContactedAt: daysAfter(T.now, -10 - (mediaContacts.indexOf(c) * 4)),
      },
    });
    track("MediaContact");
  }

  const PR_TEMPLATES: Array<{ brandKey: string; title: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED" }> = [
    { brandKey: "bliss",     title: "BLISS lance la Heritage Collection", status: "PUBLISHED" },
    { brandKey: "bliss",     title: "Vibranium Glow disponible en avant-première", status: "PUBLISHED" },
    { brandKey: "bliss",     title: "BLISS atteint la classification ICONE en 90 jours", status: "PUBLISHED" },
    { brandKey: "vibranium", title: "Vibranium Tech ouvre l'épargne automatique", status: "PUBLISHED" },
    { brandKey: "vibranium", title: "Partenariat Vibranium Tech × MTN MoMo", status: "DRAFT" },
    { brandKey: "brew",      title: "Wakanda Brew dévoile son brassin de pleine lune", status: "PUBLISHED" },
    { brandKey: "panther",   title: "Panther Athletics ouvre sa flagship Biryongo", status: "DRAFT" },
    { brandKey: "shuri",     title: "Shuri Academy lance le programme IA & Education", status: "PUBLISHED" },
    { brandKey: "shuri",     title: "Hackathon Shuri 2026 : 48h pour réinventer l'éducation", status: "PUBLISHED" },
    { brandKey: "jabari",    title: "Jabari Heritage présente la collection ancestrale", status: "PUBLISHED" },
    { brandKey: "jabari",    title: "Tourisme heritage Jabari : programmation Q3", status: "DRAFT" },
    { brandKey: "bliss",     title: "Lookbook Heritage : retour sur le succès Q1", status: "ARCHIVED" },
  ];

  let distCount = 0;
  let clipCount = 0;
  for (let i = 0; i < PR_TEMPLATES.length; i++) {
    const pr = PR_TEMPLATES[i];
    const brand = brandList.find((b) => b.key === pr.brandKey)!;
    const id = `wk-pressrelease-anubis-${String(i).padStart(2, "0")}`;
    const publishedAt = pr.status === "PUBLISHED" ? daysAfter(T.now, -((i + 5) * 3)) : null;
    await prisma.pressRelease.upsert({
      where: { id },
      update: {},
      create: {
        id,
        strategyId: brand.id,
        title: pr.title,
        content: `# ${pr.title}\n\n${brand.name} annonce une nouvelle étape stratégique. Cf. corps détaillé en pièce jointe.\n\n— Press team Wakanda Digital`,
        status: pr.status,
        publishedAt,
        pillarTags: ["a", "d", "e"] as Prisma.InputJsonValue,
        createdAt: daysAfter(T.now, -((i + 8) * 3)),
      },
    });
    track("PressRelease");

    // 3 distributions per PR
    for (let d = 0; d < 3; d++) {
      const contact = mediaContacts[(i + d) % mediaContacts.length];
      const distId = `wk-pressdist-anubis-${String(distCount).padStart(3, "0")}`;
      const distStatus = pr.status === "PUBLISHED" ? (d === 0 ? "OPENED" : d === 1 ? "DELIVERED" : "READ") : "DRAFT";
      await prisma.pressDistribution.upsert({
        where: { id: distId },
        update: {},
        create: {
          id: distId,
          pressReleaseId: id,
          contactId: contact.id,
          status: distStatus,
          sentAt: pr.status === "PUBLISHED" ? hoursAfter(publishedAt!, d * 2) : null,
          openedAt: distStatus === "OPENED" || distStatus === "READ" ? hoursAfter(publishedAt!, d * 2 + 4) : null,
        },
      });
      track("PressDistribution");
      distCount++;
    }

    // 1-2 clippings per published PR
    if (pr.status === "PUBLISHED") {
      const numClips = i % 3 === 0 ? 2 : 1;
      for (let c = 0; c < numClips; c++) {
        const contact = mediaContacts[(i + c) % mediaContacts.length];
        const clipId = `wk-pressclip-anubis-${String(clipCount).padStart(3, "0")}`;
        await prisma.pressClipping.upsert({
          where: { id: clipId },
          update: {},
          create: {
            id: clipId,
            strategyId: brand.id,
            pressReleaseId: id,
            outlet: contact.outlet,
            url: `https://${contact.outlet.toLowerCase().replace(/\s/g, "")}.wk/wk-${pr.brandKey}-${i}-${c}`,
            sentiment: +(0.7 + (c % 3) * 0.05).toFixed(2),
            reach: 10_000 + (i + c) * 4500,
            publishedAt: hoursAfter(publishedAt!, c * 6 + 12),
          },
        });
        track("PressClipping");
        clipCount++;
      }
    }
  }

  // ============================================================
  // 7) NotificationPreference — 110 (un par user/talent existant)
  // ============================================================
  // Named users (8) + first-batch talents (8) + new creators (100) = 116, but cap at 110.
  const userIdsForPref: string[] = [
    IDS.userAmara, IDS.userShuri, IDS.userNakia, IDS.userOkoye, IDS.userWkabi, IDS.userMbaku, IDS.userTchalla, IDS.userRamonda,
    IDS.talentDA, IDS.talentCopy, IDS.talentPhoto, IDS.talentVideo, IDS.talentCM, IDS.talentIOS, IDS.talentAndroid, IDS.talentUX,
  ];

  // Add 95 creator user IDs (matching the IDs in 35-imhotep-wakeup.ts pattern)
  // We rebuild the same deterministic ID format here.
  const FIRST = ["Adaeze","Kweku","Nia","Kwesi","Akua","Yaw","Adwoa","Kojo","Ama","Kofi","Nneka","Tunde","Folake","Babatunde","Aisha","Ibrahim","Fatima","Hassan","Zainab","Yusuf","Aminata","Moussa","Mariam","Cheikh","Awa","Demba","Sokhna","Pape","Coumba","Amadou","Chiamaka","Obinna","Ngozi","Emeka","Adesua","Femi","Bisi","Tobi","Yemi","Seun","Lerato","Thabo","Naledi","Sipho","Zanele","Khaya","Nomvula","Bongani","Kagiso","Themba","Wangari","Otieno","Akinyi","Onyango","Achieng","Kamau","Wanjiru","Mwangi","Njeri","Kariuki","Tendai","Farai","Tatenda","Chipo","Tafadzwa","Kuda","Rufaro","Tinashe","Vimbai","Tongai","Marieme","Khadidiatou","Boubacar","Astou","Mor","Mame","Codou","Talla","Fary","Birama","Esi","Akosua","Yaa","Adjoa","Akwasi","Abenaa","Akorfa","Sika","Kweku","Kobina","Olamide","Damilola","Ayotunde","Adebayo","Olufemi","Modupe","Bukola","Adekunle","Folasade","Babajide"];
  const LAST = ["Mensah","Afolabi","Okeke","Diop","Toure","Camara","Konate","Bah","Sissoko","Coulibaly","Adebayo","Eze","Nwosu","Okonkwo","Achebe","Soyinka","Olayemi","Ogunyemi","Adesanya","Olawale","Mbeki","Mandela","Sisulu","Tutu","Ramaphosa","Tshabalala","Mokoena","Dlamini","Nkomo","Mthembu","Kamau","Wanjiru","Kiprop","Ondieki","Maathai","Otieno","Wairimu","Ngugi","Achieng","Mutua","Mugabe","Tsvangirai","Chigumba","Sithole","Moyo","Zvomuya","Ncube","Marufu","Chivasa","Bere","Asante","Boateng","Akufo","Owusu","Boakye","Quaye","Sarpong","Antwi","Kuffour","Donkor","Sow","Faye","Sarr","Niang","Wade","Kane","Gueye","Senghor","Ndoye","Thiam","Olukoga","Adeola","Babatunde","Onyeka","Akinwale","Egbuna","Ikenna","Nnamdi","Chukwuemeka","Ifeoma","Mukamana","Niyonzima","Mwenda","Habineza","Uwimana","Murenzi","Iyamulemye","Kayitesi","Niyitegeka","Twagira","Asare","Ofori","Tetteh","Quartey","Lartey","Adjei","Frimpong","Owusu","Tuffour","Boadu"];
  for (let i = 0; i < 100 && userIdsForPref.length < 110; i++) {
    const fn = FIRST[i % FIRST.length];
    const ln = LAST[(i * 7) % LAST.length];
    const slug = `${fn.toLowerCase()}-${ln.toLowerCase()}-${i}`;
    userIdsForPref.push(`wk-user-creator-${slug}`);
  }

  for (const uid of userIdsForPref) {
    const idx = userIdsForPref.indexOf(uid);
    await prisma.notificationPreference.upsert({
      where: { userId: uid },
      update: {},
      create: {
        userId: uid,
        channels: {
          IN_APP: true,
          EMAIL:  idx % 5 !== 4,
          SMS:    idx % 8 === 0,
          PUSH:   idx % 3 !== 2,
        } as Prisma.InputJsonValue,
        quiet: { hours: ["22:00", "07:00"], timezone: "Africa/Douala" } as Prisma.InputJsonValue,
        digestFrequency: idx % 7 === 0 ? "DAILY" : idx % 11 === 0 ? "WEEKLY" : "INSTANT",
      },
    });
    track("NotificationPreference");
  }

  // ============================================================
  // 8) Notifications — 3500 répartis sur 3 jours (≈1167/jour)
  //    Mix de canaux IN_APP/EMAIL/PUSH, lecture progressive (60% read).
  // ============================================================
  const channels: Array<"IN_APP" | "EMAIL" | "SMS" | "PUSH"> = ["IN_APP", "EMAIL", "PUSH", "IN_APP", "IN_APP", "EMAIL", "PUSH", "IN_APP"];
  const NOTIF_TARGET = 3500;
  let notifCount = 0;
  for (let i = 0; i < NOTIF_TARGET; i++) {
    const userId = userIdsForPref[i % userIdsForPref.length];
    const tpl = NOTIF_TITLES[i % NOTIF_TITLES.length];
    const dayOff = -(2 - (i % 3));   // 3 days window: -2, -1, 0
    const hourOff = -(i % 24);
    const createdAt = hoursAfter(daysAfter(T.now, dayOff), hourOff);
    const channel = channels[i % channels.length];
    const isRead = i % 5 < 3;        // 60% read
    const id = `wk-notif-anubis-${String(i).padStart(5, "0")}`;
    await prisma.notification.upsert({
      where: { id },
      update: {},
      create: {
        id,
        userId,
        channel,
        title: tpl.title,
        body: tpl.body,
        link: tpl.link,
        isRead,
        readAt: isRead ? hoursAfter(createdAt, 1 + (i % 6)) : null,
        createdAt,
      },
    });
    track("Notification");
    notifCount++;
  }

  console.log(
    `  [OK] Anubis wake-up: ${oauthRows.length} OAuth, ${adPlatforms.length * brandList.length} ad platforms, ${weeks * adPlatforms.length * brandList.length} perf syncs, ${ampCount} amplifications, ${SUP_CONNS.length} social conns + ${postCount} posts, ${PR_TEMPLATES.length} PR + ${distCount} dist + ${clipCount} clips + ${mediaContacts.length} contacts, ${userIdsForPref.length} prefs, ${notifCount} notifications (≈${Math.round(notifCount / 3)}/jour)`,
  );
}

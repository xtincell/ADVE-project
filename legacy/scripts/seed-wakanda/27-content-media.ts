/**
 * WAKANDA SEED — Content & Media
 *
 * SocialConnection (5), SocialPost (8), MediaPlatformConnection (1),
 * MediaPerformanceSync (2), PressRelease (3), PressDistribution (4),
 * PressClipping (3), MediaContact (3), EditorialArticle (3),
 * EditorialComment (4), TranslationDocument (2), GloryOutput (8),
 * SequenceExecution (3), GuildOrganizationMetric (2)
 */

import type { PrismaClient } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter, hoursAfter } from "./helpers";
import type { WakandaUsers } from "./02-users";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

export async function seedContentMedia(prisma: PrismaClient, brands: Brands, users: WakandaUsers) {

  // ================================================================
  // SOCIAL CONNECTIONS (5)
  // ================================================================
  const connections = [
    { id: "wk-social-bliss-ig", strategyId: brands.bliss.strategy.id, userId: IDS.userAmara, platform: "INSTAGRAM" as const, accountId: "blissbywakanda", accountName: "@blissbywakanda" },
    { id: "wk-social-bliss-tk", strategyId: brands.bliss.strategy.id, userId: IDS.userAmara, platform: "TIKTOK" as const, accountId: "blisswakanda", accountName: "@blisswakanda" },
    { id: "wk-social-bliss-li", strategyId: brands.bliss.strategy.id, userId: IDS.userOkoye, platform: "LINKEDIN" as const, accountId: "bliss-by-wakanda", accountName: "BLISS by Wakanda" },
    { id: "wk-social-shuri-li", strategyId: brands.shuri.strategy.id, userId: IDS.userShuri, platform: "LINKEDIN" as const, accountId: "shuri-academy", accountName: "Shuri Academy" },
    { id: "wk-social-jabari-fb", strategyId: brands.jabari.strategy.id, userId: IDS.userMbaku, platform: "FACEBOOK" as const, accountId: "jabariheritage", accountName: "Jabari Heritage" },
  ];

  for (const conn of connections) {
    await prisma.socialConnection.upsert({
      where: { strategyId_platform_accountId: { strategyId: conn.strategyId, platform: conn.platform, accountId: conn.accountId } },
      update: {},
      create: {
        id: conn.id,
        strategyId: conn.strategyId,
        userId: conn.userId,
        platform: conn.platform,
        accountId: conn.accountId,
        accountName: conn.accountName,
        status: "ACTIVE",
        createdAt: T.socialConnected,
      },
    });
    track("SocialConnection");
  }

  // ================================================================
  // SOCIAL POSTS (8)
  // ================================================================
  const posts = [
    // BLISS (4)
    { id: "wk-post-bliss-01", connectionId: "wk-social-bliss-ig", strategyId: brands.bliss.strategy.id, externalPostId: "ig_heritage_001", content: "14 generations de beaute. Un seul eclat. Decouvrez la Heritage Collection.", publishedAt: T.heritageLive, likes: 4520, comments: 312, shares: 187, reach: 45000, engagementRate: 0.112 },
    { id: "wk-post-bliss-02", connectionId: "wk-social-bliss-tk", strategyId: brands.bliss.strategy.id, externalPostId: "tk_heritage_001", content: "Le secret de beaute de la Reine Bashenga revele. #BLISSHeritage", publishedAt: hoursAfter(T.heritageLive, 3), likes: 12800, comments: 890, shares: 2340, reach: 180000, engagementRate: 0.089 },
    { id: "wk-post-bliss-03", connectionId: "wk-social-bliss-ig", strategyId: brands.bliss.strategy.id, externalPostId: "ig_glow_001", content: "Le vibranium revele votre lumiere. Nouveau Serum Vibranium Glow disponible.", publishedAt: T.glowLaunch, likes: 3200, comments: 245, shares: 156, reach: 38000, engagementRate: 0.095 },
    { id: "wk-post-bliss-04", connectionId: "wk-social-bliss-li", strategyId: brands.bliss.strategy.id, externalPostId: "li_bliss_001", content: "Comment BLISS reinvente la cosmetique premium en Afrique. Retour sur notre parcours depuis janvier.", publishedAt: daysAfter(T.now, -5), likes: 580, comments: 42, shares: 28, reach: 8500, engagementRate: 0.076 },
    // SHURI (2)
    { id: "wk-post-shuri-01", connectionId: "wk-social-shuri-li", strategyId: brands.shuri.strategy.id, externalPostId: "li_shuri_001", content: "Shuri Academy lance son programme IA & Education. Inscriptions ouvertes.", publishedAt: daysAfter(T.now, -15), likes: 320, comments: 28, shares: 45, reach: 5200, engagementRate: 0.075 },
    { id: "wk-post-shuri-02", connectionId: "wk-social-shuri-li", strategyId: brands.shuri.strategy.id, externalPostId: "li_shuri_002", content: "Retour sur notre Tech Meetup IA & Education. 80 participants passionnes.", publishedAt: daysAfter(T.now, -18), likes: 245, comments: 18, shares: 32, reach: 4800, engagementRate: 0.061 },
    // JABARI (2)
    { id: "wk-post-jabari-01", connectionId: "wk-social-jabari-fb", strategyId: brands.jabari.strategy.id, externalPostId: "fb_jabari_001", content: "L'artisanat Jabari, un savoir-faire ancestral transmis depuis des generations.", publishedAt: daysAfter(T.now, -20), likes: 89, comments: 12, shares: 8, reach: 1200, engagementRate: 0.091 },
    { id: "wk-post-jabari-02", connectionId: "wk-social-jabari-fb", strategyId: brands.jabari.strategy.id, externalPostId: "fb_jabari_002", content: "Nouvelle collection de sculptures en bois de montagne. Disponible sur commande.", publishedAt: daysAfter(T.now, -10), likes: 65, comments: 8, shares: 5, reach: 900, engagementRate: 0.087 },
  ];

  for (const p of posts) {
    await prisma.socialPost.upsert({
      where: { connectionId_externalPostId: { connectionId: p.connectionId, externalPostId: p.externalPostId } },
      update: {},
      create: {
        id: p.id,
        connectionId: p.connectionId,
        strategyId: p.strategyId,
        externalPostId: p.externalPostId,
        content: p.content,
        publishedAt: p.publishedAt,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        reach: p.reach,
        engagementRate: p.engagementRate,
        createdAt: p.publishedAt,
      },
    });
    track("SocialPost");
  }

  // ================================================================
  // MEDIA PLATFORM CONNECTION (1 — Meta Ads for BLISS)
  // ================================================================
  await prisma.mediaPlatformConnection.upsert({
    where: { strategyId_platform_accountId: { strategyId: brands.bliss.strategy.id, platform: "META_ADS", accountId: "act_bliss_wk_001" } },
    update: {},
    create: {
      id: "wk-mediaconn-bliss-meta",
      strategyId: brands.bliss.strategy.id,
      platform: "META_ADS",
      accountId: "act_bliss_wk_001",
      status: "ACTIVE",
      lastSyncAt: daysAfter(T.now, -1),
      createdAt: T.socialConnected,
    },
  });
  track("MediaPlatformConnection");

  // ================================================================
  // MEDIA PERFORMANCE SYNC (2 — Jan + Feb for BLISS)
  // ================================================================
  const perfSyncs = [
    { id: "wk-mediaperf-01", period: "2026-01", impressions: 120000, clicks: 4800, conversions: 240, spend: 450000, ctr: 0.04, cpc: 94, cpa: 1875, roas: 2.8 },
    { id: "wk-mediaperf-02", period: "2026-02", impressions: 280000, clicks: 11200, conversions: 560, spend: 850000, ctr: 0.04, cpc: 76, cpa: 1518, roas: 3.5 },
  ];

  for (const ps of perfSyncs) {
    await prisma.mediaPerformanceSync.upsert({
      where: { id: ps.id },
      update: {},
      create: {
        id: ps.id,
        connectionId: "wk-mediaconn-bliss-meta",
        campaignRef: "heritage-collection-meta",
        impressions: ps.impressions,
        clicks: ps.clicks,
        conversions: ps.conversions,
        spend: ps.spend,
        ctr: ps.ctr,
        cpc: ps.cpc,
        cpa: ps.cpa,
        roas: ps.roas,
        period: ps.period,
      },
    });
    track("MediaPerformanceSync");
  }

  // ================================================================
  // MEDIA CONTACTS (3)
  // ================================================================
  const mediaContacts = [
    { id: "wk-mediacontact-01", name: "Adama Diallo", email: "adama@voguewakanda.wk", outlet: "Vogue Wakanda", beat: "Beaute & Lifestyle", country: "Wakanda" },
    { id: "wk-mediacontact-02", name: "Kofi Mensah", email: "kofi@techwakanda.wk", outlet: "Tech Wakanda Daily", beat: "Technologie & Startups", country: "Wakanda" },
    { id: "wk-mediacontact-03", name: "Nia Okafor", email: "nia@lifestylewk.wk", outlet: "Wakanda Lifestyle", beat: "Mode & Culture", country: "Wakanda" },
  ];

  for (const mc of mediaContacts) {
    await prisma.mediaContact.upsert({
      where: { email_outlet: { email: mc.email, outlet: mc.outlet } },
      update: {},
      create: {
        id: mc.id,
        name: mc.name,
        email: mc.email,
        outlet: mc.outlet,
        beat: mc.beat,
        country: mc.country,
        createdAt: T.teamAssembled,
      },
    });
    track("MediaContact");
  }

  // ================================================================
  // PRESS RELEASES (3: 2 BLISS + 1 SHURI)
  // ================================================================
  const pressReleases = [
    { id: "wk-pr-bliss-01", strategyId: brands.bliss.strategy.id, title: "BLISS by Wakanda lance la Heritage Collection", content: "BLISS by Wakanda annonce le lancement de la Heritage Collection, une gamme de soins premium inspiree de 14 generations de beaute wakandaise. La collection comprend 5 produits phares dont le Serum Vibranium Glow.", status: "PUBLISHED", publishedAt: T.heritageLive },
    { id: "wk-pr-bliss-02", strategyId: brands.bliss.strategy.id, title: "BLISS atteint le score ICONE — premiere marque wakandaise", content: "BLISS by Wakanda devient la premiere marque de cosmetiques a atteindre le score maximal de 200/200 sur l'echelle ADVERTIS, obtenant la classification ICONE.", status: "PUBLISHED", publishedAt: T.scoresValidated },
    { id: "wk-pr-shuri-01", strategyId: brands.shuri.strategy.id, title: "Shuri Academy ouvre ses inscriptions pour le programme IA", content: "Shuri Academy annonce l'ouverture des inscriptions pour son nouveau programme d'intelligence artificielle appliquee, destine aux jeunes professionnels africains.", status: "PUBLISHED", publishedAt: daysAfter(T.now, -15) },
  ];

  for (const pr of pressReleases) {
    await prisma.pressRelease.upsert({
      where: { id: pr.id },
      update: {},
      create: {
        id: pr.id,
        strategyId: pr.strategyId,
        title: pr.title,
        content: pr.content,
        status: pr.status,
        publishedAt: pr.publishedAt,
        createdAt: daysAfter(pr.publishedAt!, -5),
      },
    });
    track("PressRelease");
  }

  // ================================================================
  // PRESS DISTRIBUTIONS (4: 3 BLISS + 1 SHURI)
  // ================================================================
  const distributions = [
    { id: "wk-pdist-01", pressReleaseId: "wk-pr-bliss-01", contactId: "wk-mediacontact-01", status: "OPENED", sentAt: T.heritageLive, openedAt: hoursAfter(T.heritageLive, 2) },
    { id: "wk-pdist-02", pressReleaseId: "wk-pr-bliss-01", contactId: "wk-mediacontact-03", status: "SENT", sentAt: T.heritageLive, openedAt: null },
    { id: "wk-pdist-03", pressReleaseId: "wk-pr-bliss-02", contactId: "wk-mediacontact-01", status: "OPENED", sentAt: T.scoresValidated, openedAt: hoursAfter(T.scoresValidated, 4) },
    { id: "wk-pdist-04", pressReleaseId: "wk-pr-shuri-01", contactId: "wk-mediacontact-02", status: "OPENED", sentAt: daysAfter(T.now, -15), openedAt: daysAfter(T.now, -14) },
  ];

  for (const dist of distributions) {
    await prisma.pressDistribution.upsert({
      where: { id: dist.id },
      update: {},
      create: {
        id: dist.id,
        pressReleaseId: dist.pressReleaseId,
        contactId: dist.contactId,
        status: dist.status,
        sentAt: dist.sentAt,
        openedAt: dist.openedAt,
        createdAt: dist.sentAt,
      },
    });
    track("PressDistribution");
  }

  // ================================================================
  // PRESS CLIPPINGS (3: 2 BLISS + 1 SHURI)
  // ================================================================
  const clippings = [
    { id: "wk-clip-01", strategyId: brands.bliss.strategy.id, pressReleaseId: "wk-pr-bliss-01", outlet: "Vogue Wakanda", title: "BLISS Heritage Collection — le luxe beaute made in Wakanda", reach: 85000, sentiment: 0.92, publishedAt: daysAfter(T.heritageLive, 3) },
    { id: "wk-clip-02", strategyId: brands.bliss.strategy.id, pressReleaseId: "wk-pr-bliss-02", outlet: "Wakanda Lifestyle", title: "La premiere marque ICONE du Wakanda", reach: 42000, sentiment: 0.88, publishedAt: daysAfter(T.scoresValidated, 5) },
    { id: "wk-clip-03", strategyId: brands.shuri.strategy.id, pressReleaseId: "wk-pr-shuri-01", outlet: "Tech Wakanda Daily", title: "Shuri Academy mise sur l'IA pour democratiser l'education", reach: 28000, sentiment: 0.85, publishedAt: daysAfter(T.now, -12) },
  ];

  for (const clip of clippings) {
    await prisma.pressClipping.upsert({
      where: { id: clip.id },
      update: {},
      create: {
        id: clip.id,
        strategyId: clip.strategyId,
        pressReleaseId: clip.pressReleaseId,
        outlet: clip.outlet,
        title: clip.title,
        reach: clip.reach,
        sentiment: clip.sentiment,
        publishedAt: clip.publishedAt,
        createdAt: clip.publishedAt,
      },
    });
    track("PressClipping");
  }

  // ================================================================
  // EDITORIAL ARTICLES (3: 2 BLISS + 1 SHURI)
  // ================================================================
  const articles = [
    { id: "wk-article-01", title: "Les secrets du vibranium pour votre peau", slug: "secrets-vibranium-peau", content: "Le vibranium, longtemps reserve aux technologies de pointe, trouve une nouvelle vie dans la cosmetique. BLISS by Wakanda a developpe un procede unique d'infusion qui preserve les proprietes regenerantes de ce minerai legendaire.", author: "Aya Mensah", category: "BEAUTE", isPublished: true, publishedAt: daysAfter(T.heritageLive, 5) },
    { id: "wk-article-02", title: "Heritage Collection : le making-of", slug: "heritage-collection-making-of", content: "De la conception a la production, plongee dans les coulisses de la Heritage Collection. Comment l'equipe BLISS a transforme 14 generations de savoir-faire en une gamme de soins premium.", author: "Aya Mensah", category: "BEHIND_THE_SCENES", isPublished: true, publishedAt: daysAfter(T.heritagePost, 3) },
    { id: "wk-article-03", title: "L'IA au service de l'education africaine", slug: "ia-education-africaine", content: "Shuri Academy explore comment l'intelligence artificielle peut personnaliser l'apprentissage et rendre l'education de qualite accessible a tous les jeunes Africains.", author: "Shuri Udaku", category: "EDUCATION", isPublished: true, publishedAt: daysAfter(T.now, -10) },
  ];

  for (const art of articles) {
    await prisma.editorialArticle.upsert({
      where: { id: art.id },
      update: {},
      create: {
        id: art.id,
        title: art.title,
        slug: art.slug,
        content: art.content,
        author: art.author,
        category: art.category,
        isPublished: art.isPublished,
        publishedAt: art.publishedAt,
        createdAt: daysAfter(art.publishedAt!, -3),
      },
    });
    track("EditorialArticle");
  }

  // ================================================================
  // EDITORIAL COMMENTS (4)
  // ================================================================
  const editComments = [
    { id: "wk-editcomm-01", articleId: "wk-article-01", authorId: IDS.userAmara, content: "Merci Aya pour cet article magnifique ! La section sur le procede d'infusion est passionnante." },
    { id: "wk-editcomm-02", articleId: "wk-article-01", authorId: IDS.userOkoye, content: "Les retours des lecteurs sont excellents. On devrait faire une serie d'articles sur les ingredients." },
    { id: "wk-editcomm-03", articleId: "wk-article-02", authorId: IDS.userNakia, content: "Le making-of a genere beaucoup d'engagement sur les reseaux. Format a repliquer." },
    { id: "wk-editcomm-04", articleId: "wk-article-03", authorId: IDS.userShuri, content: "J'aimerais ajouter une section sur les resultats concrets de nos premiers etudiants IA." },
  ];

  for (const ec of editComments) {
    await prisma.editorialComment.upsert({
      where: { id: ec.id },
      update: {},
      create: {
        id: ec.id,
        articleId: ec.articleId,
        authorId: ec.authorId,
        content: ec.content,
        createdAt: daysAfter(T.now, -5),
      },
    });
    track("EditorialComment");
  }

  // ================================================================
  // TRANSLATION DOCUMENTS (2)
  // ================================================================
  await prisma.translationDocument.upsert({
    where: { id: "wk-trans-01" },
    update: {},
    create: {
      id: "wk-trans-01",
      sourceLocale: "fr-WK",
      targetLocale: "en-WK",
      sourceText: "Revelee. Pas inventee. BLISS by Wakanda — la beaute ancestrale reinventee pour la femme moderne.",
      translatedText: "Revealed. Not invented. BLISS by Wakanda — ancestral beauty reimagined for the modern woman.",
      context: "Tagline et description marque pour marche anglophone",
      status: "COMPLETED",
      translatedAt: T.heritageLive,
      createdAt: daysAfter(T.heritageLive, -5),
    },
  });
  track("TranslationDocument");

  await prisma.translationDocument.upsert({
    where: { id: "wk-trans-02" },
    update: {},
    create: {
      id: "wk-trans-02",
      sourceLocale: "fr-WK",
      targetLocale: "en-WK",
      sourceText: "Le vibranium revele votre lumiere. Decouvrez le Serum Vibranium Glow — 15,000 XAF.",
      translatedText: null,
      context: "Campagne Vibranium Glow pour marche international",
      status: "PENDING",
      createdAt: T.glowLaunch,
    },
  });
  track("TranslationDocument");

  // ================================================================
  // GLORY OUTPUTS (8 for BLISS)
  // ================================================================
  const gloryOutputs = [
    { id: "wk-glory-01", toolSlug: "brand-story-generator", output: { title: "L'histoire BLISS", content: "Nee de 14 generations de savoir-faire...", format: "NARRATIVE" } },
    { id: "wk-glory-02", toolSlug: "tagline-generator", output: { primary: "Revelee. Pas inventee.", alternatives: ["La beaute est un heritage.", "Le secret wakandais."] } },
    { id: "wk-glory-03", toolSlug: "persona-builder", output: { name: "Aissatou", age: 28, city: "Biryongo", profession: "Cadre marketing" } },
    { id: "wk-glory-04", toolSlug: "social-caption-generator", output: { platform: "Instagram", caption: "14 generations. Un seul eclat.", hashtags: ["#BLISSHeritage", "#WakandaBeauty"] } },
    { id: "wk-glory-05", toolSlug: "kv-brief-generator", output: { concept: "Heritage meets modern luxury", mood: "Mystique, chaleureux, premium" } },
    { id: "wk-glory-06", toolSlug: "email-sequence-builder", output: { sequence: "Heritage Launch", emails: 5, openRate: 0.42 } },
    { id: "wk-glory-07", toolSlug: "competitor-analyzer", output: { competitors: 3, positioning: "Premium heritage naturel" } },
    { id: "wk-glory-08", toolSlug: "pricing-optimizer", output: { recommended: 15000, margin: 0.68, elasticity: -0.35 } },
  ];

  for (const g of gloryOutputs) {
    await prisma.gloryOutput.upsert({
      where: { id: g.id },
      update: {},
      create: {
        id: g.id,
        strategyId: brands.bliss.strategy.id,
        toolSlug: g.toolSlug,
        output: g.output as Prisma.InputJsonValue,
        createdAt: T.notoriaStage1,
      },
    });
    track("GloryOutput");
  }

  // ================================================================
  // SEQUENCE EXECUTIONS (3 for BLISS)
  // ================================================================
  const sequences = [
    { id: "wk-seqexec-01", sequenceKey: "BRAND", tier: 3, status: "COMPLETED", qualityScore: 0.92 },
    { id: "wk-seqexec-02", sequenceKey: "KV", tier: 2, status: "COMPLETED", qualityScore: 0.88 },
    { id: "wk-seqexec-03", sequenceKey: "SOCIAL", tier: 1, status: "COMPLETED", qualityScore: 0.85 },
  ];

  for (const seq of sequences) {
    await prisma.sequenceExecution.upsert({
      where: { id: seq.id },
      update: {},
      create: {
        id: seq.id,
        strategyId: brands.bliss.strategy.id,
        sequenceKey: seq.sequenceKey,
        tier: seq.tier,
        status: seq.status,
        stepResults: [{ step: 1, status: "COMPLETED" }, { step: 2, status: "COMPLETED" }] as Prisma.InputJsonValue,
        qualityScore: seq.qualityScore,
        totalDurationMs: 4500,
        approval: "ACCEPTED",
        createdAt: T.notoriaStage2,
      },
    });
    track("SequenceExecution");
  }

  // ================================================================
  // GUILD ORGANIZATION METRICS (2: Jan + Mar)
  // ================================================================
  const guildMetrics = [
    { id: "wk-guildmet-01", period: "2026-01", totalMissions: 3, completedMissions: 2, avgQcScore: 8.5, firstPassRate: 0.67, revenue: 950000 },
    { id: "wk-guildmet-02", period: "2026-03", totalMissions: 8, completedMissions: 6, avgQcScore: 8.8, firstPassRate: 0.83, revenue: 2350000 },
  ];

  for (const gm of guildMetrics) {
    await prisma.guildOrganizationMetric.upsert({
      where: { id: gm.id },
      update: {},
      create: {
        id: gm.id,
        guildOrganizationId: IDS.guild,
        period: gm.period,
        totalMissions: gm.totalMissions,
        completedMissions: gm.completedMissions,
        avgQcScore: gm.avgQcScore,
        firstPassRate: gm.firstPassRate,
        revenue: gm.revenue,
        currency: "XAF",
        measuredAt: new Date(`${gm.period}-28`),
      },
    });
    track("GuildOrganizationMetric");
  }

  console.log("[OK] Content & Media: 5 social, 8 posts, 1 media conn, 2 perf sync, 3 PR, 4 distrib, 3 clips, 3 contacts, 3 articles, 4 comments, 2 translations, 8 glory, 3 sequences, 2 guild metrics");
}

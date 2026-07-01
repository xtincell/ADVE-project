/**
 * WAKANDA SEED — BLISS by Wakanda (200/200 ICONE)
 *
 * Hero brand with 3 months of live activity history.
 * Creates: Strategy, 8 Pillars (25/25 each), PillarVersions,
 * ScoreSnapshots, DevotionSnapshots, CultIndexSnapshots,
 * Drivers, BrandVariables, BrandAssets, BrandDataSources,
 * BrandOSConfig, VariableStoreConfig.
 *
 * Cross-brand data (campaigns, missions, etc.) is in Phase 3 files.
 */

import type { PrismaClient, Operator, Client, Strategy } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { IDS, T } from "./constants";
import { track, daysAfter } from "./helpers";
import { blissPillarA, blissPillarD } from "./data/bliss-pillars";
import { blissPillarV, blissPillarE, blissPillarR, blissPillarT, blissPillarI, blissPillarS } from "./data/bliss-pillars-rtis";
import type { WakandaUsers } from "./02-users";

export interface BlissBrand {
  strategy: Strategy;
}

export async function seedBliss(
  prisma: PrismaClient,
  operator: Operator,
  clients: Record<string, Client>,
  users: WakandaUsers,
): Promise<BlissBrand> {
  console.log("\n  ── BLISS by Wakanda (200/200 ICONE) ──");

  // ================================================================
  // STRATEGY
  // ================================================================
  const strategy = await prisma.strategy.upsert({
    where: { id: IDS.stratBliss },
    update: {},
    create: {
      id: IDS.stratBliss,
      name: "BLISS by Wakanda",
      description: "Marque premium de cosmetiques et skincare infuses au vibranium. Recettes ancestrales wakandaises transformees en luxe pan-africain. App mobile pour routines personnalisees.",
      userId: users.amara.id,
      operatorId: operator.id,
      clientId: IDS.clientBliss,
      status: "ACTIVE",
      isDummy: true,
      advertis_vector: {
        a: 25.0, d: 25.0, v: 25.0, e: 25.0,
        r: 25.0, t: 25.0, i: 25.0, s: 25.0,
        composite: 200.0, confidence: 0.97,
      } as Prisma.InputJsonValue,
      businessContext: {
        businessModel: "DIRECT_TO_CONSUMER",
        businessModelSubtype: "Premium DTC + App SaaS — cosmetiques vibranium-infused",
        economicModels: ["VENTE_DIRECTE", "ABONNEMENT", "MARKETPLACE"],
        positioningArchetype: "PREMIUM",
        salesChannel: "HYBRID",
        positionalGoodFlag: true,
        premiumScope: "FULL",
        bootState: "COMPLETED",
        freeLayer: {
          whatIsFree: "Coffret Decouverte a 12,000 XAF (echantillons 5 produits) + acces basique BLISS App (routines generiques, suivi de peau basique).",
          whatIsPaid: "Gamme complete (Serum 15K, Creme 22K, Masque 18K, Huile 28K) + BLISS App Premium (2,500 XAF/mois : routines personnalisees IA, suivi de peau avance, achat direct, contenus exclusifs).",
          conversionLever: "Le Coffret Decouverte est un micro-engagement qui cree l'habitude sensorielle. 72% des acheteuses du coffret commandent un produit plein format dans les 30 jours.",
        },
        country: "Wakanda",
        sector: "Cosmetiques & Skincare Premium",
      } as Prisma.InputJsonValue,
      notoriaPipeline: {
        currentStage: 3,
        stages: [
          { type: "ADVE_INTAKE", status: "COMPLETED", completedAt: "2026-01-20T11:00:00Z" },
          { type: "ADVE_UPDATE", status: "COMPLETED", completedAt: "2026-01-29T10:00:00Z" },
          { type: "I_GENERATION", status: "COMPLETED", completedAt: "2026-02-05T10:00:00Z" },
          { type: "S_SYNTHESIS", status: "COMPLETED", completedAt: "2026-03-12T10:00:00Z" },
        ],
      } as Prisma.InputJsonValue,
      createdAt: T.intakeConverted,
    },
  });
  track("Strategy");

  // ================================================================
  // 8 PILLARS — All at 25/25 VALIDATED
  // ================================================================
  const pillarDefs: { key: string; content: unknown; confidence: number; createdAt: Date }[] = [
    { key: "a", content: blissPillarA, confidence: 0.98, createdAt: T.bootAD },
    { key: "d", content: blissPillarD, confidence: 0.97, createdAt: T.bootAD },
    { key: "v", content: blissPillarV, confidence: 0.96, createdAt: T.bootVE },
    { key: "e", content: blissPillarE, confidence: 0.97, createdAt: T.bootVE },
    { key: "r", content: blissPillarR, confidence: 0.95, createdAt: T.rtisCascade },
    { key: "t", content: blissPillarT, confidence: 0.94, createdAt: T.rtisCascade },
    { key: "i", content: blissPillarI, confidence: 0.93, createdAt: T.notoriaStage2 },
    { key: "s", content: blissPillarS, confidence: 0.95, createdAt: T.notoriaStage3 },
  ];

  for (const def of pillarDefs) {
    const pillarId = `wk-pillar-bliss-${def.key}`;
    await prisma.pillar.upsert({
      where: { id: pillarId },
      update: {},
      create: {
        id: pillarId,
        key: def.key,
        strategyId: strategy.id,
        content: def.content as Prisma.InputJsonValue,
        confidence: def.confidence,
        validationStatus: "VALIDATED",
        currentVersion: def.key === "a" || def.key === "d" ? 4 : def.key === "v" || def.key === "e" ? 3 : 1,
        createdAt: def.createdAt,
      },
    });
    track("Pillar");
  }
  console.log("  [OK] 8 pillars created (all 25/25 VALIDATED)");

  // ================================================================
  // PILLAR VERSIONS — Showing organic progression
  // ================================================================
  const versionDefs = [
    // Pillar A: 4 versions (boot → vault reco → notoria reco → final validation)
    { pillarId: "wk-pillar-bliss-a", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence — questionnaire initial", createdAt: T.bootAD },
    { pillarId: "wk-pillar-bliss-a", version: 2, author: "MESTOR", reason: "Vault Enrichment — archetype confirme, noyau enrichi", createdAt: T.recosReviewed },
    { pillarId: "wk-pillar-bliss-a", version: 3, author: "MESTOR", reason: "Notoria ADVE_UPDATE — hero's journey affine, valeurs consolidees", createdAt: T.notoriaStage1 },
    { pillarId: "wk-pillar-bliss-a", version: 4, author: "OPERATOR", reason: "Validation finale — contenu approuve par Amara Udaku", createdAt: T.scoresValidated },
    // Pillar D: 4 versions
    { pillarId: "wk-pillar-bliss-d", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence — personas et positionnement initial", createdAt: T.bootAD },
    { pillarId: "wk-pillar-bliss-d", version: 2, author: "MESTOR", reason: "Vault Enrichment — persona Aissatou enrichi, concurrent ajoute", createdAt: T.recosReviewed },
    { pillarId: "wk-pillar-bliss-d", version: 3, author: "MESTOR", reason: "Notoria ADVE_UPDATE — tone of voice affine, assets linguistiques completes", createdAt: T.notoriaStage1 },
    { pillarId: "wk-pillar-bliss-d", version: 4, author: "OPERATOR", reason: "Validation finale — positionnement verrouille", createdAt: T.scoresValidated },
    // Pillar V: 3 versions
    { pillarId: "wk-pillar-bliss-v", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence — catalogue produits et pricing initial", createdAt: T.bootVE },
    { pillarId: "wk-pillar-bliss-v", version: 2, author: "MESTOR", reason: "Notoria ADVE_UPDATE — unit economics valides par R+T", createdAt: T.notoriaStage1 },
    { pillarId: "wk-pillar-bliss-v", version: 3, author: "OPERATOR", reason: "Validation finale — pricing confirme", createdAt: T.scoresValidated },
    // Pillar E: 3 versions
    { pillarId: "wk-pillar-bliss-e", version: 1, author: "AUTO_FILLER", reason: "Boot Sequence — touchpoints et rituels definis", createdAt: T.bootVE },
    { pillarId: "wk-pillar-bliss-e", version: 2, author: "MESTOR", reason: "Notoria ADVE_UPDATE — AARRR funnel enrichi, KPIs calibres", createdAt: T.notoriaStage1 },
    { pillarId: "wk-pillar-bliss-e", version: 3, author: "OPERATOR", reason: "Validation finale — experience client verrouillee", createdAt: T.scoresValidated },
    // R, T, I, S: 1 version each
    { pillarId: "wk-pillar-bliss-r", version: 1, author: "PROTOCOLE_R", reason: "RTIS Cascade — diagnostic risques genere depuis ADVE", createdAt: T.rtisCascade },
    { pillarId: "wk-pillar-bliss-t", version: 1, author: "PROTOCOLE_T", reason: "RTIS Cascade — realite marche generee depuis ADVE+R", createdAt: T.rtisCascade },
    { pillarId: "wk-pillar-bliss-i", version: 1, author: "PROTOCOLE_I", reason: "Notoria I_GENERATION — catalogue actions genere", createdAt: T.notoriaStage2 },
    { pillarId: "wk-pillar-bliss-s", version: 1, author: "PROTOCOLE_S", reason: "Notoria S_SYNTHESIS — roadmap strategique synthetisee", createdAt: T.notoriaStage3 },
  ];

  for (const v of versionDefs) {
    await prisma.pillarVersion.upsert({
      where: { id: `${v.pillarId}-v${v.version}` },
      update: {},
      create: {
        id: `${v.pillarId}-v${v.version}`,
        pillarId: v.pillarId,
        version: v.version,
        content: {} as Prisma.InputJsonValue,
        diff: { type: v.version === 1 ? "INITIAL" : "MERGE_DEEP", summary: v.reason } as Prisma.InputJsonValue,
        author: v.author,
        reason: v.reason,
        createdAt: v.createdAt,
      },
    });
    track("PillarVersion");
  }
  console.log(`  [OK] ${versionDefs.length} pillar versions (organic progression)`);

  // ================================================================
  // SCORE SNAPSHOTS — 8 points showing progression to 200/200
  // ================================================================
  const scoreHistory = [
    { date: T.intake, composite: 142, a: 18, d: 16, v: 17, e: 18, r: 15, t: 14, i: 12, s: 11, confidence: 0.65 },
    { date: T.bootVE, composite: 155, a: 20, d: 19, v: 19, e: 20, r: 16, t: 15, i: 13, s: 12, confidence: 0.72 },
    { date: T.rtisCascade, composite: 168, a: 21, d: 20, v: 20, e: 21, r: 18, t: 17, i: 14, s: 13, confidence: 0.78 },
    { date: T.recosReviewed, composite: 172, a: 22, d: 21, v: 20, e: 21, r: 19, t: 18, i: 15, s: 14, confidence: 0.80 },
    { date: T.notoriaStage1, composite: 178, a: 23, d: 22, v: 21, e: 22, r: 20, t: 19, i: 16, s: 15, confidence: 0.83 },
    { date: T.notoriaStage2, composite: 184, a: 23, d: 23, v: 22, e: 23, r: 21, t: 20, i: 21, s: 16, confidence: 0.87 },
    { date: T.notoriaStage3, composite: 192, a: 24, d: 24, v: 23, e: 24, r: 23, t: 23, i: 23, s: 22, confidence: 0.92 },
    { date: T.scoresValidated, composite: 200, a: 25, d: 25, v: 25, e: 25, r: 25, t: 25, i: 25, s: 25, confidence: 0.97 },
  ];

  for (let i = 0; i < scoreHistory.length; i++) {
    const s = scoreHistory[i];
    await prisma.scoreSnapshot.upsert({
      where: { id: `wk-score-bliss-${i}` },
      update: {},
      create: {
        id: `wk-score-bliss-${i}`,
        strategyId: strategy.id,
        advertis_vector: { a: s.a, d: s.d, v: s.v, e: s.e, r: s.r, t: s.t, i: s.i, s: s.s, composite: s.composite, confidence: s.confidence } as Prisma.InputJsonValue,
        classification: s.composite <= 80 ? "ZOMBIE" : s.composite <= 120 ? "ORDINAIRE" : s.composite <= 160 ? "FORTE" : s.composite <= 180 ? "CULTE" : "ICONE",
        confidence: s.confidence,
        measuredAt: s.date,
      },
    });
    track("ScoreSnapshot");
  }
  console.log(`  [OK] ${scoreHistory.length} score snapshots (142→200 progression)`);

  // ================================================================
  // DEVOTION SNAPSHOTS — Monthly progression
  // ================================================================
  const devotionHistory = [
    { date: new Date("2026-01-31"), spectateurs: 15000, interesses: 3000, participants: 800, engages: 120, ambassadeurs: 5, evangelistes: 0 },
    { date: new Date("2026-02-28"), spectateurs: 28000, interesses: 6000, participants: 1800, engages: 300, ambassadeurs: 15, evangelistes: 2 },
    { date: new Date("2026-03-31"), spectateurs: 45000, interesses: 12000, participants: 4500, engages: 800, ambassadeurs: 45, evangelistes: 8 },
    { date: T.now, spectateurs: 52000, interesses: 15000, participants: 5800, engages: 1200, ambassadeurs: 65, evangelistes: 12 },
  ];

  for (let i = 0; i < devotionHistory.length; i++) {
    const dv = devotionHistory[i];
    const total = dv.spectateurs + dv.interesses + dv.participants + dv.engages + dv.ambassadeurs + dv.evangelistes;
    await prisma.devotionSnapshot.upsert({
      where: { id: `wk-devotion-bliss-${i}` },
      update: {},
      create: {
        id: `wk-devotion-bliss-${i}`,
        strategyId: strategy.id,
        spectateur: dv.spectateurs,
        interesse: dv.interesses,
        participant: dv.participants,
        engage: dv.engages,
        ambassadeur: dv.ambassadeurs,
        evangeliste: dv.evangelistes,
        devotionScore: total > 0 ? ((dv.engages + dv.ambassadeurs * 2 + dv.evangelistes * 3) / total) * 100 : 0,
        measuredAt: dv.date,
      },
    });
    track("DevotionSnapshot");
  }

  // ================================================================
  // CULT INDEX SNAPSHOTS — Progression
  // ================================================================
  const cultHistory = [
    { date: new Date("2026-01-31"), index: 45, breakdown: { authenticity: 72, community: 35, ritual: 28, mythology: 52, exclusivity: 38 } },
    { date: new Date("2026-02-28"), index: 62, breakdown: { authenticity: 82, community: 55, ritual: 48, mythology: 65, exclusivity: 58 } },
    { date: new Date("2026-03-31"), index: 78, breakdown: { authenticity: 92, community: 72, ritual: 68, mythology: 78, exclusivity: 75 } },
  ];

  for (let i = 0; i < cultHistory.length; i++) {
    const ci = cultHistory[i];
    await prisma.cultIndexSnapshot.upsert({
      where: { id: `wk-cult-bliss-${i}` },
      update: {},
      create: {
        id: `wk-cult-bliss-${i}`,
        strategyId: strategy.id,
        engagementDepth: ci.breakdown.authenticity / 100,
        superfanVelocity: ci.breakdown.community / 100,
        communityCohesion: ci.breakdown.community / 100,
        brandDefenseRate: ci.breakdown.mythology / 100,
        ugcGenerationRate: ci.breakdown.exclusivity / 100,
        ritualAdoption: ci.breakdown.ritual / 100,
        evangelismScore: ci.breakdown.exclusivity / 100,
        compositeScore: ci.index,
        tier: ci.index >= 70 ? "STRONG" : ci.index >= 50 ? "GROWING" : "EMERGING",
        measuredAt: ci.date,
      },
    });
    track("CultIndexSnapshot");
  }

  // ================================================================
  // DRIVERS — 8 channels configured
  // ================================================================
  const driverDefs = [
    { id: "wk-driver-bliss-instagram", name: "Instagram BLISS", channel: "INSTAGRAM" as const, channelType: "DIGITAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-bliss-tiktok", name: "TikTok BLISS", channel: "TIKTOK" as const, channelType: "DIGITAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-bliss-linkedin", name: "LinkedIn BLISS", channel: "LINKEDIN" as const, channelType: "DIGITAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-bliss-ooh", name: "OOH Biryongo", channel: "OOH" as const, channelType: "PHYSICAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-bliss-event", name: "Events BLISS", channel: "EVENT" as const, channelType: "EXPERIENTIAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-bliss-video", name: "Video Content", channel: "VIDEO" as const, channelType: "MEDIA" as const, status: "ACTIVE" as const },
    { id: "wk-driver-bliss-print", name: "Print & Packaging", channel: "PRINT" as const, channelType: "PHYSICAL" as const, status: "ACTIVE" as const },
    { id: "wk-driver-bliss-app", name: "BLISS App Mobile", channel: "CUSTOM" as const, channelType: "DIGITAL" as const, status: "ACTIVE" as const },
  ];

  for (const drv of driverDefs) {
    await prisma.driver.upsert({
      where: { id: drv.id },
      update: {},
      create: {
        id: drv.id,
        strategyId: strategy.id,
        name: drv.name,
        channel: drv.channel,
        channelType: drv.channelType,
        status: drv.status,
        formatSpecs: {} as Prisma.InputJsonValue,
        constraints: {} as Prisma.InputJsonValue,
        briefTemplate: {} as Prisma.InputJsonValue,
        qcCriteria: {} as Prisma.InputJsonValue,
        pillarPriority: {} as Prisma.InputJsonValue,
        createdAt: T.driversConfigured,
      },
    });
    track("Driver");
  }

  // ================================================================
  // BRAND VARIABLES — 35 design tokens
  // ================================================================
  const variableDefs = [
    { key: "color.primary", value: "#1A0A2E", category: "color" },
    { key: "color.secondary", value: "#C9A96E", category: "color" },
    { key: "color.accent", value: "#7C3AED", category: "color" },
    { key: "color.background", value: "#0D0015", category: "color" },
    { key: "color.text", value: "#F5F0EB", category: "color" },
    { key: "color.surface", value: "#1E1030", category: "color" },
    { key: "color.success", value: "#10B981", category: "color" },
    { key: "color.warning", value: "#F59E0B", category: "color" },
    { key: "font.heading", value: "Playfair Display", category: "typography" },
    { key: "font.body", value: "Jost", category: "typography" },
    { key: "font.mono", value: "Space Mono", category: "typography" },
    { key: "font.size.base", value: "16px", category: "typography" },
    { key: "font.size.h1", value: "3.5rem", category: "typography" },
    { key: "spacing.base", value: "8px", category: "spacing" },
    { key: "spacing.section", value: "80px", category: "spacing" },
    { key: "radius.base", value: "12px", category: "shape" },
    { key: "radius.button", value: "8px", category: "shape" },
    { key: "voice.tonality", value: "luxueux-mystique-chaleureux", category: "brand" },
    { key: "voice.register", value: "soutenu-poetique", category: "brand" },
    { key: "voice.forbidden", value: "chimique,artificiel,anti-age,vieux", category: "brand" },
    { key: "tagline.primary", value: "Revelee. Pas inventee.", category: "copy" },
    { key: "tagline.secondary", value: "Le secret de la beaute eternelle wakandaise.", category: "copy" },
    { key: "tagline.campaign.heritage", value: "14 generations. Un seul eclat.", category: "copy" },
    { key: "tagline.campaign.glow", value: "Le vibranium revele votre lumiere.", category: "copy" },
    { key: "social.handle.instagram", value: "@blissbywakanda", category: "social" },
    { key: "social.handle.tiktok", value: "@blisswakanda", category: "social" },
    { key: "social.handle.linkedin", value: "bliss-by-wakanda", category: "social" },
    { key: "product.hero", value: "Serum Vibranium Glow", category: "product" },
    { key: "product.hero.price", value: "15000", category: "product" },
    { key: "product.range.name", value: "Vibranium Skincare Collection", category: "product" },
    { key: "market.currency", value: "XAF", category: "market" },
    { key: "market.country", value: "Wakanda", category: "market" },
    { key: "market.region", value: "Afrique Centrale", category: "market" },
    { key: "app.name", value: "BLISS App", category: "product" },
    { key: "app.price.monthly", value: "2500", category: "product" },
  ];

  for (const v of variableDefs) {
    const varId = `wk-var-bliss-${v.key.replace(/\./g, "-")}`;
    await prisma.brandVariable.upsert({
      where: { id: varId },
      update: {},
      create: {
        id: varId,
        strategyId: strategy.id,
        key: v.key,
        value: v.value,
        category: v.category,
        createdAt: T.driversConfigured,
      },
    });
    track("BrandVariable");
  }

  // ================================================================
  // BRAND ASSETS — 8 key assets
  // ================================================================
  const assetDefs = [
    { id: "wk-asset-bliss-logo", name: "Logo BLISS", type: "LOGO", url: "/demo/bliss/logo.svg" },
    { id: "wk-asset-bliss-charte", name: "Charte graphique BLISS", type: "GUIDELINE", url: "/demo/bliss/charte.pdf" },
    { id: "wk-asset-bliss-kv-heritage", name: "KV Heritage Collection", type: "KEY_VISUAL", url: "/demo/bliss/kv-heritage.jpg" },
    { id: "wk-asset-bliss-kv-glow", name: "KV Vibranium Glow", type: "KEY_VISUAL", url: "/demo/bliss/kv-glow.jpg" },
    { id: "wk-asset-bliss-teaser", name: "Video Teaser Heritage", type: "VIDEO", url: "/demo/bliss/teaser.mp4" },
    { id: "wk-asset-bliss-packshot", name: "Packshot Serum", type: "PACKSHOT", url: "/demo/bliss/packshot-serum.jpg" },
    { id: "wk-asset-bliss-appicon", name: "BLISS App Icon", type: "ICON", url: "/demo/bliss/app-icon.png" },
    { id: "wk-asset-bliss-brandbook", name: "Brand Book BLISS 2026", type: "BRAND_BOOK", url: "/demo/bliss/brandbook.pdf" },
  ];

  for (const asset of assetDefs) {
    await prisma.brandAsset.upsert({
      where: { id: asset.id },
      update: {},
      create: {
        id: asset.id,
        strategyId: strategy.id,
        name: asset.name,
        assetType: asset.type,
        fileUrl: asset.url,
        createdAt: T.campaignPlanning,
      },
    });
    track("BrandAsset");
  }

  // ================================================================
  // BRAND DATA SOURCES — Uploaded documents
  // ================================================================
  const sourceDefs = [
    { id: "wk-source-bliss-brief", name: "Brief initial BLISS", type: "PDF", rawContent: "Brief strategique BLISS — positionnement premium vibranium skincare, cibles urbaines africaines 25-45 ans, objectif: devenir la reference beaute pan-africaine." },
    { id: "wk-source-bliss-market", name: "Etude marche cosmetiques Wakanda", type: "PDF", rawContent: "Marche cosmetiques Wakanda : 285 milliards XAF (2026). Croissance +18%/an. Segments: mass (45%), premium (35%), luxe (20%). Tendances: naturalite, heritage, tech-beauty." },
    { id: "wk-source-bliss-charte", name: "Charte visuelle BLISS v1", type: "PDF", rawContent: "Direction artistique BLISS : palette violet-or, typographie Playfair Display / Jost, inspiration afro-futuriste, textures vibranium, motifs geometriques wakandais." },
    { id: "wk-source-bliss-crm", name: "Export CRM clients Q1", type: "EXCEL", rawContent: "Base clients BLISS Q1 2026 : 1,247 clients actifs, panier moyen 23,500 XAF, taux de reachat 68%, NPS 72." },
  ];

  for (const src of sourceDefs) {
    await prisma.brandDataSource.upsert({
      where: { id: src.id },
      update: {},
      create: {
        id: src.id,
        strategyId: strategy.id,
        sourceType: "FILE",
        fileName: src.name,
        fileType: src.type,
        rawContent: src.rawContent,
        processingStatus: "PROCESSED",
        createdAt: T.docsUploaded,
      },
    });
    track("BrandDataSource");
  }

  // ================================================================
  // BRAND OS CONFIG + VARIABLE STORE CONFIG
  // ================================================================
  await prisma.brandOSConfig.upsert({
    where: { strategyId: strategy.id },
    update: {},
    create: {
      strategyId: strategy.id,
      viewMode: "FULL",
      theme: { mode: "DARK" } as Prisma.InputJsonValue,
      config: { showRTIS: true, showNotoria: true, showJehuty: true, showGlory: true, showCampaigns: true } as Prisma.InputJsonValue,
    },
  });
  track("BrandOSConfig");

  await prisma.variableStoreConfig.upsert({
    where: { strategyId: strategy.id },
    update: {},
    create: {
      strategyId: strategy.id,
      stalenessThresholdDays: 30,
      autoRecalculate: true,
      propagationRules: { refreshInterval: "weekly", notifyOnStale: true } as Prisma.InputJsonValue,
    },
  });
  track("VariableStoreConfig");

  // ================================================================
  // VARIABLE HISTORY — 12 changes over time
  // ================================================================
  const firstVar = await prisma.brandVariable.findFirst({ where: { strategyId: strategy.id }, select: { id: true } });
  if (firstVar) {
    const historyDates = [
      T.driversConfigured, daysAfter(T.driversConfigured, 3), daysAfter(T.driversConfigured, 7),
      T.campaignPlanning, daysAfter(T.campaignPlanning, 5), T.missionsStart,
      T.heritageLive, daysAfter(T.heritageLive, 3), T.glowLaunch,
      daysAfter(T.glowLaunch, 2), T.ambassadorLaunch, T.scoresValidated,
    ];
    for (let i = 0; i < historyDates.length; i++) {
      await prisma.variableHistory.upsert({
        where: { id: `wk-varhistory-bliss-${i}` },
        update: {},
        create: {
          id: `wk-varhistory-bliss-${i}`,
          variableId: firstVar.id,
          oldValue: i === 0 ? "" : `v${i}`,
          newValue: `v${i + 1}`,
          changedBy: i % 3 === 0 ? users.amara.id : users.okoye.id,
          createdAt: historyDates[i],
        },
      });
      track("VariableHistory");
    }
  }

  console.log("  [OK] Brand variables, assets, sources, configs, history");
  console.log(`  ── BLISS complete ──\n`);

  return { strategy };
}

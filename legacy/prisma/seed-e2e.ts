import { PrismaClient, type Prisma, ReviewVerdict, ReviewType, MissionMode } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}


const prisma = makeClient();

async function hash(plain: string) {
  return bcrypt.hash(plain, 12);
}

async function main() {
  console.log("E2E seed: enriching database...");

  // Get existing operator & strategy
  const operator = await prisma.operator.findFirstOrThrow({ where: { slug: "upgraders" } });
  const strategy = await prisma.strategy.findUniqueOrThrow({ where: { id: "demo-strategy-cimencam" } });

  // 1. Create CLIENT user for Cockpit access
  const clientUser = await prisma.user.upsert({
    where: { email: "client@cimencam.cm" },
    update: {},
    create: {
      name: "Jean-Pierre Fotso",
      email: "client@cimencam.cm",
      hashedPassword: await hash("Client123!"),
      role: "CLIENT_RETAINER",
      operatorId: operator.id,
    },
  });
  console.log(`Client user: ${clientUser.name} (${clientUser.email})`);

  // 2. Create Campaign
  const campaign = await prisma.campaign.upsert({
    where: { id: "demo-campaign-q1" },
    update: {},
    create: {
      id: "demo-campaign-q1",
      name: "Campagne Q1 2026 — Beton de Confiance",
      strategyId: strategy.id,
      status: "ACTIVE",
      advertis_vector: { focus: ["a", "v", "e"], budget: 5000000 } as Prisma.InputJsonValue,
    },
  });

  const campaign2 = await prisma.campaign.upsert({
    where: { id: "demo-campaign-notoriete" },
    update: {},
    create: {
      id: "demo-campaign-notoriete",
      name: "Notoriete Digitale 2026",
      strategyId: strategy.id,
      status: "DRAFT",
      advertis_vector: { focus: ["d", "r"], budget: 2000000 } as Prisma.InputJsonValue,
    },
  });
  console.log(`Campaigns: ${campaign.name}, ${campaign2.name}`);

  // Get talent profiles for assignments
  const talents = await prisma.talentProfile.findMany({ include: { user: true } });
  const marc = talents.find((t) => t.user.email === "marc@freelance.cm")!;
  const sarah = talents.find((t) => t.user.email === "sarah@freelance.cm")!;
  const paul = talents.find((t) => t.user.email === "paul@freelance.cm")!;

  // 3. Create Missions (various statuses)
  const missionsData = [
    { id: "demo-mission-1", title: "Charte Instagram CIMENCAM", status: "COMPLETED", driverId: "demo-driver-instagram", campaignId: campaign.id, mode: "DISPATCH" as const },
    { id: "demo-mission-2", title: "Content Calendar Facebook Q1", status: "IN_PROGRESS", driverId: "demo-driver-facebook", campaignId: campaign.id, mode: "DISPATCH" as const },
    { id: "demo-mission-3", title: "Video Testimonial Artisans", status: "IN_PROGRESS", driverId: null, campaignId: campaign.id, mode: "COLLABORATIF" as const },
    { id: "demo-mission-4", title: "Communique de Presse Salon BTP", status: "DRAFT", driverId: "demo-driver-pr", campaignId: null, mode: "DISPATCH" as const },
    { id: "demo-mission-5", title: "Story Instagram Chantier Douala", status: "COMPLETED", driverId: "demo-driver-instagram", campaignId: campaign.id, mode: "DISPATCH" as const },
    { id: "demo-mission-6", title: "Motion Design Logo Animation", status: "DRAFT", driverId: null, campaignId: campaign2.id, mode: "DISPATCH" as const },
  ];

  for (const m of missionsData) {
    await prisma.mission.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        title: m.title,
        strategyId: strategy.id,
        campaignId: m.campaignId,
        driverId: m.driverId,
        status: m.status,
        mode: m.mode as MissionMode,
        advertis_vector: {
          deadline: new Date(Date.now() + (m.status === "COMPLETED" ? -7 : 14) * 86400000).toISOString(),
          pillarPriority: ["a", "v"],
        } as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`Missions seeded (${missionsData.length})`);

  // 4. Create Deliverables
  const deliverablesData = [
    { id: "demo-del-1", missionId: "demo-mission-1", title: "Charte graphique Instagram v1", status: "APPROVED", fileUrl: "/uploads/charte-ig-v1.pdf" },
    { id: "demo-del-2", missionId: "demo-mission-2", title: "Calendrier editorial Fevrier", status: "PENDING", fileUrl: null },
    { id: "demo-del-3", missionId: "demo-mission-2", title: "Calendrier editorial Mars", status: "PENDING", fileUrl: null },
    { id: "demo-del-4", missionId: "demo-mission-3", title: "Storyboard Video Artisans", status: "IN_REVIEW", fileUrl: "/uploads/storyboard-artisans.pdf" },
    { id: "demo-del-5", missionId: "demo-mission-5", title: "Pack Stories Chantier Douala", status: "APPROVED", fileUrl: "/uploads/stories-douala.zip" },
    { id: "demo-del-6", missionId: "demo-mission-1", title: "Templates Posts Instagram", status: "APPROVED", fileUrl: "/uploads/templates-ig.zip" },
  ];

  for (const d of deliverablesData) {
    await prisma.missionDeliverable.upsert({
      where: { id: d.id },
      update: {},
      create: d,
    });
  }
  console.log(`Deliverables seeded (${deliverablesData.length})`);

  // 5. Create Quality Reviews
  const reviewsData = [
    { deliverableId: "demo-del-1", reviewerId: marc.userId, verdict: ReviewVerdict.ACCEPTED, overallScore: 8.5, feedback: "Excellent travail. La charte respecte les guidelines ADVE. Quelques ajustements mineurs sur la typographie suggeres.", reviewType: ReviewType.PEER },
    { deliverableId: "demo-del-4", reviewerId: sarah.userId, verdict: ReviewVerdict.MINOR_REVISION, overallScore: 6.5, feedback: "Le storyboard manque de dynamisme dans la sequence d'intro. Revoir le timing des transitions. Le message de marque est bien integre.", reviewType: ReviewType.PEER },
    { deliverableId: "demo-del-5", reviewerId: marc.userId, verdict: ReviewVerdict.ACCEPTED, overallScore: 9.0, feedback: "Stories percutantes. Bon storytelling visuel. Pilier Authenticite parfaitement mis en valeur.", reviewType: ReviewType.FIXER },
    { deliverableId: "demo-del-6", reviewerId: sarah.userId, verdict: ReviewVerdict.ACCEPTED, overallScore: 7.5, feedback: "Templates fonctionnels et alignes avec la charte. Manque un peu de variete dans les layouts.", reviewType: ReviewType.PEER },
  ];

  for (const r of reviewsData) {
    const existing = await prisma.qualityReview.findFirst({
      where: { deliverableId: r.deliverableId, reviewerId: r.reviewerId },
    });
    if (!existing) {
      await prisma.qualityReview.create({
        data: {
          ...r,
          pillarScores: { a: 8, d: 7, v: 8, e: 6 } as Prisma.InputJsonValue,
        },
      });
    }
  }
  console.log(`Quality Reviews seeded (${reviewsData.length})`);

  // 6. Create Commissions
  const commissionsData = [
    { missionId: "demo-mission-1", talentId: marc.userId, grossAmount: 150000, commissionRate: 0.10, commissionAmount: 15000, netAmount: 135000, status: "PAID", tierAtTime: marc.tier, paidAt: new Date(Date.now() - 15 * 86400000) },
    { missionId: "demo-mission-5", talentId: paul.userId, grossAmount: 80000, commissionRate: 0.10, commissionAmount: 8000, netAmount: 72000, status: "PAID", tierAtTime: paul.tier, paidAt: new Date(Date.now() - 5 * 86400000) },
    { missionId: "demo-mission-2", talentId: sarah.userId, grossAmount: 200000, commissionRate: 0.10, commissionAmount: 20000, netAmount: 180000, status: "PENDING", tierAtTime: sarah.tier, paidAt: null },
    { missionId: "demo-mission-3", talentId: marc.userId, grossAmount: 300000, commissionRate: 0.10, commissionAmount: 30000, netAmount: 270000, status: "PENDING", tierAtTime: marc.tier, paidAt: null },
  ];

  for (const c of commissionsData) {
    const existing = await prisma.commission.findFirst({
      where: { missionId: c.missionId, talentId: c.talentId },
    });
    if (!existing) {
      await prisma.commission.create({ data: c });
    }
  }
  console.log(`Commissions seeded (${commissionsData.length})`);

  // 7. Create Signals
  const signalsData = [
    { type: "DRIFT_ALERT", data: { pillar: "e", title: "Engagement en baisse", description: "Le taux d'engagement Instagram a baisse de 30% ce mois", severity: "warning" } },
    { type: "OPPORTUNITY", data: { pillar: "d", title: "Viralite TikTok", description: "Un artisan a poste une video avec du ciment CIMENCAM: 50K vues", severity: "info" } },
    { type: "COMPETITOR", data: { pillar: "r", title: "Lancement concurrent", description: "Dangote Cement lance une campagne massive au Cameroun", severity: "critical" } },
    { type: "PERFORMANCE", data: { pillar: "t", title: "KPI atteint", description: "Objectif de part de voix Facebook depasse: 45% vs 40% target", severity: "success" } },
  ];

  for (const s of signalsData) {
    await prisma.signal.create({
      data: {
        strategyId: strategy.id,
        type: s.type,
        data: s.data as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`Signals seeded (${signalsData.length})`);

  // 8. Create Brand Assets
  const assetsData = [
    { name: "Logo CIMENCAM Principal", fileUrl: "/uploads/logo-cimencam.svg", pillarTags: ["a", "d"] },
    { name: "Palette Couleurs Officielle", fileUrl: "/uploads/palette.pdf", pillarTags: ["d", "s"] },
    { name: "Photo Usine Douala", fileUrl: "/uploads/usine-douala.jpg", pillarTags: ["a", "v"] },
    { name: "Jingle Radio 2025", fileUrl: "/uploads/jingle-2025.mp3", pillarTags: ["d", "e"] },
  ];

  for (const a of assetsData) {
    const existing = await prisma.brandAsset.findFirst({
      where: { strategyId: strategy.id, name: a.name },
    });
    if (!existing) {
      await prisma.brandAsset.create({
        data: {
          strategyId: strategy.id,
          name: a.name,
          fileUrl: a.fileUrl,
          pillarTags: a.pillarTags as Prisma.InputJsonValue,
        },
      });
    }
  }
  console.log(`Brand Assets seeded (${assetsData.length})`);

  console.log("\nE2E seed completed successfully.");
  console.log("\nTest accounts:");
  console.log("  Admin:   alexandre@upgraders.com / Admin123!");
  console.log("  Client:  client@cimencam.cm / Client123!");
  console.log("  Creator: marc@freelance.cm / Creator123!");
  console.log("  Creator: sarah@freelance.cm / Creator123!");
  console.log("  Creator: paul@freelance.cm / Creator123!");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });

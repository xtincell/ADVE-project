/**
 * WAKANDA SEED — Community data
 *
 * SuperfanProfile (10), AmbassadorProgram (1), AmbassadorMember (5),
 * CommunitySnapshot (4), ClubMember (3), Event (4), EventRegistration (8),
 * Course (2), Enrollment (4), BoutiqueItem (3), BoutiqueOrder (2)
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

export async function seedCommunity(prisma: PrismaClient, brands: Brands, users: WakandaUsers) {

  // ================================================================
  // SUPERFAN PROFILES (10 for BLISS)
  // ================================================================
  const superfans = [
    { id: "wk-superfan-01", handle: "amina_glow_wk", platform: "Instagram", depth: 0.95, segment: "EVANGELISTE", interactions: 312 },
    { id: "wk-superfan-02", handle: "fatimata_beauty", platform: "Instagram", depth: 0.88, segment: "AMBASSADEUR", interactions: 245 },
    { id: "wk-superfan-03", handle: "aissatou_daily", platform: "Instagram", depth: 0.82, segment: "AMBASSADEUR", interactions: 198 },
    { id: "wk-superfan-04", handle: "zara_wakanda", platform: "TikTok", depth: 0.92, segment: "EVANGELISTE", interactions: 420 },
    { id: "wk-superfan-05", handle: "kofi_style", platform: "TikTok", depth: 0.75, segment: "ENGAGE", interactions: 156 },
    { id: "wk-superfan-06", handle: "nene_skincare", platform: "TikTok", depth: 0.78, segment: "ENGAGE", interactions: 178 },
    { id: "wk-superfan-07", handle: "mariama_wk", platform: "Instagram", depth: 0.70, segment: "PARTICIPANT", interactions: 89 },
    { id: "wk-superfan-08", handle: "adja_beaute", platform: "App", depth: 0.85, segment: "AMBASSADEUR", interactions: 267 },
    { id: "wk-superfan-09", handle: "binta_glow", platform: "App", depth: 0.90, segment: "EVANGELISTE", interactions: 380 },
    { id: "wk-superfan-10", handle: "awa_premium", platform: "App", depth: 0.65, segment: "ENGAGE", interactions: 112 },
  ];

  for (const sf of superfans) {
    await prisma.superfanProfile.upsert({
      where: { strategyId_platform_handle: { strategyId: brands.bliss.strategy.id, platform: sf.platform, handle: sf.handle } },
      update: {},
      create: {
        id: sf.id,
        strategyId: brands.bliss.strategy.id,
        platform: sf.platform,
        handle: sf.handle,
        engagementDepth: sf.depth,
        segment: sf.segment,
        interactions: sf.interactions,
        lastActiveAt: daysAfter(T.now, -Math.floor(Math.random() * 7)),
        metadata: { joinedMonth: "2026-01", topContent: "Heritage Collection", favoriteProduct: "Serum Vibranium Glow" } as Prisma.InputJsonValue,
        createdAt: T.superfansWave1,
      },
    });
    track("SuperfanProfile");
  }

  // ================================================================
  // AMBASSADOR PROGRAM (1 for BLISS)
  // ================================================================
  await prisma.ambassadorProgram.upsert({
    where: { id: IDS.ambassadorBliss },
    update: {},
    create: {
      id: IDS.ambassadorBliss,
      strategyId: brands.bliss.strategy.id,
      name: "BLISS Glow Circle",
      description: "Programme ambassadeur BLISS — recompensez votre passion pour la beaute wakandaise. 5 niveaux de Bronze a Diamond.",
      tiers: [
        { name: "Bronze", minPoints: 0, rewards: ["10% reduction permanente", "Acces early drops"] },
        { name: "Silver", minPoints: 500, rewards: ["15% reduction", "Produit gratuit/trimestre", "Invitation events VIP"] },
        { name: "Gold", minPoints: 1500, rewards: ["20% reduction", "Box mensuelle gratuite", "Rencontre equipe BLISS"] },
        { name: "Platinum", minPoints: 3000, rewards: ["25% reduction", "Co-creation produits", "Featured sur les reseaux"] },
        { name: "Diamond", minPoints: 5000, rewards: ["30% reduction", "Ambassadrice officielle", "Voyage Wakanda Beauty Tour"] },
      ] as Prisma.InputJsonValue,
      rewards: { referralBonus: 2500, contentCreationBonus: 5000, reviewBonus: 1000 } as Prisma.InputJsonValue,
      isActive: true,
      createdAt: T.ambassadorLaunch,
    },
  });
  track("AmbassadorProgram");

  // ================================================================
  // AMBASSADOR MEMBERS (5, one per tier)
  // ================================================================
  const ambassadors = [
    { id: "wk-ambassador-01", name: "Amina Diop", email: "amina@glow.wk", platform: "Instagram", handle: "amina_glow_wk", tier: "DIAMOND" as const, points: 5200, referrals: 45 },
    { id: "wk-ambassador-02", name: "Zara Osei", email: "zara@tiktok.wk", platform: "TikTok", handle: "zara_wakanda", tier: "PLATINUM" as const, points: 3800, referrals: 28 },
    { id: "wk-ambassador-03", name: "Binta Traore", email: "binta@glow.wk", platform: "App", handle: "binta_glow", tier: "GOLD" as const, points: 2100, referrals: 15 },
    { id: "wk-ambassador-04", name: "Fatimata Kone", email: "fatimata@beauty.wk", platform: "Instagram", handle: "fatimata_beauty", tier: "SILVER" as const, points: 800, referrals: 8 },
    { id: "wk-ambassador-05", name: "Adja Sow", email: "adja@beaute.wk", platform: "App", handle: "adja_beaute", tier: "BRONZE" as const, points: 250, referrals: 3 },
  ];

  for (const amb of ambassadors) {
    await prisma.ambassadorMember.upsert({
      where: { id: amb.id },
      update: {},
      create: {
        id: amb.id,
        programId: IDS.ambassadorBliss,
        name: amb.name,
        email: amb.email,
        platform: amb.platform,
        handle: amb.handle,
        tier: amb.tier,
        points: amb.points,
        referrals: amb.referrals,
        isActive: true,
        joinedAt: T.ambassadorLaunch,
      },
    });
    track("AmbassadorMember");
  }

  // ================================================================
  // COMMUNITY SNAPSHOTS (4, monthly Jan→Apr for BLISS)
  // ================================================================
  const snapshots = [
    { id: "wk-comsnap-bliss-jan", platform: "ALL", size: 3200, health: 0.72, sentiment: 0.78, velocity: 0.15, activeRate: 0.25, date: new Date("2026-01-31") },
    { id: "wk-comsnap-bliss-feb", platform: "ALL", size: 8500, health: 0.78, sentiment: 0.82, velocity: 0.45, activeRate: 0.30, date: new Date("2026-02-28") },
    { id: "wk-comsnap-bliss-mar", platform: "ALL", size: 18000, health: 0.85, sentiment: 0.88, velocity: 0.55, activeRate: 0.35, date: new Date("2026-03-31") },
    { id: "wk-comsnap-bliss-apr", platform: "ALL", size: 22000, health: 0.88, sentiment: 0.90, velocity: 0.42, activeRate: 0.38, date: T.now },
  ];

  for (const snap of snapshots) {
    await prisma.communitySnapshot.upsert({
      where: { id: snap.id },
      update: {},
      create: {
        id: snap.id,
        strategyId: brands.bliss.strategy.id,
        platform: snap.platform,
        size: snap.size,
        health: snap.health,
        sentiment: snap.sentiment,
        velocity: snap.velocity,
        activeRate: snap.activeRate,
        measuredAt: snap.date,
      },
    });
    track("CommunitySnapshot");
  }

  // ================================================================
  // CLUB MEMBERS (3, BLISS Inner Circle)
  // ================================================================
  const clubMembers = [
    { id: "wk-club-01", userId: IDS.userAmara, clubType: "INNER_CIRCLE", tier: "FOUNDER", points: 10000 },
    { id: "wk-club-02", userId: IDS.userOkoye, clubType: "INNER_CIRCLE", tier: "MEMBER", points: 3500 },
    { id: "wk-club-03", userId: IDS.userNakia, clubType: "INNER_CIRCLE", tier: "MEMBER", points: 2800 },
  ];

  for (const cm of clubMembers) {
    await prisma.clubMember.upsert({
      where: { userId_clubType: { userId: cm.userId, clubType: cm.clubType } },
      update: {},
      create: {
        id: cm.id,
        userId: cm.userId,
        clubType: cm.clubType,
        tier: cm.tier,
        points: cm.points,
        isActive: true,
        joinedAt: T.ambassadorLaunch,
      },
    });
    track("ClubMember");
  }

  // ================================================================
  // EVENTS (4: 2 past, 2 upcoming)
  // ================================================================
  const events = [
    { id: "wk-event-01", title: "BLISS Glow Night — Soiree Heritage", description: "Soiree de lancement de la Heritage Collection. Degustation, atelier beaute et rencontres.", eventType: "LAUNCH", location: "Biryongo Luxury Lounge, Wakanda City", startDate: T.heritageLive, endDate: hoursAfter(T.heritageLive, 5), capacity: 150, status: "COMPLETED" },
    { id: "wk-event-02", title: "Shuri Tech Meetup — IA & Education", description: "Rencontre technologique sur l'intelligence artificielle appliquee a l'education.", eventType: "MEETUP", location: "Shuri Academy Campus", startDate: daysAfter(T.now, -20), endDate: hoursAfter(daysAfter(T.now, -20), 3), capacity: 80, status: "COMPLETED" },
    { id: "wk-event-03", title: "BLISS Summer Glow Festival", description: "Festival beaute estival avec ateliers, showcases produits et zone selfie.", eventType: "FESTIVAL", location: "Parc Royal de Biryongo", startDate: daysAfter(T.now, 30), endDate: daysAfter(T.now, 31), capacity: 500, status: "UPCOMING" },
    { id: "wk-event-04", title: "Shuri Academy Hackathon 2026", description: "48h de code pour resoudre des problemes d'education digitale en Afrique.", eventType: "HACKATHON", location: "Shuri Academy Campus", isOnline: true, startDate: daysAfter(T.now, 45), endDate: daysAfter(T.now, 47), capacity: 200, status: "UPCOMING" },
  ];

  for (const ev of events) {
    await prisma.event.upsert({
      where: { id: ev.id },
      update: {},
      create: {
        id: ev.id,
        title: ev.title,
        description: ev.description,
        eventType: ev.eventType,
        location: ev.location,
        isOnline: (ev as any).isOnline || false,
        startDate: ev.startDate,
        endDate: ev.endDate,
        capacity: ev.capacity,
        status: ev.status,
        createdAt: daysAfter(ev.startDate, -30),
      },
    });
    track("Event");
  }

  // ================================================================
  // EVENT REGISTRATIONS (8)
  // ================================================================
  const registrations = [
    // Glow Night (past — 4)
    { id: "wk-ereg-01", eventId: "wk-event-01", userId: IDS.userAmara, status: "ATTENDED", attendedAt: T.heritageLive },
    { id: "wk-ereg-02", eventId: "wk-event-01", userId: IDS.userOkoye, status: "ATTENDED", attendedAt: T.heritageLive },
    { id: "wk-ereg-03", eventId: "wk-event-01", userId: IDS.userNakia, status: "ATTENDED", attendedAt: T.heritageLive },
    // Shuri Meetup (past — 1)
    { id: "wk-ereg-04", eventId: "wk-event-02", userId: IDS.userShuri, status: "ATTENDED", attendedAt: daysAfter(T.now, -20) },
    // Summer Festival (upcoming — 2)
    { id: "wk-ereg-05", eventId: "wk-event-03", userId: IDS.userAmara, status: "REGISTERED", attendedAt: null },
    { id: "wk-ereg-06", eventId: "wk-event-03", userId: IDS.userOkoye, status: "REGISTERED", attendedAt: null },
    // Hackathon (upcoming — 1 registered + 1 cancelled)
    { id: "wk-ereg-07", eventId: "wk-event-04", userId: IDS.userShuri, status: "REGISTERED", attendedAt: null },
    { id: "wk-ereg-08", eventId: "wk-event-04", userId: IDS.userTchalla, status: "CANCELLED", attendedAt: null },
  ];

  for (const reg of registrations) {
    await prisma.eventRegistration.upsert({
      where: { eventId_userId: { eventId: reg.eventId, userId: reg.userId } },
      update: {},
      create: {
        id: reg.id,
        eventId: reg.eventId,
        userId: reg.userId,
        status: reg.status,
        attendedAt: reg.attendedAt,
        createdAt: daysAfter(T.now, -15),
      },
    });
    track("EventRegistration");
  }

  // ================================================================
  // COURSES (2)
  // ================================================================
  const courses = [
    { id: "wk-course-01", title: "Masterclass BLISS Skincare", slug: "masterclass-bliss-skincare", description: "Decouvrez les secrets de la routine skincare wakandaise premium. Ingredients, rituels et philosophie beaute.", level: "BEGINNER" as const, category: "BEAUTY", pillarFocus: "e", duration: 120, isPublished: true },
    { id: "wk-course-02", title: "Introduction au Marketing Digital", slug: "intro-marketing-digital", description: "Les fondamentaux du marketing digital pour les entrepreneurs africains. De la strategie a l'execution.", level: "BEGINNER" as const, category: "MARKETING", pillarFocus: "e", duration: 240, isPublished: true },
  ];

  for (const course of courses) {
    await prisma.course.upsert({
      where: { id: course.id },
      update: {},
      create: {
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        level: course.level,
        category: course.category,
        pillarFocus: course.pillarFocus,
        content: { modules: [{ title: "Module 1", lessons: 5 }, { title: "Module 2", lessons: 4 }] } as Prisma.InputJsonValue,
        duration: course.duration,
        isPublished: course.isPublished,
        createdAt: T.teamAssembled,
      },
    });
    track("Course");
  }

  // ================================================================
  // ENROLLMENTS (4, 2 per course)
  // ================================================================
  const enrollments = [
    { id: "wk-enroll-01", courseId: "wk-course-01", userId: IDS.userAmara, status: "COMPLETED" as const, progress: 1.0, completedAt: daysAfter(T.now, -10), score: 92 },
    { id: "wk-enroll-02", courseId: "wk-course-01", userId: IDS.userOkoye, status: "IN_PROGRESS" as const, progress: 0.65, completedAt: null, score: null },
    { id: "wk-enroll-03", courseId: "wk-course-02", userId: IDS.userShuri, status: "COMPLETED" as const, progress: 1.0, completedAt: daysAfter(T.now, -5), score: 88 },
    { id: "wk-enroll-04", courseId: "wk-course-02", userId: IDS.userTchalla, status: "IN_PROGRESS" as const, progress: 0.30, completedAt: null, score: null },
  ];

  for (const en of enrollments) {
    await prisma.enrollment.upsert({
      where: { courseId_userId: { courseId: en.courseId, userId: en.userId } },
      update: {},
      create: {
        id: en.id,
        courseId: en.courseId,
        userId: en.userId,
        status: en.status,
        progress: en.progress,
        completedAt: en.completedAt,
        score: en.score,
        createdAt: daysAfter(T.now, -30),
      },
    });
    track("Enrollment");
  }

  // ================================================================
  // BOUTIQUE ITEMS (3, BLISS merch)
  // ================================================================
  const boutiqueItems = [
    { id: "wk-boutique-01", name: "Coffret Decouverte BLISS", description: "Coffret 5 echantillons Heritage Collection — decouvrez les essentiels BLISS.", price: 12000, category: "COFFRET", stock: 150 },
    { id: "wk-boutique-02", name: "Tote Bag BLISS 'Revelee'", description: "Sac en coton bio avec la tagline BLISS brodee — edition limitee.", price: 8000, category: "ACCESSOIRE", stock: 80 },
    { id: "wk-boutique-03", name: "Miroir Compact BLISS Vibranium", description: "Miroir de poche finition or avec le logo BLISS grave.", price: 15000, category: "ACCESSOIRE", stock: 45 },
  ];

  for (const item of boutiqueItems) {
    await prisma.boutiqueItem.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        currency: "XAF",
        category: item.category,
        stock: item.stock,
        isActive: true,
        createdAt: T.ambassadorLaunch,
      },
    });
    track("BoutiqueItem");
  }

  // ================================================================
  // BOUTIQUE ORDERS (2)
  // ================================================================
  const orders = [
    { id: "wk-order-01", userId: IDS.userAmara, itemId: "wk-boutique-01", quantity: 2, amount: 24000, status: "DELIVERED", paidAt: daysAfter(T.now, -10), shippedAt: daysAfter(T.now, -8) },
    { id: "wk-order-02", userId: IDS.userOkoye, itemId: "wk-boutique-02", quantity: 1, amount: 8000, status: "SHIPPED", paidAt: daysAfter(T.now, -3), shippedAt: daysAfter(T.now, -1) },
  ];

  for (const order of orders) {
    await prisma.boutiqueOrder.upsert({
      where: { id: order.id },
      update: {},
      create: {
        id: order.id,
        userId: order.userId,
        itemId: order.itemId,
        quantity: order.quantity,
        amount: order.amount,
        status: order.status,
        paidAt: order.paidAt,
        shippedAt: order.shippedAt,
        createdAt: daysAfter(T.now, -12),
      },
    });
    track("BoutiqueOrder");
  }

  console.log("[OK] Community: 10 superfans, 5 ambassadors, 4 snapshots, 3 club, 4 events, 8 registrations, 2 courses, 4 enrollments, 3 items, 2 orders");
}

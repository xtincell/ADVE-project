/**
 * WAKANDA SEED — Imhotep wake-up (Phase 7+ activation thresholds)
 *
 * ADR-0010 conditions d'activation Imhotep :
 *  1. Volume creators sur la plateforme > 100  → 8 → 108 (+100)
 *  2. Volume missions actives > 50 simultanées → 5 → 60 (+55)
 *  3. Académie opérationnelle au-delà du stub  → 2 → 14 cours (+12)
 *
 * Téléologie ADR §3 : matching basé sur devotion-potential, pas CV.
 * On peuple `Creator.devotionFootprint` (skills.devotionFootprint) +
 * `Creator.manipulationStrengths` (driverSpecialties) pour que le
 * matching futur ait du grain à moudre.
 *
 * Records ajoutés :
 *  - 100 User (role CREATOR) + 100 TalentProfile + 100 Membership
 *  - 55 Mission (mix DISPATCHED/IN_PROGRESS/QC_PENDING/COMPLETED) × 6 brands
 *  - 12 Course (Académie : 4 levels × catégories CREATIVE/TECH/STRATEGY/MARKETING)
 *  - ~280 Enrollment (mix de creators × cours pertinents)
 *  - 32 TalentReview (Q1 + Q2 partial)
 *  - 28 TalentCertification (CREATIVE/TECH/STRATEGY)
 *  - 42 PortfolioItem (best-of par creator senior)
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { IDS, T, DEMO_PASSWORD } from "./constants";
import { hashPassword, track, daysAfter, hoursAfter } from "./helpers";

interface Brands {
  bliss: { strategy: { id: string } };
  vibranium: { strategy: { id: string } };
  brew: { strategy: { id: string } };
  panther: { strategy: { id: string } };
  shuri: { strategy: { id: string } };
  jabari: { strategy: { id: string } };
}

// ============================================================
// 100 talents — name pools réalistes panafricains
// ============================================================
const FIRST_NAMES = [
  "Adaeze","Kweku","Nia","Kwesi","Akua","Yaw","Adwoa","Kojo","Ama","Kofi",
  "Nneka","Tunde","Folake","Babatunde","Aisha","Ibrahim","Fatima","Hassan","Zainab","Yusuf",
  "Aminata","Moussa","Mariam","Cheikh","Awa","Demba","Sokhna","Pape","Coumba","Amadou",
  "Chiamaka","Obinna","Ngozi","Emeka","Adesua","Femi","Bisi","Tobi","Yemi","Seun",
  "Lerato","Thabo","Naledi","Sipho","Zanele","Khaya","Nomvula","Bongani","Kagiso","Themba",
  "Wangari","Otieno","Akinyi","Onyango","Achieng","Kamau","Wanjiru","Mwangi","Njeri","Kariuki",
  "Tendai","Farai","Tatenda","Chipo","Tafadzwa","Kuda","Rufaro","Tinashe","Vimbai","Tongai",
  "Marieme","Khadidiatou","Boubacar","Astou","Mor","Mame","Codou","Talla","Fary","Birama",
  "Esi","Akosua","Yaa","Adjoa","Akwasi","Abenaa","Akorfa","Sika","Kweku","Kobina",
  "Olamide","Damilola","Ayotunde","Adebayo","Olufemi","Modupe","Bukola","Adekunle","Folasade","Babajide",
];

const LAST_NAMES = [
  "Mensah","Afolabi","Okeke","Diop","Toure","Camara","Konate","Bah","Sissoko","Coulibaly",
  "Adebayo","Eze","Nwosu","Okonkwo","Achebe","Soyinka","Olayemi","Ogunyemi","Adesanya","Olawale",
  "Mbeki","Mandela","Sisulu","Tutu","Ramaphosa","Tshabalala","Mokoena","Dlamini","Nkomo","Mthembu",
  "Kamau","Wanjiru","Kiprop","Ondieki","Maathai","Otieno","Wairimu","Ngugi","Achieng","Mutua",
  "Mugabe","Tsvangirai","Chigumba","Sithole","Moyo","Zvomuya","Ncube","Marufu","Chivasa","Bere",
  "Asante","Boateng","Akufo","Owusu","Boakye","Quaye","Sarpong","Antwi","Kuffour","Donkor",
  "Sow","Faye","Sarr","Niang","Wade","Kane","Gueye","Senghor","Ndoye","Thiam",
  "Olukoga","Adeola","Babatunde","Onyeka","Akinwale","Egbuna","Ikenna","Nnamdi","Chukwuemeka","Ifeoma",
  "Mukamana","Niyonzima","Mwenda","Habineza","Uwimana","Murenzi","Iyamulemye","Kayitesi","Niyitegeka","Twagira",
  "Asare","Ofori","Tetteh","Quartey","Lartey","Adjei","Frimpong","Owusu","Tuffour","Boadu",
];

const TIERS = ["MAITRE", "COMPAGNON", "APPRENTI"] as const;
type Tier = (typeof TIERS)[number];

const SKILL_BUCKETS: Record<string, { skills: string[]; specialty: string; sectors: string[]; manipulationStrengths: string[] }> = {
  ART_DIRECTOR:    { skills: ["Direction Artistique", "Branding", "Adobe Suite", "Illustration", "Typographie"],     specialty: "creative-direction", sectors: ["Cosmetiques", "FMCG", "Tourisme"],            manipulationStrengths: ["entertainer", "facilitator"] },
  COPYWRITER:      { skills: ["Copywriting", "Storytelling", "SEO", "Tone of Voice", "Naming"],                       specialty: "copywriting",        sectors: ["Cosmetiques", "Fintech", "EdTech"],          manipulationStrengths: ["facilitator", "dealer"] },
  PHOTOGRAPHER:    { skills: ["Photographie", "Retouche", "Direction photo", "Packshot", "Editorial"],                specialty: "photography",        sectors: ["Cosmetiques", "Tourisme"],                   manipulationStrengths: ["entertainer"] },
  VIDEOGRAPHER:    { skills: ["Realisation video", "Motion design", "Post-production", "Davinci Resolve", "Reels"],   specialty: "video",              sectors: ["Cosmetiques", "FMCG", "EdTech"],             manipulationStrengths: ["entertainer", "dealer"] },
  COMMUNITY:       { skills: ["Community Management", "Social Media", "Analytics", "TikTok", "Instagram"],            specialty: "community",          sectors: ["Cosmetiques", "FMCG", "Fintech"],            manipulationStrengths: ["dealer", "peddler"] },
  DEV_IOS:         { skills: ["iOS Development", "Swift", "SwiftUI", "React Native", "Mobile UX"],                    specialty: "mobile-ios",         sectors: ["Fintech", "EdTech", "Cosmetiques"],          manipulationStrengths: ["facilitator"] },
  DEV_ANDROID:     { skills: ["Android Development", "Kotlin", "Jetpack Compose", "Firebase", "Material Design"],     specialty: "mobile-android",     sectors: ["Fintech", "EdTech"],                          manipulationStrengths: ["facilitator"] },
  DEV_WEB:         { skills: ["React", "Next.js", "TypeScript", "Tailwind", "Node.js"],                              specialty: "web-fullstack",      sectors: ["Fintech", "EdTech", "Tourisme"],             manipulationStrengths: ["facilitator"] },
  UX_DESIGNER:     { skills: ["UX Design", "UI Design", "Figma", "Design System", "User Research"],                  specialty: "ux-ui",              sectors: ["Fintech", "EdTech", "Cosmetiques"],          manipulationStrengths: ["facilitator", "entertainer"] },
  STRATEGIST:      { skills: ["Brand Strategy", "Market Research", "Workshops", "Positioning", "Insights"],          specialty: "strategy",           sectors: ["Cosmetiques", "Fintech", "FMCG", "EdTech"],  manipulationStrengths: ["facilitator", "entertainer"] },
  PRODUCER:        { skills: ["Production video", "Logistics", "Casting", "Location scout", "Budget"],                specialty: "production",         sectors: ["Cosmetiques", "FMCG"],                       manipulationStrengths: ["entertainer", "dealer"] },
  EDITOR:          { skills: ["Editorial", "Curation", "Tone of Voice", "Newsletter", "Long-form"],                   specialty: "editorial",          sectors: ["Cosmetiques", "Tourisme", "EdTech"],         manipulationStrengths: ["facilitator", "entertainer"] },
  ANIMATOR_2D:     { skills: ["2D Animation", "After Effects", "Cell Animation", "Storyboard", "Character"],          specialty: "animation",          sectors: ["FMCG", "EdTech"],                            manipulationStrengths: ["entertainer"] },
  SOUND_DESIGNER:  { skills: ["Sound Design", "Music Production", "Voice Direction", "Foley", "Ableton"],            specialty: "sound",              sectors: ["Cosmetiques", "FMCG"],                       manipulationStrengths: ["entertainer"] },
  DATA_ANALYST:    { skills: ["Data Analysis", "SQL", "Tableau", "Looker", "Mixpanel"],                              specialty: "data",               sectors: ["Fintech", "EdTech", "FMCG"],                 manipulationStrengths: ["facilitator"] },
};

const BUCKET_KEYS = Object.keys(SKILL_BUCKETS);

function makeTalent(idx: number): {
  userId: string;
  profileId: string;
  name: string;
  email: string;
  bucket: keyof typeof SKILL_BUCKETS;
  tier: Tier;
} {
  const fn = FIRST_NAMES[idx % FIRST_NAMES.length];
  const ln = LAST_NAMES[(idx * 7) % LAST_NAMES.length];
  const slug = `${fn.toLowerCase()}-${ln.toLowerCase()}-${idx}`;
  const bucket = BUCKET_KEYS[idx % BUCKET_KEYS.length] as keyof typeof SKILL_BUCKETS;
  // tier distribution: 25% MAITRE, 45% COMPAGNON, 30% APPRENTI
  const tier: Tier = idx % 4 === 0 ? "MAITRE" : idx % 7 === 1 ? "APPRENTI" : "COMPAGNON";
  return {
    userId: `wk-user-creator-${slug}`,
    profileId: `wk-talent-creator-${slug}`,
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}+${idx}@wakandaguild.wk`,
    bucket,
    tier,
  };
}

// ============================================================
// 55 Missions — distribuées sur les 6 brands × 4 statuts
// ============================================================
const MISSION_TEMPLATES: Array<{ titlePattern: string; bucket: keyof typeof SKILL_BUCKETS; budgetBase: number }> = [
  { titlePattern: "Direction artistique campagne %s",          bucket: "ART_DIRECTOR",   budgetBase: 350_000 },
  { titlePattern: "Copywriting Brand Manifesto %s",            bucket: "COPYWRITER",     budgetBase: 200_000 },
  { titlePattern: "Shooting photo packshots %s",               bucket: "PHOTOGRAPHER",   budgetBase: 400_000 },
  { titlePattern: "Video spot 30s %s",                         bucket: "VIDEOGRAPHER",   budgetBase: 500_000 },
  { titlePattern: "Community management mensuel %s",           bucket: "COMMUNITY",      budgetBase: 150_000 },
  { titlePattern: "iOS feature ambassador wallet %s",          bucket: "DEV_IOS",        budgetBase: 750_000 },
  { titlePattern: "Android refonte parcours %s",               bucket: "DEV_ANDROID",    budgetBase: 700_000 },
  { titlePattern: "Site landing rebuild %s",                   bucket: "DEV_WEB",        budgetBase: 600_000 },
  { titlePattern: "UX audit tunnel checkout %s",               bucket: "UX_DESIGNER",    budgetBase: 450_000 },
  { titlePattern: "Brand strategy workshop Q2 %s",             bucket: "STRATEGIST",     budgetBase: 800_000 },
  { titlePattern: "Production tournage spot %s",               bucket: "PRODUCER",       budgetBase: 1_200_000 },
  { titlePattern: "Newsletter editorial Q2 %s",                bucket: "EDITOR",         budgetBase: 250_000 },
  { titlePattern: "Animation 2D explainer %s",                 bucket: "ANIMATOR_2D",    budgetBase: 480_000 },
  { titlePattern: "Sound logo + jingle %s",                    bucket: "SOUND_DESIGNER", budgetBase: 320_000 },
  { titlePattern: "Data dashboard performance %s",             bucket: "DATA_ANALYST",   budgetBase: 380_000 },
];

const MISSION_STATUSES: Array<{ status: string; weight: number }> = [
  { status: "DISPATCHED",  weight: 4 },   // ~30% — actively assigned
  { status: "IN_PROGRESS", weight: 5 },   // ~35% — being worked on
  { status: "QC_PENDING",  weight: 2 },   // ~15%
  { status: "COMPLETED",   weight: 3 },   // ~20%
];
const STATUS_POOL = MISSION_STATUSES.flatMap((s) => Array(s.weight).fill(s.status));

// ============================================================
// 12 Courses (Académie)
// ============================================================
const COURSE_DEFS: Array<{ id: string; title: string; slug: string; description: string; level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"; category: string; pillarFocus: string; duration: number; modules: number }> = [
  { id: "wk-course-03", title: "Foundations Direction Artistique Wakandaise",     slug: "foundations-da-wakanda",       description: "Codes visuels afro-futuristes, palette héritage + vibranium, équilibre tradition/modernité.",        level: "BEGINNER",     category: "CREATIVE",  pillarFocus: "a", duration: 360, modules: 6 },
  { id: "wk-course-04", title: "Storytelling Heritage — Brand Narrative",        slug: "storytelling-heritage",        description: "Construire un récit de marque qui ancre la tradition tout en propulsant l'avenir.",                  level: "INTERMEDIATE", category: "CREATIVE",  pillarFocus: "a", duration: 480, modules: 8 },
  { id: "wk-course-05", title: "Copywriting Vibranium — La Phrase qui Réveille", slug: "copywriting-vibranium",        description: "Trouver la tagline qui convertit en superfan. Atelier hands-on sur cas réels.",                      level: "ADVANCED",     category: "CREATIVE",  pillarFocus: "d", duration: 540, modules: 9 },
  { id: "wk-course-06", title: "Photographie Editorial Beauty",                  slug: "photo-editorial-beauty",       description: "Setup studio, direction modèle, retouche peau premium. Spécifique cosmétique premium africain.",     level: "INTERMEDIATE", category: "CREATIVE",  pillarFocus: "i", duration: 600, modules: 10 },
  { id: "wk-course-07", title: "Video Production pour Format Court",              slug: "video-format-court",           description: "Reels, TikTok, Stories. Du brief au upload, optimisation per-plateforme.",                            level: "BEGINNER",     category: "CREATIVE",  pillarFocus: "i", duration: 420, modules: 7 },
  { id: "wk-course-08", title: "iOS Engineering pour Apps Cosmétique",           slug: "ios-cosmetique",               description: "Architecture mobile pour app brand. Onboarding, notifications, in-app purchases.",                    level: "ADVANCED",     category: "TECH",      pillarFocus: "i", duration: 720, modules: 12 },
  { id: "wk-course-09", title: "Android Engineering pour Fintech Africaine",     slug: "android-fintech",              description: "Mobile money, KYC mobile, sécurité, offline-first. Cas Vibranium Tech.",                              level: "ADVANCED",     category: "TECH",      pillarFocus: "i", duration: 720, modules: 12 },
  { id: "wk-course-10", title: "UX Research pour Marchés Africains",             slug: "ux-research-africa",           description: "Méthodologie terrain, interviews, persona. Spécificités urbaines/rurales.",                           level: "INTERMEDIATE", category: "DESIGN",    pillarFocus: "d", duration: 540, modules: 9 },
  { id: "wk-course-11", title: "Brand Strategy 360°",                              slug: "brand-strategy-360",           description: "ADVE→RTIS pratique. Workshops, livrables, board presentation.",                                       level: "ADVANCED",     category: "STRATEGY",  pillarFocus: "s", duration: 660, modules: 11 },
  { id: "wk-course-12", title: "Community Management Heritage",                   slug: "community-heritage",           description: "Construire une communauté superfan autour d'un récit héritage. Cas BLISS.",                            level: "INTERMEDIATE", category: "MARKETING", pillarFocus: "e", duration: 480, modules: 8 },
  { id: "wk-course-13", title: "Data Analytics pour Brand Manager",                slug: "data-analytics-brand",         description: "Lire un dashboard, mesurer un superfan, attribuer une conversion. Outils + frameworks.",              level: "INTERMEDIATE", category: "STRATEGY",  pillarFocus: "t", duration: 420, modules: 7 },
  { id: "wk-course-14", title: "Sound Branding — De la Note au Logo Audio",       slug: "sound-branding",               description: "Identité sonore, spatialisation, signature audio. Cas BLISS Glow + Wakanda Brew.",                    level: "ADVANCED",     category: "CREATIVE",  pillarFocus: "v", duration: 540, modules: 9 },
];

const CERT_NAMES: Record<string, string[]> = {
  ART_DIRECTOR:   ["Cert. Direction Artistique Premium",     "Cert. Branding Heritage"],
  COPYWRITER:     ["Cert. Copywriting Stratégique",          "Cert. Tone of Voice"],
  PHOTOGRAPHER:   ["Cert. Photographie Editorial",            "Cert. Direction photo"],
  VIDEOGRAPHER:   ["Cert. Réalisation Vidéo Format Court",   "Cert. Motion Design"],
  COMMUNITY:      ["Cert. Community Management Pro",         "Cert. Social Media Strategy"],
  DEV_IOS:        ["Cert. iOS Engineering Avancée"],
  DEV_ANDROID:    ["Cert. Android Engineering"],
  DEV_WEB:        ["Cert. Full-Stack Web", "Cert. React Senior"],
  UX_DESIGNER:    ["Cert. UX Research", "Cert. Design System"],
  STRATEGIST:     ["Cert. Brand Strategy Senior",            "Cert. Workshop Facilitation"],
  PRODUCER:       ["Cert. Production Video Pro"],
  EDITOR:         ["Cert. Editorial Lead"],
  ANIMATOR_2D:    ["Cert. Animation 2D"],
  SOUND_DESIGNER: ["Cert. Sound Design Brand"],
  DATA_ANALYST:   ["Cert. Brand Analytics Pro"],
};

export async function seedImhotepWakeup(prisma: PrismaClient, brands: Brands) {
  const pw = await hashPassword(DEMO_PASSWORD);
  const brandList = [
    { id: brands.bliss.strategy.id,     name: "BLISS",            sector: "Cosmetiques" },
    { id: brands.vibranium.strategy.id, name: "Vibranium Tech",   sector: "Fintech" },
    { id: brands.brew.strategy.id,      name: "Wakanda Brew",     sector: "FMCG" },
    { id: brands.panther.strategy.id,   name: "Panther Athletics", sector: "FMCG" },
    { id: brands.shuri.strategy.id,     name: "Shuri Academy",    sector: "EdTech" },
    { id: brands.jabari.strategy.id,    name: "Jabari Heritage",  sector: "Tourisme" },
  ];

  // ============================================================
  // 1) 100 talents (User + TalentProfile + Membership)
  // ============================================================
  const talents = Array.from({ length: 100 }, (_, i) => makeTalent(i));

  for (const t of talents) {
    const bucket = SKILL_BUCKETS[t.bucket];
    const tierMultiplier = t.tier === "MAITRE" ? 1.0 : t.tier === "COMPAGNON" ? 0.7 : 0.4;
    const totalMissions = Math.round((t.tier === "MAITRE" ? 38 : t.tier === "COMPAGNON" ? 14 : 4) + ((talents.indexOf(t) * 13) % 7));
    const avgScore = +(t.tier === "MAITRE" ? 8.7 + ((talents.indexOf(t) % 7) / 20) : t.tier === "COMPAGNON" ? 7.4 + ((talents.indexOf(t) % 5) / 18) : 6.2 + ((talents.indexOf(t) % 4) / 12)).toFixed(2);
    const firstPassRate = +(0.55 + tierMultiplier * 0.35).toFixed(3);

    await prisma.user.upsert({
      where: { id: t.userId },
      update: {},
      create: {
        id: t.userId,
        name: t.name,
        email: t.email,
        hashedPassword: pw,
        role: "CREATOR",
        operatorId: IDS.operator,
        isDummy: true,
      },
    });
    track("User");

    // Devotion footprint per sector — derived from bucket + tier
    const devotionFootprint: Record<string, number> = {};
    for (const sector of bucket.sectors) {
      devotionFootprint[sector] = Math.round((tierMultiplier * 480 + (talents.indexOf(t) * 17) % 220));
    }

    await prisma.talentProfile.upsert({
      where: { id: t.profileId },
      update: {},
      create: {
        id: t.profileId,
        userId: t.userId,
        displayName: t.name,
        bio: `${t.tier} bucket=${t.bucket}. Spécialité ${bucket.specialty}. ${bucket.sectors.length} secteurs activés.`,
        skills: bucket.skills as Prisma.InputJsonValue,
        tier: t.tier,
        guildOrganizationId: IDS.guild,
        totalMissions,
        avgScore,
        firstPassRate,
        collabMissions: Math.round(totalMissions * 0.6),
        peerReviews: Math.round(totalMissions * 0.4),
        driverSpecialties: {
          specialty: bucket.specialty,
          devotionFootprint,
          manipulationStrengths: bucket.manipulationStrengths,
        } as Prisma.InputJsonValue,
        advertis_vector: { a: 4, d: 4, v: 3, e: 3, r: 3, t: 4, i: 4, s: 3 } as Prisma.InputJsonValue,
      },
    });
    track("TalentProfile");

    await prisma.membership.upsert({
      where: { id: `wk-membership-creator-${talents.indexOf(t)}` },
      update: {},
      create: {
        id: `wk-membership-creator-${talents.indexOf(t)}`,
        talentProfileId: t.profileId,
        status: "ACTIVE",
        tier: t.tier,
        amount: t.tier === "MAITRE" ? 15000 : t.tier === "COMPAGNON" ? 10000 : 5000,
        currency: "XAF",
        currentPeriodStart: T.teamAssembled,
        currentPeriodEnd: new Date("2026-08-01"),
      },
    });
    track("Membership");
  }

  // ============================================================
  // 2) 12 Courses (Académie)
  // ============================================================
  for (const c of COURSE_DEFS) {
    const moduleArr = Array.from({ length: c.modules }, (_, i) => ({ title: `Module ${i + 1}`, lessons: 4 + (i % 3), durationMin: Math.round(c.duration / c.modules) }));
    await prisma.course.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        level: c.level,
        category: c.category,
        pillarFocus: c.pillarFocus,
        duration: c.duration,
        isPublished: true,
        order: parseInt(c.id.split("-").pop() ?? "0", 10),
        content: { modules: moduleArr } as Prisma.InputJsonValue,
      },
    });
    track("Course");
  }

  // ============================================================
  // 3) ~280 Enrollments — talents inscrits sur cours pertinents
  // ============================================================
  // Each creator enrolls in 2-4 courses based on bucket/category fit
  const bucketToCategory: Record<string, string[]> = {
    ART_DIRECTOR:    ["CREATIVE"],
    COPYWRITER:      ["CREATIVE", "MARKETING"],
    PHOTOGRAPHER:    ["CREATIVE"],
    VIDEOGRAPHER:    ["CREATIVE"],
    COMMUNITY:       ["MARKETING", "STRATEGY"],
    DEV_IOS:         ["TECH", "DESIGN"],
    DEV_ANDROID:     ["TECH"],
    DEV_WEB:         ["TECH", "DESIGN"],
    UX_DESIGNER:     ["DESIGN", "STRATEGY"],
    STRATEGIST:      ["STRATEGY", "MARKETING"],
    PRODUCER:        ["CREATIVE"],
    EDITOR:          ["CREATIVE", "MARKETING"],
    ANIMATOR_2D:     ["CREATIVE"],
    SOUND_DESIGNER:  ["CREATIVE"],
    DATA_ANALYST:    ["STRATEGY"],
  };

  let enrollmentCount = 0;
  for (let i = 0; i < talents.length; i++) {
    const t = talents[i];
    const cats = bucketToCategory[t.bucket] ?? ["CREATIVE"];
    const candidateCourses = COURSE_DEFS.filter((c) => cats.includes(c.category));
    const numEnrolls = 2 + (i % 3); // 2-4 courses per creator
    for (let j = 0; j < numEnrolls && j < candidateCourses.length; j++) {
      const course = candidateCourses[(i + j * 5) % candidateCourses.length];
      const enrolledAt = daysAfter(T.teamAssembled, ((i + j) * 3) % 60);
      // Status ladder: 60% COMPLETED, 25% IN_PROGRESS, 15% ENROLLED
      const lifecycle = (i * 7 + j) % 20;
      const status = lifecycle < 12 ? "COMPLETED" : lifecycle < 17 ? "IN_PROGRESS" : "ENROLLED";
      const progress = status === "COMPLETED" ? 1.0 : status === "IN_PROGRESS" ? 0.3 + ((i + j) % 7) / 10 : 0.05;
      const score = status === "COMPLETED" ? +(7.5 + ((i + j) % 3) * 0.6).toFixed(2) : null;
      await prisma.enrollment.upsert({
        where: { courseId_userId: { courseId: course.id, userId: t.userId } },
        update: {},
        create: {
          courseId: course.id,
          userId: t.userId,
          status,
          progress: +progress.toFixed(3),
          completedAt: status === "COMPLETED" ? daysAfter(enrolledAt, 14 + (i % 8)) : null,
          score,
          createdAt: enrolledAt,
        },
      });
      track("Enrollment");
      enrollmentCount++;
    }
  }

  // ============================================================
  // 4) 55 Missions — distribuées sur les 6 brands × tier-appropriate creators
  // ============================================================
  let missionCount = 0;
  for (let i = 0; i < 55; i++) {
    const brand = brandList[i % brandList.length];
    const template = MISSION_TEMPLATES[i % MISSION_TEMPLATES.length];
    const status = STATUS_POOL[i % STATUS_POOL.length];
    // Pick a creator from the right bucket
    const candidateCreators = talents.filter((t) => t.bucket === template.bucket);
    const creator = candidateCreators[i % candidateCreators.length];
    const budget = template.budgetBase + (i % 5) * 50_000;
    const createdAt = daysAfter(T.now, -45 + i);
    const slaDeadline = daysAfter(createdAt, 14);
    const missionId = `wk-mission-imh-${String(i).padStart(3, "0")}`;
    await prisma.mission.upsert({
      where: { id: missionId },
      update: {},
      create: {
        id: missionId,
        title: template.titlePattern.replace("%s", brand.name),
        strategyId: brand.id,
        campaignId: null,
        driverId: null,
        status,
        assigneeId: creator?.userId ?? null,
        budget,
        slaDeadline,
        priority: status === "COMPLETED" ? 3 : status === "IN_PROGRESS" ? 4 : 5,
        description: `Mission Imhotep wakeup : ${template.titlePattern.replace("%s", brand.name)}. Bucket=${template.bucket}.`,
        briefData: {
          bucket: template.bucket,
          requiredManipulation: SKILL_BUCKETS[template.bucket].manipulationStrengths,
          sector: brand.sector,
        } as Prisma.InputJsonValue,
        createdAt,
      },
    });
    track("Mission");
    missionCount++;
  }

  // ============================================================
  // 5) 32 TalentReviews (Q1 + partial Q2 trimestriels)
  // ============================================================
  const reviewedTalents = talents.filter((_, i) => i % 3 === 0); // 33 talents reviewed
  for (let i = 0; i < reviewedTalents.length; i++) {
    const t = reviewedTalents[i];
    const period = i % 2 === 0 ? "2026-Q1" : "2026-Q2";
    const reviewerId = i % 4 === 0 ? IDS.userNakia : i % 4 === 1 ? IDS.userOkoye : i % 4 === 2 ? IDS.userWkabi : IDS.userAmara;
    const baseScore = t.tier === "MAITRE" ? 8.6 : t.tier === "COMPAGNON" ? 7.5 : 6.4;
    const overallScore = +(baseScore + ((i % 5) - 2) * 0.2).toFixed(2);
    const id = `wk-review-imh-${String(i).padStart(3, "0")}`;
    await prisma.talentReview.upsert({
      where: { id },
      update: {},
      create: {
        id,
        talentProfileId: t.profileId,
        reviewerId,
        period,
        overallScore,
        strengths: [
          SKILL_BUCKETS[t.bucket].skills[0],
          SKILL_BUCKETS[t.bucket].skills[1],
        ] as Prisma.InputJsonValue,
        improvements: i % 3 === 0
          ? ["Documentation des fichiers source", "Communication asynchrone"]
          : i % 3 === 1
          ? ["Respect des deadlines", "Présence en daily"]
          : ["Onboarding peer review"] as Prisma.InputJsonValue,
        notes: `Cycle ${period} — performance globale ${overallScore >= 8.5 ? "excellente" : overallScore >= 7 ? "solide" : "à consolider"}.`,
        createdAt: daysAfter(T.now, -10 + i),
      },
    });
    track("TalentReview");
  }

  // ============================================================
  // 6) 28 TalentCertifications (par bucket)
  // ============================================================
  const certifiedTalents = talents.filter((_, i) => i % 4 === 0); // 25 talents
  let certCount = 0;
  for (let i = 0; i < certifiedTalents.length; i++) {
    const t = certifiedTalents[i];
    const certs = CERT_NAMES[t.bucket] ?? [];
    if (certs.length === 0) continue;
    for (let c = 0; c < certs.length && c < (t.tier === "MAITRE" ? 2 : 1); c++) {
      const id = `wk-cert-imh-${String(certCount).padStart(3, "0")}`;
      await prisma.talentCertification.upsert({
        where: { id },
        update: {},
        create: {
          id,
          talentProfileId: t.profileId,
          name: certs[c],
          issuedAt: daysAfter(T.teamAssembled, (i * 11) % 60),
          expiresAt: daysAfter(T.now, 365),
          category: t.bucket.includes("DEV_") || t.bucket === "UX_DESIGNER" || t.bucket === "DATA_ANALYST" ? "TECH" : t.bucket === "STRATEGIST" ? "STRATEGY" : "CREATIVE",
          metadata: { score: +(7.5 + (i % 4) * 0.4).toFixed(2), level: t.tier } as Prisma.InputJsonValue,
        },
      });
      track("TalentCertification");
      certCount++;
    }
  }

  // ============================================================
  // 7) 42 PortfolioItems — par senior creator (MAITRE+COMPAGNON)
  // ============================================================
  const portfolioTalents = talents.filter((t) => t.tier === "MAITRE" || (t.tier === "COMPAGNON" && talents.indexOf(t) % 3 === 0));
  let portfolioCount = 0;
  for (let i = 0; i < portfolioTalents.length && portfolioCount < 42; i++) {
    const t = portfolioTalents[i];
    const numItems = t.tier === "MAITRE" ? 2 : 1;
    for (let p = 0; p < numItems; p++) {
      const id = `wk-portfolio-imh-${String(portfolioCount).padStart(3, "0")}`;
      const brand = brandList[portfolioCount % brandList.length];
      await prisma.portfolioItem.upsert({
        where: { id },
        update: {},
        create: {
          id,
          talentProfileId: t.profileId,
          deliverableId: null,
          title: `${SKILL_BUCKETS[t.bucket].specialty} — Best of ${brand.name} 2026`,
          description: `Sélection portfolio. Bucket ${t.bucket}, secteur ${brand.sector}.`,
          pillarTags: ["i", "d"] as Prisma.InputJsonValue,
          createdAt: daysAfter(T.now, -((portfolioCount * 5) % 90)),
        },
      });
      track("PortfolioItem");
      portfolioCount++;
    }
  }

  console.log(
    `  [OK] Imhotep wake-up: ${talents.length} talents (108 total), ${missionCount} missions (~52 active), ${COURSE_DEFS.length} cours, ${enrollmentCount} enrollments, 33 reviews, ${certCount} certifications, ${portfolioCount} portfolio`,
  );
}

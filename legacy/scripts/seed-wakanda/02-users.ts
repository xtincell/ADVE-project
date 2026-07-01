/**
 * WAKANDA SEED — Phase 1: Users + Talent Profiles + Guild
 */

import type { PrismaClient, Operator, User, TalentProfile } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { IDS, DEMO_PASSWORD, T } from "./constants";
import { hashPassword, track } from "./helpers";

export interface WakandaUsers {
  amara: User;
  shuri: User;
  nakia: User;
  okoye: User;
  wkabi: User;
  mbaku: User;
  tchalla: User;
  ramonda: User;
  talents: Record<string, { user: User; profile: TalentProfile }>;
}

export async function seedUsers(
  prisma: PrismaClient,
  operator: Operator,
): Promise<WakandaUsers> {
  const pw = await hashPassword(DEMO_PASSWORD);

  // ── Named users ────────────────────────────────────────────────────
  const userDefs = [
    { id: IDS.userAmara, name: "Amara Udaku", email: "amara@bliss.wk", role: "CLIENT_RETAINER", key: "amara" },
    { id: IDS.userShuri, name: "Shuri Udaku", email: "shuri@shuriacademy.wk", role: "CLIENT_RETAINER", key: "shuri" },
    { id: IDS.userNakia, name: "Nakia Okoye", email: "nakia@wakandadigital.wk", role: "BRAND_MANAGER", key: "nakia" },
    { id: IDS.userOkoye, name: "Okoye Dora", email: "okoye@wakandadigital.wk", role: "BRAND_MANAGER", key: "okoye" },
    { id: IDS.userWkabi, name: "W'Kabi Kante", email: "wkabi@wakandadigital.wk", role: "ADMIN", key: "wkabi" },
    { id: IDS.userMbaku, name: "M'Baku Jabari", email: "mbaku@jabariheritage.wk", role: "CLIENT_RETAINER", key: "mbaku" },
    { id: IDS.userTchalla, name: "T'Challa Bassari", email: "tchalla@vibraniumtech.wk", role: "CLIENT_RETAINER", key: "tchalla" },
    { id: IDS.userRamonda, name: "Ramonda Brewster", email: "ramonda@wakandabrew.wk", role: "CLIENT_RETAINER", key: "ramonda" },
  ];

  const users: Record<string, User> = {};
  for (const def of userDefs) {
    const user = await prisma.user.upsert({
      where: { id: def.id },
      update: {},
      create: {
        id: def.id,
        name: def.name,
        email: def.email,
        hashedPassword: pw,
        role: def.role,
        operatorId: operator.id,
        isDummy: true,
      },
    });
    users[def.key] = user;
    track("User");
  }
  console.log(`[OK] Users: ${userDefs.length} named characters`);

  // ── Freelance talent profiles ──────────────────────────────────────
  const talentDefs = [
    { id: IDS.talentDA, userId: "wk-user-kofi-asante", name: "Kofi Asante", email: "kofi@wakandaguild.wk", tier: "MAITRE" as const, skills: ["Direction Artistique", "Branding", "Illustration", "Adobe Suite"], bio: "DA senior specialise en identite visuelle afro-futuriste. 8 ans d'experience sur des marques premium." },
    { id: IDS.talentCopy, userId: "wk-user-aya-mensah", name: "Aya Mensah", email: "aya@wakandaguild.wk", tier: "COMPAGNON" as const, skills: ["Copywriting", "Storytelling", "Content Strategy", "SEO"], bio: "Redactrice conceptrice bilingue FR/EN. Specialiste brand narrative et tone of voice." },
    { id: IDS.talentPhoto, userId: "wk-user-kwame-fotso", name: "Kwame Fotso", email: "kwame@wakandaguild.wk", tier: "MAITRE" as const, skills: ["Photographie", "Retouche", "Direction photo", "Packshot"], bio: "Photographe editorial et publicitaire. Portfolio: Vogue Africa, AfroBeauty, luxury brands." },
    { id: IDS.talentVideo, userId: "wk-user-fatou-diallo", name: "Fatou Diallo", email: "fatou@wakandaguild.wk", tier: "COMPAGNON" as const, skills: ["Realisation video", "Motion design", "Post-production", "DaVinci Resolve"], bio: "Realisatrice video pub et content. Specialiste format court TikTok/Reels." },
    { id: IDS.talentCM, userId: "wk-user-issa-ndiaye", name: "Issa Ndiaye", email: "issa@wakandaguild.wk", tier: "APPRENTI" as const, skills: ["Community Management", "Social Media", "Analytics", "Canva"], bio: "Community manager junior. Forte affinite avec les audiences Gen Z sur TikTok et Instagram." },
    { id: IDS.talentIOS, userId: "wk-user-chinua-dev", name: "Chinua Obi", email: "chinua@wakandaguild.wk", tier: "COMPAGNON" as const, skills: ["iOS Development", "Swift", "SwiftUI", "React Native"], bio: "Developpeur iOS mid-level. 3 apps publiees sur l'App Store. Specialiste UX mobile." },
    { id: IDS.talentAndroid, userId: "wk-user-amadi-tech", name: "Amadi Ekene", email: "amadi@wakandaguild.wk", tier: "APPRENTI" as const, skills: ["Android Development", "Kotlin", "Jetpack Compose", "Firebase"], bio: "Developpeur Android junior. Passione par l'accessibilite et le design material." },
    { id: IDS.talentUX, userId: "wk-user-zuri-design", name: "Zuri Afolabi", email: "zuri@wakandaguild.wk", tier: "MAITRE" as const, skills: ["UX Design", "UI Design", "Figma", "Design System", "User Research"], bio: "UX/UI designer senior. 10 ans d'experience. Specialiste design system et accessibilite." },
  ];

  // ── Guild Organization (must exist before talent profiles reference it) ──
  await prisma.guildOrganization.upsert({
    where: { id: IDS.guild },
    update: {},
    create: {
      id: IDS.guild,
      name: "Wakanda Creative Guild",
      description: "Collectif de createurs, designers et developpeurs wakandais. De l'Apprenti a l'Associe, chaque membre contribue a la souverainete creative du Wakanda.",
      totalMissions: 85,
      firstPassRate: 0.82,
      avgQcScore: 88,
    },
  });
  track("GuildOrganization");

  const talents: Record<string, { user: User; profile: TalentProfile }> = {};
  for (const def of talentDefs) {
    const user = await prisma.user.upsert({
      where: { id: def.userId },
      update: {},
      create: {
        id: def.userId,
        name: def.name,
        email: def.email,
        hashedPassword: pw,
        role: "CREATOR",
        operatorId: operator.id,
        isDummy: true,
      },
    });
    track("User");

    const profile = await prisma.talentProfile.upsert({
      where: { id: def.id },
      update: {},
      create: {
        id: def.id,
        userId: user.id,
        displayName: def.name,
        bio: def.bio,
        skills: def.skills as Prisma.InputJsonValue,
        tier: def.tier,
        totalMissions: def.tier === "MAITRE" ? 45 : def.tier === "COMPAGNON" ? 18 : 5,
        avgScore: def.tier === "MAITRE" ? 92 : def.tier === "COMPAGNON" ? 78 : 65,
        firstPassRate: def.tier === "MAITRE" ? 0.88 : def.tier === "COMPAGNON" ? 0.72 : 0.55,
        guildOrganizationId: IDS.guild,
      },
    });
    track("TalentProfile");
    talents[def.id] = { user, profile };
  }
  console.log(`[OK] Talents: ${talentDefs.length} freelance profiles`);

  // Memberships
  for (const def of talentDefs) {
    await prisma.membership.upsert({
      where: { id: `wk-membership-${def.id.split("-").pop()}` },
      update: {},
      create: {
        id: `wk-membership-${def.id.split("-").pop()}`,
        talentProfileId: def.id,
        status: "ACTIVE",
        tier: def.tier,
        amount: def.tier === "MAITRE" ? 15000 : def.tier === "COMPAGNON" ? 10000 : 5000,
        currency: "XAF",
        currentPeriodStart: T.teamAssembled,
        currentPeriodEnd: new Date("2026-08-01"),
      },
    });
    track("Membership");
  }

  console.log(`[OK] Guild: Wakanda Creative Guild + ${talentDefs.length} memberships`);

  return {
    amara: users.amara,
    shuri: users.shuri,
    nakia: users.nakia,
    okoye: users.okoye,
    wkabi: users.wkabi,
    mbaku: users.mbaku,
    tchalla: users.tchalla,
    ramonda: users.ramonda,
    talents,
  };
}

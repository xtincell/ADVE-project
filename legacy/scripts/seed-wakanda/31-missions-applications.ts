/**
 * WAKANDA SEED — Batch 7a: Candidatures missions (Guilde, ADR-0098).
 *
 * Irrigue « candidatures missions (guilde) » : `MissionApplication`. Le mur de
 * missions existait (23-missions-talent) mais sans candidatures — pas de fin du
 * « premier arrivé ». On pose un vrai pool de candidats sur la mission ouverte
 * `wk-mission-vib-02` + des candidatures (gagnant/recalés) sur des missions
 * attribuées. applicantId = User.id du talent ; talentProfileId = profil lié.
 *
 * Déterministe. Idempotent. Après 23-missions-talent (FK Mission + User).
 */

import type { PrismaClient } from "@prisma/client";
import { IDS, WAKANDA, T } from "./constants";
import { track, daysAfter } from "./helpers";

// Mapping talent → (userId, talentProfileId) — userIds inline dans 02-users.ts.
const TALENT = {
  da: { user: "wk-user-kofi-asante", profile: IDS.talentDA },
  copy: { user: "wk-user-aya-mensah", profile: IDS.talentCopy },
  photo: { user: "wk-user-kwame-fotso", profile: IDS.talentPhoto },
  video: { user: "wk-user-fatou-diallo", profile: IDS.talentVideo },
  cm: { user: "wk-user-issa-ndiaye", profile: IDS.talentCM },
  ios: { user: "wk-user-chinua-dev", profile: IDS.talentIOS },
  android: { user: "wk-user-amadi-tech", profile: IDS.talentAndroid },
  ux: { user: "wk-user-zuri-design", profile: IDS.talentUX },
} as const;

export async function seedMissionsApplications(prisma: PrismaClient) {
  const apps: Array<{
    id: string;
    missionId: string;
    talent: keyof typeof TALENT;
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
    rate: number;
    message: string;
  }> = [
    // Mission ouverte vib-02 — pool de candidats
    { id: "wk-app-vib02-ux", missionId: "wk-mission-vib-02", talent: "ux", status: "PENDING", rate: 180000, message: "10 ans d'XP, design system fintech — disponible immédiatement." },
    { id: "wk-app-vib02-ios", missionId: "wk-mission-vib-02", talent: "ios", status: "PENDING", rate: 150000, message: "Spécialiste UX mobile, 3 apps publiées." },
    { id: "wk-app-vib02-android", missionId: "wk-mission-vib-02", talent: "android", status: "WITHDRAWN", rate: 120000, message: "Intéressé mais finalement indisponible sur la période." },
    // Mission photo bliss-03 — gagnant + recalé
    { id: "wk-app-bliss03-photo", missionId: "wk-mission-bliss-03", talent: "photo", status: "ACCEPTED", rate: 175000, message: "Portfolio Vogue Africa, dispo pour le shooting Heritage." },
    { id: "wk-app-bliss03-video", missionId: "wk-mission-bliss-03", talent: "video", status: "REJECTED", rate: 140000, message: "Je peux aussi couvrir la photo en complément vidéo." },
    // Mission UX shuri-01 — gagnant
    { id: "wk-app-shuri01-ux", missionId: "wk-mission-shuri-01", talent: "ux", status: "ACCEPTED", rate: 200000, message: "Design complet plateforme apprentissage." },
  ];

  for (const a of apps) {
    const t = TALENT[a.talent];
    const decided = a.status === "ACCEPTED" || a.status === "REJECTED";
    await prisma.missionApplication.upsert({
      where: { missionId_applicantId: { missionId: a.missionId, applicantId: t.user } },
      update: {},
      create: {
        id: a.id,
        missionId: a.missionId,
        applicantId: t.user,
        talentProfileId: t.profile,
        status: a.status,
        message: a.message,
        proposedRate: a.rate,
        currency: WAKANDA.currency,
        decidedBy: decided ? IDS.userNakia : null,
        decidedAt: decided ? daysAfter(T.missionsStart, 1) : null,
        decisionNote: decided ? (a.status === "ACCEPTED" ? "Meilleur profil pour le brief." : "Profil non retenu cette fois.") : null,
        createdAt: T.missionsStart,
      },
    });
    track("MissionApplication");
  }

  console.log(`[OK] Mission applications: ${apps.length} candidatures (1 mission ouverte + missions attribuées)`);
}

/**
 * WAKANDA SEED — Batch 4 : Paris publics (ADR-0159) + Passeports fan (ADR-0158).
 *
 * Éprouve les organes Phase B/C du plan d'état final dans la zone de
 * calibration : BLISS porte des paris publics RÉSOLUS (tenus COMME ratés —
 * c'est l'honnêteté qui rend le registre crédible) + un pari en cours ; deux
 * superfans BLISS reçoivent leur passeport (tokens DÉTERMINISTES pour la démo)
 * et l'une a un parrainage converti (gate RECOMMENDED exercé).
 *
 * Déterministe, idempotent (upsert), zéro LLM. Zone fictive — purgeable.
 */

import type { PrismaClient } from "@prisma/client";
import { IDS, T } from "./constants";
import { daysAfter } from "./helpers";

/** Tokens/codes déterministes de la démo (≥16 chars pour le token, format FAN- canon). */
export const WAKANDA_PASSPORTS = [
  { profileId: "wk-superfan-01", token: "wk-passport-amina-glow-demo-0158", fanCode: "FAN-WAKND2" },
  { profileId: "wk-superfan-04", token: "wk-passport-zara-wakanda-demo-0158", fanCode: "FAN-WAKND3" },
] as const;

export const WAKANDA_REFERRAL_EMAILS = ["filleule.awa@wakanda.test"] as const;

export async function seedPledgesAndPassports(prisma: PrismaClient) {
  // ── Passeports fan (BLISS) ─────────────────────────────────────────────────
  for (const p of WAKANDA_PASSPORTS) {
    await prisma.superfanProfile.update({
      where: { id: p.profileId },
      data: { passportToken: p.token, fanCode: p.fanCode, passportIssuedAt: T.superfansWave1 },
    });
  }

  // ── Parrainage fan converti (gate RECOMMENDED déjà porté par le profil) ────
  await prisma.referral.upsert({
    where: { id: "wk-referral-01" },
    update: {},
    create: {
      id: "wk-referral-01",
      codeUsed: WAKANDA_PASSPORTS[0].fanCode,
      referrerProfileId: WAKANDA_PASSPORTS[0].profileId,
      refereeEmail: WAKANDA_REFERRAL_EMAILS[0],
      refereeName: "Awa Mbeki",
      companyName: "Awa Cosmetics",
      status: "CONVERTED",
      createdAt: daysAfter(T.superfansWave1, 3),
      convertedAt: daysAfter(T.superfansWave1, 15),
    },
  });

  // ── Paris publics BLISS — résolus (tenu + raté) + en cours ─────────────────
  const pledges = [
    {
      id: "wk-pledge-bliss-hit",
      strategyId: IDS.stratBliss,
      kind: "PLEDGE",
      subjectType: "AUDIENCE_TOTAL",
      statement:
        "Pari BLISS : dépasser 30 000 abonnées cumulées avant le lancement GLOW — mesuré sur nos relevés publics.",
      baseline: 22000,
      predictedValue: 30000,
      predictedDirection: "UP",
      confidence: 0.75,
      horizonAt: T.glowLaunch,
      status: "HIT",
      outcomeValue: 31450,
      resolvedAt: T.appLaunch,
      brier: Math.pow(0.75 - 1, 2),
      resolutionNote: "Relevés cumulés à l'échéance : 31 450 — le pari est tenu, la série publique en fait foi.",
    },
    {
      id: "wk-pledge-bliss-miss",
      strategyId: IDS.stratBliss,
      kind: "PLEDGE",
      subjectType: "BUSINESS",
      statement:
        "Pari BLISS : ouvrir 3 points de vente à Birnin Zana avant le lancement ambassadeurs.",
      confidence: 0.6,
      horizonAt: T.ambassadorLaunch,
      status: "MISS",
      resolvedAt: T.scoresValidated,
      brier: Math.pow(0.6 - 0, 2),
      resolutionNote:
        "2 points de vente ouverts sur 3 à l'échéance — pari raté, assumé au registre. Le 3ᵉ a ouvert 12 jours plus tard.",
    },
    {
      id: "wk-pledge-bliss-open",
      strategyId: IDS.stratBliss,
      kind: "PLEDGE",
      subjectType: "AUDIENCE_TOTAL",
      statement:
        "Pari BLISS : franchir 60 000 abonnées cumulées d'ici la fin du trimestre — devant tous.",
      baseline: 46000,
      predictedValue: 60000,
      predictedDirection: "UP",
      confidence: 0.65,
      horizonAt: new Date(Date.now() + 45 * 86_400_000), // en cours au moment du seed
      status: "OPEN",
    },
  ] as const;

  for (const p of pledges) {
    await prisma.predictionRecord.upsert({
      where: { id: p.id },
      update: {},
      create: {
        ...p,
        isPublic: true,
        method: "DECLARED_V1",
        declaredBy: "wk-operator",
      },
    });
  }

  // ── Effet prédit d'action (interne, non public) — registre B3 exercé ──────
  await prisma.predictionRecord.upsert({
    where: { id: "wk-pledge-vibranium-action" },
    update: {},
    create: {
      id: "wk-pledge-vibranium-action",
      strategyId: IDS.stratVibranium,
      kind: "ACTION_EFFECT",
      subjectType: "AUDIENCE_TOTAL",
      subjectKey: "wk-action-vibranium-launch",
      statement: "Effet prédit du lancement développeur Vibranium : +15 % d'audience LinkedIn sous 45 jours.",
      baseline: 4000,
      predictedValue: 4600,
      predictedDirection: "UP",
      confidence: 0.6,
      horizonAt: new Date(Date.now() + 30 * 86_400_000),
      status: "OPEN",
      isPublic: false,
      method: "DECLARED_V1",
      declaredBy: "wk-operator",
    },
  });

  console.log(
    `  ✓ Paris & passeports : ${pledges.length + 1} paris (2 résolus dont 1 raté assumé) · ${WAKANDA_PASSPORTS.length} passeports · 1 parrainage fan converti`,
  );
}

/**
 * ADR-0157 — Parrainage manual-first (première brique du passeport fan,
 * ETAT-FINAL B2). Récompenses arbitrées : filleul −20 % sur le premier cycle ·
 * parrain 1 mois offert à la conversion payée. AUCUN octroi automatique
 * d'argent : l'opérateur applique les récompenses à la main (au moment de
 * valider le paiement WhatsApp pour le filleul ; en étendant l'abonnement du
 * parrain) puis marque REWARDED — même posture que la file
 * manual-subscriptions (v6.27.15). Zéro LLM, déterministe.
 */

import { db } from "@/lib/db";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans I/L/O/0/1 (lisible à l'oral)

function randomCode(): string {
  let out = "LF-";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!;
  }
  return out;
}

/** Code stable du compte — généré à la première demande (unique, retry sur collision). */
export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { referralCode: true } });
  if (user.referralCode) return user.referralCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    try {
      await db.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // collision unique — on retente avec un autre code
    }
  }
  throw new Error("REFERRAL_CODE_GENERATION_FAILED");
}

export function normalizeReferralCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/**
 * Enregistre un parrainage déclaré à l'intake. Best-effort : code inconnu ou
 * auto-parrainage (même email que le parrain) → aucun enregistrement, jamais
 * d'erreur qui bloquerait l'intake. Dédupliqué par (refereeEmail) : un même
 * filleul ne crée pas deux PENDING.
 */
export async function recordReferralFromIntake(input: {
  code: string;
  refereeEmail: string;
  refereeName?: string | null;
  companyName?: string | null;
}): Promise<{ applied: boolean }> {
  try {
    const code = normalizeReferralCode(input.code);
    if (!/^LF-[A-Z2-9]{6}$/.test(code)) return { applied: false };
    const referrer = await db.user.findUnique({ where: { referralCode: code }, select: { id: true, email: true } });
    if (!referrer) return { applied: false };
    const email = input.refereeEmail.trim().toLowerCase();
    if (referrer.email.toLowerCase() === email) return { applied: false }; // auto-parrainage
    const existing = await db.referral.findFirst({
      where: { refereeEmail: email, status: { in: ["PENDING", "CONVERTED", "REWARDED"] } },
      select: { id: true },
    });
    if (existing) return { applied: false };
    await db.referral.create({
      data: {
        codeUsed: code,
        referrerUserId: referrer.id,
        refereeEmail: email,
        refereeName: input.refereeName ?? null,
        companyName: input.companyName ?? null,
      },
    });
    return { applied: true };
  } catch {
    return { applied: false };
  }
}

/**
 * Détection de conversion : appelée quand un abonnement devient réellement
 * actif (voie manuelle validée opérateur). Flip PENDING → CONVERTED pour le
 * filleul correspondant. Best-effort, jamais bloquant.
 */
export async function markReferralConverted(subscriberEmail: string): Promise<void> {
  try {
    const email = subscriberEmail.trim().toLowerCase();
    await db.referral.updateMany({
      where: { refereeEmail: email, status: "PENDING" },
      data: { status: "CONVERTED", convertedAt: new Date() },
    });
  } catch {
    /* jamais bloquant */
  }
}

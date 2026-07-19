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
 *
 * ADR-0158 : deux familles de codes — `LF-XXXXXX` (compte parrain) et
 * `FAN-XXXXXX` (fan porteur de passeport, `Referral.referrerProfileId`).
 */
export async function recordReferralFromIntake(input: {
  code: string;
  refereeEmail: string;
  refereeName?: string | null;
  companyName?: string | null;
}): Promise<{ applied: boolean }> {
  try {
    const code = normalizeReferralCode(input.code);
    const email = input.refereeEmail.trim().toLowerCase();

    let referrerUserId: string | null = null;
    let referrerProfileId: string | null = null;
    if (/^LF-[A-Z2-9]{6}$/.test(code)) {
      const referrer = await db.user.findUnique({ where: { referralCode: code }, select: { id: true, email: true } });
      if (!referrer) return { applied: false };
      if (referrer.email.toLowerCase() === email) return { applied: false }; // auto-parrainage
      referrerUserId = referrer.id;
    } else if (/^FAN-[A-Z2-9]{6}$/.test(code)) {
      const fan = await db.superfanProfile.findUnique({ where: { fanCode: code }, select: { id: true } });
      if (!fan) return { applied: false };
      referrerProfileId = fan.id;
    } else {
      return { applied: false };
    }

    const existing = await db.referral.findFirst({
      where: { refereeEmail: email, status: { in: ["PENDING", "CONVERTED", "REWARDED"] } },
      select: { id: true },
    });
    if (existing) return { applied: false };
    await db.referral.create({
      data: {
        codeUsed: code,
        referrerUserId,
        referrerProfileId,
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
 *
 * ADR-0158 : si le parrain est un FAN (passeport), la conversion payée du
 * filleul est LA preuve d'advocacy vérifiée exigée par ADR-0141 — le gate
 * `RECOMMENDED` est franchi via la voie gouvernée `SESHAT_REGISTER_SUPERFAN`
 * (jamais un write direct, jamais du simple footprint). La récompense FCFA/
 * statut reste un geste opérateur (file /console/socle/parrainages).
 */
export async function markReferralConverted(subscriberEmail: string): Promise<void> {
  try {
    const email = subscriberEmail.trim().toLowerCase();
    const pending = await db.referral.findMany({
      where: { refereeEmail: email, status: "PENDING" },
      select: { id: true, referrerProfileId: true },
    });
    if (pending.length === 0) return;
    await db.referral.updateMany({
      where: { id: { in: pending.map((r) => r.id) } },
      data: { status: "CONVERTED", convertedAt: new Date() },
    });

    const fanProfileIds = [...new Set(pending.map((r) => r.referrerProfileId).filter(Boolean))] as string[];
    for (const profileId of fanProfileIds) {
      try {
        const profile = await db.superfanProfile.findUnique({
          where: { id: profileId },
          select: { strategyId: true, platform: true, handle: true, segment: true, engagementDepth: true },
        });
        if (!profile) continue;
        const { DEVOTION_LADDER_TIERS } = await import("@/domain/devotion-ladder");
        const segment = (DEVOTION_LADDER_TIERS as readonly string[]).includes(profile.segment)
          ? (profile.segment as (typeof DEVOTION_LADDER_TIERS)[number])
          : "SPECTATEUR";
        const { emitIntentTyped } = await import("@/server/services/mestor/intents");
        await emitIntentTyped(
          {
            kind: "SESHAT_REGISTER_SUPERFAN",
            strategyId: profile.strategyId,
            platform: profile.platform,
            handle: profile.handle,
            segment,
            engagementDepth: profile.engagementDepth,
            source: "CRM",
            conditions: {
              RECOMMENDED: {
                source: "CRM",
                at: new Date().toISOString(),
                note: "Parrainage converti — filleul devenu client (preuve vérifiée ADR-0141).",
              },
            },
          },
          { caller: "referral:converted" },
        );
      } catch {
        /* best-effort — le flip CONVERTED reste acquis */
      }
    }
  } catch {
    /* jamais bloquant */
  }
}

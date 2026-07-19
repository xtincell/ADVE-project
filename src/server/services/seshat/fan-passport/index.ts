/**
 * Passeport fan v1 (ADR-0158 — Phase B état-final, boucle B2 FANS).
 *
 * Le passeport est LA face fan de la mesure de dévotion : une page publique
 * accédée par token non-devinable (aucun compte requis, pattern shareToken),
 * qui rend la dévotion VISIBLE pour le fan (statut + conditions franchies),
 * porte son code de parrainage (FAN-XXXXXX) et le relie aux autres fans
 * (le lien fan-à-fan prime — correction empirique ⚗️ du plan d'état final).
 *
 * Gouvernance :
 *   - la DÉLIVRANCE est un geste opérateur gouverné (`SESHAT_ISSUE_FAN_PASSPORT`,
 *     requireOperator) — jamais une auto-inscription : le passeport matérialise
 *     un suivi déjà né par la voie unique `SESHAT_REGISTER_SUPERFAN` ;
 *   - ce module est le SINGLE-WRITER des champs passeport (`passportToken`,
 *     `fanCode`, `passportIssuedAt`) — verrou HARD `fan-passport.test.ts` ;
 *   - la lecture publique projette UNIQUEMENT des identités publiques
 *     (handle/displayName sociaux) — jamais d'email, jamais de téléphone,
 *     jamais le déchiffrement identity-graph.
 *
 * WhatsApp pull-first (⚗️) : le passeport ne broadcast rien — il donne au fan
 * les gestes sortants (écrire à la marque, partager son code). 100 %
 * déterministe, zéro LLM.
 */

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import {
  DEVOTION_LADDER_TIERS,
  devotionLadderPosition,
  type DevotionLadderTier,
} from "@/domain/devotion-ladder";
import {
  SUPERFAN_CONDITIONS,
  metConditions,
  type SuperfanCondition,
  type SuperfanConditionMap,
} from "@/domain/superfan-conditions";

// ── Code fan (même alphabet dictable que LF-, préfixe distinct) ──────────────

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sans I/L/O/0/1

export const FAN_CODE_RE = /^FAN-[A-Z2-9]{6}$/;

export function isFanCode(code: string): boolean {
  return FAN_CODE_RE.test(code);
}

function randomFanCode(): string {
  let out = "FAN-";
  for (let i = 0; i < 6; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]!;
  }
  return out;
}

/** Longueur minimale de token acceptée en lecture (garde anti-bruteforce). */
export const PASSPORT_TOKEN_MIN_LENGTH = 16;

// ── Délivrance (écriture unique des champs passeport) ────────────────────────

export interface IssuedPassport {
  profileId: string;
  token: string;
  fanCode: string;
  issuedAt: Date;
  alreadyIssued: boolean;
}

/**
 * Délivre le passeport d'un profil suivi (idempotent : re-délivrer renvoie le
 * passeport existant, jamais de rotation silencieuse du lien déjà partagé).
 */
export async function issueFanPassport(profileId: string): Promise<IssuedPassport> {
  const profile = await db.superfanProfile.findUniqueOrThrow({
    where: { id: profileId },
    select: { id: true, passportToken: true, fanCode: true, passportIssuedAt: true },
  });
  if (profile.passportToken && profile.fanCode) {
    return {
      profileId,
      token: profile.passportToken,
      fanCode: profile.fanCode,
      issuedAt: profile.passportIssuedAt ?? new Date(),
      alreadyIssued: true,
    };
  }

  const token = profile.passportToken ?? randomBytes(24).toString("base64url");
  for (let attempt = 0; attempt < 5; attempt++) {
    const fanCode = profile.fanCode ?? randomFanCode();
    try {
      const issuedAt = new Date();
      await db.superfanProfile.update({
        where: { id: profileId },
        data: { passportToken: token, fanCode, passportIssuedAt: issuedAt },
      });
      return { profileId, token, fanCode, issuedAt, alreadyIssued: false };
    } catch {
      // collision unique sur fanCode — on retente avec un autre code
      if (profile.fanCode) throw new Error("PASSPORT_ISSUE_FAILED");
    }
  }
  throw new Error("FAN_CODE_GENERATION_FAILED");
}

// ── Lecture publique (projection stricte, zéro PII privée) ───────────────────

/** Libellés fan-facing des rungs (échelle d'engagement, lexique T7). */
export const TIER_PUBLIC_LABELS: Record<DevotionLadderTier, string> = {
  SPECTATEUR: "Spectateur",
  INTERESSE: "Intéressé",
  PARTICIPANT: "Participant",
  ENGAGE: "Engagé",
  AMBASSADEUR: "Ambassadeur",
  EVANGELISTE: "Prescripteur",
};

/** Libellés fan-facing des conditions franchies (preuves, jamais des scores). */
export const CONDITION_PUBLIC_LABELS: Record<SuperfanCondition, string> = {
  VIEWED: "A découvert la marque",
  INTERACTED: "Participe aux conversations",
  PAID: "Client de la marque",
  RECOMMENDED: "A recommandé la marque",
  SHARED: "Porte la marque publiquement",
};

/** Prochaine étape proposée au fan (initiation — jamais une promesse chiffrée). */
export const NEXT_STEP_LABELS: Partial<Record<SuperfanCondition, string>> = {
  INTERACTED: "Commentez ou répondez à la marque sur ses réseaux.",
  PAID: "Devenez client — c'est la preuve la plus simple.",
  RECOMMENDED: "Recommandez la marque avec votre code — chaque diagnostic offert compte.",
  SHARED: "Portez la marque publiquement (partage, avis, contenu).",
};

export interface PassportCircleEntry {
  name: string;
  platform: string;
  tierLabel: string;
}

export interface PassportFanMission {
  title: string;
  slug: string | null;
  category: string | null;
  budget: string | null;
}

export interface FanPassportView {
  brandName: string;
  brandSlug: string | null;
  fanName: string;
  platform: string;
  tier: DevotionLadderTier;
  tierLabel: string;
  /** Position 1..6 sur l'échelle (pour la jauge). */
  ladderPosition: number;
  ladderSize: number;
  conditions: Array<{ key: SuperfanCondition; label: string; met: boolean; at: string | null }>;
  nextSteps: string[];
  fanCode: string | null;
  /** Parrainages réellement enregistrés avec ce code (comptes, jamais fabriqués). */
  referrals: { pending: number; converted: number };
  circle: PassportCircleEntry[];
  fanMissions: PassportFanMission[];
  /** Numéro WhatsApp déclaré de la marque (businessContext) — null = masqué. */
  brandWhatsapp: string | null;
  issuedAt: string | null;
}

function readConditions(metadata: unknown): SuperfanConditionMap {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const conditions = (metadata as Record<string, unknown>).conditions;
  if (!conditions || typeof conditions !== "object" || Array.isArray(conditions)) return {};
  return conditions as SuperfanConditionMap;
}

function readDisplayName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const name = (metadata as Record<string, unknown>).displayName;
  return typeof name === "string" && name.trim() ? name : null;
}

function readBrandWhatsapp(businessContext: unknown): string | null {
  if (!businessContext || typeof businessContext !== "object" || Array.isArray(businessContext)) return null;
  const raw = (businessContext as Record<string, unknown>).whatsappNumber;
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

/**
 * Vue publique du passeport. Token inconnu ou trop court → null (la page rend
 * 404). Tout ce qui est projeté est une identité sociale PUBLIQUE.
 */
export async function getPassportByToken(token: string): Promise<FanPassportView | null> {
  if (!token || token.length < PASSPORT_TOKEN_MIN_LENGTH) return null;
  const profile = await db.superfanProfile.findUnique({
    where: { passportToken: token },
    select: {
      id: true,
      strategyId: true,
      platform: true,
      handle: true,
      segment: true,
      metadata: true,
      fanCode: true,
      passportIssuedAt: true,
      strategy: { select: { name: true, publicSlug: true, businessContext: true } },
    },
  });
  if (!profile) return null;

  const tier: DevotionLadderTier = (DEVOTION_LADDER_TIERS as readonly string[]).includes(profile.segment)
    ? (profile.segment as DevotionLadderTier)
    : "SPECTATEUR";
  const conditionMap = readConditions(profile.metadata);
  const met = new Set(metConditions(conditionMap));

  const [circleRows, missions, referralRows] = await Promise.all([
    db.superfanProfile.findMany({
      where: { strategyId: profile.strategyId, id: { not: profile.id } },
      orderBy: { engagementDepth: "desc" },
      take: 12,
      select: { platform: true, handle: true, segment: true, metadata: true },
    }),
    db.mission.findMany({
      where: {
        strategyId: profile.strategyId,
        guildPublished: true,
        status: "DRAFT",
        assigneeId: null,
        category: "FAN",
      },
      orderBy: { guildPublishedAt: "desc" },
      take: 6,
      select: { title: true, publicSlug: true, category: true, budget: true },
    }),
    profile.fanCode
      ? db.referral.groupBy({
          by: ["status"],
          where: { referrerProfileId: profile.id },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const referrals = { pending: 0, converted: 0 };
  for (const row of referralRows) {
    if (row.status === "PENDING") referrals.pending += row._count._all;
    if (row.status === "CONVERTED" || row.status === "REWARDED") referrals.converted += row._count._all;
  }

  return {
    brandName: profile.strategy.name,
    brandSlug: profile.strategy.publicSlug ?? null,
    fanName: readDisplayName(profile.metadata) ?? profile.handle,
    platform: profile.platform,
    tier,
    tierLabel: TIER_PUBLIC_LABELS[tier],
    ladderPosition: devotionLadderPosition(tier) + 1,
    ladderSize: DEVOTION_LADDER_TIERS.length,
    conditions: SUPERFAN_CONDITIONS.map((key) => ({
      key,
      label: CONDITION_PUBLIC_LABELS[key],
      met: met.has(key),
      at: conditionMap[key]?.at ?? null,
    })),
    nextSteps: SUPERFAN_CONDITIONS.filter((c) => !met.has(c) && NEXT_STEP_LABELS[c]).map(
      (c) => NEXT_STEP_LABELS[c]!,
    ).slice(0, 2),
    fanCode: profile.fanCode,
    referrals,
    circle: circleRows.map((r) => {
      const rTier: DevotionLadderTier = (DEVOTION_LADDER_TIERS as readonly string[]).includes(r.segment)
        ? (r.segment as DevotionLadderTier)
        : "SPECTATEUR";
      return {
        name: readDisplayName(r.metadata) ?? r.handle,
        platform: r.platform,
        tierLabel: TIER_PUBLIC_LABELS[rTier],
      };
    }),
    fanMissions: missions.map((m) => ({
      title: m.title,
      slug: m.publicSlug ?? null,
      category: m.category ?? null,
      budget: m.budget != null ? `${new Intl.NumberFormat("fr-FR").format(m.budget)} FCFA` : null,
    })),
    brandWhatsapp: readBrandWhatsapp(profile.strategy.businessContext),
    issuedAt: profile.passportIssuedAt?.toISOString() ?? null,
  };
}

/** Liste opérateur : profils suivis + état passeport (panneau de délivrance). */
export async function listPassportStates(strategyId: string) {
  const rows = await db.superfanProfile.findMany({
    where: { strategyId },
    orderBy: { engagementDepth: "desc" },
    take: 100,
    select: {
      id: true,
      platform: true,
      handle: true,
      segment: true,
      metadata: true,
      passportToken: true,
      fanCode: true,
      passportIssuedAt: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    platform: r.platform,
    handle: r.handle,
    displayName: readDisplayName(r.metadata),
    segment: r.segment,
    issued: !!r.passportToken,
    fanCode: r.fanCode,
    passportToken: r.passportToken,
    issuedAt: r.passportIssuedAt?.toISOString() ?? null,
  }));
}

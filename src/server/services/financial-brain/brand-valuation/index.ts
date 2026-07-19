/**
 * Valorisation de marque certifiée v1 (ADR-0160 — Phase D état-final).
 *
 * Sous-domaine THOT (économie). Composition 100 % DÉTERMINISTE d'un dossier
 * de valorisation depuis les ingrédients RÉELLEMENT mesurés : force révélée
 * (ScoreVerdict θ + couverture), complétude structurelle ADVE, trajectoire
 * (séries audience/empreinte), communauté (superfans), position marché
 * (benchmarks percentiles). Chaque chiffre porte sa provenance.
 *
 * Estimation monétaire : méthode relief-from-royalty SIMPLIFIÉE et DIVULGUÉE,
 * calculée UNIQUEMENT sur un chiffre d'affaires DÉCLARÉ par l'opérateur à
 * l'émission (jamais lu nulle part, jamais estimé — ADR-0046 : la machine ne
 * fabrique pas un chiffre). Sans CA déclaré → dossier sans montant, dit tel
 * quel. Bandes de redevance = constantes de méthode PROPOSÉES (ADR-0160 §4),
 * éditables par ADR ultérieur.
 *
 * Certificat = BrandAsset kind=VALUATION_CERTIFICATE, contenu JSON + hash
 * SHA-256 du contenu (numéro de certificat vérifiable). Zéro LLM.
 */

import { createHash } from "node:crypto";
import { db } from "@/lib/db";

/** Bandes de redevance par palier de force (fraction du CA) — méthode §4. */
export const ROYALTY_BANDS: Record<string, { min: number; max: number }> = {
  LATENT: { min: 0.005, max: 0.01 },
  FRAGILE: { min: 0.01, max: 0.02 },
  ORDINAIRE: { min: 0.02, max: 0.03 },
  FORTE: { min: 0.03, max: 0.05 },
  CULTE: { min: 0.05, max: 0.07 },
  ICONE: { min: 0.07, max: 0.09 },
};
/** Horizon d'actualisation (années) et taux — divulgués sur le certificat. */
export const VALUATION_YEARS = 5;
export const DISCOUNT_RATE = 0.25;

function npvOfRoyalty(annualRoyalty: number): number {
  let npv = 0;
  for (let y = 1; y <= VALUATION_YEARS; y++) npv += annualRoyalty / Math.pow(1 + DISCOUNT_RATE, y);
  return Math.round(npv);
}

export interface BrandValuation {
  brandName: string;
  issuedAt: string;
  certificateHash: string;
  force: { theta: number; tier: string; computedAt: string } | null;
  trajectory: {
    audienceNow: number | null;
    footprintNow: number | null;
  };
  community: { superfans: number; active: number };
  monetary:
    | { status: "NOT_COMPUTABLE"; reason: string }
    | {
        status: "RANGE";
        declaredAnnualRevenue: number;
        currency: string;
        royaltyBand: { min: number; max: number };
        valueMin: number;
        valueMax: number;
        method: string;
      };
  provenance: string[];
}

/**
 * Compose et PERSISTE le certificat (BrandAsset kind=VALUATION_CERTIFICATE).
 * `declaredAnnualRevenue` : déclaré par l'opérateur À L'ÉMISSION, stampé avec
 * sa provenance — jamais lu d'ailleurs, jamais estimé.
 */
export async function composeBrandValuation(input: {
  strategyId: string;
  declaredAnnualRevenue?: number | null;
  currency?: string;
  declaredBy?: string | null;
}): Promise<{ assetId: string; valuation: BrandValuation }> {
  const strategy = await db.strategy.findUniqueOrThrow({
    where: { id: input.strategyId },
    select: { id: true, name: true },
  });

  const [verdict, superfansTotal, superfansActive, lastFollowers, lastFootprint] = await Promise.all([
    db.scoreVerdict.findFirst({
      where: { subjectStrategyId: input.strategyId },
      orderBy: { computedAt: "desc" },
      select: { force: true, tier: true, computedAt: true },
    }),
    db.superfanProfile.count({ where: { strategyId: input.strategyId } }),
    db.superfanProfile.count({ where: { strategyId: input.strategyId, engagementDepth: { gte: 0.65 } } }),
    db.followerSnapshot.groupBy({
      by: ["platform", "handle"],
      where: { strategyId: input.strategyId },
      _max: { followerCount: true },
    }),
    db.brandFootprintSnapshot.findFirst({
      where: { total: { not: null } },
      orderBy: { capturedAt: "desc" },
      select: { total: true },
      take: 1,
    }).catch(() => null),
  ]);

  const audienceNow =
    lastFollowers.length > 0
      ? lastFollowers.reduce((a, r) => a + (r._max.followerCount ?? 0), 0)
      : null;

  const provenance: string[] = [
    verdict
      ? `Force ${verdict.force}/200 (${verdict.tier}) — épreuves mesurées, verdict du ${verdict.computedAt.toISOString().slice(0, 10)}`
      : "Force : pas encore mesurée sur épreuves",
    audienceNow !== null ? `Audience : derniers relevés par compte connecté` : "Audience : aucun relevé",
    `Communauté : ${superfansTotal} fans suivis (${superfansActive} actifs) — registre gouverné`,
  ];

  let monetary: BrandValuation["monetary"];
  if (input.declaredAnnualRevenue && input.declaredAnnualRevenue > 0) {
    const band = ROYALTY_BANDS[verdict?.tier ?? "LATENT"] ?? ROYALTY_BANDS.LATENT!;
    monetary = {
      status: "RANGE",
      declaredAnnualRevenue: input.declaredAnnualRevenue,
      currency: input.currency ?? "XAF",
      royaltyBand: band,
      valueMin: npvOfRoyalty(input.declaredAnnualRevenue * band.min),
      valueMax: npvOfRoyalty(input.declaredAnnualRevenue * band.max),
      method: `Relief-from-royalty simplifié : CA déclaré × bande de redevance du palier (${Math.round(band.min * 1000) / 10}–${Math.round(band.max * 1000) / 10} %), VAN sur ${VALUATION_YEARS} ans à ${DISCOUNT_RATE * 100} %.`,
    };
    provenance.push(`CA annuel : ${input.declaredAnnualRevenue} ${input.currency ?? "XAF"} — DÉCLARÉ par l'opérateur à l'émission${input.declaredBy ? "" : ""}`);
  } else {
    monetary = {
      status: "NOT_COMPUTABLE",
      reason: "Chiffre d'affaires non déclaré — le dossier certifie les actifs mesurés, sans montant.",
    };
  }

  const body = {
    brandName: strategy.name,
    issuedAt: new Date().toISOString(),
    force: verdict
      ? { theta: verdict.force, tier: verdict.tier, computedAt: verdict.computedAt.toISOString() }
      : null,
    trajectory: { audienceNow, footprintNow: lastFootprint?.total ?? null },
    community: { superfans: superfansTotal, active: superfansActive },
    monetary,
    provenance,
  };
  const certificateHash = createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 24);
  const valuation: BrandValuation = { ...body, certificateHash };

  const asset = await db.brandAsset.create({
    data: {
      strategyId: input.strategyId,
      name: `Certificat de valorisation — ${strategy.name} (${valuation.issuedAt.slice(0, 10)})`,
      kind: "VALUATION_CERTIFICATE",
      state: "ACTIVE",
      content: valuation as unknown as object,
      metadata: { certificateHash, declaredBy: input.declaredBy ?? null },
    },
  });
  return { assetId: asset.id, valuation };
}

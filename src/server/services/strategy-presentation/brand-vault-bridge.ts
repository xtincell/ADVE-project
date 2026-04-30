/**
 * Oracle → BrandVault bridge.
 *
 * Promeut les sorties stables de l'Oracle (manifesto, big idea, claim, brief
 * créatif) en BrandAsset candidats dans le vault unifié (cf. ADR-0012).
 * Phase F du pipeline `enrichAllSectionsNeteru`.
 *
 * Pourquoi : l'Oracle écrit aujourd'hui dans `Pillar.content` (JSONB), donc
 * le brand-vault unifié reste vide alors que la marque produit du contenu.
 * Cette bridge convertit chaque output Oracle stable en BrandAsset
 * INTELLECTUAL (kind=BIG_IDEA / MANIFESTO / CLAIM / CREATIVE_BRIEF), créé
 * en CANDIDATE puis promu ACTIVE si aucun ACTIVE existant du même kind.
 *
 * Hash-chain lineage : `sourceIntentId` = ENRICH_ORACLE intent émis par
 * Mestor (récupéré via la dernière IntentEmission active sur la strategy).
 *
 * Cf. PANTHEON.md §2.5, ADR-0012, brand-vault/engine.ts.
 */

import { db } from "@/lib/db";
import { createBrandAsset, promoteToActive } from "@/server/services/brand-vault/engine";

interface PillarContent extends Record<string, unknown> {}

interface PromotionPlan {
  kind: string; // BrandAssetKind from schema
  name: string;
  content: Record<string, unknown>;
  summary: string;
  pillarSource: "A" | "D" | "V" | "E" | "R" | "T" | "I" | "S";
}

/**
 * Construit la liste des promotions candidates depuis les pillar.content.
 * Chaque entrée = 1 BrandAsset à créer si pas d'ACTIVE existant du même kind.
 */
function buildPromotionPlans(
  pillarsByKey: Record<string, PillarContent>,
  brandName: string,
): PromotionPlan[] {
  const plans: PromotionPlan[] = [];
  const a = pillarsByKey.a ?? {};
  const d = pillarsByKey.d ?? {};
  const v = pillarsByKey.v ?? {};

  // ── MANIFESTO ← Pilier A (founding myth + brand DNA + cultural anchors) ──
  const enemy = a.enemy as { manifesto?: string; narrative?: string; name?: string } | undefined;
  const prophecy = a.prophecy as { worldTransformed?: string; urgency?: string; horizon?: string } | undefined;
  if (enemy?.manifesto || prophecy?.worldTransformed) {
    plans.push({
      kind: "MANIFESTO",
      name: `${brandName} — Manifesto`,
      content: {
        enemy: enemy ?? null,
        prophecy: prophecy ?? null,
        archetype: a.archetype ?? null,
        citationFondatrice: a.citationFondatrice ?? null,
      },
      summary:
        (typeof enemy?.manifesto === "string" ? enemy.manifesto : "") ||
        (typeof prophecy?.worldTransformed === "string" ? prophecy.worldTransformed : "") ||
        `${brandName} manifesto`,
      pillarSource: "A",
    });
  }

  // ── BIG_IDEA ← Pilier D (territoire-creatif : concept + moodboard + KV) ──
  const concept = d.conceptGenerator ?? d.concept ?? null;
  if (concept) {
    plans.push({
      kind: "BIG_IDEA",
      name: `${brandName} — Big Idea`,
      content: {
        concept,
        moodboard: d.moodboard ?? null,
        directionArtistique: d.directionArtistique ?? null,
        kvPrompts: d.kvPrompts ?? null,
      },
      summary: typeof concept === "string" ? concept : `${brandName} big idea`,
      pillarSource: "D",
    });
  }

  // ── CLAIM ← Pilier V (proposition-valeur : promesse + pricing strategy) ──
  if (v.promesseMaitre || v.pricingStrategy || (Array.isArray(v.proofPoints) && (v.proofPoints as unknown[]).length > 0)) {
    plans.push({
      kind: "CLAIM",
      name: `${brandName} — Claim`,
      content: {
        promesseMaitre: v.promesseMaitre ?? null,
        pricingStrategy: v.pricingStrategy ?? null,
        proofPoints: v.proofPoints ?? [],
        guarantees: v.guarantees ?? [],
      },
      summary:
        typeof v.promesseMaitre === "string"
          ? v.promesseMaitre
          : typeof v.pricingStrategy === "string"
          ? v.pricingStrategy
          : `${brandName} value claim`,
      pillarSource: "V",
    });
  }

  // ── CREATIVE_BRIEF ← Pilier D (kv-brief textuel) ──
  // KV brief textuel — le rendu visuel est une matérialisation Ptah séparée
  // (AssetVersion via PTAH_MATERIALIZE_BRIEF). Ici on dépose le brief intellectuel.
  if (d.kvPrompts || d.directionArtistique) {
    plans.push({
      kind: "KV_ART_DIRECTION_BRIEF",
      name: `${brandName} — KV Art Direction Brief`,
      content: {
        kvPrompts: d.kvPrompts ?? null,
        directionArtistique: d.directionArtistique ?? null,
        chromaticStrategy: d.chromaticStrategy ?? null,
        typographySystem: d.typographySystem ?? null,
      },
      summary: `Brief direction artistique ${brandName}`,
      pillarSource: "D",
    });
  }

  return plans;
}

export interface VaultPromotionResult {
  candidatesCreated: number;
  promotedToActive: number;
  details: Array<{ kind: string; assetId: string; promoted: boolean; skipped?: string }>;
}

/**
 * Promeut les sorties Oracle stables en BrandAsset.
 *
 * Algorithme :
 *   1. Lire les pillars A/D/V de la strategy
 *   2. Construire les plans de promotion (1 plan = 1 kind candidat)
 *   3. Pour chaque plan, vérifier qu'il n'existe pas déjà un BrandAsset
 *      ACTIVE de ce kind pour la strategy
 *   4. Si pas d'ACTIVE → créer DRAFT puis promouvoir ACTIVE
 *   5. Sinon → skip (pour ne pas écraser les choix précédents de l'opérateur)
 *
 * Idempotent : appelable plusieurs fois ; ne crée que si manquant.
 */
export async function promoteOracleOutputsToVault(
  strategyId: string,
): Promise<VaultPromotionResult> {
  const result: VaultPromotionResult = {
    candidatesCreated: 0,
    promotedToActive: 0,
    details: [],
  };

  const strategy = await db.strategy.findUnique({
    where: { id: strategyId },
    select: {
      id: true,
      name: true,
      operatorId: true,
      userId: true,
      pillars: { select: { key: true, content: true } },
    },
  });

  if (!strategy) return result;

  // operatorId fallback : si Strategy n'a pas operatorId (legacy), on utilise userId
  // (BrandAsset model accepte les deux selon le contexte). Pas de Pilier 3 violation
  // car la promotion est un downstream de WRITE_PILLAR déjà validé.
  const operatorId = strategy.operatorId ?? strategy.userId;
  if (!operatorId) {
    return result; // strategy sans owner — on ne peut pas attribuer le BrandAsset
  }

  const pillarsByKey: Record<string, PillarContent> = {};
  for (const p of strategy.pillars) {
    pillarsByKey[p.key] = (p.content ?? {}) as PillarContent;
  }

  const plans = buildPromotionPlans(pillarsByKey, strategy.name);

  // Récupérer les BrandAsset ACTIVE existants pour skip-if-active
  const existingActives = await db.brandAsset.findMany({
    where: { strategyId, state: "ACTIVE" },
    select: { kind: true },
  });
  const activeKinds = new Set(existingActives.map((b: { kind: string }) => b.kind));

  for (const plan of plans) {
    if (activeKinds.has(plan.kind)) {
      result.details.push({
        kind: plan.kind,
        assetId: "",
        promoted: false,
        skipped: "ACTIVE asset of this kind already exists",
      });
      continue;
    }

    try {
      // 1. Create DRAFT
      const asset = await createBrandAsset({
        strategyId,
        operatorId,
        name: plan.name,
        kind: plan.kind,
        family: "INTELLECTUAL",
        content: plan.content,
        summary: plan.summary,
        pillarSource: plan.pillarSource,
        state: "DRAFT",
      });
      result.candidatesCreated++;

      // 2. Promote to ACTIVE
      try {
        await promoteToActive({ brandAssetId: asset.id, promotedById: operatorId });
        result.promotedToActive++;
        result.details.push({ kind: plan.kind, assetId: asset.id, promoted: true });
      } catch (err) {
        result.details.push({
          kind: plan.kind,
          assetId: asset.id,
          promoted: false,
          skipped: `promote failed: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    } catch (err) {
      result.details.push({
        kind: plan.kind,
        assetId: "",
        promoted: false,
        skipped: `create failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  return result;
}

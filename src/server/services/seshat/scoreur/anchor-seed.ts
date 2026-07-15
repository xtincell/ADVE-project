/**
 * ADR-0147 — seed du canon jauge : ancres-étalons (θ fixé) + opponents-items
 * (must-have Rasch à difficulté fixée). Idempotent (upsert par slug). PROPOSÉ —
 * ratification opérateur des θ.
 */

import { ANCHOR_REGISTRY } from "@/domain/scoreur";
import { MUST_HAVE_ITEMS } from "@/domain/scoreur";
import type { BrandTier } from "@/domain/brand-tier";
import { upsertBrandRef } from "./index";
import { ITEM_OPPONENTS } from "./compilateur";

/** Difficulté canon des items par palier (échelle Elo, gauge NATION). PROPOSÉ. */
export const ITEM_DIFFICULTY_BY_TIER: Record<Exclude<BrandTier, "LATENT">, number> = {
  FRAGILE: 1250,
  ORDINAIRE: 1400,
  FORTE: 1600,
  CULTE: 1800,
  ICONE: 1950,
};

/** Difficulté des items opponents mesurés (E-floor, T-frame) = seuil CULTE. */
const MEASURED_ITEM_THETA = ITEM_DIFFICULTY_BY_TIER.CULTE;

export async function seedScoreurCanon(): Promise<{ anchors: number; items: number }> {
  let anchors = 0;
  for (const a of ANCHOR_REGISTRY) {
    await upsertBrandRef({
      kind: "ANCHOR",
      slug: `anchor-${a.id}`,
      name: a.label,
      marketScale: a.scale,
      fixedTheta: a.theta,
      source: "ADR-0147 anchor registry",
    });
    anchors++;
  }

  let items = 0;
  // Items opponents des must-have (A/D/V + tenue + crise) — Rasch à difficulté fixée.
  for (const item of MUST_HAVE_ITEMS) {
    await upsertBrandRef({
      kind: "ITEM",
      slug: `item-${item.id}`,
      name: item.label,
      fixedTheta: ITEM_DIFFICULTY_BY_TIER[item.tier],
      source: "ADR-0147 must-have item",
    });
    items++;
  }
  // Items opponents mesurés (compilateur E/T).
  for (const slug of Object.values(ITEM_OPPONENTS)) {
    await upsertBrandRef({
      kind: "ITEM",
      slug,
      name: slug,
      fixedTheta: MEASURED_ITEM_THETA,
      source: "ADR-0147 measured item",
    });
    items++;
  }
  return { anchors, items };
}

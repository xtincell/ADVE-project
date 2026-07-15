/**
 * ADR-0150 — vérif E2E : éditer le canon (jauge) change réellement le score d'une
 * marque déjà scorée, sans redéploiement. Réutilise la marque démo QUARTIER.
 *   npx tsx scripts/verify-scoreur-canon.ts
 */
import { db } from "@/lib/db";
import { scoreBrand } from "@/server/services/seshat/scoreur";
import { upsertGaugeOverride, resetCanonOverride } from "@/server/services/seshat/scoreur/canon";
import { GAUGE_BY_SCALE } from "@/domain/scoreur";

const STRAT = "demo-strat-atelier-lumiere";

async function main() {
  const exists = await db.strategy.findUnique({ where: { id: STRAT }, select: { id: true } });
  if (!exists) {
    console.error(`Marque démo absente (${STRAT}). Lance d'abord: npm run db:seed:scoreur`);
    process.exit(2);
  }

  // Repart d'un canon propre (retire un éventuel override QUARTIER).
  await resetCanonOverride({ kind: "GAUGE", key: "QUARTIER" });
  const before = (await scoreBrand(STRAT, { persist: false })).verdict;
  console.log(`AVANT  → ${before.tier} · force ${before.force}/200`);

  // Édite la jauge QUARTIER (resserre l'icône) → même θ vaut plus de force.
  const def = GAUGE_BY_SCALE.QUARTIER;
  await upsertGaugeOverride({ marketScale: "QUARTIER", floor: def.floor, icone: def.floor + 200 });
  const after = (await scoreBrand(STRAT, { persist: false })).verdict;
  console.log(`APRÈS  → ${after.tier} · force ${after.force}/200  (jauge QUARTIER resserrée)`);

  // Nettoie l'override (retour au défaut).
  await resetCanonOverride({ kind: "GAUGE", key: "QUARTIER" });
  const restored = (await scoreBrand(STRAT, { persist: false })).verdict;
  console.log(`RESET  → ${restored.tier} · force ${restored.force}/200  (retour défaut)`);

  const changed = after.force > before.force;
  const reverted = Math.abs(restored.force - before.force) < 0.001;
  console.log(`\néditable a posteriori: ${changed ? "OK (score a bougé)" : "ÉCHEC"} · réversible: ${reverted ? "OK" : "ÉCHEC"}`);
  await db.$disconnect();
  if (!changed || !reverted) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Diagnostic (read-only) — flux pilier I → base d'actions → pilier S.
 * Répond : le blob I a-t-il le catalogue ? la projection BrandAction est-elle
 * alimentée et fraîche ? S voit-il des initiatives sélectionnées ?
 *
 *   node --env-file-if-exists=.env.local --import tsx scripts/diag-i-s-actions.ts [strategyId]
 */
import { db } from "@/lib/db";
import { collectNormalizedInitiatives } from "@/lib/types/pillar-schemas";

function tally(arr: string[]): string {
  const m: Record<string, number> = {};
  for (const x of arr) m[x] = (m[x] ?? 0) + 1;
  return Object.entries(m).map(([k, v]) => `${k}:${v}`).join(", ") || "(aucun)";
}

async function pick(): Promise<string | null> {
  if (process.argv[2]) return process.argv[2];
  const rows = await db.pillar.findMany({ where: { key: "a" }, orderBy: { updatedAt: "desc" }, take: 50, select: { strategyId: true, content: true } });
  for (const r of rows) { const c = (r.content ?? {}) as Record<string, unknown>; if (typeof c.nomMarque === "string" && c.nomMarque.trim()) return r.strategyId; }
  return rows[0]?.strategyId ?? null;
}

async function main() {
  const sid = await pick();
  if (!sid) { console.error("aucune stratégie"); process.exit(1); }
  const name = ((await db.pillar.findUnique({ where: { strategyId_key: { strategyId: sid, key: "a" } }, select: { content: true } }))?.content as any)?.nomMarque ?? "?";
  console.log(`\n=== Diagnostic I→base→S — ${sid} (« ${name} ») ===\n`);

  // ── Pilier I (blob) ──
  const iRow = await db.pillar.findUnique({ where: { strategyId_key: { strategyId: sid, key: "i" } }, select: { content: true, updatedAt: true } });
  const i = (iRow?.content ?? {}) as Record<string, any>;
  const cat = (i.catalogueParCanal ?? {}) as Record<string, unknown[]>;
  const catCounts = Object.entries(cat).map(([k, v]) => `${k}:${Array.isArray(v) ? v.length : 0}`).join(", ");
  console.log("── PILIER I (blob) ──");
  console.log(`  mis à jour       : ${iRow?.updatedAt?.toISOString() ?? "?"}`);
  console.log(`  catalogueParCanal: ${catCounts || "(vide)"}`);
  console.log(`  totalActions     : ${i.totalActions ?? "?"}`);
  console.log(`  assets/activ/fmt : ${(i.assetsProduisibles?.length ?? 0)} / ${(i.activationsPossibles?.length ?? 0)} / ${(i.formatsDisponibles?.length ?? 0)}`);
  const firstAction = Object.values(cat).flat()[0] as Record<string, unknown> | undefined;
  console.log(`  1ère action      : ${firstAction ? JSON.stringify(firstAction) : "(aucune)"}`);
  console.log(`    → a un id ?    : ${firstAction && "id" in firstAction ? "OUI" : "NON"}   a un status ? : ${firstAction && "status" in firstAction ? "OUI" : "NON"}`);

  // ── Normalisation (ce que I/S/materializer voient) ──
  const inits = collectNormalizedInitiatives(i);
  console.log("\n── collectNormalizedInitiatives(I) ──");
  console.log(`  initiatives normalisées : ${inits.length}`);
  console.log(`  statuts                 : ${tally(inits.map((x) => x.status))}`);
  console.log(`  SELECTED_FOR_ROADMAP    : ${inits.filter((x) => x.status === "SELECTED_FOR_ROADMAP").length}  ← ce que S agrège`);

  // ── Projection BrandAction (ce que le panel + Oracle lisent) ──
  const ba = await db.brandAction.findMany({ where: { strategyId: sid }, select: { source: true, status: true, selected: true, updatedAt: true, title: true } });
  console.log("\n── BrandAction (projection DB lue par le panel & l'Oracle) ──");
  console.log(`  total rows   : ${ba.length}`);
  console.log(`  par source   : ${tally(ba.map((x) => x.source ?? "null"))}`);
  console.log(`  par status   : ${tally(ba.map((x) => x.status))}`);
  console.log(`  selected     : ${ba.filter((x) => x.selected).length}`);
  const newest = ba.map((x) => x.updatedAt?.getTime() ?? 0).sort((a, b) => b - a)[0];
  console.log(`  plus récente : ${newest ? new Date(newest).toISOString() : "(aucune)"}`);
  console.log(`  blob I plus récent que BrandAction ? : ${iRow?.updatedAt && newest ? (iRow.updatedAt.getTime() > newest ? "OUI → projection PÉRIMÉE" : "non") : "?"}`);

  // ── Pilier S (ce qu'il a calculé) ──
  const s = ((await db.pillar.findUnique({ where: { strategyId_key: { strategyId: sid, key: "s" } }, select: { content: true } }))?.content ?? {}) as Record<string, any>;
  const comp = (s.computed ?? {}) as Record<string, any>;
  console.log("\n── PILIER S (computed) ──");
  console.log(`  selectedInitiativeCount : ${comp.selectedInitiativeCount ?? "?"}`);
  console.log(`  roadmapRoutes           : ${Array.isArray(comp.roadmapRoutes) ? comp.roadmapRoutes.length : "?"}`);
  console.log(`  selectedRouteKey        : ${comp.selectedRouteKey ?? "?"}`);

  // ── Verdict ──
  console.log("\n── VERDICT ──");
  const baMaterialized = ba.filter((x) => x.source === "MATERIALIZED").length;
  console.log(`  • Blob I catalogue : ${inits.length} actions ${inits.length > 0 ? "✅" : "❌ vide"}`);
  console.log(`  • BrandAction materialisé depuis I : ${baMaterialized} ${baMaterialized > 0 ? (iRow?.updatedAt && newest && iRow.updatedAt.getTime() > newest ? "⚠️ périmé" : "✅") : "❌ JAMAIS matérialisé"}`);
  console.log(`  • S voit des initiatives I : ${(comp.selectedInitiativeCount ?? 0) > 0 ? "✅" : "❌ 0 (actions DRAFT, aucune SELECTED_FOR_ROADMAP)"}`);
  process.exit(0);
}
main().catch((e) => { console.error("ERREUR:", e); process.exit(1); });

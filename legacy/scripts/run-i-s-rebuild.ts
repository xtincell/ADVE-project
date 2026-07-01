/**
 * End-to-end (ÉCRIT EN DB) — rejoue le vrai « Recalculer » I puis S sur une
 * stratégie, et vérifie le flux complet : blob I enrichi → BrandAction
 * matérialisé → S agrège les initiatives sélectionnées.
 *
 *   node --env-file-if-exists=.env.local --import tsx scripts/run-i-s-rebuild.ts [strategyId]
 */
import { db } from "@/lib/db";
import { actualizePillar } from "@/server/services/mestor/rtis-cascade";
import { collectNormalizedInitiatives } from "@/lib/types/pillar-schemas";

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
  console.log(`\n=== Rebuild I→S — ${sid} (« ${name} ») ===\n`);

  console.log("① actualizePillar('I')  (enrichi + matérialise BrandAction)…");
  const t1 = Date.now();
  const ri = await actualizePillar(sid, "I");
  console.log(`   → updated=${ri.updated} stage=${ri.maturityStage ?? "?"} pct=${ri.maturityCompletionPct ?? "?"} ${ri.error ? "ERR: " + ri.error : ""}  (${((Date.now()-t1)/1000).toFixed(0)}s)`);

  console.log("② actualizePillar('S')  (protocole S — promeut la sélection sur I)…");
  const t2 = Date.now();
  const rs = await actualizePillar(sid, "S");
  console.log(`   → updated=${rs.updated} stage=${rs.maturityStage ?? "?"} ${rs.error ? "ERR: " + rs.error : ""}  (${((Date.now()-t2)/1000).toFixed(0)}s)`);

  // ── Vérif finale ──
  const i = ((await db.pillar.findUnique({ where: { strategyId_key: { strategyId: sid, key: "i" } }, select: { content: true } }))?.content ?? {}) as any;
  const inits = collectNormalizedInitiatives(i);
  const selected = inits.filter((x) => x.status === "SELECTED_FOR_ROADMAP");
  const ba = await db.brandAction.findMany({ where: { strategyId: sid }, select: { source: true, status: true, selected: true, budgetMin: true } });
  const s = ((await db.pillar.findUnique({ where: { strategyId_key: { strategyId: sid, key: "s" } }, select: { content: true } }))?.content ?? {}) as any;
  const comp = (s.computed ?? {}) as any;

  console.log("\n── VÉRIFICATION ──");
  console.log(`  I — initiatives normalisées : ${inits.length}  (dont SELECTED_FOR_ROADMAP: ${selected.length})`);
  console.log(`  I — 1ère action backbone    : ${inits[0] ? JSON.stringify({ status: inits[0].status, budget: inits[0].budget, budgetEstime: inits[0].budgetEstime, channel: inits[0].channel, timeframe: inits[0].timeframe }) : "(aucune)"}`);
  console.log(`  BrandAction — total          : ${ba.length}  (MATERIALIZED: ${ba.filter((x) => x.source === "MATERIALIZED").length}, avec budget: ${ba.filter((x) => (x.budgetMin ?? 0) > 0).length})`);
  console.log(`  S — selectedInitiativeCount  : ${comp.selectedInitiativeCount ?? "?"}`);
  console.log(`  S — roadmapRoutes            : ${Array.isArray(comp.roadmapRoutes) ? comp.roadmapRoutes.length : "?"}`);

  const ok = inits.length > 0 && ba.length > 0 && selected.length > 0 && (comp.selectedInitiativeCount ?? 0) > 0;
  console.log(`\n${ok ? "✅ PASS — I génère la base, BrandAction est matérialisé, S agrège les initiatives sélectionnées." : "❌ INCOMPLET — voir les compteurs ci-dessus."}\n`);
  process.exit(ok ? 0 : 2);
}
main().catch((e) => { console.error("ERREUR:", e); process.exit(1); });

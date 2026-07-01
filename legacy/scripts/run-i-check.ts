/** Vérifie que régénérer I REMPLACE le catalogue (pas d'accumulation MERGE_DEEP). */
import { db } from "@/lib/db";
import { actualizePillar } from "@/server/services/mestor/rtis-cascade";
async function pick(): Promise<string> {
  if (process.argv[2]) return process.argv[2];
  const rows = await db.pillar.findMany({ where: { key: "a" }, orderBy: { updatedAt: "desc" }, take: 50, select: { strategyId: true, content: true } });
  for (const r of rows) { const c = (r.content ?? {}) as any; if (typeof c.nomMarque === "string" && c.nomMarque.trim()) return r.strategyId; }
  return rows[0]!.strategyId;
}
function count(i: any): number { return Object.values(i?.catalogueParCanal ?? {}).reduce((a: number, arr: any) => a + (Array.isArray(arr) ? arr.length : 0), 0); }
async function main() {
  const sid = await pick();
  const before = (await db.pillar.findUnique({ where: { strategyId_key: { strategyId: sid, key: "i" } }, select: { content: true } }))?.content as any;
  console.log(`AVANT  : catalogueParCanal = ${count(before)} actions`);
  const r = await actualizePillar(sid, "I");
  console.log(`actualizePillar I: updated=${r.updated} ${r.error ?? ""}`);
  const after = (await db.pillar.findUnique({ where: { strategyId_key: { strategyId: sid, key: "i" } }, select: { content: true } }))?.content as any;
  const c = count(after);
  console.log(`APRES  : catalogueParCanal = ${c} actions  | potentielBudget = ${JSON.stringify(after?.potentielBudget ?? null)}`);
  console.log(c > 0 && c <= 60 ? "✅ PASS — catalogue REMPLACÉ (pas d'accumulation)." : `❌ ${c} actions — accumulation probable.`);
  process.exit(c > 0 && c <= 60 ? 0 : 2);
}
main().catch((e) => { console.error(e); process.exit(1); });

import { db } from "@/lib/db";
async function pick(): Promise<string> {
  if (process.argv[2]) return process.argv[2];
  const rows = await db.pillar.findMany({ where: { key: "a" }, orderBy: { updatedAt: "desc" }, take: 50, select: { strategyId: true, content: true } });
  for (const r of rows) { const c = (r.content ?? {}) as any; if (typeof c.nomMarque === "string" && c.nomMarque.trim()) return r.strategyId; }
  return rows[0]!.strategyId;
}
async function main() {
  const sid = await pick();
  const a = await db.pillar.findUnique({ where: { strategyId_key: { strategyId: sid, key: "a" } }, select: { content: true, validationStatus: true, completionLevel: true, fieldCertainty: true, updatedAt: true } });
  const c = (a?.content ?? {}) as Record<string, any>;
  console.log(`strategy: ${sid}`);
  console.log(`A validationStatus=${a?.validationStatus} completionLevel=${a?.completionLevel} updatedAt=${a?.updatedAt?.toISOString()}`);
  console.log(`A content keys (${Object.keys(c).length}): ${Object.keys(c).join(", ")}`);
  const fc = (a?.fieldCertainty ?? {}) as Record<string, string>;
  const byLevel: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(fc)) (byLevel[v] ??= []).push(k);
  console.log(`A fieldCertainty: ${Object.entries(byLevel).map(([lvl, ks]) => `${lvl}=${ks.length}`).join(", ") || "(aucune)"}`);
  // Quick presence of the starved fields
  for (const f of ["archetype", "citationFondatrice", "noyauIdentitaire", "enemy", "prophecy", "ikigai", "valeurs", "herosJourney", "equipeDirigeante", "doctrine", "hierarchieCommunautaire"]) {
    const v = c[f];
    const present = v != null && (Array.isArray(v) ? v.length > 0 : typeof v === "object" ? Object.keys(v).length > 0 : String(v).trim() !== "");
    console.log(`  ${present ? "✅" : "❌"} A.${f}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });

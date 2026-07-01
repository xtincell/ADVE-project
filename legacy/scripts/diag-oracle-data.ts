/**
 * Diagnostic (lecture seule) — DISPONIBILITÉ des variables ADVERTIS que les 35
 * modules Oracle consomment. Les mappers/composers sont honnêtes (vide si pas
 * de donnée) → ce qui "manque" dans l'Oracle = ce qui n'est pas PRODUIT en amont.
 *
 *   node --env-file-if-exists=.env.local --import tsx scripts/diag-oracle-data.ts [strategyId]
 */
import { db } from "@/lib/db";

async function pick(): Promise<string> {
  if (process.argv[2]) return process.argv[2];
  const rows = await db.pillar.findMany({ where: { key: "a" }, orderBy: { updatedAt: "desc" }, take: 50, select: { strategyId: true, content: true } });
  for (const r of rows) { const c = (r.content ?? {}) as any; if (typeof c.nomMarque === "string" && c.nomMarque.trim()) return r.strategyId; }
  return rows[0]!.strategyId;
}
const has = (v: any) => v != null && (Array.isArray(v) ? v.length > 0 : typeof v === "object" ? Object.keys(v).length > 0 : String(v).trim() !== "");
const flag = (b: boolean) => (b ? "✅" : "❌");

async function main() {
  const sid = await pick();
  const s = await db.strategy.findUnique({
    where: { id: sid },
    include: {
      pillars: { select: { key: true, content: true } },
      _count: { select: { superfanProfiles: true, campaigns: true, gloryOutputs: true, missions: true, drivers: true, signals: true, cultIndexSnapshots: true, devotionSnapshots: true, communitySnapshots: true } },
    },
  });
  if (!s) { console.error("strategy introuvable"); process.exit(1); }
  const P: Record<string, any> = {};
  for (const p of s.pillars) P[p.key.toLowerCase()] = (p.content ?? {}) as any;
  const c = s._count;
  console.log(`\n=== Disponibilité données Oracle — ${sid} (« ${P.a?.nomMarque ?? s.name} ») ===\n`);

  console.log("── Sources RELATIONNELLES (snapshots, relations) ──");
  console.log(`  ${flag(c.cultIndexSnapshots > 0)} CultIndexSnapshot   : ${c.cultIndexSnapshots}   → §01,15,16,31 (Cult Index)`);
  console.log(`  ${flag(c.devotionSnapshots > 0)} DevotionSnapshot    : ${c.devotionSnapshots}   → §06,16,33 (Devotion Ladder)`);
  console.log(`  ${flag(c.superfanProfiles > 0)} superfanProfiles    : ${c.superfanProfiles}   → §01,15,16,33`);
  console.log(`  ${flag(c.campaigns > 0)} campaigns           : ${c.campaigns}   → §06,10,11,13,18,19,30`);
  console.log(`  ${flag(c.drivers > 0)} drivers             : ${c.drivers}   → §06,11,13`);
  console.log(`  ${flag(c.missions > 0)} missions            : ${c.missions}   → §07,19`);
  console.log(`  ${flag(c.gloryOutputs > 0)} gloryOutputs        : ${c.gloryOutputs}   → §05,07,14 (créatif)`);
  console.log(`  ${flag(c.signals > 0)} signals             : ${c.signals}   → §09,29,35 (Tarsis)`);
  console.log(`  ${flag(c.communitySnapshots > 0)} communitySnapshots  : ${c.communitySnapshots}   → §16`);
  console.log(`  ${flag(has((s as any).manipulationMix))} manipulationMix     : ${JSON.stringify((s as any).manipulationMix ?? null)}   → §32`);

  console.log("\n── Champs PILIERS clés (les modules les lisent) ──");
  const checks: Array<[string, any, string]> = [
    ["A.enemy", P.a?.enemy, "§02"],
    ["A.prophecy", P.a?.prophecy, "§02"],
    ["A.ikigai", P.a?.ikigai, "§04"],
    ["A.valeurs", P.a?.valeurs, "§04,24"],
    ["A.equipeDirigeante", P.a?.equipeDirigeante, "§20,24,27"],
    ["D.personas", P.d?.personas, "§02,04,26"],
    ["D.tonDeVoix", P.d?.tonDeVoix, "§04,24"],
    ["D.directionArtistique", P.d?.directionArtistique, "§05"],
    ["D.paysageConcurrentiel", P.d?.paysageConcurrentiel, "§08,29"],
    ["V.unitEconomics", P.v?.unitEconomics, "§04,18"],
    ["V.productLadder", P.v?.productLadder, "§04,25"],
    ["E.touchpoints", P.e?.touchpoints, "§06,11,32"],
    ["E.kpis", P.e?.kpis, "§16"],
    ["R.globalSwot", P.r?.globalSwot, "§01,07"],
    ["T.tamSamSom", P.t?.tamSamSom, "§08"],
    ["T.marketReality", P.t?.marketReality, "§08,29"],
    ["I.catalogueParCanal", P.i?.catalogueParCanal, "§10,13,24"],
    ["S.roadmap", P.s?.roadmap, "§12,25,28"],
    ["S.fenetreOverton", P.s?.fenetreOverton, "§12,34"],
    ["S.visionStrategique", P.s?.visionStrategique, "§24,28"],
  ];
  let fed = 0;
  for (const [label, val, secs] of checks) {
    if (has(val)) fed++;
    console.log(`  ${flag(has(val))} ${label.padEnd(24)} ${secs}`);
  }
  console.log(`\n  Piliers : ${fed}/${checks.length} champs-clés présents`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });

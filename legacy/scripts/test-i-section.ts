/**
 * Focused test — re-run ONLY the sections that missed in the full run
 * (assets + MEDIA_TRADITIONNEL) to confirm the retry-on-empty + tolerant
 * parser now fill them. Read-only, no DB write.
 *
 *   node --env-file-if-exists=.env.local --import tsx scripts/test-i-section.ts [strategyId]
 */

import { db } from "@/lib/db";
import { buildContext, sectionArray } from "@/server/services/mestor/i-pillar-sequenced";

async function pickStrategyId(): Promise<string | null> {
  const argId = process.argv[2];
  if (argId) return argId;
  const rows = await db.pillar.findMany({
    where: { key: "a" }, orderBy: { updatedAt: "desc" }, take: 50,
    select: { strategyId: true, content: true },
  });
  for (const r of rows) {
    const c = (r.content ?? {}) as Record<string, unknown>;
    if (typeof c.nomMarque === "string" && c.nomMarque.trim().length > 0) return r.strategyId;
  }
  return rows[0]?.strategyId ?? null;
}

async function main() {
  const strategyId = await pickStrategyId();
  if (!strategyId) { console.error("FAIL: aucune stratégie."); process.exit(1); }
  const pillars: Record<string, unknown> = {};
  for (const p of await db.pillar.findMany({ where: { strategyId } })) pillars[p.key.toUpperCase()] = p.content;
  const context = buildContext(pillars);
  console.log(`\n=== Test ciblé (assets + MEDIA_TRADITIONNEL) — strategy ${strategyId} ===\n`);

  const t0 = Date.now();
  const assets = await sectionArray({
    strategyId: undefined, context, arrayKey: "assets", maxOutputTokens: 1600, tag: "assets",
    onProgress: (m) => console.log("  " + m),
    instruction: `Génère 10 ASSETS produisibles pour cette marque.
Chaque asset = objet { "asset": string, "type": "VIDEO"|"PRINT"|"DIGITAL"|"PHOTO"|"AUDIO"|"PACKAGING"|"EXPERIENCE", "usage": string }.
Réponds STRICTEMENT au format : { "assets": [ …10 objets dans un TABLEAU… ] }`,
  });
  console.log(`assets        : ${assets.length}  ex: ${assets[0] ? JSON.stringify(assets[0]).slice(0,120) : "—"}`);

  const media = await sectionArray({
    strategyId: undefined, context, arrayKey: "actions", maxOutputTokens: 1200, tag: "canal-MEDIA_TRADITIONNEL",
    onProgress: (m) => console.log("  " + m),
    instruction: `Pour le CANAL « MEDIA_TRADITIONNEL », génère un inventaire de 5 à 8 actions marketing CONCRÈTES, spécifiques à CETTE marque.
Chaque action = objet { "action": string, "format": string, "objectif": string, "pilierImpact": "A"|"D"|"V"|"E" }.
Réponds STRICTEMENT au format : { "actions": [ …5 à 8 objets… ] }`,
  });
  console.log(`MEDIA_TRAD    : ${media.length}  ex: ${media[0] ? JSON.stringify(media[0]).slice(0,120) : "—"}`);

  const pass = assets.length >= 1 && media.length >= 1;
  console.log(`\n  durée: ${((Date.now()-t0)/1000).toFixed(1)}s`);
  console.log(`${pass ? "✅ PASS — les sections qui ratraient sont désormais remplies." : "❌ FAIL — au moins une section reste vide."}\n`);
  process.exit(pass ? 0 : 2);
}

main().catch((e) => { console.error("ERREUR:", e); process.exit(1); });

/**
 * Test harness — I-pillar sequenced generation against the LIVE local Ollama.
 *
 * Read-only: loads a real strategy's ADVE+R+T pillars for context, runs the
 * sequenced catalogue generator, validates the output parses cleanly, and
 * prints a verdict. Writes NOTHING to the DB. No budget gate (strategyId is
 * intentionally omitted from the LLM calls).
 *
 *   node --env-file-if-exists=.env.local --import tsx scripts/test-i-sequenced.ts [strategyId]
 */

import { db } from "@/lib/db";
import { generateICatalogueSequenced, I_CHANNELS } from "@/server/services/mestor/i-pillar-sequenced";

async function pickStrategyId(): Promise<string | null> {
  const argId = process.argv[2];
  if (argId) return argId;
  // Auto-pick: most recently updated strategy whose A pillar has a brand name.
  const rows = await db.pillar.findMany({
    where: { key: "a" },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { strategyId: true, content: true },
  });
  for (const r of rows) {
    const c = (r.content ?? {}) as Record<string, unknown>;
    if (typeof c.nomMarque === "string" && c.nomMarque.trim().length > 0) return r.strategyId;
  }
  return rows[0]?.strategyId ?? null;
}

async function loadPillars(strategyId: string): Promise<Record<string, unknown>> {
  const pillars = await db.pillar.findMany({ where: { strategyId } });
  const map: Record<string, unknown> = {};
  for (const p of pillars) map[p.key.toUpperCase()] = p.content;
  return map;
}

function shape(item: unknown): string {
  if (!item || typeof item !== "object") return typeof item;
  return Object.keys(item as Record<string, unknown>).join("+");
}

async function main() {
  const strategyId = await pickStrategyId();
  if (!strategyId) {
    console.error("FAIL: aucune stratégie trouvée en base.");
    process.exit(1);
  }
  const pillars = await loadPillars(strategyId);
  const aName = ((pillars.A ?? {}) as Record<string, unknown>).nomMarque ?? "(sans nom)";
  console.log(`\n=== Test I-séquencé — strategy ${strategyId} — marque « ${aName} » ===`);
  console.log(`Piliers chargés (contexte) : ${Object.keys(pillars).filter(k => pillars[k] && Object.keys(pillars[k] as object).length).join(", ") || "aucun"}\n`);

  const t0 = Date.now();
  // strategyId omis volontairement → pas de budget gate ni de cost log (test pur).
  const cat = await generateICatalogueSequenced({ pillars });
  const durMs = Date.now() - t0;

  // ── Rapport ──
  console.log("\n--- Catalogue par canal ---");
  let channelsOk = 0;
  for (const canal of I_CHANNELS) {
    const arr = cat.catalogueParCanal[canal] ?? [];
    if (arr.length > 0) channelsOk++;
    const sample = arr[0] ? `  ex: ${JSON.stringify(arr[0]).slice(0, 110)}…` : "";
    console.log(`  ${canal.padEnd(20)} ${String(arr.length).padStart(2)} actions  [shape: ${arr[0] ? shape(arr[0]) : "—"}]${sample ? "\n" + sample : ""}`);
  }
  console.log(`\n  assetsProduisibles  : ${cat.assetsProduisibles.length}  [shape: ${cat.assetsProduisibles[0] ? shape(cat.assetsProduisibles[0]) : "—"}]`);
  console.log(`  activationsPossibles: ${cat.activationsPossibles.length}  [shape: ${cat.activationsPossibles[0] ? shape(cat.activationsPossibles[0]) : "—"}]`);
  console.log(`  formatsDisponibles  : ${cat.formatsDisponibles.length}  ${cat.formatsDisponibles.slice(0, 6).join(", ")}`);
  console.log(`  totalActions        : ${cat.totalActions}`);
  console.log(`\n  durée totale        : ${(durMs / 1000).toFixed(1)}s`);

  // ── Verdict ──
  const checks = {
    "≥4 canaux remplis": channelsOk >= 4,
    "totalActions > 0": cat.totalActions > 0,
    "assets ≥ 1": cat.assetsProduisibles.length >= 1,
    "activations ≥ 1": cat.activationsPossibles.length >= 1,
    "formats ≥ 1": cat.formatsDisponibles.length >= 1,
  };
  console.log("\n--- Verdict ---");
  let pass = true;
  for (const [label, ok] of Object.entries(checks)) {
    console.log(`  ${ok ? "✅" : "❌"} ${label}`);
    if (!ok) pass = false;
  }
  console.log(`\n${pass ? "✅ PASS — le séquençage produit un catalogue parseable et non vide." : "❌ FAIL — voir sections vides ci-dessus."}\n`);
  process.exit(pass ? 0 : 2);
}

main().catch((err) => {
  console.error("ERREUR test:", err);
  process.exit(1);
});

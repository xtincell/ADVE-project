/**
 * Audit Tier 2.1 — promotion mutations LEGACY_MUTATION → governedProcedure.
 *
 * Parcourt les routers en `lafusee:strangler-active` et classe chaque
 * router par effort estimé : nombre de mutations, présence Zod input,
 * services touchés. Produit un plan d'attaque priorisé.
 *
 * Pas de migration automatique — promouvoir une mutation exige une
 * Intent kind dédiée, un handler Artemis, une cost estimation et des
 * tests E2E. Ce script donne au pilote l'ordre d'attaque par ROI.
 *
 * Output : `docs/governance/legacy-mutation-promotion-plan.md`.
 */

import { readdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

interface RouterAnalysis {
  router: string;
  mutationCount: number;
  queryCount: number;
  serviceImports: string[];
  estimatedEffortPoints: number;
  reason: string;
}

const ROUTERS_DIR = resolve(__dirname, "..", "src/server/trpc/routers");

function analyzeRouter(filename: string): RouterAnalysis | null {
  const path = resolve(ROUTERS_DIR, filename);
  const content = readFileSync(path, "utf-8");
  if (!content.includes("lafusee:strangler-active")) return null;

  const router = filename.replace(/\.ts$/, "");
  const mutationCount = (content.match(/\.mutation\(/g) ?? []).length;
  const queryCount = (content.match(/\.query\(/g) ?? []).length;
  const serviceImports = Array.from(
    new Set(
      Array.from(content.matchAll(/from\s+["']@\/server\/services\/([\w-]+)/g))
        .map((m) => m[1] ?? "")
        .filter(Boolean),
    ),
  );

  // Effort heuristic :
  //   - 1 point per mutation
  //   - +0.5 if multiple services touched (cross-cutting)
  //   - +1 if Zod input schemas detected (≥2 occurrences of z.object)
  const zodOccurrences = (content.match(/z\.object\(/g) ?? []).length;
  let effort = mutationCount;
  if (serviceImports.length > 1) effort += 0.5;
  if (zodOccurrences >= 2) effort += 1;
  effort = Math.round(effort * 10) / 10;

  let reason = `${mutationCount} mutations, ${serviceImports.length} services`;
  if (zodOccurrences >= 2) reason += `, Zod schemas`;

  return {
    router,
    mutationCount,
    queryCount,
    serviceImports,
    estimatedEffortPoints: effort,
    reason,
  };
}

function render(routers: RouterAnalysis[]): string {
  const sorted = [...routers].sort((a, b) => a.estimatedEffortPoints - b.estimatedEffortPoints);
  const totalMutations = routers.reduce((s, r) => s + r.mutationCount, 0);

  const lines: string[] = [];
  lines.push("# Tier 2.1 — Plan de promotion LEGACY_MUTATION → governedProcedure");
  lines.push("");
  lines.push("Auto-généré par `npx tsx scripts/audit-legacy-mutation-candidates.ts`. Ce plan ne migre rien — il **classe par effort** les 60 routers en strangler.");
  lines.push("");
  lines.push(`Total routers strangler : **${routers.length}**`);
  lines.push(`Total mutations à promouvoir : **${totalMutations}**`);
  lines.push("");
  lines.push("## Vague 1 — Quick wins (≤2 effort points)");
  lines.push("");
  lines.push("Petits routers avec peu de mutations + 0-1 service. Idéaux pour valider le pattern de promotion.");
  lines.push("");
  lines.push("| router | mutations | services | effort | raison |");
  lines.push("|---|---|---|---|---|");
  for (const r of sorted.filter((r) => r.estimatedEffortPoints <= 2 && r.mutationCount > 0)) {
    lines.push(`| \`${r.router}\` | ${r.mutationCount} | ${r.serviceImports.length} | ${r.estimatedEffortPoints} | ${r.reason} |`);
  }
  lines.push("");
  lines.push("## Vague 2 — Effort moyen (2-5 effort points)");
  lines.push("");
  lines.push("| router | mutations | services | effort | raison |");
  lines.push("|---|---|---|---|---|");
  for (const r of sorted.filter((r) => r.estimatedEffortPoints > 2 && r.estimatedEffortPoints <= 5)) {
    lines.push(`| \`${r.router}\` | ${r.mutationCount} | ${r.serviceImports.length} | ${r.estimatedEffortPoints} | ${r.reason} |`);
  }
  lines.push("");
  lines.push("## Vague 3 — Gros chantiers (>5 effort points)");
  lines.push("");
  lines.push("Routers cross-cutting avec beaucoup de mutations. Réserver à la fin de la phase, après que le pattern est rodé.");
  lines.push("");
  lines.push("| router | mutations | services | effort | raison |");
  lines.push("|---|---|---|---|---|");
  for (const r of sorted.filter((r) => r.estimatedEffortPoints > 5)) {
    lines.push(`| \`${r.router}\` | ${r.mutationCount} | ${r.serviceImports.length} | ${r.estimatedEffortPoints} | ${r.reason} |`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("**Pattern de promotion par mutation** :");
  lines.push("");
  lines.push("1. Ajouter une Intent kind dans `src/server/governance/intent-kinds.ts`.");
  lines.push("2. Ajouter le SLO correspondant dans `slos.ts`.");
  lines.push("3. Réécrire la mutation en `governedProcedure(\"<KIND>\", inputSchema)` avec un handler Artemis.");
  lines.push("4. Ajouter un test gouvernance `tests/governance/<router>.governance.test.ts` qui assert la création d'IntentEmission row.");
  lines.push("5. Régénérer `INTENT-CATALOG.md` (`npm run codemap:gen` + `gen-intent-catalog`).");
  return lines.join("\n");
}

function main() {
  const files = readdirSync(ROUTERS_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  const analyses: RouterAnalysis[] = [];
  for (const f of files) {
    const a = analyzeRouter(f);
    if (a) analyses.push(a);
  }
  const md = render(analyses);
  const out = resolve(__dirname, "..", "docs/governance/legacy-mutation-promotion-plan.md");
  writeFileSync(out, md);
  console.log(`[audit-legacy-mutation-candidates] analyzed=${analyses.length} routers, total mutations=${analyses.reduce((s, r) => s + r.mutationCount, 0)} → ${out}`);
}

main();

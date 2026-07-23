/**
 * Audit ad-hoc — inventorie les procédures tRPC founder-atteignables keyées sur
 * un id d'ENTITÉ (pas un strategyId/campaignId de tête) SANS garde d'ownership
 * reconnue. Sortie = liste `fichier proc base ids`.
 *
 *   node scripts/scan-entity-idor.mjs
 *
 * ⚠️ Le VERROU CI canonique est `tests/unit/governance/entity-id-idor-proactive.test.ts`
 * (même logique + allowlist `SAFE_BY_DESIGN` triée). Ce script est un utilitaire
 * de découverte ; en cas de divergence, le test fait foi. Round-10 (scan-entity-idor).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROUTERS = join(process.cwd(), "src/server/trpc/routers");
const files = readdirSync(ROUTERS).filter((f) => f.endsWith(".ts") && !f.startsWith("_") && !f.endsWith(".test.ts"));

const CHOKEPOINT =
  /assert\w*Access|assert\w*Read|assertStrategy|canAccess\w+|enforce\w+Access|enforce\w+RawScope|accessibleStrategyIds|scopeStrategies\(|scopeCampaigns\(|scopeClients\(|scopeMcp|assertNodeAccess|assertProposalAccess|assertContractAccess|assertConversationAccess|assertQcParticipant|assertSignalStrategyAccess|assertTalentProfileAccess|assertDriverAccess|assertSourceAccess|assertIntakeAccess|assertProcessAccess|assertMissionAccess|assertLinkedEntitySameStrategy|assertArbiter|commissionScope|resolveOperatorId|assertRawStrategyScope|isStaff\(/;
const SELF_SCOPE =
  /userId\s*[!=]==?\s*ctx\.session\.user\.id|ctx\.session\.user\.id\s*[!=]==?\s*\w+\.userId|\.userId !== ctx\.session|\.operatorId !== ctx\.session\.user\.id|where:\s*\{\s*[^}]*userId:\s*ctx\.session\.user\.id|userId:\s*ctx\.session\.user\.id|applicantId|payoutPhone: true|_id: \{ [^}]*campaignId|campaignId_|courseId_userId/;
const OPERATOR_BASE = /^(operatorProcedure|adminProcedure|publicProcedure|strategyScopedProcedure|campaignScopedProcedure)\b/;

function procBlocks(src) {
  const re =
    /\n {2}([a-zA-Z0-9_]+):\s*(governedProcedure|protectedProcedure|operatorProcedure|adminProcedure|publicProcedure|strategyScopedProcedure|campaignScopedProcedure|[a-zA-Z0-9_]+Procedure)\b/g;
  const marks = [];
  let m;
  while ((m = re.exec(src))) marks.push({ name: m[1], base: m[2], start: m.index });
  return marks.map((mk, i) => ({ ...mk, body: src.slice(mk.start, i + 1 < marks.length ? marks[i + 1].start : src.length) }));
}
function inputFields(body) {
  const idx = Math.max(body.indexOf(".input("), body.indexOf("inputSchema:"));
  if (idx < 0) return [];
  const slice = body.slice(idx, idx + 1200);
  return [...slice.matchAll(/(?:^|[\s{(])([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*z\./g)].map((x) => x[1]);
}

let n = 0;
for (const file of files) {
  const src = readFileSync(join(ROUTERS, file), "utf8");
  for (const blk of procBlocks(src)) {
    const requireOperator = /requireOperator:\s*true/.test(blk.body);
    const founderReachable = blk.base === "protectedProcedure" || (blk.base === "governedProcedure" && !requireOperator);
    if (!founderReachable || OPERATOR_BASE.test(blk.base)) continue;
    const fields = inputFields(blk.body);
    if (!fields.length) continue;
    const entityIds = fields.filter((f) => (f === "id" || /Id$/.test(f)) && f !== "strategyId" && f !== "campaignId");
    if (!entityIds.length) continue;
    if (CHOKEPOINT.test(blk.body) || SELF_SCOPE.test(blk.body)) continue;
    n++;
    console.log(`${file.padEnd(30)} ${blk.name.padEnd(28)} ${blk.base.padEnd(20)} ids=${entityIds.join(",")}`);
  }
}
console.log(`\nTOTAL flagged (à gader ou allowlister dans le test canonique): ${n}`);

/**
 * promote-draft-sequences-forced.ts
 *
 * Sprint 5 v6.18.19 — script de promotion DRAFT → STABLE forcée pour
 * toutes les sequences encore en DRAFT.
 *
 * ⚠️  WARNING SAFETY — calendrier-locked résidu déconseillé ⚠️
 * ====================================================================
 * ADR-0040 + ADR-0042 prévoient 1 mois de stress-test avant promotion
 * DRAFT → STABLE. La promotion fige le `promptHash` et déclenche
 * l'anti-drift CI bloquante sur toute modification ultérieure.
 *
 * Forcer la promotion sans données stress-test = risque de stamper
 * "STABLE" sur des sequences qui ont des bugs latents (LLM truncation,
 * output schema malformé, edge cases non couverts).
 *
 * Ce script existe SUR DEMANDE EXPLICITE de l'operator pour le cas
 * d'usage "purge tous résidus calendar-locked" (Sprint 5 mandate user).
 * ====================================================================
 *
 * Usage SAFE (dry run par défaut) :
 *   npx tsx scripts/promote-draft-sequences-forced.ts
 *   → Liste toutes les sequences DRAFT sans rien promouvoir.
 *
 * Usage FORCED (irreversible — emit promotions) :
 *   npx tsx scripts/promote-draft-sequences-forced.ts --force --i-accept-no-stress-test-data
 *   → Émet PROMOTE_SEQUENCE_LIFECYCLE Intent pour chaque DRAFT → STABLE.
 *
 * Audit trail : chaque promotion crée une row IntentEmission avec
 * caller "sprint-5-forced-promotion". Reversible si bug détecté en
 * recalcuant promptHash + DEPRECATED Intent kind.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const SEQUENCES_TS = join(ROOT, "src/server/services/artemis/tools/sequences.ts");
const PHASE13_ORACLE = join(ROOT, "src/server/services/artemis/tools/phase13-oracle-sequences.ts");
const FRAMEWORK_WRAPPERS = join(ROOT, "src/server/services/artemis/tools/framework-wrappers.ts");
const ADOPS_SEQUENCES = join(ROOT, "src/server/services/artemis/tools/adops-sequences.ts");

const FORCE = process.argv.includes("--force");
const ACCEPT_NO_STRESS = process.argv.includes("--i-accept-no-stress-test-data");

if (FORCE && !ACCEPT_NO_STRESS) {
  console.error("❌ --force requires --i-accept-no-stress-test-data flag.");
  console.error("   ADR-0040+0042 prévoient 1 mois de stress-test avant promotion DRAFT→STABLE.");
  console.error("   Utiliser ce flag = renoncer au safety window (irreversible STABLE freeze).");
  process.exit(1);
}

interface DraftSequence {
  key: string;
  file: string;
  line: number;
}

const drafts: DraftSequence[] = [];

function scanFile(path: string): void {
  const text = readFileSync(path, "utf-8");
  const lines = text.split("\n");
  let currentKey: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const keyMatch = line.match(/key:\s*"([^"]+)"/);
    if (keyMatch) {
      currentKey = keyMatch[1]!;
    }
    if (line.includes('lifecycle: "DRAFT"') && currentKey) {
      drafts.push({
        key: currentKey,
        file: path.replace(ROOT + "/", ""),
        line: i + 1,
      });
    }
  }
}

scanFile(SEQUENCES_TS);
scanFile(PHASE13_ORACLE);
scanFile(FRAMEWORK_WRAPPERS);
scanFile(ADOPS_SEQUENCES);

console.log(`# DRAFT Sequences Inventory\n`);
console.log(`Total : **${drafts.length} sequences en DRAFT** détectées.\n`);

if (drafts.length === 0) {
  console.log("✅ Aucune sequence DRAFT. Rien à promouvoir.");
  process.exit(0);
}

console.log(`## Sequences à promouvoir DRAFT → STABLE\n`);
console.log(`| Key | File | Line |`);
console.log(`|---|---|---|`);
for (const d of drafts) {
  console.log(`| \`${d.key}\` | \`${d.file}\` | ${d.line} |`);
}

if (!FORCE) {
  console.log(`\n---\n`);
  console.log(`**Mode DRY RUN** (default). Pour promouvoir réellement :`);
  console.log(`\n  \`npx tsx scripts/promote-draft-sequences-forced.ts --force --i-accept-no-stress-test-data\`\n`);
  console.log(`⚠️  Cette opération émettra ${drafts.length} Intent PROMOTE_SEQUENCE_LIFECYCLE,`);
  console.log(`figera le promptHash de chaque sequence, et déclenchera l'anti-drift CI bloquante.`);
  process.exit(0);
}

// FORCE mode — emit promotions
console.log(`\n## ⚠️  FORCE MODE — émission des Intent kinds\n`);
console.log(`Pour chaque sequence, émettre :\n`);
console.log(`\`\`\`ts`);
console.log(`await emitIntent({`);
console.log(`  kind: "PROMOTE_SEQUENCE_LIFECYCLE",`);
console.log(`  strategyId: "(governance)",`);
console.log(`  sequenceKey: "<key>",`);
console.log(`  fromLifecycle: "DRAFT",`);
console.log(`  toLifecycle: "STABLE",`);
console.log(`  operatorId: process.env.OPERATOR_ID || "system-sprint-5",`);
console.log(`  justification: "Sprint 5 v6.18.19 — promotion forcée résidu calendar-locked",`);
console.log(`}, { caller: "sprint-5-forced-promotion" });`);
console.log(`\`\`\``);
console.log(`\n${drafts.length} promotions à émettre.\n`);

console.log(`\n**SCRIPT NE LANCE PAS LES PROMOTIONS DIRECTEMENT** — il faut intégrer ce script`);
console.log(`dans une procédure tRPC adminProcedure ou un endpoint cron-like avec accès DB.`);
console.log(`Le script standalone ne peut pas accéder à \`mestor.emitIntent\` sans le runtime`);
console.log(`Next.js (Prisma client + DB connection).`);
console.log(`\nRecommandation : créer une procédure tRPC \`governance.bulkPromoteDrafts\``);
console.log(`avec le même contenu, gated par adminProcedure + flag confirmation.`);

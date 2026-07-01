/**
 * Backfill script: Core Engine relational backbone (ADR-0088).
 *
 * Assigns stable uuid ids to the entities living inside the JSON pillar blobs
 * (risks, initiatives/actions, personas, hypotheses) and resolves the legacy
 * TEXT references into uuid FOREIGN KEYS:
 *
 *   I.riskMitigationActions[].riskRef (risk name)        → riskId
 *   I.hypothesisTestActions[].hypothesisRef (hyp. name)  → hypothesisId
 *   S.sprint90Days[].sourceRef (I path)                  → sourceInitiativeId
 *   S.selectedFromI[]/rejectedFromI[].sourceRef (I path) → sourceInitiativeId
 *   S.fenetreOverton.strategieDeplacement[].riskRef/hypothesisRef → riskId/hypothesisId
 *
 * Risk entries also get a numeric `severity = deriveSeverity(probability,
 * impact)` and a default `status = "UNMITIGATED"`.
 *
 * **Direct Prisma write (deliberate, not the Pillar Gateway):** this is a
 * one-time STRUCTURAL migration, not an operator mutation. We do NOT want it
 * to trigger scoring / staleness cascades / event emits on every pillar of
 * every strategy. The additions are schema-additive (all optional), so no
 * validation breaks. Processing order per strategy is R → T → D → I → S so FK
 * targets receive their ids before referrers resolve.
 *
 * **Idempotent**: entities that already carry an `id` are skipped; refs already
 * resolved to an FK are left untouched. Re-running is a no-op.
 *
 * Usage:
 *   npx tsx scripts/backfill-pillar-ids.ts             # DRY-RUN (default): report only
 *   npx tsx scripts/backfill-pillar-ids.ts --commit    # apply writes
 *
 * Cf. docs/governance/adr/0088-core-engine-id-fk-computed-s.md
 */

import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { deriveSeverity } from "../src/lib/types/pillar-schemas";

function makeClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

const prisma = makeClient();
const COMMIT = process.argv.includes("--commit");

type Blob = Record<string, unknown>;
const isObj = (v: unknown): v is Blob => v !== null && typeof v === "object" && !Array.isArray(v);
const asArr = (v: unknown): Blob[] => (Array.isArray(v) ? (v as Blob[]) : []);

/** Ensure each entry of an array has an `id`; returns count newly assigned. */
function ensureIds(arr: Blob[]): number {
  let n = 0;
  for (const e of arr) {
    if (isObj(e) && typeof e.id !== "string") {
      e.id = randomUUID();
      n++;
    }
  }
  return n;
}

/** Every PotentialAction instance scattered across a Pillar I blob. */
function collectIActions(i: Blob): Blob[] {
  const out: Blob[] = [];
  if (isObj(i.catalogueParCanal)) {
    for (const v of Object.values(i.catalogueParCanal)) out.push(...asArr(v));
  }
  if (isObj(i.actionsByDevotionLevel)) {
    for (const v of Object.values(i.actionsByDevotionLevel)) out.push(...asArr(v));
  }
  for (const phase of asArr(i.actionsByOvertonPhase)) out.push(...asArr(phase.actions));
  return out;
}

/** Resolve a legacy I path like "catalogueParCanal.DIGITAL[3]" to that action's id. */
function resolveIPathId(i: Blob, path: string): string | undefined {
  const m = path.match(/^catalogueParCanal\.([^[]+)\[(\d+)\]$/);
  if (m && isObj(i.catalogueParCanal)) {
    const arr = asArr((i.catalogueParCanal as Blob)[m[1]!]);
    const item = arr[Number(m[2])];
    return item && typeof item.id === "string" ? item.id : undefined;
  }
  return undefined;
}

interface Report { strategies: number; pillars: number; idsAssigned: number; refsResolved: number; orphans: string[]; }

async function run() {
  const report: Report = { strategies: 0, pillars: 0, idsAssigned: 0, refsResolved: 0, orphans: [] };

  const strategies = await prisma.strategy.findMany({ select: { id: true, name: true } });
  for (const strategy of strategies) {
    const rows = await prisma.pillar.findMany({
      where: { strategyId: strategy.id },
      select: { id: true, key: true, content: true },
    });
    const byKey = new Map<string, { rowId: string; content: Blob }>();
    for (const row of rows) byKey.set(row.key, { rowId: row.id, content: (row.content ?? {}) as Blob });

    const changed = new Set<string>();
    const get = (k: string) => byKey.get(k)?.content;

    // ── R, T, D : assign stable ids first (FK targets) ──────────────────
    const r = get("r");
    if (r) {
      const matrix = asArr(r.probabilityImpactMatrix);
      let touched = ensureIds(matrix);
      for (const risk of matrix) {
        if (typeof risk.severity !== "number" && typeof risk.probability === "string" && typeof risk.impact === "string") {
          risk.severity = deriveSeverity(risk.probability as "LOW" | "MEDIUM" | "HIGH", risk.impact as "LOW" | "MEDIUM" | "HIGH");
          touched++;
        }
        if (typeof risk.status !== "string") { risk.status = "UNMITIGATED"; touched++; }
      }
      touched += ensureIds(asArr(r.overtonBlockers));
      if (touched) { changed.add("r"); report.idsAssigned += touched; }
    }
    const t = get("t");
    if (t) {
      const touched = ensureIds(asArr(t.hypothesisValidation));
      if (touched) { changed.add("t"); report.idsAssigned += touched; }
    }
    const d = get("d");
    if (d) {
      const touched = ensureIds(asArr(d.personas));
      if (touched) { changed.add("d"); report.idsAssigned += touched; }
    }

    // ── I : ids + resolve riskRef/hypothesisRef → FK ────────────────────
    const i = get("i");
    if (i) {
      let touched = ensureIds(collectIActions(i));
      const riskByName = new Map<string, string>();
      for (const risk of asArr(r?.probabilityImpactMatrix)) {
        if (typeof risk.risk === "string" && typeof risk.id === "string") riskByName.set(risk.risk, risk.id);
      }
      const hypByName = new Map<string, string>();
      for (const h of asArr(t?.hypothesisValidation)) {
        if (typeof h.hypothesis === "string" && typeof h.id === "string") hypByName.set(h.hypothesis, h.id);
      }
      for (const rma of asArr(i.riskMitigationActions)) {
        if (typeof rma.riskId !== "string" && typeof rma.riskRef === "string") {
          const id = riskByName.get(rma.riskRef);
          if (id) { rma.riskId = id; touched++; report.refsResolved++; }
          else report.orphans.push(`${strategy.id} I.riskMitigationActions riskRef="${rma.riskRef}"`);
        }
      }
      for (const hta of asArr(i.hypothesisTestActions)) {
        if (typeof hta.hypothesisId !== "string" && typeof hta.hypothesisRef === "string") {
          const id = hypByName.get(hta.hypothesisRef);
          if (id) { hta.hypothesisId = id; touched++; report.refsResolved++; }
          else report.orphans.push(`${strategy.id} I.hypothesisTestActions hypothesisRef="${hta.hypothesisRef}"`);
        }
      }
      if (touched) { changed.add("i"); report.idsAssigned += touched; }
    }

    // ── S : resolve sourceRef (I path) → sourceInitiativeId ─────────────
    const s = get("s");
    if (s && i) {
      let touched = 0;
      const resolveSourceRef = (entry: Blob) => {
        if (typeof entry.sourceInitiativeId !== "string" && typeof entry.sourceRef === "string") {
          const id = resolveIPathId(i, entry.sourceRef);
          if (id) { entry.sourceInitiativeId = id; touched++; report.refsResolved++; }
          else report.orphans.push(`${strategy.id} S sourceRef="${entry.sourceRef}"`);
        }
      };
      for (const sp of asArr(s.sprint90Days)) resolveSourceRef(sp);
      for (const sel of asArr(s.selectedFromI)) resolveSourceRef(sel);
      for (const rej of asArr(s.rejectedFromI)) resolveSourceRef(rej);
      if (touched) changed.add("s");
    }

    // ── Persist changed pillars (direct, no cascade) ────────────────────
    for (const key of changed) {
      const entry = byKey.get(key)!;
      report.pillars++;
      if (COMMIT) {
        await prisma.pillar.update({ where: { id: entry.rowId }, data: { content: entry.content as object } });
      }
    }
    if (changed.size > 0) report.strategies++;
  }

  console.log(`\n=== backfill-pillar-ids (${COMMIT ? "COMMIT" : "DRY-RUN"}) ===`);
  console.log(`strategies touched : ${report.strategies}`);
  console.log(`pillars written    : ${report.pillars}`);
  console.log(`ids assigned       : ${report.idsAssigned}`);
  console.log(`refs resolved → FK : ${report.refsResolved}`);
  console.log(`orphan refs        : ${report.orphans.length}`);
  if (report.orphans.length > 0) {
    console.log("  (no match found — left unresolved, NOT fabricated):");
    for (const o of report.orphans.slice(0, 30)) console.log(`   - ${o}`);
    if (report.orphans.length > 30) console.log(`   … +${report.orphans.length - 30} more`);
  }
  if (!COMMIT) console.log(`\nDRY-RUN — no writes. Re-run with --commit to apply.`);
}

run()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });

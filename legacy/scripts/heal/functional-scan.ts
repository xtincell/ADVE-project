/**
 * scripts/heal/functional-scan.ts — Le fantôme de NEFER, mode FONCTIONNEL.
 *
 * Le crawler `harvest-dynamic` ne fait que CHARGER des pages (GET). Ce scanner
 * DÉCLENCHE les nœuds : il exécute chaque Glory tool, chaque séquence, chaque
 * framework (mécaniques ET requêtes LLM) contre une stratégie réelle, comme un
 * utilisateur intensif, puis classe chaque résultat OK / DENIED / FAILED / ERROR
 * pour un fix-by-class. C'est le « scan fonctionnel complet ».
 *
 * Prérequis : env chargé (DATABASE_URL + ANTHROPIC/OPENAI keys) + DB seedée.
 *
 * Run :
 *   node --env-file-if-exists=.env.local --import tsx scripts/heal/functional-scan.ts -- --only=tools --limit=20
 *   node --env-file-if-exists=.env.local --import tsx scripts/heal/functional-scan.ts -- --strategy=demo-strategy-cimencam --only=all
 *
 * Flags :
 *   --strategy=<id>      stratégie cible (défaut: demo-strategy-cimencam)
 *   --only=<cat>         tools | sequences | frameworks | all (défaut: all)
 *   --limit=<n>          n premiers nœuds par catégorie (défaut: tout)
 *   --concurrency=<n>    appels concurrents (défaut: 3 — les LLM ont des rate limits)
 *   --deterministic      ne déclenche que les nœuds non-LLM (COMPOSE/PURE_MAPPER)
 */

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { EXTENDED_GLORY_TOOLS } from "@/server/services/artemis/tools/registry";
import { executeTool, executeHybridTool } from "@/server/services/artemis/tools/engine";
import { executeFramework } from "@/server/services/artemis";
import { executeSequence } from "@/server/services/artemis/tools/sequence-executor";
import { FRAMEWORKS } from "@/server/services/artemis/frameworks";
import { ALL_SEQUENCES } from "@/server/services/artemis/tools/sequences";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ── CLI ──────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name: string, def: string) =>
  argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? def;
const STRATEGY = arg("strategy", "demo-strategy-cimencam");
const ONLY = arg("only", "all");
const LIMIT = Number(arg("limit", "0")) || Infinity;
const CONCURRENCY = Number(arg("concurrency", "3"));
const DETERMINISTIC_ONLY = argv.includes("--deterministic");
const NODE_TIMEOUT_MS = (Number(arg("node-timeout", "600")) || 600) * 1000;

// ── Types ────────────────────────────────────────────────────────────
type Verdict = "OK" | "DENIED" | "FAILED" | "ERROR";
interface NodeResult {
  kind: "tool" | "sequence" | "framework";
  id: string;
  execType?: string;
  verdict: Verdict;
  errorClass?: string;
  detail?: string;
  ms: number;
}

const results: NodeResult[] = [];

// ── Classification ───────────────────────────────────────────────────
// Un nœud peut : réussir (OK), refuser proprement (DENIED — gate tier /
// pré-condition / credentials manquants = comportement correct, PAS un bug),
// échouer sur sa sortie (FAILED — status FAILED / Zod), ou jeter (ERROR — bug).
const DENIED_RE =
  /TIER_GATE_DENIED|DEFERRED_AWAITING_CREDENTIALS|requiresPaidTier|PRECONDITION|MISSING_[A-Z_]+|NOT_CONFIGURED|needsHuman|AUDIT_.*NOT|requires.*ACCEPTED|MANUAL_REQUIRED|awaiting/i;
const FAILED_RE =
  /"status"\s*:\s*"FAILED"|errorCode|ZOD_VALIDATION_FAILED|VALIDATION_FAILED|LLMStructuredCallError|MANUAL_VALIDATION_FAILED/i;

function classifyError(msg: string): string {
  if (/ZOD|VALIDATION_FAILED|LLMStructuredCall/i.test(msg)) return "llm:zod-invalid-output";
  if (/inconnu|not found|introuvable|undefined is not|Cannot read/i.test(msg)) return "code:null-or-missing";
  if (/timeout|ETIMEDOUT|ECONNRESET/i.test(msg)) return "net:timeout";
  if (/rate.?limit|429|overloaded|529/i.test(msg)) return "llm:rate-limit";
  if (/API key|unauthorized|401|403|provider/i.test(msg)) return "llm:provider-auth";
  if (/prisma|column|relation|P\d{4}/i.test(msg)) return "db:query";
  return "code:uncaught";
}

function classifyResult(out: unknown): { verdict: Verdict; detail?: string } {
  let s: string;
  try { s = JSON.stringify(out); } catch { s = String(out); }
  if (s == null) return { verdict: "OK" };
  if (FAILED_RE.test(s) && !DENIED_RE.test(s)) {
    return { verdict: "FAILED", detail: s.slice(0, 300) };
  }
  if (DENIED_RE.test(s)) return { verdict: "DENIED", detail: s.slice(0, 200) };
  return { verdict: "OK" };
}

// ── Triggers ─────────────────────────────────────────────────────────
/** Race une exécution de nœud contre un timeout — un appel LLM bloqué ne doit
 *  jamais figer tout le scan (le nœud sous-jacent peut continuer en fond). */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`node:timeout — dépassé ${ms}ms (${label})`)), ms),
    ),
  ]);
}

async function trigger(node: { kind: NodeResult["kind"]; id: string; execType?: string }): Promise<NodeResult> {
  const start = Date.now();
  try {
    const exec: Promise<unknown> =
      node.kind === "tool"
        ? node.execType === "HYBRID"
          ? executeHybridTool(node.id, STRATEGY, {})
          : executeTool(node.id, STRATEGY, {})
        : node.kind === "framework"
          ? executeFramework(node.id, STRATEGY, {})
          : executeSequence(node.id as Parameters<typeof executeSequence>[0], STRATEGY, {});
    const out = await withTimeout(exec, NODE_TIMEOUT_MS, node.id);
    const { verdict, detail } = classifyResult(out);
    return { ...node, verdict, detail, ms: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Error ? (err.stack ?? err.message) : String(err);
    return {
      ...node,
      verdict: "ERROR",
      errorClass: classifyError(msg),
      detail: msg.split("\n").slice(0, 3).join(" | ").slice(0, 400),
      ms: Date.now() - start,
    };
  }
}

// ── Concurrency pool ─────────────────────────────────────────────────
async function runPool<T>(items: T[], n: number, fn: (item: T, i: number) => Promise<void>) {
  let idx = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (idx < items.length) {
        const i = idx++;
        await fn(items[i]!, i);
      }
    }),
  );
}

// ── Node list ────────────────────────────────────────────────────────
function buildNodes(): Array<{ kind: NodeResult["kind"]; id: string; execType?: string }> {
  const nodes: Array<{ kind: NodeResult["kind"]; id: string; execType?: string }> = [];
  const wantTools = ONLY === "all" || ONLY === "tools";
  const wantSeq = ONLY === "all" || ONLY === "sequences";
  const wantFw = ONLY === "all" || ONLY === "frameworks";
  if (wantTools) {
    let tools = EXTENDED_GLORY_TOOLS;
    if (DETERMINISTIC_ONLY) tools = tools.filter((t) => t.executionType === "COMPOSE" || t.executionType === "PURE_MAPPER");
    nodes.push(...tools.slice(0, LIMIT).map((t) => ({ kind: "tool" as const, id: t.slug, execType: t.executionType })));
  }
  if (wantSeq && !DETERMINISTIC_ONLY) {
    nodes.push(...ALL_SEQUENCES.slice(0, LIMIT).map((s) => ({ kind: "sequence" as const, id: (s as { key: string }).key })));
  }
  if (wantFw && !DETERMINISTIC_ONLY) {
    nodes.push(...FRAMEWORKS.slice(0, LIMIT).map((f) => ({ kind: "framework" as const, id: f.slug })));
  }
  return nodes;
}

// ── Report ───────────────────────────────────────────────────────────
function writeReport() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join(ROOT, "logs", "heal");
  mkdirSync(dir, { recursive: true });
  const by = (v: Verdict) => results.filter((r) => r.verdict === v);
  const errors = [...by("ERROR"), ...by("FAILED")];
  const classes = new Map<string, NodeResult[]>();
  for (const e of errors) {
    const c = e.errorClass ?? "output:failed";
    if (!classes.has(c)) classes.set(c, []);
    classes.get(c)!.push(e);
  }

  let md = `# FUNCTIONAL SCAN — Le fantôme de NEFER (nœuds déclenchés)\n\n`;
  md += `**${new Date().toISOString()}** · strategy: \`${STRATEGY}\` · only: ${ONLY}${DETERMINISTIC_ONLY ? " (deterministic)" : ""}\n\n`;
  md += `${results.length} nœuds déclenchés — **${by("OK").length} OK · ${by("DENIED").length} DENIED (gate/precondition, OK) · ${by("FAILED").length} FAILED · ${by("ERROR").length} ERROR**\n\n`;
  md += `## Classes d'erreur (fix-by-class)\n\n| Classe | Count | Exemple nœud | Détail |\n|---|---|---|---|\n`;
  for (const [c, items] of [...classes.entries()].sort((a, b) => b[1].length - a[1].length)) {
    md += `| \`${c}\` | ${items.length} | \`${items[0]!.id}\` | ${(items[0]!.detail ?? "").replace(/\|/g, "\\|").slice(0, 90)} |\n`;
  }
  md += `\n## Tous les nœuds FAILED / ERROR\n\n`;
  for (const e of errors) {
    md += `### \`${e.id}\` (${e.kind}, ${e.execType ?? ""}) — ${e.verdict} \`${e.errorClass ?? "output:failed"}\`\n\n`;
    md += "```\n" + (e.detail ?? "") + "\n```\n\n";
  }
  const file = path.join(dir, `functional-scan-${ts}.md`);
  writeFileSync(file, md);
  writeFileSync(path.join(dir, `functional-scan-${ts}.json`), JSON.stringify(results, null, 2));
  console.log(`\n  Rapport : logs/heal/functional-scan-${ts}.md`);
  console.log(`  OK ${by("OK").length} · DENIED ${by("DENIED").length} · FAILED ${by("FAILED").length} · ERROR ${by("ERROR").length}`);
  console.log(`  Classes d'erreur :`);
  for (const [c, items] of [...classes.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`    - ${c} × ${items.length}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────
async function main() {
  const nodes = buildNodes();
  const dir = path.join(ROOT, "logs", "heal");
  mkdirSync(dir, { recursive: true });
  const livePath = path.join(dir, "functional-scan-live.jsonl");
  writeFileSync(livePath, ""); // reset — `tail -f logs/heal/functional-scan-live.jsonl` pour la progression
  console.log(`\n👻 FUNCTIONAL SCAN — ${nodes.length} nœuds · strategy=${STRATEGY} · concurrency=${CONCURRENCY}\n`);
  let done = 0;
  await runPool(nodes, CONCURRENCY, async (node) => {
    const r = await trigger(node);
    results.push(r);
    done++;
    const icon = r.verdict === "OK" ? "✓" : r.verdict === "DENIED" ? "•" : r.verdict === "FAILED" ? "✗" : "💥";
    console.log(`[${done}/${nodes.length}] ${icon} ${node.kind}:${node.id} ${r.verdict} (${r.ms}ms)${r.errorClass ? " " + r.errorClass : ""}`);
    // Visibilité live (appendFileSync flush par nœud, contourne le buffering du pipe stdout).
    appendFileSync(livePath, JSON.stringify({ done, total: nodes.length, ...r }) + "\n");
  });
  writeReport();
  process.exit(results.some((r) => r.verdict === "ERROR" || r.verdict === "FAILED") ? 1 : 0);
}

main().catch((err) => {
  console.error("FUNCTIONAL SCAN FATAL:", err);
  process.exit(2);
});

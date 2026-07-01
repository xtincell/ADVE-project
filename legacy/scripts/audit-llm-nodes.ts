/**
 * scripts/audit-llm-nodes.ts — Auditeur de sécurité des « nœuds magiques » LLM.
 *
 * Le robot site-prober teste le site en boîte noire (navigation). Cet auditeur
 * complète : il regarde le CODE des nœuds LLM et vérifie le contrat de sécurité
 * à l'ENTRÉE et à la SORTIE de chaque pipe LLM.
 *
 *   SORTIE  — tout nœud `executionType: LLM|HYBRID` doit déclarer `outputSchema`
 *             (validation Zod stricte via executeStructuredLLMCall) ou un
 *             `_noSchemaJustification` documenté. Sinon : sortie non validée.
 *   ENTRÉE  — tout appel `callLLM` / `callLLMAndParse` direct (hors gateway +
 *             wrapper structuré) court-circuite la validation et concatène en
 *             général l'entrée non fiable brute dans le prompt → injection.
 *
 * Modes :
 *   (défaut)            → rapport docs/governance/llm-node-audit.md + résumé.
 *   --update-baseline   → fige les manques connus dans scripts/llm-audit-baseline.json.
 *   --strict            → exit 2 si un manque NOUVEAU apparaît (régression vs baseline).
 *                         Sans baseline : exit 2 si le moindre manque existe.
 *
 * Run: `npm run audit:llm`  ·  CI: `npm run audit:llm:strict`.
 */
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_GLORY_TOOLS, EXTENDED_GLORY_TOOLS } from "@/server/services/artemis/tools/registry";
import { FRAMEWORKS } from "@/server/services/artemis/frameworks";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVICES_DIR = path.join(ROOT, "src", "server", "services");
const DOC_OUT = path.join(ROOT, "docs", "governance", "llm-node-audit.md");
const BASELINE_OUT = path.join(ROOT, "scripts", "llm-audit-baseline.json");

const STRICT = process.argv.includes("--strict");
const UPDATE_BASELINE = process.argv.includes("--update-baseline");

// Call sites that are ALLOWED to call the LLM gateway directly (the gateway and
// the structured wrapper themselves). Everything else should go through
// executeStructuredLLMCall so the output is schema-validated.
const DIRECT_CALL_ALLOWLIST = [
  path.join("llm-gateway"),
  path.join("utils", "llm-structured.ts"),
];

interface NodeRow {
  kind: "glory" | "framework";
  slug: string;
  execType: string;
  status: "OUTPUT_SCHEMA" | "JUSTIFIED" | "NO_OUTPUT_GUARD";
}

interface CallSite {
  file: string; // relative to ROOT
  line: number;
  fn: "callLLM" | "callLLMAndParse";
  alsoStructured: boolean; // file also imports/uses executeStructuredLLMCall
  inputStatus: InputStatus; // per-file input-hardening verdict (see classifyInput)
}

/**
 * ENTRÉE — verdict de durcissement anti-injection, par fichier appelant direct.
 *   FENCED   — le fichier neutralise réellement le contenu non fiable avant le
 *              prompt : présence d'au moins un appel `wrapUntrusted(` /
 *              `sanitizeInline(` (LOT 0/1a/1b/1e). Signal structurel, pas un
 *              simple import.
 *   INTERNAL — annoté `@llm-input-internal: <raison>` : pas d'entrée non fiable
 *              concaténée BRUTE à ce site — soit l'appel n'interpole que de la
 *              donnée interne déjà validée (enum, clé pilier, def de framework),
 *              soit le prompt est construit et neutralisé en amont (builder
 *              dédié), soit la seule entrée non texte (image OCR) est couverte
 *              par UNTRUSTED_NOTICE. Escape hatch responsable et auditable,
 *              miroir de `_noSchemaJustification` côté sortie.
 *   RAW      — ni l'un ni l'autre : entrée potentiellement concaténée brute.
 */
type InputStatus = "FENCED" | "INTERNAL" | "RAW";

function classifyInput(src: string): InputStatus {
  if (/\b(wrapUntrusted|sanitizeInline)\s*\(/.test(src)) return "FENCED";
  if (src.includes("@llm-input-internal")) return "INTERNAL";
  return "RAW";
}

// ── 1. SORTIE — introspection des nœuds déclarés ─────────────────────────────
function auditOutputGuards(): NodeRow[] {
  const rows: NodeRow[] = [];
  const tools = [...CORE_GLORY_TOOLS, ...EXTENDED_GLORY_TOOLS] as Array<{
    slug: string;
    executionType: string;
    outputSchema?: unknown;
    _noSchemaJustification?: string;
  }>;
  for (const t of tools) {
    if (t.executionType !== "LLM" && t.executionType !== "HYBRID") continue;
    rows.push({
      kind: "glory",
      slug: t.slug,
      execType: t.executionType,
      status: t.outputSchema ? "OUTPUT_SCHEMA" : t._noSchemaJustification ? "JUSTIFIED" : "NO_OUTPUT_GUARD",
    });
  }
  for (const f of FRAMEWORKS as Array<{ slug: string; outputSchema?: unknown; _noSchemaJustification?: string }>) {
    rows.push({
      kind: "framework",
      slug: f.slug,
      execType: "LLM",
      status: f.outputSchema ? "OUTPUT_SCHEMA" : f._noSchemaJustification ? "JUSTIFIED" : "NO_OUTPUT_GUARD",
    });
  }
  return rows;
}

// ── 2. ENTRÉE / bypass — scan des points d'appel ─────────────────────────────
async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (entry.name.endsWith(".ts") && !entry.name.includes(".test.")) out.push(full);
  }
  return out;
}

async function auditDirectCalls(): Promise<CallSite[]> {
  const files = await walk(SERVICES_DIR);
  const sites: CallSite[] = [];
  const callRe = /\b(callLLM|callLLMAndParse)\s*\(/;
  for (const file of files) {
    const rel = path.relative(ROOT, file);
    if (DIRECT_CALL_ALLOWLIST.some((a) => rel.includes(a))) continue;
    const src = await fs.readFile(file, "utf8");
    const alsoStructured = src.includes("executeStructuredLLMCall");
    const inputStatus = classifyInput(src);
    src.split("\n").forEach((lineText, i) => {
      // skip import lines + comments
      const trimmed = lineText.trim();
      if (trimmed.startsWith("import") || trimmed.startsWith("*") || trimmed.startsWith("//")) return;
      const m = callRe.exec(lineText);
      if (!m) return;
      // Faux positif : `callLLM(` à l'INTÉRIEUR d'une chaîne (ex. un champ
      // `description` de GloryToolDef qui documente « …appelle callLLM(…) »).
      // Heuristique : un nombre impair de guillemets `"`/`'` avant le match =
      // on est dans une chaîne littérale, pas un vrai appel.
      const before = lineText.slice(0, m.index);
      if ((before.split('"').length - 1) % 2 === 1 || (before.split("'").length - 1) % 2 === 1) return;
      sites.push({ file: rel, line: i + 1, fn: m[1] as CallSite["fn"], alsoStructured, inputStatus });
    });
  }
  return sites;
}

function pct(n: number, d: number): string {
  return d === 0 ? "—" : `${Math.round((n / d) * 100)}%`;
}

async function main() {
  const nodes = auditOutputGuards();
  const callSites = await auditDirectCalls();

  const glory = nodes.filter((n) => n.kind === "glory");
  const fw = nodes.filter((n) => n.kind === "framework");
  const outputGaps = nodes.filter((n) => n.status === "NO_OUTPUT_GUARD");
  const gloryGuarded = glory.filter((n) => n.status !== "NO_OUTPUT_GUARD").length;
  const fwGuarded = fw.filter((n) => n.status !== "NO_OUTPUT_GUARD").length;

  // Group direct-call files (the entrée/bypass surface).
  const byFile = new Map<string, CallSite[]>();
  for (const s of callSites) (byFile.get(s.file) ?? byFile.set(s.file, []).get(s.file)!).push(s);

  // Input-hardening verdict per direct-call file (all sites in a file share it).
  const fileInput = new Map<string, InputStatus>();
  for (const [f, ss] of byFile) fileInput.set(f, ss[0].inputStatus);
  const rawInputFiles = [...fileInput].filter(([, s]) => s === "RAW").map(([f]) => f).sort();
  const fencedFiles = [...fileInput].filter(([, s]) => s === "FENCED").length;
  const internalFiles = [...fileInput].filter(([, s]) => s === "INTERNAL").length;
  const inputHardened = fencedFiles + internalFiles;

  // ── Baseline (régression-only en --strict) ──
  const currentGapSlugs = [...new Set(outputGaps.map((n) => `${n.kind}:${n.slug}`))].sort();
  const currentBypassFiles = [...byFile.keys()].sort();

  if (UPDATE_BASELINE) {
    await fs.writeFile(
      BASELINE_OUT,
      JSON.stringify(
        { outputGaps: currentGapSlugs, bypassFiles: currentBypassFiles, rawInputFiles },
        null,
        2,
      ) + "\n",
    );
    console.log(
      `[baseline] écrit : ${currentGapSlugs.length} manques sortie + ${currentBypassFiles.length} fichiers bypass + ${rawInputFiles.length} entrées brutes`,
    );
  }

  // ── Rapport Markdown ──
  const lines: string[] = [];
  lines.push("# Audit sécurité des nœuds LLM", "");
  lines.push("> Auto-généré par `npm run audit:llm` (`scripts/audit-llm-nodes.ts`). Ne pas éditer à la main.", "");
  lines.push(`Généré le ${new Date().toISOString().slice(0, 10)}.`, "");
  lines.push("Deux contrats vérifiés par nœud : **sortie** (validation Zod stricte) et **entrée** (pas d'appel LLM direct qui court-circuite la validation et concatène l'entrée brute).", "");

  lines.push("## Vue d'ensemble", "");
  lines.push("| Catégorie | Total | Protégés (sortie) | Couverture | Sans garde |", "|---|---|---|---|---|");
  lines.push(`| Glory tools (LLM/HYBRID) | ${glory.length} | ${gloryGuarded} | ${pct(gloryGuarded, glory.length)} | ${glory.length - gloryGuarded} |`);
  lines.push(`| Frameworks | ${fw.length} | ${fwGuarded} | ${pct(fwGuarded, fw.length)} | ${fw.length - fwGuarded} |`);
  lines.push(`| Appels LLM directs (bypass wrapper) | ${byFile.size} | ${inputHardened} (entrée durcie) | ${pct(inputHardened, byFile.size)} | ${rawInputFiles.length} bruts |`, "");
  lines.push("");
  lines.push(`Entrée durcie = ${fencedFiles} fichiers \`FENCED\` (neutralisation \`wrapUntrusted\`/\`sanitizeInline\`) + ${internalFiles} \`INTERNAL\` (annotés \`@llm-input-internal\` — entrée 100% interne). ${callSites.length} appels directs au total.`, "");

  lines.push("## SORTIE — nœuds sans contrat de validation", "");
  lines.push("Ces nœuds appellent un LLM mais ne déclarent ni `outputSchema` ni `_noSchemaJustification` : leur sortie n'est pas validée structurellement.", "");
  if (outputGaps.length === 0) lines.push("_Aucun. ✅_", "");
  else {
    lines.push("| Type | Slug | Exec |", "|---|---|---|");
    for (const n of outputGaps) lines.push(`| ${n.kind} | \`${n.slug}\` | ${n.execType} |`);
    lines.push("");
  }

  lines.push("## ENTRÉE — appels LLM directs (hors wrapper structuré)", "");
  lines.push("Ces points appellent `callLLM`/`callLLMAndParse` sans passer par `executeStructuredLLMCall`. Le risque d'injection se mesure à l'**entrée** : verdict `FENCED` (contenu non fiable neutralisé via `wrapUntrusted`/`sanitizeInline`), `INTERNAL` (entrée 100% interne, annoté `@llm-input-internal`), ou `RAW` (à durcir).", "");
  if (byFile.size === 0) lines.push("_Aucun. ✅_", "");
  else {
    lines.push("| Fichier | Lignes | Appels | Entrée | Wrapper |", "|---|---|---|---|---|");
    for (const f of currentBypassFiles) {
      const ss = byFile.get(f)!;
      const badge = ss[0].inputStatus === "FENCED" ? "✅ FENCED" : ss[0].inputStatus === "INTERNAL" ? "🔒 INTERNAL" : "⚠️ RAW";
      lines.push(`| \`${f}\` | ${ss.map((s) => s.line).join(", ")} | ${ss.length} | ${badge} | ${ss[0].alsoStructured ? "oui (mixte)" : "non"} |`);
    }
    lines.push("");
  }

  lines.push("### Entrées brutes restantes (`RAW`)", "");
  lines.push("Appels directs dont l'entrée n'est pas encore neutralisée. Cible LOT 1e : 0.", "");
  if (rawInputFiles.length === 0) lines.push("_Aucune. ✅_", "");
  else {
    for (const f of rawInputFiles) lines.push(`- \`${f}\``);
    lines.push("");
  }

  lines.push("## Garde-fous présents (référence)", "");
  lines.push("- **Sortie** : `executeStructuredLLMCall` (`utils/llm-structured.ts`) — schéma Zod strict + retry x2 + `responseFormat: json_object`.");
  lines.push("- **Gateway** : circuit breaker multi-provider, suivi de coût, budget gate, retry exponentiel (`llm-gateway/`).");
  lines.push("- **SSRF** : denylist RFC1918 + http/https-only sur `market-research-tools.ts` (fetcher DELEGATE).");
  lines.push("- **PII** : pré-filtre regex + classifieur HYBRID (`campaign-tracker/signals-culture.ts`, `phase19-tools.ts`).", "");

  await fs.writeFile(DOC_OUT, lines.join("\n") + "\n");

  // ── Résumé console ──
  console.log("\n══════════ AUDIT NŒUDS LLM ══════════");
  console.log(`Glory LLM/HYBRID : ${gloryGuarded}/${glory.length} avec garde sortie (${pct(gloryGuarded, glory.length)})`);
  console.log(`Frameworks       : ${fwGuarded}/${fw.length} avec garde sortie (${pct(fwGuarded, fw.length)})`);
  console.log(`Sortie non gardée : ${outputGaps.length} nœuds`);
  console.log(`Entrée durcie    : ${inputHardened}/${byFile.size} fichiers (${fencedFiles} FENCED + ${internalFiles} INTERNAL) — ${rawInputFiles.length} bruts · ${callSites.length} appels directs`);
  console.log(`Rapport : ${path.relative(ROOT, DOC_OUT)}`);
  console.log("═════════════════════════════════════\n");

  // ── Verdict --strict (régression-only si baseline existe) ──
  if (STRICT) {
    let baseline: { outputGaps: string[]; bypassFiles: string[]; rawInputFiles?: string[] } | null = null;
    try {
      baseline = JSON.parse(await fs.readFile(BASELINE_OUT, "utf8"));
    } catch {
      baseline = null;
    }
    const baseGaps = new Set(baseline?.outputGaps ?? []);
    // Entrée : régression = NOUVEAU fichier appelant en `RAW` (entrée non
    // neutralisée). Un nouvel appelant direct qui neutralise son entrée dès le
    // départ est autorisé. Fallback `bypassFiles` si baseline antérieure à la
    // métrique rawInputFiles.
    const baseRaw = new Set(baseline?.rawInputFiles ?? baseline?.bypassFiles ?? []);
    const newGaps = currentGapSlugs.filter((g) => !baseGaps.has(g));
    const newRaw = rawInputFiles.filter((f) => !baseRaw.has(f));
    if (baseline === null) {
      if (currentGapSlugs.length > 0 || rawInputFiles.length > 0) {
        console.error(`[strict] Pas de baseline : ${currentGapSlugs.length} manques sortie + ${rawInputFiles.length} entrées brutes.`);
        process.exit(2);
      }
    } else if (newGaps.length > 0 || newRaw.length > 0) {
      console.error("[strict] RÉGRESSION — nouveaux nœuds LLM sans garde :");
      newGaps.forEach((g) => console.error(`  + sortie non gardée : ${g}`));
      newRaw.forEach((f) => console.error(`  + entrée LLM brute (non neutralisée) : ${f}`));
      console.error("Sortie : outputSchema/justification. Entrée : neutralise via wrapUntrusted/sanitizeInline (ou annote @llm-input-internal). Puis `npm run audit:llm -- --update-baseline`.");
      process.exit(2);
    }
    console.log("[strict] OK — aucune régression vs baseline.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

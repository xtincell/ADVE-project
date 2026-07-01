/**
 * gen-pillar-variables-listing.ts — Listing INTÉGRAL des variables des 8 piliers ADVE-RTIS.
 *
 * Contrairement à la page `/console/config/variables` (qui n'énumère que les
 * champs de PREMIER NIVEAU), ce générateur descend RÉCURSIVEMENT dans tout
 * l'arbre Zod : objets imbriqués, éléments d'array, options d'union, records.
 * Garantit qu'aucun champ n'est oublié — la source est le schéma compilé réel
 * `PILLAR_SCHEMAS`, croisé avec `VARIABLE_BIBLE` pour la documentation de fond.
 *
 * Régen : `npx tsx scripts/gen-pillar-variables-listing.ts`
 * Cible  : `docs/governance/PILLAR-VARIABLES-LISTING.md`
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PILLAR_SCHEMAS } from "../src/lib/types/pillar-schemas";
import { VARIABLE_BIBLE, type VariableSpec } from "../src/lib/types/variable-bible";
import { PILLAR_NAMES } from "../src/lib/types/advertis-vector";

const ROOT = join(__dirname, "..");

// ── Zod 4.4 introspection helpers ──────────────────────────────────────────

interface ZDef {
  type: string;
  shape?: Record<string, unknown>;
  element?: unknown;
  innerType?: unknown;
  options?: unknown[];
  entries?: Record<string, unknown>;
  values?: unknown[];
  keyType?: unknown;
  valueType?: unknown;
  checks?: unknown[];
}

function def(schema: unknown): ZDef | undefined {
  return (schema as { _zod?: { def?: ZDef } })?._zod?.def;
}

/** Peel optional / nullable / default wrappers, accumulating flags. */
function peel(schema: unknown): { d: ZDef | undefined; optional: boolean; nullable: boolean; hasDefault: boolean } {
  let d = def(schema);
  let optional = false, nullable = false, hasDefault = false;
  while (d && (d.type === "optional" || d.type === "nullable" || d.type === "default")) {
    if (d.type === "optional") optional = true;
    if (d.type === "nullable") nullable = true;
    if (d.type === "default") hasDefault = true;
    d = def(d.innerType);
  }
  return { d, optional, nullable, hasDefault };
}

/** Render the check constraints (min/max length, numeric bounds, …) as a compact string. */
function renderChecks(checks: unknown[] | undefined): string {
  if (!checks || checks.length === 0) return "";
  const parts: string[] = [];
  for (const c of checks) {
    const cd = (c as { _zod?: { def?: Record<string, unknown> } })?._zod?.def ?? (c as Record<string, unknown>);
    if (!cd) continue;
    const check = cd.check as string | undefined;
    if (check === "min_length") parts.push(`min ${cd.minimum} car.`);
    else if (check === "max_length") parts.push(`max ${cd.maximum} car.`);
    else if (check === "length_equals") parts.push(`exactement ${cd.length} car.`);
    else if (check === "greater_than") parts.push(`> ${cd.value}`);
    else if (check === "greater_than_or_equal") parts.push(`≥ ${cd.value}`);
    else if (check === "less_than") parts.push(`< ${cd.value}`);
    else if (check === "less_than_or_equal") parts.push(`≤ ${cd.value}`);
    else if (check === "number_format") parts.push(`${cd.format}`);
    else if (check) parts.push(String(check));
  }
  return parts.join(" · ");
}

function enumValues(d: ZDef): string[] {
  if (d.entries) return Object.keys(d.entries);
  if (d.values) return d.values.map((v) => String(v));
  return [];
}

// ── Row model ────────────────────────────────────────────────────────────

interface Row {
  depth: number;
  path: string;       // dotted path from pillar root, [] marks array elements, {clé} marks record entries
  type: string;       // human type label
  required: boolean;  // !optional (a default still counts as not-required input)
  constraints: string;
  bible?: VariableSpec;
}

let leafCount = 0;
let nodeCount = 0;

function walk(
  schema: unknown,
  path: string,
  depth: number,
  rows: Row[],
  bibleForTop: VariableSpec | undefined,
): void {
  const { d, optional } = peel(schema);
  if (!d) {
    rows.push({ depth, path, type: "unknown", required: !optional, constraints: "", bible: bibleForTop });
    leafCount++;
    return;
  }

  const required = !optional;

  switch (d.type) {
    case "object": {
      rows.push({ depth, path, type: "object", required, constraints: "", bible: bibleForTop });
      nodeCount++;
      const shape = d.shape ?? {};
      for (const [k, v] of Object.entries(shape)) {
        walk(v, `${path}.${k}`, depth + 1, rows, undefined);
      }
      break;
    }
    case "array": {
      const { d: elDef } = peel(d.element);
      const itemConstraints = renderChecks(d.checks);
      if (elDef?.type === "object") {
        rows.push({ depth, path, type: "array<object>", required, constraints: itemConstraints, bible: bibleForTop });
        nodeCount++;
        const shape = elDef.shape ?? {};
        for (const [k, v] of Object.entries(shape)) {
          walk(v, `${path}[].${k}`, depth + 1, rows, undefined);
        }
      } else if (elDef?.type === "enum") {
        const vals = enumValues(elDef);
        rows.push({ depth, path, type: `array<enum>`, required, constraints: [itemConstraints, `valeurs: ${vals.join(", ")}`].filter(Boolean).join(" · "), bible: bibleForTop });
        leafCount++;
      } else {
        rows.push({ depth, path, type: `array<${elDef?.type ?? "?"}>`, required, constraints: itemConstraints, bible: bibleForTop });
        leafCount++;
      }
      break;
    }
    case "union": {
      const opts = d.options ?? [];
      const optTypes = opts.map((o) => peel(o).d?.type ?? "?");
      rows.push({ depth, path, type: `union(${optTypes.join(" | ")})`, required, constraints: "", bible: bibleForTop });
      nodeCount++;
      // Recurse into object options so their fields are not lost.
      opts.forEach((o, i) => {
        const od = peel(o).d;
        if (od?.type === "object") {
          const shape = od.shape ?? {};
          for (const [k, v] of Object.entries(shape)) {
            walk(v, `${path}(opt${i + 1}).${k}`, depth + 1, rows, undefined);
          }
        }
      });
      break;
    }
    case "record": {
      const keyT = peel(d.keyType).d?.type ?? "string";
      const { d: valDef } = peel(d.valueType);
      rows.push({ depth, path, type: `record<${keyT}, ${valDef?.type ?? "?"}>`, required, constraints: "", bible: bibleForTop });
      nodeCount++;
      if (valDef?.type === "object") {
        const shape = valDef.shape ?? {};
        for (const [k, v] of Object.entries(shape)) {
          walk(v, `${path}.{clé}.${k}`, depth + 1, rows, undefined);
        }
      } else if (valDef?.type === "array") {
        const { d: elDef } = peel(valDef.element);
        if (elDef?.type === "object") {
          rows.push({ depth: depth + 1, path: `${path}.{clé}[]`, type: "array<object>", required: false, constraints: "", bible: undefined });
          nodeCount++;
          const shape = elDef.shape ?? {};
          for (const [k, v] of Object.entries(shape)) {
            walk(v, `${path}.{clé}[].${k}`, depth + 2, rows, undefined);
          }
        }
      }
      break;
    }
    case "enum": {
      const vals = enumValues(d);
      rows.push({ depth, path, type: "enum", required, constraints: `valeurs: ${vals.join(", ")}`, bible: bibleForTop });
      leafCount++;
      break;
    }
    case "literal": {
      const vals = enumValues(d);
      rows.push({ depth, path, type: "literal", required, constraints: vals.join(" | "), bible: bibleForTop });
      leafCount++;
      break;
    }
    default: {
      // string, number, boolean, …
      rows.push({ depth, path, type: d.type, required, constraints: renderChecks(d.checks), bible: bibleForTop });
      leafCount++;
    }
  }
}

// ── Markdown rendering ──────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/\|/g, "\\|");
}

const PILLAR_ORDER: Array<keyof typeof PILLAR_SCHEMAS> = ["A", "D", "V", "E", "R", "T", "I", "S"];
const ADVE = new Set(["A", "D", "V", "E"]);

function main() {
  const lines: string[] = [];
  const perPillarRows: Record<string, Row[]> = {};

  // Build rows
  for (const key of PILLAR_ORDER) {
    const schema = PILLAR_SCHEMAS[key];
    const bible = VARIABLE_BIBLE[key.toLowerCase()] ?? {};
    const rows: Row[] = [];
    const shape = def(schema)?.shape ?? {};
    for (const [fieldKey, fieldSchema] of Object.entries(shape)) {
      walk(fieldSchema, fieldKey, 0, rows, bible[fieldKey]);
    }
    perPillarRows[key] = rows;
  }

  const totalRows = Object.values(perPillarRows).reduce((n, r) => n + r.length, 0);
  const totalTopLevel = PILLAR_ORDER.reduce((n, k) => n + Object.keys(def(PILLAR_SCHEMAS[k])?.shape ?? {}).length, 0);
  const documentedTop = PILLAR_ORDER.reduce(
    (n, k) => n + Object.keys(def(PILLAR_SCHEMAS[k])?.shape ?? {}).filter((f) => VARIABLE_BIBLE[k.toLowerCase()]?.[f]).length,
    0,
  );

  // ── Header ──
  lines.push("# Listing intégral des variables ADVE & RTIS");
  lines.push("");
  lines.push("> **AUTO-GÉNÉRÉ** — ne pas éditer à la main. Source : `src/lib/types/pillar-schemas.ts` (`PILLAR_SCHEMAS`, schéma Zod compilé) croisé avec `src/lib/types/variable-bible.ts` (`VARIABLE_BIBLE`). Régen : `npx tsx scripts/gen-pillar-variables-listing.ts`.");
  lines.push("");
  lines.push("Ce document descend **récursivement** dans tout l'arbre Zod (objets imbriqués, éléments d'array notés `[]`, options d'union notées `(optN)`, records notés `{clé}`). La page `/console/config/variables` n'affiche que le **premier niveau** — ce listing comble cet écart pour garantir qu'aucun champ n'est oublié.");
  lines.push("");
  lines.push("## Synthèse");
  lines.push("");
  lines.push(`- **8 piliers** : 4 ADVE fondateurs (A·D·V·E, édités manuellement) + 4 RTIS dérivés (R·T·I·S, régénérés via cascade — jamais édités à la main, cf. ADR-0023).`);
  lines.push(`- **${totalTopLevel} champs de premier niveau** (ce que montre la page Console).`);
  lines.push(`- **${totalRows} entrées totales** une fois l'arbre déplié récursivement (objets + sous-champs + éléments d'array + options d'union + records).`);
  lines.push(`- **${documentedTop}/${totalTopLevel} champs de premier niveau documentés** dans la Variable Bible.`);
  lines.push("");
  lines.push("| Pilier | Nom | Champs niveau 1 | Entrées dépliées | Documentés (N1) |");
  lines.push("|---|---|---:|---:|---:|");
  for (const key of PILLAR_ORDER) {
    const top = Object.keys(def(PILLAR_SCHEMAS[key])?.shape ?? {}).length;
    const docd = Object.keys(def(PILLAR_SCHEMAS[key])?.shape ?? {}).filter((f) => VARIABLE_BIBLE[key.toLowerCase()]?.[f]).length;
    const name = (PILLAR_NAMES as Record<string, string>)[key.toLowerCase()] ?? key;
    const fam = ADVE.has(key) ? "ADVE" : "RTIS";
    lines.push(`| **${key}** (${fam}) | ${esc(name)} | ${top} | ${perPillarRows[key]!.length} | ${docd}/${top} |`);
  }
  lines.push("");
  lines.push("---");
  lines.push("");

  // ── Per-pillar detail ──
  for (const key of PILLAR_ORDER) {
    const name = (PILLAR_NAMES as Record<string, string>)[key.toLowerCase()] ?? key;
    const fam = ADVE.has(key) ? "ADVE — fondateur (édition manuelle)" : "RTIS — dérivé (régénéré par cascade)";
    const rows = perPillarRows[key]!;
    lines.push(`## Pilier ${key} — ${name}`);
    lines.push("");
    lines.push(`_${fam}_`);
    lines.push("");
    lines.push("| Champ (chemin) | Type | Req. | Contraintes / valeurs | Bible (description) |");
    lines.push("|---|---|:--:|---|---|");
    for (const r of rows) {
      const indent = "  ".repeat(r.depth); // nbsp indent to show nesting in table
      const pathCell = `${indent}\`${esc(r.path)}\``;
      const req = r.required ? "✓" : "—";
      const bibleDesc = r.bible?.description ? esc(r.bible.description) : "";
      const code = r.bible?.canonicalCode ? ` _(code ${esc(r.bible.canonicalCode)})_` : "";
      lines.push(`| ${pathCell} | \`${esc(r.type)}\` | ${req} | ${esc(r.constraints)} | ${bibleDesc}${code} |`);
    }
    lines.push("");

    // Coverage gaps for this pillar (top-level only)
    const shape = def(PILLAR_SCHEMAS[key])?.shape ?? {};
    const undocumented = Object.keys(shape).filter((f) => !VARIABLE_BIBLE[key.toLowerCase()]?.[f]);
    if (undocumented.length > 0) {
      lines.push(`**Champs niveau 1 sans entrée Bible (${undocumented.length})** : ${undocumented.map((f) => `\`${f}\``).join(", ")}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  // ── Drift check: bible entries with no matching top-level schema field ──
  lines.push("## Contrôle de cohérence — entrées Bible orphelines");
  lines.push("");
  lines.push("Entrées présentes dans `VARIABLE_BIBLE` mais sans champ de premier niveau correspondant dans le schéma Zod (drift potentiel — clé renommée ou supprimée du schéma) :");
  lines.push("");
  let anyOrphan = false;
  for (const key of PILLAR_ORDER) {
    const shape = def(PILLAR_SCHEMAS[key])?.shape ?? {};
    const bible = VARIABLE_BIBLE[key.toLowerCase()] ?? {};
    const orphans = Object.keys(bible).filter((f) => !(f in shape));
    if (orphans.length > 0) {
      anyOrphan = true;
      lines.push(`- **${key}** : ${orphans.map((f) => `\`${f}\``).join(", ")}`);
    }
  }
  if (!anyOrphan) lines.push("_(Aucune entrée orpheline — la Bible est alignée sur le schéma au premier niveau.)_");
  lines.push("");

  const out = lines.join("\n") + "\n";
  const target = join(ROOT, "docs/governance/PILLAR-VARIABLES-LISTING.md");
  writeFileSync(target, out, "utf-8");
  console.log(`✓ ${target}`);
  console.log(`  ${totalTopLevel} champs niveau 1 · ${totalRows} entrées dépliées · ${documentedTop}/${totalTopLevel} documentés`);
  console.log(`  (leaves: ${leafCount}, nodes: ${nodeCount})`);
}

main();

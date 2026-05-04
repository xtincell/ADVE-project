/**
 * gen-variable-bible-canon.ts — Auto-régen `VARIABLE-BIBLE-CANON.md`.
 *
 * Reads `src/lib/types/variable-bible-canonical-map.ts` and produces a
 * 3-column table (Code manuel / Label canon / Field code path) sorted
 * by pilier (A → S) then by code.
 *
 * Triggered :
 *   - manuellement : `npx tsx scripts/gen-variable-bible-canon.ts`
 *   - pre-commit hook (à brancher sur changement variable-bible*.ts)
 *
 * Cf. ADR-0037 §11 + PR-K.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");

import { CANONICAL_MAP, listCanonicalCodes } from "../src/lib/types/variable-bible-canonical-map";
import { VARIABLE_BIBLE } from "../src/lib/types/variable-bible";

const PILIER_LABEL: Record<string, string> = {
  a: "A — Authenticité (Le Gospel)",
  d: "D — Distinction (Le Mythe)",
  v: "V — Valeur (Le Miracle)",
  e: "E — Engagement (L'Église)",
  r: "R — Risk",
  t: "T — Track",
  i: "I — Innovation",
  s: "S — Strategy",
};

function escapeMd(s: string): string {
  return s.replace(/\|/g, "\\|");
}

function main() {
  const codes = listCanonicalCodes();
  const lines: string[] = [];
  lines.push("# Variable Bible — Canonical Map (manuel ADVE ↔ code)");
  lines.push("");
  lines.push("> **AUTO-GÉNÉRÉ** — ne pas éditer à la main. Source : `src/lib/types/variable-bible-canonical-map.ts`. Régen : `npx tsx scripts/gen-variable-bible-canon.ts`. Cf. [ADR-0037](adr/0037-country-scoped-knowledge-base.md) §11 + PR-K.");
  lines.push("");
  lines.push(`Total : **${codes.length} codes manuel mappés** sur **${countBibleEntries()} entries variable-bible**.`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Group by pilier
  const byPilier: Record<string, string[]> = {};
  for (const code of codes) {
    const e = CANONICAL_MAP[code]!;
    byPilier[e.pillarKey] ??= [];
    byPilier[e.pillarKey]!.push(code);
  }

  for (const pillarKey of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
    const list = byPilier[pillarKey];
    if (!list || list.length === 0) continue;
    lines.push(`## Pilier ${PILIER_LABEL[pillarKey] ?? pillarKey.toUpperCase()}`);
    lines.push("");
    lines.push("| Code manuel | Label canon | Section manuel | Field code (path) | Description |");
    lines.push("|---|---|---|---|---|");
    for (const code of list) {
      const e = CANONICAL_MAP[code]!;
      const spec = VARIABLE_BIBLE[e.pillarKey]?.[e.fieldKey];
      const desc = spec?.description ?? "_(field non trouvé en bible — drift !)_";
      lines.push(
        `| \`${escapeMd(code)}\` | ${escapeMd(e.canonicalLabel)} | ${escapeMd(e.manualSection)} | \`${e.pillarKey}.${e.fieldKey}\` | ${escapeMd(desc.slice(0, 120))}${desc.length > 120 ? "…" : ""} |`,
      );
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push("## Anti-drift");
  lines.push("");
  lines.push("Test CI : `tests/unit/governance/variable-bible-canonical-coverage.test.ts` vérifie que tout code listé dans `CANONICAL_MAP` pointe vers une entry existante de `VARIABLE_BIBLE`. Toute désynchronisation = échec CI.");
  lines.push("");
  lines.push("Lecture inverse — quels fields code n'ont PAS de code manuel : champs marqués `derivedFrom` (RTIS, calculs cross-pilier) + champs code-only (extensions du framework). Liste explicite dans la section ci-dessous.");
  lines.push("");

  // List unmapped (code-only) entries
  const mapped = new Set(Object.values(CANONICAL_MAP).map((e) => `${e.pillarKey}.${e.fieldKey}`));
  const unmapped: Array<{ pillarKey: string; fieldKey: string }> = [];
  for (const [pillarKey, bible] of Object.entries(VARIABLE_BIBLE)) {
    for (const fieldKey of Object.keys(bible)) {
      if (!mapped.has(`${pillarKey}.${fieldKey}`)) unmapped.push({ pillarKey, fieldKey });
    }
  }
  lines.push(`### Fields code sans code manuel (${unmapped.length})`);
  lines.push("");
  lines.push("Ces fields sont soit (a) dérivés/calculés, soit (b) extensions code-only du framework La Fusée. Aucun code manuel correspondant n'est attendu.");
  lines.push("");
  if (unmapped.length === 0) {
    lines.push("_(Aucun field non-mappé — couverture canonique 100%)_");
  } else {
    const byPil: Record<string, string[]> = {};
    for (const { pillarKey, fieldKey } of unmapped) {
      byPil[pillarKey] ??= [];
      byPil[pillarKey]!.push(fieldKey);
    }
    for (const pillarKey of ["a", "d", "v", "e", "r", "t", "i", "s"]) {
      if (!byPil[pillarKey]) continue;
      lines.push(`- **${pillarKey.toUpperCase()}** : ${byPil[pillarKey]!.map((f) => `\`${f}\``).join(", ")}`);
    }
  }
  lines.push("");

  const out = lines.join("\n") + "\n";
  const target = join(ROOT, "docs/governance/VARIABLE-BIBLE-CANON.md");
  writeFileSync(target, out, "utf-8");
  console.log(`✓ ${target} — ${codes.length} codes / ${countBibleEntries()} entries`);
}

function countBibleEntries(): number {
  let n = 0;
  for (const bible of Object.values(VARIABLE_BIBLE)) n += Object.keys(bible).length;
  return n;
}

main();

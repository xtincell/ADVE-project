/**
 * generate-component-map.ts — auto-régénère docs/governance/COMPONENT-MAP.md
 * en scannant tous les *.manifest.ts dans src/components/.
 *
 * Cf. DESIGN-SYSTEM.md §D.42.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(__dirname, "..");
const COMPONENTS_DIR = join(ROOT, "src/components");
const OUT = join(ROOT, "docs/governance/COMPONENT-MAP.md");

interface Entry {
  file: string;
  component: string;
  variants: number;
  missionContribution: string;
  a11yLevel: string;
  status: "migrated" | "pending-migration";
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (entry.endsWith(".manifest.ts")) acc.push(p);
  }
  return acc;
}

function parseManifest(path: string): Entry | null {
  const src = readFileSync(path, "utf-8");
  const componentMatch = /component:\s*"([^"]+)"/.exec(src);
  const a11yMatch = /a11yLevel:\s*"([^"]+)"/.exec(src);
  const missionMatch = /missionContribution:\s*"([^"]+)"/.exec(src);
  const variantsMatch = src.match(/\{\s*name:\s*"[^"]+"/g);
  if (!componentMatch) return null;
  return {
    file: relative(ROOT, path),
    component: componentMatch[1] ?? "?",
    variants: variantsMatch?.length ?? 0,
    missionContribution: missionMatch?.[1] ?? "?",
    a11yLevel: a11yMatch?.[1] ?? "?",
    status: "migrated",
  };
}

function main() {
  const manifests = walk(COMPONENTS_DIR);
  const entries: Entry[] = [];
  for (const m of manifests) {
    const e = parseManifest(m);
    if (e) entries.push(e);
  }

  const lines: string[] = [];
  lines.push("# COMPONENT-MAP — Inventaire des composants UI");
  lines.push("");
  lines.push(`> **Auto-régénéré** par \`scripts/generate-component-map.ts\` (${new Date().toISOString().slice(0, 10)}).`);
  lines.push("> Ne pas éditer à la main.");
  lines.push("");
  lines.push(`## Migrated (${entries.length})`);
  lines.push("");
  lines.push("| Composant | Fichier | Variants | Mission | a11y |");
  lines.push("|---|---|---|---|---|");
  for (const e of entries.sort((a, b) => a.component.localeCompare(b.component))) {
    lines.push(`| \`${e.component}\` | \`${e.file}\` | ${e.variants} | ${e.missionContribution} | ${e.a11yLevel} |`);
  }
  lines.push("");
  lines.push("Cf. [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md), [DESIGN-LEXICON.md](DESIGN-LEXICON.md).");

  writeFileSync(OUT, lines.join("\n"));
  console.log(`✓ COMPONENT-MAP.md regenerated — ${entries.length} components`);
}

main();

/**
 * generate-token-map.ts — auto-régénère docs/governance/DESIGN-TOKEN-MAP.md
 * en parsant src/styles/tokens/*.css.
 *
 * Cf. DESIGN-SYSTEM.md §D.43.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const TOKENS = ["reference", "system", "component", "domain", "animations"] as const;

const VAR_DECL = /^\s*(--[a-zA-Z][a-zA-Z0-9-]+)\s*:\s*([^;]+);/gm;

interface Token {
  name: string;
  value: string;
}

function parseCss(file: string): Token[] {
  const path = join(ROOT, "src/styles/tokens", `${file}.css`);
  const css = readFileSync(path, "utf-8");
  const tokens: Token[] = [];
  let m: RegExpExecArray | null;
  VAR_DECL.lastIndex = 0;
  while ((m = VAR_DECL.exec(css)) !== null) {
    if (m[1] && m[2]) tokens.push({ name: m[1], value: m[2].trim() });
  }
  return tokens;
}

function main() {
  const lines: string[] = [];
  lines.push("# DESIGN-TOKEN-MAP — Inventaire exhaustif tokens (auto-régénéré)");
  lines.push("");
  lines.push(`> **Auto-régénéré** par \`scripts/generate-token-map.ts\` (${new Date().toISOString().slice(0, 10)}).`);
  lines.push("> Source runtime : `src/styles/tokens/*.css`. Cf. [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) §5.");
  lines.push("");

  for (const tier of TOKENS) {
    const tokens = parseCss(tier);
    lines.push(`## Tier — ${tier} (${tokens.length})`);
    lines.push("");
    lines.push("| Token | Valeur |");
    lines.push("|---|---|");
    for (const t of tokens) {
      lines.push(`| \`${t.name}\` | \`${t.value.replace(/\|/g, "\\|")}\` |`);
    }
    lines.push("");
  }

  writeFileSync(join(ROOT, "docs/governance/DESIGN-TOKEN-MAP.md"), lines.join("\n"));
  console.log(`✓ DESIGN-TOKEN-MAP.md regenerated`);
}

main();

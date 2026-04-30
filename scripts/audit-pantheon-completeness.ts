/**
 * audit-pantheon-completeness.ts
 *
 * Cron CI — vérifie que chaque Neter actif (5 + 2 pré-réservés) a :
 *   1. Une section dans docs/governance/PANTHEON.md
 *   2. Une entrée dans docs/governance/LEXICON.md
 *   3. Présent dans BRAINS const
 *
 * Exit code != 0 si Neter manquant.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BRAINS } from "../src/server/governance/manifest";

const ROOT = join(__dirname, "..");

const EXPECTED_NETERU = ["MESTOR", "ARTEMIS", "SESHAT", "THOT", "PTAH", "IMHOTEP", "ANUBIS"] as const;

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf-8");
}

interface CheckResult {
  neter: string;
  inBrains: boolean;
  inPantheon: boolean;
  inLexicon: boolean;
  inApogee: boolean;
}

function main() {
  const pantheon = read("docs/governance/PANTHEON.md");
  const lexicon = read("docs/governance/LEXICON.md");
  const apogee = read("docs/governance/APOGEE.md");

  const results: CheckResult[] = EXPECTED_NETERU.map((neter) => {
    const titleCase = neter.charAt(0) + neter.slice(1).toLowerCase();
    return {
      neter,
      inBrains: (BRAINS as readonly string[]).includes(neter),
      inPantheon: pantheon.includes(neter) || pantheon.includes(titleCase),
      inLexicon: lexicon.includes(neter) || lexicon.includes(titleCase),
      inApogee: apogee.includes(neter) || apogee.includes(titleCase),
    };
  });

  const missing = results.filter(
    (r) => !r.inBrains || !r.inPantheon || !r.inLexicon || !r.inApogee,
  );

  if (missing.length === 0) {
    console.log(
      `✓ audit-pantheon-completeness: ${EXPECTED_NETERU.length} Neteru présents dans BRAINS + PANTHEON + LEXICON + APOGEE`,
    );
    process.exit(0);
  }

  console.error(`✗ audit-pantheon-completeness: ${missing.length} Neter incomplet(s)`);
  for (const m of missing) {
    const flags: string[] = [];
    if (!m.inBrains) flags.push("BRAINS");
    if (!m.inPantheon) flags.push("PANTHEON");
    if (!m.inLexicon) flags.push("LEXICON");
    if (!m.inApogee) flags.push("APOGEE");
    console.error(`  ${m.neter} → manquant dans : ${flags.join(", ")}`);
  }
  process.exit(1);
}

main();

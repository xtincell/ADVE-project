/**
 * audit-changelog-coverage.ts
 *
 * Vérifie que tout commit `feat(...)` / `fix(...)` / `refactor(...)` /
 * `chore(deps)` significatif récent (last 10 commits) a une entry
 * correspondante dans CHANGELOG.md.
 *
 * Heuristique : pour chaque commit message structuré, on cherche un mot-clé
 * (scope, sujet) dans CHANGELOG. Si introuvable → finding.
 *
 * Exit code != 0 si finding détecté.
 *
 * Cf. NEFER.md Phase 6.0.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");

const NB_COMMITS = parseInt(process.env.AUDIT_CHANGELOG_LOOKBACK ?? "10", 10);

function read(rel: string): string {
  try {
    return readFileSync(join(ROOT, rel), "utf-8");
  } catch {
    return "";
  }
}

function getRecentCommits(): Array<{ sha: string; subject: string; scope: string | null; type: string | null }> {
  const log = execSync(`git log --pretty=format:"%H|%s" -n ${NB_COMMITS}`, { cwd: ROOT })
    .toString()
    .split("\n")
    .filter(Boolean);
  return log.map((line) => {
    const [sha, ...rest] = line.split("|");
    const subject = rest.join("|");
    const m = subject.match(/^(\w+)(?:\(([^)]+)\))?:/);
    return {
      sha: sha!.slice(0, 7),
      subject,
      type: m?.[1] ?? null,
      scope: m?.[2] ?? null,
    };
  });
}

function isSignificant(commit: { type: string | null; subject: string }): boolean {
  if (!commit.type) return false;
  if (commit.type === "feat") return true;
  if (commit.type === "fix" && !commit.subject.includes("typo")) return true;
  if (commit.type === "refactor") return true;
  if (commit.type === "chore" && commit.subject.includes("deps")) return true;
  return false;
}

function main() {
  const changelog = read("CHANGELOG.md");
  if (!changelog) {
    console.error("✗ CHANGELOG.md not found");
    process.exit(1);
  }

  const commits = getRecentCommits();
  const findings: string[] = [];

  for (const c of commits) {
    if (!isSignificant(c)) continue;
    // Cherche au moins un mot-clé du subject dans le CHANGELOG
    const keywords = [
      c.scope ?? "",
      // Extraire des mots-clés du subject (premiers 3 mots significatifs)
      ...c.subject
        .replace(/^\w+(?:\([^)]+\))?:\s*/, "")
        .split(/[\s,—:]+/)
        .filter((w) => w.length > 4)
        .slice(0, 3),
    ].filter(Boolean);

    const found = keywords.some((kw) => changelog.toLowerCase().includes(kw.toLowerCase()));
    if (!found) {
      findings.push(`${c.sha} ${c.subject}`);
    }
  }

  if (findings.length === 0) {
    console.log(`✓ audit-changelog-coverage: ${commits.length} commits récents, tous présents dans CHANGELOG`);
    process.exit(0);
  }

  console.error(`✗ audit-changelog-coverage: ${findings.length} commit(s) sans entry CHANGELOG`);
  for (const f of findings) console.error(`  ${f}`);
  console.error(`\n→ NEFER Phase 6.0 violation. Ajouter entries dans CHANGELOG.md.`);
  process.exit(1);
}

main();

/**
 * /changelog — auto-generated from git tags + governance commits.
 * Mission contribution: GROUND_INFRASTRUCTURE — credibility surface for
 * paid customers + agency partners + auditors.
 */
import { promises as fs } from "node:fs";
import { join } from "node:path";

interface ChangelogEntry {
  hash: string;
  date: string;
  type: "feat" | "fix" | "docs" | "ci" | "chore" | "other";
  scope: string | null;
  summary: string;
}

async function loadEntries(): Promise<ChangelogEntry[]> {
  // In dev/build we read git via execSync; in serverless prod we read
  // a pre-generated file (scripts/sync-changelog.ts to be added).
  try {
    const child = await import("node:child_process");
    const out = child.execSync(
      "git log --pretty=format:'%h|%ad|%s' --date=short -200",
      { cwd: process.cwd(), encoding: "utf8" },
    );
    return out.split("\n").filter(Boolean).map((line) => {
      const [hash, date, ...rest] = line.split("|");
      const summary = rest.join("|");
      const m = summary.match(/^(feat|fix|docs|ci|chore)\(([^)]+)\)\s*[:\-]\s*(.*)$/i)
        ?? summary.match(/^(feat|fix|docs|ci|chore)\s*[:\-]\s*(.*)$/i);
      const type = (m?.[1]?.toLowerCase() as ChangelogEntry["type"]) ?? "other";
      const scope = m && m.length === 4 ? m[2]! : null;
      const summaryClean = m ? (m.length === 4 ? m[3]! : m[2]!) : summary;
      return { hash: hash!.trim(), date: date!.trim(), type, scope, summary: summaryClean };
    });
  } catch {
    // Fallback: read pre-generated public/changelog.json if present.
    try {
      const raw = await fs.readFile(join(process.cwd(), "public/changelog.json"), "utf8");
      return JSON.parse(raw) as ChangelogEntry[];
    } catch {
      return [];
    }
  }
}

const TYPE_ACCENT: Record<ChangelogEntry["type"], string> = {
  feat: "border-success/60 text-success",
  fix: "border-warning/60 text-warning",
  docs: "border-blue-700/60 text-blue-400",
  ci: "border-purple-700/60 text-purple-400",
  chore: "border-border text-foreground-secondary",
  other: "border-border text-foreground-muted",
};

export const revalidate = 3600; // refresh hourly

export default async function ChangelogPage() {
  const entries = await loadEntries();
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-10">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-warning/80">
          Journal
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">Changelog</h1>
        <p className="mt-3 text-sm text-foreground-secondary">
          Toutes les évolutions de l&apos;OS, par ordre chronologique inverse.
          Mise à jour automatique à chaque déploiement (cron horaire).
        </p>
      </header>

      <ul className="space-y-4">
        {entries.map((e) => (
          <li
            key={e.hash}
            className="rounded-lg border border-border bg-background p-4 transition hover:border-border"
          >
            <div className="mb-1 flex items-center gap-2">
              <span className={"rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase " + TYPE_ACCENT[e.type]}>
                {e.type}
              </span>
              {e.scope && (
                <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-foreground-secondary">
                  {e.scope}
                </span>
              )}
              <span className="ml-auto text-[10px] font-mono text-foreground-muted">{e.date}</span>
              <span className="font-mono text-[10px] text-foreground-muted">{e.hash}</span>
            </div>
            <p className="text-sm text-foreground">{e.summary}</p>
          </li>
        ))}
      </ul>

      {entries.length === 0 && (
        <p className="text-center text-sm text-foreground-muted">
          Aucune entrée disponible. Le changelog est régénéré au build.
        </p>
      )}
    </div>
  );
}

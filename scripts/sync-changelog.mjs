// Run from the checkout before the Docker build: the image deliberately has no Git.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const output = execFileSync(
  "git", ["log", "--pretty=format:%h|%ad|%s", "--date=short", "-200"],
  { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
const entries = output.split("\n").filter(Boolean).map((line) => {
  const [hash, date, ...rest] = line.split("|");
  const summary = rest.join("|");
  const match = summary.match(/^(feat|fix|docs|ci|chore)\(([^)]+)\)\s*[:\-]\s*(.*)$/i)
    ?? summary.match(/^(feat|fix|docs|ci|chore)\s*[:\-]\s*(.*)$/i);
  return {
    hash: hash.trim(), date: date.trim(),
    type: match?.[1]?.toLowerCase() ?? "other",
    scope: match?.length === 4 ? match[2] : null,
    summary: match ? (match.length === 4 ? match[3] : match[2]) : summary,
  };
});
if (entries.length === 0) throw new Error("Cannot build an empty changelog snapshot");
mkdirSync(join(root, "public"), { recursive: true });
writeFileSync(join(root, "public", "changelog.json"), `${JSON.stringify(entries, null, 2)}\n`, "utf8");
console.log(`Changelog snapshot: ${entries.length} available commits, latest ${entries[0].hash}`);

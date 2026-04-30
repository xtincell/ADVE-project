/**
 * stress-test helpers — file walking utility.
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export async function listFiles(dir: string, pattern: RegExp): Promise<string[]> {
  const ROOT = join(__dirname, "..");
  const out: string[] = [];
  function walk(d: string) {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const e of entries) {
      if (e === "node_modules" || e === ".next" || e === ".git") continue;
      const full = join(d, e);
      let s;
      try {
        s = statSync(full);
      } catch {
        continue;
      }
      if (s.isDirectory()) walk(full);
      else if (pattern.test(e)) out.push(relative(ROOT, full));
    }
  }
  walk(join(ROOT, dir));
  return out;
}

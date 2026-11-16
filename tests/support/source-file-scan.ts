import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";

/** Same recursive source scope as grep -r; failures remain test failures. */
export function sourceFilesMatching(root: string, pattern: RegExp, extensions?: readonly string[]): string[] {
  const matches: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && (!extensions || extensions.includes(extname(entry.name)))) {
        pattern.lastIndex = 0;
        if (pattern.test(readFileSync(file, "utf8"))) matches.push(relative(root, file).split(sep).join("/"));
      }
    }
  };
  walk(join(root, "src"));
  return matches.sort();
}

/**
 * site-prober/routes.ts — discover every app-router page route from the
 * filesystem, so the prober tests the *entirety* of the system's routes
 * (present and future) instead of a hand-maintained list.
 *
 * This reads file PATHS only — it never imports app code, so the prober stays
 * black-box and runs even when the app doesn't compile. Best-effort: if
 * `src/app` isn't present (e.g. running the bundled tool elsewhere), it returns
 * an empty list and the explicit seeds in config.ts still apply.
 */

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const PAGE_FILES = new Set(["page.tsx", "page.ts", "page.jsx", "page.js"]);

/**
 * Returns URL pathnames for every `page.*` under `appDir`.
 * - Route groups `(marketing)` and parallel slots `@modal` contribute no URL segment.
 * - `api/` and private `_folders` are skipped.
 * - Dynamic segments `[id]` are kept in the raw output; callers filter them out
 *   for probing (they need real values).
 */
export function discoverAppRoutes(appDir = "src/app"): string[] {
  if (!existsSync(appDir)) return [];
  const routes = new Set<string>();

  const walk = (dir: string, segs: string[]) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const name = entry.name;
        if (name === "api" || name.startsWith("_")) continue;
        const isGroupOrSlot = /^\(.*\)$/.test(name) || name.startsWith("@");
        walk(join(dir, name), isGroupOrSlot ? segs : [...segs, name]);
      } else if (PAGE_FILES.has(entry.name)) {
        const path = segs.length ? "/" + segs.join("/") : "/";
        routes.add(path);
      }
    }
  };

  walk(appDir, []);
  return [...routes].sort();
}

/** Static (non-dynamic) routes only — safe to probe without real param values. */
export function discoverStaticRoutes(appDir = "src/app"): string[] {
  return discoverAppRoutes(appDir).filter((r) => !r.includes("["));
}

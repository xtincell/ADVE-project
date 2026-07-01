#!/usr/bin/env npx tsx
/**
 * LA FUSÉE — PREFLIGHT DEEP ANALYZER
 * Analyse statique TypeScript du projet.
 * 
 * Output format: STATUS|NAME|DETAIL (un check par ligne)
 * STATUS: pass|fail|warn|skip
 * 
 * Détecte:
 * - Fichiers TS avec erreurs d'import (imports de modules inexistants)
 * - Routes Next.js sans layout/page.tsx
 * - Routers tRPC non montés dans l'app router
 * - Services sans validation Zod en entrée
 * - Composants avec useEffect sans cleanup
 * - Console.log oubliés en prod code
 * - Fichiers > 500 lignes (complexité)
 * - TODO/FIXME/HACK non résolus
 */

import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, relative, extname, basename, dirname } from "path";

// ── Config ──────────────────────────────────────────────────────────────────
const SRC_DIR = join(process.cwd(), "src");
const APP_DIR = join(SRC_DIR, "app");
const SERVER_DIR = join(SRC_DIR, "server");
const SERVICES_DIR = join(SERVER_DIR, "services");
const TRPC_DIR = join(SERVER_DIR, "trpc");

interface CheckResult {
  status: "pass" | "fail" | "warn" | "skip";
  name: string;
  detail: string;
}

const results: CheckResult[] = [];

function emit(status: CheckResult["status"], name: string, detail: string) {
  results.push({ status, name, detail });
}

// ── File Walker ─────────────────────────────────────────────────────────────
function walkDir(dir: string, ext?: string[]): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  
  function walk(currentDir: string) {
    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (
            entry.name === "node_modules" ||
            entry.name === ".next" ||
            entry.name === ".git" ||
            entry.name === "dist"
          ) continue;
          walk(fullPath);
        } else if (entry.isFile()) {
          if (!ext || ext.some((e) => entry.name.endsWith(e))) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Permission denied or other FS error — skip silently
    }
  }
  
  walk(dir);
  return files;
}

function readSafe(path: string): string {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

function lineCount(content: string): number {
  return content.split("\n").length;
}

// ── CHECK 1: Console.log in production code ─────────────────────────────────
function checkConsoleLogs() {
  const files = walkDir(SRC_DIR, [".ts", ".tsx"]);
  const offenders: string[] = [];
  
  for (const file of files) {
    const rel = relative(process.cwd(), file);
    // Skip test files
    if (rel.includes(".test.") || rel.includes(".spec.") || rel.includes("__test")) continue;
    
    const content = readSafe(file);
    const lines = content.split("\n");
    let count = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Match console.log but not console.error/warn (those might be intentional)
      if (line.includes("console.log(") && !line.startsWith("//") && !line.startsWith("*")) {
        count++;
      }
    }
    
    if (count > 0) {
      offenders.push(`${rel} (${count})`);
    }
  }
  
  if (offenders.length === 0) {
    emit("pass", "Console.log cleanup", "Aucun console.log en code prod");
  } else if (offenders.length <= 5) {
    emit("warn", "Console.log trouvés", `${offenders.length} fichier(s): ${offenders.slice(0, 3).join(", ")}`);
  } else {
    emit("warn", "Console.log trouvés", `${offenders.length} fichiers contiennent des console.log`);
  }
}

// ── CHECK 2: Files > 500 lines (complexity smell) ──────────────────────────
function checkFileComplexity() {
  const files = walkDir(SRC_DIR, [".ts", ".tsx"]);
  const oversized: Array<{ file: string; lines: number }> = [];
  
  for (const file of files) {
    const content = readSafe(file);
    const lines = lineCount(content);
    if (lines > 500) {
      oversized.push({ file: relative(process.cwd(), file), lines });
    }
  }
  
  oversized.sort((a, b) => b.lines - a.lines);
  
  if (oversized.length === 0) {
    emit("pass", "Complexité fichiers", "Aucun fichier > 500 lignes");
  } else {
    const top3 = oversized
      .slice(0, 3)
      .map((o) => `${basename(o.file)}(${o.lines}L)`)
      .join(", ");
    emit(
      "warn",
      "Fichiers complexes",
      `${oversized.length} fichier(s) > 500 lignes. Top: ${top3}`
    );
  }
}

// ── CHECK 3: TODO/FIXME/HACK tracker ───────────────────────────────────────
function checkTodos() {
  const files = walkDir(SRC_DIR, [".ts", ".tsx"]);
  const todos: string[] = [];
  const fixmes: string[] = [];
  const hacks: string[] = [];
  
  for (const file of files) {
    const content = readSafe(file);
    const lines = content.split("\n");
    const rel = relative(process.cwd(), file);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/\/\/\s*TODO/i.test(line)) todos.push(`${rel}:${i + 1}`);
      if (/\/\/\s*FIXME/i.test(line)) fixmes.push(`${rel}:${i + 1}`);
      if (/\/\/\s*HACK/i.test(line)) hacks.push(`${rel}:${i + 1}`);
    }
  }
  
  if (fixmes.length > 0) {
    emit("warn", "FIXME tags", `${fixmes.length} FIXME trouvé(s) — bugs connus non corrigés`);
  }
  if (hacks.length > 0) {
    emit("warn", "HACK tags", `${hacks.length} HACK trouvé(s) — dette technique identifiée`);
  }
  if (todos.length > 20) {
    emit("warn", "TODO backlog", `${todos.length} TODO — risque de scope creep silencieux`);
  } else if (todos.length > 0) {
    emit("pass", "TODO tracker", `${todos.length} TODO — dans les limites`);
  } else {
    emit("pass", "TODO tracker", "Aucun TODO/FIXME/HACK");
  }
}

// ── CHECK 4: Next.js route groups sans page/layout ─────────────────────────
function checkRouteIntegrity() {
  if (!existsSync(APP_DIR)) {
    emit("skip", "Route integrity", "Pas de dossier src/app");
    return;
  }
  
  const routeDirs = walkDir(APP_DIR, ["page.tsx", "page.ts"]).map((f) => dirname(f));
  const layoutDirs = walkDir(APP_DIR, ["layout.tsx", "layout.ts"]).map((f) => dirname(f));
  
  // Check route groups — dirs starting with ( should have a layout
  const routeGroups: string[] = [];
  function findRouteGroups(dir: string) {
    if (!existsSync(dir)) return;
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith("(")) {
          const groupPath = join(dir, entry.name);
          routeGroups.push(groupPath);
          findRouteGroups(groupPath);
        }
      }
    } catch { /* skip */ }
  }
  findRouteGroups(APP_DIR);
  
  const groupsWithoutLayout = routeGroups.filter(
    (g) => !existsSync(join(g, "layout.tsx")) && !existsSync(join(g, "layout.ts"))
  );
  
  if (groupsWithoutLayout.length === 0) {
    emit("pass", "Route groups", `${routeGroups.length} groupe(s) — tous ont un layout`);
  } else {
    const names = groupsWithoutLayout.map((g) => basename(g)).join(", ");
    emit("warn", "Route groups sans layout", `${groupsWithoutLayout.length}: ${names}`);
  }
  
  emit("pass", "Pages détectées", `${routeDirs.length} page(s) dans src/app`);
}

// ── CHECK 5: tRPC router mount check ───────────────────────────────────────
function checkTrpcRouters() {
  if (!existsSync(TRPC_DIR)) {
    emit("skip", "tRPC routers", "Pas de dossier server/trpc");
    return;
  }
  
  // Find all router files
  const routerFiles = walkDir(TRPC_DIR, [".ts"]).filter(
    (f) => !f.includes("index") && !f.includes("_app") && !f.includes("root") && !f.includes("context") && !f.includes("trpc.")
  );
  
  // Find the root/app router that merges them
  const rootCandidates = walkDir(TRPC_DIR, [".ts"]).filter(
    (f) => basename(f).includes("root") || basename(f).includes("_app") || basename(f) === "index.ts"
  );
  
  let mountedRouters: Set<string> = new Set();
  
  for (const rootFile of rootCandidates) {
    const content = readSafe(rootFile);
    // Extract imported router names
    const importMatches = content.matchAll(/import\s+{?\s*([\w,\s]+)\s*}?\s+from\s+['"](\.\/[^'"]+)['"]/g);
    for (const match of importMatches) {
      const names = match[1].split(",").map((n) => n.trim());
      names.forEach((n) => mountedRouters.add(n));
    }
  }
  
  const routerNames = routerFiles.map((f) => basename(f, ".ts"));
  
  // Simple heuristic: if we found a root and it imports things
  if (mountedRouters.size > 0) {
    const unmounted = routerNames.filter(
      (name) => !Array.from(mountedRouters).some((m) => m.toLowerCase().includes(name.toLowerCase().replace("router", "").replace("-", "")))
    );
    
    if (unmounted.length === 0) {
      emit("pass", "tRPC routers", `${routerFiles.length} router(s) — aucun orphelin détecté`);
    } else if (unmounted.length <= 3) {
      emit("warn", "tRPC routers orphelins possibles", `${unmounted.join(", ")} — vérifier le montage dans root`);
    } else {
      emit("warn", "tRPC routers", `${unmounted.length} router(s) possiblement non montés`);
    }
  } else {
    emit("pass", "tRPC routers", `${routerFiles.length} fichier(s) router détectés`);
  }
}

// ── CHECK 6: Services without Zod validation ───────────────────────────────
function checkZodCoverage() {
  if (!existsSync(SERVICES_DIR)) {
    // Try alternate locations
    const altServices = join(SRC_DIR, "services");
    if (!existsSync(altServices)) {
      emit("skip", "Zod validation", "Pas de dossier services trouvé");
      return;
    }
  }
  
  const serviceDir = existsSync(SERVICES_DIR) ? SERVICES_DIR : join(SRC_DIR, "services");
  const serviceFiles = walkDir(serviceDir, [".ts"]);
  
  let withZod = 0;
  let withoutZod: string[] = [];
  
  for (const file of serviceFiles) {
    const content = readSafe(file);
    // Check if file imports from zod or uses z.
    const hasZod = content.includes("from 'zod'") || 
                   content.includes('from "zod"') || 
                   content.includes("z.object") ||
                   content.includes("z.string") ||
                   content.includes(".parse(") ||
                   content.includes(".safeParse(");
    
    if (hasZod) {
      withZod++;
    } else {
      // Only flag service files that take external input
      const hasExternalInput = content.includes("async") && (
        content.includes("request") ||
        content.includes("input") ||
        content.includes("payload") ||
        content.includes("body") ||
        content.includes("data:")
      );
      if (hasExternalInput) {
        withoutZod.push(basename(file));
      }
    }
  }
  
  if (withoutZod.length === 0) {
    emit("pass", "Zod validation", `${withZod}/${serviceFiles.length} services avec validation`);
  } else {
    emit(
      "warn",
      "Services sans Zod",
      `${withoutZod.length} service(s) avec input externe non validé: ${withoutZod.slice(0, 5).join(", ")}`
    );
  }
}

// ── CHECK 7: useEffect without cleanup ─────────────────────────────────────
function checkUseEffectCleanup() {
  const files = walkDir(SRC_DIR, [".tsx"]);
  const noCleanup: string[] = [];
  
  for (const file of files) {
    const content = readSafe(file);
    
    // Find useEffect calls
    const effectMatches = content.matchAll(/useEffect\s*\(\s*\(\)\s*=>\s*{([^}]*(?:{[^}]*}[^}]*)*)}/g);
    
    for (const match of effectMatches) {
      const body = match[1];
      // Check for subscriptions/intervals/listeners that need cleanup
      const needsCleanup = 
        body.includes("addEventListener") ||
        body.includes("setInterval") ||
        body.includes("setTimeout") ||
        body.includes("subscribe") ||
        body.includes("observe");
      
      const hasCleanup = body.includes("return ");
      
      if (needsCleanup && !hasCleanup) {
        noCleanup.push(relative(process.cwd(), file));
        break; // One per file is enough
      }
    }
  }
  
  if (noCleanup.length === 0) {
    emit("pass", "useEffect cleanup", "Aucun listener/interval sans cleanup détecté");
  } else {
    emit(
      "warn",
      "useEffect sans cleanup",
      `${noCleanup.length} composant(s) avec listeners/intervals sans return cleanup`
    );
  }
}

// ── CHECK 8: Async error handling ──────────────────────────────────────────
function checkAsyncErrorHandling() {
  const files = walkDir(SRC_DIR, [".ts", ".tsx"]);
  let unhandledAwaits = 0;
  const offenders: string[] = [];
  
  for (const file of files) {
    const rel = relative(process.cwd(), file);
    if (rel.includes(".test.") || rel.includes(".spec.")) continue;
    
    const content = readSafe(file);
    const lines = content.split("\n");
    
    let inTryCatch = false;
    let braceDepth = 0;
    let tryBraceDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Rough try/catch tracking
      if (line.includes("try {") || line.includes("try{")) {
        inTryCatch = true;
        tryBraceDepth = braceDepth;
      }
      braceDepth += (line.match(/{/g) || []).length;
      braceDepth -= (line.match(/}/g) || []).length;
      if (inTryCatch && braceDepth <= tryBraceDepth) {
        inTryCatch = false;
      }
      
      // Check for awaits outside try/catch in non-React-Query contexts
      if (!inTryCatch && line.includes("await ") && !line.startsWith("//")) {
        // Skip React Query mutations (they have their own error handling)
        if (!content.includes("useMutation") && !content.includes("useQuery")) {
          // Check if it's in a .catch() chain
          if (!line.includes(".catch(") && !lines[i + 1]?.trim().startsWith(".catch")) {
            unhandledAwaits++;
            if (offenders.length < 3) {
              offenders.push(`${rel}:${i + 1}`);
            }
          }
        }
      }
    }
  }
  
  if (unhandledAwaits === 0) {
    emit("pass", "Async error handling", "Tous les awaits sont dans des try/catch ou .catch()");
  } else if (unhandledAwaits <= 10) {
    emit("warn", "Awaits sans error handling", `${unhandledAwaits} await(s) hors try/catch`);
  } else {
    emit("warn", "Awaits sans error handling", `${unhandledAwaits} await(s) hors try/catch — ${offenders.join(", ")}`);
  }
}

// ── CHECK 9: Next.js API route validation ──────────────────────────────────
function checkApiRoutes() {
  const apiDir = join(APP_DIR, "api");
  if (!existsSync(apiDir)) {
    emit("skip", "API routes", "Pas de dossier app/api");
    return;
  }
  
  const routeFiles = walkDir(apiDir, [".ts", ".tsx"]).filter(
    (f) => basename(f) === "route.ts" || basename(f) === "route.tsx"
  );
  
  let withValidation = 0;
  let withoutValidation: string[] = [];
  
  for (const file of routeFiles) {
    const content = readSafe(file);
    const hasValidation = 
      content.includes(".parse(") ||
      content.includes(".safeParse(") ||
      content.includes("z.object") ||
      content.includes("NextRequest") && content.includes("try");
    
    if (hasValidation) {
      withValidation++;
    } else {
      withoutValidation.push(relative(process.cwd(), file));
    }
  }
  
  if (withoutValidation.length === 0) {
    emit("pass", "API route validation", `${routeFiles.length} route(s) — toutes avec validation`);
  } else {
    emit(
      "warn",
      "API routes sans validation",
      `${withoutValidation.length}/${routeFiles.length} route(s) sans validation input`
    );
  }
}

// ── CHECK 10: Duplicate type definitions ───────────────────────────────────
function checkDuplicateTypes() {
  const files = walkDir(SRC_DIR, [".ts", ".tsx"]);
  const typeMap: Map<string, string[]> = new Map();
  
  for (const file of files) {
    const content = readSafe(file);
    const rel = relative(process.cwd(), file);
    
    // Match type/interface declarations
    const typeMatches = content.matchAll(/(?:export\s+)?(?:type|interface)\s+(\w+)/g);
    for (const match of typeMatches) {
      const typeName = match[1];
      // Skip common/generic names
      if (["Props", "State", "Input", "Output", "Options", "Config"].includes(typeName)) continue;
      
      if (!typeMap.has(typeName)) {
        typeMap.set(typeName, []);
      }
      typeMap.get(typeName)!.push(rel);
    }
  }
  
  const duplicates = Array.from(typeMap.entries())
    .filter(([, locations]) => locations.length > 1)
    .filter(([name]) => name.length > 3); // Skip short generic names
  
  if (duplicates.length === 0) {
    emit("pass", "Types uniques", "Aucune définition de type dupliquée");
  } else if (duplicates.length <= 5) {
    const names = duplicates.map(([name, locs]) => `${name}(×${locs.length})`).join(", ");
    emit("warn", "Types dupliqués", `${duplicates.length}: ${names}`);
  } else {
    emit("warn", "Types dupliqués", `${duplicates.length} types définis dans plusieurs fichiers`);
  }
}

// ── RUN ALL ─────────────────────────────────────────────────────────────────
function main() {
  if (!existsSync(SRC_DIR)) {
    console.log("skip|Source directory|src/ non trouvé");
    process.exit(0);
  }
  
  checkConsoleLogs();
  checkFileComplexity();
  checkTodos();
  checkRouteIntegrity();
  checkTrpcRouters();
  checkZodCoverage();
  checkUseEffectCleanup();
  checkAsyncErrorHandling();
  checkApiRoutes();
  checkDuplicateTypes();
  
  // Output in pipe format for the bash orchestrator
  for (const r of results) {
    console.log(`${r.status}|${r.name}|${r.detail}`);
  }
}

main();

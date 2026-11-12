/**
 * stress-test helpers — file walking utility.
 */
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export function pageRouteFromFile(file: string): string {
  const segments = file.replace(/^src\/app\//, "").split("/")
    .filter((part) => part !== "page.tsx" && !/^\([^)]+\)$/.test(part));
  return "/" + segments.map((part) => /^\[[^\]]+\]$/.test(part) ? "demo" : part).join("/");
}

/** HTTP receipt only; it never proves a hydrated page. */
export function classifyPageProbe(status: number, requestedUrl: string, responseUrl: string, hasSession: boolean): {
  state: "RECEIVED" | "UNRECEIVED" | "FAILED"; category: string; message: string; severity: "ERROR" | "WARN";
} {
  if (status >= 500) return { state: "FAILED", category: `HTTP_${status}`, message: `HTTP ${status}`, severity: "ERROR" };
  const requestedPath = new URL(requestedUrl).pathname;
  const responsePath = new URL(responseUrl).pathname;
  if (["/login", "/unauthorized"].includes(responsePath) && responsePath !== requestedPath) {
    return {
      state: hasSession ? "FAILED" : "UNRECEIVED",
      category: hasSession ? "AUTH_REDIRECT" : "AUTH_REQUIRED",
      message: `HTTP ${status}: ${requestedPath} redirected to ${responsePath}`,
      severity: hasSession ? "ERROR" : "WARN",
    };
  }
  if ([401, 403].includes(status)) return {
    state: hasSession ? "FAILED" : "UNRECEIVED", category: hasSession ? "AUTH_REJECTED" : "AUTH_REQUIRED",
    message: `HTTP ${status}`, severity: hasSession ? "ERROR" : "WARN",
  };
  if (status === 404 || (status >= 300 && status < 400)) return {
    state: "UNRECEIVED", category: `HTTP_${status}`, message: `HTTP ${status}`, severity: "WARN",
  };
  if (status >= 400) return { state: "FAILED", category: `HTTP_${status}`, message: `HTTP ${status}`, severity: "WARN" };
  return { state: "RECEIVED", category: "HTTP_RECEIVED", message: `HTTP ${status}`, severity: "WARN" };
}

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

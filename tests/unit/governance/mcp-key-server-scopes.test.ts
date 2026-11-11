/**
 * F13 — clé MCP limitée à un serveur : l'émission doit offrir exactement les portées
 * que l'authentification honore.
 *
 * Le routage est reçu sur PostgreSQL réel (tests/integration/mcp-server-scoped-key).
 * Restait un écart d'émission : la console des clés tenait sa propre liste en dur,
 * sans `council`, `oracle` ni `ingest` — une clé limitée à l'un de ces serveurs ne
 * pouvait pas être émise, et le routeur acceptait n'importe quelle chaîne (une clé
 * limitée à un serveur inconnu n'appelle rien). La liste est désormais unique.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MCP_KEY_SERVER_SCOPES, MCP_SERVER_NAMES } from "@/server/services/anubis/mcp-scope-kind";
import { loadAllServers } from "@/server/services/anubis/mcp-server";

const ROOT = join(__dirname, "../../..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? routeFiles(path) : name === "route.ts" ? [path] : [];
  });
}

describe("F13 — portées serveur des clés MCP", () => {
  it("chaque serveur demandé par une route MCP/ingestion est une portée émettable", () => {
    const requested = new Set<string>();
    for (const file of routeFiles(join(ROOT, "src/app/api"))) {
      for (const match of readFileSync(file, "utf8").matchAll(/authenticateMcpRequest\(\s*request\s*,\s*"([^"]+)"\s*\)/g)) {
        requested.add(match[1]!);
      }
    }
    expect(requested.size).toBeGreaterThan(5);
    expect([...requested].filter((server) => !(MCP_KEY_SERVER_SCOPES as readonly string[]).includes(server))).toEqual([]);
  });

  it("la liste des serveurs agrégés est celle que le dispatch charge", async () => {
    const loaded = (await loadAllServers()).map((s) => s.serverName).sort();
    expect(loaded).toEqual([...MCP_SERVER_NAMES].sort());
  });

  it("la console et le routeur d'émission utilisent la liste partagée, sans liste en dur", () => {
    const page = read("src/app/(console)/console/anubis/api-billing/page.tsx");
    expect(page).toMatch(/import \{ MCP_KEY_SERVER_SCOPES \} from "@\/server\/services\/anubis\/mcp-scope-kind"/);
    expect(page).not.toMatch(/"advertis-inbound",\s*\n\s*"artemis"/);
    const router = read("src/server/trpc/routers/mcp-billing.ts");
    expect(router).toMatch(/server:\s*z\.enum\(MCP_KEY_SERVER_SCOPES\)/);
  });
});

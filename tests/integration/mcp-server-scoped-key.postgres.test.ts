/** Run only against a disposable database with migrations applied (local receipt cluster or CI container).
 *
 * F13 — résiduel de la recette 419 (RESIDUAL-DEBT §Transport MCP et clé limitée à un
 * serveur) : une clé active `server=advertis` recevait 401 sur `/api/mcp/rpc` dès
 * `tools/list`, parce que l'agrégat authentifiait avec « * » sans reconnaître une clé
 * dont la portée stockée est un serveur précis. Ici, base PostgreSQL réelle, clé émise
 * par l'écrivain existant (`createApiKey`, hash seul en base), vraies routes HTTP :
 * transport JSON-RPC `/api/mcp/rpc`, agrégat REST `/api/mcp`, routes dédiées
 * `/api/mcp/advertis` et `/api/mcp/oracle`. Seule la session est neutralisée (aucune).
 *
 * Contrat reçu : la clé limitée appelle les outils de SON serveur (direct et générique),
 * et seulement eux ; un autre serveur est refusé avant tout dispatch, la portée marque
 * reste appliquée, et le journal de facturation compte OK/DENIED comme une clé « * ».
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("next-auth", () => ({}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/server/governance/event-bus", () => ({ eventBus: { publish: vi.fn() } }));
import { db } from "@/lib/db";
import { createApiKey, getCurrentUsage } from "@/server/services/anubis/mcp-billing";
import { POST as rpcPost } from "@/app/api/mcp/rpc/route";
import { GET as aggregateGet, POST as aggregatePost } from "@/app/api/mcp/route";
import { POST as advertisPost } from "@/app/api/mcp/advertis/route";
import { POST as oraclePost } from "@/app/api/mcp/oracle/route";

let userId: string, brandId: string, otherBrandId: string;
let serverKeyId: string, serverKey: string, wildcardKeyId: string, wildcardKey: string;
const keyIds: string[] = [];

type RpcReply = { result?: { isError?: boolean; content?: Array<{ text: string }>; tools?: Array<{ name: string }> }; error?: { message: string } };

async function rpc(apiKey: string, method: string, params: Record<string, unknown> = {}) {
  const response = await rpcPost(new Request("http://localhost/api/mcp/rpc", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", "x-api-key": apiKey },
    body: JSON.stringify({ jsonrpc: "2.0", id: randomUUID(), method, params }),
  }));
  const body = response.status === 200 ? await response.json() as RpcReply : null;
  return { status: response.status, body };
}

const rest = (handler: (r: Request) => Promise<Response>, path: string, apiKey: string, body: unknown) =>
  handler(new Request(`http://localhost${path}`, {
    method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey }, body: JSON.stringify(body),
  }));

/** Le journal est best effort (fire-and-forget) : on attend sa ligne au lieu de dormir. */
async function callsOf(apiKeyId: string, expected: number) {
  for (let i = 0; i < 50; i++) {
    const rows = await db.mcpApiCall.findMany({ where: { apiKeyId }, orderBy: { createdAt: "asc" } });
    if (rows.length >= expected) return rows.map(({ server, tool, status }) => ({ server, tool, status }));
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return (await db.mcpApiCall.findMany({ where: { apiKeyId }, orderBy: { createdAt: "asc" } }))
    .map(({ server, tool, status }) => ({ server, tool, status }));
}

beforeAll(async () => {
  // Owned disposable targets only: the local receipt cluster on 55439, or the
  // pinned container that this repository's CI job starts on 5432.
  const url = new URL(process.env.DATABASE_URL!);
  expect(url.hostname).toBe("127.0.0.1"); expect(url.pathname).toBe("/shinkiro_verify");
  const ownedCI = process.env.GITHUB_ACTIONS === "true" && process.env.GITHUB_REPOSITORY === "xtincell/ADVE-project";
  expect(url.port).toBe(ownedCI ? "5432" : "55439");
  userId = (await db.user.create({ data: { name: "Titulaire de clé — recette F13", email: `f13-${randomUUID()}@example.invalid` } })).id;
  brandId = (await db.strategy.create({ data: { name: `Marque fictive F13 ${randomUUID().slice(0, 8)}`, userId } })).id;
  otherBrandId = (await db.strategy.create({ data: { name: `Autre marque fictive F13 ${randomUUID().slice(0, 8)}`, userId } })).id;
  const limited = await createApiKey({ name: "Clé limitée au serveur advertis — F13", server: "advertis", scopeKind: "BRAND", scopeStrategyId: brandId });
  const wildcard = await createApiKey({ name: "Clé tous serveurs — F13", server: "*", scopeKind: "BRAND", scopeStrategyId: brandId });
  serverKeyId = limited.id; serverKey = limited.plaintextKey; wildcardKeyId = wildcard.id; wildcardKey = wildcard.plaintextKey;
  keyIds.push(serverKeyId, wildcardKeyId);
});

beforeEach(async () => {
  // Laisse aboutir un journal best effort d'un cas précédent avant de repartir de zéro.
  await new Promise((resolve) => setTimeout(resolve, 100));
  await db.mcpApiCall.deleteMany({ where: { apiKeyId: { in: keyIds } } });
  // Aucun outil exercé ici n'a de raison de sortir sur le réseau.
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("EXTERNAL_NETWORK_FORBIDDEN_IN_FIXTURE"));
});

afterAll(async () => {
  vi.restoreAllMocks();
  if (keyIds.length) {
    await db.mcpApiCall.deleteMany({ where: { apiKeyId: { in: keyIds } } });
    await db.mcpApiKey.deleteMany({ where: { id: { in: keyIds } } });
  }
  await db.strategy.deleteMany({ where: { id: { in: [brandId, otherBrandId].filter(Boolean) } } });
  if (userId) await db.user.deleteMany({ where: { id: userId } });
});

describe("F13 — clé MCP limitée à un serveur, sur les vrais transports", () => {
  it("le transport JSON-RPC la reconnaît et ne découvre que les outils de son serveur", async () => {
    const listed = await rpc(serverKey, "tools/list");
    expect(listed.status).toBe(200);
    const names = listed.body?.result?.tools?.map((t) => t.name) ?? [];
    expect(names).toEqual(expect.arrayContaining(["advertis_listStrategies", "advertis_getBrandCard", "lafusee_catalog", "lafusee_invoke"]));
    expect(names.filter((n) => !n.startsWith("advertis_") && !n.startsWith("lafusee_"))).toEqual([]);

    const catalog = await rpc(serverKey, "tools/call", { name: "lafusee_catalog", arguments: {} });
    const manifest = JSON.parse(catalog.body?.result?.content?.[0]?.text ?? "{}") as { servers?: Array<{ name: string }> };
    expect(manifest.servers?.map((s) => s.name)).toEqual(["advertis"]);
    expect(await callsOf(serverKeyId, 0)).toEqual([]); // la découverte n'est pas facturée
  });

  it("elle appelle un outil de son serveur, en direct et par l'outil générique, dans sa marque", async () => {
    const direct = await rpc(serverKey, "tools/call", { name: "advertis_listStrategies", arguments: {} });
    expect(direct.status).toBe(200);
    expect(direct.body?.result?.isError).not.toBe(true);
    const listedBrands = JSON.parse(direct.body?.result?.content?.[0]?.text ?? "{}") as { strategies?: Array<{ strategyId: string }> };
    expect(listedBrands.strategies?.map((s) => s.strategyId)).toEqual([brandId]);

    const generic = await rpc(serverKey, "tools/call", { name: "lafusee_invoke", arguments: { server: "advertis", tool: "listStrategies", params: {} } });
    expect(generic.body?.result?.isError).not.toBe(true);
    expect(await callsOf(serverKeyId, 2)).toEqual([
      { server: "advertis", tool: "listStrategies", status: "OK" },
      { server: "advertis", tool: "listStrategies", status: "OK" },
    ]);
    expect(await getCurrentUsage(serverKeyId)).toMatchObject({ callCount: 2, billableCalls: 0 });
  });

  it("un autre serveur reste refusé avant tout dispatch, et le refus est journalisé DENIED", async () => {
    const generic = await rpc(serverKey, "tools/call", { name: "lafusee_invoke", arguments: { server: "oracle", tool: "list_sections", params: { strategyId: brandId } } });
    expect(generic.body?.result?.isError).toBe(true);
    expect(generic.body?.result?.content?.[0]?.text).toContain("SCOPE_DENIED");
    // L'outil curé d'un autre serveur n'est même pas enregistré pour cette clé.
    const direct = await rpc(serverKey, "tools/call", { name: "oracle_list_sections", arguments: { strategyId: brandId } });
    expect(direct.body?.result?.isError ?? Boolean(direct.body?.error)).toBe(true);
    expect(await callsOf(serverKeyId, 1)).toEqual([{ server: "oracle", tool: "list_sections", status: "DENIED" }]);
    expect(await getCurrentUsage(serverKeyId)).toMatchObject({ callCount: 0, billableCalls: 0 });
  });

  it("la portée marque reste appliquée sur son propre serveur", async () => {
    const reply = await rpc(serverKey, "tools/call", { name: "advertis_getBrandCard", arguments: { strategyId: otherBrandId } });
    expect(reply.body?.result?.isError).toBe(true);
    expect(reply.body?.result?.content?.[0]?.text).toContain("SCOPE_DENIED");
    expect(await callsOf(serverKeyId, 1)).toEqual([{ server: "advertis", tool: "getBrandCard", status: "DENIED" }]);
  });

  it("les routes REST gardent la même frontière : son serveur 200, un autre serveur 401", async () => {
    const manifest = await aggregateGet(new Request("http://localhost/api/mcp", { headers: { "x-api-key": serverKey } }));
    expect(manifest.status).toBe(200);
    expect(((await manifest.json()) as { servers: Array<{ name: string }> }).servers.map((s) => s.name)).toEqual(["advertis"]);

    expect((await rest(aggregatePost, "/api/mcp", serverKey, { server: "advertis", tool: "listStrategies", params: {} })).status).toBe(200);
    expect((await rest(advertisPost, "/api/mcp/advertis", serverKey, { tool: "listStrategies", params: {} })).status).toBe(200);
    expect((await rest(aggregatePost, "/api/mcp", serverKey, { server: "oracle", tool: "list_sections", params: { strategyId: brandId } })).status).toBe(401);
    expect((await rest(oraclePost, "/api/mcp/oracle", serverKey, { tool: "list_sections", params: { strategyId: brandId } })).status).toBe(401);
    expect(await callsOf(serverKeyId, 2)).toEqual([
      { server: "advertis", tool: "listStrategies", status: "OK" },
      { server: "advertis", tool: "listStrategies", status: "OK" },
    ]);
  });

  it("une clé tous serveurs garde son accès à l'agrégat (non-régression)", async () => {
    const listed = await rpc(wildcardKey, "tools/list");
    expect(listed.status).toBe(200);
    expect(listed.body?.result?.tools?.map((t) => t.name)).toEqual(expect.arrayContaining(["advertis_listStrategies", "oracle_list_sections", "council_ask"]));
    const reply = await rpc(wildcardKey, "tools/call", { name: "advertis_listStrategies", arguments: {} });
    expect(reply.body?.result?.isError).not.toBe(true);
    expect(await callsOf(wildcardKeyId, 1)).toEqual([{ server: "advertis", tool: "listStrategies", status: "OK" }]);
  });

  it("une clé limitée désactivée ou d'un serveur inconnu ne passe pas l'agrégat", async () => {
    await db.mcpApiKey.update({ where: { id: serverKeyId }, data: { isActive: false } });
    try {
      expect((await rpc(serverKey, "tools/list")).status).toBe(401);
    } finally {
      await db.mcpApiKey.update({ where: { id: serverKeyId }, data: { isActive: true } });
    }
    const unknown = await createApiKey({ name: "Clé d'un serveur inexistant — F13", server: "inexistant", scopeKind: "BRAND", scopeStrategyId: brandId });
    keyIds.push(unknown.id);
    const listed = await rpc(unknown.plaintextKey, "tools/list");
    expect(listed.body?.result?.tools?.map((t) => t.name).filter((n) => !n.startsWith("lafusee_"))).toEqual([]);
    const invoked = await rpc(unknown.plaintextKey, "tools/call", { name: "lafusee_invoke", arguments: { server: "advertis", tool: "listStrategies", params: {} } });
    expect(invoked.body?.result?.isError).toBe(true);
    expect(await callsOf(unknown.id, 1)).toEqual([{ server: "advertis", tool: "listStrategies", status: "DENIED" }]);
  });
});

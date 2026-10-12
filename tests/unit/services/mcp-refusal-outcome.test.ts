/** Real REST envelopes and SDK tools/list + tools/call; DB/auth fixtures only. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { z } from "zod";

const fixtures = vi.hoisted(() => ({
  calls: [] as Array<Record<string, unknown>>,
  keyHash: "",
  dispatch: vi.fn(),
  key: { id: "mcp-key-fixture", server: "*", isActive: true, expiresAt: null,
    ratePerCallUsd: 0.002, includedMonthlyCalls: 0, scopeKind: "BRAND", scopeStrategyId: "brand-fixture" },
}));
vi.mock("@/lib/auth/config", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/db", () => ({ db: {
  mcpApiKey: {
    findUnique: vi.fn(async ({ where }: { where: { keyHash: string } }) =>
      where.keyHash === fixtures.keyHash ? fixtures.key : null),
    findUniqueOrThrow: vi.fn(async () => fixtures.key),
    update: vi.fn(async () => fixtures.key),
  },
  mcpApiCall: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      fixtures.calls.push(data); return data;
    }),
    count: vi.fn(async ({ where }: { where: { status: { in: string[] } } }) =>
      fixtures.calls.filter(row => where.status.in.includes(String(row.status))).length),
  },
} }));
vi.mock("@/server/services/anubis/mcp-server", () => ({
  dispatchTool: fixtures.dispatch,
  loadAllServers: vi.fn(async () => [{ serverName: "council", tools: [{
    name: "ask", description: "Fixture council tool",
    inputSchema: z.object({ strategyId: z.string(), question: z.string() }),
  }] }]),
  buildAggregatedManifest: vi.fn(async () => ({ servers: ["council"] })),
}));

import { authenticateMcpRequest, getCurrentUsage, meterAndRun, meterMcp } from "@/server/services/anubis/mcp-billing";
import { handleMcpRequest } from "@/server/services/anubis/mcp-transport";

const fixtureKey = "local-mcp-refusal-fixture-only";
const authRequest = () => new Request("http://localhost/api/mcp/rpc", {
  headers: { "x-api-key": fixtureKey },
});
const gate = async () => {
  const authenticated = await authenticateMcpRequest(authRequest(), "*");
  expect(authenticated.ok).toBe(true);
  return authenticated;
};
const rpc = async (method: string, params: Record<string, unknown>) => {
  const response = await handleMcpRequest(new Request("http://localhost/api/mcp/rpc", {
    method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  }), await gate());
  expect(response.status).toBe(200);
  return await response.json() as { result: { isError?: boolean; content: Array<{ text: string }>; tools?: Array<{ name: string }> } };
};
const invoke = (generic: boolean, strategyId = "brand-fixture") => generic
  ? rpc("tools/call", { name: "lafusee_invoke", arguments: {
    server: "council", tool: "ask", params: { strategyId, question: "Question de fixture" },
  } })
  : rpc("tools/call", { name: "council_ask", arguments: { strategyId, question: "Question de fixture" } });

beforeEach(() => {
  vi.clearAllMocks(); fixtures.calls.length = 0;
  fixtures.key.server = "*";
  fixtures.keyHash = createHash("sha256").update(fixtureKey).digest("hex");
  fixtures.dispatch.mockResolvedValue({ answer: "fixture" });
});

describe("MCP returned refusals are outcomes, not successes", () => {
  it("a server-restricted key is usable for discovery without losing its restriction", async () => {
    fixtures.key.server = "council";
    const authenticated = await gate();
    expect(authenticated).toMatchObject({ scopeServer: "council", scopeKind: "BRAND", scopeStrategyId: "brand-fixture" });
    const reply = await invoke(false);
    expect(reply.result.isError).not.toBe(true);
    expect(fixtures.dispatch).toHaveBeenCalledTimes(1);
  });

  it("server-restricted generic invocation cannot call another server", async () => {
    fixtures.key.server = "council";
    const reply = await rpc("tools/call", { name: "lafusee_invoke", arguments: {
      server: "advertis", tool: "getBrandCard", params: { strategyId: "brand-fixture" },
    } });
    expect(reply.result.isError).toBe(true);
    expect(reply.result.content[0]?.text).toContain("SCOPE_DENIED");
    expect(fixtures.dispatch).not.toHaveBeenCalled();
    expect(fixtures.calls).toHaveLength(1);
    expect(fixtures.calls[0]).toMatchObject({ server: "advertis", tool: "getBrandCard", status: "DENIED" });
  });

  it("lists the real registered SDK tools before invocation", async () => {
    const reply = await rpc("tools/list", {});
    expect(reply.result.tools?.map(tool => tool.name)).toEqual(expect.arrayContaining(["council_ask", "lafusee_invoke"]));
    expect(fixtures.calls).toHaveLength(0);
  });

  it.each(["TIER_GATE_DENIED", "RATE_LIMITED", "NOT_FOUND"])("REST preserves %s but meters ERROR", async code => {
    const result = { error: `${code}: fixture refusal`, version: 8, sourceIds: ["source-fixture"] };
    const response = await meterAndRun(await gate(), "council", "ask", async () => result);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ result });
    expect(fixtures.calls).toHaveLength(1);
    expect(fixtures.calls[0]).toMatchObject({ apiKeyId: fixtures.key.id, server: "council", tool: "ask", status: "ERROR" });
    // Existing tariff policy remains OK + ERROR: this patch does not waive calls.
    expect(await getCurrentUsage(fixtures.key.id)).toMatchObject({ callCount: 1, billableCalls: 1, costUsd: 0.002 });
  });

  it.each([false, true])("SDK explicit refusal isError, generic=%s", async generic => {
    const result = { error: "RATE_LIMITED: fixture refusal", confidence: null, version: 8, sourceIds: ["source-fixture"] };
    fixtures.dispatch.mockResolvedValue(result);
    const reply = await invoke(generic);
    expect(reply.result.isError).toBe(true);
    expect(JSON.parse(reply.result.content[0]?.text ?? "")).toEqual(result);
    expect(fixtures.calls).toHaveLength(1);
    expect(fixtures.calls[0]?.status).toBe("ERROR");
    expect(fixtures.dispatch).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])("SDK cross-brand scope refusal is traced once, generic=%s", async generic => {
    const reply = await invoke(generic, "other-brand-fixture");
    expect(reply.result.isError).toBe(true);
    expect(reply.result.content[0]?.text).toContain("SCOPE_DENIED");
    expect(fixtures.dispatch).not.toHaveBeenCalled();
    expect(fixtures.calls).toHaveLength(1);
    expect(fixtures.calls[0]).toMatchObject({ apiKeyId: fixtures.key.id, server: "council", tool: "ask", status: "DENIED" });
    expect(await getCurrentUsage(fixtures.key.id)).toMatchObject({ callCount: 0, billableCalls: 0, costUsd: 0 });
  });

  it.each([false, true])("successful values and authenticated scope stay intact, generic=%s", async generic => {
    const result = { status: "DEFERRED", version: 8, confidence: null, sourceIds: ["source-fixture"], nested: { error: "diagnostic, not top-level failure" } };
    fixtures.dispatch.mockResolvedValue(result);
    const reply = await invoke(generic);
    expect(reply.result.isError).not.toBe(true);
    expect(JSON.parse(reply.result.content[0]?.text ?? "")).toEqual(result);
    expect(fixtures.dispatch).toHaveBeenCalledWith("council", "ask", expect.objectContaining({
      strategyId: "brand-fixture", __auth: { apiKeyId: fixtures.key.id, userId: null,
        scopeKind: "BRAND", scopeStrategyId: "brand-fixture" },
    }));
    expect(fixtures.calls).toHaveLength(1);
    expect(fixtures.calls[0]?.status).toBe("OK");
  });

  it("explicit ok:false is not recorded as successful completion", async () => {
    const result = { ok: false, detail: "fixture" };
    expect(await meterMcp(await gate(), "advertis", "amendPillar", async () => result)).toBe(result);
    expect(fixtures.calls[0]?.status).toBe("ERROR");
  });

  it("thrown failure remains the same error and is metered once", async () => {
    const error = new Error("fixture exception");
    await expect(meterMcp(await gate(), "council", "ask", async () => { throw error; })).rejects.toBe(error);
    expect(fixtures.calls).toHaveLength(1);
    expect(fixtures.calls[0]?.status).toBe("ERROR");
  });

  it.each([null, "answer", [], { error: "" }, { ok: true }, { count: 0 }])("valid/empty result is kept: %j", async result => {
    expect(await meterMcp(await gate(), "advertis", "getBrandCard", async () => result)).toBe(result);
    expect(fixtures.calls[0]?.status).toBe("OK");
  });
});

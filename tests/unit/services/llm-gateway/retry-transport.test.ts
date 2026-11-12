import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: { modelPolicy: { findUnique: vi.fn(async () => null) } } }));
vi.mock("@/server/services/llm-gateway/headroom", () => ({
  applyHeadroom: vi.fn(async (system: string, prompt: string) => ({ system, prompt, applied: false })),
}));
vi.mock("@/server/services/llm-gateway/rate-policy", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/server/services/llm-gateway/rate-policy")>(),
  acquireSlot: vi.fn(async () => "fixture"), releaseSlot: vi.fn(),
}));

import { callLLM, _getProviderStateForTest, _resetProvidersForTest } from "@/server/services/llm-gateway";
import { streamChatText } from "@/server/services/llm-gateway/streaming";

// Real SDK and loopback HTTP; no model, credentials, brand or live database.
let status = 400;
let requests = 0;
let baseURL = "";
const server = createServer((req, res) => {
  requests++;
  req.resume();
  res.writeHead(status, { "content-type": "application/json", "retry-after-ms": "0" });
  res.end(JSON.stringify({ error: { message: "Request refused", type: "fixture_refusal" } }));
});

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
});
afterAll(async () => { await new Promise<void>((resolve) => server.close(() => resolve())); });
beforeEach(() => {
  requests = 0;
  vi.stubEnv("OPENAI_TEXT_RELAY_URL", baseURL);
  vi.stubEnv("OPENAI_TEXT_RELAY_TOKEN", "loopback-fixture-only");
  vi.stubEnv("LLM_PRIMARY_PROVIDER", "openai");
  _resetProvidersForTest({ openai: { available: true }, anthropic: { available: false },
    ollama: { available: false }, openrouter: { available: false } });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); _resetProvidersForTest(); });

describe("existing Gateway owns transport retries", () => {
  it.each([400, 401, 403, 429])("sends only one actual HTTP request for %i", async (code) => {
    status = code;
    const error = await callLLM({ system: "Fixture", prompt: "Refusal only", caller: "fixture" })
      .then(() => null, (failure: unknown) => failure);
    expect(requests).toBe(1);
    expect(error).toMatchObject({ statusCode: code });
    expect(_getProviderStateForTest("openai").failureCount).toBe(1);
  }, 10_000);

  it("bounds HTTP 503 to three requests rather than multiplying SDK and Gateway retries", async () => {
    status = 503;
    const error = await callLLM({ system: "Fixture", prompt: "Refusal only", caller: "fixture" })
      .then(() => null, (failure: unknown) => failure);
    expect(requests).toBe(3);
    expect(error).toMatchObject({ statusCode: 503 });
    expect(_getProviderStateForTest("openai").failureCount).toBe(1);
  }, 10_000);

  it.each([400, 401, 403, 429, 503])("streaming sends one HTTP %i refusal before its existing fallback", async (code) => {
    status = code;
    const error = await streamChatText({ system: "Fixture", caller: "fixture",
      messages: [{ role: "user", content: "Refusal only" }],
    }).then(() => null, (failure: unknown) => failure);
    expect(requests).toBe(1);
    // The existing text-stream probe may expose an empty-stream refusal
    // instead of the SDK status; this receipt covers attempts, not that copy.
    expect(error).toBeInstanceOf(Error);
    expect(_getProviderStateForTest("openai").failureCount).toBe(1);
  }, 10_000);
});

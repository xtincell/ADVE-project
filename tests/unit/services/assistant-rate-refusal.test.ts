import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), access: vi.fn(), council: vi.fn(), createMessages: vi.fn(), budget: vi.fn(),
}));
vi.mock("@/lib/auth/config", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: {
  assistantThread: { findFirst: vi.fn(async () => ({ id: "thread" })), update: vi.fn() },
  assistantMessage: { findMany: vi.fn(async () => []), createMany: mocks.createMessages },
} }));
vi.mock("@/server/services/operator-isolation", () => ({
  getOperatorContext: vi.fn(async () => ({ userId: "operator" })), canAccessStrategy: mocks.access,
}));
vi.mock("@/server/services/llm-gateway", () => ({ isTextLLMAvailable: () => true }));
vi.mock("@/server/services/mestor/council", () => ({ askCouncilStream: mocks.council }));
vi.mock("@/server/services/mestor/council/rate-limit", () => ({ consumeAssistantBudget: mocks.budget }));

import { POST } from "@/app/api/chat/route";
import { LlmRateWaitExceededError } from "@/server/services/llm-gateway/rate-policy";

const request = () => new Request("http://localhost/api/chat", { method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ strategyId: "brand", message: "Quelle prochaine action ?" }),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "operator" } });
  mocks.access.mockResolvedValue(true); mocks.budget.mockResolvedValue(true);
  mocks.council.mockRejectedValue(new LlmRateWaitExceededError("gpt-5.6-luna"));
});

describe("assistant queue refusal before first byte", () => {
  it("returns the existing retryable 429 without persisting a fictitious answer", async () => {
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "RATE_LIMITED" });
    expect(mocks.createMessages).not.toHaveBeenCalled();
    expect(mocks.council).toHaveBeenCalledOnce();
  });
  it("keeps cross-brand denial before queue or provider work", async () => {
    mocks.access.mockResolvedValue(false);
    expect((await POST(request())).status).toBe(403);
    expect(mocks.council).not.toHaveBeenCalled(); expect(mocks.budget).not.toHaveBeenCalled();
  });
});

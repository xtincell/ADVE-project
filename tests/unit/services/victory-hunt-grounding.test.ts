import { beforeEach, describe, expect, it, vi } from "vitest";
const port = vi.hoisted(() => ({ search: vi.fn(), model: vi.fn(), create: vi.fn() }));
vi.mock("@/server/services/llm-gateway", () => ({ isTextLLMAvailable: () => true }));
vi.mock("@/server/services/utils/llm-structured", () => ({ executeStructuredLLMCall: port.model }));
vi.mock("@/server/services/seshat/web-search", () => ({ braveWebSearch: port.search, formatWebHits: () => "Owned web result" }));
vi.mock("@/server/services/seshat/scoreur/candidates", () => ({ createCandidates: port.create }));
import { huntVictories } from "@/server/services/seshat/argos/victory-hunt";
const input = { subjectStrategyId: "owned-subject", subjectName: "Owned brand", rivalName: "Owned rival" };
beforeEach(() => {
  vi.clearAllMocks();
  port.create.mockResolvedValue({ created: 1, pending: 1, autoRejected: 0 });
  port.model.mockResolvedValue({ data: { victories: [{ arena: "D", rivalName: "Owned rival", proposedResult: "WIN", claim: "Synthetic comparison", sourceUrl: "https://example.invalid/unverified" }] } });
});
describe("optional victory research does not manufacture grounding", () => {
  it.each(["DEFERRED", "OK"])("does not spend a model call or create candidates when %s search has no real hit", async status => {
    port.search.mockResolvedValue({ status, hits: [] });
    expect(await huntVictories(input)).toEqual({ deferred: true, candidates: 0, pending: 0, autoRejected: 0 });
    expect(port.model).not.toHaveBeenCalled(); expect(port.create).not.toHaveBeenCalled();
  });
  it("keeps only a URL actually returned by search, then still uses quarantine", async () => {
    port.search.mockResolvedValue({ status: "OK", hits: [{ url: "https://example.invalid/real-result", title: "Owned source" }] });
    await huntVictories(input);
    expect(port.create.mock.calls[0]?.[1][0]).toMatchObject({ sourceUrl: null });
  });
});

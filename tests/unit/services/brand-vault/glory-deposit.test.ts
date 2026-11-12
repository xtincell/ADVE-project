import { beforeEach, describe, expect, it, vi } from "vitest";
import { depositInBrandVault, recordVaultDepositFailure } from "@/server/services/brand-vault/glory-deposit";
import { getGloryTool } from "@/server/services/artemis/tools/registry";

const m = vi.hoisted(() => ({ source: vi.fn(), existing: vi.fn(), count: vi.fn(), update: vi.fn(), strategy: vi.fn(), create: vi.fn(), batch: vi.fn(), lock: vi.fn(), campaign: vi.fn(), brief: vi.fn(), tx: {} as Record<string, unknown> }));
vi.mock("@/lib/db", () => ({ db: { $transaction: async (run: (tx: unknown) => unknown) => run(m.tx) } }));
vi.mock("@/server/services/brand-vault/engine", () => ({ kindFromFormat: () => "GENERIC", createBrandAsset: m.create, createCandidateBatch: m.batch }));
const tool = getGloryTool("wordplay-cultural-bank")!;
const args = { tool, toolOutput: { maliciousReplacement: "Must not replace source" }, gloryOutputId: "out", gloryIntentId: "generation-intent", strategyId: "spawt", context: {} };
let saved: { id: string; toolSlug: string; executionId: string; output: Record<string, unknown> };
beforeEach(() => {
  vi.clearAllMocks();
  saved = { id: "out", toolSlug: tool.slug, executionId: "run", output: { culture: "Voix conservée", _meta: { model: "luna-received", provider: "openai-codex" } } };
  m.source.mockImplementation(async () => saved);
  m.existing.mockResolvedValue([]); m.count.mockResolvedValue(0);
  m.strategy.mockResolvedValue({ operatorId: "operator" }); m.create.mockResolvedValue({ id: "asset" });
  m.batch.mockResolvedValue({ candidates: [{ id: "a" }, { id: "b" }] });
  m.update.mockImplementation(async ({ data }: { data: { output: typeof saved.output } }) => { saved.output = data.output; return saved; });
  m.tx = { $queryRaw: m.lock, gloryOutput: { findFirst: m.source, update: m.update }, brandAsset: { findMany: m.existing, count: m.count }, strategy: { findUnique: m.strategy }, campaign: { findFirst: m.campaign }, campaignBrief: { findFirst: m.brief } };
});
describe("Mestor DAM deposits", () => {
  it("retains generic cultural content from the stored source as a draft, with provenance", async () => {
    expect(await depositInBrandVault(args)).toEqual(["asset"]);
    expect(m.lock).toHaveBeenCalledOnce();
    expect(m.source).toHaveBeenCalledWith({ where: { id: "out", strategyId: "spawt" } });
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ content: expect.objectContaining({ culture: "Voix conservée" }), state: "DRAFT", sourceGloryOutputId: "out", sourceIntentId: "generation-intent", sourceExecutionId: "run", kind: "GENERIC" }), m.tx);
    expect(m.create.mock.calls[0]![0].content).not.toHaveProperty("maliciousReplacement");
    expect(saved.output._vaultDeposit).toMatchObject({ status: "STORED", assetIds: ["asset"] });
  });
  it("reuses existing editions, even archived ones, without generating or activating", async () => {
    m.existing.mockResolvedValue([{ id: "old-edition" }]);
    expect(await depositInBrandVault({ ...args, recoveryIntentId: "retry" })).toEqual(["old-edition"]);
    expect(m.create).not.toHaveBeenCalled(); expect(m.batch).not.toHaveBeenCalled();
    expect(saved.output._vaultDeposit).toMatchObject({ status: "STORED", recoveryIntentId: "retry" });
  });
  it("creates a candidate batch in the same source transaction", async () => {
    saved.output = { concepts: [{ title: "Une voix" }, { title: "Un lieu" }] };
    expect(await depositInBrandVault(args)).toEqual(["a", "b"]);
    expect(m.batch).toHaveBeenCalledWith(expect.objectContaining({ candidates: expect.arrayContaining([expect.objectContaining({ name: "Une voix" })]) }), m.tx);
    expect(m.create).not.toHaveBeenCalled();
  });
  it("does not convert a failed generation into an asset", async () => {
    saved.output = { status: "FAILED", errorMessage: "provider unavailable" };
    await expect(depositInBrandVault(args)).rejects.toThrow("VAULT_SOURCE_UNUSABLE");
    expect(m.create).not.toHaveBeenCalled();
  });
  it("rejects mismatched source, tool or absent brand operator", async () => {
    m.source.mockResolvedValueOnce(null);
    await expect(depositInBrandVault(args)).rejects.toThrow("VAULT_SOURCE_MISMATCH");
    saved.toolSlug = "another-tool";
    await expect(depositInBrandVault(args)).rejects.toThrow("VAULT_SOURCE_MISMATCH");
    saved.toolSlug = tool.slug; m.strategy.mockResolvedValue(null);
    await expect(depositInBrandVault(args)).rejects.toThrow("VAULT_OPERATOR_REQUIRED");
  });
  it("refuses attaching output to another brand's campaign or brief", async () => {
    m.campaign.mockResolvedValue(null);
    await expect(depositInBrandVault({ ...args, context: { _campaignId: "foreign" } })).rejects.toThrow("VAULT_CAMPAIGN_MISMATCH");
    expect(m.create).not.toHaveBeenCalled();
    m.brief.mockResolvedValue(null);
    await expect(depositInBrandVault({ ...args, context: { _briefId: "foreign" } })).rejects.toThrow("VAULT_BRIEF_MISMATCH");
  });
  it("persists a resumable failure without losing content or leaking arbitrary context", async () => {
    await recordVaultDepositFailure({ ...args, context: { _campaignId: "campaign", token: "private", unrelatedPrompt: "private" } });
    expect(saved.output.culture).toBe("Voix conservée");
    expect(saved.output._vaultDeposit).toMatchObject({ status: "FAILED", sourceIntentId: "generation-intent", context: { _campaignId: "campaign" } });
    expect(JSON.stringify(saved.output)).not.toContain("private");
    const failure = saved.output._vaultDeposit;
    await depositInBrandVault(args);
    expect(m.create.mock.calls[0]![0].content).not.toHaveProperty("_vaultDeposit");
    expect(failure).not.toEqual(saved.output._vaultDeposit);
  });
  it("does not let a late failure overwrite an already deposited source", async () => {
    m.count.mockResolvedValue(1);
    await recordVaultDepositFailure(args);
    expect(m.update).not.toHaveBeenCalled();
  });
});

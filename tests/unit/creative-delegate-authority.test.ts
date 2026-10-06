import { afterEach, describe, expect, it, vi } from "vitest";
const vault = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/server/services/anubis/credential-vault", () => ({ credentialVault: vault }));
import "@/server/services/seshat/creative-intelligence/source-collection";
import { getDelegateHandler } from "@/server/services/artemis/tools/delegate-registry";
const source = { provider: "FOREPLAY", account: "fixture", sector: "food", countryCode: "CI", limit: 1 };
describe("creative delegate authority", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
  it("never trusts a caller-supplied operator_id to read another vault", async () => {
    vi.stubEnv("FOREPLAY_API_KEY", "");
    const result = await getDelegateHandler("creative-intelligence:fetch-source")!({ source_input: JSON.stringify(source), operator_id: "foreign-operator" }, { strategyId: "(global)" });
    expect(vault.get).not.toHaveBeenCalled();
    expect(result).toMatchObject({ state: "DEFERRED_AWAITING_CREDENTIALS" });
  });
  it("rejects a source scope that differs from the execution context before credential lookup", async () => {
    await expect(getDelegateHandler("creative-intelligence:fetch-source")!({ source_input: JSON.stringify({ ...source, strategyId: "foreign-brand" }) }, { strategyId: "own-brand" })).rejects.toThrow("périmètre");
    expect(vault.get).not.toHaveBeenCalled();
  });
});

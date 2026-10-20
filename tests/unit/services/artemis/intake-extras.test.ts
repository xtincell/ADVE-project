import { beforeEach, describe, expect, it, vi } from "vitest";
const generateBatch = vi.hoisted(() => vi.fn(async () => ({ batchId: "owned-batch", totalRecos: 3, recosByPillar: { a: 3 } })));
const indexBrandContext = vi.hoisted(() => vi.fn(async () => ({ totalNodes: 5, durationMs: 1 })));
vi.mock("@/server/services/notoria/engine", () => ({ generateBatch }));
vi.mock("@/server/services/seshat/context-store", () => ({ indexBrandContext }));
import { execute } from "@/server/services/artemis/commandant";
beforeEach(() => { generateBatch.mockClear(); indexBrandContext.mockClear(); });

describe("existing intake orchestration with optional preparation", () => {
  it("retains recommendations and deterministic indexing without unrequested creative previews", async () => {
    const r = await execute({ kind: "FILL_ADVE", phase: "INTAKE", strategyId: "owned-brand", prepareDeliverables: false });
    expect(r.status).toBe("OK"); expect(r.output).toMatchObject({ totalRecos: 3 });
    expect(r.spawnedIntents).toEqual([{ kind: "INDEX_BRAND_CONTEXT", strategyId: "owned-brand", scope: "INTAKE_ONLY", prepareEmbeddings: false }]);
  });

  it("retains explicit preview preparation on the existing deliverable path", async () => {
    const r = await execute({ kind: "FILL_ADVE", phase: "INTAKE", strategyId: "owned-brand", prepareDeliverables: true });
    expect(r.spawnedIntents?.filter(i => i.kind === "PRODUCE_DELIVERABLE")).toEqual(
      ["MANIFESTE-A", "BRANDBOOK-D", "OFFRE-V", "PLAYBOOK-E"].map(target => ({ kind: "PRODUCE_DELIVERABLE", strategyId: "owned-brand", target, depth: "PREVIEW" })),
    );
  });

  it("preserves full boot indexing and its existing embedding default", async () => {
    const r = await execute({ kind: "FILL_ADVE", phase: "BOOT", strategyId: "owned-brand" });
    expect(r.spawnedIntents).toEqual([{ kind: "INDEX_BRAND_CONTEXT", strategyId: "owned-brand", scope: "FULL", prepareEmbeddings: true }]);
  });

  it("passes the explicit embedding decision through the existing index handler", async () => {
    await execute({ kind: "INDEX_BRAND_CONTEXT", strategyId: "owned-brand", scope: "INTAKE_ONLY", prepareEmbeddings: false });
    expect(indexBrandContext).toHaveBeenCalledWith("owned-brand", "INTAKE_ONLY", { prepareEmbeddings: false });
  });
});

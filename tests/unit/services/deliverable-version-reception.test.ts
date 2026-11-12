import { beforeEach, describe, expect, it, vi } from "vitest";
const f = vi.hoisted(() => ({ outputs: [] as any[], frameworks: [] as any[], runs: [] as any[],
  steps: [{ ref: "writer", name: "Document", type: "GLORY", status: "ACTIVE" }] as any[] }));
vi.mock("@/lib/db", () => ({ db: {
  strategy: { findUnique: async () => ({ name: "Synthetic brand" }) },
  gloryOutput: { findMany: async () => f.outputs },
  frameworkResult: { findMany: async () => f.frameworks },
  sequenceExecution: { findMany: async () => f.runs },
} }));
vi.mock("@/server/services/artemis/tools/sequences", () => ({
  getSequence: () => ({ key: "TEST", name: "Document test", steps: f.steps }),
  ALL_SEQUENCES: [{ key: "TEST", name: "Document test", get steps() { return f.steps; } }],
}));
import { compileDeliverable, listCompilableDeliverables } from "@/server/services/artemis/tools/deliverable-compiler";
import { PillarSSchema } from "@/lib/types/pillar-schemas";
const good = (id: string, date: string, content = "Usable document") => ({ id, toolSlug: "writer", createdAt: new Date(date), output: { content, _meta: { model: "gpt-5.6-luna", provider: "openai-codex-oauth", schemaEnforced: true } } });
const failed = { ...good("failed", "2026-02-04"), output: { status: "FAILED", errorMessage: "Historical transport error", _meta: { error: true } } };
beforeEach(() => { f.steps = [{ ref: "writer", name: "Document", type: "GLORY", status: "ACTIVE" }]; f.outputs = []; f.frameworks = []; f.runs = []; });
describe("deliverable versions are usable output, not generation attempts", () => {
  it("does not count a failed attempt as an existing deliverable or give it today's date", async () => {
    f.outputs = [failed];
    expect(await listCompilableDeliverables("test")).toEqual([]);
    const m = await compileDeliverable("test", "TEST" as never);
    expect(m.sections).toEqual([]); expect(m.isComplete).toBe(false); expect(m.meta.generatedAt).toBeNull();
    expect(m.history).toMatchObject([{ id: "failed", usable: false, version: null }]);
  });
  it("keeps the last usable version when the newest attempt failed", async () => {
    f.outputs = [good("v1", "2026-02-01"), failed];
    const m = await compileDeliverable("test", "TEST" as never);
    expect(m.sections[0]).toMatchObject({ content: { content: "Usable document" }, version: { id: "v1", number: 1, author: "Luna", engine: "gpt-5.6-luna" } });
    expect(m.meta.generatedAt).toBe("2026-02-01T00:00:00.000Z"); expect(m.isComplete).toBe(true);
    expect(m.history).toHaveLength(2);
  });
  it("allows consulting an older version without changing stored outputs", async () => {
    f.outputs = [good("v1", "2026-02-01", "Original"), good("v2", "2026-02-02", "Revision"), failed];
    expect((await compileDeliverable("test", "TEST" as never)).sections[0]?.version?.number).toBe(2);
    expect((await compileDeliverable("test", "TEST" as never, { writer: "v1" })).sections[0]?.content.content).toBe("Original");
    expect((await compileDeliverable("test", "TEST" as never, { writer: "foreign" })).sections).toEqual([]);
  });
  it("applies the same failure and version rules to framework sections", async () => {
    f.steps[0].type = "ARTEMIS";
    f.frameworks = [good("fw1", "2026-02-01"), failed].map(x => ({ ...x, framework: { slug: "writer" } }));
    const m = await compileDeliverable("test", "TEST" as never);
    expect(m.sections[0]?.version?.id).toBe("fw1"); expect(m.meta.generatedAt).toBe("2026-02-01T00:00:00.000Z");
    expect(m.history).toHaveLength(2); expect((await listCompilableDeliverables("test"))[0]?.isComplete).toBe(true);
  });
  it("reads a mixed Artemis and Glory edition by its recorded step IDs after a later partial run", async () => {
    f.steps.push({ ref:"framework", name:"Analyse", type:"ARTEMIS", status:"ACTIVE" });
    const original={id:"edition-1",sequenceKey:"TEST",version:1,status:"COMPLETED",approval:"ACCEPTED"};
    const newer={id:"edition-2",sequenceKey:"TEST",version:2,status:"PARTIAL",approval:"PENDING"};
    f.outputs=[{...good("writer-v1","2026-02-01"),execution:original}];
    f.frameworks=[{...good("fw1","2026-02-01"),framework:{slug:"framework"}},{...good("fw2","2026-02-02"),framework:{slug:"framework"}}];
    f.runs=[{...original,stepResults:[{type:"ARTEMIS",ref:"framework",status:"SUCCESS",frameworkResultId:"fw1"}]},
      {...newer,stepResults:[{type:"ARTEMIS",ref:"framework",status:"SUCCESS",frameworkResultId:"fw2"}]}];
    const m=await compileDeliverable("test","TEST" as never);
    expect(m.sections.map(row=>row.version?.id)).toEqual(["writer-v1","fw1"]);
    expect(m.sections.every(row=>row.version?.approval==="ACCEPTED"&&row.version.executionId===original.id)).toBe(true);
    expect((await listCompilableDeliverables("test"))[0]?.generatedAt).toBe(m.meta.generatedAt);
    expect((await compileDeliverable("test","TEST" as never,{framework:"fw2"})).sections[1]?.version?.approval).toBe("PENDING");
  });
  it("recognises historical Artemis transport errors and deferred MCP attempts without exposing their body", async () => {
    f.steps[0].type = "ARTEMIS";
    f.frameworks = [{ id: "legacy", framework: { slug: "writer" }, createdAt: new Date(), output: { error: true, message: "provider billing error", framework: "writer" } }];
    const framework = await compileDeliverable("test", "TEST" as never);
    expect(framework.sections).toEqual([]); expect(framework.history[0]?.usable).toBe(false);
    f.steps[0].type = "GLORY";
    f.outputs = [{ ...good("deferred", "2026-01-01"), output: { status: "DEFERRED_AWAITING_CREDENTIALS", connectorType: "remote", configureUrl: "somewhere" } }];
    expect((await compileDeliverable("test", "TEST" as never)).sections).toEqual([]);
  });
  it("retains long source actions in both derived strategy fields", () => {
    const action = "An explicit action from the source. ".repeat(15);
    expect(PillarSSchema.pick({ fenetreOverton: true }).parse({ fenetreOverton: { strategieDeplacement: [{ etape: "Étape1", action }] } }).fenetreOverton?.strategieDeplacement[0]?.action).toBe(action);
    expect(PillarSSchema.shape.recommandationsPrioritaires.unwrap().element.shape.recommendation.parse(action)).toBe(action);
  });
});

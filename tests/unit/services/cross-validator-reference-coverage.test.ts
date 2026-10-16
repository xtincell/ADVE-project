import { beforeEach, describe, expect, it, vi } from "vitest";

const queries = vi.hoisted(() => ({ pillars: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { pillar: { findMany: queries.pillars } } }));
import { validateCrossReferences } from "@/server/services/cross-validator";

beforeEach(() => vi.clearAllMocks());

async function referenceRule(content: Record<string, unknown>) {
  queries.pillars.mockResolvedValue(Object.entries(content).map(([key, value]) => ({ key, content: value })));
  return (await validateCrossReferences("synthetic-reference-coverage")).find(row => row.ruleId === 32)!;
}

describe("Reference assessment does not turn absent evidence into a resolved link", () => {
  it("defers an initiative's persona reference while D has names but no IDs", async () => {
    const row = await referenceRule({
      d: { personas: [{ name: "Synthetic target" }] },
      i: { catalogueParCanal: { WEB: [{ targetsPersonaIds: ["unassigned-persona"] }] } },
    });
    expect(row.status).toBe("SKIPPED");
    expect(row.message).toMatch(/identifiant|vérifi/i);
    expect(row.message).not.toContain("Toutes les références inter-piliers résolvent");
  });

  it("does not validate an empty dossier", async () => {
    expect((await referenceRule({})).status).toBe("SKIPPED");
  });

  it("keeps incomplete coverage visible alongside a resolved link", async () => {
    const row = await referenceRule({
      d: { personas: [{ name: "Synthetic target" }] },
      v: { personaSegmentMap: [{ personaName: "Synthetic target" }] },
      i: { catalogueParCanal: { WEB: [{ targetsPersonaIds: ["unassigned-persona"] }] } },
    });
    expect(row.status).toBe("SKIPPED");
    expect(row.message).toMatch(/1.*vérifi/i);
  });

  it("does not split or silently validate a legacy comma-separated reference", async () => {
    const row = await referenceRule({
      d: { personas: [{ id: "persona-a", name: "Synthetic target" }] },
      i: { actionsByOvertonPhase: [{ actions: [{ targetsPersonaIds: "persona-a, persona-b" }] }] },
    });
    expect(row.status).toBe("SKIPPED");
    expect(row.message).toMatch(/format/i);
  });

  it("keeps a known broken reference INVALID even when another link is deferred", async () => {
    const row = await referenceRule({
      d: { personas: [{ name: "Synthetic target" }] },
      v: { personaSegmentMap: [{ personaName: "Missing target" }] },
      i: { catalogueParCanal: { WEB: [{ targetsPersonaIds: ["unassigned-persona"] }] } },
    });
    expect(row.status).toBe("INVALID");
    expect(row.message).toContain("Missing target");
    expect(row.message).toMatch(/vérifi/i);
  });

  it("validates references only when the assessed links actually resolve", async () => {
    const row = await referenceRule({
      d: { personas: [{ id: "persona-a", name: "Synthetic target" }] },
      v: { personaSegmentMap: [{ personaName: "Synthetic target" }] },
      i: { catalogueParCanal: { WEB: [{ targetsPersonaIds: ["persona-a"] }] } },
    });
    expect(row.status).toBe("VALID");
    expect(row.message).toMatch(/2/);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ pillars: [] as Record<string, unknown>[] }));
const selectPillars = (select: Record<string, boolean>) => state.pillars.map(row =>
  Object.fromEntries(Object.entries(row).filter(([key]) => select[key])));
vi.mock("@/lib/db", () => ({ db: {
  pillar: { findMany: vi.fn(async ({ select }) => selectPillars(select)) },
  strategy: { findUnique: vi.fn(async ({ include }) => ({
    id: "brand-a", name: "Marque", updatedAt: new Date("2026-10-13T12:00:00Z"),
    pillars: include?.pillars ? selectPillars(include.pillars.select) : [],
    businessContext: { businessModel: "Service" },
  })) },
  brandContextNode: { findMany: vi.fn(async () => []) },
} }));
vi.mock("@/server/services/llm-gateway", () => ({ embed: vi.fn() }));

import { getOracleBrandContext } from "@/server/services/seshat/context-store/oracle-augment";
import { loadStrategyContextForFramework } from "@/server/services/seshat/context-store/strategy-context";

beforeEach(() => { state.pillars = [{ id: "pillar-e", key: "e", currentVersion: 3,
  content: { rituels: "5 questions = 5 axes", kpis: "Complétion ≥ 60 %" },
  fieldCertainty: { rituels: "INFERRED", kpis: "UNKNOWN" },
  updatedAt: new Date("2026-07-24T09:00:00Z") }]; });

async function read(role: "oracle" | "framework") {
  if (role === "oracle") {
    const result = await getOracleBrandContext("brand-a");
    return { fields: result!.preciseFields, text: result!.text };
  }
  const result = await loadStrategyContextForFramework("brand-a", { forceAugment: false });
  return { fields: result.precise, text: result.lines.join("\n") };
}

describe.each(["oracle", "framework"] as const)("Seshat precise field authority (%s)", role => {
  it("carries the stored edition and field origin without changing the value", async () => {
    const before = structuredClone(state.pillars);
    const result = await read(role);
    expect(result.fields).toContainEqual(expect.objectContaining({ source: "e", field: "rituels",
      value: "5 questions = 5 axes", sourceId: "pillar-e", sourceVersion: 3,
      provenance: "INFERRED", lastWrittenAt: new Date("2026-07-24T09:00:00Z") }));
    expect(result.fields).toContainEqual(expect.objectContaining({ field: "kpis", provenance: "UNKNOWN" }));
    expect(state.pillars).toEqual(before);
  });

  it("uses canonical human authority over an old inferred label", async () => {
    state.pillars[0]!.content = { inscrits: 0, _fieldProvenance: { inscrits: "HUMAN" } };
    state.pillars[0]!.fieldCertainty = { inscrits: "INFERRED" };
    const result = await read(role);
    expect(result.fields).toContainEqual(expect.objectContaining({ field: "inscrits", value: 0, provenance: "HUMAN" }));
  });

  it("keeps legacy identity/version/authority unknown and retains false and zero", async () => {
    state.pillars = [{ key: "v", content: { actifs: 0, valide: false } }];
    const result = await read(role);
    for (const field of result.fields.filter(f => f.source === "v")) {
      expect(field).toMatchObject({ sourceId: null, sourceVersion: null, provenance: "UNKNOWN" });
    }
    expect(result.fields.find(f => f.field === "actifs")?.value).toBe(0);
    expect(result.fields.find(f => f.field === "valide")?.value).toBe(false);
  });

  it("retains a stored version zero and prefix-qualified field authority", async () => {
    state.pillars[0]!.currentVersion = 0;
    state.pillars[0]!.fieldCertainty = { "e.rituels": "SOURCE" };
    const result = await read(role);
    expect(result.fields).toContainEqual(expect.objectContaining({ field: "rituels", sourceVersion: 0, provenance: "SOURCE" }));
  });

  it("does not publish internal metadata as a business field", async () => {
    state.pillars[0]!.content = { visible: { exact: [0, false, "texte"] },
      _fieldProvenance: { visible: "HUMAN" }, _analysisNotes: "internal", absent: null, vide: [], blanc: "" };
    const result = await read(role);
    expect(result.fields.filter(f => f.source === "e").map(f => f.field)).toEqual(["visible"]);
    expect(result.fields.find(f => f.field === "visible")?.value).toEqual({ exact: [0, false, "texte"] });
  });

  it("does not turn an untracked strategy-level field into a human assertion", async () => {
    const result = await read(role);
    expect(result.fields.find(f => f.field === "businessContext")).toMatchObject({
      sourceId: "brand-a", sourceVersion: null, provenance: "UNKNOWN",
      lastWrittenAt: new Date("2026-10-13T12:00:00Z"),
    });
  });
});

it("puts edition/origin before a long exact value and distinguishes editing from measurement", async () => {
  state.pillars[0]!.content = { rituels: "Récit ".repeat(1200) };
  const result = await read("oracle");
  expect(result.text).toContain("référence: pillar-e ; version d’édition: 3 ; origine: INFERRED");
  expect(result.text).toContain("édité le: 2026-07-24T09:00:00.000Z");
  expect(result.text.indexOf("référence: pillar-e")).toBeLessThan(result.text.indexOf("Récit "));
  expect(result.text).toContain("pas une date de mesure");
  expect(result.text).toContain("valeur stockée exacte ≠ résultat validé");
  expect(result.fields.find(f => f.field === "rituels")?.value).toBe("Récit ".repeat(1200));
});

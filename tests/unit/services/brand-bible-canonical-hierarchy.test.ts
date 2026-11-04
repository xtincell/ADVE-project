import { describe, expect, it, vi } from "vitest";
import { composeBrandBible } from "@/server/services/brand-bible/compose";

const rows = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db", () => ({ db: {
  strategy: { findUnique: async () => ({ name: "Marque témoin" }) },
  pillar: { findMany: rows },
} }));
vi.mock("@/server/services/neteru-shared/pillar-directors", () => ({ assessAllPillarsHealth: async () => [] }));
vi.mock("@/server/services/notoria/source-context", () => ({ loadBrandSourceContext: async () => ({ retrieval: "NONE", excerpts: [] }) }));

const field = "hierarchieCommunautaire";
const source = { key: "a", content: { [field]: [{ level: "Initié" }], _fieldProvenance: { [field]: "SOURCE" } } };
async function engagement() {
  return (await composeBrandBible("fixture"))?.sections.find(s => s.pillarKey === "E");
}

describe("hiérarchie communautaire dans le Livre de marque", () => {
  it("lit la valeur et sa provenance en A quand le champ E est vide", async () => {
    const empty = { key: "e", content: { [field]: [], _fieldProvenance: { [field]: "HUMAN" } } };
    rows.mockResolvedValueOnce([source, empty]);
    const section = await engagement();
    expect(section?.entries.find(entry => entry.field === field)).toMatchObject({
      value: source.content[field], sourceField: "A.hierarchieCommunautaire", provenance: "SOURCE",
    });
    expect(section?.missing.map(entry => entry.field)).not.toContain(field);
    expect(empty.content[field]).toEqual([]);
  });

  it("conserve une valeur explicite de E et sa provenance", async () => {
    const explicit = [{ level: "Ambassadeur" }];
    rows.mockResolvedValueOnce([source, { key: "e", content: { [field]: explicit, _fieldProvenance: { [field]: "HUMAN" } } }]);
    const entry = (await engagement())?.entries.find(value => value.field === field);
    expect(entry).toMatchObject({ value: explicit, provenance: "HUMAN" });
    expect(entry?.sourceField).toBeUndefined();
  });

  it("maintient le champ parmi les manquants si ni A ni E n’ont de valeur", async () => {
    rows.mockResolvedValueOnce([]);
    expect((await engagement())?.missing.map(entry => entry.field)).toContain(field);
  });
});

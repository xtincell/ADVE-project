import { describe, it, expect } from "vitest";
import {
  PILLAR_TOPLEVEL_FIELDS,
  PILLAR_FIELD_PREFIX_MAP,
  PILLAR_FIELD_UNPREFIX_MAP,
  prefixField,
  unprefixField,
  flattenPillarContent,
  unflattenPillarContent,
  flattenStrategy,
  unflattenStrategy,
} from "@/lib/types/pillar-field-naming";

describe("pillar-field-naming", () => {
  it("derives a non-empty top-level field set from the Zod schemas (anti-drift guard)", () => {
    // If a schema becomes a ZodEffects and .shape extraction silently breaks,
    // the map collapses to {} — this guard catches that regression.
    const total = Object.values(PILLAR_TOPLEVEL_FIELDS).reduce((n, f) => n + f.length, 0);
    expect(total).toBeGreaterThan(100);
    for (const key of ["a", "d", "v", "e", "r", "t", "i", "s"] as const) {
      expect(PILLAR_TOPLEVEL_FIELDS[key].length).toBeGreaterThan(0);
    }
  });

  it("maps canonical -> `<key>_<field>` and back", () => {
    expect(PILLAR_FIELD_PREFIX_MAP.a.noyauIdentitaire).toBe("a_noyauIdentitaire");
    expect(PILLAR_FIELD_UNPREFIX_MAP.a.a_noyauIdentitaire).toBe("noyauIdentitaire");
    expect(prefixField("e", "touchpoints")).toBe("e_touchpoints");
    expect(unprefixField("e", "e_touchpoints")).toBe("touchpoints");
  });

  it("prefixField is idempotent (no double prefix)", () => {
    expect(prefixField("a", "a_noyauIdentitaire")).toBe("a_noyauIdentitaire");
  });

  it("disambiguates fields that exist in multiple pillars via the prefix", () => {
    // hierarchieCommunautaire exists in both A and E.
    const flat = flattenStrategy({
      a: { hierarchieCommunautaire: ["A-level"] },
      e: { hierarchieCommunautaire: ["E-level"] },
    });
    expect(flat.a_hierarchieCommunautaire).toEqual(["A-level"]);
    expect(flat.e_hierarchieCommunautaire).toEqual(["E-level"]);
  });

  it("flatten/unflatten round-trips a strategy, including ad-hoc out-of-schema fields", () => {
    const pillars = {
      a: { noyauIdentitaire: "x", archetype: "HERO" },
      e: { touchpoints: [1, 2] },
      i: { catalogueParCanal: { web: [] } }, // not in the Zod schema -> still flattened
    };
    const flat = flattenStrategy(pillars);
    expect(Object.keys(flat).sort()).toEqual([
      "a_archetype",
      "a_noyauIdentitaire",
      "e_touchpoints",
      "i_catalogueParCanal",
    ]);
    expect(unflattenStrategy(flat)).toEqual(pillars);
  });

  it("single-pillar flatten/unflatten round-trips", () => {
    const content = { foo: 1, bar: { baz: 2 } };
    const flat = flattenPillarContent("r", content);
    expect(flat).toEqual({ r_foo: 1, r_bar: { baz: 2 } });
    expect(unflattenPillarContent("r", flat)).toEqual(content);
  });

  it("ignores foreign keys when unflattening a single pillar", () => {
    expect(unflattenPillarContent("a", { a_x: 1, e_y: 2 })).toEqual({ x: 1 });
  });
});

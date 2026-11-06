import { describe, expect, it } from "vitest";
import { PILLAR_SCHEMAS, validatePillarPartial, type PillarKey } from "@/lib/types/pillar-schemas";

describe("structural pillar percentage", () => {
  it.each(Object.keys(PILLAR_SCHEMAS) as PillarKey[])("%s ignores metadata and unknown fields", (key) => {
    const keys = Object.keys(PILLAR_SCHEMAS[key].shape);
    const content = Object.fromEntries(keys.map((field) => [field, "fixture"]));
    const withMetadata = { ...content, _fieldProvenance: {}, _commentary: { note: "fixture" }, legacyExtra: "old" };
    expect(validatePillarPartial(key, content).completionPercentage).toBe(100);
    expect(validatePillarPartial(key, withMetadata).completionPercentage).toBe(100);
    expect(validatePillarPartial(key, { _fieldProvenance: {}, legacyExtra: "old" }).completionPercentage).toBe(0);
  });

  it("does not count inherited content and preserves explicit zero and false", () => {
    const keys = Object.keys(PILLAR_SCHEMAS.V.shape);
    const content: Record<string, unknown> = Object.create({ [keys[0]!]: "inherited" });
    content[keys[1]!] = 0;
    content[keys[2]!] = false;
    content[keys[3]!] = [];
    expect(validatePillarPartial("V", content).completionPercentage).toBe(Math.round(2 / keys.length * 100));
  });
});

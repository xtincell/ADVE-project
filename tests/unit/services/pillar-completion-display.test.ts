import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { fieldStatusFor } from "@/domain/field-provenance";
import { makeStatusFor } from "@/components/cockpit/pillars/pillar-kit";

describe("completion display keeps the authority of each value", () => {
  it("shows proposed complements without changing the writer's human parent authority", () => {
    const origins = { produitsCatalogue: "HUMAN", "produitsCatalogue[0].gainClientConcret": "INFERRED" };
    const before = structuredClone(origins);
    const display = makeStatusFor({}, "v", origins);
    expect(display("produitsCatalogue")).toBe("PARTIALLY_INFERRED");
    expect(display("v.produitsCatalogue")).toBe("PARTIALLY_INFERRED");
    expect(display("produitsCatalogue[0].gainClientConcret")).toBe("INFERRED");
    expect(display("produitsCatalogue[0].nom")).toBe("HUMAN");
    expect(fieldStatusFor({}, "v", origins)("produitsCatalogue")).toBe("HUMAN");
    expect(origins).toEqual(before);
  });
  it("removes the proposal label only after the remaining cell is confirmed", () => {
    const origins = { unitEconomics: "HUMAN", "unitEconomics.cac": "HUMAN" };
    expect(makeStatusFor({}, "v", origins)("unitEconomics")).toBe("HUMAN");
    expect(makeStatusFor({}, "v", { ...origins, "unitEconomics.ltv": "INFERRED" })("unitEconomics")).toBe("PARTIALLY_INFERRED");
  });
  it("does not describe a new source value as a human decision", () => {
    expect(makeStatusFor({}, "v", { unitEconomics: "HUMAN", "unitEconomics.cac": "SOURCE" })("unitEconomics")).toBe("MIXED");
    expect(makeStatusFor({}, "v", { unitEconomics: "INFERRED", "unitEconomics.cac": "HUMAN" })("unitEconomics")).toBe("PARTIALLY_INFERRED");
  });
  it("the review resolves the exact cell and offers its full value before confirmation", () => {
    const page = readFileSync(join(process.cwd(), "src/components/cockpit/pillar-page.tsx"), "utf8");
    const review = page.slice(page.indexOf("{inferredPaths.map((path) =>"));
    expect(review).toContain("const value = resolvePillarPath(content, path)");
    expect(review).not.toContain("const value = content[path]");
    expect(review).toContain("setFocusedItem({ [getFieldLabel(path)]: value })");
    expect(review).toContain("Lire la valeur entière");
    expect(review).toContain("fieldPath: path");
  });
});

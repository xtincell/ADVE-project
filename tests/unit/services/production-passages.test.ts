import { describe, expect, it } from "vitest";
import { listProductionPassagesInText, selectProductionPassages } from "@/domain/production-passages";

describe("passages versionnés dans un brief de production", () => {
  it("conserve les octets textuels et l’ordre de la DA, même si la sélection est faite en ordre inverse", () => {
    const source = "# Direction\r\n\r\n## Identité\r\nLe logo complet.\r\n## Correction\r\nGarder la piste choisie.\r\n";
    const p = listProductionPassagesInText(source);
    expect(p.map(x => x.text).join("")).toBe(source);
    expect(selectProductionPassages(source,[p[2]!.key,p[1]!.key])).toBe([p[1]!.text,p[2]!.text].join("\n\n"));
    expect(() => selectProductionPassages(source.replace("logo complet","wordmark"),[p[1]!.key])).toThrow("changé");
    expect(() => selectProductionPassages(source,[p[1]!.key,p[1]!.key])).toThrow("deux fois");
  });
  it("garde un titre de code comme contenu et décompose une ligne longue sans couper un emoji", () => {
    const source = "# Master\n```html\n# exemple\n```\n" + "a".repeat(7999) + "🍟".repeat(5000);
    const passages = listProductionPassagesInText(source);
    expect(passages.map(p=>p.text).join("")).toBe(source);
    expect(passages.some(p=>p.title.includes("exemple"))).toBe(false);
    expect(passages.every(p=>p.text.length<=8000 && !/[\uD800-\uDBFF]$/.test(p.text))).toBe(true);
    expect(selectProductionPassages(source,[])).toBe(source);
  });
});

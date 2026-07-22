/**
 * Verrou runtime — anti-empoisonnement de prototype sur l'écriture pilier (ADR-0175).
 *
 * `pillar.amend` accepte un `field` libre non-allowlisté propagé jusqu'à
 * `setNestedValue`. Sans garde, un `field="__proto__.polluted"` remontait dans
 * `Object.prototype` (empoisonnement GLOBAL, tous tenants, tout le process). Ce test
 * prouve que la garde `assertSafePillarPath` refuse net les segments dangereux et que
 * les chemins légitimes (dont l'indexation de tableau `personas[0].name`) marchent.
 */
import { describe, it, expect } from "vitest";
import {
  setNestedValue,
  tokenizePillarPath,
  assertSafePillarPath,
} from "@/server/services/pillar-gateway";

describe("pillar path — garde prototype-pollution (ADR-0175)", () => {
  it("refuse __proto__ / constructor / prototype comme segment", () => {
    for (const bad of ["__proto__.x", "a.__proto__.y", "constructor.prototype.z", "a.constructor", "prototype"]) {
      const obj: Record<string, unknown> = {};
      expect(() => setNestedValue(obj, bad, "PWNED"), `segment interdit: ${bad}`).toThrow();
    }
  });

  it("ne pollue jamais Object.prototype", () => {
    const obj: Record<string, unknown> = {};
    try {
      setNestedValue(obj, "__proto__.polluted", "PWNED");
    } catch {
      /* attendu */
    }
    // La preuve : aucun objet neuf ne porte la clé polluée.
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")).toBe(false);
  });

  it("laisse passer les chemins légitimes (dont indexation de tableau)", () => {
    const obj: Record<string, unknown> = {};
    setNestedValue(obj, "personas[0].name", "Alex");
    expect((obj.personas as Array<{ name: string }>)[0]!.name).toBe("Alex");

    setNestedValue(obj, "a.b.c", 42);
    expect((obj.a as { b: { c: number } }).b.c).toBe(42);
  });

  it("assertSafePillarPath est cohérente avec le tokenizer", () => {
    expect(() => assertSafePillarPath(tokenizePillarPath("safe.path[0]"))).not.toThrow();
    expect(() => assertSafePillarPath(tokenizePillarPath("__proto__.evil"))).toThrow();
  });
});

/**
 * Variable IDs — every ADVERTIS variable carries a unique, stable, renumbered
 * identifier (pillar-a-001 + code A1). Guards the "id unique sur TOUTES les
 * variables" invariant so the 1-letter-key ambiguity bugs cannot return.
 */

import { describe, it, expect } from "vitest";
import { VARIABLE_BIBLE } from "@/lib/types/variable-bible";
import { VARIABLE_IDS, ALL_VARIABLE_IDS, getVariableId } from "@/lib/types/variable-ids";
import { PILLAR_STORAGE_KEYS, toSlug } from "@/domain";

describe("variable-ids registry", () => {
  it("assigns an id to EVERY bible variable (no gaps)", () => {
    for (const pk of PILLAR_STORAGE_KEYS) {
      const bibleKeys = Object.keys(VARIABLE_BIBLE[pk] ?? {});
      const idKeys = Object.keys(VARIABLE_IDS[pk] ?? {});
      expect(idKeys.sort()).toEqual(bibleKeys.sort());
    }
  });

  it("every variableId is globally unique", () => {
    const ids = ALL_VARIABLE_IDS.map((v) => v.variableId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(0);
  });

  it("ids are namespaced by pillar slug and renumbered sequentially", () => {
    for (const pk of PILLAR_STORAGE_KEYS) {
      const slug = toSlug(pk);
      const entries = Object.values(VARIABLE_IDS[pk] ?? {}).sort((a, b) => a.num - b.num);
      entries.forEach((entry, idx) => {
        expect(entry.num).toBe(idx + 1);
        expect(entry.variableId).toBe(`${slug}-${String(idx + 1).padStart(3, "0")}`);
        expect(entry.code).toBe(`${pk.toUpperCase()}${idx + 1}`);
      });
    }
  });

  it("getVariableId resolves canonical and storage pillar keys", () => {
    const firstA = Object.keys(VARIABLE_BIBLE.a ?? {})[0]!;
    expect(getVariableId("a", firstA)).toEqual(getVariableId("A", firstA));
    expect(getVariableId("a", firstA)?.variableId).toBe("pillar-a-001");
  });
});

import { describe, it, expect } from "vitest";
import {
  ADVE_KEYS,
  RTIS_KEYS,
  PILLAR_KEYS,
  PILLAR_STORAGE_KEYS,
  PILLAR_METADATA,
  PillarKeySchema,
  PillarStorageKeySchema,
  isAdve,
  isRtis,
  toCanonical,
  toStorage,
  pillarDependencies,
  pillarDependents,
} from "../pillars";

describe("domain/pillars", () => {
  it("cascade order is exactly A→D→V→E→R→T→I→S", () => {
    expect(PILLAR_KEYS).toEqual(["A", "D", "V", "E", "R", "T", "I", "S"]);
    expect(ADVE_KEYS).toEqual(["A", "D", "V", "E"]);
    expect(RTIS_KEYS).toEqual(["R", "T", "I", "S"]);
  });

  it("storage keys are the lowercase mirror", () => {
    expect(PILLAR_STORAGE_KEYS).toEqual(["a", "d", "v", "e", "r", "t", "i", "s"]);
  });

  it("metadata covers every pillar with consistent order + storageKey", () => {
    PILLAR_KEYS.forEach((k, idx) => {
      const meta = PILLAR_METADATA[k];
      expect(meta.key).toBe(k);
      expect(meta.order).toBe(idx);
      expect(meta.storageKey).toBe(k.toLowerCase());
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.phase).toBe(idx < 4 ? "ADVE" : "RTIS");
    });
  });

  it("Zod accepts canonical, rejects storage form", () => {
    expect(PillarKeySchema.safeParse("A").success).toBe(true);
    expect(PillarKeySchema.safeParse("a").success).toBe(false);
    expect(PillarKeySchema.safeParse("Z").success).toBe(false);
  });

  it("Zod storage schema is the symmetric counterpart", () => {
    expect(PillarStorageKeySchema.safeParse("a").success).toBe(true);
    expect(PillarStorageKeySchema.safeParse("A").success).toBe(false);
  });

  it("isAdve / isRtis partition the pillar set", () => {
    PILLAR_KEYS.forEach((k) => {
      expect(isAdve(k) || isRtis(k)).toBe(true);
      expect(isAdve(k) && isRtis(k)).toBe(false);
    });
  });

  it("toCanonical / toStorage roundtrip", () => {
    PILLAR_KEYS.forEach((k) => {
      expect(toCanonical(toStorage(k))).toBe(k);
    });
    PILLAR_STORAGE_KEYS.forEach((k) => {
      expect(toStorage(toCanonical(k))).toBe(k);
    });
  });

  it("dependencies = strict prefix in cascade", () => {
    expect(pillarDependencies("A")).toEqual([]);
    expect(pillarDependencies("D")).toEqual(["A"]);
    expect(pillarDependencies("S")).toEqual(["A", "D", "V", "E", "R", "T", "I"]);
  });

  it("dependents = strict suffix in cascade", () => {
    expect(pillarDependents("S")).toEqual([]);
    expect(pillarDependents("A")).toEqual(["D", "V", "E", "R", "T", "I", "S"]);
    expect(pillarDependents("E")).toEqual(["R", "T", "I", "S"]);
  });
});

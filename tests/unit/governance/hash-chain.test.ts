import { describe, it, expect } from "vitest";
import { computeSelfHash, verifyChain } from "@/server/governance/hash-chain";

describe("hash-chain", () => {
  it("the same row produces the same hash deterministically", () => {
    const row = {
      id: "c1",
      intentKind: "FILL_ADVE",
      strategyId: "s1",
      payload: { foo: 1 },
      result: null,
      caller: "test",
      emittedAt: new Date("2026-04-28T12:00:00Z"),
      prevHash: null,
    };
    expect(computeSelfHash(row)).toBe(computeSelfHash(row));
  });

  it("different prevHash yields different selfHash", () => {
    const a = computeSelfHash({
      id: "c1",
      intentKind: "X",
      strategyId: "s1",
      payload: {},
      result: null,
      caller: "t",
      emittedAt: new Date("2026-01-01T00:00:00Z"),
      prevHash: null,
    });
    const b = computeSelfHash({
      id: "c1",
      intentKind: "X",
      strategyId: "s1",
      payload: {},
      result: null,
      caller: "t",
      emittedAt: new Date("2026-01-01T00:00:00Z"),
      prevHash: "abc",
    });
    expect(a).not.toBe(b);
  });

  it("verifyChain accepts a well-formed chain", () => {
    const r1: { id: string; intentKind: string; strategyId: string; payload: unknown; result: null; caller: string; emittedAt: Date; prevHash: null; selfHash: string } = {
      id: "c1",
      intentKind: "X",
      strategyId: "s1",
      payload: {},
      result: null,
      caller: "t",
      emittedAt: new Date("2026-01-01T00:00:00Z"),
      prevHash: null,
      selfHash: "",
    };
    r1.selfHash = computeSelfHash(r1);
    const r2 = {
      id: "c2",
      intentKind: "Y",
      strategyId: "s1",
      payload: {},
      result: null,
      caller: "t",
      emittedAt: new Date("2026-01-02T00:00:00Z"),
      prevHash: r1.selfHash,
      selfHash: "",
    };
    r2.selfHash = computeSelfHash(r2);
    expect(verifyChain([r1, r2]).ok).toBe(true);
  });

  it("verifyChain rejects a tampered row", () => {
    const r1: { id: string; intentKind: string; strategyId: string; payload: { v: number }; result: null; caller: string; emittedAt: Date; prevHash: null; selfHash: string } = {
      id: "c1",
      intentKind: "X",
      strategyId: "s1",
      payload: { v: 1 },
      result: null,
      caller: "t",
      emittedAt: new Date("2026-01-01T00:00:00Z"),
      prevHash: null,
      selfHash: "",
    };
    r1.selfHash = computeSelfHash(r1);
    // Tamper: change payload after-the-fact, keep stale selfHash.
    r1.payload = { v: 2 };
    expect(verifyChain([r1]).ok).toBe(false);
  });
  it("v2 canonicalizes nested keys but preserves array order and seals its version", () => {
    const row = { id: "v2", intentKind: "X", strategyId: "s", version: 2,
      payload: { z: { beta: 2, alpha: 1 }, a: [1, 2] }, result: null, caller: "test", emittedAt: new Date(0) };
    expect(computeSelfHash(row)).toBe(computeSelfHash({ ...row, payload: { a: [1, 2], z: { alpha: 1, beta: 2 } } }));
    expect(computeSelfHash(row)).not.toBe(computeSelfHash({ ...row, payload: { z: { beta: 2, alpha: 1 }, a: [2, 1] } }));
    expect(computeSelfHash(row)).not.toBe(computeSelfHash({ ...row, version: 1 }));
  });
  it("classifies unrecomputable legacy bytes without a tampering claim", () => {
    const row = { id: "old", intentKind: "X", strategyId: "s", version: 1,
      payload: { nested: { z: 1, a: 2 } }, result: null, caller: "test", emittedAt: new Date(0), prevHash: null };
    const selfHash = computeSelfHash(row);
    const result = verifyChain([{ ...row, payload: { nested: { a: 2, z: 1 } }, selfHash }]);
    expect(result).toMatchObject({ ok: false, unverifiableAt: { id: "old", state: "UNVERIFIABLE_LEGACY" } });
    expect(result.brokenAt).toBeUndefined();
  });
  it("verifies a bounded window only with its explicitly supplied anchor", () => {
    const row = { id: "part", intentKind: "X", strategyId: "s", version: 2,
      payload: {}, result: null, caller: "test", emittedAt: new Date(0), prevHash: "unverified-anchor" };
    const selfHash = computeSelfHash(row);
    expect(verifyChain([{ ...row, selfHash }]).ok).toBe(false);
    expect(verifyChain([{ ...row, selfHash }], row.prevHash).ok).toBe(true);
  });

});

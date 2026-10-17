import { describe, expect, it } from "vitest";
import { acquireEntityIds } from "@/domain/entity-ids";
import { acquirePillarEntityIds } from "@/domain/pillar-entity-ids";

describe("accepted collections retain acquired identities", () => {
  it("recovers unique exact labels across reordering, reserves retired IDs, and never guesses an alias", () => {
    const old = [{ id: "kept", name: "Exact" }, { id: "retired", name: "Old" }];
    const sequence = ["retired", "new", "alias"];
    const next = [{ name: "New" }, { name: "Exact" }, { name: "EXACT" }];
    expect(acquireEntityIds(next, old, "name", () => sequence.shift()!)).toEqual([
      { name: "New", id: "new" }, { name: "Exact", id: "kept" }, { name: "EXACT", id: "alias" },
    ]);
    expect(next[0]).not.toHaveProperty("id");
  });
  it("does not match homonyms in either collection or overwrite acquired IDs", () => {
    let n = 0;
    const old = [{ id: "a", name: "Common" }, { id: "b", name: "Common" }, { id: "c", name: "Solo" }];
    const next = [{ id: "explicit", name: "Common" }, { name: "Common" }, { name: "Solo" }, { name: "Solo" }];
    expect(acquireEntityIds(next, old, "name", () => `new-${++n}`).map(e => e.id))
      .toEqual(["explicit", "new-1", "new-2", "new-3"]);
    expect(() => acquireEntityIds([{ name: "x" }, { name: "y" }], [], "name", () => "same"))
      .toThrow("ENTITY_ID_ALLOCATION_FAILED");
  });
  it("leaves untouched legacy lists alone, including protected rows", () => {
    const old = { personas: [{ name: "Legacy", rank: 0 }] };
    expect(acquirePillarEntityIds("d", { ...old, tone: "Changed" }, old, () => { throw Error("unexpected"); }))
      .toEqual({ ...old, tone: "Changed" });
  });
  it.each([
    ["d", "personas", "name"], ["r", "probabilityImpactMatrix", "risk"],
    ["r", "overtonBlockers", "risk"], ["t", "hypothesisValidation", "hypothesis"],
  ])("acquires %s.%s identities only on accepted replacement", (key, field, label) => {
    const next = acquirePillarEntityIds(key, { [field]: [{ [label]: "New" }] }, {}, () => "id");
    expect(next[field]).toEqual([{ [label]: "New", id: "id" }]);
    expect(() => acquirePillarEntityIds(key, { [field]: [{ id: "a" }, { id: "a" }] }, {}, () => "unused"))
      .toThrow("ENTITY_ID_CONFLICT");
  });
  it("keeps action identities within exact channel/phase, without positional fallback", () => {
    const old = { catalogueParCanal: { DIGITAL: [{ action: "Retain", id: "digital" }] },
      actionsByDevotionLevel: { FANATIC: [{ action: "Keep", id: "fan" }] },
      actionsByOvertonPhase: [{ phase: "FIRST", actions: [{ action: "Keep", id: "first" }] }] };
    let n = 0;
    const next = acquirePillarEntityIds("i", {
      catalogueParCanal: { DIGITAL: [{ action: "Retain", detail: "New" }] },
      actionsByDevotionLevel: { FANATIC: [{ action: "Keep", detail: "New" }] },
      actionsByOvertonPhase: [{ phase: "SECOND", actions: [{ action: "Keep" }] },
        { phase: "FIRST", actions: [{ action: "Keep", detail: "New" }] }, { phase: "EMPTY" }],
    }, old, () => `new-${++n}`);
    expect(next).toMatchObject({ catalogueParCanal: { DIGITAL: [{ id: "digital" }] },
      actionsByDevotionLevel: { FANATIC: [{ id: "fan" }] },
      actionsByOvertonPhase: [{ actions: [{ id: "new-1" }] }, { actions: [{ id: "first" }] }, { phase: "EMPTY" }] });
    expect((next.actionsByOvertonPhase as object[])[2]).not.toHaveProperty("actions");
  });
});

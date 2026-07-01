import { describe, expect, it } from "vitest";
import {
  canonicalJson,
  computeSelfHash,
  type AuditHashRecord,
} from "@/server/audit-hash";

const baseRecord: AuditHashRecord = {
  workspaceId: "w1",
  actorId: null,
  action: "user.register",
  entity: null,
  entityId: null,
  payload: null,
};

describe("canonicalJson", () => {
  it("trie les clés récursivement — l'ordre d'insertion ne change rien", () => {
    const a = { b: 1, a: { z: true, y: [{ n: 2, m: 1 }] } };
    const b = { a: { y: [{ m: 1, n: 2 }], z: true }, b: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(canonicalJson(a)).toBe('{"a":{"y":[{"m":1,"n":2}],"z":true},"b":1}');
  });

  it("préserve l'ordre des tableaux (significatif)", () => {
    expect(canonicalJson([2, 1])).not.toBe(canonicalJson([1, 2]));
  });

  it("omet les clés à valeur undefined (sémantique JSON)", () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });
});

describe("computeSelfHash — chaîne sha256", () => {
  it("produit un hex sha256 (64 chars), déterministe", () => {
    const h = computeSelfHash(null, baseRecord);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(computeSelfHash(null, baseRecord)).toBe(h);
  });

  it("vecteur connu : première ligne (prevHash null ⇒ chaîne vide)", () => {
    expect(computeSelfHash(null, baseRecord)).toBe(
      "f6a76a79c7fbde644b15189b551e5a6721203baba940f34973ceb23cc3b5c3e5",
    );
  });

  it("vecteur connu : deuxième maillon chaîné sur le premier", () => {
    const h1 = computeSelfHash(null, baseRecord);
    const h2 = computeSelfHash(h1, {
      workspaceId: "w1",
      actorId: "u1",
      action: "pillar.amend",
      entity: "Pillar",
      entityId: "p1",
      payload: { key: "A" },
    });
    expect(h2).toBe("d3504d9683223e36bd465a7b0e4fb4eed6fa7e4b36a08e1c7a4c80fdcfe2d08e");
  });

  it("changer le prevHash change le selfHash (le chaînage est réel)", () => {
    const h = computeSelfHash(null, baseRecord);
    const forked = computeSelfHash("a".repeat(64), baseRecord);
    expect(forked).not.toBe(h);
  });

  it("changer n'importe quel champ du record change le selfHash", () => {
    const h = computeSelfHash(null, baseRecord);
    expect(computeSelfHash(null, { ...baseRecord, action: "user.login" })).not.toBe(h);
    expect(computeSelfHash(null, { ...baseRecord, actorId: "u9" })).not.toBe(h);
    expect(computeSelfHash(null, { ...baseRecord, payload: { a: 1 } })).not.toBe(h);
  });

  it("normalise undefined → null : même hash que la ligne relue depuis la DB", () => {
    const fromCall = computeSelfHash(null, {
      workspaceId: "w1",
      actorId: undefined as unknown as null, // à l'écriture, champ omis
      action: "user.register",
      entity: undefined as unknown as null,
      entityId: undefined as unknown as null,
      payload: undefined,
    });
    // …et à la relecture DB, tout est null : le hash doit re-matcher.
    expect(fromCall).toBe(computeSelfHash(null, baseRecord));
  });

  it("l'ordre des clés du payload est canonisé — pas de faux positif de falsification", () => {
    const h1 = computeSelfHash(null, { ...baseRecord, payload: { a: 1, b: 2 } });
    const h2 = computeSelfHash(null, { ...baseRecord, payload: { b: 2, a: 1 } });
    expect(h1).toBe(h2);
  });
});

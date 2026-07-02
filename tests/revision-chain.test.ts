import { describe, expect, it } from "vitest";
import { computeSelfHash } from "@/server/audit-hash";
import { verifyRevisionChain, type ChainRevisionInput } from "@/server/brand";

/**
 * Vérification de la chaîne de hash des PillarRevision — le calcul est RÉEL :
 * on reconstruit ici des chaînes avec les formats d'enregistrement exacts des
 * écrivains du produit (funnel intake v1, brand operator_amend/rtis_refresh,
 * ai apply-draft), puis on vérifie que `verifyRevisionChain` les valide, et
 * qu'une falsification (contenu réécrit, chaînage cassé) est détectée.
 */

const WORKSPACE = "ws_test";
const PILLAR_ID = "pillar_a_test";

function at(minutes: number): Date {
  return new Date(Date.UTC(2026, 6, 1, 12, minutes));
}

/** Chaîne saine de 3 révisions : intake (v1) → operator_amend (v2) → ai_draft (v3). */
function makeValidChain(): ChainRevisionInput[] {
  const v1Content = { nomMarque: "Wafu", secteur: "FMCG" };
  const v1Self = computeSelfHash(null, {
    workspaceId: WORKSPACE,
    actorId: "user_1",
    action: "pillar.revision", // format funnel.ts (seed intake)
    entity: "Pillar",
    entityId: PILLAR_ID,
    payload: { version: 1, reason: "intake", content: v1Content },
  });

  const v2Content = { ...v1Content, archetype: "Créateur" };
  const v2Self = computeSelfHash(v1Self, {
    workspaceId: WORKSPACE,
    actorId: "user_1",
    action: "pillar.operator_amend", // format brand.ts (writePillarWithRevision)
    entity: "Pillar",
    entityId: PILLAR_ID,
    payload: { key: "A", version: 2, content: v2Content },
  });

  const v3Content = { ...v2Content, description: "Marque de boissons artisanales." };
  const v3Self = computeSelfHash(v2Self, {
    workspaceId: WORKSPACE,
    actorId: "user_2",
    action: "pillar.ai_draft", // format server/ai/apply-draft.ts
    entity: "Pillar",
    entityId: PILLAR_ID,
    payload: { key: "A", version: 3, content: v3Content },
  });

  return [
    {
      version: 1,
      reason: "intake",
      actorId: "user_1",
      content: v1Content,
      prevHash: null,
      selfHash: v1Self,
      createdAt: at(0),
    },
    {
      version: 2,
      reason: "operator_amend",
      actorId: "user_1",
      content: v2Content,
      prevHash: v1Self,
      selfHash: v2Self,
      createdAt: at(5),
    },
    {
      version: 3,
      reason: "ai_draft",
      actorId: "user_2",
      content: v3Content,
      prevHash: v2Self,
      selfHash: v3Self,
      createdAt: at(10),
    },
  ];
}

function verify(revisions: ChainRevisionInput[]) {
  return verifyRevisionChain({
    pillarId: PILLAR_ID,
    pillarKey: "A",
    workspaceId: WORKSPACE,
    revisions,
  });
}

describe("verifyRevisionChain — chaîne saine", () => {
  it("valide les 3 formats d'écrivain (intake, operator_amend, ai_draft)", () => {
    const result = verify(makeValidChain());
    expect(result.status).toBe("OK");
    expect(result.firstBreak).toBeNull();
    expect(result.revisionCount).toBe(3);
    expect(result.byRevision.map((r) => r.status)).toEqual(["ok", "ok", "ok"]);
  });

  it("l'ordre d'entrée ne compte pas (tri interne par version)", () => {
    const chain = makeValidChain();
    const shuffled = [chain[2]!, chain[0]!, chain[1]!];
    expect(verify(shuffled).status).toBe("OK");
  });

  it("chaîne vide → VIDE", () => {
    const result = verify([]);
    expect(result.status).toBe("VIDE");
    expect(result.revisionCount).toBe(0);
  });
});

describe("verifyRevisionChain — falsifications détectées", () => {
  it("contenu réécrit a posteriori → hash_mismatch sur la révision touchée", () => {
    const chain = makeValidChain();
    chain[1] = { ...chain[1]!, content: { nomMarque: "Wafu", archetype: "FALSIFIÉ" } };
    const result = verify(chain);
    expect(result.status).toBe("RUPTURE");
    expect(result.firstBreak).toEqual({ version: 2, kind: "hash_mismatch" });
    // Les autres révisions restent individuellement saines (chaînage DB intact).
    expect(result.byRevision).toEqual([
      { version: 1, status: "ok" },
      { version: 2, status: "hash_mismatch" },
      { version: 3, status: "ok" },
    ]);
  });

  it("acteur réécrit a posteriori → hash_mismatch (l'acteur est signé)", () => {
    const chain = makeValidChain();
    chain[2] = { ...chain[2]!, actorId: "user_pirate" };
    const result = verify(chain);
    expect(result.status).toBe("RUPTURE");
    expect(result.firstBreak).toEqual({ version: 3, kind: "hash_mismatch" });
  });

  it("chaînage réécrit (prevHash ne pointe plus la révision précédente) → broken_link", () => {
    const chain = makeValidChain();
    chain[2] = { ...chain[2]!, prevHash: "0".repeat(64) };
    const result = verify(chain);
    expect(result.status).toBe("RUPTURE");
    expect(result.firstBreak).toEqual({ version: 3, kind: "broken_link" });
  });

  it("révision supprimée au milieu → broken_link sur la suivante", () => {
    const chain = makeValidChain();
    const truncated = [chain[0]!, chain[2]!]; // v2 effacée
    const result = verify(truncated);
    expect(result.status).toBe("RUPTURE");
    expect(result.firstBreak).toEqual({ version: 3, kind: "broken_link" });
  });

  it("reason réécrite a posteriori → hash_mismatch (le format signé change)", () => {
    const chain = makeValidChain();
    chain[1] = { ...chain[1]!, reason: "rtis_refresh" };
    const result = verify(chain);
    expect(result.status).toBe("RUPTURE");
    expect(result.firstBreak).toEqual({ version: 2, kind: "hash_mismatch" });
  });
});

describe("verifyRevisionChain — révisions non signées (invérifiables, pas falsifiées)", () => {
  it("selfHash null sans rupture → NON_SIGNEE", () => {
    const v1Content = { nomMarque: "Wafu" };
    const chain: ChainRevisionInput[] = [
      {
        version: 1,
        reason: "import",
        actorId: null,
        content: v1Content,
        prevHash: null,
        selfHash: null, // écrivain hypothétique sans signature
        createdAt: at(0),
      },
    ];
    const result = verify(chain);
    expect(result.status).toBe("NON_SIGNEE");
    expect(result.firstBreak).toBeNull();
    expect(result.byRevision).toEqual([{ version: 1, status: "unsigned" }]);
  });

  it("après une révision non signée, la suivante chaîne sur null (comportement écrivain réel)", () => {
    const v2Content = { nomMarque: "Wafu", archetype: "Créateur" };
    const v2Self = computeSelfHash(null, {
      workspaceId: WORKSPACE,
      actorId: "user_1",
      action: "pillar.operator_amend",
      entity: "Pillar",
      entityId: PILLAR_ID,
      payload: { key: "A", version: 2, content: v2Content },
    });
    const chain: ChainRevisionInput[] = [
      {
        version: 1,
        reason: "import",
        actorId: null,
        content: { nomMarque: "Wafu" },
        prevHash: null,
        selfHash: null,
        createdAt: at(0),
      },
      {
        version: 2,
        reason: "operator_amend",
        actorId: "user_1",
        content: v2Content,
        prevHash: null, // l'écrivain a lu selfHash null → prevHash null
        selfHash: v2Self,
        createdAt: at(5),
      },
    ];
    const result = verify(chain);
    expect(result.status).toBe("NON_SIGNEE");
    expect(result.byRevision).toEqual([
      { version: 1, status: "unsigned" },
      { version: 2, status: "ok" },
    ]);
  });
});

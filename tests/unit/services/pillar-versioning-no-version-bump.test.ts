/**
 * pillar-versioning — `createVersion` NE bumpe JAMAIS `Pillar.currentVersion`
 * (round-13a, régression CRITIQUE).
 *
 * Contexte : `createVersion` tourne sur le client `db` GLOBAL, hors de la tx
 * interactive du pillar-gateway (cf. pillar-gateway/index.ts:324-325). S'il bumpe
 * `currentVersion` (N→N+1), ce bump committe sur une connexion SÉPARÉE AVANT le
 * persist conditionnel du gateway (`updateMany where currentVersion = N` — verrou
 * optimiste posé round-12). Sous READ COMMITTED, le persist re-snapshotte la ligne
 * déjà à N+1 → matche 0 ligne → `count !== 1` → throw PILLAR_VERSION_CONFLICT →
 * TOUTE écriture pilier gouvernée (intake, OPERATOR_AMEND, cascade RTIS, rollback,
 * Oracle) échoue sur un vrai Postgres. Invisible en CI (DB stub `postgresql://stub`,
 * tx mockée dans les tests d'intégration) — d'où ce test comportemental qui
 * verrouille l'invariant : createVersion ne fait QUE créer la PillarVersion.
 *
 * Le SEUL à bumper `currentVersion` sur le chemin gateway est le persist atomique
 * du gateway lui-même (verrou optimiste réel). La restauration y converge (ADR-0207).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const pillarFindUnique = vi.fn();
const pillarUpdate = vi.fn();
const versionCreate = vi.fn();
const gateway = vi.hoisted(() => vi.fn());
vi.mock("@/server/services/pillar-gateway", () => ({ writePillarAndScore: gateway }));

vi.mock("@/lib/db", () => ({
  db: {
    pillar: {
      findUnique: (...a: unknown[]) => pillarFindUnique(...a),
      findUniqueOrThrow: (...a: unknown[]) => pillarFindUnique(...a),
      update: (...a: unknown[]) => pillarUpdate(...a),
    },
    pillarVersion: {
      create: (...a: unknown[]) => versionCreate(...a),
    },
  },
}));

import { createVersion, rollback } from "@/server/services/pillar-versioning";

beforeEach(() => {
  pillarFindUnique.mockReset();
  pillarUpdate.mockReset();
  versionCreate.mockReset();
  gateway.mockReset();
  gateway.mockResolvedValue({ success: true, version: 4 });
  pillarFindUnique.mockResolvedValue({ id: "p1", strategyId: "s1", key: "v", currentVersion: 3, content: { a: 1 } });
  versionCreate.mockResolvedValue({ id: "v-new" });
  pillarUpdate.mockResolvedValue({});
});

describe("createVersion — n'écrit jamais Pillar.currentVersion (round-13a)", () => {
  it("crée la PillarVersion mais ne touche PAS la ligne Pillar (pas de bump hors gateway)", async () => {
    const id = await createVersion({ pillarId: "p1", content: { a: 2 } });
    expect(id).toBe("v-new");
    expect(versionCreate).toHaveBeenCalledTimes(1);
    // Invariant : un bump ici casserait le verrou optimiste du gateway sur un vrai
    // Postgres (cf. en-tête). createVersion ne doit JAMAIS écrire Pillar.
    expect(pillarUpdate).not.toHaveBeenCalled();
  });

  it("snapshotte le contenu PRÉ-écriture au numéro de version courant", async () => {
    await createVersion({ pillarId: "p1", content: { a: 2 } });
    expect(versionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ pillarId: "p1", version: 3, content: { a: 1 } }),
      }),
    );
  });
});

describe("rollback — gateway owns the only version bump (ADR-0207)", () => {
  it("routes the authenticated history action to the checkpoint gateway without a bare write", async () => {
    await rollback("p1", "v-old", "op-1", "undo-emission");
    expect(gateway).toHaveBeenCalledWith({ strategyId: "s1", pillarKey: "v",
      operation: { type: "RESTORE_VERSION", versionId: "v-old" },
      author: { system: "OPERATOR", userId: "op-1", intentId: "undo-emission", reason: "Compensation de la version v-old" },
      options: { expectedVersion: 3 } });
    expect(pillarUpdate).not.toHaveBeenCalled();
    expect(versionCreate).not.toHaveBeenCalled();
  });
});

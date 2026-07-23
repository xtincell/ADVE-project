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
 * du gateway lui-même (verrou optimiste réel). Les callers hors gateway
 * (`rollback` ci-dessous) bumpent EXPLICITEMENT.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const pillarFindUnique = vi.fn();
const pillarUpdate = vi.fn();
const versionCreate = vi.fn();
const versionFindUniqueOrThrow = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    pillar: {
      findUnique: (...a: unknown[]) => pillarFindUnique(...a),
      update: (...a: unknown[]) => pillarUpdate(...a),
    },
    pillarVersion: {
      create: (...a: unknown[]) => versionCreate(...a),
      findUniqueOrThrow: (...a: unknown[]) => versionFindUniqueOrThrow(...a),
    },
  },
}));

import { createVersion, rollback } from "@/server/services/pillar-versioning";

beforeEach(() => {
  pillarFindUnique.mockReset();
  pillarUpdate.mockReset();
  versionCreate.mockReset();
  versionFindUniqueOrThrow.mockReset();
  pillarFindUnique.mockResolvedValue({ id: "p1", currentVersion: 3, content: { a: 1 } });
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

describe("rollback — avance explicitement currentVersion (round-13a)", () => {
  it("restaure l'ancien contenu ET incrémente currentVersion (createVersion ne le fait plus)", async () => {
    versionFindUniqueOrThrow.mockResolvedValue({
      id: "v-old",
      pillarId: "p1",
      version: 1,
      content: { restored: true },
    });
    await rollback("p1", "v-old", "op-1");
    // Le seul db.pillar.update du chemin rollback : restaure le contenu + bump.
    expect(pillarUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({
          content: { restored: true },
          currentVersion: { increment: 1 },
        }),
      }),
    );
  });
});

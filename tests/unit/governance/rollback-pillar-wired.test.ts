/**
 * HARD — le compensateur ROLLBACK_PILLAR est CÂBLÉ et RESTAURE réellement (G, ADR-0176).
 *
 * Ferme le trou « déclaré mais jamais câblé » pour la Loi 1 (conservation
 * d'altitude) : ROLLBACK_PILLAR était mappé dans COMPENSATING_MAP + catalogué,
 * mais SANS handler → le bouton « Compenser » n'enregistrait qu'une ligne
 * d'audit (executed:false). Ce test prouve : déclaré + SLO + compensateur de
 * WRITE_PILLAR + dispatché (case existant, ne renvoie pas undefined) + le
 * handler restaure via le gateway (contenu pré-écriture) OU refuse honnêtement.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  pillarFindUnique: vi.fn(),
  pvFindMany: vi.fn(),
  intentEmissionFindUnique: vi.fn(),
  writePillarAndScore: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    pillar: { findUnique: mocks.pillarFindUnique },
    pillarVersion: { findMany: mocks.pvFindMany },
    intentEmission: { findUnique: mocks.intentEmissionFindUnique },
  },
}));
vi.mock("@/server/services/pillar-gateway/index", () => ({
  writePillarAndScore: mocks.writePillarAndScore,
}));

vi.mock("@/server/services/operator-isolation", () => ({
  getOperatorContext: vi.fn(async () => ({ userId: "op-1", role: "ADMIN", operatorId: "operator-1" })),
  canAccessStrategy: vi.fn(async () => true),
}));
vi.mock("@/server/governance/collaborator-firewall", () => ({ assertCollaboratorMayEmit: vi.fn(async () => {}) }));

import { rollbackPillar, restoreRefusal } from "@/server/services/pillar-gateway/rollback";
import { buildCompensatingIntent, COMPENSATING_MAP } from "@/server/governance/compensating-intents";
import { intentTouchesPillars } from "@/server/services/mestor/intents";
import { intentKindExists } from "@/server/governance/intent-kinds";
import { SLO_BY_KIND } from "@/server/governance/slos";
import { readFileSync } from "node:fs";
import { join } from "node:path";

beforeEach(() => vi.clearAllMocks());

describe("ROLLBACK_PILLAR — câblé (HARD, ADR-0176)", () => {
  it("déclaré au catalogue + SLO apparié + compensateur de WRITE_PILLAR", () => {
    expect(intentKindExists("ROLLBACK_PILLAR")).toBe(true);
    expect(SLO_BY_KIND.has("ROLLBACK_PILLAR")).toBe(true);
    expect(COMPENSATING_MAP.WRITE_PILLAR).toBe("ROLLBACK_PILLAR");
  });

  it("dispatché : intentTouchesPillars renvoie le pilier ciblé (case existant, pas de default)", () => {
    const touched = intentTouchesPillars({
      kind: "ROLLBACK_PILLAR",
      strategyId: "s1",
      key: "D",
      compensatedFrom: "int-1",
      reason: "test",
    } as Parameters<typeof intentTouchesPillars>[0]);
    expect(touched).toEqual(["d"]);
  });

  it("governance.compensate DISPATCHE ROLLBACK_PILLAR (pas un no-op audit-only)", () => {
    const src = readFileSync(
      join(__dirname, "..", "..", "..", "src/server/trpc/routers/governance.ts"),
      "utf8",
    );
    expect(src).toMatch(/DISPATCHABLE_COMPENSATORS[\s\S]*ROLLBACK_PILLAR/);
  });
});

describe("buildCompensatingIntent — propage le pilier depuis WRITE_PILLAR (ADR-0176)", () => {
  it("le reverseIntent ROLLBACK_PILLAR porte `key` du payload d'origine", async () => {
    mocks.intentEmissionFindUnique.mockResolvedValue({
      id: "int-1",
      intentKind: "WRITE_PILLAR",
      payload: { strategyId: "s1", key: "d", content: { promesseMaitre: "x" } },
      strategyId: "s1",
      status: "OK",
    });
    const built = await buildCompensatingIntent({ originalIntentId: "int-1", reason: "erreur", userId: "op-1" });
    expect(built.reverseKind).toBe("ROLLBACK_PILLAR");
    expect((built.reverseIntent as unknown as { key?: string }).key).toBe("d");
    expect((built.reverseIntent as unknown as { compensatedFrom?: string }).compensatedFrom).toBe("int-1");
  });
});

describe("rollbackPillar — restaure réellement OU refuse honnêtement (ADR-0176)", () => {
  it("instantané pré-écriture trouvé → demande une compensation ciblée via le GATEWAY", async () => {
    mocks.pillarFindUnique.mockResolvedValue({ id: "pil-d", currentVersion: 5 });
    mocks.pvFindMany.mockResolvedValue([{ id: "version-4", version: 4 }]);
    mocks.writePillarAndScore.mockResolvedValue({ success: true });

    const r = await rollbackPillar({
      strategyId: "s1",
      pillarKey: "D",
      compensatedFrom: "int-1",
      operatorId: "op-1",
      intentId: "undo-1",
      reason: "erreur de saisie",
    });

    expect(r.restored).toBe(true);
    expect(r.restoredFromVersion).toBe(4);
    // La restauration passe par le gateway (C5) — jamais un bare Pillar.content.
    expect(mocks.writePillarAndScore).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyId: "s1",
        pillarKey: "d",
        operation: { type: "RESTORE_VERSION", versionId: "version-4", compensatedFrom: "int-1" },
        author: expect.objectContaining({ intentId: "undo-1", userId: "op-1" }),
        options: { expectedVersion: 5 },
      }),
    );
  });

  it("aucun instantané lié → REFUS honnête (pas de restauration à l'aveugle)", async () => {
    mocks.pillarFindUnique.mockResolvedValue({ id: "pil-d", currentVersion: 5 });
    mocks.pvFindMany.mockResolvedValue([]); // écriture antérieure au suivi intentId

    const r = await rollbackPillar({
      strategyId: "s1",
      pillarKey: "D",
      compensatedFrom: "int-old",
      reason: "x",
    });

    expect(r.restored).toBe(false);
    expect(r.reason).toMatch(/précise indisponible/i);
    expect(mocks.writePillarAndScore).not.toHaveBeenCalled();
  });

  it("pilier introuvable → refus typé 404, aucune écriture", async () => {
    mocks.pillarFindUnique.mockResolvedValue(null);
    const r = await rollbackPillar({ strategyId: "s1", pillarKey: "D", compensatedFrom: "int-1", reason: "x" });
    expect(r).toMatchObject({ restored: false, refusal: "NOT_FOUND" });
    expect(mocks.writePillarAndScore).not.toHaveBeenCalled();
  });

  it("action d'historique : même restaurateur, archive choisie, aucune écriture brute (ADR-0207)", async () => {
    mocks.pillarFindUnique.mockResolvedValue({ id: "pil-v", currentVersion: 3 });
    mocks.writePillarAndScore.mockResolvedValue({ success: true, version: 4 });
    const r = await rollbackPillar({ strategyId: "s1", pillarKey: "V", versionId: "v-old", operatorId: "op-1", intentId: "undo-1", reason: "historique" });
    expect(r).toMatchObject({ restored: true, alreadyRecorded: false, version: 4 });
    expect(mocks.pvFindMany).not.toHaveBeenCalled();
    expect(mocks.writePillarAndScore).toHaveBeenCalledWith(expect.objectContaining({
      strategyId: "s1", pillarKey: "v", operation: { type: "RESTORE_VERSION", versionId: "v-old" },
      author: expect.objectContaining({ system: "OPERATOR", userId: "op-1", intentId: "undo-1" }), options: { expectedVersion: 3 },
    }));
  });

  it("exactement une cible : écriture ou archive", async () => {
    for (const target of [{}, { compensatedFrom: "int-1", versionId: "v-old" }]) {
      const r = await rollbackPillar({ strategyId: "s1", pillarKey: "V", reason: "x", ...target });
      expect(r).toMatchObject({ restored: false, refusal: "PRECONDITION_FAILED" });
    }
    expect(mocks.pillarFindUnique).not.toHaveBeenCalled();
    expect(mocks.writePillarAndScore).not.toHaveBeenCalled();
  });

  it("refus du gateway rendus avec le même code par toutes les surfaces", () => {
    expect(restoreRefusal("RESTORE_ACCESS_REFUSED")).toBe("FORBIDDEN");
    expect(restoreRefusal("RESTORE_ACCESS_REFUSED: Votre rôle sur cette marque est en lecture seule")).toBe("FORBIDDEN");
    expect(restoreRefusal("RESTORE_EMISSION_REQUIRED: intention introuvable")).toBe("FORBIDDEN");
    expect(restoreRefusal("RESTORE_ARCHIVE_UNAVAILABLE: archive étrangère ou absente.")).toBe("NOT_FOUND");
    expect(restoreRefusal("RESTORE_PILLAR_NOT_FOUND: pilier V introuvable")).toBe("NOT_FOUND");
    for (const conflict of ["RESTORE_CONFLICT: content.x", "PILLAR_VERSION_CONFLICT: x", "RESTORE_CHECKPOINT_UNAVAILABLE: x",
      "RESTORE_AMBIGUOUS: x", "RESTORE_ARCHIVE_UNLINKED: x", "SOURCE_CHANGED: x"]) {
      expect(restoreRefusal(conflict)).toBe("PRECONDITION_FAILED");
    }
  });
});

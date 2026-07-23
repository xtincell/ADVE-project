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
  pvFindFirst: vi.fn(),
  intentEmissionFindUnique: vi.fn(),
  writePillarAndScore: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    pillar: { findUnique: mocks.pillarFindUnique },
    pillarVersion: { findFirst: mocks.pvFindFirst },
    intentEmission: { findUnique: mocks.intentEmissionFindUnique },
  },
}));
vi.mock("@/server/services/pillar-gateway/index", () => ({
  writePillarAndScore: mocks.writePillarAndScore,
}));

import { rollbackPillar } from "@/server/services/pillar-gateway/rollback";
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
    const built = await buildCompensatingIntent({ originalIntentId: "int-1", reason: "erreur" });
    expect(built.reverseKind).toBe("ROLLBACK_PILLAR");
    expect((built.reverseIntent as unknown as { key?: string }).key).toBe("d");
    expect((built.reverseIntent as unknown as { compensatedFrom?: string }).compensatedFrom).toBe("int-1");
  });
});

describe("rollbackPillar — restaure réellement OU refuse honnêtement (ADR-0176)", () => {
  it("instantané pré-écriture trouvé → réécrit le contenu antérieur via le GATEWAY", async () => {
    mocks.pillarFindUnique.mockResolvedValue({ id: "pil-d" });
    mocks.pvFindFirst.mockResolvedValue({ content: { promesseMaitre: "ancienne" }, version: 4 });
    mocks.writePillarAndScore.mockResolvedValue({ success: true });

    const r = await rollbackPillar({
      strategyId: "s1",
      pillarKey: "D",
      compensatedFrom: "int-1",
      operatorId: "op-1",
      reason: "erreur de saisie",
    });

    expect(r.restored).toBe(true);
    expect(r.restoredFromVersion).toBe(4);
    // La restauration passe par le gateway (C5) — jamais un bare Pillar.content.
    expect(mocks.writePillarAndScore).toHaveBeenCalledWith(
      expect.objectContaining({
        strategyId: "s1",
        pillarKey: "d",
        operation: { type: "REPLACE_FULL", content: { promesseMaitre: "ancienne" } },
      }),
    );
  });

  it("aucun instantané lié → REFUS honnête (pas de restauration à l'aveugle)", async () => {
    mocks.pillarFindUnique.mockResolvedValue({ id: "pil-d" });
    mocks.pvFindFirst.mockResolvedValue(null); // écriture antérieure au suivi intentId

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

  it("pilier introuvable → refus, aucune écriture", async () => {
    mocks.pillarFindUnique.mockResolvedValue(null);
    const r = await rollbackPillar({ strategyId: "s1", pillarKey: "D", compensatedFrom: "int-1", reason: "x" });
    expect(r.restored).toBe(false);
    expect(mocks.writePillarAndScore).not.toHaveBeenCalled();
  });
});

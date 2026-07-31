/**
 * Garde d'entrée du registre de marques (V2 « debt free », 2026-07-31).
 *
 * Le registre public a hébergé `<script>alert(1)</script>`, RateLimitProbe1-8,
 * NeferRL1-5, un nom vide et « a » — purgés le même jour (48 → 5 lignes).
 * Cette garde ferme le FLUX : le stock propre ne se repollue pas.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: { brandFootprintSnapshot: { create: vi.fn().mockResolvedValue(null) } },
}));

import { recordFootprintObservation } from "@/server/services/seshat/brand-registry";
import { db } from "@/lib/db";

const base = { total: 15, measuredWeight: 20, dimensions: [] as unknown[] };

describe("recordFootprintObservation — garde d'entrée", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["", "vide"],
    ["a", "1 caractère"],
    ["<script>alert(1)</script>", "balisage HTML"],
    ["RateLimitProbe3", "sonde de rate-limit"],
    ["NeferRL2", "sonde NEFER"],
    ["ZzTestNeferInexistant", "sonde ZzTest"],
    ["GoldenPath Brand 2026-07-31", "création du script E2E"],
  ])("refuse le nom-sonde %j (%s) sans écrire", async (name) => {
    const out = await recordFootprintObservation({ ...base, name } as Parameters<typeof recordFootprintObservation>[0]);
    expect(out).toBeNull();
    expect(db.brandFootprintSnapshot.create).not.toHaveBeenCalled();
  });

  it("laisse passer un vrai nom de marque, même exotique", async () => {
    // La garde refuse l'évident, jamais le douteux.
    await recordFootprintObservation({ ...base, name: "Kmer Chan" } as Parameters<typeof recordFootprintObservation>[0]);
    await recordFootprintObservation({ ...base, name: "Ño & Fils" } as Parameters<typeof recordFootprintObservation>[0]);
    expect(db.brandFootprintSnapshot.create).toHaveBeenCalledTimes(2);
  });
});

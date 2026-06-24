/**
 * ADR-0105 — Market kill-switch read-filter (étanchéité enfant-par-enfant).
 *
 * Vérifie le résolveur de visibilité + le Proxy `marketScopedDb` sans DB réelle
 * (fakes injectés). Le périmètre/axe par modèle est dérivé du DMMF Prisma au
 * chargement → ce test s'exécute en CI (client généré présent).
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { marketScopedDb } from "@/server/governance/market-scoped-db";
import { invalidateMarketVisibility } from "@/server/services/market-visibility";

type FakeOpts = {
  invisible?: string[];
  strategies?: string[];
  clients?: string[];
  campaigns?: string[];
  missions?: string[];
  brandNodes?: string[];
};

function makeFake(opts: FakeOpts) {
  const data: Record<string, unknown[]> = {
    country: (opts.invisible ?? []).map((code) => ({ code })),
    strategy: (opts.strategies ?? []).map((id) => ({ id })),
    client: (opts.clients ?? []).map((id) => ({ id })),
    campaign: (opts.campaigns ?? []).map((id) => ({ id })),
    mission: (opts.missions ?? []).map((id) => ({ id })),
    brandNode: (opts.brandNodes ?? []).map((id) => ({ id })),
  };
  const seen: Record<string, unknown[]> = {};
  const delegate = (model: string) => ({
    findMany: vi.fn((args: unknown = {}) => {
      (seen[model] ??= []).push(args);
      return Promise.resolve(data[model] ?? []);
    }),
  });
  const fake = {
    __seen: seen,
  } as Record<string, unknown> & { __seen: Record<string, unknown[]> };
  for (const m of ["country", "strategy", "client", "campaign", "mission", "brandNode", "pillar", "brandAsset"]) {
    fake[m] = delegate(m);
  }
  return fake;
}

function lastWhere(fake: ReturnType<typeof makeFake>, model: string): Record<string, unknown> {
  const calls = fake.__seen[model] as { where?: Record<string, unknown> }[] | undefined;
  return (calls?.at(-1)?.where ?? {}) as Record<string, unknown>;
}

beforeEach(() => invalidateMarketVisibility());

describe("ADR-0105 market kill-switch — read filter", () => {
  it("ADMIN bypasse → client brut (la console voit les marchés neutralisés)", async () => {
    const fake = makeFake({ invisible: ["WK"], strategies: ["s1"] });
    const scoped = await marketScopedDb(fake as never, true);
    expect(scoped).toBe(fake);
  });

  it("aucun marché neutralisé → client brut (fast path, zéro surcoût)", async () => {
    const fake = makeFake({ invisible: [] });
    const scoped = await marketScopedDb(fake as never, false);
    expect(scoped).toBe(fake);
  });

  it("marché shadowbanné → lecture enfant exclut les strategyIds (en préservant les null + le where appelant)", async () => {
    const fake = makeFake({ invisible: ["WK"], strategies: ["s1", "s2"] });
    const scoped = (await marketScopedDb(fake as never, false)) as unknown as Record<string, { findMany: (a: unknown) => Promise<unknown> }>;
    await scoped.pillar!.findMany({ where: { foo: 1 } });

    const where = lastWhere(fake, "pillar");
    const serialized = JSON.stringify(where);
    expect(serialized).toContain("notIn");
    expect(serialized).toContain("s1");
    expect(serialized).toContain("s2");
    // le where appelant est préservé sous AND
    expect((where.AND as unknown[])?.[0]).toEqual({ foo: 1 });
    // null préservé (les lignes sans marché restent visibles)
    expect(serialized).toContain("null");
  });

  it("modèle racine (strategy) filtré par son propre id ∈ ensemble résolu", async () => {
    const fake = makeFake({ invisible: ["WK"], strategies: ["s1"] });
    const scoped = (await marketScopedDb(fake as never, false)) as unknown as Record<string, { findMany: (a: unknown) => Promise<unknown> }>;
    await scoped.strategy!.findMany({});

    const serialized = JSON.stringify(lastWhere(fake, "strategy"));
    expect(serialized).toContain("s1");
    expect(serialized).toContain("notIn");
    // racine filtrée par id (pas par code pays — immunité aux noms d'affichage)
    expect(serialized).toContain("id");
  });
});

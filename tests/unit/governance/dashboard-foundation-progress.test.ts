import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fillStrategy: vi.fn(),
  db: {
    strategy: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn() },
    pillar: { findMany: vi.fn(), count: vi.fn() },
    socialConnection: { count: vi.fn() },
    brandAsset: { count: vi.fn() },
    brandAction: { count: vi.fn() },
    knowledgeEntry: { count: vi.fn() },
    signal: { findMany: vi.fn() },
    devotionSnapshot: { findMany: vi.fn() },
    cultIndexSnapshot: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/server/trpc/init", async () => {
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC.context<any>().create();
  return { createTRPCRouter: t.router, protectedProcedure: t.procedure, operatorProcedure: t.procedure };
});
vi.mock("@/server/governance/governed-procedure", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { governedProcedure: ({ inputSchema }: any) => protectedProcedure.input(inputSchema) };
});
vi.mock("@/server/services/pillar-maturity/auto-filler", () => ({ fillStrategyToStage: mocks.fillStrategy }));
vi.mock("@/server/trpc/middleware/strategy-scope", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { strategyScopedProcedure: protectedProcedure };
});
vi.mock("@/server/services/operator-isolation", () => ({
  getOperatorContext: vi.fn().mockResolvedValue({}),
  canAccessStrategy: vi.fn().mockResolvedValue(false),
}));

import { cockpitRouter } from "@/server/trpc/routers/cockpit-router";
import { pillarRouter } from "@/server/trpc/routers/pillar";
import { generateInsights } from "@/server/services/mestor/insights";
import { ADVE_KEYS, ADVE_STORAGE_KEYS, RTIS_STORAGE_KEYS } from "@/domain";

const partial = [
  { key: "a", content: { nomMarque: "Recette", publicCible: "Dirigeants de TPE" } },
  { key: "d", content: { promesseMaitre: "Un espace de travail clair." } },
].map((p) => ({ ...p, validationStatus: "DRAFT", updatedAt: new Date() }));

function caller(userId = "owner") {
  return cockpitRouter.createCaller({ db: mocks.db, session: { user: { id: userId, role: "USER" } } } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.fillStrategy.mockResolvedValue([]);
  mocks.db.strategy.findUnique.mockResolvedValue({ id: "brand", userId: "owner", marketScale: null });
  mocks.db.strategy.findUniqueOrThrow.mockResolvedValue({ id: "brand", drivers: [], missions: [], advertis_vector: null });
  mocks.db.pillar.findMany.mockResolvedValue(partial);
  mocks.db.pillar.count.mockResolvedValue(0);
  for (const table of [mocks.db.socialConnection, mocks.db.brandAsset, mocks.db.brandAction, mocks.db.knowledgeEntry]) table.count.mockResolvedValue(0);
  for (const table of [mocks.db.signal, mocks.db.devotionSnapshot, mocks.db.cultIndexSnapshot]) table.findMany.mockResolvedValue([]);
});

describe("dashboard reflects canonical foundation progress", () => {
  it("Enrichir ADVE does not launch the separate derived strategy cascade", async () => {
    await pillarRouter.createCaller({ db: mocks.db, session: { user: { id: "owner", role: "ADMIN" } } } as any)
      .autoFillAll({ strategyId: "brand" });
    expect(mocks.fillStrategy).toHaveBeenCalledWith("brand", "COMPLETE", ADVE_STORAGE_KEYS);
    const scope = mocks.fillStrategy.mock.calls[0]?.[2] as readonly string[];
    for (const key of RTIS_STORAGE_KEYS) expect(scope).not.toContain(key);
  });

  it("shows two started lower-case pillars without marking the foundation complete", async () => {
    const result = await caller().getActivationChecklist({ strategyId: "brand" });
    expect(result.items.find((item) => item.key === "pillars")).toMatchObject({
      detail: "2/4 piliers commencés · 0/4 complets.", done: false,
    });
  });

  it("four non-empty JSON objects cannot masquerade as a complete foundation", async () => {
    mocks.db.pillar.count.mockResolvedValue(4);
    mocks.db.pillar.findMany.mockResolvedValue(ADVE_KEYS.map((key) => ({ key, content: { placeholder: "x" }, validationStatus: "DRAFT" })));
    const result = await caller().getActivationChecklist({ strategyId: "brand" });
    expect(result.items.find((item) => item.key === "pillars")).toMatchObject({
      detail: "0/4 piliers commencés · 0/4 complets.", done: false,
    });
  });

  it("never equates partial content with no content in the insight shown to the owner", async () => {
    const result = await generateInsights("brand");
    const incomplete = result.find((item) => item.title.includes("incomplet"));
    expect(incomplete?.description).toContain("restent à compléter");
    expect(incomplete?.description).not.toContain("n'ont pas de contenu");
  });

  it("refuses a foreign strategy before loading its progress", async () => {
    await expect(caller("other-tenant").getActivationChecklist({ strategyId: "brand" })).rejects.toThrow("Cette marque ne vous appartient pas");
    expect(mocks.db.pillar.findMany).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
vi.mock("@/lib/db", () => ({ db: {} }));
import { applyRecipe } from "@/server/services/seshat/creative-intelligence";

const input = {
  strategyId: "brand-a", recipeId: "reviewed-recipe",
  applicationKey: "adcc2a60-7727-4cc1-b39f-ff97ab7e267a",
  hypothesis: "Le résultat immédiat améliore les vues", variant: "Gros plan produit",
  primaryMetric: "views" as const, baselineValue: 100, targetValue: 200,
  deadline: new Date("2099-01-01"),
};
function databaseWinner(changes: Record<string, unknown>) {
  const winner = { ...input, id: "race-winner", actionId: null, assetId: null, ...changes };
  const store = {
    recipeApplication: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue(winner) },
    knowledgeEntry: { findFirst: vi.fn().mockResolvedValue({ id: input.recipeId, data: {
      schema: "creative-recipe-v1", family: "family", revision: 1, visibility: "PUBLIC",
      reviewedBy: "editor", published: true, evaluation: {},
      context: { sector: "food", countryCode: "CI", platform: "TIKTOK", format: "SHORT_VIDEO", hook: "RESULT_FIRST", narrative: "TRANSFORMATION", visual: "MACRO", metric: "views", asOf: new Date() },
    } }) },
    strategy: { findUnique: vi.fn().mockResolvedValue({ countryCode: "CI" }) },
    country: { findUnique: vi.fn().mockResolvedValue({ status: "ACTIVE" }) },
  };
  return { winner, store: store as unknown as Prisma.TransactionClient };
}

describe("trial creation concurrent replay", () => {
  it.each([{ strategyId: "brand-b" }, { hypothesis: "Une autre hypothèse incompatible" }, { deadline: new Date("2099-02-01") }])("rejects an incompatible winner after the initial read missed it: %j", async changes => {
    const { store } = databaseWinner(changes);
    await expect(applyRecipe(input, store)).rejects.toThrow("Clé d'essai déjà utilisée");
  });
  it("returns the existing trial when a concurrent request is identical", async () => {
    const { winner, store } = databaseWinner({});
    await expect(applyRecipe(input, store)).resolves.toEqual(winner);
  });
});

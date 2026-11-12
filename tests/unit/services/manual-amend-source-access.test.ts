import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Context } from "@/server/trpc/context";

// init.ts loads an ambient augmentation as a runtime import. No NextAuth
// server is needed for a caller with the explicit fixture session below.
vi.mock("next-auth", () => ({}));

const h = vi.hoisted(() => ({
  user: { id: "operator-a-user", email: "operator-a@example.test", role: "USER", operatorId: "operator-a" as string | null },
  db: {
    user: { findUnique: vi.fn() },
    strategy: { findUnique: vi.fn() },
    strategyCollaborator: { findUnique: vi.fn() },
    pillar: { findUnique: vi.fn() },
  },
  emit: vi.fn(), preview: vi.fn(), source: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db: h.db }));
// Keep the actual session/operator middleware and canonical strategy access.
// Only unrelated governed procedures and model/persistence effects are replaced.
vi.mock("@/server/governance/governed-procedure", async () => {
  const { protectedProcedure } = await import("@/server/trpc/init");
  return { governedProcedure: ({ inputSchema }: { inputSchema: any }) => protectedProcedure.input(inputSchema) };
});
vi.mock("@/server/services/mestor/intents", () => ({ emitIntent: h.emit }));
vi.mock("@/server/services/utils/llm-structured", () => ({
  executeStructuredLLMCall: h.preview, LLMStructuredCallError: class extends Error {},
}));
vi.mock("@/server/services/ingestion-pipeline/source-usage", () => ({
  resolveBrandSource: h.source, listBrandSourceSummaries: vi.fn(),
  setSourceUse: vi.fn(), invalidateSourceDerivatives: vi.fn(),
}));

import { pillarRouter } from "@/server/trpc/routers/pillar";
import { ingestionRouter } from "@/server/trpc/routers/ingestion";

const context = () => ({ db: h.db, session: { user: h.user, expires: "2026-12-01" } }) as unknown as Context;
const input = { strategyId: "brand-a", pillarKey: "A" as const };
const operations = {
  fields: () => pillarRouter.createCaller(context()).listEditableFields(input),
  preview: () => pillarRouter.createCaller(context()).previewAmend({ ...input, field: "nomMarque", rephrasePrompt: "Nom proposé pour la recette" }),
  amend: () => pillarRouter.createCaller(context()).amend({ ...input, field: "nomMarque", mode: "PATCH_DIRECT", reason: "Correction explicite de recette", proposedValue: "Marque de recette", expectedVersion: 1 }),
};
beforeEach(() => {
  vi.clearAllMocks();
  h.user = { id: "operator-a-user", email: "operator-a@example.test", role: "USER", operatorId: "operator-a" };
  h.db.user.findUnique.mockImplementation(async () => h.user);
  h.db.strategy.findUnique.mockResolvedValue({ id: "brand-a", userId: "owner-a", operatorId: "operator-a" });
  h.db.strategyCollaborator.findUnique.mockResolvedValue(null);
  h.db.pillar.findUnique.mockResolvedValue({ content: { nomMarque: "Valeur privée" }, validationStatus: "DRAFT", currentVersion: 1 });
  h.preview.mockResolvedValue({ data: { proposedValue: "Nom proposé", advantages: [], disadvantages: [], confidence: 0.5 }, attempts: 1 });
  h.emit.mockResolvedValue({ status: "OK" });
  h.source.mockResolvedValue({ consumerStrategyId: "brand-a", contentHash: "a".repeat(64),
    source: { id: "document-a", fileName: "Brief de recette", rawContent: "Texte courant", certainty: "DECLARED", sourceType: "MANUAL_INPUT", origin: "UPLOAD" } });
});

describe("manual amendments preserve operator and document access", () => {
  it.each(Object.keys(operations) as Array<keyof typeof operations>)("refuses a foreign operator before %s reads, model work or intent emission", async (operation) => {
    h.user.operatorId = "operator-b";
    await expect(operations[operation]()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(h.db.pillar.findUnique).not.toHaveBeenCalled();
    expect(h.preview).not.toHaveBeenCalled(); expect(h.emit).not.toHaveBeenCalled();
  });
  it.each(Object.keys(operations) as Array<keyof typeof operations>)("does not grant the operator-only %s route to a founder", async (operation) => {
    h.user.operatorId = null;
    h.db.strategy.findUnique.mockResolvedValue({ userId: h.user.id, operatorId: null });
    await expect(operations[operation]()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(h.db.pillar.findUnique).not.toHaveBeenCalled(); expect(h.emit).not.toHaveBeenCalled();
  });
  it.each(["preview", "amend"] as const)("does not turn a foreign operator's read-only collaboration into %s authority", async (operation) => {
    h.user.operatorId = "operator-b";
    h.db.strategyCollaborator.findUnique.mockResolvedValue({ status: "ACTIVE", role: "ART_DIRECTOR" });
    await expect(operations[operation]()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(h.preview).not.toHaveBeenCalled(); expect(h.emit).not.toHaveBeenCalled();
    expect(h.db.pillar.findUnique).not.toHaveBeenCalled();
  });
  it("preserves a read-only operator collaborator's existing field reading", async () => {
    h.user.operatorId = "operator-b";
    h.db.strategyCollaborator.findUnique.mockResolvedValue({ status: "ACTIVE", role: "ART_DIRECTOR" });
    expect((await operations.fields()).fields.find(f => f.field === "nomMarque")?.currentValue).toBe("Valeur privée");
    expect(h.preview).not.toHaveBeenCalled(); expect(h.emit).not.toHaveBeenCalled();
  });
  it.each(["same-operator", "owner", "admin"])("preserves preview and explicit amendment for the authorized %s", async (role) => {
    if (role === "owner") h.db.strategy.findUnique.mockResolvedValue({ userId: h.user.id, operatorId: "operator-b" });
    if (role === "admin") { h.user.role = "ADMIN"; h.user.operatorId = null; }
    await expect(operations.preview()).resolves.toMatchObject({ source: "llm_rephrase" });
    await expect(operations.amend()).resolves.toMatchObject({ status: "OK" });
    expect(h.emit).toHaveBeenCalledOnce(); expect(h.preview).toHaveBeenCalledOnce();
  });
  it.each(["same-operator", "owner", "admin"])("preserves the existing authorized %s read", async (role) => {
    if (role === "owner") h.db.strategy.findUnique.mockResolvedValue({ userId: h.user.id, operatorId: "operator-b" });
    if (role === "admin") { h.user.role = "ADMIN"; h.user.operatorId = null; }
    expect((await operations.fields()).fields.find(f => f.field === "nomMarque")?.currentValue).toBe("Valeur privée");
  });
  it("returns the canonical current fingerprint through the already authorized reader", async () => {
    const result = await ingestionRouter.createCaller(context()).getSource({ id: "document-a", strategyId: "brand-a" });
    expect(result).toMatchObject({ id: "document-a", rawContent: "Texte courant", contentHash: "a".repeat(64), certainty: "DECLARED" });
    expect(h.source).toHaveBeenCalledWith("document-a", "brand-a", h.db);
    expect(h.preview).not.toHaveBeenCalled(); expect(h.emit).not.toHaveBeenCalled();
  });
  it("keeps the source reader's canonical cross-operator refusal", async () => {
    h.user.operatorId = "operator-b";
    await expect(ingestionRouter.createCaller(context()).getSource({ id: "document-a", strategyId: "brand-a" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("does not turn a revoked source into a successful documentary receipt", async () => {
    h.source.mockRejectedValue(new Error("SOURCE_UNAVAILABLE: partage retiré"));
    await expect(ingestionRouter.createCaller(context()).getSource({ id: "document-a", strategyId: "brand-a" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(h.emit).not.toHaveBeenCalled();
  });
});

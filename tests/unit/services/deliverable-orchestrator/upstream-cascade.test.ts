import { beforeEach, describe, expect, it, vi } from "vitest";
import { prepareUpstreamBriefs } from "@/server/services/deliverable-orchestrator/upstream-cascade";
import { resolveRequirements } from "@/server/services/deliverable-orchestrator/resolver";
import { briefAssetFingerprint } from "@/server/services/deliverable-orchestrator/vault-matcher";
import type { DeliverableComposition } from "@/server/services/deliverable-orchestrator/types";
import { FORMAT_TO_KIND } from "@/domain/brand-asset-formats";
import type { BrandAsset } from "@prisma/client";

const m = vi.hoisted(() => ({
  execute: vi.fn(),
  deposit: vi.fn(),
  events: vi.fn(),
  getEvent: vi.fn(),
  getOutput: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
}));
vi.mock("@/server/services/operator-isolation", () => ({
  getOperatorContext: async () => ({}),
  canAccessStrategy: async () => true,
}));
vi.mock("@/lib/db", () => ({
  db: {
    $transaction: async (operation: (tx: unknown) => unknown) =>
      operation({
        $executeRaw: async () => 1,
        intentEmissionEvent: { findFirst: async () => null, create: m.events },
      }),
    strategy: { findUniqueOrThrow: async () => ({ name: "Marque" }) },
    pillar: { findMany: async () => [] },
    brandAsset: { findFirst: m.findFirst, findMany: m.findMany },
    gloryOutput: { findFirst: m.getOutput },
    intentEmissionEvent: { create: m.events, findFirst: m.getEvent },
  },
}));
vi.mock("@/server/services/artemis/tools/engine", () => ({
  executeTool: m.execute,
}));
vi.mock("@/server/services/artemis/tools/sequence-executor", () => ({
  depositInBrandVault: m.deposit,
}));
const active = {
  id: "palette",
  version: 7,
  kind: "CHROMATIC_STRATEGY",
  content: { accent: "Or fixé #C8A44E" },
  name: "Palette approuvée",
  state: "ACTIVE",
  strategyId: "brand",
  campaignId: null,
  metadata: {},
  sourceGloryOutputId: null,
  sourceIntentId: null,
  staleAt: null,
} satisfies Pick<
  BrandAsset,
  | "id"
  | "version"
  | "kind"
  | "content"
  | "name"
  | "state"
  | "strategyId"
  | "campaignId"
  | "metadata"
  | "staleAt"
  | "sourceIntentId"
  | "sourceGloryOutputId"
>;
function localPlan(): DeliverableComposition {
  const { briefDag, targetSlug } = resolveRequirements("KV_VISUAL");
  return {
    targetKind: "KV_VISUAL",
    briefDag,
    targetGloryToolSlug: targetSlug,
    missingPreconditions: [],
    estimatedCostUsd: 1,
    vaultMatches: briefDag
      .filter((n) => n.depth > 0)
      .map((n) =>
        n.kind === active.kind
          ? {
              kind: n.kind,
              status: "ACTIVE_REUSE",
              assetId: active.id,
              assetVersion: 7,
              assetFingerprint: briefAssetFingerprint(active),
              assetState: "ACTIVE",
              staleAt: null,
            }
          : {
              kind: n.kind,
              status: "MISSING_GENERATE",
              assetId: null,
              assetState: null,
              staleAt: null,
            },
      ),
  };
}
const input = () => ({
  composition: localPlan(),
  strategyId: "brand",
  operatorId: "owner",
  campaignId: "campaign",
  previewIntentId: "preview",
  dispatchIntentId: "run",
  sourceText: "Copie fixée à respecter",
});
beforeEach(() => {
  vi.resetAllMocks();
  m.findFirst.mockResolvedValue(active);
  const assets = new Map<string, unknown>();
  m.getOutput.mockImplementation(async (q) => ({
    output: { brief: "Contenu de " + q.where.toolSlug },
  }));
  m.getEvent.mockResolvedValue(null);
  m.execute.mockImplementation(async (slug: string) => ({
    outputId: "out-" + slug,
    intentId: "call-" + slug,
    output: { brief: "Contenu de " + slug },
  }));
  m.deposit.mockImplementation(async (args) => {
    const id = "asset-" + args.gloryOutputId;
    assets.set(id, {
      id,
      version: 1,
      kind: FORMAT_TO_KIND[args.tool.outputFormat],
      content: args.toolOutput,
      state: "DRAFT",
      sourceGloryOutputId: args.gloryOutputId,
      sourceIntentId: args.gloryIntentId,
    });
    return [id];
  });
  m.findMany.mockImplementation(async ({ where }) =>
    where.id.in.map((id: string) => assets.get(id)),
  );
});
describe("Production des prérequis de La Forge", () => {
  it("remonte chaque branche nécessaire, conserve les versions et donne le vrai texte de la palette au brief DA", async () => {
    const result = await prepareUpstreamBriefs(input());
    expect(result.steps.map((s) => s.kind)).toEqual([
      "BIG_IDEA",
      "CHROMATIC_STRATEGY",
      "TYPOGRAPHY_SYSTEM",
      "KV_ART_DIRECTION_BRIEF",
    ]);
    const call = m.execute.mock.calls.find(
      (c) => c[0] === "kv-art-direction-brief",
    )!;
    expect(call[3].production.sourceText).toContain("Or fixé #C8A44E");
    expect(call[3].production.sourceText).toContain(
      "typography-system-architect",
    );
    expect(call[3].production.sourceText).toContain("Copie fixée à respecter");
    expect(result.text).toContain("palette");
    expect(result.text).toContain("Or fixé #C8A44E");
    expect(result.steps[1]).toMatchObject({
      status: "REUSED",
      assetIds: ["palette"],
    });
    expect(m.deposit).toHaveBeenCalledTimes(3);
    expect(
      m.events.mock.calls.filter(([call]) => call.data.phase === "COMPLETED"),
    ).toHaveLength(4);
    expect(m.execute.mock.calls.map((c) => c[0])).not.toContain(
      "kv-banana-prompt-generator",
    );
  });
  it("arrête les descendants d’un brief échoué et conserve l’étape en échec", async () => {
    m.execute.mockResolvedValueOnce({
      outputId: "bad",
      intentId: "attempt",
      output: { status: "FAILED", errorCode: "LLM_FAILURE" },
    });
    await expect(prepareUpstreamBriefs(input())).rejects.toThrow(/exploitable/);
    expect(m.deposit).not.toHaveBeenCalled();
    expect(m.execute).toHaveBeenCalledTimes(1);
    expect(
      m.events.mock.calls.some(
        ([call]) =>
          call.data.stepName === "upstream:BIG_IDEA" &&
          call.data.phase === "FAILED",
      ),
    ).toBe(true);
  });
  it("reprend la grande idée déjà produite après une panne de typographie ; une nouvelle copie invalide ce reçu", async () => {
    const completed = new Map<string, { intentId: string; partial: unknown }>();
    m.events.mockImplementation(async ({ data }) => {
      if (data.phase === "COMPLETED" && data.partial.inputFingerprint)
        completed.set(data.partial.inputFingerprint, {
          intentId: data.intentId,
          partial: data.partial,
        });
    });
    m.getEvent.mockImplementation(
      async ({ where }) => completed.get(where.partial.equals) ?? null,
    );
    const ok = (slug: string) => ({
      outputId: "out-" + slug,
      intentId: "call-" + slug,
      output: { brief: "Contenu de " + slug },
    });
    m.execute
      .mockImplementationOnce(async (slug) => ok(slug))
      .mockImplementationOnce(async () => {
        throw new Error("Luna temporairement indisponible");
      });
    await expect(prepareUpstreamBriefs(input())).rejects.toThrow(/Luna/);
    m.execute.mockClear();
    const second = await prepareUpstreamBriefs({
      ...input(),
      dispatchIntentId: "second",
    });
    expect(second.steps[0]).toMatchObject({
      kind: "BIG_IDEA",
      status: "RESUMED",
    });
    expect(m.execute.mock.calls.map((c) => c[0])).toEqual([
      "typography-system-architect",
      "kv-art-direction-brief",
    ]);
    await prepareUpstreamBriefs({
      ...input(),
      dispatchIntentId: "revised",
      sourceText: "Nouvelle copie",
    });
    expect(m.execute.mock.calls.map((c) => c[0])).toContain(
      "concept-generator",
    );
  });
  it("refuse un actif retouché après l’aperçu et une campagne étrangère", async () => {
    m.findFirst.mockResolvedValue({ ...active, version: 8 });
    await expect(prepareUpstreamBriefs(input())).rejects.toThrow(/changé/);
    const p = input(),
      wrong = { ...active, campaignId: "other" };
    p.composition = {
      ...p.composition,
      vaultMatches: p.composition.vaultMatches.map((row) =>
        row.assetId === active.id
          ? { ...row, assetFingerprint: briefAssetFingerprint(wrong) }
          : row,
      ),
    };
    m.findFirst.mockResolvedValue(wrong);
    await expect(prepareUpstreamBriefs(p)).rejects.toThrow(/autre campagne/);
  });
});

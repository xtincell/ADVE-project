/** The real vault, source receipts, GLORY persistence, transaction claims and restart. Only the provider boundary is replaced. */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { resolveRequirements } from "@/server/services/deliverable-orchestrator/resolver";
import { matchVault } from "@/server/services/deliverable-orchestrator/vault-matcher";
import { prepareUpstreamBriefs } from "@/server/services/deliverable-orchestrator/upstream-cascade";
const engine = vi.hoisted(() => ({ executeTool: vi.fn() }));
vi.mock("@/server/services/artemis/tools/engine", () => engine);

let operatorId: string, actor: string, strategyId: string;
async function emission(kind: string) {
  return db.intentEmission.create({
    data: {
      strategyId,
      intentKind: kind,
      payload: {},
      caller: "fixture-local",
    },
  });
}
beforeAll(async () => {
  const database = new URL(process.env.DATABASE_URL!);
  expect(["127.0.0.1", "localhost"]).toContain(database.hostname);
  expect(database.pathname).toBe("/shinkiro_verify");
  const operator = await db.operator.create({
    data: {
      name: "Fixture de reprise",
      slug: randomUUID(),
      status: "ACTIVE",
      licenseType: "TRIAL",
      licensedAt: new Date(),
      licenseExpiry: new Date(Date.now() + 86400000),
    },
  });
  operatorId = operator.id;
  actor = (
    await db.user.create({
      data: { email: randomUUID() + "@example.invalid", operatorId },
    })
  ).id;
  strategyId = (
    await db.strategy.create({
      data: {
        name: "Production synthétique locale",
        operatorId,
        userId: actor,
      },
    })
  ).id;
});
afterAll(async () => {
  if (strategyId) {
    await db.brandAsset.deleteMany({ where: { strategyId } });
    await db.gloryOutput.deleteMany({ where: { strategyId } });
    await db.intentEmission.deleteMany({ where: { strategyId } });
    await db.strategy.deleteMany({ where: { id: strategyId } });
  }
  if (actor) await db.user.deleteMany({ where: { id: actor } });
  if (operatorId) await db.operator.deleteMany({ where: { id: operatorId } });
  await db.$disconnect();
});
describe("Reprise locale d’une production", () => {
  it("réutilise uniquement les versions effectivement déposées après l’interruption et préserve les concepts comme candidats", async () => {
    const { targetSlug, briefDag } = resolveRequirements("KV_VISUAL");
    await db.brandAsset.create({
      data: {
        strategyId,
        operatorId,
        name: "Palette déjà choisie",
        kind: "CHROMATIC_STRATEGY",
        state: "ACTIVE",
        content: { accent: "COULEUR REÇUE" },
      },
    });
    const composition = {
      targetKind: "KV_VISUAL" as const,
      targetGloryToolSlug: targetSlug,
      briefDag,
      vaultMatches: await matchVault(
        strategyId,
        briefDag.filter((x) => x.depth > 0).map((x) => x.kind),
      ),
      missingPreconditions: [],
      estimatedCostUsd: 0,
    };
    let fail = true;
    const attempts: string[] = [];
    engine.executeTool.mockImplementation(async (slug: string) => {
      attempts.push(slug);
      if (fail && slug === "typography-system-architect")
        throw Error("panne locale simulée");
      const toolCall = await emission("INVOKE_GLORY_TOOL");
      const payload =
        slug === "concept-generator"
          ? {
              concepts: [
                { title: "Première piste", reason: "A" },
                { title: "Deuxième piste", reason: "B" },
              ],
            }
          : { brief: "Texte de " + slug };
      const output = await db.gloryOutput.create({
        data: { strategyId, toolSlug: slug, output: payload },
      });
      return { intentId: toolCall.id, outputId: output.id, output: payload };
    });
    const preview = await emission("COMPOSE_DELIVERABLE"),
      first = await emission("COMPOSE_DELIVERABLE"),
      second = await emission("COMPOSE_DELIVERABLE");
    const params = {
      strategyId,
      operatorId: actor,
      composition,
      sourceText: "Édition et version identiques",
      previewIntentId: preview.id,
    };
    await expect(
      prepareUpstreamBriefs({ ...params, dispatchIntentId: first.id }),
    ).rejects.toThrow(/panne locale/);
    fail = false;
    attempts.length = 0;
    const retry = await prepareUpstreamBriefs({
      ...params,
      dispatchIntentId: second.id,
    });
    expect(attempts).toEqual([
      "typography-system-architect",
      "kv-art-direction-brief",
    ]);
    expect(retry.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "BIG_IDEA", status: "RESUMED" }),
      ]),
    );
    expect(retry.text).toContain("COULEUR REÇUE");
    expect(retry.text).toContain("Première piste");
    const ideas = await db.brandAsset.findMany({
      where: { strategyId, kind: "BIG_IDEA" },
    });
    expect(ideas).toHaveLength(2);
    expect(ideas.every((i) => i.state === "CANDIDATE")).toBe(true);
    expect(
      await db.intentEmissionEvent.count({
        where: {
          intentId: first.id,
          phase: "FAILED",
          stepName: "upstream:TYPOGRAPHY_SYSTEM",
        },
      }),
    ).toBe(1);
  });
  it("réserve le même brief une seule fois entre deux aperçus concurrents", async () => {
    const { targetSlug, briefDag } = resolveRequirements("KV_VISUAL");
    const composition = {
      targetKind: "KV_VISUAL" as const,
      targetGloryToolSlug: targetSlug,
      briefDag,
      vaultMatches: await matchVault(
        strategyId,
        briefDag.filter((x) => x.depth > 0).map((x) => x.kind),
      ),
      missingPreconditions: [],
      estimatedCostUsd: 0,
    };
    let announce!: () => void, release!: () => void;
    const started = new Promise<void>((resolve) => {
      announce = resolve;
    });
    const releaseFirst = new Promise<void>((resolve) => {
      release = resolve;
    });
    let conceptCalls = 0;
    engine.executeTool.mockImplementation(async (slug: string) => {
      if (slug === "concept-generator") {
        conceptCalls++;
        announce();
        await releaseFirst;
      }
      const toolCall = await emission("INVOKE_GLORY_TOOL");
      const payload = { brief: "Pièce sans téléchargement externe " + slug };
      const output = await db.gloryOutput.create({
        data: { strategyId, toolSlug: slug, output: payload },
      });
      return { intentId: toolCall.id, outputId: output.id, output: payload };
    });
    const [pa, pb, da, dbIntent] = await Promise.all(
      Array.from({ length: 4 }, () => emission("COMPOSE_DELIVERABLE")),
    );
    const base = {
      strategyId,
      operatorId: actor,
      composition,
      sourceText: "Deux revues simultanées de ce même brief",
    };
    const first = prepareUpstreamBriefs({
      ...base,
      dispatchIntentId: da!.id,
      previewIntentId: pa!.id,
    });
    try {
      await started;
      await expect(
        prepareUpstreamBriefs({
          ...base,
          dispatchIntentId: dbIntent!.id,
          previewIntentId: pb!.id,
        }),
      ).rejects.toThrow(/déjà en cours/);
    } finally {
      release();
    }
    await first;
    expect(conceptCalls).toBe(1);
  });
});

/** Artemis supplies content; Mestor's existing vault retains candidates.
 * Retrying a deposit never calls a model and never selects or approves content. */
import { Prisma } from "@prisma/client";
import { PillarKeySchema } from "@/domain/pillars";
import { db } from "@/lib/db";
import { isUsableGeneration } from "@/domain/generation-result";
import type { getGloryTool } from "@/server/services/artemis/tools/registry";
import { createBrandAsset, createCandidateBatch, kindFromFormat } from "./engine";

type DepositArgs = {
  tool: NonNullable<ReturnType<typeof getGloryTool>>;
  toolOutput: Record<string, unknown>;
  gloryOutputId: string;
  gloryIntentId: string | null;
  strategyId: string;
  context: Record<string, unknown>;
  recoveryIntentId?: string;
};
const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const text = (v: unknown) => typeof v === "string" && v.trim() ? v : undefined;

export function vaultDepositContext(context: Record<string, unknown>) {
  return Object.fromEntries(["_pillarSource", "_manipulationMode", "_campaignId", "_briefId"].flatMap(key => typeof context[key] === "string" ? [[key, context[key]]] : []));
}

export async function recordVaultDepositFailure(args: Pick<DepositArgs, "gloryOutputId" | "strategyId" | "gloryIntentId" | "context">) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "GloryOutput" WHERE "id" = ${args.gloryOutputId} AND "strategyId" = ${args.strategyId} FOR UPDATE`;
    const source = await tx.gloryOutput.findFirst({ where: { id: args.gloryOutputId, strategyId: args.strategyId } });
    if (!source) throw new Error("VAULT_SOURCE_NOT_FOUND");
    // A concurrent successful replay wins over a late failure report.
    if (await tx.brandAsset.count({ where: { strategyId: args.strategyId, sourceGloryOutputId: source.id } })) return;
    await tx.gloryOutput.update({ where: { id: source.id }, data: { updatedAt: source.updatedAt, output: {
      ...object(source.output), _vaultDeposit: { status: "FAILED", code: "VAULT_DEPOSIT_FAILED",
        attemptedAt: new Date().toISOString(), sourceIntentId: args.gloryIntentId,
        context: vaultDepositContext(args.context),
      },
    } as Prisma.InputJsonValue } });
  });
}

export async function depositInBrandVault(args: DepositArgs): Promise<string[]> {
  return db.$transaction(async tx => {
    // One source row lock covers both single and candidate-batch deposits.
    // All writes commit together; a retry reuses existing editions, including archived ones.
    await tx.$queryRaw`SELECT "id" FROM "GloryOutput" WHERE "id" = ${args.gloryOutputId} AND "strategyId" = ${args.strategyId} FOR UPDATE`;
    const source = await tx.gloryOutput.findFirst({ where: { id: args.gloryOutputId, strategyId: args.strategyId } });
    if (!source || source.toolSlug !== args.tool.slug) throw new Error("VAULT_SOURCE_MISMATCH");
    if (!isUsableGeneration(source.output)) throw new Error("VAULT_SOURCE_UNUSABLE");
    const existing = await tx.brandAsset.findMany({ where: { strategyId: args.strategyId, sourceGloryOutputId: source.id }, orderBy: { batchIndex: "asc" }, select: { id: true } });
    let ids = existing.map(asset => asset.id);
    const prior = object(object(source.output)._vaultDeposit);
    const sourceIntentId = args.gloryIntentId ?? text(prior.sourceIntentId);
    if (!ids.length) {
      const strategy = await tx.strategy.findUnique({ where: { id: args.strategyId }, select: { operatorId: true } });
      if (!strategy?.operatorId) throw new Error("VAULT_OPERATOR_REQUIRED");
      // Stored content is authoritative, never caller-supplied replacement content.
      const content = { ...source.output };
      delete content._vaultDeposit;
      const kind = kindFromFormat(args.tool.outputFormat);
      const pillar = text(args.context._pillarSource) ?? args.tool.pillarKeys[0]?.toUpperCase();
      const mode = text(args.context._manipulationMode);
      const campaignId = text(args.context._campaignId), briefId = text(args.context._briefId);
      if (campaignId && !await tx.campaign.findFirst({ where: { id: campaignId, strategyId: args.strategyId }, select: { id: true } })) throw new Error("VAULT_CAMPAIGN_MISMATCH");
      if (briefId && !await tx.campaignBrief.findFirst({ where: { id: briefId, campaign: { strategyId: args.strategyId }, ...(campaignId ? { campaignId } : {}) }, select: { id: true } })) throw new Error("VAULT_BRIEF_MISMATCH");
      const common = {
        strategyId: args.strategyId, operatorId: strategy.operatorId, kind, format: args.tool.outputFormat,
        pillarSource: PillarKeySchema.safeParse(pillar).success ? PillarKeySchema.parse(pillar) : undefined,
        manipulationMode: ["peddler", "dealer", "facilitator", "entertainer"].includes(mode ?? "") ? mode as "peddler" | "dealer" | "facilitator" | "entertainer" : undefined,
        sourceIntentId, sourceGloryOutputId: source.id, sourceExecutionId: source.executionId ?? undefined,
        campaignId, briefId,
        metadata: { deposit: { governor: "MESTOR", producer: "ARTEMIS", tool: args.tool.slug,
          ...(args.recoveryIntentId ? { recoveryIntentId: args.recoveryIntentId } : {}) } },
      };
      const candidates = extractCandidates(content);
      if (candidates.length > 1) {
        ids = (await createCandidateBatch({ ...common, candidates }, tx)).candidates.map(asset => asset.id);
      } else {
        ids = [(await createBrandAsset({ ...common, name: `${args.tool.name} output`, family: "INTELLECTUAL", content,
          summary: candidates[0]?.summary, state: "DRAFT" }, tx)).id];
      }
    }
    await tx.gloryOutput.update({ where: { id: source.id }, data: { updatedAt: source.updatedAt, output: {
      ...object(source.output), _vaultDeposit: { status: "STORED", assetIds: ids, sourceIntentId: sourceIntentId ?? null,
        depositedAt: text(prior.depositedAt) ?? new Date().toISOString(), context: vaultDepositContext(args.context),
        ...(args.recoveryIntentId ? { recoveryIntentId: args.recoveryIntentId } : {}),
      },
    } as Prisma.InputJsonValue } });
    return ids;
  }, { timeout: 20_000 });
}

function extractCandidates(output: Record<string, unknown>) {
  for (const key of ["concepts", "claims", "prompts", "names", "propositions", "ideas", "options"]) {
    const values = output[key];
    if (!Array.isArray(values) || !values.length) continue;
    return values.map((value, i) => {
      const item = object(value);
      return { name: text(item.title) ?? text(item.name) ?? text(item.headline) ?? `${key} ${i + 1}`,
        content: Object.keys(item).length ? item : { value },
        summary: text(item.description) ?? text(item.summary) ?? text(item.tagline) ?? text(value)?.slice(0, 200) };
    });
  }
  return [{ name: text(output.title) ?? text(output.name) ?? "output", content: output, summary: text(output.summary) ?? text(output.description) }];
}

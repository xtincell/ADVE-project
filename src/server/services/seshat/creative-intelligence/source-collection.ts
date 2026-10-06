import { Prisma, type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { collectCreativeSourceSchema, creativeExportSchema, CREATIVE_SOURCE_CONNECTIONS, type CreativeCredentials } from "@/domain/creative-sources";
import { connectorResultSchema } from "@/domain/connector-result";
import { acquiredContentSchema } from "@/domain/creative-sources";
import { credentialVault } from "@/server/services/anubis/credential-vault";
import { getGloryTool } from "@/server/services/artemis/tools/registry";
import { registerDelegateHandler, getDelegateHandler } from "@/server/services/artemis/tools/delegate-registry";
import { assertActiveMarket, importSpecimen, recordMetric } from ".";
import { getOperatorContext } from "@/server/services/operator-isolation";
import { fetchCreativeSource } from "./source-adapters";

export async function readCreativeCredentials(operatorId: string | null, provider: keyof typeof CREATIVE_SOURCE_CONNECTIONS): Promise<CreativeCredentials> {
  const connection = CREATIVE_SOURCE_CONNECTIONS[provider];
  const credential = operatorId ? await credentialVault.get(operatorId, connection.type) : null;
  if (operatorId) {
    const exists = await db.externalConnector.count({ where: { operatorId, connectorType: connection.type } });
    if (exists && !credential) return {};
  }
  const result: Record<string, string> = {};
  for (const field of ["apiKey", "apiVersion", "actorId", "projectId", "adType", "userAgent"]) {
    const value = credential?.config[field];
    if (typeof value === "string" && value.trim()) result[field] = value.trim();
  }
  if (!credential && connection.env && process.env[connection.env]) result.apiKey = process.env[connection.env]!;
  return result;
}
// Only server-created context objects can bind the authenticated operator's vault.
const operatorBindings = new WeakMap<object, string | null>();
registerDelegateHandler("creative-intelligence:fetch-source", async (input, ctx) => {
  const source = collectCreativeSourceSchema.parse(JSON.parse(input.source_input ?? "{}"));
  if ((source.strategyId ?? "(global)") !== ctx.strategyId) throw new Error("Le périmètre du collecteur doit correspondre au contexte gouverné.");
  let operatorId = operatorBindings.get(ctx) ?? null;
  if (!operatorBindings.has(ctx) && source.strategyId) {
    const strategy = await db.strategy.findUniqueOrThrow({ where: { id: ctx.strategyId }, select: { operatorId: true, userId: true, client: { select: { operatorId: true } } } });
    operatorId = strategy.operatorId ?? strategy.client?.operatorId ?? (await getOperatorContext(strategy.userId)).operatorId;
  }
  const credentials = source.provider in CREATIVE_SOURCE_CONNECTIONS ? await readCreativeCredentials(operatorId, source.provider as keyof typeof CREATIVE_SOURCE_CONNECTIONS) : {};
  return fetchCreativeSource(source, credentials) as unknown as Record<string, unknown>;
});

/** The batch is parsed before IO and all its writes commit atomically. */
export async function importCreativeExport(input: z.infer<typeof creativeExportSchema>, client: PrismaClient = db) {
  const parsed = creativeExportSchema.parse(input);
  const latestAllowed = new Date();
  for (const item of parsed.items) {
    if (item.specimen.publishedAt > latestAllowed || item.measurement && (item.measurement.observedAt < item.specimen.publishedAt || item.measurement.observedAt > latestAllowed)) throw new TRPCError({ code: "BAD_REQUEST", message: "Date de publication ou de mesure invalide." });
  }
  return client.$transaction(async tx => {
    const receipts: Array<{ specimenId: string; metricId: string | null }> = [];
    for (const item of parsed.items) {
      const specimen = await importSpecimen(item.specimen, tx);
      const metric = item.measurement ? await recordMetric({ ...item.measurement, specimenId: specimen.id, strategyId: parsed.strategyId }, tx) : null;
      receipts.push({ specimenId: specimen.id, metricId: metric?.id ?? null });
    }
    return { itemsProcessed: receipts.length, receipts };
  }, { timeout: 25000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}

export async function collectCreativeSource(input: z.infer<typeof collectCreativeSourceSchema>, operatorId: string | null, client: PrismaClient = db) {
  input = collectCreativeSourceSchema.parse(input);
  await assertActiveMarket(client, input.countryCode);
  if (input.strategyId) {
    const brand = await client.strategy.findUnique({ where: { id: input.strategyId }, select: { countryCode: true } });
    if (brand?.countryCode !== input.countryCode) throw new TRPCError({ code: "BAD_REQUEST", message: "Le pays doit correspondre à la marque." });
  }
  const tool = getGloryTool("creative-source-fetcher");
  const handler = tool?.delegateDescriptor && getDelegateHandler(tool.delegateDescriptor.handlerKey);
  if (!handler) throw new Error("Collecteur Glory indisponible.");
  // Same registered Glory delegate as the generic executor, under this mutation's spine.
  const context = { strategyId: input.strategyId ?? "(global)" };
  operatorBindings.set(context, operatorId);
  const result = connectorResultSchema(z.array(acquiredContentSchema).max(50)).parse(await handler({ source_input: JSON.stringify(input) }, context));
  if (result.state !== "LIVE") return result;
  const receipt = await importCreativeExport({ schemaVersion: "creative-source-export-v1", strategyId: input.strategyId, items: result.data }, client);
  return { state: "LIVE" as const, observedAt: result.observedAt, ...receipt, note: "Le pays et le secteur sont le contexte déclaré de collecte, pas une audience géographique mesurée. Les relevés sont pris à chaque collecte, sans historique rétroactif." };
}

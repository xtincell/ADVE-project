/** Shared review lifecycle. Call inside the writer's transaction, before pillar locks. */
import { Prisma } from "@prisma/client";

export async function withdrawSynthesisReview(client: Prisma.TransactionClient, strategyId: string) {
  await client.$queryRaw`SELECT id FROM "Strategy" WHERE id = ${strategyId} FOR UPDATE`;
  // A source edit does not unlock a locked plan for agents. Freshness still
  // prevents its use or approval until the operator explicitly revisits it.
  await client.pillar.updateMany({ where: { strategyId, key: "s", validationStatus: "VALIDATED" },
    data: { validationStatus: "AI_PROPOSED" } });
  await client.strategy.updateMany({ where: { id: strategyId, status: "VALIDATED" }, data: { status: "DRAFT" } });
}

export async function markPillarsStale(client: Prisma.TransactionClient, strategyId: string, keys: readonly string[]) {
  const normalized = [...new Set(keys.map(key => key.toLowerCase()))];
  if (!normalized.length) return;
  await client.$queryRaw`SELECT id FROM "Strategy" WHERE id = ${strategyId} FOR UPDATE`;
  await client.pillar.updateMany({ where: { strategyId, key: { in: normalized } }, data: { staleAt: new Date() } });
  if (normalized.includes("s")) await withdrawSynthesisReview(client, strategyId);
}

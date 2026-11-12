import type { PrismaClient, Prisma, Strategy } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { invalidateNodeAndDescendants } from "./inheritance";
import type { SeedActor, StrategySeed } from "../strategy-bootstrap";

/** Le dossier de marque est la clé d'idempotence durable. Une course perdante
 * annule toute sa création. Le rejeu après perte de réponse retrouve le gagnant. */
export async function ensureNodePlatform(
  db: PrismaClient,
  input: { nodeId: string; operatorId: string; expectedUpdatedAt: string },
  actor: SeedActor,
  seed: (
    db: Prisma.TransactionClient,
    input: StrategySeed,
    actor: SeedActor,
  ) => Promise<Strategy>,
) {
  const result = await db
    .$transaction(
      async (tx) => {
        const node = await tx.brandNode.findFirst({
          where: {
            id: input.nodeId,
            operatorId: input.operatorId,
            archivedAt: null,
          },
        });
        if (!node)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Dossier introuvable dans cette équipe.",
          });
        if (node.strategyId) {
          const existing = await tx.strategy.findFirst({
            where: {
              id: node.strategyId,
              operatorId: node.operatorId,
              clientId: node.clientId,
              countryCode: node.countryCode,
              archivedAt: null,
            },
          });
          if (existing) return existing;
          throw new TRPCError({
            code: "CONFLICT",
            message: "La plateforme rattachée ne correspond plus à ce dossier.",
          });
        }
        if (node.updatedAt.toISOString() !== input.expectedUpdatedAt)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ce dossier a changé. Relisez-le.",
          });
        if (
          node.clientId &&
          !(await tx.client.findFirst({
            where: {
              id: node.clientId,
              operatorId: node.operatorId,
              status: "ACTIVE",
            },
            select: { id: true },
          }))
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Le client du dossier doit être actif.",
          });
        }
        const strategy = await seed(
          tx,
          {
            name: node.name,
            operatorId: node.operatorId,
            clientId: node.clientId ?? undefined,
            country: node.countryCode ?? undefined,
          },
          actor,
        );
        if (strategy.countryCode !== node.countryCode)
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Pays absent du registre.",
          });
        const linked = await tx.brandNode.updateMany({
          where: {
            id: node.id,
            operatorId: node.operatorId,
            archivedAt: null,
            strategyId: null,
            updatedAt: node.updatedAt,
          },
          data: {
            strategyId: strategy.id,
            updatedAt: new Date(
              Math.max(Date.now(), node.updatedAt.getTime() + 1),
            ),
          },
        });
        if (!linked.count)
          throw new TRPCError({
            code: "CONFLICT",
            message: "Un autre rattachement est en cours. Reprenez le dossier.",
          });
        await tx.auditLog.create({
          data: {
            userId: actor.id,
            action: "UPDATE",
            entityType: "BrandNode",
            entityId: node.id,
            newValue: { strategyId: strategy.id },
          },
        });
        return strategy;
      },
      { isolationLevel: "Serializable" },
    )
    .catch((err: unknown) => {
      if ((err as { code?: string })?.code === "P2034")
        throw new TRPCError({
          code: "CONFLICT",
          message: "Le dossier a changé. Reprenez le rattachement.",
        });
      throw err;
    });
  await invalidateNodeAndDescendants(input.nodeId);
  return result;
}

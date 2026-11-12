import type { Client, Prisma, PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { OrganizationSources } from "@/domain/client-organization";
import { isDeepStrictEqual } from "node:util";

type ClientWrite = Pick<
  Prisma.ClientUncheckedCreateInput,
  | "name"
  | "contactName"
  | "contactEmail"
  | "contactPhone"
  | "sector"
  | "country"
  | "notes"
  | "status"
  | "organizationKind"
  | "organizationKey"
  | "organizationSourceRefs"
  | "parentClientId"
>;
type Actor = { id: string; operatorId?: string | null; role?: string | null };
const conflict = (message: string) =>
  new TRPCError({ code: "CONFLICT", message });

async function checkParent(
  tx: Prisma.TransactionClient,
  operatorId: string,
  childId: string | undefined,
  parentId: string | null,
) {
  const seen = new Set(childId ? [childId] : []);
  let id = parentId;
  while (id) {
    if (seen.has(id)) throw conflict("Cette filiation formerait une boucle.");
    seen.add(id);
    const parent: Pick<Client, "parentClientId"> | null =
      await tx.client.findFirst({
        where: { id, operatorId, status: { not: "ARCHIVED" } },
        select: { parentClientId: true },
      });
    if (!parent)
      throw conflict("Organisation parente indisponible dans cette équipe.");
    id = parent.parentClientId;
  }
}

/** L'organisation n'accorde aucun droit à ses ascendants ou descendants. */
export async function writeClientOrganization(
  db: PrismaClient,
  actor: Actor,
  input: {
    operatorId: string;
    id?: string;
    expectedUpdatedAt?: string;
    data: Partial<ClientWrite>;
  },
) {
  if (
    actor.role !== "ADMIN" &&
    (!actor.operatorId || actor.operatorId !== input.operatorId)
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Accès refusé à cette équipe.",
    });
  }
  const { operatorId, id, data, expectedUpdatedAt } = input;
  return db
    .$transaction(
      async (tx) => {
        const previous = id
          ? await tx.client.findFirst({ where: { id, operatorId } })
          : data.organizationKey
            ? await tx.client.findUnique({
                where: {
                  operatorId_organizationKey: {
                    operatorId,
                    organizationKey: data.organizationKey,
                  },
                },
              })
            : null;
        if (id && !previous)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Organisation introuvable.",
          });
        if (!id && previous) {
          if (
            Object.entries(data).every(
              ([k, v]) =>
                v === undefined ||
                isDeepStrictEqual(previous[k as keyof Client], v),
            )
          )
            return previous;
          throw conflict(
            "Cette clé d’organisation existe avec des données différentes.",
          );
        }
        const changesOrganization =
          [
            "organizationKind",
            "organizationKey",
            "organizationSourceRefs",
            "parentClientId",
          ].some((k) => k in data) ||
          data.status === "REFERENCE" ||
          previous?.status === "REFERENCE";
        if (
          previous &&
          ((changesOrganization && !expectedUpdatedAt) ||
            (expectedUpdatedAt &&
              previous.updatedAt.toISOString() !== expectedUpdatedAt))
        ) {
          throw conflict("Relisez la version actuelle de l’organisation.");
        }
        if (changesOrganization) {
          if (
            previous?.organizationKey &&
            data.organizationKey &&
            data.organizationKey !== previous.organizationKey
          ) {
            throw conflict("La clé de rapprochement est immuable.");
          }
          const changesClaim =
            !previous ||
            (data.parentClientId !== undefined &&
              data.parentClientId !== previous.parentClientId) ||
            (data.organizationKind !== undefined &&
              data.organizationKind !== previous.organizationKind);
          const sources = changesClaim
            ? data.organizationSourceRefs
            : (data.organizationSourceRefs ?? previous?.organizationSourceRefs);
          if (!OrganizationSources.safeParse(sources).success) {
            throw conflict(
              "Une source précisant la portée de cette organisation est requise.",
            );
          }
          await checkParent(
            tx,
            operatorId,
            id,
            data.parentClientId === undefined
              ? (previous?.parentClientId ?? null)
              : data.parentClientId,
          );
        }
        if (
          id &&
          data.status === "ARCHIVED" &&
          (await tx.client.count({
            where: { parentClientId: id, status: { not: "ARCHIVED" } },
          }))
        ) {
          throw conflict(
            "Cette organisation comporte des entités non archivées.",
          );
        }
        let result: Client;
        if (id && previous) {
          result = await tx.client.update({
            where: { id, operatorId, updatedAt: previous.updatedAt },
            data: {
              ...data,
              updatedAt: new Date(
                Math.max(Date.now(), previous.updatedAt.getTime() + 1),
              ),
            },
          });
        } else {
          if (!data.name)
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Le nom est requis.",
            });
          result = await tx.client.create({
            data: { ...data, name: data.name, operatorId },
          });
        }
        const reference = (c: Client) => ({
          name: c.name,
          status: c.status,
          kind: c.organizationKind,
          parent: c.parentClientId,
          key: c.organizationKey,
          sourceRefs: c.organizationSourceRefs,
        });
        await tx.auditLog.create({
          data: {
            userId: actor.id,
            action: previous ? "UPDATE" : "CREATE",
            entityType: "Client",
            entityId: result.id,
            ...(previous ? { oldValue: reference(previous) } : {}),
            newValue: reference(result),
          },
        });
        return result;
      },
      { isolationLevel: "Serializable" },
    )
    .catch((err: unknown) => {
      if (
        ["P2025", "P2034", "P2002"].includes(
          (err as { code?: string })?.code ?? "",
        )
      ) {
        throw conflict(
          "Modification concurrente. Relisez l’organisation et reprenez l’opération.",
        );
      }
      throw err;
    });
}

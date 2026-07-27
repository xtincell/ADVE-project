/**
 * Connectors Router — v4
 *
 * tRPC procedures for managing external SaaS connectors (Monday, Zoho, etc.).
 * Handles CRUD for ExternalConnector records, manual sync triggers,
 * and connector status reporting.
 *
 * Anti-IDOR (audit adversarial 2026-07-22) : `ExternalConnector.config` = tokens
 * OAuth / clés API (Credentials Vault chiffré). Les procédures prenaient
 * `operatorId` en INPUT CLIENT sans vérifier que l'appelant appartient à cet
 * opérateur → lecture/écriture/suppression des credentials d'un AUTRE opérateur.
 * Désormais `operatorProcedure` + l'`operatorId` est résolu/validé côté serveur
 * (un opérateur ne gère QUE ses propres connecteurs ; ADMIN gère tous).
 *
 * Cette passe fermait QUI peut lire, pas CE QUI est lu : les lectures
 * renvoyaient toujours la ligne entière, donc les jetons — au navigateur du
 * propriétaire légitime, mais dans le navigateur quand même. Les trois lectures
 * passent désormais par `CONNECTOR_PUBLIC_SELECT` (liste blanche partagée),
 * `get` remplaçant `config` par sa description (`configured` + noms de clés).
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, operatorProcedure } from "../init";
import { getConnector, listConnectorTypes } from "@/server/services/advertis-connectors";
import { governedProcedure } from "@/server/governance/governed-procedure";
import { getOperatorContext } from "@/server/services/operator-isolation";
import {
  CONNECTOR_PUBLIC_SELECT,
  readPublicConnector,
} from "@/server/services/anubis/connector-projection";
/* lafusee:governed-active */

/**
 * Résout l'operatorId effectif : ADMIN peut cibler n'importe quel opérateur ;
 * un opérateur est verrouillé sur le SIEN (l'`operatorId` client est rejeté s'il
 * ne correspond pas). Ferme la lecture/écriture cross-opérateur des credentials.
 */
async function scopedOperatorId(
  ctx: { session: { user: { id: string; role?: string | null } } },
  requested: string,
): Promise<string> {
  if (ctx.session.user.role === "ADMIN") return requested;
  const opCtx = await getOperatorContext(ctx.session.user.id);
  if (!opCtx.operatorId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Aucun opérateur associé au compte." });
  }
  if (requested !== opCtx.operatorId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Vous ne gérez que les connecteurs de votre opérateur." });
  }
  return opCtx.operatorId;
}

export const connectorsRouter = createTRPCRouter({
  // List all connectors for the current operator
  list: operatorProcedure
    .input(z.object({ operatorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const operatorId = await scopedOperatorId(ctx, input.operatorId);
      const connectors = await ctx.db.externalConnector.findMany({
        where: { operatorId },
        orderBy: { updatedAt: "desc" },
        select: CONNECTOR_PUBLIC_SELECT,
      });
      return {
        connectors,
        availableTypes: listConnectorTypes(),
      };
    }),

  // Get a specific connector
  get: operatorProcedure
    .input(z.object({
      operatorId: z.string(),
      connectorType: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const operatorId = await scopedOperatorId(ctx, input.operatorId);
      // `config` reste au serveur : le service le charge, le décrit, et ne rend
      // que `configured` + les NOMS de clés. Le routeur ne voit jamais le secret.
      return readPublicConnector(operatorId, input.connectorType);
    }),

  // Create or update a connector
  upsert: governedProcedure({
    kind: "LEGACY_CONNECTORS_UPSERT",
    requireOperator: true,
    inputSchema: z.object({
      operatorId: z.string(),
      connectorType: z.string(),
      config: z.record(z.string(), z.unknown()),
    }),
    caller: "connectors:upsert",
  }).mutation(async ({ ctx, input }) => {
    const operatorId = await scopedOperatorId(ctx, input.operatorId);
    // Le retour d'un `upsert` porte la ligne ENTIÈRE — donc `config`, le secret
    // qu'on vient d'écrire, renvoyé en écho au navigateur.
    return ctx.db.externalConnector.upsert({
      where: {
        operatorId_connectorType: {
          operatorId,
          connectorType: input.connectorType,
        },
      },
      update: {
        config: input.config as Prisma.InputJsonValue,
        status: "ACTIVE",
      },
      create: {
        operatorId,
        connectorType: input.connectorType,
        config: input.config as Prisma.InputJsonValue,
        status: "ACTIVE",
      },
      select: CONNECTOR_PUBLIC_SELECT,
    });
  }),

  // Trigger manual sync
  sync: governedProcedure({
    kind: "LEGACY_CONNECTORS_SYNC",
    requireOperator: true,
    inputSchema: z.object({
      connectorId: z.string(),
      strategyId: z.string(),
    }),
    caller: "connectors:sync",
  }).mutation(async ({ ctx, input }) => {
    // Deux champs suffisent ici (routage adapter + garde d'appartenance) : les
    // credentials, c'est l'adapter qui les lit côté serveur, pas cette voie.
    const connector = await ctx.db.externalConnector.findUnique({
      where: { id: input.connectorId },
      select: { id: true, operatorId: true, connectorType: true },
    });
    if (!connector) {
      throw new Error("Connector not found");
    }
    // Le connecteur (credentials) doit appartenir à l'opérateur de l'appelant.
    await scopedOperatorId(ctx, connector.operatorId);

    const adapter = getConnector(connector.connectorType);
    if (!adapter) {
      throw new Error(`No adapter registered for connector type: ${connector.connectorType}`);
    }

    return adapter.sync(input.connectorId, input.strategyId);
  }),

  // Disconnect a connector
  disconnect: governedProcedure({
    kind: "LEGACY_CONNECTORS_DISCONNECT",
    requireOperator: true,
    inputSchema: z.object({
      operatorId: z.string(),
      connectorType: z.string(),
    }),
    caller: "connectors:disconnect",
  }).mutation(async ({ ctx, input }) => {
    const operatorId = await scopedOperatorId(ctx, input.operatorId);
    return ctx.db.externalConnector.delete({
      where: {
        operatorId_connectorType: {
          operatorId,
          connectorType: input.connectorType,
        },
      },
    });
  }),

  // Get connector stats dashboard
  stats: operatorProcedure
    .input(z.object({ operatorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const operatorId = await scopedOperatorId(ctx, input.operatorId);
      const connectors = await ctx.db.externalConnector.findMany({
        where: { operatorId },
        select: CONNECTOR_PUBLIC_SELECT,
      });

      return {
        total: connectors.length,
        active: connectors.filter((c) => c.status === "ACTIVE").length,
        error: connectors.filter((c) => c.status === "ERROR").length,
        totalSignals: connectors.reduce((sum, c) => sum + c.signalCount, 0),
        avgConfidence:
          connectors.length > 0
            ? connectors.reduce((sum, c) => sum + (c.avgConfidence ?? 0), 0) / connectors.length
            : 0,
      };
    }),
});

/**
 * Connectors Router — v4
 *
 * tRPC procedures for managing external SaaS connectors (Monday, Zoho, etc.).
 * Handles CRUD for ExternalConnector records, manual sync triggers,
 * and connector status reporting.
 */

import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "../init";
import { getConnector, listConnectorTypes } from "@/server/services/advertis-connectors";

export const connectorsRouter = createTRPCRouter({
  // List all connectors for the current operator
  list: protectedProcedure
    .input(z.object({ operatorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connectors = await ctx.db.externalConnector.findMany({
        where: { operatorId: input.operatorId },
        orderBy: { updatedAt: "desc" },
      });
      return {
        connectors,
        availableTypes: listConnectorTypes(),
      };
    }),

  // Get a specific connector
  get: protectedProcedure
    .input(z.object({
      operatorId: z.string(),
      connectorType: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      return ctx.db.externalConnector.findUnique({
        where: {
          operatorId_connectorType: {
            operatorId: input.operatorId,
            connectorType: input.connectorType,
          },
        },
      });
    }),

  // Create or update a connector
  upsert: protectedProcedure
    .input(z.object({
      operatorId: z.string(),
      connectorType: z.string(),
      config: z.record(z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.externalConnector.upsert({
        where: {
          operatorId_connectorType: {
            operatorId: input.operatorId,
            connectorType: input.connectorType,
          },
        },
        update: {
          config: input.config as Prisma.InputJsonValue,
          status: "ACTIVE",
        },
        create: {
          operatorId: input.operatorId,
          connectorType: input.connectorType,
          config: input.config as Prisma.InputJsonValue,
          status: "ACTIVE",
        },
      });
    }),

  // Trigger manual sync
  sync: protectedProcedure
    .input(z.object({
      connectorId: z.string(),
      strategyId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const connector = await ctx.db.externalConnector.findUnique({
        where: { id: input.connectorId },
      });
      if (!connector) {
        throw new Error("Connector not found");
      }

      const adapter = getConnector(connector.connectorType);
      if (!adapter) {
        throw new Error(`No adapter registered for connector type: ${connector.connectorType}`);
      }

      return adapter.sync(input.connectorId, input.strategyId);
    }),

  // Disconnect a connector
  disconnect: protectedProcedure
    .input(z.object({
      operatorId: z.string(),
      connectorType: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.externalConnector.delete({
        where: {
          operatorId_connectorType: {
            operatorId: input.operatorId,
            connectorType: input.connectorType,
          },
        },
      });
    }),

  // Get connector stats dashboard
  stats: protectedProcedure
    .input(z.object({ operatorId: z.string() }))
    .query(async ({ ctx, input }) => {
      const connectors = await ctx.db.externalConnector.findMany({
        where: { operatorId: input.operatorId },
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

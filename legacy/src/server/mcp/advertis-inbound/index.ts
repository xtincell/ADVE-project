import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PillarSignalSchema, enforceConfidenceFloor } from "@/lib/types/pillar-signal";
import { PILLAR_KEYS } from "@/lib/types/advertis-vector";
import { writePillarAndScore } from "@/server/services/pillar-gateway";

// ---------------------------------------------------------------------------
// ADVERTIS INBOUND MCP Server
// Premier serveur MCP INBOUND de LaFusée — ingère les signaux des SaaS
// clients (Monday, Zoho, Slack, Power BI, etc.) et les route vers le
// Pillar Gateway pour nourrir les piliers ADVE automatiquement.
// ---------------------------------------------------------------------------

export const serverName = "advertis-inbound";
export const serverDescription =
  "Serveur MCP Advertis Inbound — Ingestion de signaux depuis les SaaS clients (Monday, Zoho, etc.) vers les piliers ADVE via le Pillar Gateway.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function updateConnectorStats(
  operatorId: string,
  connectorType: string,
  signalCount: number,
  avgConfidence: number,
) {
  try {
    await db.externalConnector.upsert({
      where: { operatorId_connectorType: { operatorId, connectorType } },
      update: {
        lastSyncAt: new Date(),
        signalCount: { increment: signalCount },
        avgConfidence,
        status: "ACTIVE",
      },
      create: {
        operatorId,
        connectorType,
        config: {},
        status: "ACTIVE",
        lastSyncAt: new Date(),
        signalCount,
        avgConfidence,
      },
    });
  } catch {
    // Non-fatal — stats update failure shouldn't break ingestion
  }
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export const tools: ToolDefinition[] = [
  // ---- Ingest Single PillarSignal ----
  {
    name: "ingestPillarSignal",
    description:
      "Ingère un signal depuis un SaaS externe vers un pilier ADVE. Le signal passe par le Pillar Gateway (validation, versioning, scoring, audit trail).",
    inputSchema: PillarSignalSchema.extend({
      strategyId: z.string().describe("ID de la stratégie cible"),
      operatorId: z.string().optional().describe("ID de l'opérateur (pour stats connecteur)"),
      connectorType: z.string().optional().describe("Type de connecteur source (monday, zoho, etc.)"),
    }),
    handler: async (input) => {
      const signal = PillarSignalSchema.parse(input);
      const strategyId = input.strategyId as string;
      const operatorId = input.operatorId as string | undefined;
      const connectorType = input.connectorType as string | undefined;

      // Enforce confidence floor based on source hierarchy
      const enforced = enforceConfidenceFloor(signal);

      // Write through Pillar Gateway — full 8-step pipeline
      const writeResult = await writePillarAndScore({
        strategyId,
        pillarKey: enforced.pillarKey,
        operation: {
          type: "MERGE_DEEP",
          patch: {
            _externalSignals: {
              [enforced.driver]: {
                value: enforced.value,
                confidence: enforced.confidence,
                source: enforced.source,
                externalRef: enforced.externalRef,
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
        author: {
          system: "EXTERNAL_SAAS",
          reason: `Signal from ${enforced.source}: ${enforced.driver}${enforced.externalRef ? ` (ref: ${enforced.externalRef})` : ""}`,
        },
        options: {
          skipValidation: false,
        },
      });

      // Create Signal record for feedback loop
      if (writeResult.success) {
        await db.signal.create({
          data: {
            strategyId,
            type: "EXTERNAL_SAAS",
            data: {
              pillarKey: enforced.pillarKey,
              driver: enforced.driver,
              value: enforced.value,
              source: enforced.source,
              confidence: enforced.confidence,
              externalRef: enforced.externalRef ?? null,
              metadata: enforced.metadata ?? null,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        // Update connector stats
        if (operatorId && connectorType) {
          await updateConnectorStats(operatorId, connectorType, 1, enforced.confidence);
        }
      }

      return {
        success: writeResult.success,
        version: writeResult.version,
        pillarKey: enforced.pillarKey,
        driver: enforced.driver,
        confidenceApplied: enforced.confidence,
        warnings: writeResult.warnings,
        error: writeResult.error,
      };
    },
  },

  // ---- Ingest Batch ----
  {
    name: "ingestBatch",
    description:
      "Ingère un lot de signaux depuis un SaaS externe. Chaque signal est traité individuellement via le Pillar Gateway.",
    inputSchema: z.object({
      strategyId: z.string().describe("ID de la stratégie cible"),
      operatorId: z.string().optional().describe("ID de l'opérateur"),
      connectorType: z.string().optional().describe("Type de connecteur source"),
      signals: z.array(PillarSignalSchema).min(1).max(50).describe("Lot de signaux (max 50)"),
    }),
    handler: async (input) => {
      const strategyId = input.strategyId as string;
      const signals = input.signals as z.infer<typeof PillarSignalSchema>[];
      const operatorId = input.operatorId as string | undefined;
      const connectorType = input.connectorType as string | undefined;

      const results = [];
      let successCount = 0;
      let totalConfidence = 0;

      for (const raw of signals) {
        try {
          const signal = enforceConfidenceFloor(raw);
          const writeResult = await writePillarAndScore({
            strategyId,
            pillarKey: signal.pillarKey,
            operation: {
              type: "MERGE_DEEP",
              patch: {
                _externalSignals: {
                  [signal.driver]: {
                    value: signal.value,
                    confidence: signal.confidence,
                    source: signal.source,
                    externalRef: signal.externalRef,
                    updatedAt: new Date().toISOString(),
                  },
                },
              },
            },
            author: {
              system: "EXTERNAL_SAAS",
              reason: `Batch signal: ${signal.driver}`,
            },
          });

          if (writeResult.success) {
            successCount++;
            totalConfidence += signal.confidence;

            await db.signal.create({
              data: {
                strategyId,
                type: "EXTERNAL_SAAS",
                data: {
                  pillarKey: signal.pillarKey,
                  driver: signal.driver,
                  value: signal.value,
                  source: signal.source,
                  confidence: signal.confidence,
                  externalRef: signal.externalRef ?? null,
                } as unknown as Prisma.InputJsonValue,
              },
            });
          }

          results.push({
            driver: signal.driver,
            pillarKey: signal.pillarKey,
            success: writeResult.success,
            error: writeResult.error,
          });
        } catch (err) {
          results.push({
            driver: raw.driver,
            pillarKey: raw.pillarKey,
            success: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      // Update connector stats with batch totals
      if (operatorId && connectorType && successCount > 0) {
        const avgConf = totalConfidence / successCount;
        await updateConnectorStats(operatorId, connectorType, successCount, avgConf);
      }

      return {
        total: signals.length,
        success: successCount,
        failed: signals.length - successCount,
        results,
      };
    },
  },

  // ---- Get Connector Status ----
  {
    name: "getConnectorStatus",
    description:
      "Retourne l'état de santé et les statistiques d'un connecteur externe.",
    inputSchema: z.object({
      operatorId: z.string().describe("ID de l'opérateur"),
      connectorType: z.string().optional().describe("Type de connecteur (si omis, retourne tous)"),
    }),
    handler: async (input) => {
      const operatorId = input.operatorId as string;
      const connectorType = input.connectorType as string | undefined;

      if (connectorType) {
        const connector = await db.externalConnector.findUnique({
          where: { operatorId_connectorType: { operatorId, connectorType } },
        });
        return connector ?? { status: "NOT_CONFIGURED", connectorType };
      }

      const connectors = await db.externalConnector.findMany({
        where: { operatorId },
        orderBy: { updatedAt: "desc" },
      });

      return {
        operatorId,
        totalConnectors: connectors.length,
        activeConnectors: connectors.filter((c) => c.status === "ACTIVE").length,
        connectors,
      };
    },
  },

  // ---- List Available Pillar Mappings ----
  {
    name: "listPillarMappings",
    description:
      "Retourne les mappings disponibles entre événements SaaS et piliers ADVE.",
    inputSchema: z.object({}),
    handler: async () => {
      return {
        pillarKeys: PILLAR_KEYS,
        supportedConnectors: [
          {
            type: "monday",
            mappings: [
              { event: "Status → Done", pillarKey: "e", driver: "monday-velocity" },
              { event: "Timeline overdue", pillarKey: "r", driver: "monday-blocker" },
              { event: "WIP count", pillarKey: "s", driver: "monday-wip" },
            ],
          },
          {
            type: "zoho",
            mappings: [
              { event: "Deal stage progression", pillarKey: "v", driver: "zoho-pipeline" },
              { event: "Deal won", pillarKey: "t", driver: "zoho-conversion" },
              { event: "Deal lost", pillarKey: "r", driver: "zoho-loss" },
            ],
          },
        ],
      };
    },
  },
];

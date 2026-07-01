import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { PillarSignal } from "@/lib/types/pillar-signal";
import { enforceConfidenceFloor } from "@/lib/types/pillar-signal";
import { writePillarAndScore } from "@/server/services/pillar-gateway";

// ---------------------------------------------------------------------------
// ConnectorAdapter — Abstract base class for all Advertis inbound connectors.
//
// Each external SaaS connector (Monday, Zoho, Slack, Power BI, etc.) extends
// this base and implements:
//   - mapEventToSignals(event) → PillarSignal[]
//   - pollEvents(connectorId) → unknown[]
//
// The base handles: OAuth refresh, signal submission through Pillar Gateway,
// connector stats updates, error tracking, circuit breaker.
// ---------------------------------------------------------------------------

const MAX_CONSECUTIVE_FAILURES = 3;

export abstract class ConnectorAdapter {
  abstract readonly connectorType: string;

  /**
   * Maps a raw event from the external SaaS to one or more PillarSignal objects.
   * Each connector defines its own mapping rules (e.g., Monday task done → pillar E).
   */
  abstract mapEventToSignals(event: unknown): PillarSignal[];

  /**
   * Polls the external SaaS for events since last sync.
   * Returns raw events in the format of the external API.
   */
  abstract pollEvents(connectorId: string, since?: Date): Promise<unknown[]>;

  /**
   * Refreshes the OAuth token for a connector. Override for OAuth-based connectors.
   * Default implementation is a no-op (for API-key-based connectors).
   */
  async refreshToken(connectorId: string): Promise<string | null> {
    const connector = await db.externalConnector.findUnique({ where: { id: connectorId } });
    if (!connector) throw new Error(`Connector ${connectorId} not found`);
    const config = connector.config as Record<string, unknown>;
    return (config.accessToken as string) ?? null;
  }

  /**
   * Submits PillarSignal objects through the Pillar Gateway.
   * Internal call — no HTTP round-trip.
   */
  protected async submitSignals(
    signals: PillarSignal[],
    strategyId: string,
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const raw of signals) {
      try {
        const signal = enforceConfidenceFloor(raw);
        const result = await writePillarAndScore({
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
            reason: `${this.connectorType}: ${signal.driver}`,
          },
        });

        if (result.success) {
          success++;
          // Also create Signal record for feedback loop
          await db.signal.create({
            data: {
              strategyId,
              type: "EXTERNAL_SAAS",
              data: {
                connectorType: this.connectorType,
                pillarKey: signal.pillarKey,
                driver: signal.driver,
                value: signal.value,
                confidence: signal.confidence,
                externalRef: signal.externalRef ?? null,
              } as unknown as Prisma.InputJsonValue,
            },
          });
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Full sync cycle: refresh token → poll events → map to signals → submit.
   * Updates connector stats and handles errors with circuit breaker.
   */
  async sync(connectorId: string, strategyId: string): Promise<SyncResult> {
    const connector = await db.externalConnector.findUnique({ where: { id: connectorId } });
    if (!connector) {
      return { success: false, error: "Connector not found", signalsIngested: 0 };
    }

    // Mark as syncing
    await db.externalConnector.update({
      where: { id: connectorId },
      data: { status: "SYNCING" },
    });

    try {
      // 1. Refresh OAuth token
      await this.refreshToken(connectorId);

      // 2. Poll events since last sync
      const events = await this.pollEvents(connectorId, connector.lastSyncAt ?? undefined);

      // 3. Map all events to PillarSignals
      const allSignals: PillarSignal[] = [];
      for (const event of events) {
        try {
          const signals = this.mapEventToSignals(event);
          allSignals.push(...signals);
        } catch {
          // Skip individual event mapping errors
        }
      }

      // 4. Submit through Pillar Gateway
      const result = await this.submitSignals(allSignals, strategyId);

      // 5. Update connector stats — success
      const avgConfidence =
        allSignals.length > 0
          ? allSignals.reduce((sum, s) => sum + s.confidence, 0) / allSignals.length
          : connector.avgConfidence ?? 0;

      await db.externalConnector.update({
        where: { id: connectorId },
        data: {
          status: "ACTIVE",
          lastSyncAt: new Date(),
          signalCount: { increment: result.success },
          avgConfidence,
          errorLog: undefined, // Clear errors on success
        },
      });

      return {
        success: true,
        eventsPolled: events.length,
        signalsIngested: result.success,
        signalsFailed: result.failed,
      };
    } catch (err) {
      // Track consecutive failures for circuit breaker
      const errorLog = (connector.errorLog as unknown[]) ?? [];
      const newError = {
        timestamp: new Date().toISOString(),
        message: err instanceof Error ? err.message : "Unknown error",
      };
      const updatedLog = [...errorLog.slice(-9), newError]; // Keep last 10 errors

      const consecutiveFailures = updatedLog.length;
      const newStatus = consecutiveFailures >= MAX_CONSECUTIVE_FAILURES ? "ERROR" : "ACTIVE";

      await db.externalConnector.update({
        where: { id: connectorId },
        data: {
          status: newStatus,
          errorLog: updatedLog as Prisma.InputJsonValue,
        },
      });

      return {
        success: false,
        error: newError.message,
        signalsIngested: 0,
        circuitBroken: newStatus === "ERROR",
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SyncResult {
  success: boolean;
  error?: string;
  eventsPolled?: number;
  signalsIngested: number;
  signalsFailed?: number;
  circuitBroken?: boolean;
}

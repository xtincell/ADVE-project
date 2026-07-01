import { db } from "@/lib/db";
import type { PillarSignal } from "@/lib/types/pillar-signal";
import { ConnectorAdapter } from "../adapter-base";

// ---------------------------------------------------------------------------
// Monday.com Connector
//
// Maps Monday board events to ADVE pillar signals:
//   - Status → Done         → pillar E (Engagement) — velocity
//   - Timeline overdue      → pillar R (Risk) — blocker
//   - WIP count             → pillar S (Strategy) — work in progress
//   - Item created          → pillar E (Engagement) — initiative
// ---------------------------------------------------------------------------

// Monday API v2 GraphQL endpoint
const MONDAY_API_URL = "https://api.monday.com/v2";

// ---------------------------------------------------------------------------
// Types for Monday API responses
// ---------------------------------------------------------------------------

interface MondayItem {
  id: string;
  name: string;
  state: string; // "active" | "archived" | "deleted"
  updated_at: string;
  column_values: MondayColumnValue[];
  board?: { id: string; name: string };
}

interface MondayColumnValue {
  id: string;
  title: string;
  type: string;
  text: string;
  value: string | null;
}

interface MondayEvent {
  item: MondayItem;
  eventType: "status_change" | "timeline_overdue" | "wip_snapshot";
}

// ---------------------------------------------------------------------------
// Connector Implementation
// ---------------------------------------------------------------------------

export class MondayConnector extends ConnectorAdapter {
  readonly connectorType = "monday";

  // -- Mapping rules --

  mapEventToSignals(event: unknown): PillarSignal[] {
    const mondayEvent = event as MondayEvent;
    const signals: PillarSignal[] = [];

    switch (mondayEvent.eventType) {
      case "status_change": {
        const statusCol = mondayEvent.item.column_values.find(
          (c) => c.type === "status" || c.title.toLowerCase().includes("status")
        );
        const statusText = statusCol?.text ?? "";
        const isDone =
          statusText.toLowerCase().includes("done") ||
          statusText.toLowerCase().includes("terminé") ||
          statusText.toLowerCase().includes("complete");

        if (isDone) {
          signals.push({
            pillarKey: "e",
            driver: "monday-velocity",
            value: {
              completed: true,
              itemName: mondayEvent.item.name,
              itemId: mondayEvent.item.id,
              boardName: mondayEvent.item.board?.name,
            },
            source: "EXTERNAL_SAAS",
            confidence: 0.7,
            externalRef: `monday:item:${mondayEvent.item.id}`,
          });
        }
        break;
      }

      case "timeline_overdue": {
        const timelineCol = mondayEvent.item.column_values.find(
          (c) => c.type === "timeline" || c.type === "date"
        );
        let daysLate = 0;
        if (timelineCol?.value) {
          try {
            const parsed = JSON.parse(timelineCol.value);
            const endDate = parsed.to ?? parsed.date;
            if (endDate) {
              daysLate = Math.floor(
                (Date.now() - new Date(endDate).getTime()) / (1000 * 60 * 60 * 24)
              );
            }
          } catch {
            // Can't parse timeline — use default
          }
        }

        if (daysLate > 0) {
          signals.push({
            pillarKey: "r",
            driver: "monday-blocker",
            value: {
              overdue: true,
              daysLate,
              itemName: mondayEvent.item.name,
              itemId: mondayEvent.item.id,
            },
            source: "EXTERNAL_SAAS",
            confidence: 0.6,
            externalRef: `monday:item:${mondayEvent.item.id}`,
          });
        }
        break;
      }

      case "wip_snapshot": {
        // WIP snapshots are aggregated from polling, not individual events
        const wipCount = mondayEvent.item.column_values.find(
          (c) => c.title.toLowerCase().includes("wip") || c.title.toLowerCase().includes("en cours")
        );
        signals.push({
          pillarKey: "s",
          driver: "monday-wip",
          value: {
            wipCount: wipCount ? parseInt(wipCount.text, 10) || 0 : 0,
            boardName: mondayEvent.item.board?.name,
          },
          source: "EXTERNAL_SAAS",
          confidence: 0.5,
          externalRef: `monday:board:${mondayEvent.item.board?.id}`,
        });
        break;
      }
    }

    return signals;
  }

  // -- Polling --

  async pollEvents(connectorId: string, since?: Date): Promise<MondayEvent[]> {
    const connector = await db.externalConnector.findUnique({ where: { id: connectorId } });
    if (!connector) throw new Error("Connector not found");

    const config = connector.config as Record<string, unknown>;
    const accessToken = config.accessToken as string;
    if (!accessToken) throw new Error("No Monday access token configured");

    const boardIds = (config.boardIds as string[]) ?? [];
    if (boardIds.length === 0) throw new Error("No Monday boards configured");

    const sinceDate = since ?? new Date(Date.now() - 24 * 60 * 60 * 1000); // Default: last 24h
    const events: MondayEvent[] = [];

    for (const boardId of boardIds) {
      const query = `
        query {
          boards(ids: [${boardId}]) {
            items_page(limit: 50) {
              items {
                id
                name
                state
                updated_at
                column_values {
                  id
                  title
                  type
                  text
                  value
                }
                board {
                  id
                  name
                }
              }
            }
          }
        }
      `;

      const response = await fetch(MONDAY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: accessToken,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`Monday API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const items: MondayItem[] = data?.data?.boards?.[0]?.items_page?.items ?? [];

      for (const item of items) {
        const updatedAt = new Date(item.updated_at);
        if (updatedAt < sinceDate) continue;

        // Check for status changes (completed items)
        const statusCol = item.column_values.find(
          (c) => c.type === "status" || c.title.toLowerCase().includes("status")
        );
        if (statusCol) {
          events.push({ item, eventType: "status_change" });
        }

        // Check for overdue timelines
        const timelineCol = item.column_values.find(
          (c) => c.type === "timeline" || c.type === "date"
        );
        if (timelineCol?.value) {
          try {
            const parsed = JSON.parse(timelineCol.value);
            const endDate = parsed.to ?? parsed.date;
            if (endDate && new Date(endDate) < new Date()) {
              events.push({ item, eventType: "timeline_overdue" });
            }
          } catch {
            // Skip unparseable timelines
          }
        }
      }
    }

    return events;
  }

  // -- OAuth token refresh --

  async refreshToken(connectorId: string): Promise<string | null> {
    const connector = await db.externalConnector.findUnique({ where: { id: connectorId } });
    if (!connector) return null;

    const config = connector.config as Record<string, unknown>;
    const refreshToken = config.refreshToken as string | undefined;
    if (!refreshToken) {
      // API token (no refresh needed)
      return config.accessToken as string;
    }

    const clientId = process.env.MONDAY_CLIENT_ID;
    const clientSecret = process.env.MONDAY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("MONDAY_CLIENT_ID and MONDAY_CLIENT_SECRET must be set");
    }

    const response = await fetch("https://auth.monday.com/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      throw new Error(`Monday OAuth refresh failed: ${response.status}`);
    }

    const tokens = await response.json();
    const newConfig = {
      ...config,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? refreshToken,
      tokenExpiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    };

    await db.externalConnector.update({
      where: { id: connectorId },
      data: { config: newConfig },
    });

    return tokens.access_token;
  }
}

export const mondayConnector = new MondayConnector();

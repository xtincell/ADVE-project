import { db } from "@/lib/db";
import type { PillarSignal } from "@/lib/types/pillar-signal";
import { ConnectorAdapter } from "../adapter-base";

// ---------------------------------------------------------------------------
// Zoho CRM Connector
//
// Maps Zoho CRM events to ADVE pillar signals:
//   - Deal stage progression → pillar V (Valeur) — pipeline health
//   - Deal won              → pillar T (Track)  — verified revenue
//   - Deal lost             → pillar R (Risk)   — loss analysis
//   - Lead conversion       → pillar E (Engagement) — market traction
// ---------------------------------------------------------------------------

const ZOHO_API_BASE = "https://www.zohoapis.com/crm/v5";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ZohoDeal {
  id: string;
  Deal_Name: string;
  Stage: string;
  Amount: number | null;
  Probability: number | null;
  Closing_Date: string | null;
  Modified_Time: string;
  Owner: { id: string; name: string };
  Contact_Name?: { id: string; name: string };
  Lost_Reason?: string;
}

interface ZohoEvent {
  deal: ZohoDeal;
  eventType: "stage_change" | "deal_won" | "deal_lost";
}

// ---------------------------------------------------------------------------
// Stage classification helpers
// ---------------------------------------------------------------------------

const WON_STAGES = ["closed won", "gagné", "fermé gagné", "won"];
const LOST_STAGES = ["closed lost", "perdu", "fermé perdu", "lost"];

function isWonStage(stage: string): boolean {
  return WON_STAGES.some((s) => stage.toLowerCase().includes(s));
}

function isLostStage(stage: string): boolean {
  return LOST_STAGES.some((s) => stage.toLowerCase().includes(s));
}

// ---------------------------------------------------------------------------
// Connector Implementation
// ---------------------------------------------------------------------------

export class ZohoConnector extends ConnectorAdapter {
  readonly connectorType = "zoho";

  // -- Mapping rules --

  mapEventToSignals(event: unknown): PillarSignal[] {
    const zohoEvent = event as ZohoEvent;
    const signals: PillarSignal[] = [];
    const deal = zohoEvent.deal;

    switch (zohoEvent.eventType) {
      case "deal_won": {
        // Verified revenue — high confidence
        signals.push({
          pillarKey: "t",
          driver: "zoho-conversion",
          value: {
            amount: deal.Amount ?? 0,
            dealName: deal.Deal_Name,
            stage: deal.Stage,
            closingDate: deal.Closing_Date,
          },
          source: "EXTERNAL_SAAS",
          confidence: 0.85, // Verified data — above floor
          externalRef: `zoho:deal:${deal.id}`,
        });
        break;
      }

      case "deal_lost": {
        signals.push({
          pillarKey: "r",
          driver: "zoho-loss",
          value: {
            amount: deal.Amount ?? 0,
            dealName: deal.Deal_Name,
            reason: deal.Lost_Reason ?? "Non spécifié",
            stage: deal.Stage,
          },
          source: "EXTERNAL_SAAS",
          confidence: 0.7,
          externalRef: `zoho:deal:${deal.id}`,
        });
        break;
      }

      case "stage_change": {
        signals.push({
          pillarKey: "v",
          driver: "zoho-pipeline",
          value: {
            stage: deal.Stage,
            amount: deal.Amount ?? 0,
            probability: deal.Probability ?? 0,
            dealName: deal.Deal_Name,
            owner: deal.Owner.name,
          },
          source: "EXTERNAL_SAAS",
          confidence: 0.65,
          externalRef: `zoho:deal:${deal.id}`,
        });
        break;
      }
    }

    return signals;
  }

  // -- Polling --

  async pollEvents(connectorId: string, since?: Date): Promise<ZohoEvent[]> {
    const connector = await db.externalConnector.findUnique({ where: { id: connectorId } });
    if (!connector) throw new Error("Connector not found");

    const config = connector.config as Record<string, unknown>;
    const accessToken = config.accessToken as string;
    if (!accessToken) throw new Error("No Zoho access token configured");

    const sinceDate = since ?? new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sinceISO = sinceDate.toISOString().replace("T", " ").slice(0, 19);

    // Fetch recently modified deals
    const url = `${ZOHO_API_BASE}/Deals/search?criteria=(Modified_Time:greater_than:${encodeURIComponent(sinceISO)})&per_page=100`;
    const response = await fetch(url, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired — trigger refresh and retry once
        await this.refreshToken(connectorId);
        return this.pollEvents(connectorId, since);
      }
      throw new Error(`Zoho API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const deals: ZohoDeal[] = data?.data ?? [];
    const events: ZohoEvent[] = [];

    for (const deal of deals) {
      if (isWonStage(deal.Stage)) {
        events.push({ deal, eventType: "deal_won" });
      } else if (isLostStage(deal.Stage)) {
        events.push({ deal, eventType: "deal_lost" });
      } else {
        events.push({ deal, eventType: "stage_change" });
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
      return config.accessToken as string;
    }

    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET must be set");
    }

    const accountsUrl = (config.accountsUrl as string) ?? "https://accounts.zoho.com";
    const params = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    });

    const response = await fetch(`${accountsUrl}/oauth/v2/token?${params}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(`Zoho OAuth refresh failed: ${response.status}`);
    }

    const tokens = await response.json();
    if (tokens.error) {
      throw new Error(`Zoho OAuth error: ${tokens.error}`);
    }

    const newConfig = {
      ...config,
      accessToken: tokens.access_token,
      tokenExpiresAt: Date.now() + (tokens.expires_in ?? 3600) * 1000,
    };

    await db.externalConnector.update({
      where: { id: connectorId },
      data: { config: newConfig },
    });

    return tokens.access_token;
  }
}

export const zohoConnector = new ZohoConnector();

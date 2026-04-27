/**
 * Advertis Connectors — Registry and orchestration
 *
 * Central registry for all inbound SaaS connectors.
 * Exposes typed access to individual connectors and batch sync operations.
 */

export { ConnectorAdapter } from "./adapter-base";
export type { SyncResult } from "./adapter-base";
export { MondayConnector, mondayConnector } from "./monday";
export { ZohoConnector, zohoConnector } from "./zoho";

import { mondayConnector } from "./monday";
import { zohoConnector } from "./zoho";
import type { ConnectorAdapter } from "./adapter-base";

const CONNECTOR_REGISTRY: Record<string, ConnectorAdapter> = {
  monday: mondayConnector,
  zoho: zohoConnector,
};

export function getConnector(type: string): ConnectorAdapter | null {
  return CONNECTOR_REGISTRY[type] ?? null;
}

export function listConnectorTypes(): string[] {
  return Object.keys(CONNECTOR_REGISTRY);
}

/**
 * @lafusee/sdk — public client for La Fusée Industry OS.
 *
 * Wraps the public tRPC surface as a typed REST-like SDK so partners
 * (UPgraders agency network, integrations, mobile apps) can consume
 * the OS without bundling tRPC client.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — extensibility surface
 * for the partner ecosystem.
 */

export * from "./types";
export { LaFuseeClient, createLaFuseeClient } from "./client";

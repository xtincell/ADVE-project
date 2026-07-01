/**
 * src/server/governance/nsp/types.ts — Neteru Streaming Protocol contract.
 *
 * Layer 2. Re-exports the IntentProgressEvent shape from src/domain and
 * defines the NSP envelope.
 */

import type { IntentProgressEvent, IntentPhase } from "@/domain";

export type NspEnvelope =
  | { type: "PROGRESS"; event: IntentProgressEvent }
  | { type: "HEARTBEAT"; emittedAt: string }
  | { type: "RESUME"; lastEmittedAt: string }
  | { type: "CLOSE"; reason: IntentPhase };

/**
 * NSP — Neteru Streaming Protocol — public API.
 *
 * Pas de manifest : utilitaire pur de transport, pas une capability métier.
 * Les Intents qui veulent stream branchent sur `publish(userId, event)`.
 */

export { publish, subscribe, listenerCount, activeUserCount, clearAll } from "./sse-broker";
export type {
  NspEvent,
  NspListener,
  NotificationEvent,
  IntentProgressEvent,
  McpInvocationEvent,
} from "./event-types";

/**
 * NSP — Neteru Streaming Protocol — event types.
 *
 * NSP est la couche transport runtime (SSE) qui pousse les events vers le client.
 * Le modèle persistant `IntentEmissionEvent` (prisma/schema.prisma:3110) reste la
 * source de vérité auditable ; NSP n'est que l'aiguillage in-memory pour live UI.
 */

export type NotificationEvent = {
  kind: "notification";
  id: string;
  userId: string;
  type: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  title: string;
  body: string;
  link?: string | null;
  createdAt: string;
};

export type IntentProgressEvent = {
  kind: "intent_progress";
  intentId: string;
  phase: string;
  stepName?: string;
  stepIndex?: number;
  stepTotal?: number;
  partial?: unknown;
};

export type McpInvocationEvent = {
  kind: "mcp_invocation";
  registryId: string;
  toolName: string;
  status: "PENDING" | "OK" | "FAILED" | "DEFERRED_AWAITING_CREDENTIALS";
  durationMs?: number;
};

export type NspEvent = NotificationEvent | IntentProgressEvent | McpInvocationEvent;

export type NspListener = (event: NspEvent) => void;

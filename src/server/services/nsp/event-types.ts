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

/**
 * Phase 21 F-E (ADR-0072) — Oracle progress streaming.
 *
 * 6 sub-kinds discriminés. Le frontend filtre par `event.strategyId`
 * (l'opérateur reçoit tous ses events via `subscribe(userId, ...)` —
 * le routing se fait par userId, pas par channel).
 *
 * Hiérarchie naturelle : l'Assembler (F-D) émet `assembler_*`, et chaque
 * sous-Intent `GENERATE_ORACLE_SECTION` (F-C) émet `section_*` au passage.
 * Le frontend voit donc les deux niveaux interlacés.
 */

export type OracleSectionStartedEvent = {
  kind: "oracle_section_started";
  strategyId: string;
  sectionId: number;
  sectionTitle: string;
  runner: { kind: "GLORY_SEQUENCE" | "GLORY_TOOL" | "FRAMEWORK"; ref: string };
  mode: "FRESH" | "REGEN" | "RETRY";
  startedAt: string;
};

export type OracleSectionCompletedEvent = {
  kind: "oracle_section_completed";
  strategyId: string;
  sectionId: number;
  sectionTitle: string;
  confidence: number | null;
  durationMs: number;
  version: number;
};

export type OracleSectionFailedEvent = {
  kind: "oracle_section_failed";
  strategyId: string;
  sectionId: number;
  sectionTitle: string;
  errorCode: string;
  errorMessage: string;
  attempts?: number;
  durationMs: number;
};

export type OracleAssemblerStartedEvent = {
  kind: "oracle_assembler_started";
  strategyId: string;
  scope: string;
  total: number;
  startedAt: string;
};

export type OracleAssemblerProgressEvent = {
  kind: "oracle_assembler_progress";
  strategyId: string;
  scope: string;
  total: number;
  completed: number;
  failed: number;
  pending: number;
  currentSectionId?: number;
};

export type OracleAssemblerDoneEvent = {
  kind: "oracle_assembler_done";
  strategyId: string;
  scope: string;
  overallStatus: "COMPLETE" | "PARTIAL" | "EMPTY";
  total: number;
  succeeded: number;
  failed: number;
  durationMs: number;
};

export type OracleStreamEvent =
  | OracleSectionStartedEvent
  | OracleSectionCompletedEvent
  | OracleSectionFailedEvent
  | OracleAssemblerStartedEvent
  | OracleAssemblerProgressEvent
  | OracleAssemblerDoneEvent;

export type NspEvent =
  | NotificationEvent
  | IntentProgressEvent
  | McpInvocationEvent
  | OracleStreamEvent;

export type NspListener = (event: NspEvent) => void;

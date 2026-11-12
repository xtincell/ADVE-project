/** Demande d'intervention : projection Signal → Mission, sans second stockage. */
const STATES = ["PENDING", "CONVERTED", "DISMISSED", "OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "COMPLETED", "CLOSED"] as const;
export type InterventionState = (typeof STATES)[number] | "UNKNOWN";
export function interventionState(value: unknown): InterventionState {
  if (typeof value !== "string") return "UNKNOWN";
  const state = value.trim().toUpperCase();
  return STATES.includes(state as (typeof STATES)[number]) ? state as InterventionState : "UNKNOWN";
}
export function readInterventionRequest(value: unknown) {
  const data = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
  const text = (key: string): string | null => typeof data[key] === "string" && data[key].trim()
    ? data[key] as string : null;
  const choice = <T extends string>(key: string, values: readonly T[]): T | null => {
    const value = text(key)?.trim().toLowerCase();
    return value && values.includes(value as T) ? value as T : null;
  };
  return {
    status: interventionState(data.status), rawStatus: text("status"),
    title: text("title"), description: text("description"),
    urgency: choice("urgency", ["low", "medium", "high", "critical"] as const),
    requestType: choice("requestType", ["one_off", "recurring", "emergency"] as const),
    requestedBy: text("requestedBy"), requestedAt: text("requestedAt"),
    missionId: text("missionId"), convertedAt: text("convertedAt"), convertedBy: text("convertedBy"),
    dismissReason: text("dismissReason"), dismissedAt: text("dismissedAt"), dismissedBy: text("dismissedBy"),
  };
}

/** A recorded attempt is not necessarily a usable deliverable version. */
export function isUsableGeneration(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  const meta = row._meta as Record<string, unknown> | undefined;
  if (row.error === true || meta?.error === true || row.errorCode || row.errorMessage) return false;
  if (["FAILED", "ERROR", "DEFERRED", "BLOCKED", "DENIED", "SKIPPED", "PENDING", "GENERATING", "IN_PROGRESS", "TIER_GATE_DENIED", "MANUAL_REQUIRED", "MANUAL_ENTRY_REQUIRED", "DEFERRED_AWAITING_CREDENTIALS"].includes(String(row.status))) return false;
  return Object.entries(row).some(([key, item]) => !key.startsWith("_") && key !== "status" && item != null && item !== "" && (!Array.isArray(item) || item.length > 0));
}

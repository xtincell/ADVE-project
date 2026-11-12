/** Callback credentials authenticate provider reconciliation and stay server-side.
 * Apply this projection to task rows and creation receipts at the API boundary;
 * keep the internal object intact for provider calls and resumptions.
 */
export function publicForgeTask<T extends { webhookSecret: string }>(task: T): Omit<T, "webhookSecret">;
export function publicForgeTask(task: unknown): unknown;
export function publicForgeTask(task: unknown): unknown {
  // Generic intent envelopes may have no output (veto/failure). Preserve them.
  if (!task || typeof task !== "object" || Array.isArray(task)) return task;
  const { webhookSecret: _webhookSecret, ...publicTask } = task as Record<string, unknown>;
  return publicTask;
}

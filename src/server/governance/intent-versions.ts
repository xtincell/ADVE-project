/**
 * src/server/governance/intent-versions.ts — Versioned intent handlers.
 *
 * Layer 2.
 *
 * The Phase-3 dispatcher resolves an Intent kind+version to the right
 * handler. v1 is the default. Migrating v1 → v2 is a 3-step process:
 *   (1) register v2 here, default still v1
 *   (2) flip default to v2
 *   (3) deprecate v1 (kept available behind flag for 2 sprints)
 */

import type { Intent } from "@/server/services/mestor/intents";

export type IntentHandler = (intent: Intent, ctx: unknown) => Promise<unknown>;

export interface VersionedHandlers {
  default: string;
  versions: Record<string, IntentHandler>;
}

export class IntentRegistry {
  private map = new Map<string, VersionedHandlers>();

  register(
    kind: string,
    version: string,
    handler: IntentHandler,
    isDefault = false,
  ): void {
    const entry =
      this.map.get(kind) ?? ({ default: version, versions: {} } as VersionedHandlers);
    entry.versions[version] = handler;
    if (isDefault) entry.default = version;
    this.map.set(kind, entry);
  }

  resolve(kind: string, version?: string): IntentHandler | undefined {
    const entry = this.map.get(kind);
    if (!entry) return undefined;
    return entry.versions[version ?? entry.default];
  }

  has(kind: string): boolean {
    return this.map.has(kind);
  }

  list(): readonly { kind: string; default: string; versions: readonly string[] }[] {
    return [...this.map.entries()].map(([kind, v]) => ({
      kind,
      default: v.default,
      versions: Object.keys(v.versions),
    }));
  }
}

export const intentRegistry = new IntentRegistry();

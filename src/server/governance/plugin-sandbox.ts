/**
 * plugin-sandbox.ts — runtime containment for external plugins.
 *
 * Implements the 4 mechanisms declared in ADR-0008. Plugins receive a
 * sandboxed `pluginCtx` with proxied `db`, `llm`, `fetch`, `emit` —
 * each scoped to what the plugin's manifest declared.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — without sandbox, plugins
 * cannot be trusted ⇒ no plugin marketplace ⇒ partner network cannot scale.
 */

import type { Prisma } from "@prisma/client";
import type { NeteruManifest, SideEffect } from "./manifest";
import { db } from "@/lib/db";

export class PluginSandboxViolation extends Error {
  constructor(
    public readonly pluginId: string,
    public readonly violation: string,
  ) {
    super(`[plugin:${pluginId}] sandbox violation — ${violation}`);
    this.name = "PluginSandboxViolation";
  }
}

export interface PluginManifest extends NeteruManifest {
  /** Tables the plugin is allowed to access (scoped via DB proxy). */
  readonly tablesAccessed?: readonly string[];
  /** External domains the plugin is allowed to fetch (whitelist). */
  readonly externalDomains?: readonly string[];
  /** Public key for manifest signature verification (Phase 2.7+). */
  readonly publicKey?: string;
}

export interface PluginContext {
  readonly pluginId: string;
  readonly db: Prisma.TransactionClient | typeof db;
  readonly llm: (prompt: string, opts?: { maxTokens?: number; tag?: string }) => Promise<{ text: string }>;
  readonly fetch: typeof fetch;
  readonly emit: (eventKind: string, payload: unknown) => Promise<void>;
}

/**
 * Build a sandboxed ctx for a plugin call. Caller wraps the plugin
 * function in a try/finally that uses this ctx as the only access point.
 */
export function buildPluginContext(manifest: PluginManifest): PluginContext {
  const pluginId = manifest.service;
  const declared = new Set<SideEffect>(
    manifest.capabilities.flatMap((c) => [...c.sideEffects]),
  );
  const allowedTables = new Set<string>(manifest.tablesAccessed ?? []);
  const allowedDomains = new Set<string>(manifest.externalDomains ?? []);
  const allowedEmits = new Set<string>(manifest.emits ?? []);

  // ── DB proxy ────────────────────────────────────────────────────
  const dbProxy: Prisma.TransactionClient | typeof db = new Proxy(db, {
    get(target, prop) {
      const tableName = String(prop);
      if (typeof target[prop as keyof typeof target] === "object" && tableName !== "$transaction") {
        if (!allowedTables.has(tableName)) {
          throw new PluginSandboxViolation(pluginId, `attempted access to table '${tableName}' not in tablesAccessed[]`);
        }
        const tableClient = target[prop as keyof typeof target];
        return new Proxy(tableClient as object, {
          get(tt, op) {
            const opName = String(op);
            if (
              ["create", "update", "delete", "upsert", "createMany", "updateMany", "deleteMany"].includes(opName)
              && !declared.has("DB_WRITE")
            ) {
              throw new PluginSandboxViolation(pluginId, `attempted DB_WRITE on '${tableName}.${opName}' but DB_WRITE not declared`);
            }
            if (
              ["findFirst", "findMany", "findUnique", "count", "aggregate", "groupBy"].includes(opName)
              && !declared.has("DB_READ")
              && !declared.has("DB_WRITE")
            ) {
              throw new PluginSandboxViolation(pluginId, `attempted DB_READ on '${tableName}.${opName}' but DB_READ not declared`);
            }
            return tt[op as keyof typeof tt];
          },
        });
      }
      return target[prop as keyof typeof target];
    },
  });

  // ── LLM proxy (delegates to llm-gateway with metering) ─────────
  const llmProxy: PluginContext["llm"] = async (prompt, opts) => {
    if (!declared.has("LLM_CALL")) {
      throw new PluginSandboxViolation(pluginId, `attempted LLM_CALL but not declared`);
    }
    const { callLLM } = await import("@/server/services/llm-gateway");
    const result = await callLLM({
      system: `You are an extension running in sandbox. Plugin: ${pluginId}.`,
      prompt,
      caller: `plugin:${pluginId}`,
      maxOutputTokens: opts?.maxTokens ?? 1000,
      tags: opts?.tag ? [opts.tag] : undefined,
    });
    return { text: result.text };
  };

  // ── fetch proxy ────────────────────────────────────────────────
  const fetchProxy: typeof fetch = async (input, init) => {
    if (!declared.has("EXTERNAL_API")) {
      throw new PluginSandboxViolation(pluginId, `attempted EXTERNAL_API but not declared`);
    }
    const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
    let host: string;
    try {
      host = new URL(urlStr).host;
    } catch {
      throw new PluginSandboxViolation(pluginId, `invalid URL: ${urlStr}`);
    }
    if (!allowedDomains.has(host) && ![...allowedDomains].some((d) => host.endsWith(`.${d}`))) {
      throw new PluginSandboxViolation(pluginId, `domain '${host}' not in externalDomains[] whitelist`);
    }
    return fetch(input, init);
  };

  // ── emit proxy ─────────────────────────────────────────────────
  const emitProxy: PluginContext["emit"] = async (eventKind, payload) => {
    if (!declared.has("EVENT_EMIT")) {
      throw new PluginSandboxViolation(pluginId, `attempted EVENT_EMIT but not declared`);
    }
    if (!allowedEmits.has(eventKind)) {
      throw new PluginSandboxViolation(pluginId, `eventKind '${eventKind}' not in emits[] whitelist`);
    }
    const { eventBus } = await import("./event-bus");
    eventBus.publish(eventKind as never, payload as never);
  };

  return {
    pluginId,
    db: dbProxy,
    llm: llmProxy,
    fetch: fetchProxy,
    emit: emitProxy,
  };
}

/**
 * Helper for tests: validate that a plugin manifest declares everything
 * needed to fulfill its capabilities. Returns array of issues.
 */
export function validatePluginManifest(manifest: PluginManifest): string[] {
  const issues: string[] = [];
  for (const cap of manifest.capabilities) {
    if (cap.sideEffects.includes("DB_WRITE") || cap.sideEffects.includes("DB_READ")) {
      if (!manifest.tablesAccessed || manifest.tablesAccessed.length === 0) {
        issues.push(`Capability '${cap.name}' has DB side-effect but manifest.tablesAccessed is empty`);
      }
    }
    if (cap.sideEffects.includes("EXTERNAL_API")) {
      if (!manifest.externalDomains || manifest.externalDomains.length === 0) {
        issues.push(`Capability '${cap.name}' has EXTERNAL_API but manifest.externalDomains is empty`);
      }
    }
    if (cap.sideEffects.includes("EVENT_EMIT")) {
      if (!manifest.emits || manifest.emits.length === 0) {
        issues.push(`Capability '${cap.name}' has EVENT_EMIT but manifest.emits is empty`);
      }
    }
  }
  return issues;
}

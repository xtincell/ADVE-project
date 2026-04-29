/**
 * src/server/governance/bootstrap.ts — Wire Seshat / Thot / NSP listeners
 * to the event bus on app start.
 *
 * Layer 2. Imported once in src/server/trpc/init.ts (or app/layout) so the
 * subscriptions are registered before the first request.
 *
 * Idempotent: calling bootstrap() twice is a no-op.
 */

import { eventBus } from "./event-bus";
import { auditManifests } from "./registry";

let booted = false;

export function bootstrapGovernance(): void {
  if (booted) return;
  booted = true;

  // Audit manifests at boot. Any issues are logged loudly — CI catches them
  // earlier, but defensive in case of mis-deploy.
  const audit = auditManifests();
  if (audit.issues.length > 0) {
    console.error(
      `[governance] manifest audit found ${audit.issues.length} issue(s):`,
    );
    for (const i of audit.issues) console.error(`  - ${i}`);
  }

  // Seshat — observe completed intents (fire-and-forget; failures swallowed).
  // Capability detection is dynamic: services may not yet export the hooks
  // (Phase 3 introduces them gradually).
  eventBus.subscribe("intent.completed", async (e) => {
    try {
      const mod = (await import("@/server/services/seshat")) as { observeIntent?: (id: string, r: unknown) => Promise<void> };
      await mod.observeIntent?.(e.intentId, e.result);
    } catch {
      // Seshat-down must not break the pipeline.
    }
  });

  // Thot — record realised cost.
  eventBus.subscribe("intent.completed", async (e) => {
    if (typeof e.costUsd !== "number") return;
    try {
      const mod = (await import("@/server/services/financial-brain")) as { recordCost?: (args: { intentId: string; costUsd: number }) => Promise<void> };
      await mod.recordCost?.({ intentId: e.intentId, costUsd: e.costUsd });
    } catch {
      // Cost-tracking failure is recoverable.
    }
  });

  // Tarsis — listen for raw signals to seed the weak-signal pipeline.
  eventBus.subscribe("tarsis.signal-detected", async (e) => {
    try {
      const mod = (await import("@/server/services/seshat/tarsis")) as { ingestSignal?: (e: unknown) => Promise<void> };
      await mod.ingestSignal?.(e);
    } catch {
      /* swallow */
    }
  });

  // D-6 — phase synchronisation. Whenever Notoria's pipeline advances
  // OR a pillar is written through pillar-gateway, re-evaluate the
  // strategy phase. If it changed, publish strategy.phase-changed so
  // observers (NSP, audit log, dashboards) see the transition.
  const phaseCache = new Map<string, import("@/domain").StrategyLifecyclePhase>();
  const reevaluatePhase = async (strategyId: string) => {
    try {
      const { getCurrentPhase } = await import("./strategy-phase");
      const resolution = await getCurrentPhase(strategyId);
      const previous = phaseCache.get(strategyId) ?? null;
      if (previous !== resolution.phase) {
        phaseCache.set(strategyId, resolution.phase);
        eventBus.publish("strategy.phase-changed", {
          strategyId,
          from: previous,
          to: resolution.phase,
        });
      }
    } catch {
      // Phase resolution failures are recoverable; the next event re-tries.
    }
  };
  eventBus.subscribe("pipeline.stage-advanced", (e) => {
    void reevaluatePhase(e.strategyId);
  });
  eventBus.subscribe("pillar.written", (e) => {
    void reevaluatePhase(e.strategyId);
  });

  console.log(`[governance] bootstrap complete (${audit.count} manifests).`);
}

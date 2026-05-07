/**
 * Glory tools — DELEGATE handler registry.
 *
 * Phase 20 (ADR-0037 PR-I extension + NEFER §3.1) — pattern symétrique à
 * MCP mais pour services internes. Permet d'exposer une opération non-LLM
 * (web fetch, DB persist, transformation déterministe) sous forme de Glory
 * tool registry-discoverable + tier-gateable + chaînable en GlorySequence.
 *
 * Ne PAS utiliser pour des opérations LLM — celles-ci passent par le branch
 * standard `executeTool` qui résout `tool.promptTemplate` et appelle
 * `callLLM`. DELEGATE est réservé aux étapes purement techniques.
 *
 * Inscription : ajouter une entrée dans `DELEGATE_HANDLERS` ci-dessous +
 * référencer le `handlerKey` dans `GloryToolDef.delegateDescriptor`.
 *
 * Format handler :
 *   ```ts
 *   async (input, ctx) => Record<string, unknown>
 *   ```
 *   - `input` : Record<string, string> (JSON-stringified si valeur non-string)
 *   - `ctx` : { strategyId } — strategyId="(global)" sentinel autorisé pour
 *     les opérations cross-brand stateless (ex: ingestion KnowledgeEntry)
 *   - retour : Record<string, unknown> mergé dans le SequenceContext
 *
 * Anti-pattern : ne PAS appeler `callLLM` depuis un handler DELEGATE. Si
 * une opération nécessite un appel LLM, la décomposer en step LLM séparé
 * dans la GlorySequence (un Glory tool LLM pur + un Glory tool DELEGATE
 * pour le post-traitement déterministe).
 */

export type DelegateHandler = (
  input: Record<string, string>,
  ctx: { strategyId: string },
) => Promise<Record<string, unknown>>;

const HANDLERS = new Map<string, DelegateHandler>();

/**
 * Registers a delegate handler. Called by service init modules at module
 * load time (lazy import in engine.ts ensures the registration happens
 * before first lookup).
 */
export function registerDelegateHandler(handlerKey: string, handler: DelegateHandler): void {
  if (HANDLERS.has(handlerKey)) {
    // Idempotent — silent re-registration (HMR / multiple imports tolerated)
    HANDLERS.set(handlerKey, handler);
    return;
  }
  HANDLERS.set(handlerKey, handler);
}

export function getDelegateHandler(handlerKey: string): DelegateHandler | undefined {
  return HANDLERS.get(handlerKey);
}

export function listRegisteredHandlerKeys(): string[] {
  return Array.from(HANDLERS.keys()).sort();
}

// ─── Bootstrap helper ────────────────────────────────────────────────────
// Each delegate-providing service module imports this registry and calls
// `registerDelegateHandler(...)` at module load. The bootstrap function
// below ensures all known delegate-providing modules are imported (and
// thus their side-effect registration runs). Idempotent — safe to call
// multiple times. Called by `engine.ts` (executeDelegateTool path) and by
// `commandant.ts` (cross-brand handler-chaining path).
//
// Anti-pattern à éviter : import side-effect de delegates.ts ici directement
// — créerait un cycle (delegates → registry → delegates) qui casse la TDZ.
//
// Adding a new delegate-providing service : add a dynamic import in
// `bootstrapDelegates` below.

let bootstrapped = false;

export async function bootstrapDelegates(): Promise<void> {
  if (bootstrapped) return;
  // Dynamic imports break the circular dependency. Each module's top-level
  // `registerDelegateHandler(...)` calls run as side-effects.
  await import("@/server/services/artemis/market-research/delegates");
  bootstrapped = true;
}

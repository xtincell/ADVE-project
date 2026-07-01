/**
 * rate-policy.ts — Police de débit LLM **par modèle** (RPM / concurrence / RPS).
 *
 * Doctrine « le système n'improvise pas » : chaque modèle a une politique de
 * débit DÉCLARÉE (requêtes/minute, requêtes concurrentes max, intervalle
 * minimal entre départs). Avant tout appel provider, le gateway acquiert un
 * créneau auprès du limiteur ; si la limite est atteinte, l'appel **attend**
 * (file) au lieu de partir et de se prendre un 429.
 *
 * Pourquoi : les modèles OpenRouter en preview (ex. `owl-alpha`) ont des limites
 * RPS/RPM strictes. Un Oracle assembler qui tire 35 sections, des chunks
 * d'enrichissement parallèles, etc. peuvent dépasser ces limites et casser. Le
 * limiteur proactif borne le débit en amont — déterministe, configurable, jamais
 * d'estimation au doigt mouillé.
 *
 * Portée : **process-local** (une instance de serveur). En multi-pod, un débit
 * global exact exigerait un store partagé (Redis) — repli documenté, hors scope
 * (cf. résidu « Cache Redis cross-pod »). Le limiteur local reste un garde-fou
 * réel et suffisant en mono-instance / faible parallélisme.
 */

export interface ModelRatePolicy {
  /** Requêtes max par minute (fenêtre glissante 60 s). */
  rpm: number;
  /** Requêtes concurrentes max sur ce modèle. */
  maxConcurrent: number;
  /** Intervalle minimal entre deux départs (ms) — borne le RPS. 0 = non borné. */
  minIntervalMs: number;
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Politique par défaut — appliquée à tout modèle sans entrée dédiée. Volontairement
 * conservatrice : mieux vaut sérialiser un peu que marteler un provider inconnu.
 */
function defaultPolicy(): ModelRatePolicy {
  return {
    rpm: envInt("LLM_DEFAULT_RPM", 60),
    maxConcurrent: envInt("LLM_DEFAULT_CONCURRENCY", 4),
    minIntervalMs: envInt("LLM_DEFAULT_MIN_INTERVAL_MS", 0),
  };
}

/**
 * Registre des politiques par modèle. Clé = fragment du slug servi (match exact
 * puis sous-chaîne — « owl-alpha » couvre « openrouter/owl-alpha »). Chaque
 * limite est surchargeable par variable d'environnement pour ne RIEN coder en
 * dur côté valeur : le code déclare la STRUCTURE, l'opérateur fixe les chiffres.
 */
function buildRegistry(): Record<string, ModelRatePolicy> {
  return {
    // owl-alpha (OpenRouter preview) — limites strictes par défaut, ajustables.
    "owl-alpha": {
      rpm: envInt("OWL_ALPHA_RPM", 20),
      maxConcurrent: envInt("OWL_ALPHA_CONCURRENCY", 2),
      minIntervalMs: envInt("OWL_ALPHA_MIN_INTERVAL_MS", 1500),
    },
  };
}

let REGISTRY = buildRegistry();
let DEFAULT = defaultPolicy();

export interface ResolvedRatePolicy {
  /** Clé canonique du bucket (modèles synonymes partagent un bucket). */
  key: string;
  policy: ModelRatePolicy;
}

/** Résout la politique d'un modèle servi : exact → sous-chaîne → défaut. */
export function resolveRatePolicy(servedModel: string): ResolvedRatePolicy {
  const model = (servedModel || "").toLowerCase();
  const exact = REGISTRY[model];
  if (exact) return { key: model, policy: exact };
  for (const key of Object.keys(REGISTRY)) {
    const hit = REGISTRY[key];
    if (hit && model.includes(key)) return { key, policy: hit };
  }
  return { key: "__default__", policy: DEFAULT };
}

// ── Limiteur (process-local) ────────────────────────────────────────────────

interface BucketState {
  active: number;
  /** Timestamps (ms) des départs récents — fenêtre glissante RPM. */
  starts: number[];
  lastStart: number;
}

const buckets = new Map<string, BucketState>();

function getBucket(key: string): BucketState {
  let b = buckets.get(key);
  if (!b) {
    b = { active: 0, starts: [], lastStart: 0 };
    buckets.set(key, b);
  }
  return b;
}

function pruneWindow(b: BucketState, now: number): void {
  const cutoff = now - 60_000;
  if (b.starts.length && b.starts[0]! < cutoff) {
    b.starts = b.starts.filter((t) => t >= cutoff);
  }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Acquiert un créneau pour `servedModel`, en respectant concurrence + RPM + RPS.
 * Attend (file) tant que la limite est atteinte. **Toujours** appairer avec
 * `releaseSlot` (idéalement via `runWithRateLimit`).
 */
export async function acquireSlot(servedModel: string): Promise<string> {
  const { key, policy } = resolveRatePolicy(servedModel);
  const b = getBucket(key);

  // Garde-fou : jamais de boucle infinie silencieuse — on borne l'attente totale.
  const deadline = Date.now() + envInt("LLM_RATE_MAX_WAIT_MS", 120_000);

  for (;;) {
    const now = Date.now();
    pruneWindow(b, now);

    const underConcurrency = b.active < policy.maxConcurrent;
    const underRpm = b.starts.length < policy.rpm;
    const intervalOk = policy.minIntervalMs <= 0 || now - b.lastStart >= policy.minIntervalMs;

    if (underConcurrency && underRpm && intervalOk) {
      b.active++;
      b.starts.push(now);
      b.lastStart = now;
      return key;
    }

    if (now >= deadline) {
      // Plutôt que d'attendre indéfiniment, on part quand même (le provider
      // tranchera) mais on a borné le débit au mieux. On compte le départ.
      b.active++;
      b.starts.push(now);
      b.lastStart = now;
      return key;
    }

    const waits: number[] = [];
    if (!intervalOk) waits.push(policy.minIntervalMs - (now - b.lastStart));
    if (!underRpm && b.starts.length) waits.push(b.starts[0]! + 60_000 - now);
    if (!underConcurrency) waits.push(40); // sonde la libération d'un slot
    const wait = Math.max(5, Math.min(...waits.filter((w) => w > 0)));
    await sleep(Math.min(wait, 1000));
  }
}

/** Libère un créneau précédemment acquis (clé renvoyée par `acquireSlot`). */
export function releaseSlot(key: string): void {
  const b = buckets.get(key);
  if (b && b.active > 0) b.active--;
}

/** Exécute `fn` sous police de débit du modèle servi (acquire/finally release). */
export async function runWithRateLimit<T>(servedModel: string, fn: () => Promise<T>): Promise<T> {
  const key = await acquireSlot(servedModel);
  try {
    return await fn();
  } finally {
    releaseSlot(key);
  }
}

// ── Hooks de test ───────────────────────────────────────────────────────────

export function _setRatePolicyForTest(
  registry?: Record<string, ModelRatePolicy>,
  fallback?: ModelRatePolicy,
): void {
  if (registry) REGISTRY = registry;
  if (fallback) DEFAULT = fallback;
}

export function _resetRateLimiterForTest(): void {
  buckets.clear();
  REGISTRY = buildRegistry();
  DEFAULT = defaultPolicy();
}

export function _getBucketForTest(servedModel: string): { key: string; active: number; recent: number } {
  const { key } = resolveRatePolicy(servedModel);
  const b = getBucket(key);
  pruneWindow(b, Date.now());
  return { key, active: b.active, recent: b.starts.length };
}

/**
 * Ops daemon in-process (vague C) — planificateur interne des routes
 * `/api/cron/*` pour les déploiements SANS cron externe (Coolify/pm2
 * self-host). Reprend exactement les cadences de `scheduled-ops.yml`
 * (le workflow GitHub reste utilisable en ceinture+bretelles : le claim de
 * tick du scheduler et l'idempotence des routes arbitrent les doublons).
 *
 * Principes :
 *   - Self-fetch localhost (Bearer `CRON_SECRET`) — zéro import de la couche
 *     app, la logique reste dans les routes existantes ;
 *   - Tir au FRANCHISSEMENT de frontière temporelle uniquement, jamais au
 *     boot — un redeploy ne re-déclenche ni digest founder ni sweep mensuel.
 *     Coût : un restart À CHEVAL sur une frontière peut sauter une fenêtre
 *     (rattrapée au tick suivant, ou par le workflow GitHub si configuré) ;
 *   - Multi-pod : claim CAS Redis par bucket de cadence (`claimOnce`) — un
 *     seul pod tire une fenêtre donnée ; sans Redis, single-pod honnête.
 *
 * Activation : ON en production (`NODE_ENV=production`), opt-in dev via
 * `OPS_DAEMON=1`, opt-out global via `OPS_DAEMON=0|off`.
 */

import { claimOnce } from "@/lib/redis";

interface Cadence {
  key: string;
  /** Id de bucket — change exactement quand la fenêtre doit tirer. */
  bucketId: (d: Date) => string | null;
  /** TTL du claim Redis (s) — couvre la fenêtre pour arbitrer les pods. */
  claimTtlSeconds: number;
  paths: string[];
}

/** Cadences alignées sur scheduled-ops.yml (+ external-feeds, jamais planifié avant). */
const CADENCES: Cadence[] = [
  {
    key: "frequent", // */15 min : séquences planifiées + réconciliation forge
    bucketId: (d) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}-${Math.floor(d.getUTCMinutes() / 15)}`,
    claimTtlSeconds: 10 * 60,
    paths: ["/api/cron/scheduler", "/api/cron/ptah-download"],
  },
  {
    key: "sixhourly", // 0 */6 h : sentinelles + télémétrie + sweep + feeds marché
    bucketId: (d) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${Math.floor(d.getUTCHours() / 6)}`,
    claimTtlSeconds: 3 * 3600,
    paths: [
      "/api/cron/sentinels",
      "/api/cron/sentinel-handlers",
      "/api/cron/asset-impact",
      "/api/cron/feedback-loop",
      "/api/cron/auto-promotion",
      "/api/cron/ops-sweep",
      "/api/cron/external-feeds",
    ],
  },
  {
    key: "weekly", // lundi 06h UTC : digest founders
    bucketId: (d) => {
      if (d.getUTCDay() !== 1 || d.getUTCHours() !== 6) return null;
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
    },
    claimTtlSeconds: 12 * 3600,
    paths: ["/api/cron/founder-digest"],
  },
  {
    key: "monthly", // 1er du mois 00h UTC : relevés MCP du mois clos
    bucketId: (d) => {
      if (d.getUTCDate() !== 1 || d.getUTCHours() !== 0) return null;
      return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    },
    claimTtlSeconds: 12 * 3600,
    paths: ["/api/cron/ops-sweep?monthly=1"],
  },
];

const CHECK_INTERVAL_MS = 30_000;

type DaemonState = {
  timer: ReturnType<typeof setInterval> | null;
  lastBuckets: Map<string, string>;
};

// Hot-reload safe (dev) : un seul timer par process.
const g = globalThis as unknown as { __lafuseeOpsDaemon?: DaemonState };

export function isOpsDaemonEnabled(): boolean {
  const flag = (process.env.OPS_DAEMON ?? "").toLowerCase();
  if (flag === "0" || flag === "off" || flag === "false") return false;
  if (flag === "1" || flag === "on" || flag === "true") return true;
  return process.env.NODE_ENV === "production";
}

function baseUrl(): string {
  // Le serveur standalone écoute PORT (défaut 3000) en local — on se parle
  // à soi-même, pas via l'URL publique (proxy/TLS inutiles pour un cron).
  return `http://127.0.0.1:${process.env.PORT ?? 3000}`;
}

async function fireCadence(cadence: Cadence, bucket: string): Promise<void> {
  // Un seul pod par fenêtre (no-op accordé sans Redis — single-pod).
  if (!(await claimOnce(`ops-daemon:${cadence.key}:${bucket}`, cadence.claimTtlSeconds))) return;

  const secret = process.env.CRON_SECRET;
  for (const path of cadence.paths) {
    try {
      const res = await fetch(`${baseUrl()}${path}`, {
        headers: secret ? { authorization: `Bearer ${secret}` } : {},
        signal: AbortSignal.timeout(120_000),
      });
      if (!res.ok) {
        console.warn(`[ops-daemon] ${path} → HTTP ${res.status}`);
      }
    } catch (err) {
      console.warn(`[ops-daemon] ${path} injoignable:`, err instanceof Error ? err.message : err);
    }
  }
}

/**
 * Un pas de vérification : tire chaque cadence dont le bucket a changé.
 * Le PREMIER pas post-boot arme l'état courant sans tirer (jamais de tir au
 * boot — un deploy pendant une fenêtre weekly/monthly saute cette fenêtre,
 * couverte par le workflow GitHub ou un pod sibling via claim Redis).
 * Exporté pour les tests.
 */
export async function opsDaemonStep(now: Date, lastBuckets: Map<string, string>): Promise<string[]> {
  const fired: string[] = [];
  const firstStep = !lastBuckets.has("__armed__");
  if (firstStep) lastBuckets.set("__armed__", "1");

  for (const cadence of CADENCES) {
    const bucket = cadence.bucketId(now);
    if (firstStep) {
      if (bucket !== null) lastBuckets.set(cadence.key, bucket);
      continue;
    }
    if (bucket === null) continue; // hors fenêtre (weekly/monthly)
    if (lastBuckets.get(cadence.key) === bucket) continue; // fenêtre déjà tirée/armée
    lastBuckets.set(cadence.key, bucket);
    fired.push(cadence.key);
    await fireCadence(cadence, bucket);
  }
  return fired;
}

export function startOpsDaemon(): void {
  if (!isOpsDaemonEnabled()) return;
  const state: DaemonState = (g.__lafuseeOpsDaemon ??= { timer: null, lastBuckets: new Map() });
  if (state.timer) return; // déjà démarré (idempotent)

  state.timer = setInterval(() => {
    void opsDaemonStep(new Date(), state.lastBuckets).catch(() => {
      // le prochain pas réessaie — jamais de crash du timer
    });
  }, CHECK_INTERVAL_MS);
  // Ne retient pas le process en vie (arrêt pm2/SIGTERM propre).
  state.timer.unref?.();

  console.log(
    `[ops-daemon] démarré (${CADENCES.length} cadences, check ${CHECK_INTERVAL_MS / 1000}s, tir au franchissement de frontière uniquement).`,
  );
}

export function stopOpsDaemon(): void {
  const state = g.__lafuseeOpsDaemon;
  if (state?.timer) {
    clearInterval(state.timer);
    state.timer = null;
    state.lastBuckets.clear();
  }
}

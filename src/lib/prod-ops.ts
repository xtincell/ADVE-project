/**
 * Infra prod-ops — le cœur du cycle en 3 temps (skill `nefer-ops`), côté serveur.
 *
 *   TEMPS 1 INJECTION      → `SEED_REGISTRY` (surface la commande + ce qu'elle
 *                            crée ; l'exécution contre la base prod reste un
 *                            geste opérateur, jamais un shell-out d'une requête
 *                            web — frontière honnête).
 *   TEMPS 2 DÉPLOIEMENT     → `triggerDeploy()` (POST Coolify) + version en ligne.
 *   TEMPS 3 ACTION DÉPLOYÉE → `triggerCron()` / `triggerProdFinish()` (self-fetch
 *                            localhost, Bearer `CRON_SECRET`, endpoints gardés).
 *
 * INVARIANTS
 *   - ZÉRO secret en dur : tout (`COOLIFY_DEPLOY_URL`/`_TOKEN`, `CRON_SECRET`)
 *     se lit de l'environnement ; jamais renvoyé au client (readiness = booléen).
 *   - ZÉRO import de la couche service (layering `lib < server/services`) — pure
 *     infra HTTP ; les mutations métier vivent DANS les endpoints ciblés, qui
 *     émettent déjà leurs Intents.
 *   - Absence de credential = état first-class `DEFERRED_AWAITING_CREDENTIALS`,
 *     jamais un échec silencieux ni une fabrication.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TEMPS 1 — registre des seeds (miroir des scripts `db:seed:*` de package.json)
// ─────────────────────────────────────────────────────────────────────────────

export interface SeedEntry {
  /** Clé du script npm : `npm run db:seed:<key>`. */
  key: string;
  command: string;
  /** Ce que le seed crée / ce qu'il touche. */
  creates: string;
  idempotent: boolean;
}

export const SEED_REGISTRY: SeedEntry[] = [
  {
    key: "spawt-gtm",
    command: "npm run db:seed:spawt-gtm",
    creates:
      "Calendrier GTM SPAWT (18 actions) + publication J0 planifiée + Stéphanie owner (mdp bcrypt).",
    idempotent: true,
  },
  {
    key: "spawt",
    command: "npm run db:seed:spawt",
    creates: "Marque SPAWT complète — ADVE 8 piliers + équipe + coffre d'actifs.",
    idempotent: true,
  },
  {
    key: "motion19",
    command: "npm run db:seed:motion19",
    creates: "Marque MOTION 19 — ADVE depuis sources publiques + snapshots sociaux + logo.",
    idempotent: true,
  },
  {
    key: "countries",
    command: "npm run db:seed:countries",
    creates: "Registre pays + zones (fallback /pricing, cost-of-living).",
    idempotent: true,
  },
  {
    key: "action-costs",
    command: "npm run db:seed:action-costs",
    creates: "Catalogue Thot des coûts d'action atomisés (12 archétypes).",
    idempotent: true,
  },
  {
    key: "calibration",
    command: "npm run db:seed:calibration",
    creates: "Pack calibration : pays + coûts d'action + région Wakanda (démo).",
    idempotent: true,
  },
  {
    key: "media-benchmarks",
    command: "npm run db:seed:media-benchmarks",
    creates: "Benchmarks médias par secteur (comparatifs de performance).",
    idempotent: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Readiness — booléens de configuration (jamais la valeur d'un secret)
// ─────────────────────────────────────────────────────────────────────────────

export interface ProdOpsReadiness {
  coolify: { configured: boolean; endpointHost: string | null };
  cron: { configured: boolean };
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function prodOpsReadiness(): ProdOpsReadiness {
  return {
    coolify: {
      configured: Boolean(process.env.COOLIFY_DEPLOY_URL && process.env.COOLIFY_DEPLOY_TOKEN),
      endpointHost: hostOf(process.env.COOLIFY_DEPLOY_URL),
    },
    cron: { configured: Boolean(process.env.CRON_SECRET) },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPS 2 — déclencher un déploiement Coolify
// ─────────────────────────────────────────────────────────────────────────────

export type DeployResult =
  | { status: "QUEUED"; message: string }
  | { status: "DEFERRED_AWAITING_CREDENTIALS"; message: string }
  | { status: "ERROR"; message: string };

export async function triggerDeploy(): Promise<DeployResult> {
  const url = process.env.COOLIFY_DEPLOY_URL;
  const token = process.env.COOLIFY_DEPLOY_TOKEN;
  if (!url || !token) {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      message:
        "COOLIFY_DEPLOY_URL / COOLIFY_DEPLOY_TOKEN absents — renseignez-les dans l'environnement Coolify pour déclencher un déploiement depuis ici.",
    };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30_000),
    });
    const body = await res.text();
    if (!res.ok) {
      return { status: "ERROR", message: `Coolify HTTP ${res.status} — ${body.slice(0, 300)}` };
    }
    // Réponse type : { "deployments":[{ "message":"… deployment queued." }] }
    let message = "Déploiement mis en file par Coolify.";
    try {
      const json = JSON.parse(body) as { deployments?: Array<{ message?: string }> };
      const m = json.deployments?.[0]?.message;
      if (m) message = m;
    } catch {
      /* garder le message par défaut si la réponse n'est pas du JSON attendu */
    }
    return { status: "QUEUED", message };
  } catch (e) {
    return {
      status: "ERROR",
      message: `Coolify injoignable : ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPS 3 — actions sur l'instance déployée (crons gardés + finaliseur)
// ─────────────────────────────────────────────────────────────────────────────

export interface CronAction {
  key: string;
  /** Chemin réel (query comprise) — jamais fourni par le client (anti-SSRF). */
  path: string;
  label: string;
  note: string;
}

/** Catalogue fermé de crons déclenchables à la main (whitelist par `key`). */
export const CRON_ACTIONS: CronAction[] = [
  {
    key: "social-sync-publish",
    path: "/api/cron/social-sync?mode=publish",
    label: "Publier les posts dus",
    note: "Fait partir les publications planifiées dont l'heure est atteinte (SCHEDULED + pending).",
  },
  {
    key: "social-sync",
    path: "/api/cron/social-sync",
    label: "Synchroniser les réseaux",
    note: "Rafraîchit followers / posts / commerce des marques connectées.",
  },
  {
    key: "external-feeds",
    path: "/api/cron/external-feeds",
    label: "Feeds marché (RSS)",
    note: "Ingestion des signaux sectoriels + pont vers l'axe Overton.",
  },
  {
    key: "ops-sweep",
    path: "/api/cron/ops-sweep",
    label: "Balayage Oracle STALE",
    note: "Ré-assemble les sections Oracle périmées, marque par marque.",
  },
  {
    key: "scheduler",
    path: "/api/cron/scheduler",
    label: "Séquences planifiées",
    note: "Exécute les séquences dues + réconcilie la forge Ptah.",
  },
];

export type SelfFetchResult =
  | { status: "OK"; httpStatus: number; body: string }
  | { status: "DEFERRED_AWAITING_CREDENTIALS"; message: string }
  | { status: "ERROR"; message: string };

function selfBaseUrl(): string {
  // On se parle à soi-même (proxy/TLS inutiles pour un endpoint gardé).
  return `http://127.0.0.1:${process.env.PORT ?? 3000}`;
}

async function selfFetch(path: string, method: "GET" | "POST"): Promise<SelfFetchResult> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return {
      status: "DEFERRED_AWAITING_CREDENTIALS",
      message:
        "CRON_SECRET absent — renseignez-le dans l'environnement pour autoriser les endpoints gardés (fail-closed en production).",
    };
  }
  try {
    const res = await fetch(`${selfBaseUrl()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(120_000),
    });
    const body = await res.text();
    if (!res.ok) {
      return { status: "ERROR", message: `HTTP ${res.status} — ${body.slice(0, 400)}` };
    }
    return { status: "OK", httpStatus: res.status, body: body.slice(0, 2000) };
  } catch (e) {
    return { status: "ERROR", message: e instanceof Error ? e.message : String(e) };
  }
}

/** Déclenche un cron du catalogue fermé (résolution par `key`, jamais par chemin brut). */
export async function triggerCron(key: string): Promise<SelfFetchResult> {
  const action = CRON_ACTIONS.find((a) => a.key === key);
  if (!action) {
    return { status: "ERROR", message: `Cron inconnu : ${key}` };
  }
  return selfFetch(action.path, "GET");
}

export interface ProdFinishParams {
  loginBrand?: string;
  postBrand?: string;
  delayMin?: number;
}

/** Finaliseur d'installation prod (créer un login + planifier un post) — endpoint gardé. */
export async function triggerProdFinish(params: ProdFinishParams): Promise<SelfFetchResult> {
  const qs = new URLSearchParams();
  if (params.loginBrand) qs.set("loginBrand", params.loginBrand);
  if (params.postBrand) qs.set("postBrand", params.postBrand);
  if (params.delayMin != null) qs.set("delayMin", String(params.delayMin));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return selfFetch(`/api/admin/prod-finish${suffix}`, "POST");
}

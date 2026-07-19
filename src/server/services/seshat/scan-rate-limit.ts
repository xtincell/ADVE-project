/**
 * Rate-limit PARTAGÉ des scans frais du scoreur public (fix prod 2026-07-19,
 * ADR-0161). Un scan frais consomme du budget réel (Apify/RDAP/DNS/RSS) et
 * écrit dans le répertoire de marques — la limite doit tenir face à N workers.
 *
 * L'ancien compteur `Map` en mémoire vivait PAR instance Node : la prod
 * Coolify (plusieurs workers/répliques) multipliait `MAX_PER_WINDOW` par le
 * nombre de workers, et chaque redeploy remettait les compteurs à zéro. Le
 * store est désormais la table `ScanRateHit` (une row par scan consommé,
 * fenêtre glissante par requête `count`, purge opportuniste > 1 h) — partagé,
 * durable, sans Redis (le serveur est long-vivant mais l'état doit être
 * cross-worker, donc DB).
 *
 * Fail-open assumé : si le store est injoignable, on laisse passer (le scan
 * lui-même a besoin de la DB pour persister — un store down bloque déjà tout
 * le chemin utile, inutile de doubler la panne d'un 429 mensonger).
 */

import { db } from "@/lib/db";

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;
const PURGE_AFTER_MS = 60 * 60_000;

/**
 * Résout l'IP client réelle derrière la chaîne de proxys de prod
 * (Cloudflare → Traefik/Coolify → Next). Ordre de confiance :
 * `cf-connecting-ip` (posé par Cloudflare, non falsifiable en aval) →
 * `x-real-ip` (Traefik) → premier hop de `x-forwarded-for` → "anon".
 * Pur, testé sur fixtures.
 */
export function resolveClientIp(headers: { get(name: string): string | null } | null | undefined): string {
  if (!headers) return "anon";
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "anon";
}

/**
 * Consomme une unité de budget de scan pour cette IP. `true` = scan autorisé
 * (hit enregistré), `false` = fenêtre pleine (≥ 6 scans frais / 60 s).
 * Les hits de cache ne passent JAMAIS par ici — seuls les vrais scans
 * consomment le budget (comportement existant, préservé).
 */
export async function consumeScanBudget(ip: string): Promise<boolean> {
  try {
    const since = new Date(Date.now() - WINDOW_MS);
    const recent = await db.scanRateHit.count({ where: { ip, at: { gt: since } } });
    if (recent >= MAX_PER_WINDOW) return false;
    await db.scanRateHit.create({ data: { ip } });
    // Purge opportuniste, hors chemin critique — la table reste minuscule.
    void db.scanRateHit
      .deleteMany({ where: { at: { lt: new Date(Date.now() - PURGE_AFTER_MS) } } })
      .catch(() => {});
    return true;
  } catch (err) {
    console.warn(
      "[scan-rate-limit] store indisponible — fail-open:",
      err instanceof Error ? err.message : err,
    );
    return true;
  }
}

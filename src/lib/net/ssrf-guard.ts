/**
 * Garde SSRF partagée — validation d'URL publique + fetch à redirections sûres.
 *
 * Deux services fetchent des URLs fournies par l'utilisateur/tenant :
 *   - `quick-intake/web-footprint` (empreinte web — chemin PUBLIC non authentifié) ;
 *   - `artemis/market-research/web-fetcher` (sources d'une étude — operator-gated).
 *
 * Les deux suivaient les redirections automatiquement : un `302 Location:
 * http://169.254.169.254/…` (métadonnées cloud) ou vers une IP privée était suivi
 * SANS re-validation du saut
 * (audit adversarial round-8). `assertPublicUrl` résolvait bien le DNS et rejetait
 * les IP privées, mais UNIQUEMENT sur l'URL initiale — le contournement par
 * redirection restait ouvert. Côté `web-fetcher`, la garde `isUrlAllowed` ne faisait
 * qu'un match regex du hostname (aucune résolution DNS) → un nom public résolvant
 * vers une IP privée, ou un hôte en IP décimale, passait.
 *
 * `ssrfSafeFetch` referme le trou : redirections MANUELLES, chaque saut (URL
 * initiale + chaque `Location`) re-validé par `assertPublicUrl` AVANT le fetch
 * suivant. Node ≥ 18 (`redirect:"manual"`) renvoie la vraie réponse 3xx avec
 * l'en-tête `Location` lisible (vérifié Node 22) — pas d'opaque-redirect.
 *
 * Résidu connu (tracé RESIDUAL-DEBT §round-8) : le rebinding DNS pur (TOCTOU
 * entre la résolution de `assertPublicUrl` et celle de `fetch`) exige de PINNER
 * la connexion sur l'IP validée via un dispatcher `undici` — `undici` n'est pas
 * importable ici (interne à Node, pas une dépendance). L'exploit PRATIQUE
 * (redirection vers une IP privée) est lui ENTIÈREMENT fermé.
 */
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";

/** IPv4/IPv6 privé : loopback, link-local, unique-local, mapped-IPv4 privé, multicast. */
export function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const low = ip.toLowerCase();
    return (
      low === "::1" ||
      low.startsWith("fe80:") ||
      low.startsWith("fc") ||
      low.startsWith("fd") ||
      low.startsWith("::ffff:127.") ||
      low.startsWith("::ffff:10.") ||
      low.startsWith("::ffff:192.168.")
    );
  }
  const parts = ip.split(".").map(Number);
  const [a, b] = [parts[0] ?? -1, parts[1] ?? -1];
  return (
    a === 127 ||
    a === 10 ||
    a === 0 ||
    (a === 192 && b === 168) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 169 && b === 254) ||
    a >= 224
  );
}

/**
 * Valide qu'une URL pointe vers un hôte PUBLIC : schéma http(s) uniquement, pas
 * `localhost`/`.local`/`.internal`, pas une IP privée — littérale OU résolue par
 * DNS (ferme l'IP décimale `http://2130706433/` et les noms publics pointant vers
 * du privé). Lève une erreur (message FR) sinon ; retourne l'URL parsée.
 */
export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Protocole refusé: ${url.protocol}`);
  }
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error(`Hôte interne refusé: ${host}`);
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error(`IP privée refusée: ${host}`);
    return url;
  }
  const resolved = await dnsLookup(host, { all: true }).catch(() => []);
  if (resolved.length === 0) throw new Error(`DNS introuvable: ${host}`);
  for (const { address } of resolved) {
    if (isPrivateIp(address)) throw new Error(`Hôte résout vers une IP privée: ${host}`);
  }
  return url;
}

const DEFAULT_MAX_REDIRECTS = 5;

/**
 * Fetch SSRF-safe : valide l'URL initiale ET chaque `Location` de redirection via
 * `assertPublicUrl`, redirections MANUELLES (`redirect:"manual"`). Retourne la
 * Response finale — corps NON consommé, le caller le lit/streame/borne lui-même.
 * Lève si le nombre de sauts dépasse `maxRedirects` ou si un saut échoue la garde.
 */
export async function ssrfSafeFetch(
  rawUrl: string,
  init: Omit<RequestInit, "redirect"> = {},
  maxRedirects = DEFAULT_MAX_REDIRECTS,
): Promise<Response> {
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url.toString(), { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return res; // 3xx sans Location → rendu tel quel
      // Corps de la réponse de redirection ignoré ; on re-valide la cible.
      await res.body?.cancel().catch(() => {});
      current = new URL(loc, url).toString(); // Location relative supportée
      continue;
    }
    return res;
  }
  throw new Error(`Trop de redirections (>${maxRedirects}) — garde SSRF`);
}

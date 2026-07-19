# ADR-0161 — Rate-limit du scoreur public sur store DB partagé (`ScanRateHit`)

- **Statut** : Accepted (2026-07-19)
- **Origine** : brief de fix prod [FIX-BRIEF-SCORER-INTAKE-2026-07-19.md](../../audits/FIX-BRIEF-SCORER-INTAKE-2026-07-19.md) §F4 — preuve prod : 8 scans frais consécutifs en ~12 s, aucun 429. Tutelle **SESHAT** (le scoreur nourrit la base de marques ADR-0151) ; Loi 3 APOGEE (conservation du carburant — chaque scan frais consomme du budget Apify/RDAP/DNS/RSS). Cap 7/7 préservé.

## Problème

Le limiter de `footprint.scoreInstant` était une `Map` **en mémoire par instance Node**. La prod Coolify tourne avec plusieurs workers/répliques : chaque worker portait son propre compteur, donc `MAX_PER_WINDOW = 6/min/IP` était multiplié par le nombre de workers — et remis à zéro à chaque redeploy. De plus l'IP était lue sur `x-forwarded-for` seul, qui derrière Cloudflare → Traefik n'est pas garanti être l'IP client réelle.

## Décision

1. **Nouveau modèle technique `ScanRateHit { id, ip, at }`** (indexes `[ip, at]` + `[at]`) — une row par scan frais consommé, fenêtre glissante par `count where ip AND at > now-60s`, purge opportuniste des rows > 1 h hors chemin critique. Migration `20260719180000_scan_rate_hit_shared_limiter`.
2. **Anti-doublon (Phase 2)** : greps négatifs — aucun modèle `Rate*`/`Scan*` dans `prisma/schema.prisma`, aucune entrée rate-limit dans CODE-MAP, aucun store partagé existant (pas de Redis par design). **Pourquoi pas extension** : `BrandFootprintSnapshot` est keyé par marque (pas par IP), n'enregistre pas les refresh de la même marque comme événements distincts, et y ajouter une IP mêlerait une donnée réseau éphémère à un répertoire métier durable (ADR-0151 « jamais perdu » — l'inverse d'une table purgée au fil de l'eau).
3. **Résolution IP réelle** : `resolveClientIp` — `cf-connecting-ip` (posé par Cloudflare, non falsifiable en aval) → `x-real-ip` (Traefik) → premier hop `x-forwarded-for` → `"anon"` (seau global de dernier recours).
4. **Fail-open assumé** : store injoignable ⇒ scan autorisé avec `console.warn`. Le scan a besoin de la DB pour persister son résultat — une DB down bloque déjà le chemin utile ; un 429 par-dessus serait un mensonge de diagnostic.
5. **Le cache ne consomme jamais** : seuls les scans frais (cache miss ou `refresh:true`) passent par le limiter — comportement existant préservé (une marque déjà scorée revient instantanément sans quota).

## Emplacement

`src/server/services/seshat/scan-rate-limit.ts` (couche services, consommé par le router `footprint`). Constantes : `WINDOW_MS = 60_000`, `MAX_PER_WINDOW = 6`, `PURGE_AFTER_MS = 1 h`.

## Conséquences

- La limite 6 scans frais/min/IP est effective quel que soit le worker qui répond, et survit aux redeploys.
- Une row DB par scan frais (volume borné par la limite elle-même) ; table auto-purgée, aucune FK, aucune donnée métier.
- `resolveClientIp` est pur et testé sur fixtures (`tests/unit/services/scan-rate-limit.test.ts`).

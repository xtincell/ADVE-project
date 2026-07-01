# site-prober — bot testeur black-box

Un robot qui sonde une instance **en production** comme le ferait une nuée de
vrais testeurs : il cartographie le site, le martèle avec des requêtes
concurrentes (« plusieurs personnes » en même temps) et fait remonter chaque
faille — comme on immerge une pièce étanche pour traquer les bulles, ou comme on
remplit une tuyauterie d'un liquide marqué pour voir où ça fuit.

> **Zéro couplage** avec `src/**` : c'est un testeur externe qui parle HTTP. Il
> tourne même si l'app ne compile pas.

## Ce qu'il traque (les « bulles »)

| Catégorie | Détecte |
|---|---|
| `auth-leak` / `unauth-cron` | route protégée servie à un anonyme · **cron exécuté sans auth** · API admin ouverte |
| `test-endpoint-in-prod` | endpoint de test (`/api/test-e2e`…) joignable en prod |
| `mcp-catalog-leak` | endpoints MCP qui exposent leur catalogue d'outils sans auth |
| `broken-link` / `broken-redirect` / `redirect-loop` | 404 sur routes/liens, redirections legacy mortes, boucles |
| `server-error` | 5xx sur pages publiques ou API |
| `info-disclosure` | clés/secrets, DSN Postgres, stack traces serveur, chemins absolus dans les réponses |
| `security-header` | absence de CSP / HSTS / X-Content-Type-Options / X-Frame-Options… |
| `broken-asset` / `broken-image` | JS/CSS/img/fonts référencés mais 4xx/5xx |
| `console-error` / `js-exception` / `client-crash` / `hydration` | erreurs console, exceptions JS, error boundary, mismatch d'hydratation (navigateur réel) |
| `load` | erreurs/latence sous charge concurrente (mode `--burst`) |
| `seo` | absence de `robots.txt` / `sitemap.xml` / `security.txt` |

La classification public/protégé/legacy est **dérivée de `src/proxy.ts`** : le bot
distingue une vraie fuite (route protégée qui répond 200) d'un comportement
normal (route protégée qui rebondit vers `/login`).

## Garde-fous (important)

- **Read-only** : uniquement `GET`/`HEAD`. Jamais de `POST`, jamais de webhook,
  jamais de paiement, aucune écriture volontaire.
- **Effets de bord** : certains `GET` de cron *exécutent* du travail réel (envoi
  d'e-mails, mutation de paliers, téléchargement d'assets payants). Ils sont
  marqués `sideEffecting`, appelés **une seule fois**, **sans retry**, **hors
  burst**. Utilise `--skip-sideeffects` pour t'en abstenir totalement.
- **Politesse** : jitter aléatoire par requête + concurrence bornée. Le mode
  `--burst` est une simulation de charge délibérée — à utiliser sciemment, c'est
  ton site.
- N'utiliser que sur une cible que **tu possèdes / es autorisé à tester**.

## Couverture des routes

Le bot **découvre automatiquement toutes les routes** (`page.*`) sous `src/app`
(lecture de chemins de fichiers uniquement — aucun import de code, il reste
black-box) et les sonde toutes. Présentes et futures : pas de liste à maintenir.
Les routes dynamiques (`[id]`) sont ignorées (elles exigent de vraies valeurs).
`--no-discover` pour s'en passer.

## Mode authentifié (agir comme un compte)

Par défaut le bot est **anonyme** : il vérifie seulement que les routes
protégées **rebondissent vers `/login`**. Avec des identifiants, il **se
connecte une fois** via le vrai formulaire `/login` (NextAuth credentials),
capture la session, et **crawle derrière le mur d'auth** (phases HTTP +
navigateur). La classification s'inverse alors pour les routes protégées :
un 5xx, un 404, un rebond `/login` (session non honorée) ou `/unauthorized`
(rôle insuffisant) deviennent des findings.

**Un seul compte ADMIN couvre les 4 portails** (Console/Cockpit/Agency/Creator —
`proxy.ts` met ADMIN dans toutes les listes de rôles). Le crawl reste
**read-only (GET)** même authentifié : il charge les pages, il ne soumet ni ne
mute rien. Identifiants par **variables d'env uniquement** (jamais en dur, jamais
écrits dans le rapport — redacted).

```bash
PROBE_EMAIL="bot-admin@upgraders.app" PROBE_PASSWORD="…" npm run probe:prod
# ou
npx tsx scripts/site-prober/index.ts --email bot-admin@x.app --password …
```

## Usage

```bash
npm run probe              # sweep complet (crawl + navigateur + API) vs cible par défaut
npm run probe:prod         # idem, cible https://lafusee-app.vercel.app
npm run probe:quick        # seeds + API seulement (pas de crawl, pas de navigateur)
npm run probe:burst        # ajoute 3 vagues de charge concurrente

# options brutes
npx tsx scripts/site-prober/index.ts \
  --base https://lafusee-app.vercel.app \
  --concurrency 16 --max-pages 400 --max-depth 5 \
  --burst 5 --no-browser --skip-sideeffects --quick \
  --email bot@x.app --password ••• --no-discover
```

| Flag | Effet | Défaut |
|---|---|---|
| `--base <url>` / `PROBE_BASE_URL` | cible | `https://lafusee-app.vercel.app` |
| `--email <e>` / `PROBE_EMAIL` | compte de test (active le mode authentifié) | — |
| `--password <p>` / `PROBE_PASSWORD` | mot de passe du compte de test | — |
| `--concurrency <n>` | workers HTTP simultanés | 10 |
| `--max-pages <n>` | plafond de pages crawlées | 250 |
| `--max-depth <n>` | profondeur de crawl | 4 |
| `--burst <n>` | vagues de charge concurrente (0 = off) | 0 |
| `--no-browser` | saute la passe Playwright | off |
| `--no-discover` | n'auto-découvre pas les routes de `src/app` | off |
| `--quick` | seeds + API seulement | off |
| `--skip-sideeffects` | n'appelle aucun endpoint à effet de bord | off |

## Sortie

`reports/site-probe-<timestamp>.md` (rapport lisible, trié par sévérité) +
`reports/site-probe-<timestamp>.json` (données complètes : findings, sitemap,
résultats HTTP & navigateur).

Code de sortie `2` s'il y a au moins un finding CRITICAL/HIGH (utile en CI).

## Architecture

```
index.ts      orchestrateur + CLI + pool de concurrence + crawl + burst
config.ts     cible, seeds, classification (calquée sur proxy.ts), probes API, headers attendus
routes.ts     découverte des routes depuis src/app (chemins de fichiers, pas d'import de code)
auth.ts       login via formulaire /login → cookies de session (mode authentifié)
http.ts       client fetch (redirects manuels, timing, retries, cookie) + extraction de liens
analyzers.ts  HttpResult → Finding (auth, cron, mcp, disclosure, headers, redirects…)
browser.ts    passe Playwright/Chromium (console/JS/hydration/assets, cookies) — dégrade si absent
report.ts     agrégation (collapse du bruit), dédup, Markdown + JSON
types.ts      types partagés
```

# Build déporté — l'image se construit en CI, le VPS ne fait que la tirer

## Le problème (nuit du 2026-07-12)

Coolify était configuré pour **construire l'app sur le VPS de prod** (`next build`
via Nixpacks/Dockerfile, sur la machine qui sert aussi le site). `next build`
consomme toute la RAM/CPU de l'hôte → **OOM → blackout total** (app + reverse-proxy
Traefik + Coolify lui-même), 15-20 min à chaque déploiement. Reproduit **3 fois de
suite** ce soir (suite sociale → suggestion → config_id Meta).

## Le correctif

Le workflow [`.github/workflows/build-image.yml`](../../.github/workflows/build-image.yml)
construit l'image **sur les runners GitHub** (CPU/RAM gratuits, hors prod), la
**boote contre un Postgres jetable** (garde-fou : une image qui ne sert pas
`/login` n'est jamais poussée), puis la publie sur `ghcr.io/xtincell/adve-project`
(`:latest` + `:vX.Y.Z` + `:sha-…`).

Une fois Coolify basculé en source **« Docker Image »**, un déploiement =
`docker pull` + swap de conteneur. **Zéro `next build` sur le VPS → zéro blackout.**
Le Dockerfile et l'entrypoint (migrations au boot via `apply-migrations.mjs`)
sont **inchangés** — c'est la même image, construite ailleurs.

## Bascule Coolify (une seule fois, réversible)

1. **Rendre l'image tirable par le VPS.** L'image ghcr d'un repo privé est privée.
   Deux options :
   - **Simple** : GitHub → repo → *Packages* → `adve-project` → *Package settings* →
     *Change visibility* → **Public** (l'image ne contient aucun secret — ils sont
     injectés au runtime par Coolify). Le VPS tire sans credentials.
   - **Privé** : Coolify → *Sources* / *Docker Registries* → ajouter `ghcr.io` avec
     un PAT GitHub `read:packages`. Coolify tire avec ce token.

2. **Pointer l'application sur l'image.** Coolify → l'app *Upgraders & La fusée* →
   *General* → **Build Pack → « Docker Image »** → image :
   `ghcr.io/xtincell/adve-project:latest` · port `3000`.
   **Ne touche PAS aux variables d'environnement** — elles restent injectées au
   runtime (DATABASE_URL, NEXTAUTH_SECRET, INTEGRATION_TOKEN_KEY, META_LOGIN_CONFIG_ID,
   les OAuth…). L'image ne les contient pas.

3. **Secrets GitHub pour le redeploy** : repo → *Settings* → *Secrets and
   variables* → *Actions* → ajouter `COOLIFY_URL` (`https://coolify.powerupgraders.com`),
   `COOLIFY_TOKEN`, `COOLIFY_APP_UUID` (`rfkgtj7us50jlbaiz1tjke2a`). Ils servent
   au redeploy **manuel** (`workflow_dispatch` avec `notify_coolify` coché). **⚠
   Pré-requis** : Build Pack = « Docker Image » (étape 2) — sinon la notification
   déclenche un `next build` sur le VPS (OOM).

> **DÉPLOIEMENT 100 % MANUEL (décision opérateur 2026-07-15).** `build-image.yml`
> n'a **plus aucun trigger automatique** : le push sur `main` ne construit plus
> d'image et ne redéploie plus. Pour livrer en prod : lancer `build-image` à la
> main (Actions → *Build image (ghcr)* → *Run workflow*, cocher `notify_coolify`)
> **ou** `deploy.yml` **ou** un redeploy depuis le dashboard Coolify. **Vérifier
> aussi côté Coolify** que l'auto-deploy de l'app (webhook git / watch registry)
> est désactivé — le repo ne peut pas le couper à distance.

## Le cycle (déploiement manuel)

```
[opérateur] Run workflow build-image (notify_coolify) → boot smoke-test →
            push ghcr:latest → redeploy Coolify → docker pull + swap (secondes)
```

Le VPS ne compile plus jamais. Un déploiement devient un pull de quelques secondes.

## Rollback

Revenir en source **« Dockerfile »** (ou « Nixpacks ») dans le même écran Coolify
*General* → Build Pack. Rien d'autre à défaire ; le workflow peut rester (il
publie une image inutilisée, sans effet).

## Vérifier une image avant de basculer

L'onglet *Actions* → run *Build image (ghcr)* montre le smoke-test (`/login=200`).
Pour tester à la main sur n'importe quelle machine Docker :

```sh
docker run -d --name pg -e POSTGRES_USER=lafusee -e POSTGRES_PASSWORD=lafusee \
  -e POSTGRES_DB=lafusee postgres:16-alpine
docker run --rm -p 3000:3000 --link pg \
  -e DATABASE_URL="postgresql://lafusee:lafusee@pg:5432/lafusee?schema=public" \
  -e NEXTAUTH_SECRET="test-secret-test-secret-32-characters" \
  -e INTEGRATION_TOKEN_KEY="test-key-test-key-32-characters-min" \
  ghcr.io/xtincell/adve-project:latest
# → curl http://localhost:3000/login  (attendu : 200)
```

## Note

Ceci ne change ni le Dockerfile, ni l'entrypoint, ni la stratégie de migration
(runner `pg` maison au boot — cf. [SELF-HOST.md](SELF-HOST.md) et l'en-tête de
`scripts/docker-entrypoint.sh`). Seul l'**endroit** où l'image est construite
change. Vercel (cible canonique) n'est pas concerné — ce chantier ne vaut que
pour la cible self-host/Coolify.

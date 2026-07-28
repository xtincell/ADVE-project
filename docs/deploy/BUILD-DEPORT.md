# Build déporté — l'image se construit en CI, le VPS ne fait que la tirer

> ✅ **BASCULE FAITE — 2026-07-27.** La prod est servie par la ressource Coolify
> **« Docker Image »** `q9b4m57yh93gxbjykj470giy`, qui tire
> `ghcr.io/xtincell/adve-project:latest`. **Le VPS ne compile plus.**
> L'ancienne app git `Upgraders & La fusée` (`rfkgtj7us50jlbaiz1tjke2a`) est
> **arrêtée volontairement — c'est le rollback** ; son statut `exited` est
> normal et ne doit JAMAIS être lu comme « app à redémarrer » (un déploiement
> dessus relancerait un `next build` sur le VPS). La section « Bascule Coolify »
> ci-dessous est conservée comme **archive de la procédure**, pas comme un
> reste à faire.

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

2. **Pointer le déploiement sur l'image — via une NOUVELLE ressource.**

   > ⚠️ **« Docker Image » n'est PAS un Build Pack.** Le menu *General → Build Pack*
   > d'une app git ne propose que Nixpacks / Railpack / Static / Dockerfile /
   > Docker Compose. « Docker Image » est un **type de ressource**, choisi à la
   > création — une app créée depuis un dépôt git ne peut pas y être convertie.
   > (Corrigé le 2026-07-27 : cette étape décrivait une bascule impossible.)
   >
   > ⚠️ **Piège associé** : la section *Docker Registry* (« Docker Image » +
   > « Docker Image Tag ») de l'écran General **ne choisit pas une image à tirer** —
   > elle nomme l'image que Coolify **construit** sur le VPS. La renseigner ne
   > déporte rien : le build local continue, il change juste de tag.

   **La manip réelle** (le domaine ne bouge qu'à la toute fin) :

   a. **Copier les variables d'environnement** de l'app actuelle : *Environment
      Variables* → vue développeur / éditeur brut si ta version l'a → tout copier.
   b. **+ New → Docker Image** dans le même projet **et sur le même serveur** (il
      faut le réseau `coolify` pour joindre le Postgres par son nom de conteneur) :
      image `ghcr.io/xtincell/adve-project`, tag `latest`, port `3000`.
   c. **Coller les variables**, puis **déployer SANS domaine**. L'entrypoint
      applique les migrations et démarre — vérifier dans les logs avant d'aller
      plus loin. L'image ne contient aucun secret : ils sont injectés au runtime
      (DATABASE_URL, NEXTAUTH_SECRET, INTEGRATION_TOKEN_KEY, les OAuth…).

      > ⚠️ **Vérifier `DATABASE_URL` caractère par caractère** (incident
      > 2026-07-27). Recopié à la main, il avait atterri avec l'hôte `base` au
      > lieu de `qosouizh7eszymg7z4dupsa7` → l'app démarrait, servait les pages
      > statiques, **et toute lecture base échouait** en `getaddrinfo EAI_AGAIN
      > base` : login mort (`prisma.user.findUnique`), `/leaderboard` 500, crons
      > 500. Diagnostiqué à tort comme « base vide / perdue ». Le tell dans les
      > logs du conteneur est `EAI_AGAIN <hôte>` — c'est une panne de **résolution
      > de nom**, jamais une perte de données. Valeur attendue :
      > `postgres://lafusee:<mdp>@qosouizh7eszymg7z4dupsa7:5432/lafusee`.
      > Contrôle : `[migrate] N migration(s) appliquée(s) sur 91 (le reste déjà
      > en base)` prouve que la base historique est bien celle qui est jointe —
      > `91 sur 91` sur une base censée être peuplée signale au contraire une
      > base neuve.
   d. **Basculer les domaines** seulement une fois le conteneur sain : les retirer
      de l'ancienne app (sinon Traefik voit deux fois le même hôte), les poser sur
      la nouvelle, redéployer. Les 3 domaines servis : `powerupgraders.com`,
      `www.powerupgraders.com`, `lafuseev6.powerupgraders.com` (+ le wildcard des
      pages publiques de marque `<slug>.powerupgraders.com` s'il est configuré).
   e. **Arrêter l'ancienne app** (la garder *stopped*, pas supprimée — c'est le
      rollback). Vérifier : `curl https://powerupgraders.com/api/version`.

3. **Secrets GitHub pour le redeploy** : repo → *Settings* → *Secrets and
   variables* → *Actions* → ajouter `COOLIFY_URL` (`https://coolify.powerupgraders.com`),
   `COOLIFY_TOKEN`, `COOLIFY_APP_UUID` (**`q9b4m57yh93gxbjykj470giy`** — la
   ressource Docker Image ; surtout PAS `rfkgtj7us50jlbaiz1tjke2a`, l'app git
   arrêtée, qui relancerait un build VPS). Ils servent
   au redeploy **manuel** (`workflow_dispatch` avec `notify_coolify` coché). **⚠
   Pré-requis** : `COOLIFY_APP_UUID` doit être celui de la **ressource Docker
   Image** (étape 2) — pointé sur l'ancienne app git, le redeploy relancerait un
   `next build` sur le VPS (OOM).

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

L'ancienne app git est **conservée à l'arrêt** (étape 2e) : rendre les domaines à
cette app et la redémarrer restaure l'état d'avant, au prix d'un `next build` sur
le VPS. Rien d'autre à défaire ; le workflow peut rester (il publie une image
inutilisée, sans effet).

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

## Incident 2026-07-28 — « échec au build » qui n'en était pas un

Le job *Build image (ghcr)* est sorti **rouge** alors que l'image était
construite, testée et **poussée sur GHCR**. Seule la dernière étape avait
échoué : `curl` exit **28** (timeout) sur `POST /api/v1/deploy`.

Conséquence réelle : la prod est restée **une version en arrière** (elle servait
`6.27.354` pendant que `main` était à `6.27.355`), et le rouge du job faisait
croire à un échec de build. Le déploiement relancé à la main a abouti
immédiatement — l'API a répondu `200 … deployment queued` et la prod a basculé.

Trois défauts dans l'étape, tous corrigés :

1. **`curl -sf` nu sous `set -e`** — ni `--max-time`, ni réessai. Un accusé de
   réception lent tuait le job, alors que le déploiement pouvait être mis en
   file côté serveur.
2. **Pas de `force=true`** — sur une ressource « Docker Image » au tag MUTABLE
   (`latest`), c'est lui qui garantit le `docker pull` plutôt qu'un redémarrage
   sur l'image déjà présente.
3. **Aucune vérification** — le job jugeait sur la réponse HTTP du
   déclenchement, pas sur ce que la prod sert réellement.

L'étape borne et réessaie désormais le déclenchement, puis **attend la bascule**
en interrogeant `/api/version` : le job n'est vert que si la prod sert bien la
version construite. Un déclenchement accepté n'est pas un déploiement réussi ;
un déclenchement expiré n'est pas forcément un échec.

Cette vérification demande la variable de dépôt **`PROD_URL`** (ex.
`https://powerupgraders.com`). Absente, le job reste sur le verdict du
déclenchement et l'annonce explicitement comme non vérifié.

---
name: nefer-ops
description: Cycle opérationnel en 3 temps — INJECTION (seed/données dans La Fusée) → DÉPLOIEMENT (Coolify) → ACTION SUR DÉPLOYÉ (seed prod, connecter les credentials, déclencher/vérifier). À invoquer quand une demande implique de faire arriver de la DONNÉE ou une ACTION sur l'instance déployée (marque à seeder, publication à faire partir, compte à créer en prod, credentials à brancher), pas seulement du code. Impose l'idempotence, le zéro-secret-committé, la vérification locale avant prod, et la frontière claire « ce que NEFER fait » vs « action opérateur sur la base prod ».
---

# NEFER — Cycle opérationnel en 3 temps

**La donnée et l'action prod ne sont pas du code : elles suivent leur propre cycle. Ce skill le rend déterministe. AUCUNE improvisation, AUCUN secret committé, AUCUNE donnée inventée.**

Un besoin « fais arriver X pour la marque Y » (une marque seedée, une publication qui part, un compte créé, un fournisseur branché) se découpe TOUJOURS en trois temps distincts. Ne jamais les confondre : le code qui rend X possible (mécanique) ≠ la donnée X (injection) ≠ l'exécution de X sur l'instance en ligne (action prod).

---

## TEMPS 1 — INJECTION (la donnée entre dans La Fusée)

Écrire/étendre un **seed** (`scripts/seed-<sujet>.ts`), jamais une écriture manuelle en base prod à l'aveugle.

### Règles dures

1. **Client Prisma 7 = adapter** (jamais `new PrismaClient()` nu — il jette `PrismaClientOptions`) :
   ```ts
   import { PrismaClient } from "@prisma/client";
   import { PrismaPg } from "@prisma/adapter-pg";
   function makeDb() {
     const connectionString = process.env.DATABASE_URL;
     if (!connectionString) throw new Error("DATABASE_URL not set — Prisma 7 driver adapter requires it.");
     return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
   }
   ```
2. **Idempotent** : `upsert` sur une clé `@@unique` (ex. `@@unique([strategyId, sourceInitiativeId])`). Un 2ᵉ run ne DOIT rien dupliquer — le vérifier (compter avant/après).
3. **Zéro secret en dur** : une clé API (Brevo, tokens…) se lit depuis `process.env.<X>` et n'est **jamais** écrite dans le fichier committé (elle resterait dans l'historique git). Absent → le seed laisse honnêtement le connecteur non configuré + log le chemin UI pour le renseigner. **HONORER un connecteur déjà présent** — ne jamais écraser une saisie opérateur.
4. **Voie gouvernée** : une écriture de pilier passe par `writePillar` ; une mutation métier par `emitIntent`. Un seed peut écrire des données de setup en direct (convention repo, cf. `seed-spawt-complete.ts`) mais toute publication/action gouvernée réutilise le chemin réel (ex. publication planifiée = `metadata.socialPublish` shape exacte + `status:"SCHEDULED"` + `selected:true`).
5. **npm script** : `"db:seed:<sujet>": "node --env-file-if-exists=.env.local --import tsx scripts/seed-<sujet>.ts"`.

### Vérification locale AVANT prod (obligatoire)

```bash
# Postgres local (si arrêté) :
runuser -u postgres -- /usr/lib/postgresql/16/bin/pg_ctl -D /home/user/pgdata16 -l /home/user/pgdata16/server.log -w -t 30 start
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/lafusee?schema=public"
npx prisma migrate deploy 2>&1 | tail -2          # base au schéma courant
npx tsc --noEmit                                   # le seed compile
node --import tsx scripts/seed-<sujet>.ts          # RUN — lire chaque ligne de log
# Vérifier : l'entité clé a la BONNE forme (status/flags/metadata) + idempotence (re-run → mêmes comptes).
```
- **Piège tsx** : un `node --import tsx -e "... import('@/…')"` inline NE résout PAS l'alias `@/` (dynamic import). Pour vérifier un service aliasé, écrire un vrai fichier `scripts/verify-*.ts`, pas un `-e`. Les seeds importent `@prisma/client` (pas d'alias) → OK inline.

Puis livrer le code+seed par la lane normale (skill `nefer-ship`).

---

## TEMPS 2 — DÉPLOIEMENT (le code arrive en ligne — AUTOMATIQUE)

**Le déploiement est AUTOMATIQUE au merge sur `main`** (webhook Coolify ; l'opérateur en lance parfois un aussi de son côté). **NEVER déclencher un déploiement manuel** (`POST /api/v1/deploy`) : il fait un **build EN DOUBLE** de la même image — et sur ce VPS où `next build` OOM, deux (ou trois) builds concurrents = fenêtre d'indispo multipliée + charge serveur inutile. Incident 2026-07-14, consigne opérateur explicite : « le déploiement est automatique après le merge […] ça fait beaucoup d'action sur le serveur ». **Le merge suffit. On attend, on ne pousse pas de build.**

- **Surveiller PASSIVEMENT** la bascule via l'endpoint version (simple GET, zéro charge) — jamais `sleep` bloquant en boucle ; un timer background qui ré-réveille le turn :
  ```bash
  curl -sS --max-time 15 https://powerupgraders.com/api/version   # → {"version":"6.27.XYZ"}
  ```
  Comparer à `src/lib/version.ts` (`APP_VERSION`). Version servie == version mergée → image en ligne → enchaîner TEMPS 3.
- **Blackout OOM** : `next build` sur le VPS peut OOM (7-20 min, se rétablit seul). Bascule build-déporté (image CI, VPS tire seulement) = runbook `docs/deploy/BUILD-DEPORT.md` (action opérateur, réversible). Ne pas paniquer sur une fenêtre d'indispo pendant un build.
- **Exception — déploiement manuel autorisé UNIQUEMENT si** l'auto-déploiement a échoué / ne s'est pas déclenché, ET après confirmation opérateur explicite. Jamais « pour être sûr » en doublon.
- **Migrations** : le CLI Prisma est mort dans l'image standalone ; le boot applique via `scripts/apply-migrations.mjs`. Une migration se propage donc au **prochain déploiement** — ne pas suggérer `prisma migrate deploy` dans le conteneur.

---

## TEMPS 3 — ACTION SUR DÉPLOYÉ (exécuter sur l'instance en ligne)

Le code + la donnée sont en ligne — reste à **agir sur l'instance prod** : y lancer le seed, brancher les credentials, déclencher/vérifier.

### Ce que NEFER PEUT faire à distance (endpoints gardés)

- **MCP = voie CANONIQUE pour faire circuler l'information** (directive opérateur 2026-07-14) : pour LIRE ou ÉCRIRE l'état prod, passer par le serveur MCP de l'app (`/api/mcp`, ADR-0026) et/ou les endpoints admin gardés — **jamais** le shell/la base directe (inaccessibles depuis la session ; l'hôte DB Coolify est un nom interne non résolvable). **NEFER ne doit jamais être « coincé dehors » pour un fix de données** : si un diagnostic ou un import prod est nécessaire, il passe par un **tunnel gouverné** (endpoint ou tool MCP), idempotent, gardé, réutilisable — pas un one-shot manuel, pas un « je n'ai pas accès ». Manque un tunnel pour l'acte voulu ? On le **conçoit** (endpoint + à terme tool MCP) dans le même PR, on merge, on redéploie.
- **Tunnel data-ops du vault** : `POST /api/admin/seed-brands` (gardé ADMIN **ou** `CRON_SECRET`) — `?diag=<strategyId|spawt>` = **LECTURE SEULE** de l'état réel (actifs par `kind`+`state`, nb de campagnes, nb de piliers) pour voir ce qui est vraiment en base ; `?only=<marque>` = (ré)import **idempotent** de l'ADVE + des assets (logo/palette/typo/fonts) + des **campagnes** (GTM). Étendre CE tunnel pour tout import répétable.
- **Finaliseur prod** : `POST /api/admin/prod-finish` (gardé `CRON_SECRET`) — actes ponctuels gouvernés (créer un login, planifier un post via `ANUBIS_PUBLISH_SOCIAL_POST`). Étendre CET endpoint pour un nouvel acte prod répétable plutôt qu'un one-shot manuel.
- **Crons** : `/api/cron/*` (gardés `CRON_SECRET`) déclenchables par `curl` (ex. `social-sync?mode=publish` fait partir les publications dues).

### Ce qui reste ACTION OPÉRATEUR (frontière honnête — le dire clairement)

- **`npm run db:seed:<sujet>` contre la base PROD** : NEFER n'a pas d'accès direct à la base La Fusée prod (Coolify) depuis la session. Donner la commande exacte + ce qu'elle crée. (Ou, si répétable et sûr, l'exposer via un endpoint `prod-finish`/console gardé.)
- **Brancher des credentials externes** (OAuth réseaux, clé Brevo, App Store Connect) : consentement/compte tiers = geste opérateur. NEFER pose la SURFACE (carte + espace credentials + état honnête `DEFERRED_AWAITING_CREDENTIALS` + message qui invite à renseigner), l'opérateur colle la clé.

### Vérifier que c'est parti (pas « fire and forget »)

- Une publication planifiée : après connexion des réseaux, le cron `social-sync?mode=publish` la fait partir **à l'échéance** ; sans connexion elle **reste en attente** (SCHEDULED+pending, re-tentée) — jamais consommée à vide.
- Toujours conclure par l'état RÉEL (publié / en attente de connexion / DEFERRED), jamais un « c'est fait » optimiste.

---

## Conditions STOP

- Un secret devrait être committé pour « que ça marche » → **STOP** : env var + surface de saisie, jamais dans le repo.
- L'action prod exige un accès base/credential que NEFER n'a pas → **STOP** : livrer le code+seed+surface, puis donner la commande/geste opérateur exact. Ne jamais simuler l'action ni prétendre l'avoir faite.
- La donnée à injecter n'est pas inférable des sources → **1 question ciblée**.

## Enchaînement

TEMPS 1 (injection) utilise `nefer-mutation` (si code) + `nefer-ship` (livraison). TEMPS 2 suit le merge. TEMPS 3 se termine par la frontière NEFER/opérateur explicite. La console `/console/socle/prod-ops` (si présente) surface les 3 temps pour l'opérateur.

# Plan de reprise — session du 2026-07-10 (passation)

> **Instruction de reprise (à coller en premier message de la nouvelle session)** :
> « Reprends le plan `docs/ops/PLAN-REPRISE-2026-07-10.md` (sur main). Exécute
> la section 3 (pipeline des 10 PRs) dans l'ordre indiqué. Mandat : chaque PR
> atteint un état terminal — mergée si verte, fermée avec justification sinon.
> Ne rien laisser ouvert. Puis section 4 (sécurité) et section 5 (finitions). »

---

## 1. État à la passation (2026-07-10 ~19:15 UTC)

- **PR #442 mergée** (`d12629c`) — mégasprint audit OS, v6.27.76→82 : empreinte
  digitale entière (collecteurs + score /100 + UI + narratif), multi-pod Redis
  (opt-in `REDIS_URL`), fix critique `bootstrapGovernance` au boot
  (`src/instrumentation.ts`), daemon cron in-process (`OPS_DAEMON`), feeds
  marché dynamiques, intake ADVE-only, C8 clos, extraction premium
  post-paiement, composer rapport zéro-LLM, fuite sécurité commissions fermée,
  billing cockpit.
- **PR #444 mergée** (`4656f0f`) — v6.27.83 : attribution funnel (colonne
  `QuickIntake.attribution` + capture UTM + colonne Provenance console),
  intégrations cockpit (`getConnectedSources` + section settings),
  personnalisation (og:image sur la cover PDF), entrypoint durci (migrate
  best-effort), fix CI lighthouse (`CANONICAL_HOST=localhost:3000`).
- **Prod UP** — powerupgraders.com = app Coolify `Upgraders & La fusée`
  (uuid `rfkgtj7us50jlbaiz1tjke2a`).
- **CI de référence : 15/15 checks verts** sur le head de #444 (Golden Path
  E2E et lighthouse inclus — premier passage vert de lighthouse).

## 2. Incident prod résolu (contexte indispensable)

Le merge de #442 a déclenché un crash-loop → 503 (~35 min). Cause **prouvée**
(logs conteneur via SSH) : l'image standalone Next élague `node_modules` et
n'embarque pas le moteur WASM du CLI Prisma (`prisma_schema_build_bg.wasm`) →
le `prisma migrate deploy` du nouvel entrypoint crashait (ENOENT) → `set -e`
tuait le conteneur. **Jamais un problème d'historique de migrations**
(`_prisma_migrations` de prod est sain, dernier appliqué `20260629160000`).

Remédiations EN PLACE :
- Env Coolify **`SKIP_MIGRATE_ON_BOOT=1`** posée via API — **à garder** en
  prod standalone.
- Entrypoint best-effort (mergé via #444) — un échec migrate loggue mais ne
  tue plus le boot.
- Migration `20260710190000_intake_attribution` **appliquée à la main en prod**
  (colonne + ligne `_prisma_migrations` avec le checksum exact
  `bb9da2c15e90e7d1591685e39e984a64bda1279e9772abf953882ee32b32bf92`) — un
  futur `migrate deploy` la saute proprement.
- **DB prod réelle = conteneur `qosouizh7eszymg7z4dupsa7`** (user `lafusee`,
  db `lafusee`, 37 lignes QuickIntake au 2026-07-10). ⚠️ Il y a des bases
  LEURRES sur le VPS (`fz2kaykcqvkfvtorvqntyoty` et `q148e0jc…` = v7/v8,
  `kgnzh…` = spawt, etc.) — TOUJOURS vérifier le `DATABASE_URL` du conteneur
  app (`docker exec <app> printenv DATABASE_URL`) avant tout SQL.
- **Flow migrations désormais** : toute nouvelle migration s'applique
  hors-bande (workflow `ops-ssh` → `docker exec <pg> psql`, ou job dédié),
  JAMAIS par le boot du conteneur standalone.

## 3. LE RESTANT — pipeline des 10 PRs ouvertes

Mandat opérateur : **état terminal pour chaque PR — mergée si verte, fermée
avec justification sinon. Ne rien laisser ouvert.**

Outils MCP GitHub : `update_pull_request_branch` · `pull_request_read`
(get_check_runs) · `merge_pull_request` (method=merge) · `issue_write`
(labels / close / ready) · `add_issue_comment` (`@dependabot rebase`).
Gate de merge : label `phase/N` ou `out-of-scope` présent (check « Phase
label present ») + tous checks verts sur le head **à jour**.

### Étape A — #401 (feat!: La Fusée v7 rebuild) : FERMER, ne JAMAIS merger
2 802 fichiers, +74k/−22k : quarantine la v6 dans `legacy/` et remplace la
racine par la v7. Merger = Coolify reconstruit la prod depuis la v7 (qui n'a
ni campagnes, ni missions, ni Guilde, ni momo) = destruction du money-path v6
et de tout le travail du 2026-07-10. La v7 vit déjà sur **sa propre app
Coolify** (`lafusee-v7`, lafuseev7.powerupgraders.com) et sa branche
`claude/project-revamp-agent-safe-doc3ip` reste intacte après fermeture.
→ Close + commentaire : « Fermée sans merge : la v7 est un produit parallèle
(app Coolify dédiée). Merger remplacerait la v6 en production. Branche
conservée, réouvrable si bascule v7 décidée (alors dérouler WP-013 du
REBUILD-PLAN : GO opérateur + backup + bascule DNS). »

### Étape B — #419 (docs revamp, 3 fichiers, +445, dossier `revamp/` neuf) : MERGER
Docs-only, zéro runtime, label `out-of-scope` déjà posé.
→ ready (draft:false) → `update_pull_request_branch` → CI verte → merge.

### Étape C — #398 puis #399 (bumps GitHub Actions — pas de lockfile) : MERGER
`actions/checkout` 4→7, `chromaui/action` 17→18. Aucun conflit croisé.
⚠️ Dependabot ne pose pas de label → poser `out-of-scope` sinon le check
Phase label est rouge.
→ pour chacun : label → update branch → CI verte → merge.

### Étape D — #380 (Cockpit UX Lots 1&2, 34 fichiers, base du 29 juin) : MERGER après rebase
Valeur produit réelle : purge du vocabulaire interne côté client (exigence
doctrine UPGRADERS-LAFUSEE-KB §3 — les noms mythologiques ne sont JAMAIS
exposés au client) + `auth.me.canOperate` additif + UI honnête par rôle.
→ ready → `update_pull_request_branch`. Si conflit (probable : nav, i18n,
pages cockpit retouchées depuis) : cloner `claude/cockpit-ux-audit-kqilfu`,
`git merge origin/main`, résoudre en gardant LES DEUX intentions
(renommages business de #380 + structure récente de main — dont
`/cockpit/settings` enrichi le 07-10), push, CI verte, merge.

### Étape E — bumps npm : CHAÎNE STRICTE (conflit mutuel sur `package-lock.json`)
Après CHAQUE merge de cette étape, le suivant devient conflictuel sur le
lockfile → commenter `@dependabot rebase` dessus, attendre le re-push
dependabot (~1-2 min), attendre la CI verte, merger. Poser le label
`out-of-scope` sur chacun (dependabot n'en met pas → check Phase label rouge sinon).

Ordre du moins au plus risqué :
1. **#361** zod 4.4.2→4.4.3 (patch)
2. **#421** groupe eslint (3 updates, dev tooling)
3. **#283** groupe trpc (4 minors)
4. **#285** groupe tailwind (2 updates — Chromatic + build attrapent les régressions)
5. **#362** puppeteer 24.42→25.2.1 — **MAJEUR, risque PDF (money-path)** :
   - le repo utilise chromium système (`PUPPETEER_SKIP_DOWNLOAD` +
     `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium` dans le Dockerfile) —
     vérifier que `launch({executablePath})` + `page.pdf()` utilisées par
     `src/server/services/value-report-generator/*` sont intactes en v25 ;
   - après merge + deploy : tester en prod `GET /api/intake/<token>/pdf`
     sur un intake réel → un PDF, pas un 500 ;
   - si ça casse : PR de revert du bump, pas de bricolage.

### Étape F — vérification finale
- `list_pull_requests state=open` → doit être **vide**.
- Prod : `curl https://powerupgraders.com/intake` → 200 après le dernier deploy.
- Chaque merge sur main = un deploy Coolify : vérifier `running:healthy` après la vague.

## 4. SÉCURITÉ — action opérateur (bloquant, non délégable)

1. **Révoquer le token API Coolify `ClaudeFuture`** (passé en clair dans le
   chat + utilisé via l'API) → Coolify → Keys & Tokens → nouveau token.
2. **Révoquer la clé SSH** ed25519 `…QNDIlbxt` (commentaire `coolify`) du
   `~/.ssh/authorized_keys` de `root@76.13.128.23` (passée en clair dans le
   chat + en input de runs GitHub Actions) → nouvelle paire.
3. Après rotation, trancher le sort de `.github/workflows/ops-ssh.yml`
   (break-glass, inerte sans la clé) : garder comme outil d'ops ou supprimer.
4. Le repo est marqué **public** dans l'API GitHub — si voulu, la rotation
   est d'autant plus impérative.

## 5. Finitions env (non bloquant, améliore la prod)

Sur l'app Coolify `Upgraders & La fusée`, poser les clés pour sortir du mode
dégradé honnête (l'app tourne sans, mais des mesures restent « non mesuré ») :
- `BRAVE_API_KEY`, `APIFY_TOKEN` (+ `YOUTUBE_API_KEY`, `PAGESPEED_API_KEY`,
  `APIFY_MAPS_ACTOR_ID`, `APIFY_ADS_ACTOR_ID`) → empreinte digitale réelle.
- `REDIS_URL` → seulement si passage à plusieurs répliques (sinon single-pod
  honnête, ne rien faire).
- `STRIPE_*` / `CINETPAY_*` → paiement auto (le manuel WhatsApp marche déjà).
Détail complet : `docs/deploy/ENV-VARS.md` (table env × dégradation).

## 6. Aide-mémoire — commandes clés

- Statut prod : `curl -sI https://powerupgraders.com/intake | head -1`.
- Coolify API (base `https://coolify.powerupgraders.com/api/v1`, Bearer token) :
  `GET /applications` (statuts), `GET /deploy?uuid=<app>`,
  `POST /applications/<app>/envs` (poser une env), `GET /applications/<app>/envs`.
- SSH hors-bande vers le VPS : workflow `ops-ssh` (Actions →
  `run_workflow ops-ssh.yml ref=main`, inputs `b64key` = clé PEM base64,
  `cmd` = commande shell). Sortie via `list_workflow_runs` → `get_job_logs`.
- Trouver la DB d'une app :
  `docker exec <app> printenv DATABASE_URL | sed -E 's#://[^@]*@#://***@#'`.

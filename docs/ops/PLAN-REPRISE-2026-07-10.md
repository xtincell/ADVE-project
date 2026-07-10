# Plan de reprise — session du 2026-07-10 (passation)

> **Instruction de reprise (à coller telle quelle en premier message de la
> nouvelle session)** :
> « Reprends le plan `docs/ops/PLAN-REPRISE-2026-07-10.md` (sur main). Exécute
> la section 3 (pipeline des 10 PRs) dans l'ordre indiqué, avec les gates et
> pièges documentés. Mandat : chaque PR atteint un état terminal — mergée si
> verte, fermée avec justification sinon. Ne rien laisser ouvert. »

---

## 1. État au moment de la passation (2026-07-10 ~19:15 UTC)

**Mergé sur main aujourd'hui :**
- **PR #442** (`d12629c`) — mégasprint audit OS complet, v6.27.76 → v6.27.82 :
  empreinte digitale entière (collecteurs + score /100 + UI + narratif),
  multi-pod Redis (opt-in `REDIS_URL`), **fix critique** `bootstrapGovernance`
  jamais appelé au boot (src/instrumentation.ts), daemon cron in-process
  (`OPS_DAEMON`, plus besoin de cron externe), feeds marché dynamiques,
  intake ADVE-only, C8 clos, extraction premium post-paiement, composer
  rapport zéro-LLM, fuite sécurité commissions fermée, billing cockpit.
- **PR #444** (`4656f0f`) — v6.27.83 : attribution funnel (colonne
  `QuickIntake.attribution` + capture UTM + colonne Provenance console),
  intégrations cockpit (`getConnectedSources` + section settings),
  personnalisation (og:image sur la cover PDF), **entrypoint durci**
  (migrate-on-boot best-effort, ne crash-loop plus jamais),
  **fix CI lighthouse** (`CANONICAL_HOST=localhost:3000` — premier passage
  vert de ce job en localhost pur).

**Prod (powerupgraders.com, Coolify app `Upgraders & La fusée`
uuid `rfkgtj7us50jlbaiz1tjke2a`) : UP, HTTP 200.**

**Suite CI de référence : 15/15 checks verts sur le head mergé de #444**
(y compris Golden Path E2E et lighthouse).

## 2. Incident prod résolu (contexte indispensable)

Le merge de #442 a déclenché un crash-loop → 503 (~35 min). Cause racine
**prouvée** : l'image standalone Next élague `node_modules` et n'embarque pas
le moteur WASM du CLI Prisma (`prisma_schema_build_bg.wasm`) → le
`prisma migrate deploy` du nouvel entrypoint crashait (ENOENT) → `set -e`
tuait le conteneur. **Jamais un problème d'historique de migrations**
(`_prisma_migrations` de prod est sain, dernier appliqué `20260629160000`).

Remédiations en place :
- Env Coolify **`SKIP_MIGRATE_ON_BOOT=1`** posée (via API) — À GARDER en
  prod standalone.
- Entrypoint best-effort (mergé via #444) — un échec migrate loggue mais ne
  tue plus le boot.
- **Migration `20260710190000_intake_attribution` appliquée À LA MAIN en prod**
  (colonne + enregistrement `_prisma_migrations` avec le checksum exact
  `bb9da2c15e90e7d1591685e39e984a64bda1279e9772abf953882ee32b32bf92`) —
  un futur `migrate deploy` la saute proprement.
- **Base de prod réelle = conteneur `qosouizh7eszymg7z4dupsa7`**
  (user `lafusee`, db `lafusee`, 37 lignes QuickIntake). ⚠️ Il y a des bases
  leurres sur le VPS (`fz2kaykcqvkfvtorvqntyoty`, `q148e0jc...` = v7/v8,
  `spawt`, etc.) — TOUJOURS vérifier via le `DATABASE_URL` du conteneur app
  avant tout SQL.

**Flow migrations désormais** : toute nouvelle migration doit être appliquée
hors-bande (workflow `ops-ssh` → `docker exec <pg> psql`, ou job dédié avec
env complet), PAS par le boot du conteneur standalone.

## 3. LE TRAVAIL RESTANT — pipeline des 10 PRs ouvertes

Mandat opérateur : **état terminal pour chaque PR. Mergée si verte, fermée
avec justification documentée sinon. Ne rien laisser ouvert.**

Outils : MCP GitHub (`update_pull_request_branch`, `pull_request_read
get_check_runs`, `merge_pull_request` method=merge, `issue_write` pour
labels/close, `add_issue_comment` pour `@dependabot rebase`).

### Ordre d'exécution et méthode

**Étape A — #401 (v7 rebuild) : FERMER, ne jamais merger.**
2 802 fichiers, +74
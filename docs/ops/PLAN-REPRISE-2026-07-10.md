# Plan de reprise — session du 2026-07-10 (passation)

> **Instruction de reprise (à coller en premier message de la nouvelle session)** :
> « Reprends le plan `docs/ops/PLAN-REPRISE-2026-07-10.md` (sur main). Exécute
> la section 3 (pipeline des 10 PRs) dans l'ordre indiqué. Mandat : chaque PR
> atteint un état terminal — mergée si verte, fermée avec justification sinon.
> Ne rien laisser ouvert. Puis section 4 (sécurité) et section 5 (finitions). »

---

## 1. État à la passation (2026-07-10 ~19:15 UTC)

- **PR #442 mergée** (`d12629c`) — mégasprint audit OS, v6.27.76→82 : empreinte
  digitale entière (collecteurs+score+UI+narratif), multi-pod Redis (opt-in
  `REDIS_URL`), fix critique `bootstrapGovernance` au boot (`src/instrumentation.ts`),
  daemon cron in-process (`OPS_DAEMON`), feeds dynamiques, intake ADVE-only,
  C8 clos, extraction premium post-paiement, composer zéro-LLM, fuite sécurité
  commissions fermée, billing cockpit.
- **PR #444 mergée** (`4656f0f`) — v6.27.83 : attribution funnel (colonne
  `QuickIntake.attribution` + capture UTM + Provenance console), intégrations
  cockpit (`getConnectedSources` + section settings), personnalisation
  (og:image cover PDF), entrypoint durci (migrate best-effort), fix lighthouse
  (`CANONICAL_HOST=localhost:3000`).
- **Prod UP** (powerupgraders.com = app Coolify `rfkgtj7us50jlbaiz1tjke2a`).
- **CI de référence : 15/15 verts** sur le head de #444 (Golden Path + lighthouse inclus).

## 2. Incident prod résolu (contexte indispensable)

Merge #442 → crash-loop 503 (~35 min). Cause **prouvée** : l'image standalone
n'embarque pas le WASM du CLI Prisma → `migrate deploy` du boot crashait
(ENOENT) → `set -e` tuait le conteneur. PAS un problème d'historique
(`_prisma_migrations` prod sain, dernier `20260629160000`).

En place :
- Env Coolify **`SKIP_MIGRATE_ON_BOOT=1`** — À GARDER en prod standalone.
- Entrypoint best-effort (mergé #444) — ne crash-loop plus.
- Migration `20260710190000_intake_attribution` **appliquée à la main en prod**
  + enregistrée dans `_prisma_migrations` (checksum
  `bb9da2c15e90e7d1591685e39e984a64bda1279e9772abf953882ee32b32bf92`).
- **DB prod réelle = conteneur `qosouizh7eszymg7z4dupsa7`** (user/db `lafusee`,
  37 QuickIntake). ⚠️ Bases leurres sur le VPS (v7/v8, spawt…) : TOUJOURS
  vérifier le `DATABASE_URL` du conteneur app avant tout SQL.
- **Toute nouvelle migration = hors-bande** (workflow `ops-ssh` →
  `docker exec <pg> psql`, cf. §4), jamais par le boot standalone.

## 3. LE RESTANT — pipeline des 10 PRs ouvertes

Mandat : **état terminal partout**. Outils MCP GitHub :
`update_pull_request_branch`, `pull_request_read` (get_check_runs),
`merge_pull_request` (method=merge), `issue_write` (labels/close/ready),
`add_issue_comment` (`@dependabot rebase`).

Gate de merge par PR : label `phase/N` ou `out-of-scope` présent (check CI
« Phase label present ») + tous checks verts sur le head À JOUR.

**Étape A — #401 (feat!: v7 rebuild) : FERMER, ne JAMAIS merger.**
2 802 fichiers, +74k/−22k : quarantine la v6 dans `legacy/` et remplace la
racine par la v7. Merger = Coolify reconstruit la prod depuis la v7 (sans
campagnes/missions/Guilde/momo) = destruction du money-path v6 et de tout le
travail du 2026-07-10. La v7 vit déjà sur sa propre app Coolify
(`lafusee-v7`, lafuseev7.powerupgraders.com) et sa branche
`claude/project-revamp-agent-safe-doc3ip` reste intacte après fermeture.
→ Close + commentaire : « Fermée sans merge : la v7 est un produit parallèle
(app Coolify dédiée) ; merger remplacerait la v6 en production. Branche
conservée, réouvrable si bascule v7 décidée (alors : WP-013 du
REBUILD-PLAN — GO opérateur + backup + bascule DNS). »

**Étape B — #419 (docs revamp, +445, 3 fichiers, dossier `revamp/` neuf) : MERGER.**
Docs-only, zéro runtime, label `out-of-scope` déjà posé.
→ marquer ready (draft:false) → `update_pull_request_branch` → CI verte → merge.

**Étape C — #398 puis #399 (bumps GitHub Actions — PAS de lockfile).**
`actions/checkout` 4→7 et `chromaui/action` 17→18. Pas de conflit croisé.
⚠️ Poser un label (`out-of-scope` convient, dependabot n'en met pas) sinon le
check Phase label est rouge.
→ pour chacun : label → update branch → CI verte → merge.

**Étape D — #380 (Cockpit UX Lots 1&2, 34 fichiers, base 29 juin) : MERGER après rebase.**
Valeur produit réelle (purge vocabulaire interne côté client — exigence
doctrine KB §3 — + `auth.me.canOperate` + UI honnête par rôle). Base vieille
de 10 jours : `update_pull_request_branch` peut échouer en conflit (nav,
i18n, pages cockpit retouchées depuis).
→ Si update OK : ready → CI → merge. Si conflit : cloner la branche
`claude/cockpit-ux-audit-kqilfu` localement, `git merge origin/main`,
résoudre (conflits attendus = libellés/nav — prendre les DEUX intentions :
renommages business de #380 + structure récente de main), push, CI, merge.

**Étape E — bumps npm, CHAÎNE STRICTE (ils se conflictent tous sur
`package-lock.json` : après chaque merge, rebaser le suivant).**
Ordre du moins au plus risqué :
1. **#361** zod 4.4.2→4.4.3 (patch)
2. **#421** groupe eslint (dev tooling)
3. **#283** groupe trpc (4 minors)
4. **#285** groupe tailwind (2 updates — Chromatic + build attrapent les régressions)
5. **#362** puppeteer 24→25 (**MAJEUR — risque PDF**, voir ci-dessous)

Boucle par PR : poser label `out-of-scope` → commenter `@dependabot rebase`
(dependabot régénère le lockfile proprement, ~1-2
# ADR-0140 — Login personnalisé par marque (console opérateur)

- **Status** : Accepted
- **Date** : 2026-07-13 (nuit)
- **Depends on** : ADR-0129 (StrategyCollaborator — accès délégué par marque), ADR-0131 (firewall de zones par rôle), ADR-0124 (spine d'émission)
- **Supersedes** : —

## Contexte

Demande opérateur : « crée un compte et un login personnalisé par marque » (premier : Lionel → Motion19). Il manquait une voie opérateur pour **provisionner** un login rattaché à UNE marque. Les briques existaient séparément :

- `auth.register` (public) crée un `User` avec `hashedPassword` (bcrypt coût 12) — mais pas de rattachement marque, et c'est un self-service pré-auth.
- `GRANT_STRATEGY_COLLABORATOR` (ADR-0129) rattache un user EXISTANT à une Strategy — mais ne crée pas le compte.
- La console `/console/governance/accounts` gère les rôles (`ADMIN_SET_USER_ROLE`) mais ne crée pas de login.

## Décision

Un seul acte opérateur `createBrandLogin` (console `/console/governance/accounts`) qui **crée (ou réclame un stub) le compte + le rattache à la marque**, gouverné par le nouvel Intent kind **`ADMIN_CREATE_BRAND_LOGIN`** (governor `INFRASTRUCTURE`, handler `accounts` — cohérent avec `ADMIN_SET_USER_ROLE`).

- Compte : `User` (email lower-case, `bcrypt.hash(password, 12)` — parité `auth.register`, `role` = compte cockpit au choix, défaut `FOUNDER`). Réclame un stub sans mot de passe ; **refuse** un email déjà pourvu d'un mot de passe.
- Rattachement : `StrategyCollaborator` upsert `ACTIVE` (mêmes champs que `GRANT_STRATEGY_COLLABORATOR`), rôle = `CampaignTeamRole` (défaut `DIGITAL_DIRECTOR`). L'accès cockpit est **scopé à cette marque** par `canAccessStrategy`/`scopeStrategies` ; les **zones d'écriture** sont bornées par le firewall collaborateur (ADR-0131).

### Pourquoi PAS `governedProcedure`

`governedProcedure` persiste **l'input verbatim** dans l'`IntentEmission` hash-chaînée (`preEmitIntent(ctx, kind, input, …)`). Le mot de passe en clair y fuirait. On émet donc **manuellement via le spine** (`openEmission`/`closeEmission`, ADR-0124 — précédent : `governance.ts`) avec un **payload REDACTÉ** (email, marque, rôles, acteur — **jamais** le mot de passe). Le `adminProcedure` garantit le rôle ADMIN. Vérifié : `verify-brand-login.ts` assert que `12345678` est **absent** de l'IntentEmission.

## Conséquences

- Feature opérateur réutilisable : un login par marque, en un acte gouverné + audité, sans SSH ni SQL brut.
- **Bug pré-existant corrigé en passant** : `social-publish.ts` et `social-inbox.ts` sélectionnaient `Strategy.companyName` — champ **inexistant** sur `Strategy` (il est sur d'autres modèles). Le client Prisma local périmé masquait l'erreur à `tsc` ; au runtime la notification de publication **plantait**. Rebasculé sur `Strategy.name` (le nom de marque). Dans le chemin exact de publication FB testé par l'opérateur.
- Vérifié bout-en-bout en local (`scripts/verify-brand-login.ts`) : bcrypt.compare OK · StrategyCollaborator ACTIVE · `canAccessStrategy(Lionel, Motion19)` = true · **zéro fuite de secret**. Pipe de publication prouvé (`scripts/verify-social-pipe.ts`) : planif → calendrier → cron → ré-émission gouvernée → publication (honnête `NOT_CONNECTED` sans page FB locale).
- 0 modèle Prisma, 1 Intent kind (`ADMIN_CREATE_BRAND_LOGIN`) + 1 SLO, cap APOGEE 7/7 préservé. Login `role` par défaut `FOUNDER` — ajustable dans le formulaire.

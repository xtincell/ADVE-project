# ADR-0129 — Accès délégué par marque : StrategyCollaborator (directeur du digital externe)

- **Status** : Accepted
- **Date** : 2026-07-12
- **Phase** : post-Phase 23 (demande opérateur — « mon compte Maximus devra avoir accès à la zone cockpit du digital de Motion19 avec la capacité de voir et de publier, de mettre à jour le calendrier éditorial et toutes les autres actions d'un directeur du digital »)
- **Depends on** : ADR-0098 (La Guilde), ADR-0060 (manual-first), ADR-0122 (frontière founder/opérateur), ADR-0128 (réseaux de la marque)
- **Supersedes** : —

## Contexte

Un freelance recruté via La Guilde (mission « Gestion du Digital — Motion19 », 200 000 FCFA/mois) doit opérer la zone digitale du cockpit d'UNE marque précise. L'audit (Phase 2) a établi qu'**aucun mécanisme d'accès par marque n'existe** :

- L'« appartenance » d'une Strategy se résume à `userId` (owner) / `operatorId` (agence) / ADMIN — le point de passage canonique est `canAccessStrategy` (`operator-isolation`, ~8 routers).
- `CampaignTeamMember` (enum `CampaignTeamRole`, champ `permissions Json`) est **purement descriptif** : jamais lu par une garde. Précédent à ne pas répéter.
- `FREELANCE` est exclu de `COCKPIT_ROLES` (middleware) — blocage avant toute donnée.
- **Trou pré-existant grave** : les écritures de la zone digitale (`actions.byStrategy/summary/propose/setSelected/setTiming/autoSchedule` — le calendrier éditorial BrandAction —, `publication.list/get/delete`, `glory.launchCalendar`) n'avaient **AUCUNE garde d'ownership** (`protectedProcedure` nu) : tout authentifié pouvait lire/écrire le calendrier de n'importe quelle marque. Ouvrir le cockpit aux freelances sans fermer ce trou aurait été un bypass par négligence.

## Décision

**Un modèle additif `StrategyCollaborator`, appliqué par le chokepoint canonique — de l'authz réelle, jamais du descriptif.**

1. **Modèle** : `StrategyCollaborator { strategyId, userId, role CampaignTeamRole, scopes Json?, status ACTIVE|REVOKED, grantedByUserId, revokedAt, note }`, unique `(strategyId, userId)`. Le rôle **réutilise l'enum `CampaignTeamRole`** étendu d'une valeur `DIGITAL_DIRECTOR` (anti-doublon : pas de second vocabulaire de rôles). Migration `20260712150000_strategy_collaborator` (additive).
2. **Application (le cœur)** : `canAccessStrategy` accorde l'accès si collaboration ACTIVE ; `scopeStrategies` inclut les marques déléguées dans le portefeuille (le sélecteur cockpit montre Motion19 à Maximus). Helper `getStrategyCollaboratorRole` pour le gating fin futur par zone.
3. **Fermeture du trou pré-existant** : gardes par-marque posées sur les 6 procédures `actions.*` founder-facing, les 3 `publication.*` et `glory.launchCalendar` (helper local → `canAccessStrategy`). Les 5 checks inline de `cockpit-router` et le helper de `social.ts` (garde faible : tout porteur d'un operatorId quelconque passait — corrigé) basculent sur le chokepoint.
4. **Middleware** : `FREELANCE` + `CREATOR` entrent dans `COCKPIT_ROLES` — même posture « ouvert par défaut » que `USER`, les DONNÉES restant scoppées par (2) : sans grant ACTIVE, portefeuille vide.
5. **Cycle de vie gouverné** : `GRANT_STRATEGY_COLLABORATOR` / `REVOKE_STRATEGY_COLLABORATOR` (governor **IMHOTEP** — Crew Programs : affecter un talent à une marque est un geste crew), `requireOperator: true`, procédures `strategy.grantCollaborator` (par email du compte, upsert réactivant) / `revokeCollaborator` (statut REVOKED + `revokedAt`, ligne conservée — Loi 1) / `listCollaborators`. Primitives write pures → Intent direct sans Glory tool (NEFER §3.1).
6. **Périmètre v1 du « directeur du digital »** : voir le dashboard/les surfaces de la marque, **mettre à jour le calendrier éditorial** (BrandAction : sélection, timing, auto-planification, propositions), consulter/gérer les publications, hub réseaux sociaux (ADR-0128), campagnes (via `enforceStrategyAccess` → chokepoint, bénéfice automatique). **Hors périmètre v1** (opérateur-only, tracé RESIDUAL-DEBT) : envoi newsletter (`operatorProcedure`), édition ADVE (reste founder/opérateur), gestes `<OperatorSurface>`.

## Conséquences

- Maximus (FREELANCE) se connecte, voit UNIQUEMENT Motion19, opère le calendrier et les surfaces digitales ; la révocation coupe l'accès au prochain appel (gardes re-fetch en DB — le JWT ne porte rien).
- Seed : grant `DIGITAL_DIRECTOR` scopes `["digital"]` posé par `seedMotion19Guild` (décision opérateur explicite du 12/07/2026).
- Tests : `tests/unit/governance/strategy-collaborator.test.ts` (6 verrous : modèle+enum, chokepoint consulté, zone digitale gardée ×10 procédures, middleware, kinds+SLO+requireOperator, hex theming validés).
- **Restes (RESIDUAL-DEBT §ADR-0129)** : UI console/cockpit de gestion des collaborateurs (grant/revoke via l'Intent existant) ; gating fin par `scopes` (v1 : l'accès marque est entier côté surfaces couvertes) ; délégation newsletter ; balayage des autres routers strategy-scopés encore en checks inline (boot-sequence…) vers le chokepoint.

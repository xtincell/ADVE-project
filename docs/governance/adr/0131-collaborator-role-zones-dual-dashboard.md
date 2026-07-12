# ADR-0131 — Zones d'écriture par rôle collaborateur + double dashboard (stratégique / opérationnel)

- **Status** : Accepted
- **Date** : 2026-07-12
- **Phase** : post-Phase 23 (mandats opérateur — « Maximus est juste social media manager… conçois le système d'autorisation lié au rôle » · « fais ça proprement : un Dashboard stratégique et un Dashboard opérationnel » · « lisible pour une INFJ »)
- **Depends on** : ADR-0129 (StrategyCollaborator), ADR-0130 (theming), ADR-0122 (nav founder), ADR-0128 (réseaux), ADR-0124 (spine d'émission)
- **Supersedes** : périmètre v1 « accès marque entier » d'ADR-0129 §6 (remplacé par les zones)

## Contexte

ADR-0129 a posé l'accès délégué par marque mais en v1 « l'accès marque est entier côté surfaces couvertes » : un collaborateur ACTIVE traversait `canAccessStrategy` et, par ricochet, TOUTES les mutations gouvernées strategy-scopées lui étaient ouvertes (sur-délégation silencieuse). L'opérateur précise le besoin réel : un **social media manager** écrit dans SON métier (calendrier éditorial, publications, réseaux) et lit le reste. Par ailleurs le dashboard unique mélangeait stratégie de marque et suivi du jour — la référence visuelle fournie (« Maman Ananas ») est une vue de **suivi opérationnel**, pas un remplacement du dashboard stratégique.

## Décision

### 1. Zones d'écriture par rôle (DENY par défaut)

- **Canon domaine** `src/domain/collaborator-access.ts` : `COLLABORATOR_WRITE_ZONES` (rôle enum `CampaignTeamRole` → zones ⊆ {calendar, publications, social, campaigns, newsletter, requests}) + `COLLABORATOR_KIND_ZONES` (Intent kind → zone, **liste blanche kind par kind, jamais de wildcard**) + libellés métier client-safe. `SOCIAL_MANAGER` → calendar/publications/social ; `DIGITAL_DIRECTOR` → + campaigns/newsletter/requests ; rôle non cartographié → **lecture seule intégrale**. L'ADVE, la stratégie, les livrables et les réglages ne sont jamais délégables.
- **Firewall d'émission** `src/server/governance/collaborator-firewall.ts`, branché sur **les deux voies gouvernées** (`governedProcedure` + strangler `auditedProcedure`) : l'utilisateur qui n'agit QUE par délégation ne peut émettre que les kinds catalogués pour sa zone — veto **audité** (`COLLABORATOR_ZONE_VETO`, status VETOED, même pattern que les readiness gates). Owner / ADMIN / staff opérateur de la marque : non concernés.
- **Gardes de surface** : le calendrier distingue lecture (`assertCalendarAccess`) et écriture (`assertCalendarWrite` — zone `calendar`) sur les 4 procédures d'écriture founder-facing.
- **UI honnête** : `strategy.getMyAccess` (nature de mon accès + zones) → chip sidebar « Accès délégué — {métier} » ; les vetos remontent en message business, jamais un 404.

### 2. Mini console du membre de Guilde

`strategy.myDelegatedBrands` agrège pour le talent connecté : **cockpits délégués** (marque, métier, zones, bouton « Ouvrir le cockpit »), **missions en cours** (dont retainers mensuels — le budget affiché), **candidatures** et leur statut. Rendue en tête du portail `/creator` (« Mes marques & accès ») — une ligne par réalité, le détail vit sur les surfaces dédiées.

### 3. Double dashboard (stratégique / opérationnel)

- `/cockpit` reste le **dashboard stratégique** (identité, score, focus, superfans, radar) — enrichi vague 4 : logo sidebar, vitrine « Campagne du moment » + « Créations récentes » (`getCampaignShowcase` — données réelles, jamais de visuel de démonstration), **mode jour** (`CockpitThemeToggle` : stamp `data-theme="light"` persisté — les tokens light existaient déjà, system.css/upgraders.css).
- `/cockpit/operate/center` devient le **dashboard opérationnel** « Suivi du jour » (`getOperationsSnapshot` : communauté FollowerSnapshot total/Δ/répartition/historique, calendrier ±14 j, missions ouvertes ; tuile « Portée & engagement » honnêtement **à connecter** ; « Ventes » honnêtement **non branché**). La garde `<OperatorSurface>` de segment (lot 12) est retirée ; le pilotage détaillé (`OperationsCenter` : actions priorisées, charge, budgets) reste opérateur-only par rendu conditionnel `canOperate`. Entrée nav « Suivi du jour » (groupe Mon activité, i18n FR/EN/ZH) + switchers croisés entre les deux vues.
- **Principe de densité (INFJ)** : un signal par carte, hiérarchie nette, rien de caché — ce qui n'a pas de source branchée l'affiche avec le geste qui le débloque.

## Conséquences

- Maximus (SOCIAL_MANAGER, seed corrigé) : voit Motion19 seule, écrit calendrier/publications/réseaux, tout le reste en lecture ; toute tentative hors zone = veto audité. Vérifié E2E (mini console /creator, chip cockpit, ops dashboard, light mode).
- Tests : `strategy-collaborator.test.ts` verrous (7)(8)(9) — table DENY par défaut, firewall branché ×2 voies, split lecture/écriture calendrier.
- **Restes (RESIDUAL-DEBT §ADR-0131)** : cartographie kind→zone à étendre (campagnes DD), masquage fin des boutons d'écriture hors zone sur les surfaces secondaires, sweep light-mode page-par-page hors dashboards.

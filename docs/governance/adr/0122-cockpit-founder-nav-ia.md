# ADR-0122 — IA de navigation founder du Cockpit (20 items / 6 groupes)

- **Statut** : Accepted (2026-07-11)
- **Contexte** : audit UX 2ᵉ passe [docs/audits/COCKPIT-UX-AUDIT-2026-07-11.md](../../audits/COCKPIT-UX-AUDIT-2026-07-11.md) §B — signal opérateur « la navigation est confusante »
- **Portée** : `cockpitNavGroups` uniquement (Console/Agency/Creator inchangés)

## Contexte

La nav Cockpit alignait 35 items / 11 groupes en liste plate, dont ~40 % de surfaces de production agence (Operations Center avec emails d'équipe et SLA, Forge, Séquences, Missions…), 5 familles de labels quasi-dupliqués (Roadmap ×2, Diagnostics ×2, Track(er) ×3, Recommandations ×3, Calendrier ×3), un ordre de groupe au service du mnémonique interne ADVERTIS, 12 routes sans item actif, un bouton topbar « Assistant » no-op, une collision `Cmd+K` (palette + sélecteur de marque) et une sélection de marque non persistée. Le Cockpit est le portail **vendu** au founder (KB UPgraders §8) ; UX-DR16 prescrit des surfaces founder sans bouton de mutation.

## Décision

1. **Arbre founder par jobs** — 20 items / 6 groupes : `—` Tableau de bord · **Ma marque** (Fondation · Stratégie · Recommandations · La Gazette) · **Mes livrables** (L'Oracle · Livrables · Sources) · **Mon activité** (Campagnes · Calendrier · Résultats · Newsletter · Demandes) · **Mon marché** (Radar sectoriel · Études de marché · Communauté · Rapports & analyses) · **Mon compte** (Abonnement · Réglages) · `—` Messages. « L'Oracle » reste nommé ainsi : c'est un livrable **vendu** (KB §1), pas une fuite interne.
2. **Hubs piliers** — les 8 URLs piliers ne bougent pas ; 2 pages hub les regroupent : [/cockpit/brand/fondation](../../../src/app/(cockpit)/cockpit/brand/fondation/page.tsx) (A·D·V·E) et [/cockpit/brand/strategie](../../../src/app/(cockpit)/cockpit/brand/strategie/page.tsx) (R·T·I·S), statuts via `notoria.getDashboard` + `getPillarChipStatus` (source canonique F-A.5). L'alias `brand/strategy` (ADR-0030) est réaffecté 308 → hub.
3. **`NavItem.activePrefixes` + résolution « préfixe le plus long gagne »** ([nav-active.ts](../../../src/components/navigation/nav-active.ts), partagée sidebar/tabbar) — hubs et onglets allument leur item ; un href imbriqué (Abonnement sous Réglages) gagne sur son parent ; plus de page à repère perdu parmi les routes rattachées.
4. **Sorties de nav founder** — operate/center·forge·sequences·action-brief·missions, portfolio, brand/edit, brand/rtis(+synthese), insights/apogee-maintenance, intelligence/track quittent la nav ; routes conservées, gardées `<OperatorSurface>` (écran « pris en charge par votre équipe », jamais de 404 ni de redirect silencieux vers `/console`).
5. **Tabbar mobile explicite** — flag `mobileTab` (Tableau de bord, Fondation, Campagnes, Messages) au lieu de `slice(0,4)` ; labels résolus i18n. Nav i18n complète (FR/EN/ZH) pour les 20 items + 5 groupes.
6. **Shell** — marque active persistée (localStorage, fallback si supprimée) ; sélecteur de marque sur `Cmd+O` (la palette garde `Cmd+K`) ; bouton topbar Assistant = lien réel vers `/cockpit/mestor` (retiré des portails sans page assistant) ; footer sidebar → racine du portail.

## Alternatives rejetées

- **Redirects 308 pour les fusions Calendrier/operate-roadmap et Livrables/Guidelines/Assets** : les pages ont des fonctions distinctes ; un redirect aurait détruit de la fonction. `activePrefixes` consolide la nav sans toucher aux surfaces — la fusion réelle est le lot 13 (RESIDUAL-DEBT).
- **Renommer « L'Oracle »** (proposé par l'audit §B.3) : contredit la KB §1 (l'Oracle se vend sous ce nom).
- **Lettres de piliers retirées des libellés** : décision Lot 0 (audit 2026-06-29) toujours DÉFÉRÉE OPÉRATEUR — les hubs affichent la lettre en badge, réversible sans re-IA.

## Conséquences

- Deep-links préservés (aucune URL supprimée) ; les favoris sidebar pointant d'anciens items restent fonctionnels (href inchangés pour les items conservés).
- Le test HARD [cockpit-vocabulary.test.ts](../../../tests/unit/governance/cockpit-vocabulary.test.ts) (lot 11) verrouille le vocabulaire client des chaînes rendues du portail.
- Dette tracée (RESIDUAL-DEBT §Audit UX 2026-07-11) : fusion réelle des surfaces redondantes (lot 13), lexique + feedback natif (lot 14), DS/i18n résiduels (lot 15), durcissement site-par-site du défaut `requireOperator` (lot 12 suite).

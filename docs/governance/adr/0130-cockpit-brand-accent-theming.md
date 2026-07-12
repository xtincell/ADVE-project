# ADR-0130 — Le cockpit aux couleurs de la marque (accent piloté par la palette du coffre)

- **Status** : Accepted
- **Date** : 2026-07-12
- **Phase** : post-Phase 23 (instruction opérateur — « le cockpit doit refléter la marque quand même. Donc puiser dans son code couleur »)
- **Depends on** : ADR-0097 (DS UPgraders canon), ADR-0013 (architecture tokens 4 tiers), ADR-0128 (identité au dashboard)
- **Supersedes** : —

## Contexte

Le cockpit est la face client de La Fusée : il portait exclusivement la signature UPgraders (corail `#E56458`). L'opérateur exige que le portail **reflète la marque active** — la maquette de référence (dashboard « Maman Ananas ») et le brand book Motion19 (bleu digital `#3384FF`, rôle officiel : « accent vif à l'écran ») le confirment : le porteur doit se sentir chez LUI.

Contrainte DS : les 3 interdits (ADR-0013/0097) restent absolus — aucune couleur en dur dans un composant, cascade de tokens intacte.

## Décision

**Rebinder DEUX tokens System (`--accent`, `--accent-fill`) sur la palette DÉCLARÉE de la marque active, côté client, le temps de la session cockpit — la donnée pilote, le DS reste canon.**

1. **Source de vérité** : l'actif `CHROMATIC_STRATEGY` du coffre de la marque (contenu structuré `{ primary, accent, … }` — pour Motion19 : palette officielle du Brand Book 2026 V2, posée par le seed avec provenance). Pas de palette → aucun effet (thème UPgraders).
2. **Sortie serveur validée** : `cockpitDashboard.getBrandIdentity` projette `palette { accent, primary }` avec **validation stricte `#RRGGBB`** — jamais une chaîne libre vers le CSS.
3. **Application** : `<BrandAccentVars/>` (layout cockpit) pose `--accent` + `--accent-fill: color-mix(in oklab, <accent> 14%, transparent)` sur `documentElement` via CSSOM, avec **cleanup au démontage** (sortir du cockpit restaure le thème). Tout le chrome qui consomme les tokens (boutons, chips, cartes identité/northstar, liens, KPI sparklines) reflète la marque sans qu'un seul composant change.
4. **Frontières** : les tiers Reference/Component/Domain ne bougent pas ; l'or `--up-gold`, les sémantiques (success/warning/danger) et la Console restent canon UPgraders. Le theming est cockpit-only.

## Conséquences

- Motion19 sélectionnée → l'accent cockpit passe au bleu digital officiel `#3384FF` (vérifié Playwright : `--accent` calculé + captures) ; UPgraders/SPAWT sans palette → corail canon.
- Contraste : la palette est fournie par le brand book du client (l'accent « écran » est choisi pour ça) ; un garde-fou de contraste automatique (rejet des accents illisibles sur fond sombre + fallback) est tracé RESIDUAL-DEBT.
- Test : verrou (6) de `strategy-collaborator.test.ts` — les hex sortent validés, le composant re-vérifie.
- Extension naturelle (plan social suite) : logo dans le header du shell + typo de marque en préview — décision ultérieure, jamais au détriment de la lisibilité du DS.

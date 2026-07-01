# STATUS — état vivant du programme de revamp

> **Un WP = une ligne = un seul écrivain** (l'agent qui a le claim). Mettre à jour dans la même PR
> que le travail. Légende : `PENDING` · `IN_PROGRESS` · `SHIPPED` · `BLOCKED(raison)` · `DROPPED(raison)`.

## Baseline de référence (2026-07-01, `main` = `f8b4378`)

- `npm run typecheck` → **0 erreur**
- `npm run lint` → **0 erreur** (1 warning pré-existant : `xlsx-parser.ts` lafusee/no-direct-service-from-router)
- `npx vitest run tests/unit/governance` → **876/876 verts** (83 fichiers)
- `npm run audit:cycles` (madge) → **0 cycle** (1410 fichiers)
- CI GitHub : verte sauf 2 connues — Golden Path E2E (pré-existant) + check externe « Workers Builds: advertisproject » (app Cloudflare, hors repo) → WP-B10

## Flux A — big-bang v3.3 (branche `refonte/alignement-v3.3`)

| WP | Lot | Chantier | Statut | Dépend de | Branche/PR | Claim fichiers | Notes |
|---|---|---|---|---|---|---|---|
| A0 | L0 | Socle + wire-aliases + gates soft | PENDING | — | — | — | crée la branche longue |
| A1 | L1 | R1 Mestor→Sia | PENDING | A0 | — | — | XL, série |
| A2 | L1 | R2 Artemis→Neith | PENDING | A1 | — | — | XL, série, garde R2.3 |
| A3 | L1 | R3 Tarsis→Shaï | PENDING | A2 | — | — | série |
| A4 | L1 | R5 Jehuty⊂Notoria + Per-Ankh | PENDING | A3 | — | — | fusion non mécanique |
| A5 | L1 | R7 ZOMBIE→LATENT | PENDING | A4 | — | — | avant E2 |
| A6 | L1 | R8 financial-brain→thot/ | PENDING | A5 | — | — | ferme #19 |
| A7 | L1 | R4 Hunter→Wepwawet (docs) | PENDING | A0 | — | — | parallélisable |
| A8 | L1 | R6 Yggdrasil→Arbre+Sève (docs) | PENDING | A0 | — | — | parallélisable |
| A9 | L2 | E1 PilotingRegime | PENDING | A1 (+DEC-2 draft ok) | — | — | review requise |
| A10 | L2 | E2 scoring-engine 8-dim | PENDING | A5, A9 | — | — | ferme #15 · review requise |
| A11 | L2 | E3 zone-indices + Thot formula | PENDING | A6, A10 | — | — | ferme #18 (avec A17) · review requise |
| A12 | L3 | C1 EFR + Constat + ICP | PENDING | A9, A10 | — | — | #22 |
| A13 | L3 | C2 données & souveraineté | PENDING | A0 (+DEC-9) | — | — | #23 |
| A14 | L3 | C3 activation J0→J7 | PENDING | A9 | — | — | #22 |
| A15 | L3 | C4 SLA par livrable | PENDING | A12 | — | — | #22 |
| A16 | L3 | C5 amendement ADVE durci | PENDING | A12, A15 | — | — | #22 · amende ADR-0023 |
| A17 | L3 | C6 pricing localisé | PENDING | A11 | — | — | #18 |
| A18 | L3 | C7 KPIs agence + méta-EFR | PENDING | A12, A10 | — | — | #24 |
| A19 | L3 | C8 brownfield multi-marques | PENDING | A14, A9, A10 | — | — | #24 |
| A20 | L3 | C9 PI & contrat-type | PENDING | A12, A13, A16 | — | — | #23 |
| A21 | L4 | Stabilisation + merge vers main | PENDING | tout flux A | — | — | review opérateur OBLIGATOIRE |

## Flux B — main-flow

| WP | Quoi | Statut | Branche/PR | Claim | Notes |
|---|---|---|---|---|---|
| B1 | Réconciliation ledgers + CLAUDE.md phases 0104-0120 | PENDING | — | — | à faire en premier |
| B2 | Phase 17 closure (cible #6) | PENDING | — | — | échéances dépassées |
| B3 | Oracle staleness + forgetSection | PENDING | — | — | heal sonde #1 |
| B4 | Ptah forge DISPATCHED + DAG | PENDING | — | — | **fenêtre : avant A1 ou après A21** |
| B5 | Notification stack production (cible #2) | PENDING | — | — | |
| B6 | DS couleurs brutes → tokens + strict | PENDING | — | — | rebase-aware |
| B7 | Hygiène json-parse / console-log | PENDING | — | — | 2 batchs |
| B8 | LLM hardening LOTs 3/4 | PENDING | — | — | |
| B9 | Fix intake completionLevel + stepper | PENDING | — | — | |
| B10 | CI vérité (Golden Path, Workers check, a11y 7.8) | PENDING | — | — | Workers = action opérateur |

## Flux C — décisions opérateur

| DEC | Question (résumé) | Statut | Réponse |
|---|---|---|---|
| DEC-1 | Ratifier cibles #20-24 | POSÉE (PR programme) | — |
| DEC-2 | Labels 5 crans RegimeCran + axes | OUVERTE | — |
| DEC-3 | Seuils calibration → promotions PRODUCTION | OUVERTE | — |
| DEC-4 | Trigger Argos/Per-Ankh (Phase 22) | OUVERTE | — |
| DEC-5 | Hébergement souverain + sources indices + credentials | OUVERTE | — |
| DEC-6 | Mutations legacy : plan vs WONT_DO | OUVERTE | — |
| DEC-7 | Trigger i18n contenu | OUVERTE | — |
| DEC-8 | Résidus Phase 18 (formulaire) | AU FIL DE L'EAU | — |
| DEC-9 | Défaut `Operator.dataRegion` | OUVERTE | — |

## Rouges attendus (branche refonte uniquement)

> Vide au démarrage. Tout WP flux A qui laisse un test rouge le liste ici avec le WP résorbeur.
> Cette section DOIT être vide à la clôture de A21.

| Test | Rouge depuis (WP) | Résorbé par (WP) |
|---|---|---|
| — | — | — |

---

*Créé 2026-07-01 par la session fondatrice (ADR-0121). WP-0 (le programme lui-même) : SHIPPED via la PR porteuse.*

<!--
  PR template — La Fusée governance.
  Le CI exige UN label avant merge :
  - phase/0 ... phase/9 (refonte structurelle)  OU
  - out-of-scope         (cleanup hors-périmètre — ajouter section "Justification — out-of-scope")
  Cf. docs/governance/REFACTOR-CODE-OF-CONDUCT.md §1.
-->

## Intent

<!-- 1-3 phrases : pourquoi ce changement, quel problème ça résout. -->

## Changes

<!-- Liste concise. Lien vers ADR si décision structurelle. -->

## Phase / Scope

<!-- Cocher UNE ligne : -->
- [ ] phase/0  — refonte governance / outillage
- [ ] phase/1  — pillars + intent kinds
- [ ] phase/2  — manifests + pre/post conditions
- [ ] phase/3  — Mestor router + governed procedures
- [ ] phase/4  — Seshat telemetry
- [ ] phase/5  — Thot fuel + cost gate
- [ ] phase/6  — UI + portail Console
- [ ] phase/7  — Cockpit founders
- [ ] phase/8  — Glory tools + sequences
- [ ] phase/9  — Ptah Forge sub-phases A→K
- [ ] out-of-scope (ajouter section "Justification — out-of-scope" ci-dessous)

## Justification — out-of-scope

<!-- Obligatoire si label `out-of-scope`. Sinon supprimer cette section. -->

## Test plan

- [ ] ...

## Pre-merge checklist (NEFER protocole 8 phases)

- [ ] Phase 0 — `git log` + 7 sources de vérité chargées
- [ ] Phase 2 — `grep CODE-MAP.md` négatif (pas de doublon entité)
- [ ] Phase 5 — typecheck + lint + tests verts en local
- [ ] Phase 6 — CHANGELOG.md + ADR mis à jour si décision structurelle
- [ ] Commits respectent Conventional Commits (`type(scope): subject`, body lines ≤100 chars)
- [ ] PR a un label `phase/N` ou `out-of-scope` (le CI bloque sinon)

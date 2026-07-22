# ADR-0174 — Intégrité des arêtes de référence inter-piliers

- **Status** : Accepted
- **Date** : 2026-07-22
- **Phase** : Chantier « La Fusée compile » — Lot 3, suite de l'audit d'intégrité ADVE
- **Depends on** : ADR-0171 (socle produit + rule 31), ADR-0088 (backbone structuré, FK entityId)
- **Supersedes** : —

## Contexte

`entityId = z.string().uuid()` type les FK du backbone, mais **rien ne validait qu'une référence RÉSOUD
vers sa cible**. L'audit ADVE 2026-07-22 a confirmé des dangles LIVE en base seedée : `V.personaSegmentMap.personaName`
et `E.superfanPortrait.personaRef` pointant sur des personas inexistants ; une arête **impossible par
construction** (`S.strategieDeplacement.riskId` → `R.overtonBlockers[].id`, mais `overtonBlockers` sans `id`).
Rule 31 (ADR-0171) validait déjà les arêtes PRODUIT — 1/23 fermée.

## Décision

- **`src/domain/pillar-reference-edges.ts`** (`findDanglingReferences`, Layer-0 pur, zéro LLM) généralise le
  motif `danglingProductRefs` aux autres arêtes : **liens par nom** (personaSegmentMap / superfanPortrait →
  `D.personas[].name`, matching tolérant accents/casse) + **FK UUID** du backbone (`I.mitigatesRiskIds` →
  `R.probabilityImpactMatrix[].id`, `I.targetsPersonaIds` → `D.personas[].id`, `I.hypothesisId` →
  `T.hypothesisValidation[].id`, `S.selectedFromI/rejectedFromI.sourceInitiativeId` → `I.actions[].id`,
  `S.strategieDeplacement.riskId` → `R.overtonBlockers[].id`).
- **Résolution tolérante par chaîne** : un id lisible (`risk-m19-001`) résout aussi bien qu'un UUID tant que
  source et cible partagent la chaîne (cohérent avec la persistance brute ADR-0172).
- **Garde pool-vide** : une arête FK n'est jugée que si la cible existe (pas de faux positif quand les ids
  ne sont pas encore backfillés) ; un lien par NOM non résolu EST un dangle.
- **`OvertonBlockerSchema` gagne `id: entityId.optional()`** (additif) → l'arête S→R devient résoluble.
- **Cross-validator rule 32** consomme `findDanglingReferences` (DÉTECTION seulement — le cross-validator est
  du scoring, jamais bloquant).

## Conséquences

- Les 22 arêtes restantes sont **validées** (détection de dangle). Vérifié E2E sur motion19 : rule 32 =
  INVALID, 5 dangles réels surfacés (4 `personaSegmentMap.personaName` + 1 `superfanPortrait.personaRef`) —
  motion19 porte **deux taxonomies de persona** (`D.personas` Brand Book §04 vs le segment/superfan) : c'est
  une inconsistance de DONNÉE canon, désormais VISIBLE dans le score (réconciliation = décision opérateur,
  tracée RESIDUAL-DEBT — on n'invente pas le mapping, interdit n°3).
- **Tests** : `pillar-reference-edges` (8). tsc 0 · lint 0 · gouvernance verte.
- **0 modèle Prisma**, **0 migration** (id additif optionnel sur un objet JSON), **0 LLM**, cap 7/7.

## Lectures associées

- ADR-0171 (rule 31 produit), ADR-0088 (backbone FK), ADR-0172 (persistance brute — pourquoi le matching
  par chaîne), audit ADVE 2026-07-22 §3a.

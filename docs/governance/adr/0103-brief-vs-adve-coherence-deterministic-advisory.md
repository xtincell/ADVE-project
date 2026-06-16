# ADR-0103 — Gate `BRIEF_VS_ADVE_COHERENCE` : advisory déterministe (C6)

**Status** : Accepted
**Date** : 2026-06-16
**Phase** : galileo / « Fusée non-dépendante du LLM »
**Depends on** : ADR-0049 (Brief Mandatory Gate — couche présence), ADR-0023 (OPERATOR_AMEND_PILLAR), ADR-0060 (parité manuelle), ADR-0084 (Layer 5)
**Supersedes** : le scaffold Phase 23 Story 1.8 (`NotYetImplementedError`)
**Enforced by** : `tests/unit/governance/brief-vs-adve-coherence.test.ts`

## Contexte

Le trou **C6** ([PROPAGATION-MAP §6b](../PROPAGATION-MAP.md)) : le gate
`BRIEF_VS_ADVE_COHERENCE` était un **scaffold** (Phase 23 Story 1.8) qui levait
`NotYetImplementedError`, enregistré dans `mestorGates` mais **jamais appelé**.
Conséquence : un brief de production pouvait être matérialisé sans aucune
vérification de cohérence avec le noyau ADVE de la marque (blueprint §21.2 D-3.1,
marqué CRITIQUE). L'enforcement était déféré à Phase 24 closure-target #14.

## Décision

**Poser C6 maintenant comme gate advisory déterministe**, sans attendre Phase 24.

### Cœur déterministe (zéro LLM, LOI 9)

`computeBriefAdveCoherence` (`gates/brief-adve-coherence-score.ts`) — fonction
**pure** : tokenise brief + noyau ADVE (a/d/v/e aplati), mesure le **rappel du
brief dans l'ADVE** (fraction des tokens significatifs du brief présents dans le
vocabulaire ADVE), variance = 0. Bandes : `NOT_APPLICABLE` (ADVE trop maigre ou
brief trop court), `COHERENT` (recouvrement ≥ seuil), `DIVERGENT` (vocabulaire
quasi-disjoint). Cohérent avec la doctrine « Fusée non-dépendante du LLM ».

### Verdict advisory (non bloquant)

Le gate (`gates/brief-vs-adve-coherence.ts`) charge l'ADVE, calcule, renvoie :
- `PASS` — cohérent ou NOT_APPLICABLE ou erreur DB (fail-safe).
- `WARN` — divergence flagrante. **Ne bloque pas** le dispatch.

Câblé en pre-flight `emitIntent` sur `PTAH_MATERIALIZE_BRIEF` (la frontière
production — un brief sur le point d'être forgé en asset concret). Le WARN est
surfacé sur le nouveau champ `IntentResult.warnings` (non-breaking) — l'opérateur
voit la divergence et amende le brief / l'ADVE, ou procède « à mes risques »
(parité manuelle ADR-0060 : le WARN n'est jamais silencieux, jamais bloquant).

### Pourquoi advisory et pas `BLOCK`

Un recouvrement de vocabulaire est un heuristique **fragile** (synonymes, langue,
brief plus détaillé que le noyau). Hard-bloquer la forge dessus produirait des
faux positifs qui cassent le pipeline. Le `BLOCK` dur + l'UI override manuel +
le wiring des entrées A2 (brief-ingest) / A7 (morning-batch) restent l'escalade
**Phase 24 closure-target #14** — éventuellement LLM-assistée derrière une parité
manuelle. L'advisory déterministe est l'incrément **sûr, utile et complet** qui
ferme C6 sans risque pipeline.

## Conséquences

- `gates/brief-adve-coherence-score.ts` (nouveau, pur) + `gates/brief-vs-adve-coherence.ts`
  (throw → impl réelle ; `NotYetImplementedError` retiré).
- `IntentResult.warnings?: string[]` (nouveau champ non-breaking) + pre-flight
  `preflightBriefVsAdveCoherence` dans `emitIntent`.
- Test scaffold remplacé par un test de comportement (helper pur + verdicts).
- PROPAGATION-MAP C6 → 🟡 (advisory posé ; BLOCK + A2/A7 + UI = Phase 24).
- Cap APOGEE 7/7 préservé (sous-domaine Mestor governance).

## Lectures associées

- [PROPAGATION-MAP §6b C6](../PROPAGATION-MAP.md)
- [ADR-0049](0049-brief-mandatory-gate.md) — couche présence
- [ADR-0060](0060-llm-as-ui-orchestrator-manual-first.md) — parité manuelle
- closure-roadmap target #14 — enforcement Phase 24

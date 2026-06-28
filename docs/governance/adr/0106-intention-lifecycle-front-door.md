# ADR-0106 — `Intention` : porte d'entrée du cycle de vie (intention × ADVE → brief validé)

**Status** : Accepted
**Date** : 2026-06-28
**Phase** : 24 — câblage du cycle de vie (closure-target front-door)
**Depends on** : ADR-0023 (OPERATOR_AMEND_PILLAR), ADR-0060 (parité manuelle), ADR-0067 (sortie LLM gardée), ADR-0103 (gate cohérence C6), ADR-0085 (cascade STOP à Jehuty)
**Enforced by** : `tests/unit/services/intention/intention.test.ts`

## Contexte

L'analyse de cycle de vie (`docs/governance/lifecycle-gap-analysis-wrap-croustillant.md`)
a identifié **deux trous P0** : (①) aucune entité de premier rang capte une
**intention net-new** d'une marque (lancer un produit, repositionner, entrer sur
un marché), et (②) aucun Intent ne **croise l'intention × l'ADVE réel** pour
produire un **brief validé**. Les flux existants (`actions.propose`,
Morning Batch, QuickIntake) sont éclatés et orientés action/onboarding, pas
intention. Résultat : l'opérateur improvise (crée une campagne à la main).

C'est pourtant **le point d'entrée n°1 de la valeur** (PROPAGATION-MAP) et la
**seule porte LLM légitime** du cycle : en amont, le LLM croise une envie avec la
réalité de marque ; en aval, tout est projection déterministe de l'ADVE.

## Décision

Nouvelle entité `Intention` + 3 Intents gouvernés (union `emitIntent` → Artemis
commandant) :

1. **`CAPTURE_INTENTION`** — création déterministe (status `CAPTURED`). Zéro LLM.
2. **`GENERATE_BRIEF_FROM_INTENTION`** — croise l'intention × le noyau ADVE
   (chargé par pilier, RAG déterministe) → **brief candidat** :
   - **mode LLM** : `executeStructuredLLMCall` (sortie gardée par `IntentionBriefSchema`,
     entrée neutralisée `wrapUntrusted`/`UNTRUSTED_NOTICE` — OWASP LLM01) ;
     passe par le gateway → **police de débit par modèle** (owl-alpha) respectée ;
   - **mode MANUAL** (parité ADR-0060) : l'opérateur fournit le brief, validé au
     même schéma — 100 % déterministe ;
   - **dégradation `DEFERRED`** sans provider — jamais de hard-fail ; l'intention
     reste `CAPTURED` ;
   - **gate cohérence C6** déterministe (`computeBriefAdveCoherence`) snapshotté.
3. **`VALIDATE_INTENTION_BRIEF`** — flip `BRIEF_VALIDATED` ; un brief **DIVERGENT**
   de l'ADVE exige un **override explicite** (« à mes risques et périls »). Le brief
   validé est alors canonique et alimente le pipeline déterministe aval
   (action → campagne → projets, déjà en place).

Modèle Prisma `Intention` (additif, migration `20260628120000_phase24_intention_front_door`) :
`{ strategyId, type (IntentionType), title, description, status (IntentionStatus),
operatorId?, briefMode?, coherence?, generatedBriefId?, briefDraft? }`. **0 hardcode** :
le brief est une **projection de l'ADVE** (mode manuel) ou un **croisement LLM×ADVE**
(mode IA), jamais un gabarit en dur.

## Conséquences

- **Cycle de vie bouclé en amont** : envie → croisement ADVE → brief validé → projets.
- **Écriture ADVE reste manuelle** (STOP à Jehuty, ADR-0085) : l'intention et son
  brief sont en **aval** de l'ADVE (`pillarsAffected = []`) ; ils n'altèrent aucun
  pilier. La boucle retour (résultat → proposition ADVE) reste un chantier distinct
  (trou #8 du gap-analysis).
- **Manual-first parity** structurelle (mode MANUAL ≡ mode LLM côté schéma + gate).
- **Cap APOGEE 7/7 préservé** — sous-domaine d'Artemis (propulsion / brief), pas de
  nouveau Neter, pas de capability manifest (dispatch générique commandant).

## Hors-scope (résidus, cf. gap-analysis)

UI cockpit de l'intention (formulaire + revue de brief candidat), RAG unifié
(`fetchBrandContext`), durcissement `BriefStatus` global en machine à états, et la
boucle retour résultat→ADVE. Tracés dans `lifecycle-gap-analysis-wrap-croustillant.md`.

# ADR-0139 — Séquences 91/94 DRAFT : diagnostic définitif + refus honnête de la promotion de masse

- **Status** : Accepted
- **Date** : 2026-07-13 (soir)
- **Phase** : suite de l'audit [BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13](../../audits/BRIEF-ORACLE-SCORING-PIVOT-AUDIT-2026-07-13.md) — bloc E (dernier bloc du mandat carte blanche)
- **Depends on** : ADR-0042 (lifecycle versioning DRAFT/STABLE/DEPRECATED), ADR-0066 (module auto-promotion), ADR-0091 (composers Oracle déterministes), ADR-0126 (anti-inflation honnête de l'évidence)
- **Supersedes** : —

## Contexte

L'audit (T14) a relevé que **91 séquences sur 94 sont `lifecycle: "DRAFT"`** (dont les 24 wrappers `WRAP-FW-*`), ~2 mois après l'échéance de promotion D+30 (ADR-0039/0041) ; seules 3 sont STABLE. Le registre RESIDUAL-DEBT posait la question : « pourquoi l'auto-promotion (ADR-0066) ne promeut pas (barre qualité ? cron ?) puis promouvoir par lots stress-testés. »

Bloc E a instruit la question à fond. Réponse définitive : **trois causes empilées**, et une réalité fonctionnelle qui change la conclusion.

### Cause n°1 (déterminante) — le handler de promotion est un STUB qui ne persiste rien

`promoteSequenceLifecycle` (`src/server/services/artemis/commandant.ts`) valide la transition, recalcule le `promptHash`, et **consigne l'événement dans `IntentEmission`** — mais **ne persiste PAS le `lifecycle`**. Son propre en-tête le dit (commandant.ts §1146-1151) :

> « ce handler est un STUB qui logge la transition dans IntentEmission. La persistence du `lifecycle` + `promptHash` côté GlorySequenceDef requiert un store DB dédié (table `SequenceLifecycleState`) — Chantier D-bis. Pour l'instant […] le anti-drift CI lit `seq.lifecycle` directement depuis le code (sequences.ts). »

Or `listDraftSequences` (`auto-promotion/metrics.ts:142`) **et** `getStaticLifecycle` (`eligibility.ts` + `metrics.ts`) lisent tous deux `ALL_SEQUENCES` — **la constante de code**. Conséquence : même une exécution live parfaite, sur une séquence remplissant tous les critères, **ne déplacerait aucune des 91** ; le compte est mesuré depuis le code, que l'Intent d'audit ne peut pas muter. La seule façon de faire passer une séquence DRAFT→STABLE aujourd'hui est **d'éditer `sequences.ts`** (poser `lifecycle: "STABLE"` + coller le `promptHash`).

### Cause n°2 (secondaire, rendue caduque par la n°1) — le cron tourne en dry-run

`/api/cron/auto-promotion` (`route.ts:22`) est en `dryRun` sauf si `AUTO_PROMOTION_LIVE === "true"` (jamais posé en prod) ou header admin `x-auto-promotion-mode: live`. Le cron n'émet donc jamais. Sans objet vu la cause n°1 : même live, il ne persisterait rien.

### Cause n°3 (par conception, correcte) — la barre d'éligibilité refuse l'inexercé

`evaluateSequencePromotion` exige `age ≥ 30j` **ET** `totalExecutions ≥ 50` **ET** `recentQualityPassRate === 1.0` sur 7 j. La plupart des 91 DRAFT ne sont **jamais exécutées** — les composers déterministes (ADR-0091) sont devenus le chemin runtime de l'Oracle §22-35, remplaçant les séquences. Elles resteraient donc `WAIT` (barre exécutions) même si les causes n°1/n°2 étaient levées. **C'est le comportement voulu** : on ne certifie pas STABLE du code non exercé.

### Réalité fonctionnelle — DRAFT n'est PAS un défaut

`hasPromptDrifted` (`sequence-hash.ts:65`) : `if (seq.lifecycle !== "STABLE") return false;`. C'est **la seule** consommation runtime du lifecycle. Une séquence DRAFT **s'exécute exactement comme une STABLE** ; STABLE ajoute uniquement le **gel du prompt** (drift = CI fail, `sequence-prompt-drift.test.ts`). DRAFT = « prompt pas encore gelé » — l'état **correct** d'une séquence non encore stress-testée. Le « 91/94 DRAFT » ne décrit donc aucune dégradation fonctionnelle.

## Décision

1. **Pas de promotion de masse.** Éditer 91× `lifecycle: "STABLE"` à la main gèlerait les prompts de séquences jamais exercées et les **certifierait faussement « stress-testées »** — exactement l'inflation malhonnête que NEFER refuse (même posture que le refus T9 du câblage TARSIS, ADR-0137). Refusé.

2. **Ne pas construire le store `SequenceLifecycleState` (Chantier D-bis) maintenant.** Ce serait de l'échafaudage pour un chemin que l'architecture a dépassé (ADR-0091) — et, la cause n°3 tenant, il **promouvrait quand même zéro** séquence aujourd'hui. Aucun consommateur ne le réclame. Déféré tant qu'aucune séquence n'est réellement adoptée comme chemin runtime exercé.

3. **Corriger le seul défaut d'honnêteté réel : le stub ne doit plus rapporter une promotion fantôme.** Le handler retournait `status: "OK"` + `summary: "Sequence X DRAFT → STABLE"` — sur un run live, `actions.ts` le comptait dans `totalPromoted`, mentant sur un changement d'état inexistant. Correctif chirurgical (rayon zéro) :
   - le handler surface `persisted: false` + `persistenceNote` dans son `output`, et son `summary` dit « émission d'audit enregistrée (lifecycle non persisté) » ;
   - `promoteSequence` (`auto-promotion/actions.ts`) lit `output.persisted` : tant qu'il est `!== true`, la décision est **`SKIP`** (pas `PROMOTE`), avec une raison explicite. `totalPromoted` reste donc **honnêtement 0**. Le contrat `persisted: true → PROMOTE` est posé pour le futur Chantier D-bis.
   - `status: "OK"` est conservé : l'**émission** a bien réussi (audit trail écrit) — c'est un énoncé vrai ; seule la persistance manque, et elle est désormais dite.

4. **Voie opératoire honnête** pour la séquence rare qui *serait* réellement exercée (≥ 50 runs, 100 % qualité) : édition gouvernée de `sequences.ts` (lifecycle + promptHash), en revue. Aucune automatisation ne doit forcer ce gel.

## Conséquences

- **T14 requalifié « diagnostiqué — pas d'action »** au registre (RESIDUAL-DEBT), sur le modèle du refus honnête T9. Le « promouvoir par lots » d'origine est retiré : il reposait sur une prémisse fausse (que l'auto-promotion peut déplacer le compte).
- L'audit trail ne ment plus : un run auto-promotion rapporte `totalPromoted: 0` tant que rien n'est persisté (au lieu d'un chiffre fantôme).
- Test anti-drift neuf `auto-promotion-stub-honesty.test.ts` (5 assertions) : verrouille `persisted:false → SKIP`, `dry-run → PROMOTE simulé sans émettre`, `persisted:true → PROMOTE`, `FAILED → SKIP`, `non éligible → WAIT sans émission`.
- **0 modèle, 0 Intent kind, 0 LLM, cap APOGEE 7/7 préservé.** Les seuils d'éligibilité (50 exec / 1.0 / 1 %) et le mode SOFT par défaut sont **intouchés** (test `auto-promotion.test.ts` inchangé, vert).

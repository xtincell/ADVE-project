# ADR-0039 — Cascade RTIS : voie canonique et alignement gouvernance

**Status** : Accepted (partial — voir §6 Open work)
**Date** : 2026-05-04
**Phase** : 16
**Supersedes** : aucun
**Related** : [ADR-0023](0023-operator-amend-pillar.md) (RTIS dérivé via Intents), [PANTHEON.md](../PANTHEON.md), [NEFER.md](../NEFER.md) §3

> **Note de numérotation** : initialement numéroté ADR-0038 dans la branche
> locale, renuméroté en ADR-0039 pour cette PR car ADR-0038 a été pris en
> amont par "APOGEE anti-drift Phase 16-bis" sur main. Aucune autre
> modification de fond entre les deux numérotations.

---

## Contexte

Audit gouvernance NEFER Phase 0.2 sur le flow ADVE → RTIS → Oracle (cœur du framework) a révélé 4 brèches :

1. **`pillar.cockpitPrepareForArtemis` était `auditedProtected`** — bypass `mestor.emitIntent`. Audit log uniquement, pas d'IntentEmission canonique, pas de Thot cost-gate, pas de pre-condition systématique.
2. **`pillar.cascadeRTIS` `governedProcedure(RUN_RTIS_CASCADE)` sans `preconditions` explicites** — appelable même quand ADVE est INTAKE → LLM hallucine sur `serializePillar({})` = `"{}"`.
3. **`runRTISCascade` runner appelle `actualizePillar` direct** au lieu d'émettre les 4 Intent kinds canoniques (`ENRICH_R_FROM_ADVE`, `ENRICH_T_FROM_ADVE_R_SESHAT`, `GENERATE_I_ACTIONS`, `SYNTHESIZE_S`). Les kinds existent dans `intent-kinds.ts` mais ne sont **jamais émis** par le mainline. Le meta-Intent `RUN_RTIS_CASCADE` masque les sous-étapes.
4. **Drift parallèle** : deux modules cascade existent — [`mestor/rtis-cascade.ts`](../../../src/server/services/mestor/rtis-cascade.ts) (approche Mestor `actualizePillar`) et [`rtis-protocols/index.ts`](../../../src/server/services/rtis-protocols/index.ts) (approche essaim `executeProtocoleR/T/I/S`). Pas d'ADR canon.

**Brèches 1 et 2 sont fixées dans ce sprint.** Brèche 3 nécessite un alignement comportemental préalable (commandant handlers `enrichI/S` ne fillent pas pillar.I/S le même format que `actualizePillar`). Brèche 4 est documentée ci-dessous.

## Décision

### §1 — `cockpitPrepareForArtemis` est gouvernée via `governedProcedure({ kind: "FILL_ADVE" })`

`auditedProtected` est remplacé. Le wrap `governedProcedure` ajoute :
- `preEmitIntent` → IntentEmission row créée AVANT le handler
- Évaluation Thot cost-gate sur la capacité (FILL_ADVE p95 25 s, cost p95 $0.25)
- `postEmitIntent` avec status OK / DOWNGRADED / VETOED / FAILED
- Hash-chain audit trail

**L'implémentation ne change pas** — `fillStrategyToStage(strategyId, "ENRICHED", ["a","d","v","e"])` reste la fonction métier. governedProcedure est un middleware qui run `next({ ctx: childCtx })` sur le mutation handler existant. Pas de routage automatique vers `commandant.fillAdve` (qui suit une logique Notoria-recos différente).

### §2 — `cascadeRTIS` exige `preconditions: ["RTIS_CASCADE"]`

Le gate `RTIS_CASCADE` ([pillar-readiness.ts:194](../../../src/server/governance/pillar-readiness.ts:194)) check chaque pilier ADVE : `(stage === "ENRICHED" || stage === "COMPLETE") && !stale`. La cascade est désormais refusée upfront via `assertReadyFor(strategyId, "RTIS_CASCADE")` si ADVE n'est pas mûr — pas de LLM gaspillé, ORACLE-101 explicite avec blockers.

### §3 — Module canon : `mestor/rtis-cascade.ts`

Statement canonical : **`mestor/rtis-cascade.ts:runRTISCascade`** est la voie canonique de la cascade RTIS. Surface d'entrée : `pillar.cascadeRTIS` tRPC procedure (Intent kind `RUN_RTIS_CASCADE`).

`rtis-protocols/index.ts` (approche essaim `executeProtocoleR/T/I/S`) **est conservé** comme implémentation alternative pour les protocoles spécialisés Risk/Track/Innovation/Strategy. **Il n'est PAS appelé depuis le hot-path Cockpit/Oracle.** Si un sprint futur veut consolider, ADR séparé.

Anti-drift : `audit-rtis-cascade-paths.ts` (script à créer) vérifie que `rtis-protocols.executeRTISCascade` n'est pas appelé hors `console/lab/*` ou tests.

### §4 — Idempotence guard `skipIfReady`

`runRTISCascade(strategyId, { skipIfReady: true })` short-circuit en 0 ms si tous les RTIS pillars sont au stage ENRICHED+ et !stale. Évite re-LLM coûteux quand la cascade a déjà tourné. Utilisé par :
- `pillar.cascadeRTIS` tRPC (via input `skipIfReady`)
- `enrichOracle` fallback (`runRtisCascadeOrThrow` → `skipIfReady: true`)
- `<RtisCascadeModal>` UI (default `skipIfReady: true`, override `false` via bouton "Réessayer")

### §5 — Modal UX cohérence

Le bouton "Lancer Artemis" sur `/cockpit/brand/proposition` est **rouge** si `!adveAllComplete || !rtisReady`, **vert** ssi `oracleReadyToCompile = adveAllComplete && rtisReady`. Trois états :

1. ADVE non mûr → ouvre `<ArtemisLaunchModal>` (DIAGNOSE → "Préparer automatiquement" via `cockpitPrepareForArtemis` gouverné FILL_ADVE)
2. ADVE OK + RTIS non mûr → ouvre `<RtisCascadeModal>` (CONFIRM → RUNNING → DONE/FAILED via `cascadeRTIS` gouverné RUN_RTIS_CASCADE)
3. Tout mûr → ouvre `<ArtemisLaunchModal>` direct READY → `enrichOracle` gouverné ENRICH_ORACLE

## §6 — Open work (Brèche 3 : 4 Intent kinds canoniques)

**Statut** : non implémenté dans ce sprint. Documenté pour prochain sprint.

ADR-0023 dit : *"RTIS DYNAMIQUES, dérivés cascade depuis ADVE. Recalculés via Intent existants (`ENRICH_R_FROM_ADVE`, `ENRICH_T_FROM_ADVE_R_SESHAT`, `GENERATE_I_ACTIONS`, `SYNTHESIZE_S`)."*

Aujourd'hui :
- `runRTISCascade` appelle `actualizePillar` direct → fills pillar content via LLM
- `commandant.enrichR/T` délèguent aussi à `actualizePillar` (cohérent)
- `commandant.generateIActions` délègue à `notoria.generateBatch("I_GENERATION")` + extraction BrandAction (**comportement différent**)
- `commandant.synthesizeS` délègue à `notoria.generateBatch("S_SYNTHESIS")` (**comportement différent**)

Si on refactor `runRTISCascade` pour émettre les 4 Intent kinds via `mestor.emitIntent`, les piliers I et S ne sont **plus filed via LLM dump JSON** — ils sont filed via Notoria recos / BrandAction extraction. Ce n'est pas un bug, c'est un changement architectural à valider.

**Conditions de réalisation** :
1. Tests parité : créer `tests/integration/rtis-cascade-parity.test.ts` qui vérifie que `actualizePillar(I)` et `commandant.generateIActions(strategyId)` produisent un `pillar.content.I` équivalent (clés couvertes, completion ≥ ENRICHED).
2. Si parité confirmée → refactor `runRTISCascade` pour émettre les 4 Intent kinds. Effet : 4 IntentEmission per cascade (audit hash-chain enrichi), Thot pre-flight per-Intent, SLO individuel respecté (ENRICH_R p95 ≠ GENERATE_I p95).
3. Si parité non confirmée → ADR séparé qui aligne `commandant.generateIActions/synthesizeS` sur le comportement `actualizePillar(I/S)`.

**Estimation** : 1-2 jours. Hors scope sprint Phase 16 UX.

## Conséquences

### Positives

- ADVE preparation tracée dans IntentEmission canonique (gouvernance §1)
- Cascade RTIS refusée upfront si ADVE pas mûr — pas de LLM gaspillé sur contenu vide (§2)
- Deux modules cascade clarifiés — `mestor/rtis-cascade.ts` est canon (§3)
- Idempotence guard évite re-LLM redondant (§4)
- UX cohérence ADVE/RTIS/Oracle alignée sur état réel des piliers (§5)

### Négatives

- Brèche 3 (4 Intent kinds canoniques) reste ouverte — meta-Intent `RUN_RTIS_CASCADE` masque encore les sous-étapes. Pas de SLO/Thot per-Intent. Pas de replay granulaire R-only.
- Drift `mestor/rtis-cascade.ts` vs `rtis-protocols/index.ts` documenté mais pas consolidé. Script audit anti-drift à créer.

### Compatibility

- `pillar.cockpitPrepareForArtemis` change de `auditedProtected` à `governedProcedure(FILL_ADVE)`. Side-effect : `IntentEmission` row créée pour chaque appel (était audit log). Pas de breaking change côté client (input/output identiques).
- `pillar.cascadeRTIS` ajoute pre-condition `RTIS_CASCADE` — peut renvoyer `PRECONDITION_FAILED` (TRPCError code) là où elle réussissait silencieusement. Front-end doit gérer le cas (déjà géré dans `<RtisCascadeModal>` via `cascade.error` → phase FAILED).

## Ressources

- [PANTHEON.md](../PANTHEON.md) §3 — Mestor Guidance, dispatcher unique
- [APOGEE.md](../APOGEE.md) §3 Lois 1-3 (altitude, séquencement, carburant)
- [pillar-readiness.ts](../../../src/server/governance/pillar-readiness.ts) — gate `RTIS_CASCADE`
- [intent-kinds.ts](../../../src/server/governance/intent-kinds.ts) — kinds FILL_ADVE / RUN_RTIS_CASCADE / ENRICH_R/T/I/S
- [governed-procedure.ts](../../../src/server/governance/governed-procedure.ts) — middleware preEmitIntent + Thot + postEmitIntent

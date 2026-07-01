# ADR-0085 — Refresh cascade canon : Hunter → Seshat → Tarsis → Jehuty STOP, manual operator decision mandatory for ADVE write

**Status** : Accepted
**Date** : 2026-05-16
**Phase** : 23 (doc-only — codifies existing code behaviour)
**Depends on** : ADR-0023 (OPERATOR_AMEND_PILLAR unique write path for ADVE), ADR-0051 (RTIS cascade canonical path), ADR-0083 (Hunter sub-agent Seshat)
**Supersedes** : (none — formalizes verified code behaviour into doctrine canon)
**Source canon** : [STATE_FINAL_BLUEPRINT §3.3 + §11](../STATE_FINAL_BLUEPRINT.md)

## Contexte

La Fusée observe en permanence (Hunter externe, Tarsis interne, Seshat ingestion, Notoria recommandations). Sans discipline, le système dériverait toutes les marques sur chaque micro-signal — exactement le drift que la mission "industrialiser l'accumulation de superfans" interdit (une marque dont l'ADVE change tous les jours n'a pas d'identité).

Le code en place implémente déjà la discipline correcte : **aucun déclencheur automatique vers ADVE write n'existe**. Mais cette propriété n'est pas inscrite en ADR — ce qui veut dire qu'une contribution future pourrait câbler un auto-`OPERATOR_AMEND_PILLAR` depuis un Tarsis signal fort, ou depuis une Notoria Recommendation high-confidence, et personne ne saurait dire "c'est doctrinalement interdit, voici l'ADR".

STATE_FINAL_BLUEPRINT §3.3 + §11 (2026-05-16) formalise la doctrine. Cette ADR la transcrit comme contrat citable + anti-drift testable.

## Décision

### Cascade canon en deux phases

**Phase 1 — Acquisition (automatique selon tier abonnement)**

```
Hunter (📋 tracking externe, sub-agent Seshat — ADR-0083, port Phase 22)
    ↓
Seshat ✅ (ingestion + normalisation)
    ↓
Tarsis ✅ (calcule probabilités futures sur mass data — outil interne Seshat,
            distinct du connector externe "tarsis-monitoring")
    ↓
Jehuty 🟡 (éditorial : "voici l'actualité de la marque")
    ⛔ STOP — notification seulement, AUCUNE cascade auto vers ADVE
```

**Phase 2 — Délibération + Irrigation (déclenchée par humain)**

```
Opérateur lit Jehuty + décide quoi traiter (MANUEL OBLIGATOIRE)
    ↓
Notoria ✅ (proposition scorée d'amendements, confidence 0-1, applyPolicy)
    ↓
Opérateur approuve via OPERATOR_AMEND_PILLAR (ADR-0023)
    ↓
T pillar (Track, le plus proche du marché) updated
    ├─ VERS LE BAS : T → R → rétro-feedback ADVE
    │   (la marque se réaligne sur le réel observé via AMEND manuel)
    └─ VERS LE HAUT : T → I (actions candidates) → S (stratégie synthétisée)
```

### Trois interdits absolus

1. **No auto-trigger from Tarsis → ADVE.** Même sur signal fort (anomalie sectorielle majeure détectée), Tarsis émet `NspEvent` + met à jour les tables internes de probabilités ; il n'émet **jamais** `OPERATOR_AMEND_PILLAR`. La décision reste opérateur.
2. **No auto-trigger from Notoria → ADVE.** Notoria propose (Recommendation rows status PENDING avec confidence score + applyPolicy `auto`/`suggest`/`requires_review`). Même `applyPolicy: "auto"` n'écrit pas ADVE sans confirmation opérateur ; le flag indique seulement la qualité de la suggestion. La décision reste opérateur.
3. **No skip of Jehuty notification queue.** Chaque cycle d'acquisition Phase 1 produit un Jehuty editorial digest. L'opérateur lit ce digest, puis choisit ce qu'il escalade vers Notoria. Aucun chemin court-circuit Jehuty.

### Fréquences Phase 1 par tier abonnement

| Tier | Fréquence acquisition |
|---|---|
| Free Intake | sur demande uniquement |
| Embarquement (FRAGILE) | mensuelle |
| Starter (ORDINAIRE) | mensuelle |
| Pro (FORTE) | journalière |
| Group (CULTE) | journalière + sur demande |
| Enterprise (ICONE) | journalière + sur demande |
| **Console UPgraders + agences filles** | **horaire** (réservé operator) |

Plus **triggers événementiels override** qui court-circuitent le calendrier de tier :

- Tarsis détecte anomalie majeure (seuil dépassé)
- Marque vient d'amender ADVE → recalcul T immédiat
- Marque lance campagne → instrumentation déclenche refresh
- Hunter capte un dossier nouveau mentionnant la marque
- Concurrent direct détecté en action majeure
- Réglementation/loi sectorielle bouge

### Code state vérifié 2026-05-16

✅ **Aucun déclencheur automatique trouvé** dans audit exhaustif :

- Les 4 Intent kinds RTIS (`ENRICH_R_FROM_ADVE`, `ENRICH_T_FROM_ADVE_R_SESHAT`, `GENERATE_I_ACTIONS`, `SYNTHESIZE_S`) sont routables **uniquement via `commandant.ts`** depuis décision opérateur explicite — pas depuis Tarsis, pas depuis Notoria.
- Notoria écrit `Recommendation` rows status `PENDING` ; aucune écriture directe sur `Strategy.pillars[ADVE]` même quand `confidence === 1.0` et `applyPolicy === "auto"`.
- Tarsis émet `NspEvent` (canal observation pure) ; aucun `emitIntent(OPERATOR_AMEND_PILLAR)` dans `services/seshat/tarsis/`.
- Hunter pas encore porté (📋 Phase 22), mais doctrine pré-câblée — ne devra **jamais** émettre `OPERATOR_AMEND_PILLAR` directement.

Drift D-5.2 (blueprint §21.4) **résolu au niveau doc** ; reste à shipper le test anti-drift pour empêcher la régression future.

## Conséquences

### Anti-drift test (Phase 24 candidate)

`tests/unit/governance/refresh-cascade-no-auto-write.test.ts` (HARD mode, baseline 0) à créer :

```ts
// Pseudo :
// 1. Grep tous les fichiers sous src/server/services/seshat/, services/notoria/, services/jehuty/
// 2. Assert : aucun ne contient un import OPERATOR_AMEND_PILLAR OU
//    un appel mestor.emitIntent({ kind: "OPERATOR_AMEND_PILLAR", ... })
//    OU une mutation db.strategy.update({ data: { pillars: ... } })
// 3. Si une regression apparaît, le PR est bloqué.
```

Couplé closure-target #14 (BRIEF_VS_ADVE_COHERENCE gate Phase 24) — les deux ensemble fortifient la frontière "qui peut écrire sur ADVE".

### Scheduler tier-aware (closure-target / Phase candidate)

🟡 Le scheduler générique `process-scheduler/` existe ; l'implémentation per-tenant per-tier des fréquences (mensuel / journalier / horaire) **n'est pas câblée**. Drift D-5.12 (blueprint §21.4) — chantier Phase 28 candidate selon blueprint §22.3.

📋 Le trigger bus événementiel : event `pillar.amended.cascade-due` publié, mais aucun handler `refresh-trigger` côté Seshat. Drift D-5.13.

Ces deux drifts sont **out-of-scope** de cette ADR (qui canonise la doctrine, pas l'implémentation scheduler). Tracés dans closure-roadmap Étage 3 ou Phase 28.

### Distinction critique : Tarsis interne vs `tarsis-monitoring` connector

- **Tarsis outil interne Seshat** ✅ — composants `services/seshat/tarsis/{index,signal-collector,weak-signal-analyzer,campaign-capture}.ts`. Calcul probabiliste interne sur mass data. C'est le **Tarsis** dont parle la cascade canon.
- **`tarsis-monitoring` connector externe** ✅ shipped Phase 23 Epic 2 — un connector via Credentials Vault (ADR-0079 / ADR-0021) qui *alimente* Tarsis interne en signaux. C'est une **source**, pas Tarsis.

Cette distinction est canonique blueprint §9.2 — empêche la confusion future "il y a deux Tarsis ?". Non : un seul Tarsis (l'outil interne Seshat) ; le connector est une de ses sources d'alimentation.

### Articulation avec ADR-0023 et ADR-0051

- ADR-0023 (OPERATOR_AMEND_PILLAR) — *unique voie d'écriture* sur ADVE. Cette ADR-0085 confirme : aucun autre Intent kind ne peut court-circuiter ADR-0023.
- ADR-0051 (RTIS cascade canonical path) — *direction de propagation* T→R→ADVE rétro / T→I→S forward. Cette ADR-0085 confirme : la propagation ne démarre qu'après décision opérateur explicite, pas sur signal externe.

## Lectures associées

- [STATE_FINAL_BLUEPRINT §3.3 + §11](../STATE_FINAL_BLUEPRINT.md) — source canon doctrinale
- [ADR-0023](0023-operator-amend-pillar.md) — OPERATOR_AMEND_PILLAR unique write path for ADVE
- [ADR-0051](0051-rtis-cascade-canonical-path.md) — RTIS cascade T→R/ADVE retro + T→I→S forward
- [ADR-0083](0083-argos-placement-seshat-yggdrasil-seam.md) — Hunter sub-agent Seshat (Phase 22 port)
- [PANTHEON.md §7](../PANTHEON.md) — Sub-agents (Hunter / Tarsis / Jehuty / Notoria)

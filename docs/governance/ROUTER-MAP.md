# ROUTER-MAP — Tous les routers tRPC mappés sur APOGEE

**71 routers** sous `src/server/trpc/routers/` (+ `ptah.ts` à créer Phase 9 : procédures `materializeBrief`, `getForge`, `listForges`, `getAssetVersion`). Chacun classé par **Sous-système APOGEE** + **Tier**.

Source de vérité : `ls src/server/trpc/routers/*.ts`. Mis à jour avec [APOGEE.md](APOGEE.md) §4 + [PANTHEON.md](PANTHEON.md).

**Statut governance** :
- `governed` : déjà migré sur `governedProcedure` (passe `mestor.emitIntent` + pre-conditions)
- `audited` : utilise `auditedProcedure` (strangler — log seulement, pas de pre-conditions)
- `bypass` : utilise encore `protectedProcedure`/`operatorProcedure` direct (à migrer Phase 3)
- `none` : query-only readonly (pas de governance requise pour lectures)

---

## Synthèse globale

| Sous-système | Tier | Count | Statut governance majoritaire |
|---|---|---|---|
| Propulsion | M | 13 | bypass (à migrer P3) |
| Guidance | M | 10 | mixte (3 governed, le reste bypass) |
| Telemetry | M | 14 | none (queries) ou bypass |
| Sustainment | M | 5 | bypass |
| Operations | G | 11 | bypass |
| Crew Programs | G | 11 | bypass |
| Comms | G | 2 | bypass |
| Admin | G | 5 | bypass |
| **TOTAL** | | **71** | **6 governed / 65 bypass-or-none** |

---

## 1. Propulsion (13 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `glory.ts` | Glory tools API | M | bypass |
| `campaign.ts` | Campagnes lecture/édition | M | bypass |
| `campaign-manager.ts` | Orchestration campagnes (49KB) | M | bypass |
| `mission.ts` | Missions (21KB) | M | governed (cf. plan P3) |
| `intervention.ts` | Interventions tactiques | M | bypass |
| `media-buying.ts` | Plan media + buying | M | bypass |
| `pr.ts` | RP / publications | M | bypass |
| `social.ts` | Orchestration social | M | bypass |
| `editorial.ts` | Editorial / content calendar | M | bypass |
| `publication.ts` | Publication multi-canal | M | bypass |
| `driver.ts` | Drivers d'engagement | M | bypass |
| `notoria.ts` | Pipeline production | M | governed (V5+) |
| `sequence-vault.ts` | Séquences GLORY | M | bypass |
| `deliverable-orchestrator.ts` | **Deliverable Forge tRPC** (Phase 17b, ADR-0050 — anciennement ADR-0037) — `listSupportedKinds` query, `resolveRequirements` query auditée, `compose` mutation auditée hash-chained via `mestor.emitIntent({ kind: "COMPOSE_DELIVERABLE" })` | M | governed |

---

## 2. Guidance (10 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `mestor-router.ts` | Mestor chat + Intent dispatch | M | governed |
| `pillar.ts` | Pillars CRUD (35KB — pire offender bypass) | M | bypass (priorité P3) |
| `strategy.ts` | Strategy CRUD + comparables | M | bypass (mixed governed) |
| `strategy-presentation.ts` | Oracle 21 sections | M | governed (`enrichOracle`, `enrichOracleNeteru`) |
| `framework.ts` | Frameworks Artemis | M | bypass |
| `guidelines.ts` | Brand guidelines render | M | bypass |
| `boot-sequence.ts` | Boot sequence trigger | M | bypass |
| `brand-vault.ts` | Vault brand content | M | bypass |
| `implementation-generator.ts` | Plans d'implémentation | M | bypass |
| `cohort.ts` | Cohort analysis (segmentation strat) | M | bypass |

---

## 3. Telemetry (14 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `seshat-search.ts` | Recherche sémantique cross-strategy (V5.4) | M | none (query-only) |
| `jehuty.ts` | Cross-brand intelligence feed (V5.4) | M | bypass |
| `signal.ts` | Signaux faibles | M | bypass |
| `source-insights.ts` | Insights sources | M | none |
| `attribution-router.ts` | Attribution canaux | M | bypass |
| `analytics.ts` | Analytics général | M | none |
| `cult-index.ts` | Cult index measurement | M | bypass |
| `devotion-ladder.ts` | Devotion ladder calculation | M | bypass |
| `superfan.ts` | Segments superfans | M | bypass |
| `ambassador.ts` | Ambassadeurs (segment supérieur) | M | bypass |
| `advertis-scorer.ts` | Score composite | M | bypass |
| `knowledge-graph.ts` | Knowledge graph | M | bypass |
| `market-intelligence.ts` | Intel marché | M | bypass |
| `market-study.ts` | Études marché | M | bypass |
| `error-vault.ts` | Capture/triage errors runtime + `oracleIncidents` cluster par code ORACLE-NNN (ADR-0022) | INFRA | bypass (queries) + adminProcedure |

---

## 4. Sustainment (5 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `process.ts` | Process scheduler / queue | M | bypass |
| `staleness.ts` | Staleness propagator API | M | bypass |
| `quality-review.ts` | Quality review (post-conditions) | M | bypass |
| `deliverable-tracking.ts` | Tracking livrables (SLA) | M | bypass |
| `connectors.ts` | Connectors monitoring | M | bypass |

---

## 5. Operations (11 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `client.ts` | CRM clients | G | bypass |
| `crm.ts` | CRM extended | G | bypass |
| `contract.ts` | Contrats | G | bypass |
| `commission.ts` | Commissions | G | bypass |
| `payment.ts` | Paiements | G | bypass |
| `mobile-money.ts` | Mobile money integration | G | bypass |
| `value-report.ts` | Value reports clients | G | bypass |
| `upsell.ts` | Upsell detection | G | bypass |
| `market-pricing.ts` | Pricing marché | G | bypass |
| `onboarding.ts` | Onboarding flows | G | bypass |
| `brief-ingest.ts` | PDF brief ingestion | G | bypass |

---

## 6. Crew Programs (11 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `guilde.ts` | Guild creators | G | bypass |
| `guild-tier.ts` | Tiers APPRENTI/COMPAGNON/MAÎTRE/ASSOCIÉ | G | bypass |
| `guild-org.ts` | Organisations partenaires | G | bypass |
| `club.ts` | Club ambassadeurs | G | bypass |
| `event.ts` | Events networking | G | bypass |
| `membership.ts` | Memberships | G | bypass |
| `matching.ts` | Match creator ↔ mission | G | bypass |
| `learning.ts` | Académie / learning | G | bypass |
| `boutique.ts` | Boutique formation | G | bypass |
| `quick-intake.ts` | Pipeline intake (rev 9, 30KB) | G | governed (V5+) |
| `ingestion.ts` | Ingestion data externe | G | bypass |

---

## 7. Comms (2 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `messaging.ts` | Messages cross-portail | G | bypass |
| `notification.ts` | Notifications + alerts | G | bypass |

---

## 8. Admin (5 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `auth.ts` | Authentication | G | none |
| `operator.ts` | Multi-operator admin | G | bypass |
| `system-config.ts` | System settings | G | bypass |
| `translation.ts` | i18n | G | none |
| `cockpit-router.ts` | Cockpit-specific aggregator | G | bypass |

---

## 9. Verdict — orphelins révélés

Tous les routers absorbés par les 8 sous-systèmes. Cas notables :

- **`framework.ts`** — placé en Guidance car expose les frameworks Artemis (Mestor lit pour planifier). Pourrait être en Propulsion. À arbitrer en P2 selon l'usage réel.
- **`cohort.ts`** — analyse de cohortes côté strategy. Placé en Guidance (sert à décider stratégie segmentation). Pourrait être Telemetry pure. Manifest finalise le rôle.
- **`onboarding.ts`** — placé en Operations (acquisition / retainer activation). Aurait pu aller en Crew Programs si c'était onboarding creator. Lecture du fichier → onboarding *founder* → Operations.
- **`brief-ingest.ts`** — Operations parce que c'est l'entrée commerciale (un client envoie un PDF brief), pas Guidance. Le brief INGÉRÉ devient un Intent qui touche Guidance.

---

## 10. Plan d'action governance — migration des 65 bypass

Aujourd'hui : **6 routers governed sur 71** (8.5%). Cible Phase 3 : **100% des mutations passent par `mestor.emitIntent`**.

Priorité de migration (cf. REFONTE-PLAN P3) :

### Vague 1 — Pillars + Strategy (le plus contaminé)
1. `pillar.ts` (35KB, 8 lazy imports services)
2. `strategy.ts` (incl. nouveau `comparables` à gouverner via `RANK_PEERS`)
3. `framework.ts`

### Vague 2 — Telemetry consumers V5.4
4. `jehuty.ts` (338L → `JEHUTY_FEED_REFRESH`, `JEHUTY_CURATE`)
5. `seshat-search.ts` (145L → `SEARCH_BRAND_CONTEXT`, `RANK_PEERS`)

### Vague 3 — Propulsion principale
6. `campaign.ts`, `campaign-manager.ts`, `intervention.ts`, `media-buying.ts`, `pr.ts`, `social.ts`, `editorial.ts`, `publication.ts`, `driver.ts`, `glory.ts`, `sequence-vault.ts`

### Vague 4 — Operations financière (impact business critique)
7. `payment.ts`, `mobile-money.ts`, `commission.ts`, `contract.ts`, `value-report.ts`, `upsell.ts`

### Vague 5 — Crew Programs + reste
8. Reste des routers (guilde/guild-tier/guild-org/club/event/membership/matching/learning/boutique/ingestion)
9. Sustainment + Comms + Admin résiduels

### Routers exemptés
- `auth.ts`, `translation.ts`, `analytics.ts`, `source-insights.ts`, `seshat-search.ts` queries — exemptés tant qu'ils sont **purement query (none)**. Toute mutation y rajoutée déclenche migration.

**Effort total estimé** : ~50 routers × 0.5j = **25 jours** sur Phase 3 (en parallèle des nouveaux Intent kinds + IntentEmissionEvent + bus refactor).

---

## 11. Routers manquants (à anticiper)

Selon l'extension framework, certains routers viendront en P3-P8 :

| Router attendu | Sous-système | Phase | Justification |
|---|---|---|---|
| `nsp.ts` | Telemetry | P5 | NSP subscription endpoints (SSE) |
| `governance.ts` | Admin | P3 | Admin governance dashboard (IntentEmission viewer, replay) |
| `slo.ts` | Sustainment | P6 | SLO dashboard + breach acknowledgment |
| `cost-decision.ts` | Sustainment | P3 | Cost gate decisions audit |
| `compensating-intent.ts` | Sustainment | P3 | Reverse maneuvers exposed |
| `oracle-history.ts` | Telemetry | P7 | Time travel queries |
| `plugin-registry.ts` | Admin | P2.7 | Plugin management |

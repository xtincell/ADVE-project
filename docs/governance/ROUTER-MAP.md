# ROUTER-MAP — Tous les routers tRPC mappés sur APOGEE

**123 fichiers** sous `src/server/trpc/routers/` (recompte 2026-07-21) : **122 routers** tous classifiés par **Sous-système APOGEE** + **Tier** dans les tables ci-dessous, et **1 helper hors compte** (`_strategy-read-guard.ts` — garde de lecture par marque ADR-0129/0166, pas un router). La reclassification du delta post-Phase 19 (46 routers apparus entre les recomptes) est intégrée — la section « À classifier » est refermée.

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
| Propulsion | M | 20 | mixte — nouveaux governed, legacy bypass (cf. §10) |
| Guidance | M | 18 | mixte — nouveaux governed, legacy bypass |
| Telemetry | M | 24 | mixte — governed + public (surfaces funnel/leaderboard) |
| Sustainment | M | 5 | bypass (legacy) |
| Operations | G | 21 | mixte — nouveaux governed, legacy bypass |
| Crew Programs | G | 15 | mixte |
| Comms | G | 6 | mixte |
| Admin | G | 13 | mixte — governed/admin |
| **TOTAL** | | **122** (+1 helper hors compte) | **104/122 sur la voie gouvernée** (`governedProcedure`/`emitIntent`, recompte 2026-07-21) — cf. §10 |

---

## 1. Propulsion (20 routers)

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
| `actions.ts` | Base d'actions canonique du Pilier I — `BrandAction` + calendrier/plan d'actions (ADR-0094) | M | governed (emitIntent) |
| `creative-proposal.ts` | Proposition Créative — gate de génération de production (ADR-0120) | M | governed |
| `intention.ts` | Intention dirigeant → brief candidat, validation (ADR-0106) | M | governed (emitIntent) |
| `media-plan.ts` | Plan média (acteur Média, ADR-0115) | M | governed |
| `oracle.ts` | Génération unitaire sections Oracle (Phase 21 F-C, ADR-0070) — `GENERATE_ORACLE_SECTION` / assembler | M | governed (emitIntent) |
| `ptah.ts` | Forge Ptah — matérialisation briefs → assets (ADR-0009) | M | governed (emitIntent) |

---

## 2. Guidance (18 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `mestor-router.ts` | Mestor chat + Intent dispatch | M | governed |
| `pillar.ts` | Pillars CRUD (35KB — pire offender bypass) | M | bypass (priorité P3) |
| `strategy.ts` | Strategy CRUD + comparables | M | bypass (mixed governed) |
| `strategy-presentation.ts` | Oracle 35 sections (assemblage read-time + exports ; génération via router `oracle` — legacy `enrichOracle` déposé ADR-0125) | M | governed |
| `framework.ts` | Frameworks Artemis | M | bypass |
| `guidelines.ts` | Brand guidelines render | M | bypass |
| `boot-sequence.ts` | Boot sequence trigger | M | bypass |
| `brand-vault.ts` | Vault brand content | M | bypass |
| `implementation-generator.ts` | Plans d'implémentation | M | bypass |
| `cohort.ts` | Cohort analysis (segmentation strat) | M | bypass |
| `campaign-tracker.ts` | **Campaign tracker L2 Instrumental** (Phase 19, ADR-0052) — 6 procedures Vague 1 (Cluster A trajectory + B coherence) toutes via `auditedProcedure("campaign-tracker")` ; helper `listClusterCapabilities` query non-auditée. Délégation pure aux handlers du service `campaign-tracker`. **Phase 23 SHIPPED (Epic 6)** — `runAttributionCalibration` + `promotePivotSubcluster` (gouvernés via `mestor.emitIntent`) + `listCalibrationSnapshots` (read). Cf. ADR-0080 + ADR-0081. **Cockpit founder Overton read (Epic 7 Story 7.4)** : `cockpitDashboard.overtonSignal` (`protectedProcedure`, tenant-scoped + ownership guard, paid-tier-gated `TIER_GATE_DENIED` arm) retourne `ConnectorResult<OvertonRadarSignal>` — composé depuis `sector-intelligence.getSectorAxis` + pillar-D + Tarsis façade `fetchSectorSignal`. Cf. ADR-0078. | M | governed |
| `brand-node.ts` | Arbre de marque (Phase 18, ADR-0059) : nœuds, piliers effectifs, recherche contexte — garde par chaîne ancêtre/descendant (ADR-0166) | M | governed (emitIntent) |
| `campaign-change-request.ts` | Demandes de changement campagne (Phase 18-A1) | M | governed |
| `campaign-deliverable.ts` | Matrice 6D livrables campagne (ADR-0059), manual-first parity ADR-0060 | M | governed |
| `consulting.ts` | Acteur Conseil — priorisation RICE + chaîne de preuve (ADR-0109) | M | governed (emitIntent) |
| `markets.ts` | Kill-switch marché (ADR-0105) : NEUTRALIZE / REINSTATE / PURGE_MARKET | M | governed (emitIntent) + admin |
| `morning-batch.ts` | Morning Brief batch ingestion + validation (ADR-0062) | M | governed |
| `operator-action.ts` | OperatorAction (Phase 18-A1) | M | governed |

---

## 3. Telemetry (24 routers)

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
| `argos.ts` | Argos by LaFusée — dossiers de référence + projection publique (ADR-0100) | M | governed + public |
| `bureau-etudes.ts` | Vagues d'étude time-spine, significativité (ADR-0110/0114) | M | governed (emitIntent) |
| `footprint.ts` | Score d'empreinte public instantané (funnel « Scorer ma marque ») — rate-limité ADR-0161, gate homonymes ADR-0162 | M | public (éphémère, sans compte) |
| `identity.ts` | Identity Graph — portes gouvernées, PII redactée via le spine (ADR-0147/0124) | M | governed (spine) |
| `market-study-ingestion.ts` | Ingestion études marché → vault | M | governed (emitIntent) + admin |
| `overton.ts` | Axes Overton par polity + tags delta opérateur (ADR-0127) | M | governed |
| `prediction.ts` | Registre des paris — déclaration/résolution gouvernées + registre public /paris (ADR-0159) | M | governed + public |
| `scoreur.ts` | Scoreur à force révélée (ADR-0149/0150) : épreuves, verdicts, leaderboard public, canon éditable opérateur | M | governed + public |
| `source-classifier.ts` | Classification BrandDataSource → BrandAsset DRAFTs | M | governed (emitIntent) + scoped |

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

## 5. Operations (21 routers)

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
| `crm-contacts.ts` | Contacts CRM (lane opérateur) | G | governed + operator |
| `escrow-arbitration.ts` | Séquestre + payouts mobile money (Guilde, ADR-0116) | G | governed (emitIntent) |
| `market-cost.ts` | MarketCostSnapshot par période (ADR-0099) | G | governed |
| `mcp-billing.ts` | Metering MCP billable + relevés gelés + console api-billing (ADR-0092) | G | admin |
| `mission-quote.ts` | Devis missions Guilde (ADR-0118) | G | governed |
| `monetization.ts` | Abonnements deux-rails + grille /pricing + validation manuelle WhatsApp (ADR-0092) | G | governed + admin + public |
| `operations-overview.ts` | Traque opérationnelle unifiée `/console/operations` (Vague 7) — lecture composée | G | operator (read-only) |
| `production.ts` | Acteur Production — specs livrable + droits d'usage + devis AICP (ADR-0111) | G | governed (emitIntent) |
| `referral.ts` | Parrainage manual-first (ADR-0157) : code self-service + récompenses appliquées à la main | G | admin (manual-first) |
| `thot.ts` | Coût d'action atomisé par marché (ADR-0093) : estimateur + ZoneIndex + ProviderCostRate | G | governed (emitIntent) |

---

## 6. Crew Programs (15 routers)

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
| `imhotep.ts` | Orchestrateur Crew Programs (Phase 14, ADR-0019) | G | governed (emitIntent) |
| `laguilde.ts` | Portail public Guilde (ADR-0098) : mur missions, dépôt marque, inscriptions, modération | G | governed + public |
| `mission-applications.ts` | Candidatures missions (Vague 7) — fin du premier-arrivé | G | governed |
| `talent-services.ts` | Gigs offre-side à prix fixe (ADR-0117) | G | governed + public |

---

## 7. Comms (6 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `messaging.ts` | Messages cross-portail (garde participant-ou-marque ADR-0166) | G | bypass |
| `notification.ts` | Notifications + alerts | G | bypass |
| `anubis.ts` | Orchestrateur Comms — broadcast, ad networks, credentials, OAuth device flow, connexions sociales + sync (ADR-0020/0021/0128) | G | governed (emitIntent) |
| `blog.ts` | CMS « Notes de cabinet » site public — CRUD éditorial console Anubis, direct-`db` documenté | G | bypass assumé (éditorial) |
| `commerce.ts` | Boutique Shopify par marque (ADR-0132) : status zéro-secret, sync ventes gouvernée, disconnect | G | governed |
| `newsletter.ts` | Newsletter (abonnés, envois) | G | bypass (operator + scoped) |

---

## 8. Admin (13 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `auth.ts` | Authentication | G | none |
| `operator.ts` | Multi-operator admin | G | bypass |
| `system-config.ts` | System settings | G | bypass |
| `translation.ts` | i18n | G | none |
| `cockpit-router.ts` | Cockpit-specific aggregator (piliers scopés ADR-0166) | G | bypass |
| `accounts.ts` | Console Superviseur (Vague 7) : rôles comptes + `createBrandLogin` (ADR-0140, payload redacté) | G | governed + admin |
| `brand-mcp.ts` | Clés MCP scopées à la marque — surface founder self-service (ADR-0145) | G | bypass (protected) |
| `canon-sync.ts` | Push canon UPgraders → base live (Vague 10 ; god-mode best-effort C3) | G | governed + admin |
| `feedback.ts` | Remontées testeurs (ADR-0155) : dépôt + inbox opérateur | G | governed + operator |
| `governance.ts` | Audit trail IntentEmission + compensating intents (anticipé §11 — livré) | G | governed + admin |
| `phase18-residuals.ts` | Formulaire résiduels Phase 18 (`upsert/resolve/dismiss/list/stats`) | G | bypass (formulaire opérateur) |
| `prod-ops.ts` | Cycle prod en 3 temps (skill `nefer-ops`) : registre seeds + déclenche Coolify + crons/finaliseur gardés ; zéro secret exposé | G | admin |
| `xlsx-parser.ts` | Parsing XLSX pur (import sheets Phase 18) — sans persistance | G | public (parsing pur) |

---

## 9. Verdict — orphelins révélés

Tous les routers absorbés par les 8 sous-systèmes. Cas notables :

- **`framework.ts`** — placé en Guidance car expose les frameworks Artemis (Mestor lit pour planifier). Pourrait être en Propulsion. À arbitrer en P2 selon l'usage réel.
- **`cohort.ts`** — analyse de cohortes côté strategy. Placé en Guidance (sert à décider stratégie segmentation). Pourrait être Telemetry pure. Manifest finalise le rôle.
- **`onboarding.ts`** — placé en Operations (acquisition / retainer activation). Aurait pu aller en Crew Programs si c'était onboarding creator. Lecture du fichier → onboarding *founder* → Operations.
- **`brief-ingest.ts`** — Operations parce que c'est l'entrée commerciale (un client envoie un PDF brief), pas Guidance. Le brief INGÉRÉ devient un Intent qui touche Guidance.
- **`_strategy-read-guard.ts`** — helper hors compte (garde de lecture par marque, chokepoint ADR-0129 consommé par les routers legacy) — pas un router, pas de table.
- **Acteurs Phase 24** (`consulting`, `bureau-etudes`, `production`, `media-plan`, `creative-proposal`, `intention`) — ventilés par rôle dominant, même règle que SERVICE-MAP : décision → Guidance, mesure → Telemetry, argent/contrats → Operations, brief → Propulsion.
- **Surfaces publiques** (`footprint`, `scoreur` leaderboard, `laguilde`, `prediction` /paris, `argos`, `blog`, `talent-services`) — restent dans leur sous-système métier ; « public » est un statut de lane, pas un sous-système.

---

## 10. Plan d'action governance — migration des bypass

**Recompte 2026-07-21** : **104/122 routers sur la voie gouvernée** (`governedProcedure` ou `mestor.emitIntent` présent), **7 query-only**, **11 à mutations directes** — tous des cas documentés : `auth` (compte, hors métier) · `blog` (éditorial direct-db assumé) · `brand-mcp` (clés self-service) · `error-vault` (collecteur) · `footprint` (public éphémère) · `mcp-billing` (metering admin) · `newsletter` · `payment` (webhooks/init — cf. Vague 4 ci-dessous) · `phase18-residuals` (formulaire) · `referral` (manual-first ADR-0157) · `xlsx-parser` (parsing pur sans DB). Les gardes d'ownership par marque sont par ailleurs verrouillées CI sur les 122 (ADR-0166, `strategy-ownership-guard.test.ts`).

Historique (recensement pré-Phase 19) : 6 routers governed sur 71 (8.5 %). Cible Phase 3 : **100 % des mutations métier passent par `mestor.emitIntent`**.

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
| `nsp.ts` | Telemetry | P5 | NSP subscription endpoints (SSE) — transport servi par route API `/api/notifications/stream`, router jamais requis |
| ~~`governance.ts`~~ | Admin | P3 | ✅ **Livré** (classifié §8 — audit trail IntentEmission + compensating intents) |
| `slo.ts` | Sustainment | P6 | SLO dashboard + breach acknowledgment |
| `cost-decision.ts` | Sustainment | P3 | Cost gate decisions audit |
| `compensating-intent.ts` | Sustainment | P3 | Reverse maneuvers exposed |
| `oracle-history.ts` | Telemetry | P7 | Time travel queries |
| `plugin-registry.ts` | Admin | P2.7 | Plugin management |

---

## Historique de reclassification

- **2026-07-21** — Le delta post-recensement Phase 19 (46 routers : les 34 listés « À classifier » au recompte 2026-07-11 + 12 apparus ensuite : `brand-mcp` · `feedback` · `footprint` · `governance` · `identity` · `oracle` · `overton` · `prediction` · `production` · `ptah` · `referral` · `scoreur`) est intégré aux tables ci-dessus avec statut governance vérifié par scan statique ; les 2 lignes flottantes `commerce`/`prod-ops` sont rangées dans leurs sections (Comms / Admin). Section « À classifier » refermée ; chantier RESIDUAL-DEBT « Reclassification ROUTER-MAP / SERVICE-MAP » clos. Tout nouveau router DOIT être classifié ici dans le même PR (protocole NEFER Phase 6 — pas de retour de la section tampon).

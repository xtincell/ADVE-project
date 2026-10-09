# ROUTER-MAP — Tous les routers tRPC mappés sur APOGEE

**127 fichiers** sous `src/server/trpc/routers/` (recompte 2026-10-06) : **124 routers** et **3 helpers** hors compte (`_strategy-read-guard.ts`, `_pillar-write-guard.ts`, `_talent-access-guard.ts`). Le livre de marque ajoute une lecture sans nouveau writer. Les chemins actuels sont générés dans [CODE-MAP.md](CODE-MAP.md).

Le recompte global du 6 octobre inclut le sous-router `creative-intelligence.ts` ajouté par ADR-0194. Les autres lignes des tableaux de rôle conservent leur relevé statique du 2 octobre et le vocabulaire de migration historique ; ces statuts ne prouvent ni la gouvernance de chaque chemin ni une recette en production.

Source de vérité : `ls src/server/trpc/routers/*.ts`. Mis à jour avec [APOGEE.md](APOGEE.md) §4 + [PANTHEON.md](PANTHEON.md).

**Statut governance** :
- `point gouverné présent` : présence de `governedProcedure` ou d'un appel `emitIntent` dans le code du router ; la couverture de chaque mutation se vérifie séparément.
- `appels à suivre` : mutations présentes sans ces marqueurs directs ; vérifier leurs services et leurs justifications avant de conclure à un contournement.
- `lecture seule` : aucune déclaration `.mutation(...)` dans le router.

Extension candidate 432 : strategy.publicPage fournit les choix admissibles à
la revue Connexions ; strategy.update reste l’unique écriture de cette publication
d’identité v2. Aucun router/procedure parallèle ni droit ajouté. Gauntlet et
publication/revue/retour natifs locaux producer reçus ; livraison production
encore à recevoir : [ADR-0212 Proposed](adr/0212-versioned-public-identity-projection.md).
---

## Synthèse globale

| Sous-système | Tier | Count | Relevé statique des routers |
|---|---|---|---|
| Propulsion | M | 20 | 19 point gouverné présent · 1 appels à suivre |
| Guidance | M | 19 | 17 point gouverné présent · 2 lecture seule |
| Telemetry | M | 25 | 20 point gouverné présent · 3 lecture seule · 2 appels à suivre |
| Sustainment | M | 5 | 5 point gouverné présent |
| Operations | G | 21 | 16 point gouverné présent · 2 lecture seule · 3 appels à suivre |
| Crew Programs | G | 15 | 14 point gouverné présent · 1 appels à suivre |
| Comms | G | 6 | 3 point gouverné présent · 3 appels à suivre |
| Admin | G | 13 | 7 point gouverné présent · 1 lecture seule · 5 appels à suivre |
| **TOTAL** | | **124** (+3 helpers hors compte) | **101 points gouvernés présents · 8 lectures seules · 15 appels à suivre** — scan statique, cf. §10 |

---

## 1. Propulsion (20 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `glory.ts` | Glory tools API | M | point gouverné présent |
| `campaign.ts` | Campagnes lecture/édition | M | point gouverné présent |
| `campaign-manager.ts` | Orchestration campagnes (49KB) | M | point gouverné présent |
| `mission.ts` | Missions et droits de lecture | M | point gouverné présent ; portée admin reçue sur PostgreSQL, modes guilde/assigné conservés |
| `intervention.ts` | Demandes Signal → Mission / rejet motivé | M | commandes gouvernées versionnées, transaction atomique, ADR-0201 |
| `media-buying.ts` | Plan media + buying | M | point gouverné présent |
| `pr.ts` | RP / publications | M | point gouverné présent |
| `social.ts` | Orchestration social | M | point gouverné présent |
| `editorial.ts` | Editorial / content calendar | M | point gouverné présent |
| `publication.ts` | Publication multi-canal | M | point gouverné présent |
| `driver.ts` | Drivers d'engagement | M | point gouverné présent |
| `notoria.ts` | Pipeline production | M | point gouverné présent |
| `sequence-vault.ts` | Séquences GLORY | M | point gouverné présent |
| `deliverable-orchestrator.ts` | **Deliverable Forge tRPC** (Phase 17b, ADR-0050 — anciennement ADR-0037) — `listSupportedKinds` query, `resolveRequirements` query auditée, `compose` mutation auditée hash-chained via `mestor.emitIntent({ kind: "COMPOSE_DELIVERABLE" })` | M | point gouverné présent |
| `actions.ts` | Base d'actions canonique du Pilier I — `BrandAction` + calendrier/plan d'actions (ADR-0094) | M | point gouverné présent |
| `creative-proposal.ts` | Proposition Créative — gate de génération de production (ADR-0120) | M | point gouverné présent |
| `intention.ts` | Intention dirigeant → brief candidat, validation (ADR-0106) | M | point gouverné présent |
| `media-plan.ts` | Plan média (acteur Média, ADR-0115) | M | point gouverné présent |
| `oracle.ts` | Génération unitaire sections Oracle (Phase 21 F-C, ADR-0070) — `GENERATE_ORACLE_SECTION` / assembler | M | point gouverné présent |
| `ptah.ts` | Forge Ptah — matérialisation briefs → assets (ADR-0009) | M | appels à suivre |

---

## 2. Guidance (19 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `brand-bible.ts` | Livre de marque déterministe, assemblé depuis les sources et piliers (ADR-0185) | M | lecture seule |
| `mestor-router.ts` | Mestor chat + Intent dispatch | M | point gouverné présent |
| `pillar.ts` | Pillars CRUD et gardes d’écriture | M | point gouverné présent |
| `strategy.ts` | Strategy CRUD + comparables | M | point gouverné présent |
| `strategy-presentation.ts` | Oracle 35 sections (assemblage read-time + exports ; génération via router `oracle` — legacy `enrichOracle` déposé ADR-0125) | M | point gouverné présent |
| `framework.ts` | Frameworks Artemis | M | point gouverné présent |
| `guidelines.ts` | Identité et références ; partage gouverné (ADR-0203) | M | point gouverné présent |
| `boot-sequence.ts` | Boot sequence trigger | M | point gouverné présent |
| `brand-vault.ts` | Vault brand content | M | point gouverné présent |
| `implementation-generator.ts` | Plans d'implémentation | M | point gouverné présent |
| `cohort.ts` | Cohort analysis (segmentation strat) | M | lecture seule |
| `campaign-tracker.ts` | **Campaign tracker L2 Instrumental** (Phase 19, ADR-0052) — 6 procedures Vague 1 (Cluster A trajectory + B coherence) toutes via `auditedProcedure("campaign-tracker")` ; helper `listClusterCapabilities` query non-auditée. Délégation pure aux handlers du service `campaign-tracker`. **Phase 23 SHIPPED (Epic 6)** — `runAttributionCalibration` + `promotePivotSubcluster` (gouvernés via `mestor.emitIntent`) + `listCalibrationSnapshots` (read). Cf. ADR-0080 + ADR-0081. **Cockpit founder Overton read (Epic 7 Story 7.4)** : `cockpitDashboard.overtonSignal` (`protectedProcedure`, tenant-scoped + ownership guard, paid-tier-gated `TIER_GATE_DENIED` arm) retourne `ConnectorResult<OvertonRadarSignal>` — composé depuis `sector-intelligence.getSectorAxis` + pillar-D + Tarsis façade `fetchSectorSignal`. Cf. ADR-0078. | M | point gouverné présent |
| `brand-node.ts` | Arbre de marque (Phase 18, ADR-0059) : nœuds, piliers effectifs, recherche contexte — garde par chaîne ancêtre/descendant (ADR-0166) | M | point gouverné présent |
| `campaign-change-request.ts` | Demandes de changement campagne (Phase 18-A1) | M | point gouverné présent |
| `campaign-deliverable.ts` | Matrice 6D livrables campagne (ADR-0059), manual-first parity ADR-0060 | M | point gouverné présent |
| `consulting.ts` | Acteur Conseil — priorisation RICE + chaîne de preuve (ADR-0109) | M | point gouverné présent |
| `markets.ts` | Kill-switch marché (ADR-0105) : NEUTRALIZE / REINSTATE / PURGE_MARKET | M | point gouverné présent |
| `morning-batch.ts` | Morning Brief batch ingestion + validation (ADR-0062) | M | point gouverné présent |
| `operator-action.ts` | OperatorAction (Phase 18-A1) | M | point gouverné présent |

---

## 3. Telemetry (25 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `seshat-search.ts` | Recherche sémantique cross-strategy (V5.4) | M | lecture seule |
| `jehuty.ts` | Cross-brand intelligence feed (V5.4) | M | point gouverné présent |
| `signal.ts` | Signaux faibles | M | point gouverné présent |
| `source-insights.ts` | Insights sources | M | lecture seule |
| `attribution-router.ts` | Attribution canaux | M | point gouverné présent |
| `analytics.ts` | Analytics général | M | point gouverné présent |
| `cult-index.ts` | Cult index measurement | M | point gouverné présent |
| `devotion-ladder.ts` | Devotion ladder calculation | M | point gouverné présent |
| `superfan.ts` | Segments superfans | M | point gouverné présent |
| `ambassador.ts` | Ambassadeurs (segment supérieur) | M | lecture seule |
| `advertis-scorer.ts` | Score composite | M | point gouverné présent |
| `knowledge-graph.ts` | Knowledge graph | M | point gouverné présent |
| `market-intelligence.ts` | Intel marché | M | point gouverné présent |
| `market-study.ts` | Études marché | M | point gouverné présent |
| `error-vault.ts` | Capture/triage errors runtime + `oracleIncidents` cluster par code ORACLE-NNN (ADR-0022) | INFRA | appels à suivre |
| `argos.ts` | Argos by LaFusée — dossiers de référence + projection publique (ADR-0100) | M | point gouverné présent |
| `creative-intelligence.ts` | Sous-router `argos.intelligence` (ADR-0194/0195) : corpus/recettes/essais/opportunités, capacités et collecte de sources, export atomique, veille opt-in, brouillons assistés et revue MANUAL. Mutations gouvernées, lectures de marque scopées ; aucun namespace racine nouveau. `argos.ts` conserve revue de dossier et ajoute projection explicite Argos-studio. | M | point gouverné présent ; ADR-0195 Accepted, parcours et stress local PASS |
| `bureau-etudes.ts` | Vagues d'étude time-spine, significativité (ADR-0110/0114) | M | point gouverné présent |
| `footprint.ts` | Score d'empreinte public instantané (funnel « Scorer ma marque ») — rate-limité ADR-0161, gate homonymes ADR-0162 | M | appels à suivre |
| `identity.ts` | Identity Graph — portes gouvernées, PII redactée via le spine (ADR-0147/0124) | M | point gouverné présent |
| `market-study-ingestion.ts` | Ingestion études marché → vault | M | point gouverné présent |
| `overton.ts` | Axes Overton par polity + tags delta opérateur (ADR-0127) | M | point gouverné présent |
| `prediction.ts` | Registre des paris — déclaration/résolution gouvernées + registre public /paris (ADR-0159) | M | point gouverné présent |
| `scoreur.ts` | Scoreur à force révélée (ADR-0149/0150) : épreuves, verdicts, leaderboard public, canon éditable opérateur | M | point gouverné présent |
| `source-classifier.ts` | Classification BrandDataSource → BrandAsset DRAFTs | M | point gouverné présent |

---

## 4. Sustainment (5 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `process.ts` | Process scheduler / queue | M | point gouverné présent |
| `staleness.ts` | Staleness propagator API | M | point gouverné présent |
| `quality-review.ts` | Quality review (post-conditions) | M | point gouverné présent |
| `deliverable-tracking.ts` | Tracking livrables (SLA) | M | point gouverné présent |
| `connectors.ts` | Connectors monitoring | M | point gouverné présent |

---

## 5. Operations (21 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `client.ts` | CRM clients | G | point gouverné présent |
| `crm.ts` | CRM extended | G | point gouverné présent |
| `contract.ts` | Contrats | G | point gouverné présent |
| `commission.ts` | Commissions | G | point gouverné présent |
| `payment.ts` | Paiements | G | appels à suivre |
| `mobile-money.ts` | Mobile money integration | G | point gouverné présent |
| `value-report.ts` | Value reports clients | G | point gouverné présent |
| `upsell.ts` | Upsell detection | G | point gouverné présent |
| `market-pricing.ts` | Pricing marché | G | lecture seule |
| `onboarding.ts` | Onboarding flows | G | point gouverné présent |
| `brief-ingest.ts` | PDF brief ingestion | G | point gouverné présent |
| `crm-contacts.ts` | Contacts CRM (lane opérateur) | G | point gouverné présent |
| `escrow-arbitration.ts` | Séquestre + payouts mobile money (Guilde, ADR-0116) | G | point gouverné présent |
| `market-cost.ts` | MarketCostSnapshot par période (ADR-0099) | G | point gouverné présent |
| `mcp-billing.ts` | Metering MCP billable + relevés gelés + console api-billing (ADR-0092) | G | appels à suivre |
| `mission-quote.ts` | Devis missions Guilde (ADR-0118) | G | point gouverné présent |
| `monetization.ts` | Abonnements deux-rails + grille /pricing + validation manuelle WhatsApp (ADR-0092) | G | point gouverné présent |
| `operations-overview.ts` | Traque opérationnelle unifiée `/console/operations` (Vague 7) — lecture composée | G | lecture seule |
| `production.ts` | Acteur Production — specs livrable + droits d'usage + devis AICP (ADR-0111) | G | point gouverné présent |
| `referral.ts` | Parrainage manual-first (ADR-0157) : code self-service + récompenses appliquées à la main | G | appels à suivre |
| `thot.ts` | Coût d'action atomisé par marché (ADR-0093) : estimateur + ZoneIndex + ProviderCostRate | G | point gouverné présent |

---

## 6. Crew Programs (15 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `guilde.ts` | Guild creators | G | point gouverné présent |
| `guild-tier.ts` | Tiers APPRENTI/COMPAGNON/MAÎTRE/ASSOCIÉ | G | point gouverné présent |
| `guild-org.ts` | Organisations partenaires | G | point gouverné présent |
| `club.ts` | Club ambassadeurs | G | point gouverné présent |
| `event.ts` | Events networking | G | point gouverné présent |
| `membership.ts` | Memberships | G | point gouverné présent |
| `matching.ts` | Match creator ↔ mission | G | point gouverné présent |
| `learning.ts` | Académie / learning | G | point gouverné présent |
| `boutique.ts` | Boutique formation | G | point gouverné présent |
| `quick-intake.ts` | Pipeline intake (rev 9, 30KB) | G | point gouverné présent |
| `ingestion.ts` | Ingestion data externe ; lecture des usages et lien/révocation via `updateSource` gouverné (ADR-0198) | G | point gouverné présent |
| `imhotep.ts` | Orchestrateur Crew Programs (Phase 14, ADR-0019) | G | appels à suivre |
| `laguilde.ts` | Portail public Guilde (ADR-0098) : mur missions, dépôt marque, inscriptions, modération | G | point gouverné présent |
| `mission-applications.ts` | Candidatures missions (Vague 7) — fin du premier-arrivé | G | point gouverné présent |
| `talent-services.ts` | Gigs offre-side à prix fixe (ADR-0117) | G | point gouverné présent |

---

## 7. Comms (6 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `messaging.ts` | Messages cross-portail (garde participant-ou-marque ADR-0166) | G | point gouverné présent |
| `notification.ts` | Notifications + alerts | G | point gouverné présent |
| `anubis.ts` | Orchestrateur Comms — broadcast, ad networks, credentials, OAuth device flow, connexions sociales + sync (ADR-0020/0021/0128) | G | appels à suivre |
| `blog.ts` | CMS « Notes de cabinet » site public — CRUD éditorial console Anubis, direct-`db` documenté | G | appels à suivre |
| `commerce.ts` | Boutique Shopify par marque (ADR-0132) : status zéro-secret, sync ventes gouvernée, disconnect | G | point gouverné présent |
| `newsletter.ts` | Newsletter (abonnés, envois) | G | appels à suivre |

---

## 8. Admin (13 routers)

| Router | Rôle | Tier | Statut |
|---|---|---|---|
| `auth.ts` | Authentication | G | appels à suivre |
| `operator.ts` | Multi-operator admin | G | point gouverné présent |
| `system-config.ts` | System settings | G | point gouverné présent |
| `translation.ts` | i18n | G | point gouverné présent |
| `cockpit-router.ts` | Cockpit-specific aggregator (piliers scopés ADR-0166) | G | lecture seule |
| `accounts.ts` | Console Superviseur (Vague 7) : rôles comptes + `createBrandLogin` (ADR-0140, payload redacté) | G | point gouverné présent |
| `brand-mcp.ts` | Clés MCP scopées à la marque — surface founder self-service (ADR-0145) | G | appels à suivre |
| `canon-sync.ts` | Push canon UPgraders → base live (Vague 10 ; god-mode best-effort C3) | G | point gouverné présent |
| `feedback.ts` | Remontées testeurs (ADR-0155) : dépôt + inbox opérateur | G | point gouverné présent |
| `governance.ts` | Audit trail IntentEmission + compensating intents (anticipé §11 — livré) | G | point gouverné présent |
| `phase18-residuals.ts` | Formulaire résiduels Phase 18 (`upsert/resolve/dismiss/list/stats`) | G | appels à suivre |
| `prod-ops.ts` | Cycle prod en 3 temps (skill `nefer-ops`) : registre seeds + déclenche Coolify + crons/finaliseur gardés ; zéro secret exposé | G | appels à suivre |
| `xlsx-parser.ts` | Parsing XLSX pur (import sheets Phase 18) — sans persistance | G | appels à suivre |

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

**Recompte statique 2026-10-06** : **101/124 routers** portent un appel `emitIntent` ou `governedProcedure` hors commentaires ; **8** n'ont aucune mutation déclarée ; **15** nécessitent de suivre les appels délégués et exceptions. Ce scan ne constitue pas un taux de conformité. Les gardes CI par stratégie restent nécessaires, ainsi que la lecture des chemins exécutés. Les vagues ci-dessous sont le plan historique de migration, à confronter au code avant de relancer un chantier.

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

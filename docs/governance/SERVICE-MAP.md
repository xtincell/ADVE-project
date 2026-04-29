# SERVICE-MAP — Tous les services backend mappés sur APOGEE

**71 services** sous `src/server/services/`. Chacun classé par **Sous-système APOGEE** + **Tier**. Le **Governor Neteru** indique sous quelle gouvernance le service tombe (MESTOR / ARTEMIS / SESHAT / THOT / INFRASTRUCTURE).

Source de vérité : `find src/server/services -mindepth 1 -maxdepth 1 -type d`. Mis à jour avec [APOGEE.md](APOGEE.md) §4.

Phase 2 du REFONTE-PLAN exige un `manifest.ts` co-localisé pour chaque service — la colonne **Manifest** indique l'état attendu (à créer ou existant).

---

## Synthèse globale

| Sous-système | Tier | Count | Governor Neteru |
|---|---|---|---|
| Propulsion | M | 13 | ARTEMIS |
| Guidance | M | 13 | MESTOR |
| Telemetry | M | 17 | SESHAT |
| Sustainment | M | 8 | THOT / INFRASTRUCTURE |
| Operations | G | 8 | THOT / INFRASTRUCTURE |
| Crew Programs | G | 4 | INFRASTRUCTURE |
| Comms | G | 0 | (vit dans routers tRPC, pas service) |
| Admin | G | 8 | INFRASTRUCTURE |
| **TOTAL** | | **71** | |

---

## 1. Propulsion (13 services — Mission Tier)

Génèrent la poussée vers l'apogée.

| Service | Rôle propulsion | Governor | Manifest |
|---|---|---|---|
| `artemis/` | Thrust controller — exécute Glory tools, séquences GLORY | ARTEMIS | à créer |
| `glory-tools/` | Catalogue + métadonnées des 91 thrusters | ARTEMIS | à créer |
| `sequence-vault/` | Bibliothèque des 31 séquences GLORY (skill tree) | ARTEMIS | à créer |
| `pipeline-orchestrator/` | Orchestration topo-triée des séquences | ARTEMIS | à créer |
| `notoria/` | Pipeline production des livrables | ARTEMIS | à créer |
| `driver-engine/` | Drivers d'engagement (E pillar tactics) | ARTEMIS | à créer |
| `campaign-manager/` | Gestion campagnes en vol | ARTEMIS | à créer |
| `campaign-plan-generator/` | Génération plans de campagne | ARTEMIS | à créer |
| `mission-templates/` | Templates de missions standard | ARTEMIS | à créer |
| `implementation-generator/` | Génération plans d'implémentation | ARTEMIS | à créer |
| `guidelines-renderer/` | Rendu brand guidelines (livrable) | ARTEMIS | à créer |
| `value-report-generator/` | Rendu rapport valeur (livrable client) | ARTEMIS | à créer |
| `seshat-bridge/` | **Bridge** Telemetry → Propulsion (signaux qui déclenchent missions) | ARTEMIS | à créer |

---

## 2. Guidance (13 services — Mission Tier)

Dirigent la trajectoire. Décisions, validations, plans.

| Service | Rôle guidance | Governor | Manifest |
|---|---|---|---|
| `mestor/` | Computer de guidage central — Intent dispatcher (`emitIntent`) | MESTOR | partiel (`intents.ts:179`) |
| `pillar-gateway/` | Écriture gouvernée des Pillars (`writePillarAndScore`) | MESTOR | à créer |
| `pillar-maturity/` | Évaluation maturity N0-N6 + assessor | MESTOR | à créer |
| `pillar-readiness/` | (vit dans `governance/`) — 5 gates de pre-conditions | MESTOR | gov layer |
| `pillar-versioning/` | Versionning des contrats Pillar | MESTOR | à créer |
| `pillar-normalizer/` | Normalisation inputs avant write | MESTOR | à créer |
| `rtis-protocols/` | Protocoles cascade R-T-I-S | MESTOR | à créer |
| `diagnostic-engine/` | Moteur de diagnostic substantiel | MESTOR | à créer |
| `cross-validator/` | Validation cross-pillar cohérence | MESTOR | à créer |
| `vault-enrichment/` | Enrichissement strategy depuis vault | MESTOR | à créer |
| `strategy-presentation/` | Assemblage Oracle 21 sections | MESTOR | à créer |
| `prompt-registry/` | Registre prompts LLM versionnés | MESTOR | à créer |
| `staleness-propagator/` | Détecte et propage staleness | MESTOR | à créer |

---

## 3. Telemetry (17 services — Mission Tier)

Observent, mesurent, archivent.

| Service | Rôle telemetry | Governor | Manifest |
|---|---|---|---|
| `seshat/` | Telemetry processor central + Tarsis sensors + ranker | SESHAT | partiel |
| `jehuty/` | Cross-brand intelligence feed (V5.4) | SESHAT | à créer |
| `knowledge-aggregator/` | Agrégation knowledge graph | SESHAT | à créer |
| `knowledge-capture/` | Capture nouveaux knowledge entries | SESHAT | à créer |
| `knowledge-seeder/` | Seeding knowledge initial | SESHAT | à créer |
| `market-intelligence/` | Intel sectorielle | SESHAT | à créer |
| `audit-trail/` | Trail audit transverse | INFRASTRUCTURE | à créer |
| `ecosystem-engine/` | Moteur métriques cross-tenant | SESHAT | à créer |
| `ai-cost-tracker/` | Tracking coûts LLM par intent | THOT | à créer |
| `cult-index-engine/` | Cult index (mass measurement propellant) | SESHAT | à créer |
| `devotion-engine/` | Devotion ladder calculation | SESHAT | à créer |
| `tier-evaluator/` | Classification ZOMBIE→ICONE | SESHAT | à créer |
| `advertis-scorer/` | Calcul score composite ADVERTIS | SESHAT | à créer |
| `advertis-connectors/` | Connecteurs sources signaux (social, presse) | SESHAT | à créer |
| `feedback-loop/` | Boucle feedback Mestor ↔ Seshat | SESHAT | à créer |
| `feedback-processor/` | Traitement feedbacks structurés | SESHAT | à créer |
| `asset-tagger/` | Tagging automatique assets | SESHAT | à créer |

---

## 4. Sustainment (8 services — Mission Tier)

Maintiennent la mission viable techniquement.

| Service | Rôle sustainment | Governor | Manifest |
|---|---|---|---|
| `llm-gateway/` | Engine controller multi-provider (v4) | INFRASTRUCTURE | à créer |
| `financial-brain/` | **Thot** — fuel manager, capacity tracking | THOT | à créer |
| `budget-allocator/` | Allocation budget par mission | THOT | à créer |
| `approval-workflow/` | Workflow d'approbation pré-action | MESTOR | à créer |
| `sla-tracker/` | SLO/SLA tracking par Intent kind | INFRASTRUCTURE | à créer |
| `operator-isolation/` | Tenant isolation (default-deny) | INFRASTRUCTURE | à créer |
| `neteru-shared/` | Governance registry central | INFRASTRUCTURE | manifests des autres |
| `cross-validator/` | (déjà compté en Guidance — invariants techniques) | MESTOR | — |

---

## 5. Operations (8 services — Ground Tier)

Argent, contrats, facturation. Sans Operations, pas de business.

| Service | Rôle operations | Governor | Manifest |
|---|---|---|---|
| `commission-engine/` | Calcul commissions UPgraders/agence/creator | THOT | à créer |
| `financial-engine/` | Logique business financière | THOT | à créer |
| `financial-reconciliation/` | Réconciliation transactions | THOT | à créer |
| `mobile-money/` | Intégration paiement mobile (Orange/MTN/Wave) | INFRASTRUCTURE | à créer |
| `crm-engine/` | Relation client structurée | INFRASTRUCTURE | à créer |
| `upsell-detector/` | Signaux d'upgrade contractuel | SESHAT | à créer |
| `campaign-budget-engine/` | Budgets par campagne | THOT | à créer |
| `data-export/` | Export données structurées (factures, reports) | INFRASTRUCTURE | à créer |

---

## 6. Crew Programs (4 services — Ground Tier)

Talent, formation, matching, QC.

| Service | Rôle crew programs | Governor | Manifest |
|---|---|---|---|
| `talent-engine/` | Évaluation, scoring, ranking creators | INFRASTRUCTURE | à créer |
| `matching-engine/` | Match creator ↔ mission | INFRASTRUCTURE | à créer |
| `team-allocator/` | Composition d'équipes optimales | INFRASTRUCTURE | à créer |
| `qc-router/` | Routing quality control | INFRASTRUCTURE | à créer |

---

## 7. Admin (8 services — Ground Tier)

Configuration, boot, ingestion système, support.

| Service | Rôle admin | Governor | Manifest |
|---|---|---|---|
| `boot-sequence/` | Initialisation système au démarrage | INFRASTRUCTURE | à créer |
| `process-scheduler/` | Cron + queue intents async | INFRASTRUCTURE | à créer |
| `ingestion-pipeline/` | Pipeline d'ingestion data externe | INFRASTRUCTURE | à créer |
| `quick-intake/` | Pipeline onboarding intake (rev 9) | INFRASTRUCTURE | à créer |
| `brief-ingest/` | Ingestion PDF briefs | MESTOR | à créer |
| `demo-data/` | Seeding pour staging/demo | INFRASTRUCTURE | à créer |
| `country-registry/` | Référentiel pays (devises, langues) | INFRASTRUCTURE | à créer |
| `translation/` | i18n service (P7) | INFRASTRUCTURE | à créer |
| `board-export/` | Export données pour boards externes | INFRASTRUCTURE | à créer |
| `utils/` | Helpers transverses | INFRASTRUCTURE | n/a (pas un service) |

---

## 8. Verdict — orphelins révélés

Aucun service n'est resté orphelin :

- Tous les services financiers (`financial-*`, `commission-engine`, `mobile-money`, `crm-engine`, `upsell-detector`, `campaign-budget-engine`, `data-export`) → absorbés par **Operations**.
- Tous les services humains (`talent-engine`, `matching-engine`, `team-allocator`, `qc-router`) → absorbés par **Crew Programs**.
- Tous les services d'infrastructure (`boot-sequence`, `process-scheduler`, `ingestion-pipeline`, `country-registry`, `translation`, etc.) → absorbés par **Admin**.

**Cas particuliers** :

- `seshat-bridge/` — **services pont** entre 2 sous-systèmes (Telemetry → Propulsion). Pattern récurrent où une observation Seshat déclenche une action Artemis. Modélisé dans Propulsion (output) avec governor SESHAT.
- `cross-validator/` — sert à la fois Guidance (validation cross-pillar) et Sustainment (invariants techniques). Listé en Guidance (rôle dominant).
- `utils/` — pas un service au sens APOGEE, juste des helpers. Reste hors classification.

**Manifests requis Phase 2** : 71 services × 1 manifest = **71 manifests à créer** (10 jours estimés). C'est le travail concret de Phase 2.6 du REFONTE-PLAN.

---

## 9. Services manquants (à anticiper)

Selon l'extension framework, certains services sont *attendus mais pas encore présents* :

| Service attendu | Sous-système | Phase | Justification |
|---|---|---|---|
| `messaging/` | Comms | P5 | Comms est un sous-système sans service core encore — vit dans routers seuls |
| `notification/` | Comms | P5 | Idem |
| `nsp/` (NSP server) | Telemetry/governance | P5 | Neteru Streaming Protocol côté serveur |
| `cost-gate/` | Sustainment | P3 | Pillar 6 (Thot active gate) |
| `compensating-intents/` | Sustainment | P3 | Reverse maneuvers |

Ces 5 services arriveront en Phase 3-5 du plan de refonte. Ils complètent la matrice 8×8 du framework.

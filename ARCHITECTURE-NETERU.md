ARCHITECTURE NETERU — Gouvernance des Services
================================================

Version: 1.0 — 2026-04-12

Nomenclature
------------
- **Neter** (singulier), **Neteru** (pluriel) : cerveaux strategiques
- **Thot** : cerveau financier (entite separee, pas un Neter)
- **Outils** : tout le reste (partages ou dedies)

---

CERVEAUX
--------

### NETERU — Cerveau Strategique

| Neter | Role | Fichiers racine |
|-------|------|-----------------|
| **Mestor** | Decision strategique | `services/mestor/` (hyperviseur, commandant, rtis-cascade, insights) |
| **Artemis** | Orchestration & execution | `services/artemis/` (frameworks, tools/, sequences) |
| **Seshat** | Observation & intelligence | `services/seshat/` (references, tarsis/) |

### Thot — Cerveau Financier

| Entite | Role | Fichiers racine |
|--------|------|-----------------|
| **Thot** | Validation financiere, benchmarks, budgets | `services/financial-brain/`, `services/financial-engine/` |

---

OUTILS PARTAGES
---------------

| Outil | Role | Gouverneur | Fichiers |
|-------|------|------------|----------|
| **Notoria** | Moteur de recommandation | Mestor (lead) | `services/notoria/` |
| **Jehuty** | Feed d'intelligence strategique | Seshat (presse) | `services/jehuty/`, `trpc/routers/jehuty.ts` |
| **Bible des Variables** | Regles de format de fond | Transversal (verrou Gateway) | `lib/types/variable-bible.ts` |
| **Pillar Gateway** | Point d'ecriture unique (LOI 1) | Transversal | `services/pillar-gateway/` |

---

ATTRIBUTION DES 65 SERVICES
----------------------------

### Sous Mestor (Decision)

| Service | Fichier | Role |
|---------|---------|------|
| mestor | `services/mestor/` | Hyperviseur, commandant, insights, RTIS cascade |
| notoria | `services/notoria/` | Moteur de recommandation (outil partage, Mestor lead) |
| rtis-protocols | `services/rtis-protocols/` | Execution R → T → I → S |
| feedback-loop | `services/feedback-loop/` | Signal → Score → Drift → Prescription |
| feedback-processor | `services/feedback-processor/` | Trigger asynchrone de feedback-loop |
| boot-sequence | `services/boot-sequence/` | Onboarding initial (L'Oracle) |
| quick-intake | `services/quick-intake/` | Diagnostic rapide (L'Oracle) |
| brief-ingest | `services/brief-ingest/` | Ingestion de briefs PDF |

### Sous Artemis (Orchestration)

| Service | Fichier | Role |
|---------|---------|------|
| artemis | `services/artemis/` | 24 frameworks diagnostiques + tools registry |
| glory-tools | `services/glory-tools/` | Shim backward-compat → artemis/tools |
| neteru-shared | `services/neteru-shared/` | Pillar directors partages |
| campaign-manager | `services/campaign-manager/` | State machine campagne (12 etats) |
| campaign-plan-generator | `services/campaign-plan-generator/` | Generation de plan campagne |
| campaign-budget-engine | `services/campaign-budget-engine/` | Budget par campagne |
| budget-allocator | `services/budget-allocator/` | Distribution budget par canal |
| implementation-generator | `services/implementation-generator/` | Generation de livrables |
| driver-engine | `services/driver-engine/` | Specs driver + brief translation |
| crm-engine | `services/crm-engine/` | Deal lifecycle + funnel |
| matching-engine | `services/matching-engine/` | Creator ↔ mission matching |
| talent-engine | `services/talent-engine/` | Profils talents |
| tier-evaluator | `services/tier-evaluator/` | Evaluation tiers createurs |
| mission-templates | `services/mission-templates/` | Templates de missions |
| pipeline-orchestrator | `services/pipeline-orchestrator/` | Orchestration sequences |
| qc-router | `services/qc-router/` | Routage QC |
| sequence-vault | `services/sequence-vault/` | Storage templates sequences |
| approval-workflow | `services/approval-workflow/` | Gates d'approbation |
| guidelines-renderer | `services/guidelines-renderer/` | Rendu guidelines dynamiques |
| upsell-detector | `services/upsell-detector/` | Detection opportunites upsell |
| diagnostic-engine | `services/diagnostic-engine/` | Diagnostics pilier |

### Sous Seshat (Observation)

| Service | Fichier | Role |
|---------|---------|------|
| seshat | `services/seshat/` | References, Tarsis (market intelligence) |
| jehuty | `services/jehuty/` | Feed d'intelligence (outil partage, Seshat presse) |
| knowledge-capture | `services/knowledge-capture/` | Capture evenements → knowledge graph |
| knowledge-aggregator | `services/knowledge-aggregator/` | Agregation benchmarks |
| knowledge-seeder | `services/knowledge-seeder/` | Seeding knowledge base |
| market-intelligence | `services/market-intelligence/` | Re-export Seshat/Tarsis |
| cult-index-engine | `services/cult-index-engine/` | Indice culte marque |
| devotion-engine | `services/devotion-engine/` | Niveaux de devotion |
| ecosystem-engine | `services/ecosystem-engine/` | Modelisation ecosysteme |
| asset-tagger | `services/asset-tagger/` | Tagging IA d'assets |
| data-export | `services/data-export/` | Export donnees strategy |
| strategy-presentation | `services/strategy-presentation/` | Agregation UI strategy |
| sla-tracker | `services/sla-tracker/` | Tracking SLA |
| staleness-propagator | `services/staleness-propagator/` | Cascade staleness piliers |
| audit-trail | `services/audit-trail/` | Logs evenements |

### Sous Thot (Finances)

| Service | Fichier | Role |
|---------|---------|------|
| financial-brain | `services/financial-brain/` | 40+ regles validation, benchmarks secteur |
| financial-engine | `services/financial-engine/` | Reference data financiere |
| commission-engine | `services/commission-engine/` | Calcul commissions createurs |
| financial-reconciliation | `services/financial-reconciliation/` | Reconciliation recettes/depenses |
| mobile-money | `services/mobile-money/` | Paiements mobile money |

### Infrastructure / Transversal

| Service | Fichier | Role |
|---------|---------|------|
| pillar-gateway | `services/pillar-gateway/` | LOI 1 — point d'ecriture unique |
| pillar-normalizer | `services/pillar-normalizer/` | Normalisation types pilier |
| pillar-versioning | `services/pillar-versioning/` | Historique versions |
| pillar-maturity | `services/pillar-maturity/` | Contrats maturite + auto-filler |
| advertis-scorer | `services/advertis-scorer/` | Score ADVERTIS /200 |
| cross-validator | `services/cross-validator/` | Validation cross-pilier |
| vault-enrichment | `services/vault-enrichment/` | Enrichissement depuis vault |
| ingestion-pipeline | `services/ingestion-pipeline/` | Extraction documents |
| llm-gateway | `services/llm-gateway/` | Abstraction API Claude |
| ai-cost-tracker | `services/ai-cost-tracker/` | Tracking couts LLM |
| operator-isolation | `services/operator-isolation/` | Isolation multi-tenant |
| translation | `services/translation/` | Support multi-langue |
| process-scheduler | `services/process-scheduler/` | Scheduling process |
| seshat-bridge | `services/seshat-bridge/` | Bridge vers Seshat (re-export) |
| value-report-generator | `services/value-report-generator/` | Generation rapports valeur |
| team-allocator | `services/team-allocator/` | Allocation equipes |

---

CONNEXIONS ACTIVES
------------------

```
Mestor → Notoria : rtis-cascade importe notoria/engine.generateBatch()
Notoria → Jehuty : Signal NOTORIA_BATCH_READY + endpoint publishToJehuty
Notoria → Thot : gates.ts appelle validateFinancials() avant apply
Jehuty → Notoria : triggerNotoria (signal → recos SESHAT_OBSERVATION)
Seshat/Tarsis → Jehuty : signaux MARKET_SIGNAL + WEAK_SIGNAL_ALERT
Seshat/Tarsis → Notoria : auto-trigger sur signaux CRITICAL/HIGH
Feedback-loop → Notoria : auto-trigger sur drift severe
Feedback-loop → Jehuty : SCORE_IMPROVEMENT/DECLINE dans le feed
Artemis diagnostics → Jehuty : KnowledgeEntry(DIAGNOSTIC_RESULT)
Vault → Notoria : cree des Recommendation rows (source=VAULT)
Auto-filler → Thot : valide benchmarks financiers
Scorer → Jehuty : signaux de drift
Bible → Gateway : validateAgainstBible() a chaque ecriture
```

---

VERROUS DE SECURITE
-------------------

1. **Pillar Gateway (LOI 1)** : tout write pilier passe par le Gateway
2. **Bible (verrou format)** : validateAgainstBible() bloque les violations AI
3. **Zod (verrou type)** : validatePillarPartial() verifie les types
4. **Confidence gates** : confiance < 0.5 → requires_review
5. **Thot (verrou financier)** : validateFinancials() bloque les incoherences budget
6. **LOCKED status** : seul OPERATOR peut modifier un pilier LOCKED

---

FICHIERS DE GOUVERNANCE (CODE)
------------------------------

Chaque cerveau a un fichier `governance.ts` qui importe et expose ses services :

| Fichier | Services gouvernes |
|---------|-------------------|
| `services/mestor/governance.ts` | 8 services |
| `services/artemis/governance.ts` | 21 services |
| `services/seshat/governance.ts` | 15 services |
| `services/financial-brain/governance.ts` | 5 services |
| `services/neteru-shared/governance-registry.ts` | Registre central (66 services mappes) |

API du registre :
- `getGovernor("campaign-manager")` → `"ARTEMIS"`
- `getGovernedServices("SESHAT")` → `["knowledge-capture", ...]`
- `auditGovernance()` → `{ assigned: 66, unassigned: [] }`

---

SERVEURS MCP (8)
-----------------

| Serveur | Fichier | Outils/Resources |
|---------|---------|------------------|
| creative | `mcp/creative/` | 23 tools + 7 resources (glory, brand assets, guidelines) |
| intelligence | `mcp/intelligence/` | 17 tools + 6 resources (knowledge graph, scoring, drift) |
| operations | `mcp/operations/` | Operations automation |
| pulse | `mcp/pulse/` | Real-time metrics |
| seshat | `mcp/seshat/` | 17 tools (benchmarks, references, trends) |
| artemis | `mcp/artemis/` | Framework execution |
| guild | `mcp/guild/` | Guild management |
| notoria | `mcp/notoria/` | 3 resources (recommendations, batches, pipeline) |

---

MODELES PRISMA (116)
--------------------

Repartis par domaine :
- **Strategie/Piliers** (8) : Strategy, Pillar, PillarVersion, BrandVariable, VariableHistory, ScoreSnapshot, BrandOSConfig, VariableStoreConfig
- **Campagnes** (18) : Campaign, CampaignAction, CampaignExecution, CampaignAmplification, etc.
- **Missions/Livrables** (5) : Mission, MissionDeliverable, DeliverableTracking, QualityReview, MissionTemplate
- **Talents/Createurs** (8) : TalentProfile, TalentReview, TalentCertification, GuildOrganization, etc.
- **CRM/Clients** (8) : Client, Deal, Contract, Escrow, FunnelMapping, etc.
- **Contenu** (6) : BrandAsset, GloryOutput, SequenceExecution, EditorialArticle, etc.
- **Social/Media/PR** (8) : SocialConnection, SocialPost, MediaPlatformConnection, PressRelease, etc.
- **Intelligence** (6) : Signal, KnowledgeEntry, MarketStudy, InsightReport, CompetitorSnapshot, etc.
- **Scoring/Devotion** (4) : CultIndexSnapshot, DevotionSnapshot, CommunitySnapshot, SuperfanProfile
- **Finance** (6) : Commission, PaymentOrder, BudgetLine, AICostLog, etc.
- **Notoria/Jehuty** (3) : Recommendation, RecommendationBatch, JehutyCuration
- **Intake/Ingestion** (3) : QuickIntake, BrandDataSource, OrchestrationPlan
- **Infrastructure** (10+) : User, Account, Session, Operator, Process, Notification, etc.

---

Fin du document.


# LLM Cost Model — La Fusée

Les paramètres budgétaires `costP95Usd` par Intent kind ont pour source `src/server/governance/slos.ts` ; leurs valeurs ne se modifient pas dans ce document. `scripts/gen-code-map.ts` génère uniquement `CODE-MAP.md`, pas ce fichier. La prose de routage est maintenue séparément depuis les fonctions du Gateway.

Les tableaux, tarifs, valeurs nommées p95 et scénarios ci-dessous sont des **paramètres ou hypothèses historiques non revalidés** par cette correction documentaire. Ils ne constituent ni mesures p95 reçues, factures, quotas d’abonnement ou coût mensuel complet. Aucun SLO ou montant n’est modifié ici.

---

## Hypothèses tarifaires historiques (2026, non revalidées)

| Provider | Modèle | In ($/M tokens) | Out ($/M tokens) |
|---|---|---|---|
| Anthropic | claude-sonnet-4-6 | $3.00 | $15.00 |
| Anthropic | claude-opus-4-8 | $15.00 | $75.00 |
| OpenAI | gpt-4o | $5.00 | $15.00 |
| OpenRouter | (routing) | variable | variable |
| Ollama | local | $0.00 | $0.00 |

**Routage texte courant — autorisation opérateur Luna (2026-10-15)** : le relais OAuth privé `gpt-5.6-luna` est distinct de la clé API OpenAI réservée aux embeddings. Relais configuré et `LLM_PRIMARY_PROVIDER=openai` donnent un candidat texte unique, ou aucun si son circuit est indisponible ; aucun repli OpenRouter, autre modèle ou crédits API sur ce raccord. Le routage relève de [`buildTextProviderCandidates` et `resolveTextProviderOrder`](../../src/server/services/llm-gateway/index.ts), pas de `slos.ts` ni des lignes legacy `ModelPolicy`.

Budgets, Headroom, rate-policy, validation et ledger restent dans le gestionnaire existant. Le ledger qualifie l’estimation API équivalente du transport d’abonnement ; celle-ci reste distincte d’une facture et du quota réellement disponible. Cette correction ne reçoit aucune nouvelle CI/image/livraison ou qualité.

**Historique de routage** : l’ancienne cascade « Anthropic → OpenAI → Ollama → OpenRouter » renvoyait à ADR-0067/PR #258 ; elle ne décrit pas le raccord texte courant. [Décisions historiques et état courant](context/architecture_llm_decision.md).

---

## Paramètres historiques `costP95Usd` par Intent kind (non-zéro)

> Le nom `costP95Usd` désigne ici un paramètre de budget hérité ; aucune mesure du percentile en conditions réelles n’est reçue par ces tableaux.

### Mission Tier — Propulsion

| Intent kind | Sous-système | Coût p95 |
|---|---|---|
| `FILL_ADVE` | Artemis | $0.25 |
| `RUN_RTIS_CASCADE` | Artemis | $0.60 |
| `RUN_ORACLE_SEQUENCE` | Artemis | $0.50 |
| `GENERATE_ORACLE_SECTION` | Artemis | $0.10 |
| `ASSEMBLE_ORACLE` | Artemis (orchestrateur) | $1.00 |
| `MORNING_BRIEF_BATCH_PREVIEW` | Artemis | $0.50 |
| `GENERATE_RECOMMENDATIONS` | Artemis | $0.20 |
| `INVOKE_GLORY_TOOL` | Artemis | $0.10 |
| `EXECUTE_GLORY_SEQUENCE` | Artemis | $1.50 |
| `ENRICH_ORACLE` *(legacy)* | Artemis | $0.80 |
| `EXPORT_ORACLE` | Artemis | $0.40 |
| `LIFT_INTAKE_TO_STRATEGY` | Artemis | $0.50 |
| `RUN_QUICK_INTAKE` | Artemis | $0.15 |
| `RUN_BOOT_SEQUENCE` | Artemis | $1.00 |

### Mission Tier — Forge (Ptah)

| Intent kind | Sous-système | Coût p95 |
|---|---|---|
| `PTAH_MATERIALIZE_BRIEF` | Ptah | $0.50 |
| `COMPOSE_DELIVERABLE` | Ptah/Artemis | $0.30 |

### Ground Tier — Telemetry (Seshat)

| Intent kind | Sous-système | Coût p95 |
|---|---|---|
| `SESHAT_HARVEST_REFERENCE` | Seshat/Argos | $0.15 |

---

## Couverture $0 (déterministe)

Les Intent kinds suivants ont `costP95Usd: 0` parce qu'ils n'appellent **aucun LLM** :

- Tous les CALC tools (ex. `talent-evaluator`, `broadcast-scheduler`, `bain-nps-calculator`, `cult-index-scorer`)
- Tous les COMPOSE tools (ex. `bcg-portfolio-plotter`, `production-budget-optimizer`)
- Mutations Prisma pures : `OPERATOR_AMEND_PILLAR` (modes PATCH_DIRECT), `GUILD_POST_MISSION`, `GUILD_REGISTER_TALENT`, `GUILD_REGISTER_ORGANIZATION`, `GUILD_PUBLISH_MISSION`
- Scoring ADVE structurel : `STRUCTURAL_WEIGHTS` dans `src/lib/utils/scoring.ts` (zéro LLM garanti par `scoring-base-canon.test.ts` HARD)
- Cascade Yggdrasil gates (Mestor pre-flight) : déterministe
- Payment / subscription : `INIT_MANUAL_SUBSCRIPTION`, `APPROVE_MANUAL_SUBSCRIPTION`
- Toutes les intents LEGACY de la section `slos.ts:458-613`

---

## Scénarios mensuels historiques (hypothèses non revalidées)

### Onboarding one-time (première activation)

| Opération | Coût p95 |
|---|---|
| `RUN_QUICK_INTAKE` | $0.15 |
| `LIFT_INTAKE_TO_STRATEGY` | $0.50 |
| `FILL_ADVE` (ADVE complet) | $0.25 |
| `RUN_RTIS_CASCADE` (RTIS dérivé) | $0.60 |
| `ASSEMBLE_ORACLE` (35 sections) | $1.00 |
| **Total onboarding** | **~$2.50** |

> L'Oracle complet peut aussi être assemblé via 35 × `GENERATE_ORACLE_SECTION` = 35 × $0.10 = $3.50 (chemin manuel section-par-section — plus coûteux mais granulaire).

### Client actif mensuel (utilisation typique)

| Opération | Fréquence / mois | Coût unitaire | Coût mensuel |
|---|---|---|---|
| `INVOKE_GLORY_TOOL` | 20 runs | $0.10 | $2.00 |
| `GENERATE_RECOMMENDATIONS` | 4 runs | $0.20 | $0.80 |
| `MORNING_BRIEF_BATCH_PREVIEW` | 4 runs | $0.50 | $2.00 |
| `GENERATE_ORACLE_SECTION` (refresh stale) | 10 sections | $0.10 | $1.00 |
| `PTAH_MATERIALIZE_BRIEF` | 5 briefs | $0.50 | $2.50 |
| **Total mensuel actif** | | | **~$8.30** |

### Par campagne (activation complète)

| Opération | Coût p95 |
|---|---|
| `EXECUTE_GLORY_SEQUENCE` (séquence complète) | $1.50 |
| `COMPOSE_DELIVERABLE` | $0.30 |
| `SESHAT_HARVEST_REFERENCE` × 5 | $0.75 |
| **Total campagne** | **~$2.55** |

---

## Invariants à respecter

1. **Zéro LLM dans le chemin de scoring** — Loi 3 APOGEE (Conservation carburant). Test HARD `scoring-base-canon.test.ts`.
2. **Zéro LLM dans les COMPOSE/CALC tools** — déterministe par définition.
3. **`ASSEMBLE_ORACLE` orchestrateur** (coût $1.00) = délègue à 35 × `GENERATE_ORACLE_SECTION` ($0.10 chacune) — le coût p95 de l'orchestrateur est le worst-case agrégé, pas un double-comptage.
4. **HYBRID tools** — `manualFormSchema = outputSchema` (ADR-0060). Le path manuel ($0.00) est toujours disponible ; le LLM n'est appelé que si l'opérateur choisit le mode automatique.
5. **Headroom** — le LLM Gateway intègre un coupe-circuit `HEADROOM_DISABLED` (PR #258) qui peut désactiver les appels LLM en cas de dépassement de budget. Cf. `src/server/services/llm-gateway/headroom.ts`.

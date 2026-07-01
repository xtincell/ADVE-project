# Cycle de vie d'une campagne — « Wrap Croustillant » (Burger King)

> Analyse NEFER — 2026-06-28. On déroule le cycle de vie complet d'une campagne réelle
> (BK lance un nouveau wrap croustillant), **de l'idée au bilan**, et on confronte chaque
> étape à ce que le système fait *réellement* aujourd'hui (preuves `fichier:ligne`) pour
> **déduire les étapes/outils manquants**.
>
> Référence ne rien oublier : la doctrine attendue est « tout ce qui n'est PAS net-new est
> **déterministe** (projection de l'ADVE), le LLM n'intervient QUE pour croiser une
> **intention nouvelle** × ADVE (via RAG) → brief **validé** → pipeline déterministe →
> **résultats ingérés** qui mettent à jour l'ADVE canonique ; Seshat tient une **base de
> données** de bureau d'étude, pas un tas de JSON ».

Légende : ✅ EXISTS · 🟡 PARTIAL · ❌ MISSING.

---

## Le récit (BK Wrap Croustillant)

1. **Idée** — un chef produit BK veut lancer un wrap croustillant low-price pour capter le
   créneau snack nomade des 18-25 ans face à un concurrent.
2. **Cadrage** — on croise l'intention avec la réalité de marque (BK = flame-grilled,
   irrévérence, « Have it your way ») pour produire un **brief validé**.
3. **Plan** — le brief devient un plan de campagne : TV/OOH (ATL), social/influence (TTL),
   sampling en restaurant (BTL), CRM/app.
4. **Projets** — chaque action retenue → campagne + mission de production (déterministe).
5. **Production** — KV, film 20s, OOH, assets social, PLV magasin.
6. **Diffusion** — achat média (Meta/TikTok/Google), influence, activation terrain.
7. **Live** — suivi reach/ventes/sentiment/superfans en temps réel.
8. **Bilan** — rapport + apprentissages → **mise à jour de l'ADVE** (le wrap devient un SKU
   permanent ; le claim qui a marché entre dans le pilier D).
9. **Soutien continu** — Seshat tient l'étude de marché (prix concurrents, tendances).

---

## Étape par étape : ce qui existe vs. ce qui manque

### Étape 0 — Capter l'intention (insight / opportunité / envie)

| | Statut | Preuve |
|---|---|---|
| Entité « Intention / Opportunité » de premier rang | ❌ MISSING | aucun `model Intention/Opportunity/Insight` dans `prisma/schema.prisma` (`InsightReport` est une **sortie** de reporting, pas une entrée) |
| Front-doors existants détournés à cet usage | 🟡 PARTIAL | `actions.propose` (`actions.ts:94`), Morning Batch (`MORNING_BRIEF_BATCH_PREVIEW`), QuickIntake (onboarding marque neuve, pas intention intra-marque) |

**Trou → Outil manquant n°1 : `Intention` (modèle + intake).** Une entité canonique qui capte
« je veux lancer X » avec un *type* (PRODUCT_LAUNCH / REPOSITION / MARKET_ENTRY / CAMPAIGN…),
un statut de cycle de vie, et un lien vers le brief généré. Sans elle, l'opérateur improvise
(crée une campagne à la main, ou passe par Morning Batch). C'est le **point d'entrée n°1 de la
valeur** (cf. PROPAGATION-MAP) et il n'est pas modélisé.

### Étape 1 — Croiser l'intention × ADVE (RAG) → brief **validé**

| | Statut | Preuve |
|---|---|---|
| Génération brand-aware d'actions (LLM × ADVE) | 🟡 PARTIAL | `proposeBrandActions` fetch l'ADVE via `buildBrandContextSummary` (`artemis/action-db/propose.ts:77`) — mais sur *actions*, pas un *brief* depuis une *intention* |
| RAG sur l'ADVE | 🟡 PARTIAL | 3 mécanismes non unifiés : `resolveEffectivePillars` (`brand-node/inheritance.ts:92`), `BrandContextNode` + embeddings, source-RAG (`vault-enrichment/source-rag.ts:39`) |
| Gate cohérence brief↔ADVE | 🟡 ADVISORY | `briefVsAdveCoherenceGate` déterministe **WARN non-bloquant** (`mestor/gates/brief-vs-adve-coherence.ts`) ; BLOCK = Phase 24 (ADR-0103) |
| État « brief VALIDÉ » (machine à états) | ❌ MISSING | `CampaignBrief.status` est une string libre ; pas de cycle DRAFT → AI_PROPOSED → VALIDATED → LOCKED |

**Trous → Outils manquants :**
- **n°2 : Intent `GENERATE_BRIEF_FROM_INTENTION`** — orchestre RAG(ADVE) → `executeStructuredLLMCall` → gate cohérence → brief candidat. C'est la **seule porte LLM légitime** du cycle ; aujourd'hui éclatée entre `proposeBrandActions` (actions) et `campaign-plan-generator` (plan), sans déclencheur « intention ».
- **n°3 : RAG unifié `fetchBrandContext(strategyId, query?)`** — un seul récupérateur de contexte ADVE (les 3 mécanismes actuels sont rollés à la main par chaque consommateur).
- **n°4 : cycle de vie `BriefStatus` + gate BLOCK** — un brief ne devient *canonique* qu'après PASS coherence (durcir l'advisory en bloquant, Phase 24 #14).

### Étape 2 — Brief → plan de campagne (décomposition)

| | Statut | Preuve |
|---|---|---|
| Décomposition brief → phases/canaux/budget | 🟡 PARTIAL (LLM) | `campaign-plan-generator` (`index.ts:83`) : `callLLM` legacy + fallback déterministe `buildFallbackPlan` ; ne valide PAS la cohérence, n'émet PAS d'Intent, RAG = dump direct |
| Coût atomisé par marché | ✅ EXISTS | Thot `computeActionCost` déterministe (ADR-0093) |

**Trou → Outil manquant n°5 : décomposition de plan **déterministe-first**.** La structure d'un
plan (étages AARRR, mix ATL/BTL/TTL, split budget via Thot, calendrier) est largement
*dérivable* de l'ADVE + du catalogue d'actions + des coûts Thot. Le LLM ne devrait servir
qu'au *net-new* (un canal inédit). Aujourd'hui le plan est LLM-primary.

### Étape 3 — Brief → projets (campagne + mission)

| | Statut | Preuve |
|---|---|---|
| Action retenue → campagne + brief + mission | ✅ EXISTS (désormais déterministe + gouverné) | `strategy.generateProjectsFromActions` + `brief-builder.ts` (PR #347) — projection ADVE pure, zéro LLM, `governedProcedure` |

**Pas de trou** — c'est l'objet de la PR en cours. ✅

### Étape 4 — Production / Forge des livrables

| | Statut | Preuve |
|---|---|---|
| Forge d'assets (Ptah : Magnific/Firefly/Figma/Canva) | ✅ EXISTS | services `ptah/`, Glory tools, `deliverable-forge` |
| Résolveur « quels livrables requiert cette action » | 🟡 PARTIAL | DAG `GloryToolForgeOutput.requires` existe pour la forge output-first, **pas câblé depuis les actions de campagne** |
| Livrable → BrandAsset (vault) | ✅ EXISTS | `publishAssetToBrandVault` (`campaign-manager.ts`) |

**Trou → Outil manquant n°6 : résolveur déterministe action→livrables-requis** (réutiliser le
DAG `requires` de la deliverable-forge depuis `CampaignAction`). La création créative reste
l'**exception LLM/humain légitime**.

### Étape 5 — Diffusion (média / influence / terrain)

| | Statut | Preuve |
|---|---|---|
| Achat média, broadcast, CRM (Anubis) | ✅ EXISTS (façades) | services `anubis/` + `CampaignAmplification` |
| Exécution réelle ad-networks | 🟡 DEFERRED | `DEFERRED_AWAITING_CREDENTIALS` (credential-gated, attendu) |

**Pas un trou de conception** — credential/contract-gated (connu).

### Étape 6 — Live / ingestion de la donnée de performance

| | Statut | Preuve |
|---|---|---|
| Saisie de métriques | 🟡 PARTIAL (manuel) | `updateAmplification`, `recordAARRMetric` — saisie opérateur, **pas d'ingestion auto** |
| Connecteur Tarsis (signaux secteur) | ✅ réel mais hors-cycle | `seshat/tarsis/connector.ts:64` (RSS réel, ADR-0100) — observationnel, pas branché aux résultats campagne |
| Connecteur CRM (cohortes) | 🟡 DEFERRED | `anubis/providers/crm-provider.ts:140` (`DEFERRED_AWAITING_CREDENTIALS`) |

**Trou → Outil manquant n°7 : pipeline d'ingestion de performance** (ad-platforms / POS-ventes /
social-listening → `CampaignAmplification`/AARRR), normalisé via Credentials Vault. Aujourd'hui
les chiffres entrent à la main ou sont `_mocked`.

### Étape 7 — Bilan → mise à jour de l'ADVE canonique (la boucle se ferme)

| | Statut | Preuve |
|---|---|---|
| Rapport / bilan | ✅ EXISTS (déterministe) | `generateFullReport` (`campaign-manager/index.ts`) — agrège budget/AARRR/jalons, zéro LLM |
| Réconciliation campagne → propositions ADVE | 🟡 PARTIAL | `reconcileCampaignToOracle` (`campaign-tracker/learnings.ts:47`) → `OperatorAmendPillarProposal[]` (propositions, pas mutations) |
| Enrichissement variable-bible | 🟡 PARTIAL | `enrichVariableBibleFromCampaign` (`learnings.ts:204`) → propositions |
| Nouveau SKU / claim permanent → pilier V/D | ❌ MISSING | aucun chemin canonique « le wrap est devenu un SKU » → `Strategy.offre`/V `produitsCatalogue` |
| Écriture ADVE = décision opérateur manuelle | ✅ PAR DESIGN | STOP-at-Jehuty (ADR-0085) : l'écriture ADVE reste **manuelle** via `OPERATOR_AMEND_PILLAR` |

**Nuance importante :** que la MAJ ADVE soit *manuelle* est **doctrine** (cascade STOP à Jehuty),
**pas un trou**. Le trou est que **l'ingestion qui prépare la proposition est incomplète** :
- **n°8 : promotion canonique « résultat → proposition ADVE »** branchée sur `OPERATOR_AMEND_PILLAR`
  (l'opérateur tranche), incluant le **nouveau SKU** (pilier V) et le **claim gagnant** (pilier D),
  avec la part *déterministe* (ventes, livrables produits = faits) séparée de la part LLM (lecture).
  Aujourd'hui les propositions s'affichent mais ne sont pas câblées en Intent prêt-à-valider.

### Étape 8 — Seshat : bureau d'étude (base de données, pas tas de JSON)

| | Statut | Preuve |
|---|---|---|
| Modèles relationnels (study/source/synthesis/competitor/benchmark/cost) | ✅ EXISTS | `MarketStudy`, `MarketSource`, `MarketSynthesis`, `CompetitorSnapshot`, `MarketBenchmark`, `MarketCostSnapshot` (`schema.prisma`) |
| Feeds RSS parsés en entités | ✅ EXISTS | `external-feeds/rss.ts` déterministe → `KnowledgeEntry` |
| Historique de prix par période | ✅ EXISTS | `MarketCostSnapshot` (ADR-0099), clé `(country,sector,metric,period)` |
| Données semi-structurées en JSON | 🟡 PARTIAL | `MarketSynthesis.findings`/`pillarImpact`, `CompetitorSnapshot.strengths/weaknesses` = blobs JSON ; `KnowledgeEntry.data` = JSON sans schéma par type |
| Surface de requête « bureau d'étude » | 🟡 PARTIAL | pas de console `/console/seshat/marketplace` ; pas de « liste concurrents / tendance prix 12 mois / provenance source » |
| `CompetitorSnapshot` rattaché à `MarketStudy` | ❌ MISSING | orphelin (pas de FK studyId) |

**Trous → Outils manquants :**
- **n°9 : surface de consultation Seshat** (`/console/seshat/marketplace`) — lister concurrents,
  historique de prix, recherche de sources, provenance. La base existe mais n'est **pas exposée**
  comme un vrai bureau d'étude consultable.
- **n°10 : durcir les JSON semi-structurés** (`findings`, `strengths/weaknesses`, `KnowledgeEntry.data`)
  vers des entités/colonnes requêtables là où c'est indispensable + FK `CompetitorSnapshot.studyId`.
  (« JSON seulement quand indispensable et encadré ».)

---

## Synthèse — les 10 trous, par priorité

| # | Trou | Type | Priorité | Note |
|---|------|------|----------|------|
| 1 | Entité `Intention/Opportunité` + intake | net-new front door | **P0** | point d'entrée n°1 de la valeur, non modélisé |
| 2 | Intent `GENERATE_BRIEF_FROM_INTENTION` (RAG×ADVE → brief) | LLM légitime | **P0** | la seule porte LLM du cycle |
| 4 | `BriefStatus` + gate cohérence **BLOCK** | gouvernance | **P0** | brief « validé » = canonique (Phase 24 #14) |
| 8 | Promotion « résultat → proposition ADVE » (SKU/claim) | boucle | **P1** | ferme la boucle ; reste manuel-final (Jehuty) |
| 7 | Pipeline ingestion de performance (ads/POS/social) | connecteurs | **P1** | credential-gated mais pipeline absent |
| 3 | RAG unifié `fetchBrandContext` | refacto | **P1** | dédoublonne 3 mécanismes |
| 5 | Décomposition de plan **déterministe-first** | déterminisme | **P1** | LLM réservé au net-new |
| 9 | Console « bureau d'étude » Seshat | surface | **P2** | la base existe, pas exposée |
| 6 | Résolveur action→livrables-requis | refacto | **P2** | réutiliser le DAG `requires` |
| 10 | Durcir JSON Seshat + FK competitor↔study | data-model | **P2** | « JSON seulement si indispensable » |

**Ce qui est déjà bon :** étape 3 (action→campagne→brief, déterministe+gouverné, PR #347),
étape 4 (forge), étape 7-bilan (`generateFullReport` déterministe), socle Seshat relationnel,
gateway LLM rate-limité par modèle (PR #347).

**Doctrine respectée à confirmer dans l'implémentation :** chaque trou comblé doit (a) garder le
*net-new* comme seule porte LLM, (b) tout le reste en projection déterministe de l'ADVE, (c) ne
jamais inventer de donnée (omettre + tracer, cf. `brief-builder` `meta.gaps`), (d) écriture ADVE
finale **manuelle** (STOP à Jehuty), (e) faciliter le diagnostic (trous tracés, pas masqués).

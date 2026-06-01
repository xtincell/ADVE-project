# CAHIER DE CHARGES — La Fusée (Industry OS)
# Version 5.0 — Architecture NETERU

**Version** : 5.0
**Date** : 9 avril 2026
**Auteur** : Alexandre "Xtincell" Djengue Mbangue × Claude Opus 4
**Base** : CdC v4.1 (restructuration) + refonte NETERU + bible des variables + code actuel
**Statut** : Document de référence — source de vérité pour le développement et la maintenance

---

## CHANGELOG VERSIONNÉ

| Version | Date | Auteur | Résumé |
|---|---|---|---|
| **5.0** | 2026-04-09 | Alexandre + Claude | Refonte complète : architecture NETERU (trio divin), LLM Gateway central, bible des variables 134/134, Pillar Gateway (LOI 1), GLORY sous Artemis, Oracle = livrable |
| 4.1 | 2026-04-08 | Alexandre + Claude | I=Innovation S=Strategy, cascade ADVERTIS, variables de transition, Fenêtre d'Overton comme fil rouge, 12 chantiers |
| 4.0 | 2026-04-08 | Alexandre + Claude | Restructuration profonde : audit 33 flaws, Pillar Gateway, scorer unifié, 4 protocoles RTIS, essaim MESTOR |
| 2.1 | 2026-03-23 | Alexandre + Claude | CdC Industry OS initial (3 parties, 5 annexes) |
| 1.0 | 2026-03 | Alexandre | Architecture initiale v3 |

### Changements v4.1 → v5.0

1. **NETERU** — Architecture fondamentale renommée. Trois Neter égaux (Mestor, Artemis, Seshat) remplacent la hiérarchie "Mestor chapeaute tout"
2. **LLM Gateway** — Service technique central remplace la règle "seul Commandant appelle le LLM"
3. **GLORY sous Artemis** — Les 39 outils GLORY et 31 séquences sont l'arsenal d'Artemis, pas un service séparé
4. **Oracle = livrable** — L'Oracle est le produit stratégique high-ticket, pas le nom du moteur
5. **SESHAT avec TARSIS** — TARSIS est le radar de SESHAT, pas un système indépendant
6. **Bible des variables** — 134/134 variables documentées avec format de fond, règles, exemples
7. **Annuaire des variables** — Page Console pour inspecter toutes les variables
8. **Design system** — field-renderers.tsx avec renderers automatiques par type
9. **Vault enrichment** — Pipeline 2 étapes (cross-pilier déterministe + LLM ciblé)
10. **Imports circulaires** — Résolus via neteru-shared comme module dual-citizen

---

## TABLE DES MATIÈRES

1. [VISION — L'Industry OS](#1-vision)
2. [ARCHITECTURE NETERU — Le Trio Divin](#2-neteru)
3. [LA METHODE ADVERTIS — Les 8 Piliers](#3-advertis)
4. [LES 10 LOIS — Principes directeurs](#4-lois)
5. [INFRASTRUCTURE TECHNIQUE](#5-infrastructure)
6. [LES 4 PORTAILS](#6-portails)
7. [SYSTEMES METIER](#7-metier)
8. [BIBLE DES VARIABLES](#8-bible)
9. [ETAT D'IMPLEMENTATION](#9-etat)
10. [ROADMAP & MAINTENANCE](#10-roadmap)

---

## 1. VISION — L'Industry OS {#1-vision}

### 1.1 Le problème

Aucune structure de classe mondiale ne sert correctement le marché créatif en Afrique francophone.

Les groupes internationaux (Havas, Publicis, WPP) maintiennent des bureaux à Abidjan, Douala, Dakar — des boîtes aux lettres. Leurs méthodologies (Meaningful Brands, BrandZ) restent à Paris ou Londres. Les équipes locales exécutent sans framework. Le client africain reçoit un service de tier 3 au prix du tier 1.

Les agences locales ont du talent, de l'intuition, de la débrouillardise. Mais rien de codifié, rien de reproductible, rien de mesurable. Chaque projet est un artisanat. C'est ce qui empêche le marché de scaler, de professionnaliser, de facturer à sa vraie valeur.

Le freelance créatif reçoit des briefs vagues, est payé au lance-pierres, n'a aucune visibilité sur sa prochaine mission, et n'a aucun pouvoir de négociation. Le DA dans une agence sous-dimensionnée porte la vision créative de 8 clients en même temps sans méthode formalisée. Le chef de marque jongle entre prestataires qui ne se parlent pas, reçoit des livrables incohérents, et ne peut pas prouver la valeur de son budget com auprès de sa direction.

La Fusée est la réponse : un Industry OS pour le marché créatif africain, propulsé par l'agence **UPgraders** — la colonne vertébrale technologique qui structure, mesure et accélère toute la chaîne de valeur.

### 1.2 UPgraders — L'agence

**UPgraders** est l'agence qui a construit et propulse La Fusée. Elle apporte la méthodologie ADVE-RTIS, l'expertise terrain, et la vision produit.

### 1.3 La Fusée — L'Industry OS

La Fusée est l'Industry OS du marché créatif africain. 4 portails, 4 audiences :

```
                    ┌──────────────────────┐
                    │   CONSOLE (Fixer)    │  ← UPgraders : contrôle le réseau
                    │   9 divisions, 49p   │
                    └──────────┬───────────┘
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │   AGENCY     │  │   CREATOR    │  │   COCKPIT    │
     │   Agences    │  │   Freelances │  │   Marques    │
     └──────────────┘  └──────────────┘  └──────────────┘
```

### 1.4 North Star — Le Superfan

La North Star de l'Industry OS est le **superfan** (évangéliste dans la Devotion Ladder). La **Fenêtre d'Overton** (ce que le marché considère comme "normal" pour une marque) est le levier stratégique central. Toute action, toute campagne, tout livrable sert à déplacer cette fenêtre pour accumuler des superfans.

---

## 2. ARCHITECTURE NETERU — Le Trio Divin {#2-neteru}

### 2.1 Le concept

NETERU = les forces divines de l'Égypte ancienne (pluriel de Neter). Trois entités **complémentaires et égales** qui propulsent l'Industry OS.

```
┌──────────────────────────────────────────────────────────┐
│                      NETERU                              │
│                (Le Trio Divin)                            │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   MESTOR     │  │   ARTEMIS    │  │   SESHAT     │   │
│  │  Neter de    │  │  Neter du    │  │  Neter de    │   │
│  │  la Décision │  │  Protocole   │  │ l'Observation│   │
│  │              │  │              │  │              │   │
│  │ Commandant   │  │ 24 Frameworks│  │ Références   │   │
│  │ Insights     │  │ GLORY (39    │  │ Knowledge    │   │
│  │ RTIS Cascade │  │  tools, 31   │  │ TARSIS       │   │
│  │              │  │  séquences)  │  │  (radar)     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │        NETERU-SHARED (dual-citizen)              │    │
│  │  8× Directeurs de Pilier + Hyperviseur           │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │            LLM GATEWAY (technique)               │    │
│  │  Retry, cost tracking, model selection            │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │           PILLAR GATEWAY (écriture)              │    │
│  │  Version, staleness, scoring, transaction         │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### 2.2 MESTOR — Neter de la Décision

Le cerveau stratégique. Swarm LLM avec conscience collective.

| Agent | Rôle | LLM ? |
|---|---|---|
| **Commandant** | Interface humaine, recos ADVE, assist GLORY, insights, scénarios | OUI (via LLM Gateway) |
| **Hyperviseur** | Plan d'orchestration, consultation Directeurs, exécution | NON (déterministe) |
| **Insights** | Alertes proactives (staleness, cohérence, SLA, drift) | OUI (via LLM Gateway) |
| **RTIS Cascade** | Génération R, T, I, S depuis ADVE | OUI (via LLM Gateway) |

**Services :** `src/server/services/mestor/`
- `commandant.ts` — Décisions stratégiques LLM
- `hyperviseur.ts` — Orchestration déterministe + persistance
- `rtis-cascade.ts` — Cascade ADVERTIS R→T→I→S
- `insights.ts` — Alertes proactives

### 2.3 ARTEMIS — Neter du Protocole

La protocolaire. Exécute les protocoles, séquences, diagnostics. GLORY est son **arsenal**, pas un service séparé.

| Composant | Rôle |
|---|---|
| **24 Frameworks diagnostiques** | Analyse structurée par couche (IDENTITY→SURVIVAL) |
| **39 Outils GLORY** | Tools atomiques (CR, DC, HYBRID, BRAND) |
| **31 Séquences GLORY** | Orchestrations d'outils (PILLAR, PRODUCTION, STRATEGIC, OPERATIONAL) |
| **Sequence Executor** | Exécution step-by-step, bindings, context injection |
| **Deliverable Compiler** | Assemblage des outputs en livrables (PDF, HTML, JSON) |

**Services :** `src/server/services/artemis/`
- `index.ts` — Frameworks diagnostiques
- `tools/registry.ts` — 39 outils GLORY
- `tools/sequences.ts` — 31 séquences
- `tools/engine.ts` — Exécution d'outils
- `tools/sequence-executor.ts` — Exécution de séquences
- `tools/deliverable-compiler.ts` — Compilation de livrables

### 2.4 SESHAT — Neter de l'Observation

L'observateur archiviste. Connaissance rétrospective + prédiction.

| Composant | Rôle |
|---|---|
| **Références** | Benchmarks, case studies, best practices (KnowledgeEntry) |
| **TARSIS** (radar) | Signaux faibles, chaînes causales, market intelligence |

**Services :** `src/server/services/seshat/`
- `index.ts` — Exports
- `references.ts` — Query KG + enrichissement
- `tarsis/index.ts` — Market intelligence orchestrator
- `tarsis/signal-collector.ts` — Collecte de signaux
- `tarsis/weak-signal-analyzer.ts` — Analyse causale

### 2.5 NETERU-SHARED — Modules dual-citizen

Partagés entre Mestor (planification) et Artemis (validation/exécution).

| Module | Mestor l'utilise pour... | Artemis l'utilise pour... |
|---|---|---|
| **8× Directeurs de Pilier** | Évaluer la santé, planifier | Valider avant exécution, gater les séquences |
| **Hyperviseur** | Construire le plan d'orchestration | Recommander les séquences à exécuter |

**Services :** `src/server/services/neteru-shared/`
- `pillar-directors.ts` — 8 gardiens (maturity gate, writeback validation)
- `hyperviseur.ts` — Recommandations de séquences

### 2.6 L'ORACLE — Le Livrable (pas le moteur)

L'Oracle est **THE livrable** high-ticket one-shot. La séquence de conversion qui transforme le client en retainer. C'est un produit, pas le moteur.

Le moteur s'appelle **NETERU**. L'Oracle est un livrable qui compile plusieurs séquences GLORY → HTML partageable + export PDF.

---

## 3. LA METHODE ADVERTIS — Les 8 Piliers {#3-advertis}

### 3.1 L'acronyme = l'ordre d'exécution

```
A → D → V → E → R → T → I → S = ADVERTIS
Chaque pilier puise dans le précédent.
```

| Pilier | Nom | Question | Input |
|---|---|---|---|
| **A** | Authenticité | Qui êtes-vous vraiment ? | Premier (saisie humaine) |
| **D** | Distinction | Pourquoi vous et pas un autre ? | A |
| **V** | Valeur | Que promettons-nous au monde ? | A + D |
| **E** | Engagement | Comment créer la dévotion ? | A + D + V |
| **R** | Risk | Quels sont nos angles morts ? | ADVE |
| **T** | Track | Que dit la réalité ? | ADVE + R |
| **I** | Innovation | Quel est notre potentiel total ? | ADVE + R + T |
| **S** | Strategy | Que choisit-on de faire ? | ADVE + R + T + I |

### 3.2 Sémantique critique

- **I = Innovation** (pas Implementation). Le potentiel TOTAL de la marque — tout ce qu'elle peut faire, être, devenir.
- **S = Strategy** (pas Synthèse). La roadmap qui PIOCHE dans I pour sélectionner les actions, campagnes, livrables.
- **S pioche dans I**. Tu ne peux pas choisir (S) avant de savoir ce qui est possible (I).
- **L'Oracle** est un livrable, pas un pilier ni un moteur.

### 3.3 Scoring /200

```
Score pilier = (atomes_valides / atomes_requis × 15)
             + (collections_complètes / collections_totales × 7)
             + (cross_refs_valides / cross_refs_requises × 3)
Max 25/pilier. Composite /200. Déterministe (zéro LLM).
```

| Composite | Classification |
|---|---|
| 0 – 50 | ZOMBIE |
| 51 – 80 | FRAGILE |
| 81 – 120 | ORDINAIRE |
| 121 – 160 | FORTE |
| 161 – 180 | CULTE |
| 181 – 200 | ICONE |

### 3.4 Maturity Gates

| Stage | Signification |
|---|---|
| EMPTY | Aucun contenu |
| INTAKE | Minimum viable (Quick Intake) |
| ENRICHED | Cross-pilier + RTIS cascade |
| COMPLETE | Tous les champs requis (prêt pour GLORY) |

### 3.5 Cascade RTIS et boucle de feedback

```
ADVE (saisie humaine)
  ↓
R (diagnostic ADVE) → T (confrontation réalité)
  ↓
R+T → Recommandations ADVE (Commandant décide)
  ↓
WAIT_HUMAN (opérateur accepte/rejette)
  ↓
I (potentiel total) → S (roadmap → superfan)
```

---

## 4. LES 10 LOIS — Principes directeurs {#4-lois}

### LOI 1 — Un seul chemin d'écriture pilier
> Tout système qui modifie `pillar.content` passe par le **Pillar Gateway**.
> Le Gateway version, propage la staleness, re-score, et respecte le validationStatus.

### LOI 2 — Un seul scorer, déterministe
> Le score est une fonction pure du contenu et du contrat de maturité.
> Pas d'appel LLM dans le scoring. Le même contenu = le même score, toujours.

### LOI 3 — Un schema canonique par pilier
> Chaque pilier a UN SEUL schema Zod. NETERU, le scorer, et le frontend l'utilisent.

### LOI 4 — Les données inventées sont marquées
> Toute donnée produite par LLM porte `source: "ai_estimate"`.
> Toute donnée sourcée porte `source: "verified"` + `sourceRef`.

### LOI 5 — Un output doit avoir un effet
> Tout output (GLORY, ARTEMIS, Mestor) écrit dans un pilier via le Gateway,
> ou est déclaré "draft" en attente de validation.

### LOI 6 — L'orchestration est centralisée
> L'Hyperviseur (NETERU-SHARED) est le seul planificateur.

### LOI 7 — Chaque portail parle la langue de son utilisateur
> Le Cockpit parle marketing. Le Creator voit des missions et des gains.
> Seule la Console voit l'intégralité du système.

### LOI 8 — Chaque pilier RTIS a son propre protocole
> R, T, I, S ont chacun un service dédié dans `rtis-protocols/`.

### LOI 9 — Le LLM ne sert qu'à DÉCIDER
> Seuls les services qui font du jugement appellent le LLM (via le LLM Gateway).
> GLORY CALC/COMPOSE = déterministe. Scoring = déterministe.

### LOI 10 — Tout sert le déplacement de la Fenêtre d'Overton vers le superfan
> La Devotion Ladder est le KPI ultime. Le déplacement de la fenêtre est le mécanisme.

---

## 5. INFRASTRUCTURE TECHNIQUE {#5-infrastructure}

### 5.1 LLM Gateway

```
Service : src/server/services/llm-gateway/index.ts
Rôle    : Service TECHNIQUE central pour tous les appels LLM
LLM     : Oui (c'est le point de passage)
```

- Retry avec backoff exponentiel
- Cost tracking par strategy + caller
- Model selection (default: claude-sonnet-4-20250514)
- JSON extraction robuste (3 étapes)
- Exports : `callLLM()`, `callLLMAndParse()`, `extractJSON()`, `withRetry()`

### 5.2 Pillar Gateway

```
Service : src/server/services/pillar-gateway/index.ts
Rôle    : SEUL point d'écriture pour pillar.content (LOI 1)
LLM     : Non
```

Transaction Prisma : VALIDATE → GUARD → MERGE → VERSION → SCORE → STALE → PERSIST → SIGNAL → AUDIT

### 5.3 4 Protocoles RTIS

```
Service : src/server/services/rtis-protocols/{risk,track,innovation,strategy}.ts
Rôle    : Génération spécialisée de chaque pilier RTIS
LLM     : Hybride (scan déterministe + LLM ciblé)
```

### 5.4 Vault Enrichment

```
Service : src/server/services/vault-enrichment/index.ts
Rôle    : Scanner le vault BrandDataSource → recos par pilier
LLM     : Hybride (cross-pilier déterministe + LLM ciblé)
```

Pipeline : Cross-pilier dérivation (0 LLM) → LLM scan ciblé (1 appel) → pendingRecos

### 5.5 Bible des Variables

```
Service : src/lib/types/variable-bible.ts
Rôle    : Format de fond pour chaque variable atomique (134/134)
LLM     : Non (source de vérité statique)
```

### 5.6 Stack technique

- **Framework** : Next.js 15 (App Router, Turbopack)
- **Language** : TypeScript strict
- **DB** : PostgreSQL + Prisma ORM (~99 modèles)
- **API** : tRPC (~61 routers)
- **Auth** : NextAuth.js
- **UI** : React + Tailwind CSS (dark mode only)
- **LLM** : Claude Sonnet 4 (via @ai-sdk/anthropic)
- **Icons** : Lucide React

---

## 6. LES 4 PORTAILS {#6-portails}

### 6.1 Console (Fixer — UPgraders)

9 divisions, 49+ pages. Vision 360° sur tout l'écosystème.

| Division | Rôle |
|---|---|
| L'Oracle | Onboarding, diagnostics, boot sequence |
| Le Signal | Intelligence marché, signaux, attribution |
| L'Arène | Guilde, matching talents, organisations |
| La Fusée | Campagnes, GLORY tools, social, PR, media |
| Le Socle | Finance : commissions, contrats, escrow |
| L'Académie | Formation, certifications, boutique |
| Écosystème | Opérateurs, métriques, scoring |
| Config | Paramètres, seuils, templates, **annuaire des variables** |
| Messages | Messagerie interne |

### 6.2 Cockpit (Marques)

8 onglets pilier (1 par lettre ADVERTIS) + livrables + sources.

**ADVE (édition guidée)** : Identité, Positionnement, Offre, Expérience
**RTIS (gestion avancée)** : Diagnostic, Réalité Marché, Potentiel, Stratégie

Le Cockpit parle marketing (pas "pilier A score 17/25" mais "Identité — 68% complet").

### 6.3 Agency (Agences du réseau)

Vue filtrée par opérateur. Adapté par `agencyType` (COMMUNICATION, RP, MEDIA, etc.).

### 6.4 Creator (Freelances & talents)

Missions, QC, gains, progression, portfolio. Vecteur ADVE vivant recalculé à chaque mission.

---

## 7. SYSTEMES METIER {#7-metier}

### 7.1 Modèle Operator (multi-tenancy)

- `agencyType` : HOLDING, COMMUNICATION, RELATIONS_PUBLIQUES, MEDIA_BUYING, DIGITAL, EVENEMENTIEL, PRODUCTION, CUSTOM
- Hiérarchie parent→enfant (UPgraders = racine)
- `ClientAllocation` : un client peut être alloué à N agences avec rôles (LEAD, SUPPORT, SPECIALIST)

### 7.2 Talent Engine

- Vecteur ADVE vivant (recalculé sur mission COMPLETED)
- Matching multi-facteur : cosine similarity ADVE (40%) + spécialité canal (20%) + first-pass rate (15%) + portfolio (15%) + disponibilité (10%)
- Promotion automatique (cron daily évalue les critères par tier)
- `tierProcedure()` : guard côté serveur (pas UI-only)

### 7.3 Couche financière

- P&L par client (`financial-reconciliation/`)
- Budget requis sur mission
- Invoices liées aux strategies via commissions
- Spent par campaign calculé depuis les budget lines

### 7.4 Orchestration persistée

- Modèles Prisma : `OrchestrationPlan` + `OrchestrationStep`
- `persistPlan()`, `loadPlan()`, `resumePlan()` dans l'Hyperviseur
- Survit aux crashes et redéploiements

---

## 8. BIBLE DES VARIABLES {#8-bible}

### 8.1 Couverture

134/134 variables documentées (100%). Chaque variable a :
- `description` — ce que la variable représente
- `format` — le format de fond attendu (pas le type TS)
- `examples` — exemples concrets
- `rules` — règles métier (tirées de l'Annexe G)
- `derivedFrom` — si dérivable, d'où
- `feedsInto` — quels champs d'autres piliers en dépendent

### 8.2 Source de vérité

```
src/lib/types/variable-bible.ts  →  format de fond (description, règles)
src/lib/types/pillar-schemas.ts  →  format de forme (types Zod)
src/lib/types/pillar-maturity-contracts.ts  →  maturité (INTAKE/ENRICHED/COMPLETE)
```

### 8.3 Annuaire visuel

Page Console : `/console/config/variables`
- Liste toutes les variables avec filtre par pilier, type, required, documentée
- Click pour voir : schema Zod, bible, relations, exemples

---

## 9. ÉTAT D'IMPLEMENTATION {#9-etat}

### 9.1 Ce qui est FAIT

| Système | Status | Fichier principal |
|---|---|---|
| Pillar Gateway | ✅ Fonctionnel | `pillar-gateway/index.ts` |
| LLM Gateway | ✅ Fonctionnel | `llm-gateway/index.ts` |
| 4 Protocoles RTIS | ✅ Fonctionnel | `rtis-protocols/` |
| Scorer unifié | ✅ Déterministe | `advertis-scorer/` |
| MESTOR (Commandant, Hyperviseur) | ✅ Fonctionnel | `mestor/` |
| ARTEMIS (Frameworks + GLORY) | ✅ Fonctionnel | `artemis/` |
| SESHAT + TARSIS | ✅ Structure | `seshat/` |
| NETERU-SHARED | ✅ Dual-citizen | `neteru-shared/` |
| Vault Enrichment | ✅ 2-step pipeline | `vault-enrichment/` |
| Bible des variables | ✅ 134/134 | `variable-bible.ts` |
| Design system | ✅ Renderers automatiques | `field-renderers.tsx` |
| Réseau opérateurs | ✅ CRUD complet | `operator.ts` router |
| Talent Engine | ✅ Vecteur vivant + matching | `talent-engine/` |
| P&L par client | ✅ Fonctionnel | `financial-reconciliation/` |
| 8 pages pilier Cockpit | ✅ Fonctionnel | `/cockpit/brand/*` |
| Page Sources | ✅ CRUD | `/cockpit/brand/sources` |
| Annuaire variables | ✅ Read-only | `/console/config/variables` |
| Orchestration persistée | ✅ Modèles + API | `OrchestrationPlan` Prisma |
| ScoreBadge mode cockpit | ✅ % au lieu de /200 | `score-badge.tsx` |

### 9.2 Ce qui RESTE

| Item | Priorité | Effort |
|---|---|---|
| **Bible → prompt** : injecter `getFormatInstructions()` dans le vault-enrichment | P1 | S |
| **Prisma migrate** : push les nouveaux modèles en DB | P0 (deploy) | `prisma db push` |
| **9 routers Windows** : merge depuis machine Windows | P1 | Merge |
| **Design system pages non-cockpit** : Console, Agency, Creator | P2 | L |
| **SESHAT seeding réel** : benchmarks sectoriels en JSON | P2 | M |
| **TARSIS scanner réel** : sources externes | P2 | L |
| **CdC mise à jour annexes** : aligner Annexes A-H avec l'architecture NETERU | P2 | M |
| **2 erreurs TS mcp/artemis** : type casting | P3 | S |
| **Email reset password** | P3 | S |

---

## 10. ROADMAP & MAINTENANCE {#10-roadmap}

### 10.1 Règles de maintenance

1. **Toute modification de variable** → mettre à jour `variable-bible.ts` + `pillar-schemas.ts` + `pillar-maturity-contracts.ts`
2. **Tout nouvel outil GLORY** → ajouter dans `artemis/tools/registry.ts`, le contrat COMPLETE se met à jour automatiquement
3. **Tout nouvel appel LLM** → passer par `llm-gateway/` (jamais d'appel direct)
4. **Toute écriture pilier** → passer par `pillar-gateway/` (jamais de `db.pillar.update` direct)
5. **Tout changement d'architecture** → mettre à jour CE document (avec version incrémentée)

### 10.2 Numérotation des versions

```
MAJEURE.MINEURE
- MAJEURE : changement d'architecture (NETERU, cascade order, nouveau Neter)
- MINEURE : ajout de fonctionnalité, correction, enrichissement
```

Exemples :
- 5.0 → 5.1 : ajout de l'injection bible dans les prompts
- 5.1 → 5.2 : SESHAT seeding réel
- 5.x → 6.0 : nouveau Neter ou changement fondamental

### 10.3 Fichiers critiques (ne jamais modifier sans comprendre l'impact)

| Fichier | Impact si modifié |
|---|---|
| `pillar-schemas.ts` | Tous les renderers, le scorer, les contrats, les prompts |
| `variable-bible.ts` | Les prompts LLM, l'annuaire, les tooltips |
| `pillar-gateway/index.ts` | Toute écriture pilier |
| `llm-gateway/index.ts` | Tous les appels LLM |
| `advertis-vector.ts` | L'ordre de cascade, les dépendances, le scoring |
| `pillar-maturity-contracts.ts` | Les maturity gates, le scoring structural |

---

*"De la Poussière à l'Étoile" — propulsé par le Trio Divin NETERU.*

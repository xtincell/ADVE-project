# CAHIER DE CHARGES — RESTRUCTURATION PROFONDE LaFusée Industry OS
# Version 4.1 — "Un seul chemin, une seule vérité"

**Version** : 4.1
**Date** : 8 avril 2026
**Auteur** : Alexandre "Xtincell" Djengue Mbangue × Claude Opus 4
**Base** : Audit structural de la v3 (33 flaws identifiées, 12 mécanismes analysés)
**Statut** : Document directeur pour la restructuration

> **v4.1 CORRECTIF CRITIQUE** : Redéfinition de I (Innovation, pas Implementation)
> et S (Strategy, pas Synthèse). Ordre de cascade = ADVERTIS (A→D→V→E→R→T→I→S).
> Introduction des 4 protocoles RTIS dédiés + ontologie complète des variables
> avec variables de transition inter-piliers. Fenêtre d'Overton comme fil rouge.

---

## TABLE DES MATIÈRES

1. [DIAGNOSTIC — Pourquoi une restructuration](#1-diagnostic)
2. [PRINCIPES DIRECTEURS — Les 9 lois de la v4](#2-principes-directeurs)
3. [CHANTIER -1 — L'Ontologie Complète des Variables (FONDATION)](#chantier-minus-1)
4. [CHANTIER 0 — Ontologie RTIS : les 4 protocoles](#chantier-0)
5. [CHANTIER 1 — Le Pillar Gateway (un seul chemin d'écriture)](#3-chantier-1)
5. [CHANTIER 2 — Le Scorer Unifié](#4-chantier-2)
6. [CHANTIER 3 — Le Schema Canonique par pilier](#5-chantier-3)
7. [CHANTIER 4 — L'Orchestrateur Unifié (MESTOR + ARTEMIS + GLORY)](#6-chantier-4)
8. [CHANTIER 5 — Le Réseau d'Opérateurs (UPgraders → Agences)](#7-chantier-5)
9. [CHANTIER 6 — Le Talent Engine (vecteur vivant + matching réel)](#8-chantier-6)
10. [CHANTIER 7 — L'Intelligence Réelle (TARSIS + SESHAT)](#9-chantier-7)
11. [CHANTIER 8 — La Couche Financière (réconciliation)](#10-chantier-8)
12. [CHANTIER 9 — Les Portails Adaptés](#11-chantier-9)
13. [CHANTIER 10 — Fiabilité d'exécution](#12-chantier-10)
14. [PLAN D'EXÉCUTION — Phases et dépendances](#13-plan-dexécution)
15. [CRITÈRES D'ACCEPTATION](#14-critères-dacceptation)

---

## 1. DIAGNOSTIC

### 1.1 Résumé de l'audit

La v3 de LaFusée est une réalisation technique impressionnante : ~80 modèles Prisma, 50+ routers tRPC, 5 moteurs IA (Mestor, Glory, Artemis, Seshat, Tarsis), 49 pages Console, 4 portails. L'architecture intellectuelle ADVE-RTIS est originale et cohérente.

**Mais le système souffre de 3 maladies structurelles :**

**Maladie 1 — Chemins parallèles non-réconciliés.** 6 systèmes écrivent dans `pillar.content` avec des schemas différents, des stratégies de merge différentes, et sans coordination. Un seul (l'écriture manuelle via tRPC) version, propage la staleness, et re-score correctement.

**Maladie 2 — Hallucination présentée comme donnée.** Le pilier T (Track) prétend fournir des TAM/SAM/SOM et de la triangulation marché. En réalité, ces chiffres sont inventés par Claude. Le what-if est un template statique. L'intelligence marché est du LLM sans source. Le système donne une fausse confiance dans des données fictives.

**Maladie 3 — Architecture d'OS, exécution de prototype.** Les features existent en DB et en UI, mais les connexions entre systèmes sont souvent des stubs, des `.catch(() => {})`, ou des writes directs qui contournent la logique métier. Les 31 séquences GLORY produisent des outputs qui ne s'inscrivent nulle part. Le feedback loop ne boucle pas. L'escrow n'a pas de banque. Le matching n'a pas de vecteur.

### 1.2 Inventaire des flaws

**33 flaws identifiées** réparties en 3 catégories :

#### Architecture & Scoring (7 flaws P0-P1)
- T1 : Deux scorers concurrents (`scoreObject` vs `recalcScores`)
- T2 : Schemas I/S divergent entre RTIS et scorer sémantique
- T6 : Quality modulator non-déterministe (5s timeout Claude)
- T21 : Pas de transactions Prisma sur les cascades
- M1 : MESTOR et ARTEMIS écrivent les mêmes piliers sans coordination
- M2 : 5 sources génèrent I/S avec 5 schemas
- M3 : Hyperviseur et cascade RTIS non-coordonnés

#### Pipeline & Writeback (10 flaws P0-P2)
- T3 : Feedback loop ADVE←RTIS ne boucle pas
- T4 : `savePillar` reset `validationStatus: "DRAFT"`
- T5 : Merge superficiel écrase les données manuelles
- T7 : Staleness propagation cassée (writes directs)
- M4 : SESHAT toujours vide
- M5 : Market Intelligence = hallucination LLM
- M6 : Feedback loop = notification sans action
- M7 : Seule BRAND pipeline auto-apply
- M8 : ARTEMIS fire-and-forget avec `.catch(() => {})`
- M11 : Ingestion sans versionning ni propagation

#### Métier & Portails (16 flaws P1-P3)
- T8-T12 : Talent (matching sans vecteur, commission fallback, promotion manuelle, QC sans spécialité, portfolio décoratif)
- T13-T16 : Agency (pas de hiérarchie d'agences, pas de collab inter-agences, agence ne gère pas ses freelances)
- T17-T19 : Portails (vocabulaire fixer exposé au client, finances non-réconciliées, minTier UI-only)
- T20 : In-memory state sur serverless
- M9-M10, M12 : Scénarios mockés, QC sans brief, chat éphémère

---

## 2. PRINCIPES DIRECTEURS — Les 7 lois de la v4

Chaque décision technique dans ce document est guidée par ces principes. En cas de doute, ils tranchent.

### LOI 1 — Un seul chemin d'écriture pilier

> Tout système qui modifie `pillar.content` DOIT passer par le **Pillar Gateway**.
> Le Gateway version, propage la staleness, re-score, et respecte le validationStatus.
> L'écriture directe en DB (`db.pillar.upsert/update`) est **interdite** hors du Gateway.

### LOI 2 — Un seul scorer, déterministe

> Le score d'un pilier est une **fonction pure** de son contenu et de son contrat de maturité.
> Pas d'appel IA dans le scoring. Pas de timeout. Pas d'heuristique variable.
> Le même contenu produit toujours le même score.

### LOI 3 — Un schema canonique par pilier

> Chaque pilier a UN SEUL schema Zod qui est la source de vérité.
> MESTOR, ARTEMIS, GLORY, le scorer, et le frontend utilisent le même schema.
> Si un système génère du contenu, il doit respecter ce schema.
> **I = Innovation (le potentiel total). S = Strategy (la roadmap qui pioche dans I).**
> **L'ordre de cascade est ADVERTIS : A → D → V → E → R → T → I → S. Chaque pilier puise dans le précédent.**

### LOI 4 — Les données inventées sont marquées comme telles

> Toute donnée produite par un LLM sans source externe vérifiable porte un flag `source: "ai_estimate"`.
> Toute donnée provenant d'une source vérifiable porte `source: "verified"` + `sourceRef`.
> Le frontend distingue visuellement les deux.

### LOI 5 — Un output doit avoir un effet

> Un système qui produit du contenu (GLORY, ARTEMIS, Mestor) DOIT écrire dans un pilier via le Gateway,
> OU être explicitement déclaré comme "draft" en attente de validation opérateur.
> Pas de outputs orphelins qui restent dans une table sans impact.

### LOI 6 — L'orchestration est centralisée

> Un seul orchestrateur décide quoi exécuter et dans quel ordre.
> Pas de cascade RTIS d'un côté et d'Hyperviseur GLORY de l'autre.
> Pas de fire-and-forget. Tout est tracké, retryable, et supervisé.

### LOI 7 — Chaque portail parle la langue de son utilisateur

> Le Cockpit (marques) parle marketing, pas "Pilier A — Authenticité score 17/25".
> Le Creator (talents) voit des missions et des gains, pas des vecteurs ADVE.
> L'Agency (agences) voit ses clients et sa marge, pas le scoring interne.
> Seule la Console (UPgraders) voit l'intégralité du système.

### LOI 8 — Chaque pilier RTIS a son propre protocole

> R, T, S, I ne sont pas 4 prompts LLM interchangeables.
> Chacun a un protocole dédié avec ses propres inputs, sa logique métier,
> ses sources de données, et ses règles de validation.
> L'ordre de la cascade est **ADVERTIS (A→D→V→E→R→T→I→S)** et chaque protocole
> ne consomme que les piliers en amont (pas d'auto-référence, pas de circularité).

### LOI 9 — Le LLM ne sert qu'à DÉCIDER, pas à calculer ni composer

> Seul MESTOR appelle le LLM, et uniquement pour des **décisions stratégiques** :
> recommandations, arbitrages, jugements, enrichissements créatifs.
>
> Tout le reste est **déterministe** :
> - **CALC** : les outils GLORY de type calcul produisent des variables à partir de formules
> - **COMPOSE** : les outils GLORY de type composition assemblent des variables existantes
> - **Séquences** : composent leurs livrables en piochant dans les `outputSchema` de leurs outils
> - **Scoring** : fonction pure du contenu et du contrat (aucun appel LLM)
> - **QC automatisé** : règles structurelles, pas de jugement LLM
>
> Chaque outil GLORY MCP a un **framework de sortie connu** (`outputSchema` Zod)
> avec une liste bien définie de variables créées, liées au livrable.
> Les séquences sont des **frameworks mères** qui savent exactement quelles
> variables de sortie de quel outil exploiter pour se constituer.
>
> **Triangle d'exécution :**
> - MESTOR = DÉCISION (LLM, le cerveau)
> - GLORY CALC = CALCUL (déterministe, les maths)
> - GLORY COMPOSE + Séquences = COMPOSITION (déterministe, l'assemblage)

### LOI 10 — Tout sert le déplacement de la Fenêtre d'Overton vers le superfan

> La North Star de l'Industry OS est le **superfan** — l'évangéliste du culte de marque.
> La Fenêtre d'Overton (ce que le marché considère comme "normal" pour cette marque)
> est le levier stratégique central. **Toute action, toute campagne, tout livrable**
> n'a de sens que s'il contribue à déplacer cette fenêtre vers l'accumulation de superfans.
>
> Concrètement :
> - **A/D/V/E** définissent le culte (identité, différenciation, offre, rituels de dévotion)
> - **R** identifie ce qui **bloque** le déplacement de la fenêtre
> - **T** mesure **où est** la fenêtre aujourd'hui (perception réelle vs cible)
> - **S** trace **comment déplacer** la fenêtre → roadmap d'accumulation de superfans
> - **I** cartographie **tout ce qu'on peut faire** pour la déplacer
>
> La Devotion Ladder (spectateur → intéressé → participant → engagé → ambassadeur → évangéliste)
> est le KPI ultime. Le score composite /200 mesure la solidité de la machine à culte.
> Le déplacement de la fenêtre est le mécanisme. Le superfan est le résultat.

---

## CHANTIER -1 — L'Ontologie Complète des Variables {#chantier-minus-1}

> **Ce chantier est la fondation absolue.** Rien d'autre ne peut commencer tant que
> l'ontologie des variables n'est pas complète, cohérente, et partagée par tous les systèmes.
> Le Gateway (Chantier 1) ne sait pas quoi valider si les schemas sont incomplets.
> Le scorer (Chantier 2) ne sait pas quoi compter. Les protocoles RTIS (Chantier 0) ne savent
> pas quoi générer. GLORY ne sait pas quoi binder. Tout commence ici.

### -1.1 LE PROBLÈME FONDAMENTAL — La schizophrénie Strategy / Pillar

Les données les plus basiques d'une marque vivent dans **deux endroits non-connectés** :

| Donnée | Où elle vit AUJOURD'HUI | Qui la lit | Versionnée ? | Propage staleness ? |
|---|---|---|---|---|
| Nom de la marque | `Strategy.name` | Mestor, GLORY (via `_strategyName`), MCP, UI | Non | Non |
| Description | `Strategy.description` | Mestor, GLORY, UI | Non | Non |
| Secteur | `Strategy.businessContext.sector` | GLORY (global binding), Market Intel, Knowledge Graph | Non | Non |
| Pays / Marché | `Strategy.country` | TAM/SAM/SOM, benchmarks, GLORY | Non | Non |
| Business model | `Strategy.businessContext.businessModel` | Mestor prompts, pillar weights, channel modifiers | Non | Non |
| Positioning | `Strategy.businessContext.positioningArchetype` | Scoring weights, Mestor, GLORY | Non | Non |
| Nature de marque | `Strategy.brandNature` | Intake, channel weights | Non | Non |
| Canal principal | `Strategy.primaryChannel` | Drivers | Non | Non |
| Sales channel | `Strategy.businessContext.salesChannel` | Mestor, pillar weights | Non | Non |

**Aucune de ces données n'est dans un pilier.** Elles ne sont pas scorées, pas versionnées,
pas soumises à la maturity gate, et quand elles changent, rien ne se propage.

**Pendant ce temps**, GLORY tools bindent `brand_name` vers `a.noyauIdentitaire` — un paragraphe
de 100+ chars décrivant l'ADN — parce que le nom n'existe nulle part dans les piliers.
Et `language` est bindé vers `d.assetsLinguistiques.languePrincipale` — un champ qui **n'existe
pas** dans le schema Zod.

### -1.2 LA SOLUTION — Absorber les métadonnées dans les piliers

Les données de `Strategy` qui **décrivent la marque** doivent vivre dans les piliers.
`Strategy` ne conserve que les données **structurelles** (userId, operatorId, clientId, status).

#### Pilier A — Absorbe l'identité fondamentale

**Variables à AJOUTER au schema Zod :**

| Variable | Type | Source actuelle | Pourquoi dans A |
|---|---|---|---|
| `nomMarque` | string (required) | Strategy.name | C'est l'identité la plus atomique. Tout part du nom. |
| `accroche` | string (optional) | N'existe pas | La phrase qui résume la marque en < 15 mots. Différent du slogan (D) qui est publicitaire. L'accroche est identitaire. |
| `description` | string (required) | Strategy.description | Ce que fait la marque, en 2-3 phrases. |
| `secteur` | string (required) | Strategy.businessContext.sector | Le secteur définit l'identité sectorielle. |
| `pays` | string (required) | Strategy.country | Le marché d'origine fait partie de l'identité. |
| `brandNature` | enum (required) | Strategy.brandNature | PRODUCT, SERVICE, FESTIVAL_IP, etc. — c'est ce que la marque EST. |
| `langue` | string (required) | N'existe pas | La langue principale de la marque. |

**Atomiques existants confirmés (déjà dans le schema, bien placés) :**
- `archetype` — correct
- `archetypeSecondary` — correct
- `citationFondatrice` — correct
- `noyauIdentitaire` — correct (mais ne doit PLUS servir de proxy pour le nom)

**Composites existants confirmés :**
- `ikigai` (4 quadrants) — correct
- `enemy` (8+ champs) — correct
- `prophecy` (4 champs) — correct
- `doctrine` (dogmas, principles, practices) — correct
- `livingMythology` (canon, rules, capture) — correct
- `equipeComplementarite` (score, couverture, verdict) — correct
- `timelineNarrative` (4 époques) — correct

**Collections existantes confirmées :**
- `valeurs` [3-7] (BrandValue avec Schwartz) — correct
- `herosJourney` [3-5] (HeroJourneyAct) — correct
- `hierarchieCommunautaire` [4-6] (CommunityLevel) — correct
- `equipeDirigeante` [1-10] (profils dirigeants) — correct

#### Pilier D — Ajouter la langue, confirmer le reste

**Variables à AJOUTER :**

| Variable | Type | Pourquoi |
|---|---|---|
| `assetsLinguistiques.languePrincipale` | string (required) | GLORY bind `language` vers ce champ. Il n'existe pas. |
| `assetsLinguistiques.languesSecondaires` | string[] (optional) | Marchés multilingues (Cameroun FR/EN, Maroc FR/AR). |

**Atomiques existants confirmés :** `positionnement`, `promesseMaitre` — corrects.

**Composites existants confirmés :**
- `tonDeVoix` (personnalite, onDit, onNeditPas) — correct
- `assetsLinguistiques` (slogan, tagline, motto, mantras, lexiquePropre) — correct + ajouts ci-dessus
- `directionArtistique` (11 sous-objets GLORY) — correct
- `lsiMatrix` — correct

**Collections existantes confirmées :**
- `personas` [2-5] — correct
- `paysageConcurrentiel` [3+] — correct
- `sousPromesses` [2+] — correct
- `sacredObjects`, `proofPoints`, `symboles` — corrects

#### Pilier V — Absorber le business model

**Variables à AJOUTER :**

| Variable | Type | Source actuelle | Pourquoi dans V |
|---|---|---|---|
| `businessModel` | enum (required) | Strategy.businessContext.businessModel | Le modèle d'affaires est la fondation de la valeur. |
| `economicModels` | enum[] (required) | Strategy.businessContext.economicModels | Comment la valeur est capturée. |
| `positioningArchetype` | enum (required) | Strategy.businessContext.positioningArchetype | Le positionnement prix (ULTRA_LUXE → LOW_COST). |
| `salesChannel` | enum (required) | Strategy.businessContext.salesChannel | DIRECT, INTERMEDIATED, HYBRID. |
| `freeLayer` | object (optional) | Strategy.businessContext.freeLayer | Pour freemium : { whatIsFree, whatIsPaid, conversionLever }. |

**Pourquoi V et pas A :** Le business model définit comment la marque crée et capture de la **valeur**. C'est la mécanique économique. L'identité (A) dit qui tu es. La valeur (V) dit comment tu monétises.

**Existants confirmés :** `produitsCatalogue`, `productLadder`, `unitEconomics`, `mvp`, `proprieteIntellectuelle`, 8 quadrants valeur/coût — tous corrects.

#### Pilier E — Ajouter les variables manquantes critiques

**Variables à AJOUTER :**

| Variable | Type | Pourquoi |
|---|---|---|
| `promesseExperience` | string (required) | L'équivalent du `promesseMaitre` de D pour l'engagement. "L'expérience que chaque interaction garantit." |
| `superfanPortrait` | object (required) | Le profil du superfan cible — qui est l'évangéliste visé ? Quel persona de D atteint ce stade ? |
| `superfanPortrait.personaRef` | string | Référence au persona de D qui a le plus haut `devotionPotential` |
| `superfanPortrait.motivations` | string[] | Ce qui pousse ce persona au stade évangéliste |
| `superfanPortrait.barriers` | string[] | Ce qui empêche la montée |
| `conversionTriggers` | array (required) | Qu'est-ce qui fait passer quelqu'un d'un niveau Devotion au suivant ? 1 trigger par transition. |
| `barriersEngagement` | array (required) | Qu'est-ce qui bloque la montée dans la Ladder ? 1 barrière par transition. |
| `communitySnapshot` | object (optional) | Taille actuelle, plateformes, taux d'engagement. Le modèle `CommunitySnapshot` existe en DB mais pas dans le schema E. |
| `primaryChannel` | enum (required) | Strategy.primaryChannel → le canal principal d'engagement. |

**Existants confirmés :** `touchpoints`, `rituels`, `aarrr`, `kpis`, `gamification`, `sacredCalendar`, `commandments`, `ritesDePassage`, `sacraments`, `taboos`, `principesCommunautaires` — tous corrects et riches.

#### Pilier R — Ajouter le lien Overton

**Variables à AJOUTER :**

| Variable | Type | Pourquoi |
|---|---|---|
| `overtonBlockers` | array (required) | Risques qui bloquent spécifiquement le déplacement de la Fenêtre d'Overton. Chaque item : `{ risk, blockingPerception, mitigation, devotionLevelBlocked }` |
| `devotionVulnerabilities` | array (optional) | À quel niveau de la Devotion Ladder la marque perd du monde ? `{ level, churnRate, cause, mitigation }` |

**Existants confirmés :** `globalSwot`, `microSWOTs`, `probabilityImpactMatrix`, `mitigationPriorities`, `riskScore` — corrects.

#### Pilier T — Ajouter la provenance + le positionnement Overton mesuré

**Variables à AJOUTER :**

| Variable | Type | Pourquoi |
|---|---|---|
| Chaque valeur quantitative porte `source` | `"ai_estimate" \| "verified" \| "calculated"` | LOI 4 — les données inventées sont marquées |
| `overtonPosition` | object (required) | Mesure de la position actuelle de la Fenêtre d'Overton. `{ currentPerception (text), marketSegments[] (qui pense quoi), measurementMethod, measuredAt, confidence }` |
| `perceptionGap` | object (required) | L'écart mesuré entre perception actuelle (T) et perception cible (A.prophecy + D.positionnement). C'est le KPI d'entrée de S. |

**Existants confirmés :** `triangulation`, `hypothesisValidation`, `tamSamSom`, `brandMarketFitScore`, `traction`, `weakSignalAnalysis`, `marketReality`, `marketDataSources` — corrects.

**Modification critique :** `tamSamSom.tam/sam/som` deviennent :
```typescript
tam: z.object({
  value: currency,
  description: textShort,
  source: z.enum(["ai_estimate", "verified", "calculated"]),
  sourceRef: z.string().optional(), // URL ou nom de la source
})
```

#### Pilier S — Renforcer la Fenêtre d'Overton comme cœur

**Variables à AJOUTER :**

| Variable | Type | Pourquoi |
|---|---|---|
| `fenetreOverton` devient **required** | — | Déjà prescrit dans le Chantier 0 |
| `fenetreOverton.strategieDeplacement[].devotionTarget` | DevotionLevel | Quel niveau de la Devotion Ladder cette étape cible |
| `fenetreOverton.strategieDeplacement[].riskRef` | string (optional) | Référence au risque R mitigé par cette étape |
| `fenetreOverton.strategieDeplacement[].hypothesisRef` | string (optional) | Référence à l'hypothèse T validée |
| `roadmap[].objectifDevotion` | string (required) | L'objectif Devotion Ladder de chaque phase |
| `sprint90Days[].devotionImpact` | DevotionLevel (required) | Quel niveau cette action cible |
| `northStarKPI` | object (required) | `{ name: "Progression Devotion Ladder", target, frequency, currentValue }` |

**Existants confirmés :** `fenetreOverton` (structure OK, à rendre required), `axesStrategiques`, `facteursClesSucces`, `sprint90Days`, `roadmap`, `kpiDashboard`, `globalBudget`, `budgetBreakdown`, `teamStructure`, `syntheseExecutive`, `visionStrategique`, `coherenceScore` — corrects.

#### Pilier I — Ajouter overtonShift + devotionImpact + innovations

**Variables à AJOUTER :**

| Variable | Type | Pourquoi |
|---|---|---|
| `catalogueParCanal[].devotionImpact` | DevotionLevel | Quel niveau de la Ladder cette action active |
| `catalogueParCanal[].overtonShift` | string | Comment cette action déplace la perception |
| `innovationsProduit` | array (required) | Extensions de gamme, de marque, co-branding, pivots. Manque totalement. |
| `innovationsProduit[].type` | enum | EXTENSION_GAMME, EXTENSION_MARQUE, CO_BRANDING, PIVOT, DIVERSIFICATION |
| `innovationsProduit[].feasibility` | enum | HIGH, MEDIUM, LOW |
| `innovationsProduit[].horizon` | enum | COURT, MOYEN, LONG |

**Modifications :** Supprimer `sprint90Days` et `annualCalendar` de I (ils appartiennent à S).

**Existants confirmés :** `catalogueParCanal`, `assetsProduisibles`, `activationsPossibles`, `formatsDisponibles`, `totalActions`, `brandPlatform`, `copyStrategy`, `bigIdea`, `potentielBudget`, `mediaPlan` — corrects.

### -1.3 MIGRATION Strategy → Pillar

Les données migrées de Strategy vers les piliers doivent rester **synchronisées** pendant la transition :

1. **Au `strategy.create`** : les données de Strategy (name, sector, country, businessContext) sont **copiées** dans les piliers A, V, E via le Pillar Gateway
2. **Le frontend `strategy.update`** : si l'opérateur change Strategy.name, le Gateway met à jour `a.nomMarque` automatiquement (+ staleness propagation)
3. **À terme** : Strategy ne conserve que `userId`, `operatorId`, `clientId`, `status`, `advertis_vector` (cache de score). Tout le reste vit dans les piliers.

### -1.4 IMPACT SUR LES GLORY BINDINGS

Après migration, les bindings GLORY corrigés :

| Binding actuel (cassé) | Binding v4 (corrigé) |
|---|---|
| `brand_name: "a.noyauIdentitaire"` | `brand_name: "a.nomMarque"` |
| `language: "d.assetsLinguistiques.languePrincipale"` | `language: "d.assetsLinguistiques.languePrincipale"` (le champ existe maintenant) |
| `sector: "t.triangulation.competitiveAnalysis"` (global) | `sector: "a.secteur"` |
| `market: "t.triangulation.som"` (global) | `market: "a.pays"` |

### -1.5 IMPACT SUR LA STALENESS

Avec les métadonnées dans les piliers, la staleness fonctionne enfin :
- Changer le nom de la marque (`a.nomMarque`) → propage staleness à D, E, S (tout ce qui utilise le nom)
- Changer le business model (`v.businessModel`) → propage staleness à R, T, I, S (tout ce qui dépend du modèle)
- Changer le secteur (`a.secteur`) → propage staleness à T, I, S (intelligence marché + catalogue)

### -1.6 VARIABLES DE TRANSITION — Ce que chaque pilier doit exporter au suivant

Chaque pilier consomme le précédent. Si une variable manque, la transition est cassée.
Variables ci-dessous = **à ajouter aux schemas Zod** (non-existantes aujourd'hui).

#### A → D (D a besoin de l'identité pour se différencier)

| Variable à ajouter dans A | Type | Pourquoi D en a besoin |
|---|---|---|
| `publicCible` | string (required) | D crée les personas détaillés, mais A doit poser la cible générale : "qui vise-t-on ?" en 1 phrase |
| `promesseFondamentale` | string (required) | La croyance intime : "On croit que le monde devrait être X". Pas un slogan (D), la CONVICTION. D en dérive le positionnement. |

| Variable à ajouter dans D | Type | Pourquoi |
|---|---|---|
| `archetypalExpression` | object | Comment l'archétype A se traduit visuellement et verbalement. Le pont entre "je suis un Héros" (A) et la direction artistique (D). `{ visualTranslation, verbalTranslation, emotionalRegister }` |

#### D → V (V a besoin du positionnement pour la valeur)

| Variable à ajouter dans V | Type | Pourquoi |
|---|---|---|
| `pricingJustification` | string (required) | Pourquoi CE prix pour CE positionnement ? Le lien D.positionnement → V.prix. |
| `personaSegmentMap` | array (required) | `[{ personaName (ref D), productNames (ref V), devotionLevel, revenueContribution% }]` — quel persona achète quoi |

#### V → E (E a besoin de l'offre pour l'engagement)

| Variable à ajouter dans E | Type | Pourquoi |
|---|---|---|
| `productExperienceMap` | array (required) | `[{ productRef (V), experienceDescription, touchpointRefs (E), emotionalOutcome }]` — comment chaque produit se traduit en expérience |
| `ladderProductAlignment` | array (required) | `[{ devotionLevel, productTierRef (V.productLadder), entryAction, upgradeAction }]` — quel tier produit pour quel niveau Devotion |
| `channelTouchpointMap` | array (optional) | `[{ salesChannel (V), touchpointRefs[] (E) }]` — quels touchpoints sur quels canaux de vente |

#### E → R (R scanne tout ADVE)

| Variable à ajouter dans R | Type | Pourquoi |
|---|---|---|
| `pillarGaps` | object (required) | `{ a: { score, gaps[] }, d: { score, gaps[] }, v: { ... }, e: { ... } }` — diagnostic par pilier, pas juste un riskScore global |
| `coherenceRisks` | array (required) | Contradictions détectées entre piliers. `[{ pillar1, pillar2, field1, field2, contradiction, severity }]` |

#### R → T (T confronte les risques à la réalité)

| Variable à ajouter dans T | Type | Pourquoi |
|---|---|---|
| `riskValidation` | array (required) | `[{ riskRef (R.probabilityImpactMatrix[i]), marketEvidence, status: CONFIRMED\|DENIED\|UNKNOWN, source }]` — chaque risque R confronté au marché |
| `competitorOvertonPositions` | array (optional) | `[{ competitorName (D.paysageConcurrentiel), overtonPosition, relativeToUs }]` — où sont les concurrents sur la fenêtre |

#### T → I (I cartographie le possible depuis la réalité)

| Variable à ajouter dans I | Type | Pourquoi |
|---|---|---|
| `actionsByDevotionLevel` | record (required) | `{ SPECTATEUR: actions[], INTERESSE: actions[], PARTICIPANT: actions[], ENGAGE: actions[], AMBASSADEUR: actions[], EVANGELISTE: actions[] }` — le catalogue trié par objectif Devotion, pas seulement par canal |
| `actionsByOvertonPhase` | array (optional) | `[{ phase (early adopters → mainstream → résistants), actions[] }]` — quelles actions pour chaque phase du shift |
| `riskMitigationActions` | array (required) | `[{ riskRef (R), action, canal, expectedImpact }]` — croisement R.mitigations × I.catalogue |
| `hypothesisTestActions` | array (optional) | `[{ hypothesisRef (T), testAction, expectedOutcome, cost }]` — actions qui valident les hypothèses T |

#### I → S (S pioche dans I pour la roadmap)

| Variable à ajouter dans S | Type | Pourquoi |
|---|---|---|
| `selectedFromI` | array (required) | `[{ sourceRef (path vers l'action dans I), action, phase, priority }]` — traçabilité I→S |
| `rejectedFromI` | array (optional) | `[{ sourceRef, reason }]` — actions de I non sélectionnées, avec justification |
| `devotionFunnel` | array (required) | `[{ phase, spectateurs, interesses, participants, engages, ambassadeurs, evangelistes }]` — objectifs quantifiés par niveau Devotion à chaque phase |
| `overtonMilestones` | array (required) | `[{ phase, currentPerception, targetPerception, measurementMethod }]` — jalons de déplacement de la fenêtre |
| `budgetByDevotion` | object (optional) | `{ acquisition, conversion, retention, evangelisation }` — budget par objectif Devotion (pas par canal) |

### -1.7 CRITÈRES D'ACCEPTATION (mis à jour)

- [ ] **ONT-1** : `PillarASchema` contient `nomMarque`, `accroche`, `description`, `secteur`, `pays`, `brandNature`, `langue` — tous required
- [ ] **ONT-2** : `PillarVSchema` contient `businessModel`, `economicModels`, `positioningArchetype`, `salesChannel`, `freeLayer`
- [ ] **ONT-3** : `PillarESchema` contient `promesseExperience`, `superfanPortrait`, `conversionTriggers`, `barriersEngagement`, `primaryChannel`
- [ ] **ONT-4** : `PillarRSchema` contient `overtonBlockers`, `devotionVulnerabilities`
- [ ] **ONT-5** : `PillarTSchema` — chaque valeur quantitative porte un champ `source`. `overtonPosition` et `perceptionGap` existent.
- [ ] **ONT-6** : `PillarSSchema` — `fenetreOverton` est required. Chaque étape a `devotionTarget`. Chaque phase roadmap a `objectifDevotion`. `northStarKPI` existe.
- [ ] **ONT-7** : `PillarISchema` — chaque action porte `devotionImpact` et `overtonShift`. `innovationsProduit` existe. `sprint90Days` et `annualCalendar` sont supprimés de I (déplacés dans S).
- [ ] **ONT-8** : `d.assetsLinguistiques.languePrincipale` existe dans le schema
- [ ] **ONT-9** : Tous les GLORY bindings résolvent vers des champs qui existent dans les schemas Zod
- [ ] **ONT-10** : Un test automatisé vérifie que chaque path dans les GLORY pillarBindings est un champ valide du schema correspondant
- [ ] **ONT-11** : `Strategy.create` copie name→a.nomMarque, sector→a.secteur, country→a.pays, businessContext→v.businessModel/etc via le Gateway
- [ ] **ONT-12** : `Strategy.update(name)` propage vers `a.nomMarque` + staleness
- [ ] **ONT-13** : Les contrats de maturité INTAKE incluent les nouveaux champs fondamentaux (nomMarque, secteur, pays pour A; businessModel pour V)
- [ ] **ONT-14** : Le scorer structural utilise les contrats mis à jour (pas de champs hardcodés)
- [ ] **ONT-15** : A exporte `publicCible` et `promesseFondamentale` — D les consomme
- [ ] **ONT-16** : D exporte `archetypalExpression` — pont entre archétype A et direction artistique D
- [ ] **ONT-17** : V contient `pricingJustification` et `personaSegmentMap` (ref D.personas → V.produits)
- [ ] **ONT-18** : E contient `productExperienceMap`, `ladderProductAlignment` (mapping Devotion ↔ Product Ladder)
- [ ] **ONT-19** : R contient `pillarGaps` (diagnostic par pilier ADVE) et `coherenceRisks` (contradictions cross-pilier)
- [ ] **ONT-20** : T contient `riskValidation` (chaque risque R confronté au marché) et `competitorOvertonPositions`
- [ ] **ONT-21** : I contient `actionsByDevotionLevel` (catalogue trié par Devotion) et `riskMitigationActions` (croisement R×I)
- [ ] **ONT-22** : S contient `selectedFromI` (traçabilité), `devotionFunnel` (objectifs quantifiés), `overtonMilestones` (jalons mesurables)
- [ ] **ONT-23** : Un test vérifie que chaque pilier N+1 a accès aux exports du pilier N (pas de champ référencé non-existant)

---

## CHANTIER 0 — Ontologie RTIS : Sémantique, Ordre et Protocoles {#chantier-0}

### 0.1 CORRECTIF CRITIQUE — La v3 a tout inversé

La v3 traite RTIS comme 4 prompts LLM séquentiels avec des noms trompeurs :

| Pilier | Nom v3 (FAUX) | Ordre v3 (FAUX) | Ce que v3 génère |
|---|---|---|---|
| R | Risk | 1er | SWOT, matrice de risques |
| T | Track | 2ème | Triangulation, TAM/SAM/SOM |
| I | **Innovation** | **3ème** | Catalogue d'actions par canal |
| S | **Strategy** | **4ème** | Fenêtre d'Overton + roadmap |

**3 erreurs fondamentales :**

1. **I ne s'appelle pas Innovation — c'est Innovation.** I est le POTENTIEL TOTAL de la marque. Tout ce que la marque PEUT faire, être, produire, devenir. C'est l'espace des possibles, pas un plan opérationnel.

2. **S ne s'appelle pas Synthèse — c'est Strategy.** S est la ROADMAP D'ACTIVITE qui pioche dans les atomiques de I pour déterminer les actions, les campagnes, les livrables à produire. S décide. I inventorie.

3. **L'ordre est inversé.** S vient AVANT I, pas après. Parce que la stratégie définit la direction, et l'innovation cartographie le potentiel DANS cette direction. Sans S, I est un brainstorm aveugle. Avec S, I est une expansion contrôlée.

### 0.2 L'ontologie correcte

```
ADVE (identité brute de la marque — saisie humaine)
  │
  ▼
R = RISK — "Quels sont nos angles morts ?"
  │  Input  : atomiques ADVE uniquement
  │  Output : SWOT, matrice probabilité×impact, mitigations, riskScore,
  │           overtonBlockers, devotionVulnerabilities
  │  Nature : DIAGNOSTIC (analyse les failles de la fondation ADVE)
  │
  ▼
T = TRACK — "Que dit la réalité ?"
  │  Input  : ADVE + R
  │  Output : triangulation marché, validation d'hypothèses, TAM/SAM/SOM,
  │           brand-market fit, overtonPosition, perceptionGap
  │  Nature : CONFRONTATION (oppose l'identité ADVE à la réalité externe)
  │  Note   : T est le seul pilier qui DEVRAIT avoir des données sourcées
  │
  ▼
I = INNOVATION — "Quel est notre potentiel total ?"
  │  Input  : ADVE + R + T
  │  Output : TOUT ce que la marque peut faire — catalogue exhaustif d'actions,
  │           d'assets, de formats, de canaux, d'activations, d'innovations produit,
  │           d'extensions de marque, de pivots possibles
  │  Nature : EXPANSION (cartographie l'espace des possibles)
  │  I répond à : "Vu qui on est (ADVE), nos risques (R), et le marché (T),
  │               de quoi sommes-nous capables ?"
  │
  ▼
S = STRATEGY — "Que choisit-on de faire ?"
     Input  : ADVE + R + T + I
     Output : roadmap qui PIOCHE dans I, fenêtre d'Overton, sprint 90 jours,
              budgets, KPIs, objectifs Devotion par phase
     Nature : DECISION (sélectionne dans le potentiel I pour tracer la route → superfan)
     S répond à : "Vu tout ce qu'on PEUT faire (I), que CHOISIT-ON, dans quel ordre,
                   pour déplacer la Fenêtre d'Overton et accumuler des superfans ?"
```

### 0.3 Chaque pilier puise dans le précédent — la cascade ADVERTIS

L'ordre est celui de l'acronyme : **A → D → V → E → R → T → I → S**.
Chaque pilier consomme tous les précédents, mais principalement celui juste avant :

```
A (Qui suis-je ?)
 └→ D puise dans A (Comment je me différencie de ce que je suis ?)
     └→ V puise dans A+D (Quelle valeur je propose avec cette identité + ce positionnement ?)
         └→ E puise dans A+D+V (Comment j'engage autour de cette offre ?)
             └→ R puise dans ADVE (Quels risques menacent tout ça ?)
                 └→ T puise dans ADVE+R (La réalité confirme-t-elle ou infirme-t-elle ?)
                     └→ I puise dans ADVE+R+T (Vu tout ça, que PEUT-ON faire ?)
                         └→ S puise dans ADVE+R+T+I (Que CHOISIT-ON de faire ?)
```

**I avant S parce que** : I est le potentiel brut — TOUT ce que la marque peut faire.
S est le choix stratégique — la roadmap qui **pioche dans I** pour sélectionner les actions,
les campagnes, les livrables à produire. Tu ne peux pas choisir (S) avant de savoir
ce qui est possible (I).

**Analogie :** I est le menu du restaurant (tous les plats possibles).
S est la commande (ce que tu choisis de manger, dans quel ordre, avec quel budget).

### 0.4 Les 4 Protocoles RTIS

Chaque pilier RTIS a un **protocole dédié** — pas un simple prompt LLM, mais une logique métier propre avec ses sources, ses validations, et ses règles.

#### 0.4.1 PROTOCOLE RISK (R)

```
Nom      : protocole-risk
Service  : src/server/services/rtis-protocols/risk.ts
Input    : Piliers A, D, V, E (atomiques uniquement)
Output   : Pilier R complet (schema Zod pillarRSchema)
```

**Logique métier :**

1. **Extraction des vulnérabilités ADVE** — Scan automatique (pas LLM) :
   - A incomplet (noyauIdentitaire vague, archetype manquant) → vulnérabilité identitaire
   - D sans concurrents ni positionnement clair → vulnérabilité de différenciation
   - V sans unitEconomics ou LTV/CAC < 3 → vulnérabilité financière
   - E sans touchpoints ou rituels → vulnérabilité d'engagement
   Chaque scan produit des `flag: { pillar, field, severity, reason }` **déterministes**.

2. **Génération SWOT enrichie** — Appel LLM :
   - System prompt : analyste de risques stratégiques
   - Input : les atomiques ADVE + les flags de vulnérabilité (étape 1)
   - Output : `globalSwot` structuré
   - Le LLM ne part pas de zéro — il enrichit les flags avec du contexte

3. **Matrice probabilité × impact** — Hybride :
   - Les flags de vulnérabilité deviennent les risques de base (calcul, pas LLM)
   - Le LLM ajoute des risques contextuels (marché, concurrence, réglementation)
   - Chaque risque porte `source: "calculated" | "ai_estimate"`

4. **Scoring** — Calcul pur :
   - `riskScore = weighted_avg(probability × impact)` — pas de LLM
   - Les flags de vulnérabilité comptent dans le score même si le LLM échoue

**Validation :**
- Le SWOT a au moins 3 items par quadrant
- La matrice a au moins 5 risques
- Chaque risque a une mitigation
- riskScore est un nombre 0-100

#### 0.4.2 PROTOCOLE TRACK (T)

```
Nom      : protocole-track
Service  : src/server/services/rtis-protocols/track.ts
Input    : Piliers A, D, V, E, R
Output   : Pilier T complet (schema Zod pillarTSchema)
```

**Logique métier :**

1. **Données sourcées en priorité** (avant tout LLM) :
   - KnowledgeEntry du secteur/marché (SESHAT)
   - CompetitorSnapshot récents (si disponibles)
   - Benchmarks sectoriels pré-seedés
   - Chaque donnée utilisée porte `source: "external_data"` + `sourceRef`

2. **Triangulation** — Structuration des données :
   - `customerInterviews` : extrait des verbatims intake/ADVE (pas inventé)
   - `competitiveAnalysis` : construit depuis D.paysageConcurrentiel + CompetitorSnapshot
   - `trendAnalysis` : depuis KnowledgeEntry type SECTOR_BENCHMARK
   - `financialBenchmarks` : depuis V.unitEconomics vs benchmarks sectoriels
   Si une source manque → le champ est marqué `source: "ai_estimate"` (pas présenté comme fait)

3. **Validation d'hypothèses** — Appel LLM :
   - Le LLM formule 5+ hypothèses à partir de ADVE+R
   - Chaque hypothèse commence en status `HYPOTHESIS`
   - Le status ne passe à `VALIDATED` que si une source externe confirme (opérateur ou donnée)
   - **Jamais de VALIDATED auto-généré par LLM**

4. **TAM/SAM/SOM** — Hybride :
   - Si données sectorielles disponibles (KnowledgeEntry) → calcul avec source
   - Sinon → estimation LLM **marquée `source: "ai_estimate"`**
   - Le frontend affiche un badge "Estimation IA" sur les chiffres non-sourcés

5. **Brand-Market Fit** — Calcul déterministe :
   - `brandMarketFitScore = f(hypothèses validées, triangulation complète, TAM coverage)`
   - Pas de LLM dans le score — c'est une formule

**Validation :**
- Triangulation a au moins 2/4 sections remplies
- Au moins 5 hypothèses formulées
- TAM > SAM > SOM (cohérence logique)
- Chaque champ quantitatif porte un tag `source`

#### 0.4.3 PROTOCOLE INNOVATION (I)

```
Nom      : protocole-innovation
Service  : src/server/services/rtis-protocols/innovation.ts
Input    : Piliers A, D, V, E, R, T
Output   : Pilier I complet (schema Zod pillarISchema)
```

**Logique métier :**

S est le pilier de **DECISION**. Il pioche dans I (le potentiel total) pour sélectionner
les actions, campagnes et livrables qui composent la roadmap. Son unique objectif :
**déplacer la Fenêtre d'Overton pour accumuler des superfans.**
Toute action dans la roadmap, tout KPI, tout budget n'a de sens que s'il sert ce déplacement.

> La Fenêtre d'Overton = ce que le marché considère comme "normal", "acceptable",
> "désirable" pour cette marque. Déplacer la fenêtre = changer les perceptions
> pour que la marque passe de "connue" à "culte". Le superfan (évangéliste dans
> la Devotion Ladder) est l'aboutissement de ce déplacement.

**1. Fenêtre d'Overton — LE CŒUR DE S** (pas un sous-objet optionnel) :

```
   Perception actuelle                    Perception cible
   (T.triangulation +                     (A.prophecy +
    R.globalSwot.weaknesses)               D.positionnement)
   ◄──────────────────────────────────────►
              L'ÉCART = le travail à faire

   strategieDeplacement[] :
   Chaque étape = 1 mouvement de la fenêtre
   Chaque mouvement = rapproche un segment de la Devotion Ladder
   Résultat cumulé = accumulation de superfans
```

   Construction :
   - `perceptionActuelle` déduite de T.triangulation + R.globalSwot.weaknesses
   - `perceptionCible` déduite de A.prophecy + D.positionnement
   - `ecart` = la distance à combler
   - `strategieDeplacement[]` = étapes séquencées, chacune avec :
     - L'action qui déplace
     - Le segment Devotion Ladder ciblé (quel niveau on fait monter)
     - Le canal et l'horizon temporel
     - Le lien avec le risque R mitigé ou l'hypothèse T validée

**2. Roadmap orientée superfan** — Hybride :
   - Phase 1 (0-90j) : **Fondations du culte** — mitiger les risques R qui bloquent
     la fenêtre, valider les hypothèses T critiques.
     Objectif Devotion : spectateur → intéressé.
   - Phase 2 (3-6 mois) : **Construction de l'engagement** — activer les rituels E,
     consolider le positionnement D.
     Objectif Devotion : intéressé → participant.
   - Phase 3 (6-12 mois) : **Accélération** — attaquer le SAM (T.tamSamSom),
     amplifier les touchpoints E.
     Objectif Devotion : participant → engagé.
   - Phase 4 (12-36 mois) : **Culte** — réaliser la prophecy A, maximiser
     les ambassadeurs et évangélistes.
     Objectif Devotion : engagé → superfan.
   - **Chaque phase a un objectif Devotion Ladder explicite** — pas juste des actions,
     mais quel mouvement de la fenêtre cette phase provoque.

**3. Sprint 90 jours** — Extraction ciblée :
   - Les 8-10 actions les plus urgentes de Phase 1
   - Chaque action priorisée par son **impact sur le déplacement de la fenêtre** :
     - `isRiskMitigation` (R) → débloquer la fenêtre
     - `marketValidation` (T) → confirmer le mouvement
     - `devotionImpact` → quel niveau de la Devotion Ladder ça active
   - Owner assigné si possible

**4. KPI Dashboard orienté Devotion** — Déterministe :
   - **North Star KPI** : taux de progression sur la Devotion Ladder
     (% de l'audience qui monte d'un niveau par période)
   - KPIs par phase de la roadmap, chacun lié à un mouvement de la fenêtre
   - Minimum 1 KPI par pilier, mais le KPI de S est toujours le déplacement
   - Target et fréquence de mesure pour chaque KPI

**5. Synthèse exécutive** — LLM :
   - Résumé de 400+ chars qui répond à :
     "Voici comment nous allons déplacer la perception du marché
      pour transformer des spectateurs en évangélistes."
   - Construit à partir de la fenêtre + roadmap + sprint (pas depuis le vide)

**Validation :**
- `fenetreOverton` est **REQUIS** (pas optionnel) — c'est le cœur de S
- `fenetreOverton.strategieDeplacement` a au moins 3 étapes, chacune avec un segment Devotion ciblé
- Roadmap a au moins 4 phases, chacune avec un `objectifDevotion` explicite
- Sprint 90j a au moins 8 actions avec `devotionImpact`
- KPI Dashboard a au moins 8 KPIs dont le North Star (progression Devotion Ladder)
- Synthèse exécutive > 400 chars et mentionne le déplacement de la fenêtre
- Chaque action de la roadmap référence un risque R mitigé ou une hypothèse T validée

#### 0.4.4 PROTOCOLE STRATEGY (S)

```
Nom      : protocole-strategy
Service  : src/server/services/rtis-protocols/strategy.ts
Input    : Piliers A, D, V, E, R, T, I
Output   : Pilier S complet (schema Zod pillarSSchema)
```

**Logique métier :**

I est le pilier d'**EXPANSION**. C'est le potentiel total de la marque — TOUT ce qu'elle peut faire, être, devenir. I ne choisit pas (c'est le rôle de S qui vient après). I cartographie.

**Le lien avec la Fenêtre d'Overton :** I inventorie TOUTES les actions qui POURRAIENT déplacer la fenêtre. Chaque action du catalogue porte un `devotionImpact` (quel niveau de la Devotion Ladder elle active) et un `overtonShift` (comment elle déplace la perception). S piochera ensuite dans ce catalogue pour construire la roadmap.

1. **Catalogue par canal** — Appel LLM massif :
   - Pour chaque canal (DIGITAL, EVENEMENTIEL, MEDIA_TRADITIONNEL, PR_INFLUENCE, PRODUCTION, RETAIL_DISTRIBUTION) :
     - Lister TOUTES les actions possibles (pas seulement les prioritaires)
     - Chaque action tagguée avec `pilierImpact: A|D|V|E` et `budgetEstime: LOW|MEDIUM|HIGH`
   - Minimum 5 actions par canal
   - Contextualisé par : A (identité), D (positionnement), S (direction stratégique)
   - Contraint par : R (ne pas proposer d'actions qui aggravent les risques identifiés)

2. **Assets produisibles** — Hybride :
   - Basé sur D.directionArtistique (quels assets visuels la marque peut produire)
   - Enrichi par les GLORY tools disponibles (chaque tool = 1 asset potentiel)
   - 15+ items couvrant VIDEO, PRINT, DIGITAL, PHOTO, AUDIO, PACKAGING, EXPERIENCE

3. **Activations possibles** — LLM contextualisé :
   - Croisement de E.touchpoints × catalogueParCanal
   - Chaque activation = un touchpoint activé via un canal
   - 10+ activations avec budget estimé

4. **Innovations produit/marque** — LLM exploratoire (NOUVEAU) :
   - Extensions de gamme possibles (depuis V.produitsCatalogue)
   - Extensions de marque (depuis A.archetype + D.positionnement)
   - Pivots possibles si T.brandMarketFitScore < 50
   - Co-branding opportunities (depuis T.competitiveAnalysis)
   - Chaque innovation marquée `feasibility: HIGH|MEDIUM|LOW` et `horizon: COURT|MOYEN|LONG`

5. **Formats disponibles** — Calcul :
   - Union de tous les formats mentionnés dans catalogueParCanal + assetsProduisibles
   - Dédupliqué, catégorisé

6. **totalActions** — Calcul pur :
   - Somme de toutes les actions dans catalogueParCanal

**Validation :**
- catalogueParCanal a au moins 6 canaux avec au moins 5 actions chacun
- assetsProduisibles a au moins 15 items
- activationsPossibles a au moins 10 items
- formatsDisponibles a au moins 10 items
- Chaque action dans le catalogue porte `devotionImpact` et `overtonShift`
- Chaque action est cohérente avec S.roadmap et S.fenetreOverton (pas de contradiction)
- Le catalogue couvre les 6 niveaux de la Devotion Ladder (des actions pour chaque transition)

### 0.5 Ordre de cascade et dépendances

```
A ──▶ D ──▶ V ──▶ E ──▶ R ──▶ T ──▶ I ──▶ S ═══▶ SUPERFAN
│     │     │     │     │     │     │     │        (évangéliste)
│     │     │     │     │     │     │     │
│  publicCible  pricingJust  product   pillarGaps  riskValid  actionsByDev  selectedFromI
│  promesseFond personaSeg   ExpMap    coherence   overtonPos  riskMitig    devotionFunnel
│     │     │  ladderProd   Risks     percepGap   hypTestAct  overtonMiles
│  archetypal   │  channelTP   │         │  compOvPos   │        budgetByDev
│  Expression   │     │        │         │     │        │            │
│     │         │     │        │         │     │        │            │
└─────┴─────────┴─────┴────────┴─────────┴─────┴────────┴────────────┘
 Chaque pilier EXPORTE des variables de transition au suivant (§-1.6)

Fil rouge : la FENÊTRE D'OVERTON → SUPERFAN
  - A/D/V/E définissent le culte (la base)
  - R identifie ce qui BLOQUE son déplacement (overtonBlockers)
  - T mesure OÙ elle est aujourd'hui (overtonPosition, perceptionGap)
  - I cartographie TOUT ce qui PEUT la déplacer (actionsByDevotionLevel)
  - S CHOISIT dans I pour tracer la roadmap (selectedFromI, overtonMilestones)
  - Chaque action porte un devotionImpact + overtonShift
```

**La boucle de feedback :**

1. R+T sont générés → produisent des recommandations pour ADVE
2. L'opérateur accepte/rejette les recos → ADVE est enrichi
3. **SEULEMENT APRÈS l'acceptation** → I est généré (depuis ADVE enrichi + R + T)
4. **SEULEMENT APRÈS I** → S est généré (pioche dans I + tout le reste)
5. **S référence explicitement I** — `selectedFromI[]` trace l'origine de chaque action choisie

### 0.6 Impact sur le code existant

| Fichier | Changement |
|---|---|
| `PILLAR_NAMES` dans `advertis-vector.ts` | `i: "Innovation"` (pas Implementation), `s: "Strategy"` (pas Synthèse) |
| `runRTISCascade` dans `rtis-cascade.ts` | Remplacé par 4 protocoles dédiés dans `rtis-protocols/`, ordre R→T→I→S |
| `RTIS_PROMPTS.I` | Nouveau prompt : potentiel total (pas catalogue opérationnel). Input = ADVE+R+T. Génère `actionsByDevotionLevel`, `riskMitigationActions`, `hypothesisTestActions` |
| `RTIS_PROMPTS.S` | Input = ADVE+R+T+**I** (S pioche dans I). Génère `selectedFromI`, `devotionFunnel`, `overtonMilestones` |
| `actualizePillar("I")` | Reçoit ADVE+R+T en contexte (I ne dépend pas de S) |
| `actualizePillar("S")` | Reçoit ADVE+R+T+**I** en contexte (S pioche dans I) |
| `PILLAR_SEQUENCE_ORDER` dans hypervisor.ts | Ordre ADVERTIS respecté : I en position 7, S en position 8 |
| Schemas Zod (tous les 8) | Enrichis avec variables de transition (§-1.6) + variables manquantes (§-1.2) |
| Contrats de maturité | INTAKE inclut les nouveaux fondamentaux (nomMarque, secteur, businessModel). ENRICHED inclut les variables de transition. COMPLETE aligné sur GLORY bindings. |
| Scorer structural | Lit les contrats mis à jour, couvre les nouvelles variables |
| GLORY pillarBindings | `brand_name → a.nomMarque`, `sector → a.secteur`, `market → a.pays`, `language → d.assetsLinguistiques.languePrincipale` |

### 0.7 Critères d'acceptation

- [ ] **RT-1** : `PILLAR_NAMES.i === "Innovation"` et `PILLAR_NAMES.s === "Strategy"`
- [ ] **RT-2** : La cascade exécute dans l'ordre R → T → (feedback ADVE) → I → S
- [ ] **RT-3** : S reçoit I en input (S pioche dans I). I ne reçoit PAS S (pas de circularité)
- [ ] **RT-4** : I reçoit ADVE + R + T en input (pas S). S reçoit ADVE + R + T + I en input.
- [ ] **RT-5** : Le protocole R produit des flags de vulnérabilité AVANT l'appel LLM (diagnostic hybride)
- [ ] **RT-6** : Le protocole T marque chaque donnée quantitative avec `source: "ai_estimate" | "external_data" | "calculated"`
- [ ] **RT-7** : Le protocole T ne produit JAMAIS de `hypothesisValidation.status: "VALIDATED"` sans source externe
- [ ] **RT-8** : Le protocole S structure la roadmap en 4 phases (90j, 3-6m, 6-12m, 12-36m)
- [ ] **RT-9** : Le protocole I produit un catalogueParCanal avec au moins 30 actions totales (6 canaux × 5 minimum)
- [ ] **RT-10** : I inclut un bloc `innovationsProduit` avec des extensions de gamme/marque
- [ ] **RT-11** : Chaque protocole a son propre fichier service dans `src/server/services/rtis-protocols/`
- [ ] **RT-12** : I valide S — si le potentiel révèle une roadmap irréaliste, un signal `STRATEGY_FEASIBILITY_ALERT` est créé

---

## 3. CHANTIER 1 — Le Pillar Gateway

### 3.1 Problème

6 systèmes écrivent dans `pillar.content` chacun à leur manière :

| Écrivain actuel | Versionne ? | Propage staleness ? | Re-score ? | Respecte validationStatus ? |
|---|---|---|---|---|
| tRPC `updateFull/Partial` | Oui | Oui | Oui | Oui |
| MESTOR `savePillar` | Non | Non | Oui (mauvais scorer) | **Non — force DRAFT** |
| ARTEMIS `enrich-oracle` | Non | Non | Non | Non |
| GLORY `executeBrandPipeline` | Non | Non | Non | Non |
| Auto-filler `fillToStage` | Non | Non | Oui (bon scorer) | Non |
| Ingestion `ai-filler` | Non | Non | Non | Non |

### 3.2 Solution — `PillarGateway` service

Créer un service unique `src/server/services/pillar-gateway/index.ts` qui est le **seul point d'écriture** pour tout contenu de pilier.

```typescript
interface PillarWriteRequest {
  strategyId: string;
  pillarKey: PillarKey;

  // Quoi écrire
  operation:
    | { type: "REPLACE_FULL"; content: Record<string, unknown> }
    | { type: "MERGE_DEEP"; patch: Record<string, unknown> }
    | { type: "SET_FIELDS"; fields: Array<{ path: string; value: unknown }> }
    | { type: "APPLY_RECOS"; recoIndices: number[] };

  // Qui écrit
  author: {
    system: "OPERATOR" | "MESTOR" | "ARTEMIS" | "GLORY" | "AUTO_FILLER" | "INGESTION";
    userId?: string;
    reason: string;
  };

  // Options
  options?: {
    skipValidation?: boolean;      // Pour les writes AI_PROPOSED (pas encore validés humainement)
    targetStatus?: ValidationStatus; // AI_PROPOSED pour les systèmes IA, DRAFT pour l'opérateur
    confidenceDelta?: number;       // Ajustement de confiance (ex: +0.03 par champ rempli)
  };
}

interface PillarWriteResult {
  success: boolean;
  version: number;                  // Numéro de version créé
  previousContent: unknown;         // Pour rollback
  scoreResult: AdvertisVector;      // Nouveau score
  stalenessPropagate: string[];    // Piliers marqués stale
  maturityAssessment: PillarAssessment;
  warnings: string[];               // Validation warnings (non-bloquants)
}
```

### 3.3 Comportement du Gateway

À chaque appel, le Gateway exécute **dans une transaction Prisma** :

```
1. VALIDATE — Le contenu résultant passe le schema Zod du pilier
2. GUARD — Si pilier LOCKED, rejeter (sauf author.system === "OPERATOR" + admin)
3. GUARD — Si pilier VALIDATED et author.system !== "OPERATOR", écrire en AI_PROPOSED
4. MERGE — Selon operation.type :
   - REPLACE_FULL : remplace entièrement (opérateur humain uniquement)
   - MERGE_DEEP : deep merge récursif (clé par clé, array par array)
   - SET_FIELDS : écrit chaque champ ciblé sans toucher le reste
   - APPLY_RECOS : applique les recommendations sélectionnées (ordre garanti)
5. VERSION — Crée un PillarVersion avec diff, author, reason
6. SCORE — Appelle le scorer unifié (Chantier 2)
7. STALE — Propage la staleness aux piliers dépendants
8. PERSIST — Écrit content, confidence, validationStatus, staleAt, currentVersion
9. SIGNAL — Si changement significatif (>10% score pilier), crée un Signal
```

### 3.4 Règles de merge par type d'opération

**MERGE_DEEP** (utilisé par MESTOR, ARTEMIS, GLORY) :
- Scalaires : le nouveau remplace l'ancien
- Objets : merge récursif clé par clé (les clés existantes non-mentionnées sont préservées)
- Arrays : **ne remplace jamais** — les nouveaux items sont ajoutés, les items existants préservés
- Le contenu existant n'est jamais supprimé par un merge (pour supprimer : APPLY_RECOS avec opération REMOVE)

**SET_FIELDS** (utilisé par AUTO_FILLER) :
- Écrit uniquement les champs spécifiés par path
- Ne touche à rien d'autre
- Idéal pour le remplissage ciblé de champs manquants

### 3.5 Migration des écrivains existants

| Système | Avant | Après |
|---|---|---|
| tRPC `updateFull` | `db.pillar.update()` + versionning + staleness | `gateway.write({ operation: { type: "REPLACE_FULL" }, author: { system: "OPERATOR" } })` |
| tRPC `updatePartial` | `db.pillar.update()` | `gateway.write({ operation: { type: "MERGE_DEEP" }, author: { system: "OPERATOR" } })` |
| MESTOR `savePillar` | `db.pillar.upsert({ validationStatus: "DRAFT" })` | `gateway.write({ operation: { type: "MERGE_DEEP" }, author: { system: "MESTOR" }, options: { targetStatus: "AI_PROPOSED" } })` |
| ARTEMIS writeback | `extractActions() → db.pillar.update()` | `gateway.write({ operation: { type: "SET_FIELDS" }, author: { system: "ARTEMIS" } })` |
| GLORY brand pipeline | `db.pillar.upsert({ d.directionArtistique.X })` | `gateway.write({ operation: { type: "SET_FIELDS", fields: [{ path: "directionArtistique.X", value }] }, author: { system: "GLORY" } })` |
| Auto-filler | `db.pillar.upsert()` | `gateway.write({ operation: { type: "SET_FIELDS" }, author: { system: "AUTO_FILLER" } })` |
| Ingestion | `db.pillar.upsert()` | `gateway.write({ operation: { type: "MERGE_DEEP" }, author: { system: "INGESTION" } })` |

### 3.6 Critères d'acceptation

- [ ] **GW-1** : Aucun `db.pillar.update` ni `db.pillar.upsert` n'existe en dehors du Gateway
- [ ] **GW-2** : Chaque écriture crée un `PillarVersion` avec diff, author, et reason
- [ ] **GW-3** : La staleness se propage systématiquement (A→DVERTIS, D→VERTIS, V→ERTIS, E→RTIS, R→TIS, T→IS)
- [ ] **GW-4** : Un pilier LOCKED ne peut pas être écrit par un système IA
- [ ] **GW-5** : Un pilier VALIDATED recevant un write IA passe en AI_PROPOSED (pas DRAFT)
- [ ] **GW-6** : Toute l'opération est dans une `prisma.$transaction`

---

## 4. CHANTIER 2 — Le Scorer Unifié

### 4.1 Problème

Deux scorers coexistent :

| | `scoreStructural` (advertis-scorer) | `scoreAllPillarsSemantic` (semantic.ts) |
|---|---|---|
| Source de vérité | Contrat de maturité | Comptage de champs hardcodé |
| Modulateur | Quality modulator (appel Claude 5s) | Aucun |
| Pondération | Business context weights | Aucune |
| Déterministe | **Non** (timeout IA) | **Oui** |
| Utilisé par | `scoreObject()` | `recalcScores()` dans RTIS cascade |

### 4.2 Solution — Un seul scorer, contract-driven, déterministe

**Supprimer** `scoreAllPillarsSemantic` et le `quality-modulator` IA.

Le scorer unifié est une **fonction pure** :

```
score_pilier = (atomes_valides / atomes_requis × 15)
             + (collections_complètes / collections_totales × 7)
             + (cross_refs_valides / cross_refs_requises × 3)
```

Max 25 par pilier. Composite /200. **Aucun appel IA dans le scoring.**

La source de vérité pour les champs requis est le **contrat de maturité** de chaque pilier (déjà en place via `contracts-loader`). Le contrat définit quels champs comptent pour "atomes", "collections", et "cross_refs".

### 4.3 Business context weights (conservé, simplifié)

Les poids par business context sont conservés mais appliqués **sans appel IA** :
```
score_final_pilier = score_brut × business_weight[pillar]
```

Les weights sont une table statique indexée par `(businessModel, positioningArchetype)`. Pas de cache in-memory, pas de TTL, pas de prewarm. C'est une lookup table.

### 4.4 Confidence (redéfini)

La confidence n'est plus un compteur arbitraire. Elle reflète la **provenance** du contenu :

```typescript
type ContentProvenance = "HUMAN" | "AI_VALIDATED" | "AI_PROPOSED" | "AI_RAW";

// Confidence par provenance (par champ)
const PROVENANCE_WEIGHT: Record<ContentProvenance, number> = {
  HUMAN: 1.0,        // Saisi ou validé par l'opérateur
  AI_VALIDATED: 0.9,  // Généré par IA, approuvé par l'opérateur
  AI_PROPOSED: 0.6,   // Généré par IA, en attente de validation
  AI_RAW: 0.4,        // Généré par IA, jamais revu
};

// Confidence du pilier = moyenne pondérée des confidences par champ
pillar.confidence = avg(fields.map(f => PROVENANCE_WEIGHT[f.provenance]))
```

Le Gateway track la provenance par champ dans `pillar.fieldProvenance` (nouveau champ JSON).

### 4.5 Classification (unifiée)

Une seule échelle, cohérente avec le CdC existant :

| Composite | Classification | Couleur |
|---|---|---|
| 0 – 50 | ZOMBIE | Rouge |
| 51 – 80 | FRAGILE | Orange |
| 81 – 120 | EMERGENTE | Jaune |
| 121 – 160 | FORTE | Vert |
| 161 – 180 | CULTE | Bleu |
| 181 – 200 | ICONE | Violet |

### 4.6 Critères d'acceptation

- [ ] **SC-1** : `scoreAllPillarsSemantic` est supprimé, `quality-modulator.ts` est supprimé
- [ ] **SC-2** : `scoreObject("strategy", id)` et le Gateway utilisent le même scorer
- [ ] **SC-3** : Le score est une fonction pure : `f(content, contract, businessContext) → number`, aucun side effect
- [ ] **SC-4** : Un test unitaire vérifie que 1000 appels sur le même contenu produisent 1000 fois le même score
- [ ] **SC-5** : La classification utilise une seule échelle partout (code + UI + documentation)
- [ ] **SC-6** : Chaque champ de pilier a une provenance trackée

---

## 5. CHANTIER 3 — Le Schema Canonique par pilier

### 5.1 Problème

Le Chantier -1 (§-1.2) et le Chantier 0 (§0.4) ont défini l'ontologie complète : variables fondamentales, variables de transition inter-piliers, variables Overton/Devotion. Il faut maintenant **matérialiser** ces définitions dans les schemas Zod réels du code.

### 5.2 Solution — Les schemas Zod intègrent 3 couches de variables

Pour chaque pilier, le schema Zod dans `src/lib/types/pillar-schemas.ts` est **la seule source de vérité** et contient :

1. **Variables existantes** (déjà dans le code v3) — conservées
2. **Variables fondamentales** (Chantier -1 §-1.2) — migrées de Strategy ou créées
3. **Variables de transition** (Chantier -1 §-1.6) — exports vers le pilier suivant
4. **Variables Overton/Devotion** (Chantier 0 §0.4) — fil rouge superfan

> **Note :** Les schemas TypeScript détaillés ne sont PAS dupliqués ici — ils sont
> dans le Chantier -1 (§-1.2) pour les fondamentales, le Chantier -1 (§-1.6) pour
> les transitions, et le code existant `pillar-schemas.ts` pour les existantes.
> Ce chantier porte sur la **matérialisation** dans le code, pas la redéfinition.

#### Résumé des ajouts par pilier (compilation des Chantiers -1 et 0)

| Pilier | Variables fondamentales (§-1.2) | Variables de transition (§-1.6) | Variables Overton/Devotion (§0.4) |
|---|---|---|---|
| **A** | `nomMarque`, `accroche`, `description`, `secteur`, `pays`, `brandNature`, `langue` | `publicCible`, `promesseFondamentale` (→D) | — |
| **D** | `assetsLinguistiques.languePrincipale`, `languesSecondaires` | `archetypalExpression` (→V) | — |
| **V** | `businessModel`, `economicModels`, `positioningArchetype`, `salesChannel`, `freeLayer` | `pricingJustification`, `personaSegmentMap` (→E) | — |
| **E** | `promesseExperience`, `superfanPortrait`, `conversionTriggers`, `barriersEngagement`, `primaryChannel` | `productExperienceMap`, `ladderProductAlignment`, `channelTouchpointMap` (→R) | `superfanPortrait.devotionPotential` |
| **R** | `overtonBlockers`, `devotionVulnerabilities` | `pillarGaps`, `coherenceRisks` (→T) | `overtonBlockers` |
| **T** | `source` sur quantitatifs, `overtonPosition`, `perceptionGap` | `riskValidation`, `competitorOvertonPositions` (→I) | `overtonPosition`, `perceptionGap` |
| **I** | `innovationsProduit` ; suppression `sprint90Days`/`annualCalendar` | `actionsByDevotionLevel`, `actionsByOvertonPhase`, `riskMitigationActions`, `hypothesisTestActions` (→S) | `devotionImpact`/`overtonShift` par action |
| **S** | `fenetreOverton` required, `northStarKPI` | `selectedFromI`, `rejectedFromI`, `devotionFunnel`, `overtonMilestones`, `budgetByDevotion` | Tout S est orienté Overton/Devotion |

### 5.3 Le contrat de maturité s'aligne sur le schema enrichi

Les contrats de maturité (`contracts-loader.ts`) DOIVENT référencer des champs qui existent dans le schema Zod. Les ajouts impactent les 3 stages :

- **INTAKE** : inclut les nouveaux fondamentaux (A: `nomMarque`, `secteur`, `pays` ; V: `businessModel`)
- **ENRICHED** : inclut les variables de transition (R: `pillarGaps` ; T: `riskValidation` ; etc.)
- **COMPLETE** : auto-dérivé des GLORY bindings (inchangé dans le mécanisme, mais les bindings sont corrigés)

### 5.4 Les prompts RTIS intègrent le schema

Chaque protocole RTIS (§0.4) reçoit le schema Zod sérialisé du pilier cible **ET** les variables de transition qu'il doit produire. Le LLM sait exactement quels champs générer.

### 5.5 Le scorer structural lit le contrat (pas ses propres champs hardcodés)

`semantic.ts` et ses fonctions `scoreA/D/V/E/R/T/I/S` hardcodées sont **supprimés**. Le scorer structural utilise le contrat de maturité comme seule source. Les nouvelles variables (fondamentales + transition + Overton) comptent dans le score.

### 5.6 Critères d'acceptation

- [ ] **SK-1** : Chaque pilier a un schema Zod unique contenant les 3 couches (existant + fondamental + transition + Overton)
- [ ] **SK-2** : Les prompts des 4 protocoles RTIS incluent le schema sérialisé du pilier cible
- [ ] **SK-3** : Chaque outil GLORY MCP a un `outputSchema` Zod qui définit les variables exactes qu'il produit
- [ ] **SK-4** : Chaque séquence GLORY a un `variableMap` qui mappe les outputs de ses outils vers les sections du livrable
- [ ] **SK-5** : Les séquences n'appellent JAMAIS le LLM — elles composent depuis les outputSchemas de leurs outils
- [ ] **SK-6** : Seuls les outils GLORY qui nécessitent un jugement créatif délèguent à Mestor (pas d'appel LLM direct dans l'outil)
- [ ] **SK-7** : Un test vérifie que chaque variable référencée dans un `variableMap` de séquence existe dans le `outputSchema` de l'outil source

### 5.7 Architecture des outputSchemas GLORY (LOI 9)

Chaque outil GLORY MCP est une machine déterministe :

```
Input  : variables pilier (pillarBindings) + contexte séquence (outputs précédents)
         ↓
Process : CALC (formule) ou COMPOSE (template) ou MESTOR_ASSIST (LLM via Mestor)
         ↓
Output : outputSchema Zod strict — variables NOMMÉES, pas du JSON libre
```

**Structure d'un outil GLORY v4 :**

```typescript
interface GloryToolDef {
  slug: string;
  name: string;
  layer: "CR" | "DC" | "HYBRID" | "BRAND";

  // Input — quelles variables pilier l'outil consomme
  pillarBindings: Record<string, string>;   // { inputField: "pillarKey.path" }

  // Execution — comment l'outil produit son output
  executionType: "CALC" | "COMPOSE" | "MESTOR_ASSIST";
  // CALC       : formule déterministe (ex: budget-optimizer, ROI-calculator)
  // COMPOSE    : template + variables (ex: brief-generator, guidelines-renderer)
  // MESTOR_ASSIST : Mestor décide, l'outil structure (ex: concept-generator, script-writer)

  // Output — les variables EXACTES que l'outil produit
  outputSchema: z.ZodObject<...>;           // Zod schema strict
  outputVariables: string[];                // Liste des clés de sortie

  // Livrable
  deliverableType?: string;                 // "rapport" | "brief" | "deck" | "guidelines" | null
}
```

**Structure d'une séquence v4 :**

```typescript
interface GlorySequenceDef {
  key: string;
  name: string;
  family: "PILLAR" | "PRODUCTION" | "STRATEGIC" | "OPERATIONAL";

  // Les outils dans l'ordre d'exécution
  steps: Array<{
    toolSlug: string;
    // Pas d'appel LLM dans le step — juste l'outil
  }>;

  // Le variableMap : comment les outputs des outils composent le livrable
  variableMap: Record<string, string>;
  // Clé = section du livrable final
  // Valeur = "toolSlug.outputVariable"
  // Ex: { "section_moodboard": "visual-moodboard-generator.moodboardDirections",
  //       "section_chromatic": "chromatic-strategy-builder.colorPalette" }

  // Output — le livrable final (composé, pas généré)
  outputSchema: z.ZodObject<...>;
}
```

**Exemple concret — Séquence BRANDBOOK-D :**

```
Step 1: semiotic-brand-analyzer
  Input  : a.archetype, d.positionnement
  Output : { dominantSigns[], archetypeVisual, semioticTensions[], recommendations[] }

Step 2: visual-landscape-mapper
  Input  : step1.dominantSigns, d.paysageConcurrentiel
  Output : { competitors[], whitespace[], positioningMap, opportunities[] }

Step 3: visual-moodboard-generator
  Input  : step1.archetypeVisual, step2.whitespace
  Output : { theme, keywords[], colorPalette[], textures[], references[] }

Step 4: chromatic-strategy-builder
  Input  : step3.colorPalette, a.valeurs
  Output : { primaryColors[], secondaryColors[], gradients[], forbiddenColors[] }

... (6 autres outils)

Livrable BRANDBOOK-D = COMPOSE :
  section_semiotic  ← step1.dominantSigns + step1.recommendations
  section_landscape ← step2.positioningMap + step2.opportunities
  section_moodboard ← step3 (tout)
  section_chromatic ← step4 (tout)
  ...

Zéro appel LLM dans la composition du livrable.
Mestor n'intervient que si un outil a executionType=MESTOR_ASSIST.
```
- [ ] **SK-3** : Le contrat de maturité référence uniquement des champs existants dans le schema
- [ ] **SK-4** : `semantic.ts` est supprimé (remplacé par le scoring contract-aware)
- [ ] **SK-5** : Un test vérifie que tout contenu généré par MESTOR passe `pillarSchema.safeParse()`

---

## 6. CHANTIER 4 — L'Essaim MESTOR (hiérarchie d'agents)

### 6.1 Problème

La v3 a 3 systèmes d'orchestration en parallèle qui s'ignorent. MESTOR n'est qu'un chatbot + un caller RTIS. ARTEMIS et GLORY tournent indépendamment. Pas de hiérarchie, pas de supervision.

### 6.2 Vision — MESTOR est un essaim d'agents hiérarchisés

MESTOR n'est pas un service parmi d'autres. C'est **l'intelligence centrale** — un essaim d'agents spécialisés organisés en hiérarchie militaire. Chaque agent a un rôle, un scope, et rend compte à son supérieur.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MESTOR                                      │
│                    (Essaim d'agents)                                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ COMMANDANT — Interface humaine (chat, recommandations)       │   │
│  │  Le seul qui parle au Fixer. Décide, recommande, arbitre.   │   │
│  │  Seul agent autorisé à appeler le LLM pour des décisions.   │   │
│  └──────────────────────┬───────────────────────────────────────┘   │
│                         │                                           │
│         ┌───────────────┼───────────────┐                           │
│         ▼               ▼               ▼                           │
│  ┌─────────────┐ ┌──────────────────┐ ┌─────────────┐              │
│  │ HYPERVISEUR │ │     SESHAT       │ │  4× PROTO   │              │
│  │  Stratégique│ │  Knowledge mgmt  │ │   RTIS      │              │
│  │             │ │  ┌────────────┐  │ │  (R,T,I,S)  │              │
│  │ Analyse     │ │  │  TARSIS    │  │ │             │              │
│  │ l'état de   │ │  │  Écoute    │  │ │ Chacun a    │              │
│  │ la stratégie│ │  │  marché &  │  │ │ sa logique  │              │
│  │ et priorise │ │  │  signaux   │  │ │ métier      │              │
│  │             │ │  │  faibles   │  │ │             │              │
│  └──────┬──────┘ │  └────────────┘  │ └──────┬──────┘              │
│         │        └──────────────────┘        │                     │
│         │                               │                           │
│         ▼                               ▼                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ARTEMIS — Orchestrateur d'outils GLORY                       │   │
│  │                                                              │   │
│  │  ┌────────────┐                                              │   │
│  │  │ 8× DIRECTEUR DE PILIER (A/D/V/E/R/T/I/S)                │   │
│  │  │  - Évalue la santé de son pilier (maturity, gaps)        │   │
│  │  │  - Valide les writebacks (changements proposés safe ?)   │   │
│  │  │  - Gate : autorise ou bloque l'exécution des séquences   │   │
│  │  │  - Chaque directeur connaît ses variables (contrat)      │   │
│  │  └────────────┘                                              │   │
│  │                                                              │   │
│  │  ┌────────────┐                                              │   │
│  │  │ SUPERVISEUR DE SÉQUENCE                                   │   │
│  │  │  - Valide : les prérequis sont-ils remplis ?             │   │
│  │  │  - Suit la progression (steps complétés)                 │   │
│  │  │  - Assure la cohérence inter-outils dans la séquence     │   │
│  │  │  - Compose le livrable final via variableMap (LOI 9)     │   │
│  │  └────────────┘                                              │   │
│  │                                                              │   │
│  │  ┌────────────┐                                              │   │
│  │  │ ORCHESTRATEUR D'OUTILS                                    │   │
│  │  │  - Exécute les outils GLORY step-by-step                 │   │
│  │  │  - Résout les bindings (pillar → input variable)         │   │
│  │  │  - Route : CALC, COMPOSE, ou MESTOR_ASSIST               │   │
│  │  │  - Capture les outputs dans les outputSchemas            │   │
│  │  └────────────┘                                              │   │
│  │                                                              │   │
│  │  ┌────────────┐                                              │   │
│  │  │ 39× OUTILS GLORY (MCP atomiques)                         │   │
│  │  │  - Input : variables pilier (bindings)                   │   │
│  │  │  - Process : CALC | COMPOSE | MESTOR_ASSIST              │   │
│  │  │  - Output : outputSchema strict (variables nommées)      │   │
│  │  └────────────┘                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ PILLAR GATEWAY — Point d'écriture unique (Chantier 1)        │   │
│  │  Tous les agents écrivent via le Gateway, jamais en direct.  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 Rôle de chaque agent

#### 6.3.1 COMMANDANT (le cerveau — LLM)

```
Service  : src/server/services/mestor/commandant.ts
Scope    : Interface humaine, décisions stratégiques, arbitrages
LLM      : OUI — le seul agent qui appelle Claude pour des DÉCISIONS
```

**Responsabilités :**
- Parler au Fixer (chat adaptatif 4 modes : cockpit/creator/console/intake)
- Prendre les décisions stratégiques (recommandations, arbitrages ADVE)
- Piloter l'Hyperviseur ("que doit-on faire maintenant ?")
- Assister les outils GLORY de type MESTOR_ASSIST (fournir le jugement créatif)
- Générer les insights proactifs (alertes, opportunités)
- Simuler les scénarios what-if

**Ne fait PAS :**
- N'exécute pas directement les outils GLORY
- N'écrit pas dans les piliers (passe par le Gateway)
- Ne score pas (c'est du CALC pur)

#### 6.3.2 HYPERVISEUR (le stratège)

```
Service  : src/server/services/mestor/hyperviseur.ts
Scope    : Analyse de l'état de la stratégie, priorisation, planification
LLM      : NON — logique déterministe
```

**Responsabilités :**
- Analyser l'état de santé de la stratégie (lecture des 8 Directeurs de Pilier)
- Détecter la phase (QUICK_INTAKE → BOOT → ACTIVE → GROWTH)
- Prioriser : quels protocoles RTIS lancer, quelles séquences GLORY recommander
- Produire le **plan d'orchestration** (liste ordonnée de steps avec dépendances)
- Intégrer les recommandations des Directeurs de Pilier dans le plan

**Produit :**
```typescript
interface OrchestrationPlan {
  strategyId: string;
  phase: StrategyPhase;
  steps: OrchestrationStep[];
  estimatedCost: number;
  estimatedDuration: number;
}

interface OrchestrationStep {
  id: string;
  agent: "PROTOCOLE_R" | "PROTOCOLE_T" | "PROTOCOLE_I" | "PROTOCOLE_S"
       | "ARTEMIS_SEQUENCE" | "ARTEMIS_TOOL" | "SCORE" | "WAIT_HUMAN";
  target: string;
  priority: number;
  dependsOn: string[];
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED" | "WAITING";
  result?: unknown;
  error?: string;
  retryCount: number;
  maxRetries: number;
}
```

**Plan type — Phase BOOT :**
```
Step 1:  PROTOCOLE_R                [depends: ADVE validated]
Step 2:  PROTOCOLE_T                [depends: Step 1]
Step 3:  COMMANDANT.generateRecos   [depends: Step 2] — Mestor décide les recos ADVE
Step 4:  WAIT_HUMAN("accept_recos") [depends: Step 3]
Step 5:  PROTOCOLE_I                [depends: Step 4] — après accept recos
Step 6:  PROTOCOLE_S                [depends: Step 5] — pioche dans I
Step 7:  ARTEMIS_SEQUENCE("BRAND")  [depends: D at COMPLETE maturity]
Step 8:  ARTEMIS_SEQUENCE("MANIFESTE-A") [depends: A at COMPLETE]
Step 9:  SCORE.recalculate          [depends: all previous]
```

#### 6.3.3 DIRECTEUR DE PILIER (8 gardes — un par pilier ADVERTIS)

```
Service  : src/server/services/mestor/pillar-directors.ts
Scope    : Santé, validation et protection d'un pilier spécifique
LLM      : NON — logique déterministe basée sur les contrats de maturité
Instances: 8 (un par lettre A/D/V/E/R/T/I/S)
```

**Responsabilités :**
- **Évaluer la santé** de son pilier : maturityStage, completeness%, gaps critiques, gaps dérivables
- **Valider les writebacks** : quand un outil ou protocole veut écrire dans ce pilier, le directeur vérifie que le changement est safe (pas d'écrasement de données humaines, pas de contradiction)
- **Gate d'exécution** : autoriser ou bloquer l'exécution d'une séquence GLORY qui dépend de ce pilier (pilier pas assez mature = séquence bloquée)
- **Connaître ses variables** : chaque directeur connaît le contrat de maturité de son pilier (INTAKE → ENRICHED → COMPLETE), les bindings GLORY qui le lisent, et les séquences qui y écrivent
- **Reporter à l'Hyperviseur** : fournir un `PillarHealthReport` pour la construction du plan

**Interface :**
```typescript
interface PillarDirector {
  pillarKey: PillarKey;

  assessHealth(strategyId: string): Promise<PillarHealthReport>;
  validateWriteback(currentContent: unknown, proposedChanges: unknown): WritebackVerdict;
  canExecuteSequence(sequenceKey: string, strategyId: string): Promise<boolean>;
  getAtomicPaths(): string[];          // Toutes les variables de ce pilier
  getDependencies(): PillarKey[];      // Piliers dont il dépend (cascade ADVERTIS)
  getDependents(): PillarKey[];        // Piliers qui dépendent de lui
}
```

#### 6.3.4 ARTEMIS (l'orchestrateur d'outils GLORY)

```
Service  : src/server/services/mestor/artemis.ts
Scope    : Exécution des séquences GLORY + frameworks diagnostiques
LLM      : NON pour l'orchestration — les outils MESTOR_ASSIST demandent au Commandant
```

**Sous-agents :**

**Superviseur de Séquence :**
- Valide que les prérequis d'une séquence sont remplis (Directeurs de Pilier consultés)
- Suit la progression step-by-step
- Compose le livrable final via le `variableMap` (LOI 9 — zéro LLM, composition pure)
- En cas d'échec d'un step, décide : retry, skip, ou abort (règles déterministes)

**Orchestrateur d'Outils :**
- Exécute chaque outil GLORY dans l'ordre de la séquence
- Résout les bindings : `pillarKey.path` → valeur concrète depuis le contenu du pilier
- Route selon `executionType` :
  - `CALC` → exécute la formule, retourne l'outputSchema rempli
  - `COMPOSE` → assemble le template avec les variables, retourne l'outputSchema
  - `MESTOR_ASSIST` → envoie le contexte au Commandant, reçoit la décision, la structure dans l'outputSchema
- Capture l'output dans le `outputSchema` strict de l'outil
- Passe l'output au step suivant (chaînage de variables)

**39 Outils GLORY (MCP atomiques) :**
- Chacun a un `outputSchema` Zod strict
- Chacun a un `executionType` (CALC | COMPOSE | MESTOR_ASSIST)
- Aucun outil n'appelle le LLM directement — si besoin de jugement, MESTOR_ASSIST délègue au Commandant
- Les outputs sont des variables nommées, pas du texte libre

#### 6.3.5 SESHAT (l'intelligence — avec TARSIS comme outil d'écoute)

```
Service  : src/server/services/mestor/seshat.ts
Scope    : Knowledge management — études de marché, benchmarks, signaux
LLM      : SESHAT = zéro LLM (query DB + agrégation). TARSIS (outil interne) = MESTOR_ASSIST pour l'analyse causale.
```

**SESHAT** est le système de gestion de l'intelligence marché :
- Gère le Knowledge Graph (KnowledgeEntry)
- Fournit des références/benchmarks aux outils GLORY et aux protocoles RTIS
- Seedé avec des benchmarks sectoriels au `strategy.create` (Chantier 7)
- Enrichi par chaque exécution ARTEMIS (les résultats deviennent des entrées knowledge)
- Agrège les données de marché pour alimenter le protocole T (Track)

**TARSIS** est un **outil de SESHAT** (pas un système séparé) :
- C'est le capteur/scanner de SESHAT — son instrument d'écoute marché
- Scanne à la recherche de signaux faibles (ex: incendie plantation blé → prix farine)
- Analyse les chaînes causales (via MESTOR_ASSIST — le Commandant fournit le jugement)
- Les signaux détectés sont stockés dans SESHAT (KnowledgeEntry + WeakSignalAnalysis)
- Alimente le protocole T avec des données marché structurées

#### 6.3.6 Les 4 PROTOCOLES RTIS (agents spécialisés par pilier)

```
Service  : src/server/services/mestor/rtis-protocols/{risk,track,innovation,strategy}.ts
Scope    : Génération et gestion du contenu de chaque pilier RTIS
LLM      : Hybride — scan déterministe + MESTOR_ASSIST pour l'enrichissement
```

Chaque protocole est un agent spécialisé (spécifié en détail dans le Chantier 0 §0.4) :

| Protocole | Input | Logique métier | LLM ? |
|---|---|---|---|
| **Risk (R)** | ADVE | Scan vulnérabilités (déterministe) → enrichissement SWOT (MESTOR_ASSIST) | Hybride |
| **Track (T)** | ADVE+R | Sources SESHAT d'abord → triangulation → mesure Overton (MESTOR_ASSIST) | Hybride |
| **Innovation (I)** | ADVE+R+T | Catalogue exhaustif (MESTOR_ASSIST) → tri par Devotion/Overton (déterministe) | Hybride |
| **Strategy (S)** | ADVE+R+T+I | Pioche dans I (déterministe) → roadmap + Overton (MESTOR_ASSIST) → KPIs (CALC) | Hybride |

**Chaque protocole écrit via le Pillar Gateway** et passe par son Directeur de Pilier pour validation.

### 6.4 Flux de communication entre agents

```
Fixer (humain)
  │
  ▼
COMMANDANT ◄──────────────────────────────────┐
  │ "Que doit-on faire ?"                     │ Retour : insights, alertes
  ▼                                           │
HYPERVISEUR                                   │
  │ Consulte les 8 Directeurs                 │
  │ Produit un OrchestrationPlan              │
  ▼                                           │
Exécution du plan :                           │
  ├── PROTOCOLE_R → Directeur R valide → Gateway écrit R
  ├── PROTOCOLE_T → SESHAT fournit data → Directeur T valide → Gateway écrit T
  ├── COMMANDANT → génère recos ADVE (LLM) → WAIT_HUMAN
  ├── PROTOCOLE_I → Directeur I valide → Gateway écrit I
  ├── PROTOCOLE_S → Directeur S valide → Gateway écrit S
  ├── ARTEMIS → Superviseur → Orchestrateur → Outils GLORY → Directeur valide → Gateway écrit
  └── SCORE → recalculate (CALC pur) ─────────┘
```

### 6.5 La cascade RTIS devient un sous-plan de l'Hyperviseur

`runRTISCascade()` n'existe plus comme fonction autonome. L'Hyperviseur génère un plan qui INCLUT les steps RTIS :

```typescript
function buildPlan(strategyId: string): OrchestrationPlan {
  const directors = assessAllDirectors(strategyId);
  const phase = detectPhase(directors);

  const steps: OrchestrationStep[] = [];

  // RTIS cascade (si ADVE est prêt)
  if (directors.every(d => ["a","d","v","e"].includes(d.pillarKey) ? d.maturityStage !== "EMPTY" : true)) {
    steps.push({ id: "r", agent: "PROTOCOLE_R", target: "R", dependsOn: [] });
    steps.push({ id: "t", agent: "PROTOCOLE_T", target: "T", dependsOn: ["r"] });
    steps.push({ id: "recos", agent: "COMMANDANT", target: "recos:ADVE", dependsOn: ["t"] });
    steps.push({ id: "wait", agent: "WAIT_HUMAN", target: "accept_recos", dependsOn: ["recos"] });
    steps.push({ id: "i", agent: "PROTOCOLE_I", target: "I", dependsOn: ["wait"] });
    steps.push({ id: "s", agent: "PROTOCOLE_S", target: "S", dependsOn: ["i"] });
  }

  // GLORY séquences (si les directeurs autorisent)
  for (const seq of getRecommendedSequences(directors, phase)) {
    steps.push({
      id: `glory-${seq.key}`,
      agent: "ARTEMIS_SEQUENCE",
      target: seq.key,
      dependsOn: seq.prerequisites.map(p => p.id),
    });
  }

  // Score final
  steps.push({ id: "score", agent: "SCORE", target: "recalculate", dependsOn: steps.map(s => s.id) });

  return { strategyId, phase, steps, ... };
}
```

### 6.6 Persistance et supervision

Le plan est **persisté en DB** :
- Nouveau modèle `OrchestrationPlan` + `OrchestrationStep`
- Survit aux crashes, timeouts, redéploiements
- L'Hyperviseur reprend les steps PENDING au restart

Chaque step est **supervisé** :
- Status tracké (PENDING → RUNNING → COMPLETED | FAILED | SKIPPED)
- Retry automatique 1x en cas d'erreur
- Notification au Fixer en cas d'échec persistant
- Le Fixer peut pause, skip, ou re-prioriser depuis la Console

### 6.7 Critères d'acceptation

- [ ] **OR-1** : La hiérarchie Commandant → Hyperviseur → Directeurs → ARTEMIS → Outils est implémentée
- [ ] **OR-2** : Seul le Commandant appelle le LLM pour des décisions (LOI 9)
- [ ] **OR-3** : L'Hyperviseur consulte les 8 Directeurs avant de produire un plan
- [ ] **OR-4** : Chaque Directeur de Pilier gate l'exécution des séquences qui dépendent de son pilier
- [ ] **OR-5** : ARTEMIS orchestre les outils GLORY via le Superviseur de Séquence
- [ ] **OR-6** : Le Superviseur compose les livrables via `variableMap` (zéro LLM)
- [ ] **OR-7** : Les Protocoles RTIS sont des agents dédiés (pas des prompts generiques)
- [ ] **OR-8** : Le plan inclut `WAIT_HUMAN` entre les recos et I/S
- [ ] **OR-9** : Le plan est persisté en DB et reprend après crash
- [ ] **OR-10** : Le Fixer voit le plan dans la Console et peut le contrôler
- [ ] **OR-11** : SESHAT fournit des données aux Protocoles T et I (pas juste vide)
- [ ] **OR-12** : Tout write passe par le Pillar Gateway après validation du Directeur

---

## 7. CHANTIER 5 — Le Réseau d'Opérateurs

### 7.1 Problème

Le modèle `Operator` est plat. Pas de hiérarchie, pas de type d'agence, pas de collaboration inter-agences. UPgraders (le Fixer) ne peut pas :
- Distinguer ses agences comm de ses agences RP ou média
- Allouer un client à plusieurs agences
- Voir la performance par type d'agence

### 7.2 Solution — Enrichir le modèle Operator

```prisma
model Operator {
  // ... champs existants ...

  // NOUVEAU — Type et spécialisation
  agencyType     AgencyType     @default(COMMUNICATION)
  specializations String[]      // ["BRANDING", "DIGITAL", "EVENTS", ...]

  // NOUVEAU — Hiérarchie
  parentId       String?        // UPgraders = null (racine). Agences = parentId → UPgraders
  parent         Operator?      @relation("OperatorHierarchy", fields: [parentId], references: [id])
  children       Operator[]     @relation("OperatorHierarchy")

  // NOUVEAU — Collaboration
  clientAllocations ClientAllocation[]
}

enum AgencyType {
  HOLDING          // UPgraders — l'entité mère
  COMMUNICATION    // Agence conseil en communication
  RELATIONS_PUBLIQUES
  MEDIA_BUYING
  DIGITAL
  EVENEMENTIEL
  PRODUCTION
  CUSTOM
}

// NOUVEAU — Allocation client multi-agences
model ClientAllocation {
  id          String   @id @default(cuid())
  clientId    String
  operatorId  String
  role        AllocationRole  // LEAD, SUPPORT, SPECIALIST
  scope       String[]        // ["BRANDING", "SOCIAL_MEDIA", "PR", ...]
  startDate   DateTime
  endDate     DateTime?

  client      Client   @relation(fields: [clientId], references: [id])
  operator    Operator @relation(fields: [operatorId], references: [id])

  @@unique([clientId, operatorId])
}

enum AllocationRole {
  LEAD        // Agence principale, ownership stratégique
  SUPPORT     // Agence d'appui sur un scope précis
  SPECIALIST  // Spécialiste ponctuel (production, événement)
}
```

### 7.3 Vue réseau dans la Console

La page `/console/ecosystem/operators` affiche :
- L'arbre hiérarchique UPgraders → agences
- Le type de chaque agence (badge couleur)
- Les clients alloués avec le rôle de chaque agence
- Les métriques agrégées par type d'agence

### 7.4 Vue partagée pour les agences collaborant sur un client

Quand 2+ agences sont allouées sur le même client :
- Chaque agence voit la stratégie de marque (lecture seule sur les piliers hors de son scope)
- Chaque agence voit les campagnes de son scope
- Un calendrier partagé montre les activations de toutes les agences
- Le brief peut être tagué par scope pour routage automatique

### 7.5 Critères d'acceptation

- [ ] **OP-1** : Le modèle Operator a `agencyType`, `parentId`, `specializations`
- [ ] **OP-2** : `ClientAllocation` permet d'allouer un client à N agences avec rôles
- [ ] **OP-3** : La Console affiche l'arbre hiérarchique du réseau
- [ ] **OP-4** : L'Agency portal filtre les données par scope d'allocation
- [ ] **OP-5** : Deux agences sur le même client voient un calendrier partagé

---

## 8. CHANTIER 6 — Le Talent Engine

### 8.1 Problème

- Le vecteur ADVE des talents est un JSON libre jamais calculé
- Le matching dégénère en tri par tier
- Le portfolio n'influence pas le matching
- La promotion n'est jamais déclenchée automatiquement
- Le QC ne prend pas en compte la spécialité du reviewer
- Le `minTier` est UI-only, pas enforced côté serveur

### 8.2 Solution — Vecteur ADVE talent vivant

Le vecteur ADVE d'un talent est **calculé automatiquement** à partir de ses missions terminées :

```typescript
async function recalculateTalentVector(talentId: string): Promise<AdvertisVector> {
  // 1. Charger les 20 dernières missions COMPLETED avec QC score
  const missions = await db.mission.findMany({
    where: { assigneeId: talentId, status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      strategy: { select: { advertis_vector: true } },
      deliverables: { include: { qualityReviews: true } },
    },
  });

  // 2. Pour chaque mission, pondérer le vecteur de la stratégie par le QC score
  // Un talent qui score bien sur des missions A-heavy a un vecteur A fort
  const weightedPillars = { a: 0, d: 0, v: 0, e: 0, r: 0, t: 0, i: 0, s: 0 };
  let totalWeight = 0;

  for (const mission of missions) {
    const stratVec = mission.strategy?.advertis_vector as Record<string, number> | null;
    const avgQC = avgReviewScore(mission.deliverables);
    if (!stratVec || !avgQC) continue;

    const weight = avgQC / 10; // QC score 0-10 → weight 0-1
    for (const key of PILLAR_KEYS) {
      weightedPillars[key] += (stratVec[key] ?? 0) * weight;
    }
    totalWeight += weight;
  }

  // 3. Normaliser
  if (totalWeight > 0) {
    for (const key of PILLAR_KEYS) {
      weightedPillars[key] = Math.round((weightedPillars[key] / totalWeight) * 100) / 100;
    }
  }

  // 4. Composite
  const composite = Object.values(weightedPillars).reduce((s, v) => s + v, 0);

  return { ...weightedPillars, composite, confidence: Math.min(0.95, missions.length / 20) };
}
```

**Trigger** : recalculé automatiquement à chaque mission COMPLETED (dans le Gateway de mission completion).

### 8.3 Matching amélioré

Le matching utilise maintenant :
1. **Vecteur ADVE** du talent vs vecteur de la mission (cosine similarity) — 40% du score
2. **Spécialité driver** (channel match) — 20%
3. **Tier minimum** (gate, pas score) — filtre binaire
4. **First-pass rate** (>80% = bonus) — 15%
5. **Portfolio tags** (pillar tags des portfolio items vs mission pillar focus) — 15%
6. **Disponibilité** (missions en cours < seuil par tier) — 10%

### 8.4 Promotion automatique

Un cron job quotidien évalue tous les talents ACTIVE :

```typescript
// Trigger: cron daily à 6h
async function evaluateAllPromotions() {
  const talents = await db.talentProfile.findMany({ where: { /* ACTIVE membership */ } });
  for (const talent of talents) {
    const evaluation = evaluateCreator(talent);
    if (evaluation.recommendation === "PROMOTE") {
      // Crée une notification au Fixer : "X est éligible à la promotion COMPAGNON → MAITRE"
      // Le Fixer approuve ou rejette
      await createPromotionProposal(talent.id, evaluation.suggestedTier);
    }
    if (evaluation.recommendation === "DEMOTE") {
      // Notification urgente au Fixer
      await createDemotionAlert(talent.id, evaluation.suggestedTier, evaluation.reason);
    }
  }
}
```

### 8.5 QC avec spécialité

Le peer review assigne un reviewer qui :
1. Est de tier supérieur (existant)
2. A une spécialité driver qui matche le driver de la mission (nouveau)
3. A un vecteur ADVE proche de celui de la stratégie (nouveau)

### 8.6 `minTier` enforced serveur

Toute procédure tRPC Creator qui a un `minTier` dans la nav doit avoir un middleware :

```typescript
const tierGuard = (minTier: GuildTier) => protectedProcedure.use(async ({ ctx, next }) => {
  const profile = await ctx.db.talentProfile.findUnique({ where: { userId: ctx.session.user.id } });
  const tierOrder = { APPRENTI: 0, COMPAGNON: 1, MAITRE: 2, ASSOCIE: 3 };
  if (!profile || tierOrder[profile.tier] < tierOrder[minTier]) {
    throw new TRPCError({ code: "FORBIDDEN", message: `Tier minimum requis : ${minTier}` });
  }
  return next();
});
```

### 8.7 Critères d'acceptation

- [ ] **TL-1** : Le vecteur ADVE du talent est recalculé à chaque mission COMPLETED
- [ ] **TL-2** : Le matching utilise le cosine similarity sur les vecteurs ADVE
- [ ] **TL-3** : Le portfolio (pillarTags) influence le score de matching
- [ ] **TL-4** : Un cron daily évalue les promotions et crée des propositions
- [ ] **TL-5** : Le peer review prend en compte la spécialité driver du reviewer
- [ ] **TL-6** : `minTier` est enforced par un middleware tRPC (pas UI-only)

---

## 9. CHANTIER 7 — L'Intelligence Réelle

### 9.1 Problème

- TARSIS / Market Intelligence = LLM hallucination
- SESHAT = toujours vide
- Les TAM/SAM/SOM sont inventés
- Les scénarios what-if sont des templates statiques

### 9.2 Solution — Honnêteté + enrichissement progressif

#### 9.2.1 Marquage des données AI vs sourcées

Chaque champ de pilier qui contient une donnée quantitative (TAM, SAM, SOM, riskScore, brandMarketFitScore...) porte un tag :

```typescript
interface SourcedValue<T> {
  value: T;
  source: "ai_estimate" | "operator_input" | "external_data" | "calculated";
  sourceRef?: string;      // URL, nom de la source, ID du rapport
  confidence: number;       // 0-1
  generatedAt: string;      // ISO date
}
```

Le frontend affiche un badge distinct :
- **Donnée sourcée** : badge vert "Vérifié" avec lien vers la source
- **Estimation IA** : badge orange "Estimation IA" avec tooltip "Ce chiffre est une estimation générée par l'IA, non vérifiée par une source externe"
- **Saisie opérateur** : badge bleu "Manuel"

#### 9.2.2 SESHAT — Seeding initial + feedback loop

Au lieu d'attendre que SESHAT soit rempli par les missions (qui n'existent pas encore sur une nouvelle stratégie), on seede les `KnowledgeEntry` depuis :

1. **Benchmarks sectoriels** — Un fichier JSON par secteur (FMCG, TECH, BANQUE, etc.) avec des données de référence pré-chargées
2. **Résultats ARTEMIS** — Chaque framework ARTEMIS terminé crée un `KnowledgeEntry` taggé par secteur/market/pillar
3. **Outcomes de missions** — Comme aujourd'hui, mais avec un enrichissement structuré

Le seeding se fait au `strategy.create` : on injecte les benchmarks du secteur de la stratégie.

#### 9.2.3 Scénarios what-if — Appel LLM réel

Remplacer les templates statiques par un vrai appel LLM contextualisé :

```typescript
async function runScenario(input: ScenarioInput): Promise<ScenarioResult> {
  const strategy = await loadFullStrategy(input.strategyId);
  const prompt = buildScenarioPrompt(input, strategy);
  const result = await callLLM(SCENARIO_SYSTEM_PROMPT, prompt, input.strategyId);
  const parsed = extractJSON(result);

  // Marquer toutes les projections comme ai_estimate
  parsed.impacts.forEach(i => { i.source = "ai_estimate"; });

  return parsed;
}
```

### 9.3 Critères d'acceptation

- [ ] **IN-1** : Toute donnée quantitative dans les piliers R/T/S porte un tag `source`
- [ ] **IN-2** : Le frontend distingue visuellement les estimations IA des données sourcées
- [ ] **IN-3** : SESHAT est seedé avec des benchmarks sectoriels au `strategy.create`
- [ ] **IN-4** : Les scénarios what-if font un vrai appel LLM contextualisé (plus de templates)
- [ ] **IN-5** : Chaque KnowledgeEntry créée par ARTEMIS est taggée par secteur/market/pillar

---

## 10. CHANTIER 8 — La Couche Financière

### 10.1 Problème

3 flux financiers coexistent sans réconciliation :
- **Commissions** (talent payouts)
- **BudgetLines** (campaign budgets)
- **Contract.value** (engagement client)

L'opérateur ne peut pas voir "J'ai facturé X, dépensé Y, ma marge est Z".

Le budget de mission est souvent null → fallback 100K XAF pour toutes les commissions.

### 10.2 Solution — Le P&L par client

#### 10.2.1 Budget obligatoire sur mission

```prisma
model Mission {
  // ...
  budget     Float     // REQUIRED — plus de default null
  currency   String    @default("XAF")
}
```

Le router `mission.create` REFUSE la création si `budget` n'est pas fourni. Le Fixer doit estimer le budget même approximativement.

#### 10.2.2 Vue P&L par client

Nouveau service `src/server/services/financial-reconciliation/index.ts` :

```typescript
interface ClientPnL {
  clientId: string;
  period: { from: Date; to: Date };

  revenue: {
    contractValue: number;      // Somme des Contract.value actifs
    invoicedAmount: number;     // Somme des Invoice PAID
  };

  costs: {
    talentCommissions: number;  // Somme des Commission.netAmount
    operatorFees: number;       // Somme des Commission.operatorFee
    mediaSpend: number;         // Somme des CampaignAmplification.budget
    productionCosts: number;    // Somme des BudgetLine(PRODUCTION)
    aiCosts: number;            // Somme des AICostLog pour ce client
  };

  margin: {
    gross: number;              // revenue.invoiced - costs.total
    grossPct: number;           // gross / revenue.invoiced * 100
    net: number;                // gross - operatorFees - aiCosts
    netPct: number;
  };

  breakdown: {
    byCampaign: Array<{ campaignId: string; name: string; budget: number; spent: number; margin: number }>;
    byTalent: Array<{ talentId: string; name: string; totalPaid: number; missionCount: number }>;
  };
}
```

#### 10.2.3 Escrow déclaratif

L'escrow reste un état comptable (pas d'intégration bancaire pour la v4). Mais il est **connecté** :
- Quand un contrat est signé, un escrow est auto-créé pour le montant du contrat
- Les conditions de l'escrow correspondent aux milestones de la campagne
- Quand un milestone est marqué COMPLETED, la condition correspondante est auto-vérifiée
- Quand toutes les conditions sont remplies, l'escrow passe en RELEASED

### 10.3 Critères d'acceptation

- [ ] **FI-1** : `Mission.budget` est requis (non-nullable, validation tRPC)
- [ ] **FI-2** : Le service P&L par client est disponible dans la Console et l'Agency portal
- [ ] **FI-3** : L'escrow est auto-créé à la signature de contrat et auto-released sur milestones
- [ ] **FI-4** : Le P&L inclut les coûts IA (`aICostLog`) par client

---

## 11. CHANTIER 9 — Les Portails Adaptés

### 11.1 Cockpit — 8 onglets pilier + parler marketing

Le Cockpit est le portail des marques (les clients finaux). Chaque pilier a son propre onglet.

#### 8 onglets pilier (1 par lettre ADVERTIS)

Chaque pilier a sa propre page/onglet dans le Cockpit. Deux catégories d'onglets :

**ADVE — Onglets d'édition (saisie humaine + assistance Mestor)**

| Onglet | Nom client (pas le nom interne) | Contenu | UX |
|---|---|---|---|
| A | **Identité** | Nom, archétype, valeurs, hero's journey, prophecy, ennemi, équipe | Formulaire guidé + assistant Mestor |
| D | **Positionnement & Design** | Personas, concurrents, ton de voix, direction artistique, assets linguistiques | Formulaire + previews visuels |
| V | **Offre & Pricing** | Catalogue produits, product ladder, unit economics, modèle d'affaires | Formulaire + calculateurs |
| E | **Expérience & Engagement** | Touchpoints, rituels, Devotion Ladder, AARRR, superfan portrait | Formulaire + funnel visuel |

**RTIS — Onglets de gestion avancée (protocoles + feedback loop)**

| Onglet | Nom client | Contenu | UX |
|---|---|---|---|
| R | **Diagnostic** | SWOT, matrice de risques, blocages Overton, vulnérabilités Devotion | Visualisation + alertes (pas d'édition manuelle — généré par protocole) |
| T | **Réalité Marché** | Triangulation, hypothèses (validées/invalidées), TAM/SAM/SOM, position Overton, écart de perception | Dashboard + badges source (IA vs vérifié) |
| I | **Potentiel** | Catalogue d'actions par canal, par Devotion, par Overton. Innovations produit. Assets produisibles. | Catalogue explorable + filtres (Devotion, canal, budget) |
| S | **Stratégie** | Fenêtre d'Overton (le cœur), roadmap 4 phases avec objectifs Devotion, sprint 90j, KPIs, actions sélectionnées depuis I | Roadmap interactive + funnel Devotion + Overton visuel |

**Ce qui distingue les onglets RTIS :**

1. **Pas d'édition manuelle libre** — le contenu est produit par les protocoles RTIS. Le Fixer peut accepter/rejeter les recommandations, pas éditer directement le SWOT.
2. **Boucle de feedback visible** — l'onglet R/T montre les recommandations qu'il a produites pour ADVE. L'onglet S montre d'où viennent ses actions (traçabilité `selectedFromI`).
3. **Badges de provenance** — chaque donnée quantitative dans T affiche `source: verified` (badge vert) ou `source: ai_estimate` (badge orange).
4. **Protocoles de gestion avancés** — relancer le protocole R, actualiser T avec des données fraîches, re-générer I après modification de la roadmap S. Boutons d'action liés à l'Hyperviseur.
5. **Overton et Devotion en fil rouge** — les onglets RTIS affichent toujours la position Overton actuelle et la progression Devotion Ladder en contexte.

#### Renommage de surface (Console → Cockpit)

| Interne (Console) | Cockpit (Client) |
|---|---|
| Pilier A — Authenticité, score 17/25 | Identité — 68% complet |
| Pilier R — Risk | Diagnostic — 3 alertes actives |
| Pilier I — Innovation | Potentiel — 47 actions identifiées |
| Pilier S — Strategy | Stratégie — Phase 2 en cours |
| Scoring /200 | Santé de marque (jauge visuelle) |
| maturityStage COMPLETE | Prêt pour exécution |
| Fenêtre d'Overton | Perception marché (visuel avant/après) |
| Devotion Ladder | Engagement communauté (funnel visuel) |

Le scoring interne (/200, par pilier /25) est **masqué**. Le client voit des jauges visuelles (%) et des statuts qualitatifs (Fort / En progrès / Critique).

#### Vue "Mes livrables"

Page dédiée `/cockpit/deliverables` :
- Les missions en cours pour cette marque
- Les livrables en attente de validation client
- L'historique des livrables approuvés
- Les rapports ARTEMIS générés (Oracle + 8 fonctionnels)
- Filtré par Client, pas par Strategy

#### Console vs Cockpit — même 8 onglets, profondeur différente

| Aspect | Console (Fixer) | Cockpit (Client) |
|---|---|---|
| **ADVE** | Édition complète + scoring /25 + maturity gates + variables brutes | Édition guidée + % complet + statuts qualitatifs |
| **RTIS** | Protocoles visibles (steps, status, retries) + variables brutes + recommandations + writeback history | Dashboard lecture seule + alertes + badges source |
| **Overton** | Position numérique + gap score + milestones techniques | Visuel avant/après avec jauge |
| **Devotion** | Snapshots quantifiés + funnel par phase + targets numériques | Funnel visuel simplifié |
| **Orchestration** | Plan complet visible (Hyperviseur) + contrôle (pause/skip/retry) | Invisible (le client voit le résultat, pas le process) |
| **GLORY outputs** | Tous les outputs par outil + outputSchemas | Rapports compilés (Oracle + 8 fonctionnels) |

### 11.2 Agency — Vue adaptée par type d'agence

Le portail Agency s'adapte au `agencyType` de l'Operator :

| AgencyType | Sections visibles | Sections masquées |
|---|---|---|
| COMMUNICATION | Tout | — |
| RELATIONS_PUBLIQUES | Clients, PR, Missions, Commissions | GLORY, Drivers digitaux, Social |
| MEDIA_BUYING | Clients, Media, Campagnes, Budget | GLORY créatif, PR |
| DIGITAL | Clients, Social, Campagnes, GLORY | PR, Media traditionnel |
| PRODUCTION | Clients, Missions, QC, Commissions | Stratégie, Intelligence |

#### Accès au pool de talents

L'Agency portal obtient un accès **en lecture** à l'Arène :
- Voir les talents disponibles dans la guilde
- Demander l'assignation d'un talent sur une mission (le Fixer valide)
- Voir les métriques de ses talents assignés

### 11.3 Creator — Notifications et lisibilité

- Notification push quand une mission matche le profil du talent
- Le vecteur ADVE du talent est affiché comme "Forces" (radar chart) pas comme "ADVE vector"
- Les missions disponibles sont triées par matching score (pas par date)

### 11.4 Critères d'acceptation

- [ ] **PT-1** : Le Cockpit a 8 onglets séparés (1 par pilier ADVERTIS) avec des noms client (pas internes)
- [ ] **PT-2** : Les onglets ADVE (A/D/V/E) sont des éditeurs guidés (formulaire + Mestor)
- [ ] **PT-3** : Les onglets RTIS (R/T/I/S) sont des interfaces de gestion avancée (pas d'édition libre)
- [ ] **PT-4** : Les onglets RTIS affichent les badges de provenance (verified/ai_estimate) sur chaque donnée quantitative
- [ ] **PT-5** : Les onglets RTIS ont des boutons de relance de protocole (reliés à l'Hyperviseur)
- [ ] **PT-6** : L'onglet S affiche la traçabilité `selectedFromI` (d'où viennent les actions)
- [ ] **PT-7** : L'Overton et la Devotion Ladder sont visibles en fil rouge sur tous les onglets RTIS
- [ ] **PT-8** : Le Cockpit n'affiche aucun score /25 ni /200 — uniquement des % et des statuts qualitatifs
- [ ] **PT-9** : Le Cockpit a une page "Mes livrables" filtrée par client (rapports Oracle + 8 fonctionnels)
- [ ] **PT-10** : L'Agency portal adapte ses sections visibles selon `agencyType`
- [ ] **PT-11** : L'Agency portal a un accès lecture à la guilde (Arène)
- [ ] **PT-12** : Le Creator reçoit des notifications quand une mission matche son profil

---

## 12. CHANTIER 10 — Fiabilité d'exécution

### 12.1 Transactions Prisma

Toute opération multi-étapes utilise `prisma.$transaction` :
- Le Pillar Gateway (Chantier 1) — déjà spécifié
- La mission completion (talent eval + commission + knowledge + signal)
- Le deal conversion (deal → strategy + pillars + configs)
- Le batch scoring

### 12.2 Pas d'état in-memory

Remplacer les `Set` et `Map` in-memory par des mécanismes compatibles serverless :
- **Re-entrancy guard** : flag en DB (`scoring_in_progress` boolean sur Strategy) avec TTL de 30s
- **Business context cache** : supprimé — la lookup table est assez rapide pour être recalculée
- **Quality modulator cache** : supprimé (le quality modulator est supprimé)

### 12.3 `extractJSON` robuste

Remplacer le regex fragile par un parser en 3 étapes :

```typescript
function extractJSON(text: string): Record<string, unknown> {
  // 1. Essayer le parse direct (si le LLM a retourné du JSON pur)
  try { return JSON.parse(text.trim()); } catch {}

  // 2. Essayer d'extraire d'un bloc markdown
  const md = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (md) { try { return JSON.parse(md[1]!.trim()); } catch {} }

  // 3. Essayer de trouver le premier { ... } ou [ ... ] complet (balanced braces)
  const start = text.indexOf('{');
  const startArr = text.indexOf('[');
  const idx = (start >= 0 && (startArr < 0 || start < startArr)) ? start : startArr;
  if (idx >= 0) {
    const sub = text.slice(idx);
    try { return JSON.parse(sub); } catch {}
    // Tenter de trouver la fin du JSON par braces balancées
    const balanced = findBalancedJSON(sub);
    if (balanced) { try { return JSON.parse(balanced); } catch {} }
  }

  throw new Error(`extractJSON: impossible de parser la réponse LLM (${text.length} chars)`);
}
```

### 12.4 Retry avec backoff pour les appels LLM

Chaque appel LLM dans l'orchestrateur est wrappé :

```typescript
async function callLLMWithRetry(system: string, prompt: string, opts: { maxRetries: number; strategyId?: string }): Promise<string> {
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await callLLM(system, prompt, opts.strategyId);
    } catch (err) {
      if (attempt === opts.maxRetries) throw err;
      await sleep(1000 * Math.pow(2, attempt)); // Exponential backoff
    }
  }
  throw new Error("Unreachable");
}
```

### 12.5 Critères d'acceptation

- [ ] **FI-1** : Aucun `Set` ou `Map` in-memory n'est utilisé comme guard ou cache cross-requêtes
- [ ] **FI-2** : `extractJSON` gère les 3 cas (JSON pur, markdown, embedded) sans crash
- [ ] **FI-3** : Les appels LLM ont un retry avec exponential backoff (max 2 retries)
- [ ] **FI-4** : Les opérations multi-étapes utilisent `prisma.$transaction`

---

## 13. PLAN D'EXÉCUTION

### 13.1 Dépendances entre chantiers

```
Chantier 1 (Pillar Gateway)  ←── FONDATION — tout dépend de ça
    ↓
Chantier 2 (Scorer Unifié)   ←── Le Gateway appelle le scorer
    ↓
Chantier 3 (Schema Canonique) ←── Le scorer lit le contrat qui lit le schema
    ↓
Chantier 4 (Orchestrateur)    ←── L'orchestrateur écrit via le Gateway
    ↓
Chantier 10 (Fiabilité)       ←── Transactions + retry dans le Gateway et l'orchestrateur
    ↓
Chantiers 5-9 (en parallèle)  ←── Features métier qui utilisent l'infra

Indépendants (peuvent commencer en parallèle) :
- Chantier 5 (Réseau Opérateurs) — modèle DB uniquement
- Chantier 7 (Intelligence) — marquage de données
- Chantier 8 (Finances) — service standalone
```

### 13.2 Phases

#### Phase 1 — Fondations (semaines 1-4)

| Chantier | Livrables | Effort | Dépend de |
|---|---|---|---|
| **-1. Ontologie des Variables** | Schemas Zod complets pour 8 piliers, migration Strategy→Pillar, GLORY bindings corrigés, test de couverture | XL | Rien (premier) |
| **0. Ontologie RTIS** | 4 protocoles dédiés, ordre ADVERTIS (R→T→I→S), sémantique corrigée | L | Chantier -1 (schemas) |
| **1. Pillar Gateway** | Service Gateway, migration des 6 écrivains, tests | XL | Chantier -1 (schemas) |
| **2. Scorer Unifié** | Suppression semantic.ts + quality-modulator, scorer pur, tests | M | Chantier -1 (contrats) |
| **10. Fiabilité** | extractJSON robuste, retry LLM, suppression in-memory state | S | Rien |

**Ordre d'exécution Phase 1 :**
```
Semaine 1 : Chantier -1 (ontologie) + Chantier 10 (fiabilité) en parallèle
Semaine 2 : Chantier 0 (RTIS) + Chantier 2 (scorer) en parallèle
Semaine 3-4 : Chantier 1 (Gateway) — le plus gros, dépend de -1 et 0
```

**Critère de sortie Phase 1 :** Chaque champ que le système consomme existe dans un schema Zod (y compris les variables de transition inter-piliers). Le scoring est déterministe. Toute écriture pilier passe par le Gateway. L'ordre de cascade est ADVERTIS (R→T→I→S). Les 4 protocoles RTIS dédiés sont en place.

#### Phase 2 — Orchestration (semaines 4-5)

| Chantier | Livrables | Effort |
|---|---|---|
| **4. Orchestrateur Unifié** | Modèle OrchestrationPlan, refacto RTIS cascade, intégration GLORY + ARTEMIS, UI Console | XL |

**Critère de sortie Phase 2 :** Une stratégie peut être enrichie de bout en bout via un plan d'orchestration visible dans la Console. L'opérateur contrôle l'exécution.

#### Phase 3 — Métier (semaines 6-8, en parallèle)

| Chantier | Livrables | Effort |
|---|---|---|
| **5. Réseau Opérateurs** | Modèle enrichi, ClientAllocation, UI arbre réseau | M |
| **6. Talent Engine** | Vecteur vivant, matching amélioré, promotion auto, QC spécialisé | L |
| **7. Intelligence Réelle** | Marquage source, seeding SESHAT, scénarios LLM | M |
| **8. Couche Financière** | P&L service, budget requis, escrow connecté | M |
| **9. Portails Adaptés** | Cockpit renommage, Agency adaptatif, Creator notifications | L |

**Critère de sortie Phase 3 :** Les 4 portails sont fonctionnels avec les bonnes données pour les bonnes audiences. Le P&L par client est disponible.

### 13.3 Estimation globale

| Phase | Durée | Effort total |
|---|---|---|
| Phase 1 — Fondations | 3 semaines | ~40% du travail |
| Phase 2 — Orchestration | 2 semaines | ~25% du travail |
| Phase 3 — Métier | 3 semaines | ~35% du travail |
| **Total** | **8 semaines** | |

---

## 14. CRITÈRES D'ACCEPTATION GLOBAUX

### 14.1 Tests de non-régression

- [ ] **NR-1** : La suite de tests existante passe à 100%
- [ ] **NR-2** : Aucune procédure tRPC existante n'a changé de signature (backward compat)
- [ ] **NR-3** : Les 49 pages Console chargent sans erreur
- [ ] **NR-4** : Un intake complet (start → advance → complete → convert) fonctionne

### 14.2 Tests de la v4

- [ ] **V4-1** : Le même contenu de pilier produit le même score sur 1000 exécutions (déterminisme)
- [ ] **V4-2** : Une cascade RTIS complète écrit via le Gateway (PillarVersion créé pour chaque pilier)
- [ ] **V4-3** : La staleness se propage correctement en cascade ADVERTIS (modifier A → D/V/E/R/T/I/S stale, modifier D → V/E/R/T/I/S stale, etc.)
- [ ] **V4-4** : Le plan d'orchestration survit à un crash process et reprend
- [ ] **V4-5** : Le vecteur ADVE d'un talent se met à jour après une mission COMPLETED
- [ ] **V4-6** : Le P&L par client est cohérent (revenue - costs = margin)
- [ ] **V4-7** : Le Cockpit ne contient aucune mention de "pilier", "score /25", ou "ADVE"
- [ ] **V4-8** : Les données IA sont visuellement distinctes des données sourcées dans le frontend
- [ ] **V4-9** : Un pilier LOCKED refuse les writes IA
- [ ] **V4-10** : L'orchestrateur attend la validation humaine entre les recos et I/S
- [ ] **V4-11** : Les variables de transition (§-1.6) sont toutes présentes dans les schemas Zod et les contrats de maturité
- [ ] **V4-12** : S.selectedFromI[] référence des actions qui existent réellement dans I.catalogueParCanal
- [ ] **V4-13** : T.riskValidation[] référence des risques qui existent dans R.probabilityImpactMatrix
- [ ] **V4-14** : E.ladderProductAlignment[] référence des tiers qui existent dans V.productLadder
- [ ] **V4-15** : Chaque protocole RTIS reçoit en input les exports du pilier précédent (pas seulement le contenu brut)
- [ ] **V4-16** : Le diagnostic R.pillarGaps produit un score/lacunes pour chaque pilier ADVE
- [ ] **V4-17** : I.actionsByDevotionLevel couvre les 6 niveaux de la Devotion Ladder
- [ ] **V4-18** : S.devotionFunnel a des objectifs quantifiés pour chaque phase de la roadmap

### 14.3 Métriques de succès post-déploiement

| Métrique | Cible | Mesure |
|---|---|---|
| Variance du score | 0 | Même contenu, même score, toujours |
| Taux de crash cascade | < 1% | OrchestrationStep.status = FAILED / total |
| Temps moyen cascade RTIS | < 120s | OrchestrationPlan.completedAt - createdAt |
| Couverture writeback GLORY | 100% | Séquences avec au moins 1 write dans un pilier |
| Adoption matching ADVE | > 50% | Talents avec vecteur non-null / total talents |

---

## ANNEXE — FICHIERS IMPACTÉS (estimation)

### Fichiers à créer
- `src/server/services/pillar-gateway/index.ts` — Le Gateway (Chantier 1)
- `src/server/services/rtis-protocols/risk.ts` — Protocole R dédié (Chantier 0)
- `src/server/services/rtis-protocols/track.ts` — Protocole T dédié (Chantier 0)
- `src/server/services/rtis-protocols/innovation.ts` — Protocole I dédié (Chantier 0)
- `src/server/services/rtis-protocols/strategy.ts` — Protocole S dédié (Chantier 0)
- `src/server/services/mestor/commandant.ts` — Le Commandant (LLM decisions) (Chantier 4)
- `src/server/services/mestor/hyperviseur.ts` — L'Hyperviseur (plan d'orchestration) (Chantier 4)
- `src/server/services/mestor/pillar-directors.ts` — Les 8 Directeurs de Pilier (Chantier 4)
- `src/server/services/mestor/artemis.ts` — ARTEMIS refactoré (sous MESTOR) (Chantier 4)
- `src/server/services/mestor/artemis-superviseur.ts` — Superviseur de Séquence (Chantier 4)
- `src/server/services/mestor/artemis-orchestrateur.ts` — Orchestrateur d'Outils (Chantier 4)
- `src/server/services/financial-reconciliation/index.ts` — Le P&L (Chantier 8)
- `prisma/migrations/xxx_v4_restructuration.sql` — Migration DB

### Fichiers à supprimer
- `src/server/services/advertis-scorer/quality-modulator.ts` — Remplacé par scoring pur (Chantier 2)
- `src/server/services/advertis-scorer/semantic.ts` — Remplacé par scoring contract-aware (Chantier 2)

### Fichiers à refactorer profondément
- `src/lib/types/pillar-schemas.ts` — **LE FICHIER LE PLUS IMPACTÉ** : 8 schemas enrichis avec variables fondamentales (§-1.2), variables de transition (§-1.6), variables Overton/Devotion (§0.4). `nomMarque`/`secteur`/`pays` dans A, `businessModel` dans V, `superfanPortrait` dans E, `overtonBlockers` dans R, `overtonPosition` dans T, `actionsByDevotionLevel` dans I, `selectedFromI`/`devotionFunnel` dans S. (Chantier -1)
- `src/lib/types/pillar-maturity-contracts.ts` — INTAKE inclut fondamentaux, ENRICHED inclut transitions (Chantier -1)
- `src/lib/types/advertis-vector.ts` — `i: "Innovation"`, `s: "Strategy"` (Chantier 0)
- `src/server/services/mestor/rtis-cascade.ts` — Remplacé par les 4 protocoles + orchestrateur (Chantier 0+4)
- `src/server/services/glory-tools/registry.ts` — Bindings corrigés : `brand_name→a.nomMarque`, `sector→a.secteur`, `language→d.assetsLinguistiques.languePrincipale` (Chantier -1)
- `src/server/services/glory-tools/hypervisor.ts` — Advisor intégré à l'orchestrateur, ordre ADVERTIS (Chantier 4)
- `src/server/services/glory-tools/index.ts` — Writeback via Gateway (Chantier 1)
- `src/server/services/artemis/index.ts` — Supervisé par l'orchestrateur (Chantier 4)
- `src/server/services/pillar-maturity/auto-filler.ts` — Écrit via Gateway (Chantier 1)
- `src/server/services/advertis-scorer/index.ts` — Scorer pur, plus de quality modulator (Chantier 2)
- `src/server/services/advertis-scorer/structural.ts` — Seul scorer, lit les contrats enrichis (Chantier 2)
- `src/server/trpc/routers/pillar.ts` — Utilise le Gateway (Chantier 1)
- `src/server/trpc/routers/strategy.ts` — Copie Strategy→Pillar au create (Chantier -1), seeding SESHAT (Chantier 7)
- `prisma/schema.prisma` — Operator enrichi, ClientAllocation, OrchestrationPlan (Chantiers 4+5)

### Fichiers à modifier (léger)
- `src/server/services/glory-tools/sequence-executor.ts` — GLOBAL_BINDINGS corrigés (`sector→a.secteur`, `market→a.pays`) (Chantier -1)
- `src/server/services/pillar-maturity/contracts-loader.ts` — Aligné sur schemas enrichis (Chantier -1)
- `src/server/trpc/routers/glory.ts` — Writeback via Gateway (Chantier 1)
- `src/server/trpc/routers/mission.ts` — Budget requis, talent vector recalc (Chantier 6+8)
- `src/server/services/matching-engine/index.ts` — Matching ADVE amélioré (Chantier 6)
- `src/server/services/tier-evaluator/index.ts` — Promotion auto (Chantier 6)
- `src/server/services/mestor/scenarios.ts` — Vrais appels LLM (Chantier 7)
- `src/server/services/mestor/index.ts` — `buildBusinessContextBlock` lit depuis les piliers A/V, plus depuis Strategy (Chantier -1)
- `src/components/navigation/portal-configs.ts` — Cockpit renommage (Chantier 9)
- Pages Cockpit — Renommage labels, masquage scores internes (Chantier 9)

---

*"De la Poussière à l'Étoile" — mais d'abord, on consolide les fondations.*

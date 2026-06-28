# Cycle de vie multi-acteurs — « Wrap Croustillant » vu par les 4 métiers

> Analyse NEFER — 2026-06-28. Suite de `lifecycle-gap-analysis-wrap-croustillant.md` (vue
> marque/OS). Ici on déroule le **même lancement** (BK wrap croustillant) depuis le siège des
> **4 acteurs** que La Fusée orchestre : (1) **production / freelance**, (2) **bureau d'étude**,
> (3) **agence ATL/BTL/TTL** (média), (4) **agence conseil**. Chaque cycle est **audité sur la
> réalité du marché** (Apple, Burger King, Riot/League of Legends — sources citées), pas sur
> nos inférences, puis confronté à notre système pour **déduire et fermer les trous**.
>
> **Doctrine d'implémentation (non négociable, rappel opérateur)** : *rien codé en dur*. Les
> taxonomies, barèmes, chiffres, faits, normes, wikis… **vivent en base de données** (tables de
> référence seedées), jamais en constantes dans le code. *Pas de mock, jamais* — production-level.
> Le LLM ne sert qu'au **net-new** (croisement intention × ADVE) ; tout le reste est projection
> déterministe de données réelles.

Légende : ✅ EXISTS · 🟡 PARTIAL · ❌ MISSING.

---

## Constat transverse : pourquoi « base de données, pas constantes »

L'audit des 4 métiers fait remonter le **même invariant** : chaque industrie tourne sur des
**taxonomies + barèmes de référence** qui sont de la **donnée**, pas du code —
- **Production** : sections AICP **A→X** (le plan de coût standardisé), specs de livrables
  (ratios/durées/codecs/LUFS), grilles de tarifs freelance, fenêtres d'usage talent.
- **Bureau d'étude** : modes **CAWI/CATI/CAPI/PAPI**, normes **taille d'échantillon → marge
  d'erreur** (n≈400→±5 %, n≈1000→±3 % à 95 %), normes **Top-2-Box** par catégorie, standards
  de dictionnaire **Triple-S / DDI / SPSS**.
- **Média** : barèmes **CPM/CPP** par canal/marché, courbes **reach/frequency**, **GRP/TRP**.
- **Conseil** : catalogue de **frameworks** (7S, 3-Horizons, BCG, Five Forces…), barèmes de
  priorisation (**RICE**, impact/effort).

→ Ces valeurs **doivent être des lignes de table seedées** (mutables par l'opérateur, versionnées,
datées), jamais des littéraux. C'est exactement la doctrine déjà appliquée à Thot
(`ZoneIndex`/`MarketCostSnapshot`, ADR-0087/0093/0099) et au scoring canon (ADR-0102). On
généralise.

Trois **patterns architecturaux** reviennent dans les 4 métiers et existent déjà chez nous :
1. **Estimate → Actual → Variance** (production AICP ; budget campagne ; coûts Thot) — toute
   ligne porte prévu+réalisé+écart.
2. **Time-spine + provenance** (waves de tracker ; snapshots marché ; `staleAt`) — toute mesure
   est datée et tracée à sa source.
3. **Expiry/staleness gate** (fenêtre d'usage talent ; brief stale ; pilier stale) — une donnée
   périmée est un **gate dur**, pas un avertissement mou.

---

## Acteur 1 — Production / Freelance (agence de production)

### Le cycle réel (audité)
La chaîne réelle : **Marque (BK/RBI) → agence créative AOR → société de production → crew
freelance + post**. La production reçoit un **board** (script + storyboard/animatic) et répond
par un **director's treatment + un devis AICP**. *Triple bid* standard US (3 sociétés mises en
concurrence sur la même grille AICP). Étapes : brief → bidding → **pré-prod** (PPM deck = gate de
sign-off, casting, repérages, food styling QSR) → **tournage** (call sheets, shot lists) →
**post** (montage offline V1/V2, VFX, étalonnage, son/mix -24 LUFS broadcast/-14 LUFS web,
versioning) → **delivery** (matrice de livrables : 1 hero + ~12 cutdowns 16:9/1:1/9:16/4:5 ×
30/20/15/10/6 s) → **closeout** (AICP actualisé estimate/actual/variance, factures, **usage rights**).
Benchmarks : 6-12 sem. total, 1-5 j de tournage (souvent 1 pour un hero QSR), **2 rounds de
révision inclus**, réalisateur $2,5-4k/j, DoP ~$800-2,5k/j.
*Réf. : Riot animatic-first (Fortiche/Arcane) ; Apple launch-film in-house ; AICP bidding /
Wrapbook / StudioBinder call sheet / Saturation.io budget — cf. annexe sources.*

### Notre système
| Capacité | Statut | Preuve |
|---|---|---|
| Crew / talent / matching / QC / formation | ✅ | Imhotep (`services/imhotep/`) |
| Pipeline de production 6 états DEVIS→BAT→EN_PRODUCTION→LIVRAISON→INSTALLE→TERMINE | ✅ | `CampaignExecution` + `transitionExecution` |
| Livrable → vault | ✅ | `publishAssetToBrandVault` |
| Coût atomisé par marché/prestataire | ✅ | Thot `computeActionCost` (ADR-0093) |
| **Matrice de specs de livrables** (canal × ratio × durée × codec × LUFS) | ❌ | aucune entité ; un livrable n'explose pas en N versions |
| **Devis AICP structuré** (sections A→X, triple estimate/actual/variance) | 🟡 | budget campagne par catégorie existe, mais pas la taxonomie AICP ni le triple-colonne par ligne |
| **Call sheet / shot list** | ❌ | aucune entité de plateau |
| **Usage rights talent** (média/territoire/terme + **expiry gate**) | ❌ | aucun suivi des droits → risque de diffuser un talent expiré |
| **Classification fiscale** crew (W2/1099/loan-out) | 🟡 | `TalentProfile` existe (Guilde), pas le champ fiscal |

### Trous → fermeture **DB-backed (zéro hardcode)**
- **P1 · `DeliverableSpec` matrix** : table `{ channel, aspectRatio, duration, codec, resolution, frameRate, loudnessTarget, captionReq }` + un **catalogue de canaux/specs seedé** (TV/CTV/Meta/TikTok/OOH…). Un `CampaignExecution` fan-out en N `DeliverableSpec`. Les specs sont **des lignes seedées**, jamais une liste en code.
- **P1 · `UsageGrant`** (talent × livrable) `{ media[], territory, termStart, termMonths, buyoutFee, exclusivity, expiresAt }` + **gate d'expiration** (isomorphe à `staleAt` : un grant périmé bloque la diffusion). Réutilise le pattern staleness existant.
- **P2 · Devis AICP** : étendre le budget campagne avec la **taxonomie de sections seedée** (A→X comme `ReferenceTaxonomy` rows) + le triple `planned/actual/variance` par ligne (déjà le pattern budget ; ajouter `actual`+`variance`).
- **P2 · Call sheet / shot list** : entités de plateau rattachées à `Mission`/`CampaignExecution` (post-MVP — surface terrain).

---

## Acteur 2 — Bureau d'étude (insights / études de marché)

### Le cycle réel (audité)
9 étapes : **brief/RFP → proposal** → **study design** (qual/quant, mono/sequential-monadic) →
**sampling** (panel, quotas, n→MoE : n≈400→±5 %, n≈1000→±3 % à 95 %, p=0,5 worst case) →
**instrument** (questionnaire, screener, discussion guide) → **fieldwork** (CAWI/CATI/CAPI/PAPI ;
focus groups 6-10) → **processing** (cleaning, verbatim coding/codebook, **rim weighting/raking**)
→ **analysis** (banner tables stub/base/nets/**Top-2-Box**, sig testing chi²/Fisher p<0,05,
segmentation k-means/LCA, **conjoint/MaxDiff/TURF**, pricing **Van Westendorp** OPP/IPP +
**Gabor-Granger** revenue-max) → **reporting** (topline 1-4 p./1-3 j vs full report 50-200 p.) →
**tracking waves** (continuous vs wave-based, wave-on-wave sig). **Deux colonnes vertébrales** :
`Wave` (temps) et `DataSource`+`weight` (provenance). Standards de dictionnaire : **Triple-S**
(single/multiple/quantity/character/logical), **DDI-Lifecycle** (stdyDscr/timePrd/collDate/var/
qstn/catgry), **SPSS/.sav** (variable_value_labels, variable_measure nominal/ordinal/scale).
*Réf. : ESOMAR, Nielsen BASES (STM trial×repeat), Kantar BrandZ, Sawtooth (conjoint/MaxDiff),
GeoPoll CAWI/CATI/CAPI, MeasuringU rake weighting — cf. annexe.*

### Notre système
| Capacité | Statut | Preuve |
|---|---|---|
| Études relationnelles (study/source/synthesis/competitor/benchmark/cost) | ✅ | `MarketStudy`, `MarketSource`, `MarketSynthesis`, `CompetitorSnapshot`, `MarketBenchmark`, `MarketCostSnapshot` |
| Feeds externes RSS parsés déterministes | ✅ | `seshat/external-feeds/rss.ts` |
| Historique prix par période | ✅ | `MarketCostSnapshot` (ADR-0099) |
| **Wave (time-spine de tracker)** | ❌ | pas d'entité wave → pas de wave-on-wave, pas de tracker de marque |
| **Méthodologie typée** (concept test, Van Westendorp, conjoint, U&A…) | ❌ | `MarketStudy` n'a pas de `study_type`/`methodology` ni les sorties typées (OPP, T2B, part-worths) |
| **Normes de référence** (n→MoE, T2B par catégorie) en **DB** | ❌ | absentes ; risque d'être codées en dur |
| **Provenance/fiabilité par source** | 🟡 | `MarketSource.reliability` existe ; pas de classe (FIRST_PARTY/SYNDICATED/AI_INFERRED) ni de fusion pondérée |
| **CompetitorSnapshot ↔ MarketStudy** | ❌ | orphelin (pas de FK) |
| Console « bureau d'étude » consultable | 🟡 | pas de surface liste-concurrents / tendance-prix / provenance |

### Trous → fermeture **DB-backed (zéro hardcode)**
- **P1 · `ResearchWave`** (study × wave) `{ waveLabel, periodLabel, fieldStart, fieldEnd, cadence, targetN, achievedN, isRolling }` → débloque trackers + wave-on-wave sig (déterministe). C'est le **time-spine**.
- **P1 · `MethodologyReference` (table seedée)** : le catalogue réel des méthodes `{ key, family (CONCEPT_TEST/PRICING/CONJOINT/TRACKER/U_A/SEGMENTATION/SENSORY), typicalN, outputSchema }` + les **normes** `{ confidence, n, marginOfError }` (n≈384→±5 %, etc.) et **T2B norms** par catégorie — **tout en lignes de table**, mutables, jamais en code.
- **P1 · `study_type`/`methodology`** sur `MarketStudy` (FK vers `MethodologyReference`) + sorties typées (`StudyResult` : OPP/IPP, T2B, part-worths, demand curve) déterministes.
- **P2 · `DataSource.provenanceClass`** + fusion pondérée par fiabilité (error estimate honnête).
- **P2 · FK `CompetitorSnapshot.studyId`** + console `/console/seshat/marketplace` (liste concurrents, tendance prix par wave, provenance).

---

## Acteur 3 — Agence ATL / BTL / TTL (média + activation)

### Le cycle réel (audité)
**ATL** = TV/radio/OOH/presse/ciné · **BTL** = sampling/PLV/street/événementiel/CRM ·
**TTL** = digital/social/influence/search (la frontière floue). Étapes : brief → **comms
planning** → **media planning** (audience, **reach/frequency**, **GRP/TRP**, mix canal,
flighting/bursts) → **media buying** (négo, **insertion orders**, programmatique) → trafficking →
in-market → **optimisation** → **PCA** (post-campaign analysis : prévu vs réalisé). KPIs réels :
GRP/TRP, reach, frequency, **CPM, CPP, CPC, CTR, VTR, CPA, ROAS**, share-of-voice, footfall/conversion
sampling BTL. **La réalité du marché prouve la mécanique** : BK *Whopper Detour* (FCB) =
geofencing 7 000 BK + 14 000 McDo → **1,5 M downloads, ventes app ×3, 3,5 Md d'impressions
earned, ROI 37:1** ; *Moldy Whopper* (DAVID) OOH/PR → **8,4 Md impressions, $40 M EMV, +14 %
ventes, +88 % sentiment** ; *Unnoticeable Whopper* (Buzzman) TikTok → **22 M vues, 104 k
followers, 78 % des utilisateurs TikTok FR** ; Apple *Shot on iPhone* (TBWA) = **10 000+
panneaux, 73 villes, 26 pays, 6,5 Md impressions** ; Riot *Worlds/K/DA* = événement-spectacle
(AR dragon, K/DA 99,6 M de spectateurs). *Réf. : Contagious, Adage, WPP, Marketing Dive, Adweek,
Wikipedia — cf. annexe.*

### Notre système
| Capacité | Statut | Preuve |
|---|---|---|
| Actions ATL/BTL/TTL (130+ types) + catégorie | ✅ | `campaign-manager` `ACTION_TYPES`, `CampaignAction.category` |
| Achat média multi-plateforme + métriques | ✅ | `CampaignAmplification` (impressions/clicks/conv/reach/CPA/ROAS) |
| Ops terrain BTL (équipes/ambassadeurs/sampling) | ✅ | `CampaignFieldOp` + `CampaignFieldReport` |
| AARRR unifié terrain + digital | ✅ | `campaignAARRMetric` |
| Diffusion / ad-networks / CRM | ✅ façades | Anubis (credential-gated) |
| **Media plan structuré** (reach/freq, GRP/TRP, flighting) | ❌ | pas d'entité media-plan ; pas de courbes reach/freq |
| **Barèmes CPM/CPP par canal/marché** en **DB** | ❌ | absents ; risque hardcode |
| **PCA** (post-campaign : prévu vs réalisé par canal) | 🟡 | `generateFullReport` agrège le réalisé ; pas le **planned vs actual** par ligne média |
| Ingestion **réelle** de perf (ad platforms/POS/social) | 🟡 | manuelle/`_mocked` (credential-gated) |

### Trous → fermeture **DB-backed (zéro hardcode)**
- **P1 · `MediaPlan` + `MediaPlanLine`** `{ channel, audience, plannedGRP, plannedReach, plannedFrequency, plannedImpressions, plannedSpend, cpm, flightStart, flightEnd }` avec le triple **planned vs actual** (réutilise le pattern AICP/budget) → débloque le **PCA** déterministe (écart prévu/réalisé par canal).
- **P1 · `MediaBenchmark` (table seedée)** : **CPM/CPP/CTR/VTR par canal × marché** en lignes mutables (comme `MarketCostSnapshot`), + courbes **reach/frequency** paramétriques. Calculs GRP=reach×freq, CPM=cost/impr×1000 **déterministes**, jamais de chiffre en dur.
- **P2 · Connecteurs d'ingestion perf** (Meta/Google/TikTok/POS) normalisant vers `CampaignAmplification`/AARRR via Credentials Vault (credential-gated, mais le **pipeline** existe).

---

## Acteur 4 — Agence conseil (stratégie de marque)

### Le cycle réel (audité)
Étapes : **scoping/SOW → diagnostic** (data, entretiens, scan marché) → **analyse** (frameworks)
→ **synthèse** (findings, hypothèses) → **recommandations** → **roadmap** → support implé →
review. **Frameworks réels** : McKinsey **7S**, **3-Horizons**, BCG growth-share, Porter **Five
Forces**, SWOT, **JTBD**, brand architecture, positioning/brand-key, value-prop canvas, équité de
marque (**Keller CBBE**, Aaker), stratégie culturelle/Overton. **Priorisation déterministe** :
**RICE** (Reach×Impact×Confidence/Effort), impact/effort, MoSCoW, value-vs-feasibility. Le réel :
BK turnaround (provoc/irrévérence, Moldy Whopper = preuve « no preservatives »), Apple
(secret + keynote-spectacle + positionnement premium), Riot/LoL (franchise/cultural strategy,
Arcane = Emmy, légitimité culturelle). *Réf. : McKinsey/BCG insights, Interbrand/Landor, Keller
CBBE — cf. annexe.*

### Notre système
| Capacité | Statut | Preuve |
|---|---|---|
| Oracle 35 sections (CORE + BIG4 + DISTINCTIVE) auto-update | ✅ | `SECTION_REGISTRY`, `OracleSection` |
| Frameworks BIG4 (7S, BCG, 3-Horizons, NPS…) | ✅ | 28 frameworks Artemis + 7 sections BIG4_BASELINE |
| Recommandations + curation Jehuty | ✅ | `Recommendation`, `JehutyCuration` |
| Score multi-dimensions déterministe | ✅ | scoring canon (ADR-0102/0086) |
| **Engagement / workstream / SOW** comme entité | ❌ | pas de container d'engagement conseil |
| **Priorisation chiffrée des recos** (RICE/impact-effort) | 🟡 | recos existent ; pas de scoring RICE déterministe ni de tri impact/effort |
| **Hypothèse ↔ évidence ↔ reco** (chaîne de preuve) | 🟡 | recos peu reliées à des sources/évidences traçables |
| **Catalogue de frameworks** comme **données** | 🟡 | frameworks en code ; le *catalogue* (nom/output-shape/quand-l'utiliser) gagnerait à être une table de référence |

### Trous → fermeture **DB-backed (zéro hardcode)**
- **P1 · Priorisation `RICE` déterministe** sur `Recommendation` : champs `{ reach, impact, confidence, effort, riceScore }` (riceScore = R×I×C/E, **pur**, zéro LLM) + tri impact/effort. Barèmes (échelles RICE) **seedés**, pas en dur.
- **P2 · `ConsultingEngagement` + `Hypothesis` + `Evidence`** : chaîne **hypothèse → évidence (source) → reco** traçable (le « pourquoi » d'une reco remonte à une preuve datée).
- **P2 · `FrameworkReference` (table seedée)** : catalogue des frameworks `{ key, family, outputSchema, whenToUse }` — métadonnée en **données**, le moteur reste en code.

---

## Synthèse — feuille de route de fermeture (priorisée, DB-backed)

| # | Acteur | Trou | Fermeture (entité/seed) | Prio | Pattern réutilisé |
|---|---|---|---|---|---|
| 1 | Bureau | `ResearchWave` (time-spine tracker) | nouvelle table + wave-on-wave sig déterministe | **P1** | time-spine |
| 2 | Bureau | `MethodologyReference` + normes n→MoE/T2B **seedées** | table de référence + seed | **P1** | reference-data |
| 3 | Média | `MediaPlan/Line` planned-vs-actual + PCA | nouvelles tables + triple-colonne | **P1** | estimate/actual/variance |
| 4 | Média | `MediaBenchmark` CPM/CPP/reach-freq **seedés** | table de référence + seed | **P1** | reference-data (≈ `MarketCostSnapshot`) |
| 5 | Production | `DeliverableSpec` matrix + catalogue canaux **seedé** | table + seed + fan-out execution | **P1** | reference-data + fan-out |
| 6 | Production | `UsageGrant` + **expiry gate** | table + staleness gate | **P1** | staleAt/expiry |
| 7 | Conseil | `RICE` déterministe sur `Recommendation` | champs additifs + calcul pur | **P1** | scoring déterministe |
| 8 | Production | Devis AICP (sections A→X seedées + actual/variance) | reference-taxonomy + triple-colonne | P2 | reference-data + estimate/actual |
| 9 | Bureau | provenanceClass + fusion + FK competitor↔study + console | additifs + surface | P2 | provenance-spine |
| 10 | Média | connecteurs ingestion perf (credential-gated) | pipeline normalisation | P2 | connectors (Vault) |
| 11 | Conseil | `ConsultingEngagement`/`Hypothesis`/`Evidence` + `FrameworkReference` | nouvelles tables | P2 | provenance-chain |

**Tout ce qui est barème/taxonomie/norme/chiffre est une ligne de table seedée** (AICP A→X,
specs livrables, CAWI/CATI, n→MoE, T2B, CPM/CPP, frameworks, RICE) — **jamais une constante en
code**, jamais un mock. Le LLM reste cantonné au net-new (intention × ADVE, ADR-0106).

> **Note de méthode** : un point d'entrée commun à ces 4 acteurs est déjà posé — la **porte
> d'entrée Intention** (ADR-0106) : une envie net-new (lancer le wrap) est croisée avec l'ADVE →
> brief validé → le brief alimente *les 4 métiers* (production le matérialise, le bureau le
> teste, le média le diffuse, le conseil l'inscrit dans la stratégie). Les fermetures ci-dessus
> branchent chaque métier en aval de ce brief.

---

## Annexe — sources (audit internet)

**Production** : AICP Bidding Resources · Wrapbook (AICP form, paperwork) · Saturation.io
(budget, crew deal memo, colorist) · StudioBinder (call sheet) · Boords (shot list) ·
Haunted Basement / Sprout Social (deliverable specs) · PlayPause/MASV (revision rounds) ·
PayReel (W2 vs 1099) · RealVOTalent (usage/buyouts) · ECG (life cycle) · Marketing-Beat/Marketing
Dive/DAVID (BK agences) · Animation Magazine (Fortiche/Riot).

**Bureau d'étude** : ESOMAR (Code, 28 Questions) · Nielsen BASES / NIQ · Kantar BrandZ · Ipsos ·
Sawtooth (CBC, MaxDiff, Gabor-Granger) · Conjointly (Van Westendorp, Gabor-Granger) · GeoPoll/PGBS
(CAWI/CATI/CAPI) · MeasuringU/Displayr/NewtonX (rim weighting) · GreenBook/Qualtrics (crosstab) ·
Triple-S spec · DDI (Colectica/IHSN/Wikipedia) · pyreadstat (.sav) · Decision Analyst
(segmentation, ad tracking) · QSR Magazine (TURF menu).

**Média** : Contagious/Adage/Adweek (Whopper Detour : 1,5 M downloads, 3,5 Md impressions, ROI
37:1) · WPP (Moldy Whopper : 8,4 Md impressions, $40 M EMV, +14 % ventes, +88 % sentiment) ·
Marketing Dive (Google Home of the Whopper : $135 M EMV) · Contagious (Unnoticeable Whopper :
22 M vues, 104 k followers) · TheBrandHopper/Adweek (Shot on iPhone : 10 000+ panneaux, 6,5 Md
impressions, Cannes Grand Prix) · Riot Nexus / Variety / Wikipedia (Worlds 21,8 M AMA, K/DA
99,6 M).

**Conseil** : McKinsey/BCG insights (7S, 3-Horizons, growth-share) · Porter Five Forces · Keller
CBBE / Aaker (brand equity) · Interbrand/Landor/Wolff Olins (brand architecture) · RICE/MoSCoW
(priorisation) · Apple (Marketing of Apple, Wikipedia ; secret + keynote) · Riot (Arcane Emmy,
franchise strategy).

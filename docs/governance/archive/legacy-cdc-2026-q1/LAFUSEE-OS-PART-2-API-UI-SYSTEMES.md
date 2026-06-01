# CAHIER DE CHARGES — LaFusée Industry OS
# PARTIE 2/3 — API, SERVICES, UI/UX & SYSTÈMES (Sections 3-7)

---

## 3. API SURFACE

### 3.1 Nouveaux routers tRPC

| Router | Procedures | Division | Système |
|--------|------------|----------|---------|
| `operator` | getOwn, list, update, getStats | Transversal | Multi-opérateur |
| `driver` | create, update, delete, list, getByStrategy, activate, deactivate, generateSpecs, auditCoherence, translateBrief | La Fusée | S2 |
| `qualityReview` | submit, list, getByDeliverable, getByReviewer, assignReviewer, escalate | L'Arène | S6 |
| `guildTier` | getProfile, checkPromotion, promote, demote, listByTier, getProgressPath | L'Arène | S6 |
| `guildOrg` | create, update, list, getMembers, getMetrics, addMember, removeMember | L'Arène | S6 |
| `process` | create, update, delete, list, start, pause, stop, getSchedule, getContention | La Fusée | S7 |
| `commission` | calculate, list, getByMission, getByCreator, markPaid, generatePaymentOrder, getOperatorFees | La Fusée (SOCLE) | S8 |
| `membership` | create, renew, cancel, list, getByCreator, checkStatus | La Fusée (SOCLE) | S8 |
| `valueReport` | generate, list, getByStrategy, export | L'Oracle | S8 |
| `knowledgeGraph` | query, getBenchmarks, getFrameworkRanking, getCreatorPatterns, getBriefPatterns, ingest | Le Signal | S9 |
| `devotionLadder` | snapshot, list, getByStrategy, setObjective, compare | L'Oracle | S0 |
| `deliverableTracking` | create, addSignal, getByDeliverable, getImpact, expire | La Fusée | S2 |
| `quickIntake` | start, advance, complete, getByToken, convert, listAll | L'Oracle | S1 |
| `bootSequence` | start, advance, complete, getState | L'Oracle | S1 |
| `guidelines` | generate, get, export, shareLink | La Fusée | S2 |
| `matching` | suggest, override, getHistory, getBestForBrief | L'Arène | S5 |
| `upsell` | detect, list, dismiss | La Fusée (SOCLE) | S8 |
| `advertisScorer` | scoreObject, batchScore, getHistory, recalculate | Transversal | S0 |

**Total : 18 nouveaux routers, ~100 procedures.** Routers existants : 43. **Cible : 61 routers.**

### 3.2 Routers existants à modifier

| Router | Division | Modification |
|--------|----------|-------------|
| `strategy` | L'Oracle | Ajouter phase QUICK_INTAKE, intégrer advertis_vector, operatorId, lier aux Drivers |
| `campaign` | La Fusée (BOOST) | Ajouter advertis_vector cible, devotionObjective |
| `mission` | La Fusée (BOOST) | Ajouter mode (DISPATCH/COLLABORATIF), driverId, advertis_vector hérité |
| `guilde` | L'Arène | Restructurer autour des tiers, intégrer advertis_vector, GuildOrganization |
| `framework` | L'Oracle (ARTEMIS) | Taguer chaque framework par pilier(s), diagnostic différentiel |
| `glory` | La Fusée | Lier tools aux Drivers, hériter du contexte ADVE |
| `brandVault` | La Fusée | Tagging par pilier, niveaux d'assets, garbage collection |
| `analytics` | Le Signal | Enrichir avec dimension ADVE, alimenter Knowledge Graph |
| `cockpit` | Client Portal | Restructurer comme Brand OS orienté cult marketing |
| `signal` | Le Signal | Ajouter advertis_vector, connecter au feedback loop |
| `club` | L'Arène | Intégrer Upgraded Brands Club dans le flywheel |
| `event` | L'Arène | Intégrer Upgrade Summit et events dans le flywheel |
| `boutique` | L'Académie | Playbooks et templates comme canal de distribution ADVE |
| `sourceInsights` | Le Signal (RADAR) | Enrichir comme produit vendable séparément |
| `mestor` | Transversal | Contextualiser selon le portal d'invocation |
| `onboarding` | L'Oracle | Câbler au Boot Sequence et Quick Intake |
| `pr` | La Fusée (BOOST) | Ajouter advertis_vector sur PressRelease, lier aux Drivers PR, câbler clippings → feedback loop |
| `social` | La Fusée (BOOST) | Connecter SocialConnection aux Drivers sociaux, câbler SocialPost.metrics → Signal → feedback loop |
| `media-buying` | La Fusée (BOOST) | Câbler MediaPerformanceSync → CampaignAmplification (données réelles), alimenter Knowledge Graph |
| `messaging` | Transversal | Contextualiser conversations par Strategy/Mission, intégrer dans les 3 portals |
| `crm` | La Fusée (SOCLE) | Câbler Quick Intake → Deal, pipeline de conversion, revenue forecasting |
| `translation` | La Fusée | Intégrer aux Drivers multi-marchés, connecter au FW-15 Cultural Expansion |
| `attribution` | Le Signal | Alimenter Knowledge Graph avec patterns d'attribution par secteur/marché |
| `cohort` | Le Signal | Connecter aux DevotionSnapshot, alimenter Knowledge Graph |
| `market-study` | Le Signal | Résultats → Knowledge Graph, permettre déclenchement depuis Drivers |
| `market-pricing` | L'Arène | Alimenter matching-engine (référentiel tarifaire) + commission-engine |
| `intervention` | La Fusée (BOOST) | Permettre conversion InterventionRequest → Mission, placer dans portals |
| `ambassador` | L'Arène | Réconcilier AmbassadorProgram avec Devotion Ladder (ambassadeurs = segment 5) |
| `publication` | La Fusée (GLORY) | Clarifier cycle GloryOutput → QualityReview → Publication → BrandAsset |

### 3.3 Serveurs MCP

| Serveur | Tools | Resources | Division | Focus |
|---------|-------|-----------|----------|-------|
| **Intelligence** (existant) | 9 | 6 | L'Oracle + Le Signal | Scores, variables, frameworks, pillars, freshness |
| **Operations** (existant) | 12 | 5 | La Fusée (BOOST) | Campaigns, budgets, teams, briefs, approvals |
| **Creative** (existant) | 42 | 0 | La Fusée (GLORY) | 39 GLORY tools + audits |
| **Pulse** (existant) | 11 | 7 | Le Signal | Cult index, signals, social, community, superfans |
| **Guild** (nouveau) | ~10 | ~4 | L'Arène | Profils créatifs, tiers, matching, QC, performance |
| **SESHAT** (nouveau) | ~8 | ~3 | L'Académie + Le Signal | Références, enrichissement brief, scoring pertinence |

**MCP cible : 6 serveurs, ~92 tools.**

---

## 4. SERVICES À CONSTRUIRE

### 4.1 Services critiques (bloquants — sans eux rien ne fonctionne)

| Service | Emplacement | Division | Description |
|---------|-------------|----------|-------------|
| `advertis-scorer` | `server/services/advertis-scorer/` | Transversal | Calcule le vecteur ADVE de n'importe quel objet. AI-assisted (Mestor) pour les premiers scorings, raffiné par les données. Expose `scoreObject(type, id)` et `batchScore(type, ids)`. C'est la pièce maîtresse — si ce service est imprécis ou lent, tout le reste en souffre. |
| `driver-engine` | `server/services/driver-engine/` | La Fusée | Cycle de vie des Drivers. `generateSpecs(strategyId, channel)` produit specs via AI + Knowledge Graph. `translateBrief(driverId, missionContext)` produit brief qualifié. C'est le lien entre L'Oracle (stratégie) et La Fusée (exécution). |
| `matching-engine` | `server/services/matching-engine/` | L'Arène | Croise briefs et créatifs. Phase early : filtre binaire (compétences + dispo). Phase mature : scoring multi-facteurs (compétences, vecteur ADVE, performance historique, dispo, tarif). Retourne top 3 avec confidence. |
| `qc-router` | `server/services/qc-router/` | L'Arène | Détermine qui review quoi. Input : deliverable + soumetteur. Output : reviewer assigné + type de review. Règles : Apprenti → review par Compagnon+. Compagnon → review par Maître+. Criticité mission × tier soumetteur. |
| `feedback-loop` | `server/services/feedback-loop/` | Transversal | Câble le loop complet. Signal entrant → recalcul score pilier → si dérive > seuil → diagnostic ARTEMIS → prescription → alerte fixer. C'est le "système nerveux" de LaFusée. |
| `quick-intake-engine` | `server/services/quick-intake/` | L'Oracle | Expérience 15 min, AI-guided, sans compte. Questions adaptatives par pilier. Produit un AdvertisVector partiel + classification + diagnostic. Lien partageable. C'est l'outil de vente #1 et l'acte de positionnement ADVE sur le marché. |

### 4.2 Services importants (différenciants)

| Service | Division | Description |
|---------|----------|-------------|
| `boot-sequence` | L'Oracle | Onboarding client complet (60-90 min). Arbre de décision adaptatif. Invoque Mestor. Calibre les 8 piliers. Produit le Brand Diagnostic Report. |
| `commission-engine` | La Fusée (SOCLE) | Calcule commissions par mission selon tier + type de Driver. Génère ordres de paiement vers Serenite. Calcule le % opérateur (pour licenciés). |
| `value-report-generator` | L'Oracle | Rapport mensuel par client. Agrège : évolution piliers, Devotion Ladder, missions, QC, diagnostics, recommandations. Export PDF/HTML. Justifie le retainer. |
| `knowledge-aggregator` | Le Signal | Service batch périodique. Agrège AuditLog + ScoreSnapshot + missions + QC en KnowledgeEntry. Calcule benchmarks sectoriels, framework rankings, creator patterns. **La capture est passive dès P0, l'agrégation est P5.** |
| `guidelines-renderer` | La Fusée | Agrège profil ADVE (8 piliers + BrandProfile + variables + assets clés) en document structuré. Invoque GLORY tools par section. Export HTML/PDF. |
| `diagnostic-engine` | L'Oracle (ARTEMIS) | Extension d'ARTEMIS. Sélection auto des frameworks pertinents selon le symptôme. Exécution en batterie. Rapport structuré avec localisation du problème (profil/driver/créatif/marché). |
| `upsell-detector` | La Fusée (SOCLE) | Analyse Brand Instances : drivers manquants mais pertinents, piliers sous-exploités, conversions quick_intake → full. Alertes Fixer Console. |
| `tier-evaluator` | L'Arène | Évalue périodiquement les créatifs contre critères de promotion/rétrogradation. Produit recommandations pour le fixer. |

### 4.3 Services de support

| Service | Division | Description |
|---------|----------|-------------|
| `process-scheduler` | La Fusée | Gère daemons, triggered, batch. Cron-like pour récurrence. Alertes sur arrêt. Contention management. |
| `team-allocator` | La Fusée (BOOST) | Vue consolidée charge par personne/créatif. Détection goulots. Recommandations staffing. |
| `seshat-bridge` | L'Académie | API client vers SESHAT (externe). Requête références, enrichissement brief, feedback pertinence. |
| `asset-tagger` | La Fusée | Tagging ADVE automatique sur assets (via Mestor). Pilier(s) renforcés, driver source, score conformité. |
| `knowledge-capture` | Le Signal | Service léger qui écrit un KnowledgeEntry à chaque événement significatif (scoring, mission close, QC, etc.). Passif. Tourne dès P0. |

### 4.4 Services existants à enrichir

| Service existant | Division | Enrichissement |
|-----------------|----------|----------------|
| `feedback-processor` | Le Signal | Connecter au feedback-loop, écrire des KnowledgeEntry |
| `cult-index-engine` | L'Oracle | Connecter aux DevotionSnapshot, alimenter le scoring /200 |
| `campaign-plan-generator` | La Fusée (BOOST) | Intégrer AdvertisVector cible dans la génération |
| `campaign-budget-engine` | La Fusée (SOCLE) | Intégrer commissions et operator fees |
| `talent-engine` | L'Arène | Intégrer tier, GuildOrganization, matching-engine |
| `ecosystem-engine` | Le Signal | Alimenter Knowledge Graph |
| `financial-engine` | La Fusée (SOCLE) | Intégrer commissions, memberships, operator fees |

---

## 5. UI / UX

### 5.1 Architecture de navigation — 3 Portals, 5 Divisions

Les 4 Surfaces actuelles (`mission-control`, `brand-pulse`, `studio`, `backstage`) sont **restructurées en 3 Portals** qui exposent les 5 Divisions d'UPgraders selon le rôle de l'utilisateur.

```
PORTALS
├── /cockpit (CLIENT PORTAL — Brand OS)
│   Le client voit son Brand OS.
│   Il ne voit jamais la Guilde, les autres clients, les mécaniques internes.
│
├── /creator (CREATOR PORTAL — Guild OS)
│   Le créatif gère ses missions et sa progression.
│   Sa visibilité stratégique dépend de son tier.
│
├── /console (FIXER CONSOLE — Ecosystem OS)
│   God mode. Les 5 divisions exposées.
│   L'orchestrateur voit tout.
│
└── /intake (QUICK INTAKE — public, sans auth)
    Diagnostic ADVE en 15 min.
    Porte d'entrée du funnel.
```

### 5.2 Quick Intake (/intake) — PUBLIC, SANS AUTH

**Audience** : n'importe qui avec un lien
**Principe** : 15 minutes, AI-guided, score /200, porte d'entrée du funnel.

| Étape | Contenu |
|-------|---------|
| `/intake` | Landing : "Mesurez la force de votre marque en 15 minutes" + CTA |
| `/intake/[token]` | Questionnaire adaptatif guidé par Mestor (questions par pilier, ton conversationnel) |
| `/intake/[token]/result` | Score /200, classification (Zombie → Icône), radar 8 piliers, diagnostic synthétique, CTA vers IMPULSION |

**Le Quick Intake est partageable par lien.** Alexandre envoie un lien personnalisé à un DG. Le DG fait son intake. Alexandre reçoit une notification. Le DG voit son score. Le funnel est enclenché.

### 5.3 Client Portal (/cockpit) — Brand OS

**Audience** : CLIENT_RETAINER, CLIENT_STATIC
**Principe** : le client ne voit que SA Brand Instance. La page d'accueil vend la transformation (cult marketing). L'opérationnel est un clic plus profond.

**Structure :**

```
/cockpit                    → CULT DASHBOARD (page d'accueil)
│  Cult Index + tendance
│  Devotion Ladder (visualisation héroïque)
│  Radar 8 piliers avec scores et alertes
│  Prescriptions actives
│
├── /cockpit/operate        → OPÉRATIONNEL
│   ├── missions            Missions en cours, livrables à valider
│   ├── campaigns           Campagnes actives (performance média réelle si connecté)
│   ├── briefs              Soumettre un nouveau brief
│   └── requests            Demandes d'intervention ponctuelles
│
├── /cockpit/brand          → IDENTITÉ DE MARQUE
│   ├── guidelines          Guidelines vivantes, interrogeables via Mestor, exportables
│   ├── assets              BrandVault filtré (recherche par pilier)
│   └── identity            Profil ADVE complet (8 piliers navigables)
│
├── /cockpit/insights       → INTELLIGENCE
│   ├── reports             Value Reports mensuels
│   ├── diagnostics         Diagnostics ARTEMIS résumés
│   ├── benchmarks          Benchmarks sectoriels (si dispo)
│   └── attribution         D'où viennent mes clients (multi-touch)
│
├── /cockpit/messages       → MESSAGERIE (communication avec le fixer/équipe)
│
└── /cockpit/mestor         → AI ASSISTANT (contextuel Brand OS)
```

**View modes** (conservés) :
- **EXECUTIVE** : Cult Index + Devotion Ladder + Value Report. Pas de détails opérationnels.
- **MARKETING** : Tout le détail. Missions, campagnes, piliers, guidelines.
- **FOUNDER** : Vision stratégique. Diagnostic, prescriptions, benchmarks.
- **MINIMAL** : Livrables à valider. Point.

### 5.4 Creator Portal (/creator) — Guild OS

**Audience** : FREELANCE (individuel ou membre d'une GuildOrganization)
**Principe** : le créatif voit ses missions, ses métriques, sa progression. Le niveau de détail stratégique dépend de son tier. L'apprentissage ADVE est intégré.

**Structure :**

```
/creator                    → DASHBOARD CRÉATIF
│  Missions dispo (filtrées profil/tier)
│  Missions actives
│  QC pipeline
│  Revenus du mois
│
├── /creator/missions       → MISSIONS
│   ├── available           Missions disponibles, accepter/décliner
│   ├── active              Missions actives, briefs complets, soumission livrables
│   └── collab              Mode collaboratif (enrichir brief, contributions trackées)
│
├── /creator/qc             → QUALITY CONTROL
│   ├── submitted           Livrables soumis, feedback reçu
│   └── peer                Missions de QC peer (Maîtres/Associés)
│
├── /creator/progress       → PROGRESSION
│   ├── metrics             Performance (first pass rate, QC score, etc.)
│   ├── path                Chemin de progression (critères par tier)
│   └── strengths           Forces/faiblesses par pilier ADVE
│
├── /creator/earnings       → REVENUS
│   ├── missions            Missions complétées, commissions
│   ├── qc                  Compensation QC peer
│   ├── invoices            Factures (Serenite côté freelance)
│   └── history             Historique complet
│
├── /creator/profile        → PROFIL
│   ├── skills              Compétences, tarifs, dispo
│   ├── portfolio           Portfolio (lié aux livrables validés)
│   └── drivers             Spécialités par Driver/canal
│
├── /creator/learn          → ACADÉMIE
│   ├── adve                Fondamentaux ADVE (déblocage progressif par tier)
│   ├── drivers             Guidelines par Driver (specs, do/don't)
│   ├── cases               Cas d'étude (missions passées anonymisées)
│   └── resources           Templates, playbooks, webinars
│
├── /creator/messages       → MESSAGERIE (communication avec le fixer + collaboration)
│
└── /creator/community      → COMMUNAUTÉ
    ├── guild               Annuaire Guilde (par tier, spécialité)
    └── events              Événements à venir (Summit, meetups)
```

**Visibilité par tier :**

| Élément | Apprenti | Compagnon | Maître | Associé |
|---------|----------|-----------|--------|---------|
| Brief technique | Oui | Oui | Oui | Oui |
| Références SESHAT | Oui | Oui | Oui | Oui |
| Pilier ADVE dominant | Non | Oui | Oui | Oui |
| Profil ADVE client | Non | Non | Oui | Oui |
| Mode collaboratif | Non | Partiel | Complet | Complet |
| QC peer | Non | Non | Oui | Oui |
| ADVE avancé (learn) | Non | Partiel | Complet | Complet |
| Fixer Console (lecture) | Non | Non | Non | Oui |

### 5.5 Fixer Console (/console) — Ecosystem OS

**Audience** : ADMIN (+ Associés en lecture)
**Principe** : god mode structuré par les 5 divisions d'UPgraders.

**Structure :**

```
/console                    → ECOSYSTEM DASHBOARD
│  Clients actifs + scores
│  Missions en vol
│  Guilde santé
│  Revenus
│  Alertes centralisées
│  Quick Intakes récents
│
├── /console/oracle         → L'ORACLE
│   ├── clients             Liste Brand Instances, drill-down (profil ADVE, drivers, score history)
│   ├── diagnostics         Diagnostics ARTEMIS en cours
│   ├── intake              Quick Intakes (pipeline de conversion)
│   └── boot                Boot Sequences en cours
│
├── /console/signal         → LE SIGNAL
│   ├── intelligence        RADAR™ (rapports, baromètres)
│   ├── tarsis              Veille concurrentielle (toutes les marques)
│   ├── signals             Signaux cross-clients
│   ├── knowledge           Knowledge Graph explorer (benchmarks, patterns, search)
│   ├── market-study        Études de marché multi-sources (6 adaptateurs)
│   └── attribution         Attribution + cohortes cross-clients
│
├── /console/arene          → L'ARÈNE
│   ├── guild               Créatifs par tier, métriques, promotions en attente
│   ├── orgs                Guild Organizations (agences de prod)
│   ├── matching            Matching en cours, overrides
│   ├── club                Upgraded Brands Club (membres, engagement)
│   └── events              Events (Summit, meetups, planning)
│
├── /console/fusee          → LA FUSÉE
│   ├── missions            Toutes les missions en vol, statuts, QC, SLA
│   ├── campaigns           Campagnes cross-clients
│   ├── drivers             Drivers actifs (tous clients)
│   ├── glory               GLORY tools usage stats
│   ├── scheduler           Processus actifs, calendrier, contention
│   ├── pr                  Relations presse cross-clients (communiqués, clippings)
│   ├── social              Connexions sociales, publications, métriques
│   ├── media               Plateformes publicitaires, performance, achat média
│   └── interventions       Demandes d'intervention en attente
│
├── /console/academie       → L'ACADÉMIE
│   ├── formations          Cours, bootcamps (existant via Course model)
│   ├── certifications      Certifications ADVE en cours
│   ├── boutique            Playbooks, templates, ventes
│   └── content             Contenu éditorial (The Upgrade™)
│
├── /console/socle          → SOCLE (FINANCE)
│   ├── revenue             Revenus consolidés : fees, commissions, retainers, memberships
│   ├── commissions         Commissions en attente
│   ├── value-reports       Value Reports générés
│   ├── contracts           Contrats (Serenite)
│   ├── invoices            Factures (Serenite)
│   ├── escrow              Escrow (Serenite)
│   └── pipeline            Pipeline commercial (Quick Intake → Deal → Brand Instance)
│
├── /console/ecosystem      → ÉCOSYSTÈME (future-proof)
│   ├── operators           Opérateurs licenciés (V1 : UPgraders only)
│   ├── metrics             Métriques écosystème (volume transactionnel, croissance)
│   └── scoring             Score /200 comme standard de marché (stats de diffusion)
│
├── /console/messages       → MESSAGERIE (communication centralisée tous acteurs)
│
└── /console/config         → CONFIGURATION
    ├── thresholds          Seuils (alerte ADVE, promotion guilde, commissions)
    ├── templates           Templates (briefs, guidelines, value reports)
    ├── integrations        Connexions tierces (Social, Media, webhooks)
    └── system              Paramètres globaux, MCP keys, pricing marché
```

### 5.6 Mestor — couche ambiante

Mestor n'est pas un portal. C'est un assistant AI contextuel accessible partout. Son comportement change selon le portal d'invocation :

| Portal | Contexte Mestor | Exemple de question |
|--------|----------------|---------------------|
| Client Portal | Brand OS du client. Ne révèle jamais les mécaniques internes. | "Pourquoi mon pilier Expression a baissé ?" |
| Creator Portal | Mission en cours + guidelines du Driver. Niveau de détail ADVE selon le tier. | "Qu'est-ce que le client attend sur ce brief ?" |
| Fixer Console | Tout l'écosystème. Peut comparer des clients, analyser des patterns cross. | "Quel créatif a le meilleur track record sur des briefs packaging FMCG ?" |
| Quick Intake | Guide conversationnel. Pose les questions ADVE de manière accessible. | (Mode guided interview, pas de question libre) |

---

## 6. SYSTÈMES EXISTANTS (résumé — détails en annexes)

Le codebase actuel implémente déjà un volume considérable de fonctionnalités. Cette section résume chaque système. Les spécifications exhaustives sont dans les annexes A-D.

### 6.1 Méthodologie ADVE-RTIS (→ ANNEXE A)

8 piliers séquentiels (A → D → V → E → R → T → I → S) avec schemas Zod complets. Chaque pilier a un contenu structuré spécifique (ex: Authenticité = identité + hero's journey + ikigai + valeurs + hiérarchie communautaire + timeline + extensions ARTEMIS cult marketing). Cycle de génération AI cascade : chaque pilier consomme les précédents. Pipeline orchestrator gère les side-effects post-génération (phase advance, score recalculation, variable extraction, staleness propagation, widget computation). Phases : fiche → audit → implementation → cockpit → complete.

### 6.2 GLORY Tools (→ ANNEXE B)

39 outils créatifs en 4 layers : CR (10 outils concepteur-rédacteur), DC (8 outils direction de création), HYBRID (11 outils opérationnels), BRAND (10 outils pipeline identité visuelle séquencé). Point d'entrée unique `generateGloryOutput()`. Outils persistables (21/39) sauvegardés en BDD avec refNumber. Layer BRAND = pipeline complet de développement d'identité de marque avec dépendances explicites (analyse sémiotique → cartographie visuelle → moodboard → chromatique → typographie → logo → tokens → motion → guidelines).

### 6.3 Campaign Manager 360 (→ ANNEXE C)

19 sous-routers, 92 procédures. Machine à 12 états (BRIEF_DRAFT → ARCHIVED). 100+ types d'actions ATL/BTL/TTL. Pipeline production 6 états (DEVIS → TERMINE). Achat média avec 11 types. Gestion d'équipe 13 rôles. Budget 8 catégories avec variance, burn forecast, cost-per-KPI. Approvals 9 types avec round counter. Assets 12 types avec versioning. Briefs 7 types avec 4 générateurs AI. Reports 7 types. Dependencies 4 types (BLOCKS/REQUIRES/FOLLOWS/PARALLEL). Field Operations terrain avec team + ambassadors JSON. AARRR Reporting unifié terrain + digital avec métriques de conversion calculées. Operation Recommender zéro-LLM.

### 6.4 ARTEMIS (→ ANNEXE D § D.1)

24 frameworks analytiques en 9 couches (Philosophie → Identité → Valeur → Expérience → Validation → Exécution → Mesure → Croissance → Survie). Modèle d'exécution : théorique, calcul (synchrone), IA (asynchrone), hybride. Orchestration avec tri topologique des dépendances. Quality gates. Score ARTEMIS global (% d'implémentations fraîches).

### 6.5 Mestor AI (→ ANNEXE D § D.2)

Assistant IA contextuel : conversations (threads avec 40 messages d'historique), insights proactifs (rule-based + AI, expiration 7j, déduplication 24h), scénarios (WHAT_IF/BUDGET_REALLOC/MARKET_ENTRY/COMPETITOR_RESPONSE). System prompt expert ADVERTIS. Context builder charge : métadonnées stratégie, statut piliers, signaux actifs, campagnes actives, Cult Index, Community snapshot.

### 6.6 Serenite (→ ANNEXE D § D.3)

Factures (4 types, 6 statuts, numérotation séquentielle auto, items liés aux assignments), contrats (4 types, 6 statuts, signature data), escrow (release partiel, conditions de libération), commissions (calcul par level × COMMISSION_RATES), dashboard financier (revenue, unpaid, escrow, commissions, avgRate). Currency par défaut XAF.

### 6.7 Tarsis / Signal Intelligence (→ ANNEXE D § D.4)

Signaux 3 couches (METRIC/STRONG/WEAK) liés aux piliers, avec mutations auditées et propagation automatique vers Decision Queue. Market Context : competitors (SOV, positionnement), opportunities (calendrier), budget tiers (5 niveaux), cross-brand intelligence (patterns sectoriels), metric thresholds (seuils d'alerte).

### 6.8 Brand OS (→ ANNEXE D § D.5)

Cult Index Engine (score 0-100, 7 dimensions), SuperfanProfile (6 segments Devotion Ladder : AUDIENCE → EVANGELIST), CommunitySnapshot (santé communautaire périodique), BrandOSConfig (configuration par stratégie), SocialChannels (6 plateformes), Ambassador Program (5 tiers).

### 6.9 La Guilde (→ ANNEXE D § D.6)

TalentProfile complet (compétences, tarifs, dispo, level, portfolio). Talent Engine : search paginé, matching pondéré, calcul de level, reviews, certifications, progression path. Catégories : CORE, EXTENDED, RESEAU.

### 6.10 Modules additionnels (→ ANNEXE D § D.7)

- **Club** (Upgraded Brands Club) : membres, événements, registrations, activités à points
- **Events** (Upgrade Summit) : événements avec budget, logistique, attendees, satisfaction
- **Boutique** (L'Académie) : templates payants/gratuits, achats trackés
- **Courses** (L'Académie) : cours avec programme, enrollment, progression, score final
- **Editorial** (The Upgrade) : articles premium, newsletters segmentées
- **Source Insights / RADAR** : rapports (BAROMETRE/SECTORIEL/FLASH/CUSTOM), data points, alertes, abonnements, demandes custom
- **PR** : communiqués, contacts presse, distributions, clippings (reach, ad equivalent value)
- **Social** : connexions OAuth (6 plateformes), posts publiés avec métriques (likes, comments, shares, reach)
- **Media Buying** : connexions GOOGLE_ADS/META_ADS/DV360/TIKTOK/LINKEDIN, sync performance quotidien (impressions, clicks, spend, conversions)
- **Messaging** : conversations directes inter-acteurs (fixer↔client, fixer↔créatif), threads contextualisés
- **CRM** : pipeline commercial (Deal, FunnelMapping), suivi opportunités prospect → client
- **Translation** : traduction de contenus stratégiques, documents multilingues, adaptation culturelle
- **Attribution** : attribution multi-touch (AttributionEvent), suivi parcours client, ARTEMIS FW-10
- **Cohorts** : analyse de cohortes (CohortSnapshot), rétention, LTV par segment, ARTEMIS FW-10
- **Market Study** : études de marché multi-sources (6 adaptateurs : Google Trends, Semrush, SerpAPI, SimilarWeb, SocialBlade, Crunchbase), synthèse AI
- **Market Pricing** : référentiel de tarifs marché par prestation, secteur et marché
- **Interventions** : demandes ponctuelles hors missions/campagnes (InterventionRequest)
- **Ambassador Program** : programme ambassadeurs à 5 tiers (Bronze → Diamond), referrals, content, points
- **Présentations stratégiques** : génération HTML des 8 piliers (8 renderers spécialisés), export PDF/Excel

### 6.11 Infrastructure transversale

- **Variable Store** : CRUD atomique BrandVariable avec historique de versions, 8 sources possibles, staleness tracking
- **Staleness Propagator** : BFS cascade quand une variable change → marque dépendants stale → propage aux piliers, frameworks, traductions
- **Pipeline Orchestrator** : side-effects post-génération (phase advance, score recalculation, variable extraction, widget computation)
- **AI Cost Tracker** : logging de chaque appel AI (modèle, tokens, coût USD/XAF, durée)
- **Audit Trail** : log immutable de chaque CREATE/UPDATE/DELETE avec userId, before/after data
- **Soft Deletes** : interception des delete sur modèles core → deletedAt timestamp, filtrage automatique
- **4 serveurs MCP** : Intelligence (9 tools, 6 resources), Operations (12 tools, 5 resources), Creative (42 tools), Pulse (11 tools, 7 resources). Transport WebStandard stateless. Auth Bearer token via McpApiKey.

---

## 7. MAPPING DIVISIONS → CODE EXISTANT → AJOUTS

Ce tableau montre ce qui existe déjà dans le code, ce qui est ajouté, et ce qui est enrichi.

### L'Oracle (stratégie de marque)

| Composant | État | Détail |
|-----------|------|--------|
| Strategy + 8 Pillars | ✅ Existe | 87+ modèles, pillar editors complets |
| ARTEMIS Frameworks | ✅ Existe | `framework` router + executor + 20+ frameworks |
| Score Snapshots | ✅ Existe | BMF, risk, investment scores |
| Cockpit Client | ✅ Existe → enrichir | Restructurer autour du cult marketing |
| AdvertisVector /200 | 🆕 Nouveau | Type pervasif + `advertis-scorer` service |
| DevotionSnapshot | 🆕 Nouveau | Modèle + router `devotionLadder` |
| Quick Intake | 🆕 Nouveau | Modèle + engine + pages publiques |
| Boot Sequence | 🆕 Nouveau | Service `boot-sequence` + UI |
| Value Reports | 🆕 Nouveau | Service `value-report-generator` + router |
| Diagnostic Engine | 🆕 Nouveau | Extension ARTEMIS avec localisation problème |

### Le Signal (intelligence marché)

| Composant | État | Détail |
|-----------|------|--------|
| Tarsis (veille concurrentielle) | ✅ Existe | `tarsis/` routes + CompetitorSnapshot |
| Market Study | ✅ Existe → enrichir | 6 adaptateurs, synthèse AI. Connecter résultats → Knowledge Graph, permettre déclenchement depuis Drivers |
| Signals | ✅ Existe | 3 couches (metric/strong/weak) |
| Source Insights (RADAR) | ✅ Existe | `sourceInsights` router + InsightReport modèle |
| Cult Index | ✅ Existe → enrichir | Connecter aux DevotionSnapshot |
| Analytics | ✅ Existe → enrichir | Ajouter dimension ADVE |
| Attribution | ✅ Existe → enrichir | `attribution` router + AttributionEvent. Alimenter Knowledge Graph (patterns par secteur/marché) |
| Cohorts | ✅ Existe → enrichir | `cohort` router + CohortSnapshot. Connecter aux DevotionSnapshot |
| Knowledge Graph | 🆕 Nouveau | KnowledgeEntry modèle + `knowledge-capture` (P0) + `knowledge-aggregator` (P5) |
| Editorial (The Upgrade) | ✅ Existe | `editorial` router + EditorialArticle |

### L'Arène (communauté)

| Composant | État | Détail |
|-----------|------|--------|
| Guilde (TalentProfile) | ✅ Existe → enrichir | Ajouter tier, ADVE vector, driverSpecialties |
| Matching | ✅ Existe (page) → enrichir | Service `matching-engine` |
| Club (Upgraded Brands Club) | ✅ Existe | `club` router + ClubMember + ClubEvent |
| Events (Upgrade Summit) | ✅ Existe | `event` router + Event + EventAttendee |
| GuildOrganization | 🆕 Nouveau | Modèle pour agences de prod |
| QualityReview | 🆕 Nouveau | Modèle + router + `qc-router` service |
| Tier system | 🆕 Nouveau | `guildTier` router + `tier-evaluator` service |
| Ambassador Program | ✅ Existe → enrichir | Réconcilier avec Devotion Ladder (ambassadeurs = segment 5, évangélistes = segment 6) |

### La Fusée (ingénierie et ops)

| Composant | État | Détail |
|-----------|------|--------|
| Campaign Manager 360 | ✅ Existe | 14 sous-routers, modèle complet |
| Missions | ✅ Existe → enrichir | Ajouter mode DISPATCH/COLLAB, driverId |
| GLORY (39 tools) | ✅ Existe → enrichir | Lier aux Drivers, hériter contexte ADVE |
| Deliverables | ✅ Existe → enrichir | Ajouter DeliverableTracking |
| MCP Servers (4) | ✅ Existe | Intelligence, Operations, Creative, Pulse |
| Drivers | 🆕 Nouveau | Modèle + `driver-engine` service |
| Guidelines | 🆕 Nouveau | `guidelines-renderer` service |
| Process Scheduler | 🆕 Nouveau | Modèle + service |
| Feedback Loop | 🆕 Nouveau | Service câblant Signal → scoring → ARTEMIS |
| BrandVault enrichi | ✅ Existe → enrichir | Tagging ADVE, 3 niveaux, garbage collection |
| PR (Relations Presse) | ✅ Existe → enrichir | Ajouter advertis_vector, lier aux Drivers PR, câbler clippings → Signal → feedback loop |
| Social Publishing | ✅ Existe → enrichir | Connecter SocialConnection aux Drivers sociaux, câbler SocialPost.metrics → Signal → feedback loop |
| Media Buying | ✅ Existe → enrichir | Câbler MediaPerformanceSync → CampaignAmplification (données réelles), benchmarks → Knowledge Graph |
| Interventions | ✅ Existe → enrichir | Conversion InterventionRequest → Mission, placer dans portals |
| Translation | ✅ Existe → enrichir | Intégrer aux Drivers multi-marchés, connecter au FW-15 Cultural Expansion |
| Présentations stratégiques | ✅ Existe → enrichir | 8 renderers HTML existants. Étendre `guidelines-renderer` en `brand-document-renderer` (guidelines + présentations + Value Reports) |
| Publications (cycle de vie) | ✅ Existe → enrichir | Clarifier cycle GloryOutput → QualityReview → Publication → BrandAsset |
| MCP Guild (nouveau) | 🆕 Nouveau | 5ème serveur MCP |
| MCP SESHAT (nouveau) | 🆕 Nouveau | 6ème serveur MCP |

### La Fusée — SOCLE (finance)

| Composant | État | Détail |
|-----------|------|--------|
| Serenite (contrats, factures, escrow) | ✅ Existe | Modèles complets |
| Commission | ✅ Existe → enrichir | Ajouter tierAtTime, operatorFee |
| Financial Engine | ✅ Existe → enrichir | Intégrer commissions, memberships |
| Membership | 🆕 Nouveau | Modèle + router |
| Commission Engine | 🆕 Nouveau | Service de calcul automatique |
| Mobile Money | 🆕 Nouveau (P4) | Webhooks Orange/MTN/Wave |
| CRM / Pipeline commercial | ✅ Existe → enrichir | Câbler Quick Intake → Deal, pipeline de conversion, revenue forecasting |
| Market Pricing | ✅ Existe → enrichir | Alimenter matching-engine (référentiel tarifaire) + commission-engine |

### Transversal

| Composant | État | Détail |
|-----------|------|--------|
| Messaging | ✅ Existe → enrichir | Contextualiser par Strategy/Mission, intégrer dans les 3 portals. Mestor = IA, Messaging = humain |

### L'Académie (transmission)

| Composant | État | Détail |
|-----------|------|--------|
| Courses | ✅ Existe | Course + CourseEnrollment modèles |
| Boutique (playbooks, templates) | ✅ Existe | BoutiqueTemplate + TemplatePurchase |
| Onboarding | ✅ Existe → enrichir | Câbler au Boot Sequence |
| Certification ADVE | ✅ Existe (via Course) → enrichir | Parcours structuré par tier |
| Creator /learn | 🆕 Nouveau | Pages dans Creator Portal |
| SESHAT Bridge | 🆕 Nouveau | Service de références créatives |

---


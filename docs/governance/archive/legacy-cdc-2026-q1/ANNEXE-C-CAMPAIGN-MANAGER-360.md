# ANNEXE C — Campaign Manager 360 (Spécification complète)

> Référencé par : CAHIER-DE-CHARGES-INDUSTRY-OS.md § 6

---

## C.1 Vue d'ensemble

Le Campaign Manager 360 est le système d'orchestration complet du cycle de vie des campagnes. Il couvre de la création du brief jusqu'à l'analyse post-campagne, en supportant les actions ATL/BTL/TTL, les pipelines de production, l'achat média, la gestion d'équipe, et le reporting AARRR unifié terrain + digital.

**19 sous-routers, 92 procédures, 12 états de campagne, 100+ types d'actions.**

---

## C.2 Machine à états de la campagne (12 états)

```
BRIEF_DRAFT
    ↓ [validate brief]
BRIEF_VALIDATED
    ↓
PLANNING
    ↓
CREATIVE_DEV
    ↓
PRODUCTION
    ↓
PRE_PRODUCTION
    ↓
APPROVAL ──→ [requires ≥1 CampaignApproval APPROVED]
    ↓
READY_TO_LAUNCH
    ↓
LIVE
    ↓
POST_CAMPAIGN ──→ [triggers automated feedback loop]
    ↓
ARCHIVED

Tous les états → CANCELLED (terminal)
```

**Gate reviews** : la transition entre états est conditionnée par la complétion des milestones marqués `isGateReview: true` pour la phase courante.

---

## C.3 Les 19 sous-routers

### C.3.1 Campaigns (CRUD + lifecycle) — 11 procédures

| Procédure | Type | Description |
|-----------|------|-------------|
| `getByStrategy` | query | Campagnes par stratégie avec filtres (status, isTemplate) |
| `getById` | query | Détail complet avec toutes les relations |
| `getKanban` | query | Vue Kanban groupée par statut |
| `getCalendar` | query | Vue calendrier par date de lancement |
| `search` | query | Recherche multi-champs (stratégie, query, statut, type, funnel, dates) |
| `dashboard` | query | Stats agrégées : nombre actif, budget total, prochaines campagnes |
| `create` | mutation | Création avec code auto-généré (`CAMP-YYYY-###`) |
| `update` | mutation | Mise à jour des champs |
| `transition` | mutation | Transition d'état avec validation gate review + approbation |
| `delete` | mutation | Soft-delete |
| `migrate` | mutation | Migration Pilier I → Campaign Manager |

### C.3.2 Actions ATL/BTL/TTL — 4 procédures

Types d'actions (100+) :
- **ATL** : TV, RADIO, CINEMA, PRESSE, AFFICHAGE, OOH, TRANSIT, DOOH, AMBIENT, AERIAL
- **BTL** (38 types) : SAMPLING, STREET_MARKETING, ACTIVATION_PDV, EVENEMENTIEL, LANCEMENT_PRODUIT, SPONSORING, DIRECT_MAIL, FASHION_SHOW, ACTIVATION_CAMPUS, SENSIBILISATION, etc.
- **TTL** (27 types) : SOCIAL_MEDIA, SOCIAL_AD, SEA, INFLUENCER, CONTENT_MARKETING, CRM, EMAILING, SMS_MARKETING, LOYALTY_PROGRAM, APP_INSTALL, COMMUNITY_MANAGEMENT, etc.

Chaque action porte des champs simulateur : `aarrStage`, `coutUnitaire`, `uniteCosting` (CPM/CPC/CPL/CPA/FLAT), `rendementDecroissant`, `sovTarget`.

### C.3.3 Executions (pipeline production) — 4 procédures

Machine à états production :
```
DEVIS → BAT → EN_PRODUCTION → LIVRAISON → INSTALLE → TERMINE
```

Types : OOH, PLV, PACKAGING, PRINT, VIDEO_PROD, PHOTO_PROD, WEB_DEV, APP_DEV, SIGNAGE, STAND, VEHICULE_WRAP, etc.

### C.3.4 Amplifications (achat média) — 5 procédures

Types média : TV_SPOT, RADIO_SPOT, PRESSE_INSERTION, DIGITAL_AD, SOCIAL_AD, OOH_BUY, CINEMA_SPOT, PROGRAMMATIC, NATIVE_AD, PODCAST_AD, INFLUENCER_POST

Métriques : impressions, reach, clicks, views, conversions, engagements, CPM, CPC, CPV, CTR, VTR, conversion rate. Attribution AARRR par stage.

Coûts : mediaCost + productionCost + agencyFee = totalCost.

### C.3.5 Team — 5 procédures

13 rôles : CAMPAIGN_DIRECTOR, CREATIVE_DIRECTOR, ART_DIRECTOR, COPYWRITER, STRATEGIST, MEDIA_PLANNER, MEDIA_BUYER, PRODUCER, DEVELOPER, COMMUNITY_MANAGER, PROJECT_MANAGER, CLIENT_LEAD, EXTERNAL_VENDOR

Support : internes (User), freelancers (TalentProfile), externes (nom + email + entreprise).

### C.3.6 Milestones — 5 procédures

Gate reviews bloquants. Statuts : PENDING → IN_PROGRESS → COMPLETED / OVERDUE / SKIPPED.

### C.3.7 Budget — 10 procédures

8 catégories : PRODUCTION, MEDIA, TALENT, LOGISTICS, TECHNOLOGY, LEGAL, CONTINGENCY, AGENCY_FEE.

Procédures analytiques : `summary`, `variance`, `burnForecast`, `spendByActionLine`, `costPerKPI`.

### C.3.8 Approvals — 4 procédures

9 types : BRIEF, CREATIVE_CONCEPT, KEY_VISUAL, COPY, BAT, MEDIA_PLAN, BUDGET, FINAL_DELIVERY, LAUNCH.

Round counter sur rejet (incrémente à chaque cycle de révision).

### C.3.9 Assets — 4 procédures

12 types : KEY_VISUAL, VIDEO, AUDIO, PRINT, DIGITAL_BANNER, SOCIAL_POST, PACKAGING, PLV, DOCUMENT, SCRIPT, STORYBOARD, MOODBOARD.

Versioning + publication vers BrandVault. Intégration GLORY (gloryOutputId).

### C.3.10 Briefs — 8 procédures

7 types : CREATIVE, MEDIA, PRODUCTION, VENDOR, EVENT, DIGITAL, RP.

4 générateurs AI : `generateCreative`, `generateMedia`, `generateVendor`, `generateProduction`.

### C.3.11 Reports — 3 procédures

7 types : WEEKLY_STATUS, MONTHLY_STATUS, MID_CAMPAIGN, POST_CAMPAIGN, ROI_ANALYSIS, MEDIA_PERFORMANCE, CREATIVE_PERFORMANCE.

### C.3.12 Links (junctions) — 6 procédures

3 types de liaisons : Campaign ↔ Mission, Campaign ↔ Publication, Campaign ↔ Signal.

### C.3.13 Dependencies — 3 procédures

4 types : BLOCKS, REQUIRES, FOLLOWS, PARALLEL.

### C.3.14 Templates — 2 procédures

Duplication complète (actions, milestones, team, budget). Support multi-marché (parentCampaignId + variants).

### C.3.15 Simulator — 1 procédure

Fournit données pour modélisation marketing mix : actions avec paramètres simulateur + budget annuel + catalogue produit (Pilier V).

### C.3.16 Field Operations (terrain) — 5 procédures

Déploiements terrain : sampling, activations, événements. Avec team JSON (nom, rôle, fee, isValidator), ambassadors JSON (nom, handle, deliverables), aarrConfig JSON (labels et unités par étage AARRR).

### C.3.17 Field Reports (collecte terrain) — 6 procédures

Métriques AARRR en colonnes fixes (pour agrégation SQL) : acquisitionCount/Label/Unit × 5 stages. Photos de preuve. Statut SUBMITTED → VALIDATED avec overrides par validateur.

### C.3.18 AARRR Reporting (unifié terrain + digital) — 3 procédures

Agrégation unifiée terrain (FieldReport VALIDATED) + digital (CampaignAmplification avec AARRR). Métriques calculées : costPerAcquisition, conversionAcqToAct, etc. Division safe (0 → null).

### C.3.19 Operation Recommender — 3 procédures

Moteur de recommandation zéro-LLM : scoring basé sur pertinence funnel, applicabilité secteur, performance AARRR historique, fit budgétaire.

---

## C.4 Enrichissements Industry OS

| Enrichissement | Description |
|---------------|-------------|
| `advertis_vector Json?` sur Campaign | Objectif ADVE cible de la campagne |
| `devotionObjective Json?` sur Campaign | Objectif Devotion Ladder (ex: +5% Engagé → Ambassadeur) |
| Lien Campaign → Driver | Chaque action peut être liée à un Driver spécifique |
| Check ADVE dans approval workflow | Vérification conformité pilier lors des validations |
| AARRR → Knowledge Graph | Chaque rapport de campagne alimente KnowledgeEntry |

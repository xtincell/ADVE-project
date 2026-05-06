# Audit terrain MATANGA V4 — découvertes Phase 18-A1+
## Addendum à PHASE-18-MATANGA-FC.md

> **Auteur** : NEFER
> **Date** : 2026-05-06
> **Source** : `docs/XLS archive/Systeme_Suivi_Matanga_V4-2.xlsx` (8 sheets) + 5 autres XLSX (RAMADAN spots, DERICK projects, CADYST recap)
> **Driver** : audit demandé suite aux 4 OK opérateur (migrate dev + push + XLS archive + clusters confirmés). Le V4 du système Matanga a révélé des dimensions structurantes non-anticipées dans le plan initial.

---

## Confirmation des clusters géo (réponse 4 du user)

**OK confirmé** sur les hypothèses RAMADAN.xlsx :

| Cluster | Pays |
|---|---|
| **Côte d'Ivoire** (solo lead) | CI |
| **Western Cluster** | SN, ML, BF, GN, GM, BJ, TG |
| **Tropical Cluster** | CMR, CG, RDC, GAB |
| **ESA** (East/Southern Africa) | DJI + (autres pays Est à confirmer si volume) |

Codes pays officiels FrieslandCampina (extrait MATANGA V4 sheet NOMENCLATURE rows 11-17) :
- TG = Togo · SN = Sénégal · CD = RDC (Congo) · CM = Cameroun · CI = Côte d'Ivoire · GA = Gabon

→ Liste à étendre selon nouveaux marchés. Mappable directement sur `BrandNode.countryCode` (ISO-2) + `BrandNode.clusterTag`.

---

## 5 découvertes V4 structurantes pour Phase 18-A1+

### 🔥 Découverte 1 — Le portefeuille Matanga = **5 clients corporate** (pas 1)

L'agence Matanga opère **5 clients corporate** distincts, pas seulement FrieslandCampina :

| ID prefix | Corporate | Master brands sous-jacents |
|---|---|---|
| **FC-** | FrieslandCampina | Bonnet Rouge, Belle Hollandaise, Peak, Coast, Rainbow, Omela, Multi-marques |
| **PZ-** | Panzani / Cadyst Group | Panzani, La Pasta Gold, La Pasta First, DELYS |
| **CF-** | Cadyst Farming | ROBUSTE (poussins) |
| **CG-** | Cadyst Grain | Farine (RCA) |
| **FK-** | Fokou | Whisky |

**Note Cadyst Group** : 3 marques distinctes (Panzani, Cadyst Farming, Cadyst Grain) sous le même groupe corporate. C'est exactement le pattern `BrandNode { nodeKind: CORPORATE }` → enfants `MASTER_BRAND` mais avec une option de sous-corporate.

→ **Implications Phase 18-A0** :
- Mon Brand Tree supporte nativement multi-corporate (1 BrandNode CORPORATE par client). Pas de migration data nécessaire.
- Le wizard `/launchpad/portfolio-bulk-import` doit accepter de créer 5 corporates indépendants en parallèle.
- Le dashboard `/console/operate/africa-portfolio` affichera les 5 corporates filtrables séparément.

### 🔥 Découverte 2 — Nomenclature ID PROJET formelle déjà documentée

Le V4 a une nomenclature stricte **`[CLIENT_PREFIX]-[PAYS]-[MARQUE]-NNN`** :
- `FC-TG-PEAK-001` = FrieslandCampina, Togo, Peak, projet 001
- `FC-CD-BR-001` = FC, RDC, Bonnet Rouge
- `FC-XX-MULTI-001` = FC multi-pays (XX = aucun pays spécifique), multi-marques

Pour les autres clients (sans cascade pays/marque) : `PZ-NNN`, `CF-NNN`, `CG-NNN`, `FK-NNN`.

Et ID TÂCHE : `[ID_PROJET].NN` (ex : `FC-TG-PEAK-001.03` = tâche 3 du projet rebranding Lomé).

**Implications data model** :
- Champ `Campaign.code` existe déjà (l.663 `String? // CAMP-YYYY-### auto-generated code`) — à étendre pour matcher pattern Matanga.
- Auto-génération côté backend Mestor : Intent `OPERATOR_CREATE_CAMPAIGN` doit générer le code via `generateCampaignCode({ corporateSlug, countryCode, masterBrandSlug })` qui regarde `[CLIENT_PREFIX]-[PAYS]-[MARQUE]-` puis incrémente NNN depuis `MAX(...)+1`.
- Champ `CampaignDeliverable.code` ou `taskCode` à ajouter en Phase 18-A1 pour l'ID TÂCHE lisible humain (en plus du `id` cuid).

→ **À shipper Phase 18-A1** : extension `Campaign.code` auto-generation + `CampaignDeliverable.taskCode` index sur `(campaignId, taskCode)` unique.

### 🔥 Découverte 3 — STATUTS officiels Matanga ≠ ma proposition Phase 18-A0

Le V4 utilise des statuts précis avec emojis :

| STATUT V4 (REGISTRE PROJETS) | Mon enum Campaign.creativeState (Phase 18-A0) |
|---|---|
| 📥 BRIEF REÇU | (manquant) |
| 📋 BRIEF QUALIFIÉ | (manquant) |
| 🎨 EN PRODUCTION | EN_PROD |
| ⏸️ BLOQUÉ | (manquant — important) |
| ✅ LIVRÉ | LIVRE_TOTAL |
| 🔴 CRITIQUE | (transverse — pas un état mais un signalement) |

**Implications** :
- Mon enum `creativeState` actuel (`BRIEF_DRAFT|EN_CONCEPTION|EN_COURS_MODIF|LIVRE_PARTIEL|LIVRE_TOTAL|EN_ATTENTE_BRIEF|EN_ATTENTE_CAHIER_DE_CHARGES|EN_PROD|EN_RETARD`) **doit être ré-aligné** Phase 18-A1 sur les 6 valeurs officielles V4 :
  - `BRIEF_RECU` (📥) — initial state
  - `BRIEF_QUALIFIE` (📋) — direction créative posée
  - `EN_PRODUCTION` (🎨)
  - `BLOQUE` (⏸️) — état important manquant !
  - `LIVRE` (✅)
  - `CRITIQUE` (🔴) — devrait être un boolean orthogonal `Campaign.isCritical` plutôt qu'un état (conformément aux règles V4)
- `clientState` reste séparé pour le workflow client (BACK2SCH-style) : PENDING / RETOUR_RECU / EN_ATTENTE_FEEDBACK / VALIDE / REJETE.

→ **À shipper Phase 18-A1** : migration enum-style + UI `<CreativeStatusSelect />` qui matche les emojis Matanga + flag `Campaign.isCritical: Boolean` orthogonal + helper `computeRAG()` qui prend en compte `isCritical=true` → AMBER minimum.

### 🔥 Découverte 4 — TICKETS MODIFS = ChangeRequests trackés séparément

Le V4 sheet `TICKETS MODIFS` introduit un **modèle distinct des CampaignBrief** :

```
N° TICKET : [ID_TÂCHE]-R[NN]    — ex: FC-TG-PEAK-001.03-R01
ID TÂCHE  : ref FC-TG-PEAK-001.03
PROJET    : nom humain
DEMANDEUR : nom du client demandeur (Vanelle, Estelle NGAMGO, etc.)
DATE      : timestamp
DESCRIPTION : libellé modif demandée
IMPACT    : 🟡 MINEUR (ajustement) | 🔴 MAJEUR (refonte) | 🟢 COSMÉTIQUE
STATUT    : EN_ATTENTE | EN_COURS | RÉSOLU | REJETÉ
ASSIGNÉ   : crew member
DATE_RÉSOL : timestamp résolution
NOTES     : libre
```

**Workflow décisionnel** (sheet PROTOCOLE ABSENCE row 9-12) :
- Cosmétique → traiter directement
- Mineur → logger ticket + traiter si direction claire
- Majeur → logger ticket + STOP production + escalade Slack Alex+Nelson
- Hors brief → REFUSER + rediriger Nelson

**Pas modélisé Phase 18-A0**. À shipper Phase 18-A1 :

```prisma
model CampaignChangeRequest {
  id, campaignDeliverableId
  ticketCode  // [ID_TÂCHE]-R[NN], unique par deliverable
  requestedBy  // nom + role (client ou interne)
  requestedAt
  description
  impact   // COSMETIC | MINOR | MAJOR | OUT_OF_SCOPE
  status   // PENDING | IN_PROGRESS | RESOLVED | REJECTED | ESCALATED
  assignedTo  // userId
  resolvedAt
  resolutionNotes
  // Lien optionnel vers nouveau CampaignBrief.version créé pour la modif
  newBriefVersion Int?
}
```

→ **Phase 18-A1 priorité haute** — c'est le quotidien de l'agence selon V4 (2 tickets actifs au snapshot, mais probablement 10-30/mois en flow normal).

### 🔥 Découverte 5 — ACTIONS opérationnelles transverses (≠ tâches projet)

Le V4 sheet `ACTIONS` (19 rows actives) tracke les **actions transverses jour-le-jour** qui ne sont pas des tâches projet directes :

```
ACTION       : libellé court de l'action
CONTEXTE     : contexte business + contraintes
PRIORITÉ     : CRITIQUE | HAUTE | MOYENNE | BASSE
CATÉGORIE    : AVANT DÉPART | SYSTÈME | RELANCES | PRODUCTION
ID PROJET    : ref optionnelle (peut être "Système")
IDs TÂCHES   : refs multiples (ex: ".01,.02,.03,.04")
SOURCE       : Gmail | Slack | WhatsApp | Verbal | Brief | Brief+Slack | Système
FAIT         : OUI/NON
```

**Différence avec `Mission`** (model existant) : Mission est strategy-scoped et mission-driver. ACTIONS est **operator-scoped + day-driven**. Ex :
- "Livrer cartons La Pasta Gold — deadline jeudi" (CRITIQUE, AVANT DÉPART, PZ-003.01)
- "Convertir tableur V3 en Google Sheet" (HAUTE, SYSTÈME)
- "Relancer Derick TCHAOU pour dimensions TG" (MOYENNE, RELANCES, PZ-001)

→ **À shipper Phase 18-A1** : nouveau model `OperatorAction` distinct de `Mission` :

```prisma
model OperatorAction {
  id, operatorId
  label
  context
  priority   // CRITICAL | HIGH | MEDIUM | LOW
  category   // BEFORE_DEPARTURE | SYSTEM | FOLLOWUPS | PRODUCTION | OTHER
  campaignId       String?  // optionnel
  deliverableIds   String[] @default([])  // refs multiples vers CampaignDeliverable
  source           String   // GMAIL | SLACK | WHATSAPP | VERBAL | BRIEF | SYSTEM
  done             Boolean  @default(false)
  doneAt           DateTime?
  dueDate          DateTime?
}
```

UI : tab "Actions du jour" sur `/console/operate/africa-portfolio` ou page dédiée `/console/operate/actions`.

### 🔥 Découverte 6 — SIGNAUX = inbox brut Matanga (= Morning Brief Batch ADR-0062 manuel)

Le V4 sheet `SIGNAUX` (32 rows) tracke en colonne tous les inputs externes :

```
SOURCE   : Gmail | Slack | WhatsApp
DATE     : dd/MM
SUJET    : titre mail / canal slack
DE/CANAL : sender + email/channel
URGENT   : OUI/NON
RÉSUMÉ   : résumé manuel
```

→ **C'est exactement le pattern ADR-0062 Morning Brief Batch en Excel manuel**. Le `IngestedSource` model que j'ai shipé Phase 18-A0 va le remplacer nativement. Phase 18-A1 = automatisation de cette collecte.

### 🔥 Découverte 7 (bonus) — Retroplanning Gantt jour×élément

Le fichier `Etat de besoins Spots Ramadan Visuels.xlsx` sheet `Retroplanning Prod` est **un Gantt allocation production** (16 rows × 86 colonnes dont 81 dates 2025-01-01 → 2025-03-21). Chaque cellule = jour × élément.

Pas modélisé Phase 18-A0. **Phase 18 noyau ou 18-A2** :
- Soit étendre `CampaignDeliverable` avec `productionStartDate / productionEndDate`
- Soit nouveau model `ProductionGanttAllocation` plus fin (1 row par jour × deliverable)

→ Décision diffèrée à confirmation user.

---

## Synthèse : ce que Phase 18-A0 couvre vs ne couvre pas

### ✅ Phase 18-A0 (shippé) couvre nativement

- Multi-corporate (5 clients) via Brand Tree CORPORATE → MASTER → ...
- Cascade ID nomenclature implicite via `BrandNode.slug` (mais pas auto-génération formelle yet)
- 6 master brands FC + 4 master brands Cadyst Group + 1 Fokou
- Workflow dual creativeState/clientState (mais valeurs à aligner V4)
- RAG indicator GREEN/AMBER/RED (CRITIQUE = AMBER ou RED selon contexte)
- CampaignDeliverable matrice 6D (Spots et Visuels)

### ⚠️ Phase 18-A0 (shippé) couvre partiellement

- **STATUTS officiels** : enum `creativeState` à ré-aligner sur 6 valeurs V4 (BRIEF_RECU/BRIEF_QUALIFIE/EN_PRODUCTION/BLOQUE/LIVRE) + flag `isCritical` orthogonal
- **Code projet auto-génération** : `Campaign.code` field existe mais générateur backend pour pattern `FC-[PAYS]-[MARQUE]-NNN` à shipper Phase 18-A1

### ❌ Phase 18-A0 (shippé) ne couvre PAS

1. **`CampaignChangeRequest`** (TICKETS MODIFS) — Phase 18-A1 priorité HAUTE
2. **`OperatorAction`** (ACTIONS opérationnelles transverses) — Phase 18-A1 priorité MOYENNE
3. **Retroplanning Gantt** jour×élément — Phase 18-A2 ou Phase 18 noyau
4. **Auto-génération code projet** — Phase 18-A1 priorité MOYENNE
5. **Workflow PROTOCOLE ABSENCE** (arbre décisionnel) — documentation governance, pas data model

---

## Plan d'action proposé Phase 18-A1 (Morning Brief Batch + V4 alignment)

| Sub-phase | Durée estimée | Output | Driver |
|---|---|---|---|
| **18-A1-α** | 2j | Migration enum + extensions `Campaign.creativeState/isCritical` + auto-générateur `code` `[CLIENT]-[PAYS]-[MARQUE]-NNN` | Découverte 2 + 3 |
| **18-A1-β** | 3j | Model `CampaignChangeRequest` + UI ticket inline + workflow STATUS escalation | Découverte 4 (priorité HAUTE) |
| **18-A1-γ** | 2j | Model `OperatorAction` + UI tab actions du jour + filtres priorité/catégorie | Découverte 5 |
| **18-A1-δ** | 5-7j | **Morning Brief Batch (ADR-0062)** — ingestion Gmail/Slack/WhatsApp avec middle portal validation | Plan original Phase 18-A1 + Découverte 6 |
| **18-A1-ε** *(différé)* | 3j | Retroplanning Gantt model + UI calendrier production | Découverte 7 (peut attendre Phase 18 noyau) |

**Total Phase 18-A1 estimé** : **12-14 jours dev** (vs 5-7 jours initial).

---

## Action immédiate

1. Décision business **non-inférable** : confirmes-tu **Phase 18-A1 augmenté** (12-14 jours, intégrant les 5 découvertes V4) plutôt que Phase 18-A1 standard (5-7 jours, juste Morning Brief Batch) ?
   - **Option A** : Phase 18-A1 augmenté (12-14j) — couvre TICKETS MODIFS + OPERATOR_ACTIONS + ID auto-gen + Morning Brief Batch.
   - **Option B** : Phase 18-A1 standard (5-7j) Morning Brief Batch ONLY, et les découvertes V4 deviennent Phase 18-A1.5 (ChangeRequests/Actions/IDs) Phase 18-A1.6 (Retroplanning) à enclencher post-MVP.

Mon avis NEFER : **Option A**. Les TICKETS MODIFS et OPERATOR_ACTIONS sont le quotidien réel de l'agence selon V4, Morning Brief Batch ingest les SIGNAUX qui alimentent ACTIONS. C'est cohérent en bloc.

2. Confirmation **liste des 5 corporates** à ingérer initialement :
   - FrieslandCampina ✅
   - Panzani / Cadyst Group ✅
   - Cadyst Farming ✅
   - Cadyst Grain ✅
   - Fokou ✅

   Manque-t-il d'autres clients en pipe non encore signés ?

---

**Audit terrain V4 = pivot opérationnel Phase 18. Le Brand Tree shipped Phase 18-A0 est la fondation correcte ; Phase 18-A1 augmenté est la couche qui le rend utilisable au quotidien Matanga.**

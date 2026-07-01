# BRIEF UX DESIGNER — LaFusee Industry OS
## Document de reference pour repenser l'experience de navigation

**Date**: 27 mars 2026
**Destinataire**: UI/UX Designer (nouvel arrivant)
**Objectif**: Fournir tout le contexte necessaire pour proposer une nouvelle experience de navigation coherente, vendable et differenciante.

---

## 1. QU'EST-CE QUE LAFUSEE ?

### Vision
LaFusee est le **premier systeme d'exploitation pour marques africaines**. Il encode une methodologie propriertaire de cult marketing (ADVE-RTIS) en protocole operationnel SaaS. Motto: **"De la Poussiere a l'Etoile"**.

### L'ecosysteme UPgraders — 5 Divisions
Le logiciel est structure autour de 5 divisions qui forment un flywheel :

| Division | Role | Couleur suggeree |
|---|---|---|
| **L'Oracle** | Strategie de marque & architecture ADVE | Violet |
| **Le Signal** | Intelligence marche & insights temps reel | Bleu |
| **L'Arene** | Communaute, talents & ecosysteme creatif | Ambre/Or |
| **La Fusee** | Ingenierie, outils & operations creatives | Emeraude |
| **L'Academie** | Formation, certification & transmission | Rose |

### Le protocole ADVE-RTIS — 8 Piliers
Chaque marque est evaluee sur 8 piliers sequentiels, chacun /25 pts, total /200 :

| Pilier | Lettre | Question cle | Exemples de donnees |
|---|---|---|---|
| Authenticite | **A** | Qui es-tu vraiment ? | Archetype Jungien, mythologie fondatrice, Hero's Journey, Ikigai, valeurs |
| Distinction | **D** | Pourquoi toi et pas un autre ? | Personas, positionnement, ton de voix, identite visuelle (pipeline 10 outils), LSI Matrix |
| Valeur | **V** | Que promets-tu au monde ? | Catalogue produits, pricing ladder, unit economics, LTV/CAC |
| Engagement | **E** | Comment creer la devotion ? | Rituels, touchpoints, gamification, AARRR, Devotion Ladder, Cult Index |
| Risk | **R** | Quels sont tes angles morts ? | SWOT, matrice probabilite-impact, mitigations |
| Track | **T** | Comment mesurer le succes ? | Etude marche, Brand-Market Fit, TAM/SAM/SOM |
| Implementation | **I** | De la strategie a l'action ? | Roadmap 90j, calendrier campagnes, budget, equipe |
| Strategie | **S** | Comment tout assembler ? | Synthese executive, score de coherence, axes strategiques |

### 5 Classifications de marque
| Classification | Score /200 | Metaphore |
|---|---|---|
| **Zombie** | 0-80 | Marque sans vie, invisible |
| **Ordinaire** | 81-120 | Fonctionnelle mais substituable |
| **Forte** | 121-160 | Reconnue et respectee |
| **Culte** | 161-180 | Communaute devouee, mouvement naissant |
| **Icone** | 181-200 | Transcende le marche, culture |

---

## 2. LES 7 POPULATIONS UTILISATEURS

| # | Persona | Role | Portail | Niveau d'acces |
|---|---|---|---|---|
| 1 | **Le Fixer** (Alexandre/Admin) | God mode ecosysteme | Console | Total |
| 2 | **Brand Owner** (CEO/DG) | Vue strategique haut niveau | Cockpit (mode EXECUTIVE) | Score, Cult Index, Devotion, Value Reports |
| 3 | **Brand Manager** | Operations quotidiennes | Cockpit (mode MARKETING) | Complet |
| 4 | **Freelance Creatif** | Executant missions | Creator | Selon tier |
| 5 | **Agence Production** | Guild Organization | Creator (org) | Missions collectives |
| 6 | **Agence Conseil** | License ADVE (futur) | Console (light) | Limite |
| 7 | **Prospect** (reseau Alexandre) | Decouverte 15 min | Quick Intake | Public, sans auth |

### Visibilite par Tier (Creator Portal)
| Tier | Acces |
|---|---|
| **APPRENTI** | Brief technique uniquement |
| **COMPAGNON** | + pilier ADVE dominant de la mission |
| **MAITRE** | + profil ADVE complet du client + QC peer review |
| **ASSOCIE** | + acces lecture Console Fixer |

---

## 3. ARCHITECTURE ACTUELLE — 3 PORTAILS + 1 FUNNEL PUBLIC

### 3.1 Quick Intake (/intake) — PUBLIC, SANS AUTH
**Objectif**: Diagnostic gratuit en 15 minutes. Convertir prospects en clients.

| Route | Contenu |
|---|---|
| `/intake` | Landing avec CTA "Diagnostic Gratuit" |
| `/intake/[token]` | Questionnaire adaptatif guide par IA (Mestor conversationnel) |
| `/intake/[token]/result` | Score /200, classification, radar 8 piliers, CTA conversion |
| `/intake/score` | Score public (partage) |

**Flow UX**: Prospect recoit un lien -> 15 min de conversation guidee -> Score instantane -> CTA "Devenir client"

### 3.2 Cockpit (/cockpit) — Client Portal "Brand OS"
**Logo actuel**: "Brand OS" avec icone Sparkles
**Public**: Brand Owners + Brand Managers

**Navigation actuelle (sidebar gauche)** :
```
BRAND OS
├── Dashboard (Cult Dashboard)
│
├── OPERATIONS
│   ├── Missions
│   ├── Campagnes
│   ├── Briefs
│   └── Demandes (Interventions)
│
├── MARQUE
│   ├── Identite (profil ADVE complet)
│   ├── Guidelines (vivantes, exportables HTML/PDF)
│   └── Assets (BrandVault par pilier)
│
├── INSIGHTS
│   ├── Rapports (Value Reports mensuels)
│   ├── Diagnostics (ARTEMIS, radar piliers)
│   ├── Benchmarks (vs secteur)
│   └── Attribution (impact signal par pilier)
│
├── Messages
└── Mestor AI (assistant contextuel)
```

**Dashboard principal** = Cult Dashboard :
- Cult Index (0-100) avec tendance
- Devotion Ladder (visualisation heroique : 6 niveaux de SPECTATEUR a EVANGELISTE)
- Radar 8 piliers avec alertes derive
- Prescriptions actives (recommandations)

**4 Modes de vue** (selon le profil connecte) :
- EXECUTIVE : Cult Index + Devotion + Value Report uniquement
- MARKETING : Detail complet
- FOUNDER : Vision strategique
- MINIMAL : Livrables a valider uniquement

**15 pages actuelles**.

### 3.3 Creator (/creator) — Creator Portal "Guild OS"
**Logo actuel**: "Guild OS"
**Public**: Freelances + Agences de la Guilde

**Navigation actuelle (sidebar gauche, flat)** :
```
GUILD OS
├── Dashboard (missions dispo, actives, QC pipeline, revenus mois)
│
├── MISSIONS
│   ├── Disponibles (accepter/decliner)
│   ├── En cours (briefs, soumettre livrables)
│   └── Collaboratives (mode COLLABORATIF multi-creatifs)
│
├── CONTROLE QUALITE
│   ├── Soumissions (feedbacks recus)
│   └── Peer Review (QC par les Maitres/Associes)
│
├── PROGRESSION
│   ├── Metriques (FPR, score QC)
│   ├── Parcours (criteres tier : APPRENTI -> ASSOCIE)
│   └── Forces (radar ADVE personnel, piliers a developper)
│
├── GAINS
│   ├── Missions (historique commissions)
│   ├── Historique (graphe mensuel)
│   ├── Factures (generees par mois)
│   └── QC (compensation peer review)
│
├── PROFIL
│   ├── Competences (skills, tags)
│   ├── Drivers (specialites par canal)
│   └── Portfolio (lies aux livrables valides)
│
├── APPRENDRE
│   ├── ADVE (fondamentaux, deblocage progressif par tier)
│   ├── Drivers (guide des 20 canaux)
│   ├── Cas (etudes de cas anonymisees)
│   └── Ressources (templates, playbooks, webinars)
│
├── COMMUNAUTE
│   ├── Guilde (annuaire)
│   └── Evenements
│
└── Messages
```

**27 pages actuelles**.

### 3.4 Console (/console) — Fixer Console "Ecosystem OS"
**Logo actuel**: "Fixer Console"
**Public**: Le Fixer (Alexandre) — God mode

**Navigation actuelle (sidebar gauche, groupee par divisions)** :
```
FIXER CONSOLE
├── Ecosystem Dashboard
│
├── L'ORACLE (Violet)
│   ├── Clients & Strategies
│   ├── Diagnostics (vue transversale)
│   ├── Intake (pipeline conversion)
│   └── Boot Sequence
│
├── LE SIGNAL (Bleu)
│   ├── Intelligence
│   ├── Signaux (cross-client)
│   ├── Knowledge Graph
│   └── Contexte Marche
│
├── L'ARENE (Ambre)
│   ├── Guilde (creatifs par tier, metriques, promotions)
│   ├── Matching
│   └── Organisations
│
├── LA FUSEE (Emeraude)
│   ├── Missions
│   ├── Campagnes (cross-client)
│   └── Drivers
│
├── LE SOCLE (Rouge/Finance)
│   ├── Revenus
│   ├── Commissions
│   └── Pipeline (CRM/funnel)
│
└── Messages + Config
```

**16 pages actuelles**.

---

## 4. COMPOSANTS SHARED EXISTANTS (24)

### Data Visualization
| Composant | Description | Utilisation |
|---|---|---|
| `AdvertisRadar` | Radar chart 8 piliers (SVG custom) | Partout — le composant signature |
| `ScoreBadge` | Badge score /200 avec couleur par classification | Cards, tables, modals |
| `DevotionLadder` | Visualisation pyramide 6 niveaux | Cockpit Dashboard |
| `CultIndex` | Jauge Cult Index 0-100 | Cockpit Dashboard |
| `PillarProgress` | Barres de progression par pilier /25 | Diagnostics, profil creator |
| `TierBadge` | Badge tier Guild (APPRENTI->ASSOCIE) | Creator, Console Arene |
| `StatusBadge` | Badge statut generique (couleurs) | Tables, cards |

### Layout & Navigation
| Composant | Description |
|---|---|
| `PageHeader` | Titre + breadcrumbs + description + actions |
| `StatCard` | Carte KPI avec icone, valeur, label, tendance |
| `DataTable` | Table triable, paginee, selectionnable |
| `Tabs` | Onglets avec compteurs |
| `SearchFilter` | Barre recherche + filtres dropdown |
| `Timeline` | Chronologie verticale avec dots colores |
| `MetricCard` | Carte metrique avec barre de progression |

### Feedback & Interaction
| Composant | Description |
|---|---|
| `Modal` | Modal overlay reutil isable |
| `ConfirmDialog` | Dialogue confirmation avec variantes (danger, info, warning) |
| `EmptyState` | Etat vide avec icone + message + CTA |
| `ToastProvider` + `useToast` | Systeme de notifications toast |
| `FormField` | Champ formulaire avec label + erreur |
| `SelectInput` | Dropdown select stylise |

### Skeletons (Loading)
| Composant | Description |
|---|---|
| `SkeletonCard` | Placeholder card animee |
| `SkeletonTable` | Placeholder table animee |
| `SkeletonList` | Placeholder liste animee |
| `SkeletonPage` | Placeholder page entiere |

### Domain Cards
| Composant | Description |
|---|---|
| `MissionCard` | Card mission avec statut, deadline, ADVE tags |
| `CampaignCard` | Card campagne avec score, missions, statut |
| `MestorPanel` | Panel IA Mestor (chat contextuel) |

---

## 5. LE SYSTEME MESTOR — COUCHE IA AMBIANTE

Mestor est l'assistant IA contextuel. Son comportement change selon le portail :

| Portail | Contexte charge | Contraintes |
|---|---|---|
| Quick Intake | Mode interview guidee | Questions adaptatives, 15 min max |
| Cockpit | Brand OS (strategie, scores, campagnes) | Ne revele JAMAIS les mecaniques internes |
| Creator | Mission + guidelines Driver | Detail ADVE selon tier |
| Console | Ecosysteme complet, cross-client | Acces total |

**Modes** : Conversation (threads), Insights proactifs (alertes), Scenarios (what-if, budget, marche, concurrence).

---

## 6. SYSTEMES CLES A REPRESENTER DANS L'UX

### 6.1 Le Score /200
**Le systeme nerveux central**. Chaque action dans la plateforme impacte le score. Le designer doit penser une experience ou le score est :
- Omnipresent mais pas intrusif
- Evolutif (avant/apres visible)
- Decomposable (drill-down de /200 vers les 8 piliers vers les composites)

**Scoring hybride** : partie deterministe (structure) + partie IA (qualite). L'utilisateur ne voit que le resultat. Quick Intake montre des fourchettes quand la confiance est < 0.7.

### 6.2 Le Feedback Loop
```
Action utilisateur -> Signal cree -> Pilier impacte -> Score recalcule -> Deviation detectee -> Prescription generee -> Action utilisateur
```
Ce cycle doit etre **perceptible** dans l'interface. L'utilisateur doit voir que ses actions ont un impact mesurable.

### 6.3 La Devotion Ladder (6 niveaux)
```
SPECTATEUR -> INTERESSE -> PARTICIPANT -> ENGAGE -> AMBASSADEUR -> EVANGELISTE
```
Chaque niveau a des seuils mesurables (interactions, UGC, achats, referrals). La visualisation doit etre **heroique** — c'est le chemin emotionnel de la marque vers le culte.

### 6.4 Le Cult Index (0-100)
Score de "devotion" de la communaute. 7 dimensions ponderees :
- Engagement Depth (25%)
- Superfan Velocity (20%)
- Community Cohesion (15%)
- Brand Defense Rate (15%)
- UGC Generation (10%)
- Ritual Adoption (10%)
- Evangelism Score (5%)

5 tiers : GHOST (0-20), FUNCTIONAL (21-40), LOVED (41-60), EMERGING (61-80), CULT (81-100).

### 6.5 La Guilde (Progression Creatifs)
4 tiers de progression :
```
APPRENTI -> COMPAGNON -> MAITRE -> ASSOCIE
```
Conditions de promotion :
- COMPAGNON : >= 10 missions, FPR >= 70%, avgQC >= 6
- MAITRE : >= 30 missions, FPR >= 80%, avgQC >= 7.5, >= 5 collaboratives
- ASSOCIE : >= 60 missions, FPR >= 90%, avgQC >= 8.5, >= 15 collaboratives, >= 10 peer reviews

### 6.6 Les Drivers (20 Canaux)
Un Driver = un canal d'execution creatif avec ses specs, contraintes, brief template, criteres QC.
Types : Digital (Instagram, Facebook, TikTok, LinkedIn, YouTube, Twitter, Website, App, Email, SMS), Physical (Packaging, PLV, OOH, Print, Event, Pop-up), Media (PR, TV, Radio, Video).

### 6.7 Les 39 GLORY Tools
Outils creatifs en 4 couches :
- **CR** (Concepteur-Redacteur) : 10 outils de production contenu
- **DC** (Direction de Creation) : 8 outils de supervision
- **HYBRID** : 11 outils operationnels
- **BRAND** : 10 outils sequentiels d'identite visuelle (pipeline)

### 6.8 Campaign Manager 360
12 etats de campagne : BRIEF_DRAFT -> BRIEF_VALIDATED -> PLANNING -> CREATIVE_DEV -> PRODUCTION -> PRE_PRODUCTION -> APPROVAL -> READY_TO_LAUNCH -> LIVE -> POST_CAMPAIGN -> ARCHIVED (+ CANCELLED). Gate reviews conditionnent les transitions.

### 6.9 Value Reports
Rapports mensuels auto-generes : evolution score composite, analyse pilier par pilier avec diffs, highlights, recommandations. Le client voit la valeur ajoutee mois par mois.

### 6.10 Knowledge Graph
Intelligence anonymisee cross-client. Types : SECTOR_BENCHMARK, MISSION_OUTCOME, BRIEF_PATTERN, CREATOR_PROFILE, CAMPAIGN_TEMPLATE. Le systeme s'enrichit automatiquement a chaque transaction.

---

## 7. FLOW UTILISATEUR — PARCOURS CLES

### 7.1 Quick Intake (Prospect -> Client)
```
1. Prospect recoit lien unique
2. Landing page Quick Intake avec CTA
3. Conversation guidee Mestor (15 min, adaptatif)
4. Score /200 instantane + radar + classification
5. CTA conversion -> Creation strategie + Deal CRM
6. Onboarding Boot Sequence (60-90 min)
```

### 7.2 First Value Protocol (Post-Onboarding)
```
J+0  : Rapport diagnostic automatique
J+1  : Activation 2-3 drivers prioritaires (fixer)
J+2  : Dispatch premiere mission via GLORY
J+5  : SLA premiere livraison (alerte si manquee)
J+7  : Generation guidelines vivantes (auto, partiel OK)
J+14 : Micro value report + DevotionSnapshot
J+30 : Premier Value Report mensuel complet
```

### 7.3 Cycle de Mission (Creator)
```
1. Mission creee par Fixer (DISPATCH ou COLLABORATIF)
2. Matching engine suggere top 2-3 creatifs
3. Creator recoit mission dans "Disponibles"
4. Accept -> Brief complet + Driver guidelines
5. Soumission livrable
6. QC distribue (automated + peer si tier suffisant)
7. Verdict : ACCEPTED / MINOR_REVISION / MAJOR_REVISION / REJECTED / ESCALATED
8. Commission calculee selon tier + taux operateur
9. Feedback loop -> signal -> recalcul score strategie
```

### 7.4 Cycle Scoring Continu
```
1. Action ecosysteme (mission livree, campagne lancee, signal marche)
2. Signal cree avec pilier affecte + impact
3. Score pilier recalcule (structural x quality_modulator)
4. Score composite /200 mis a jour
5. Classification potentiellement changee
6. Deviation detectee si >= 3 piliers faibles (<15/25)
7. Mestor genere prescription proactive
8. Dashboard mis a jour pour client et fixer
```

---

## 8. CONTRAINTES TECHNIQUES UX

### Performance
| Action | SLA |
|---|---|
| Dashboard load | < 2 secondes |
| Scoring ADVE | < 5 secondes |
| Matching engine | < 3 secondes |
| Generation brief | < 15 secondes |
| Value Report | < 30 secondes |
| Guidelines | < 20 secondes |
| Knowledge Graph query | < 1 seconde |
| Quick Intake end-to-end | < 15 min UX |

### Scale V1
- 1 operateur (UPgraders)
- 50 Brand Instances (clients)
- 100 creatifs Guild
- 20 Guild Organizations
- 200 missions actives simultanees

### Stack Frontend
- Next.js 15 (App Router) + React 19
- Tailwind CSS v4 (design tokens OKLCH)
- Theme actuel : **dark mode** (zinc-950/zinc-900 backgrounds, zinc-800 borders, zinc-400 text)
- Icones : Lucide React
- Charts : div-based (pas de bibliotheque chart externe actuellement)
- Responsive : structure existante mais pas optimisee mobile

### Devises & Localisation
- Devise principale : **FCFA (XAF)**
- Langue : **Francais** (fr-FR)
- Formatage nombres : `Intl.NumberFormat("fr-FR")`
- Marche de reference : Cameroun, expansion Afrique francophone

---

## 9. LACUNES UX IDENTIFIEES — OPPORTUNITES DESIGN

### 9.1 Navigation
- **Pas de navigation unifiee** entre portails — chaque portail est un silo
- **Pas de breadcrumbs globaux** traversant les divisions
- **Sidebar statique** — pas d'etat reduit/expand, pas de favoris
- **Pas de search global** (cmd+K) traversant toutes les entites
- **Pas de raccourcis clavier**
- **Pas de quick actions** contextuelles

### 9.2 Onboarding
- **Pas de tour guide** pour les nouveaux utilisateurs
- **Pas d'etats vides pedagogiques** (les EmptyState actuels sont basiques)
- **Pas de progression visible** du setup initial

### 9.3 Mobile
- **Non optimise mobile** — sidebar only desktop
- Le Quick Intake devrait etre mobile-first (prospects sur telephone)
- Les creatifs Guild travaillent beaucoup sur mobile

### 9.4 Coherence
- **Modals surchargees** — beaucoup d'info dans des modals alors que des pages dediees seraient mieux
- **Manque de transitions** entre etats (pas d'animations)
- **Pas de dark/light mode toggle** (dark only actuellement)
- **Pas de theming par portail** (tout est zinc/violet)

### 9.5 Data Viz
- **Radar SVG basique** — pourrait etre animee, interactive
- **Charts div-based** — pas de vraies visualisations
- **Pas de sparklines** dans les StatCards
- **Pas de comparaisons temporelles** visuelles

### 9.6 Mestor (IA)
- **Page dediee uniquement** — devrait etre un panel flottant accessible partout
- **Pas de suggestions contextuelles** integrees dans les pages
- **Pas d'onboarding conversationnel** dans chaque portail

---

## 10. PISTES DE REFLEXION POUR LE DESIGNER

### 10.1 Navigation Paradigm
**Question centrale** : Comment naviguer dans un systeme qui a 3 portails, 5 divisions, 63 pages, et des entites profondement interconnectees ?

Options a explorer :
- **Hub & Spoke** : Dashboard central -> sections
- **Command Palette** (cmd+K) comme raccourci universel
- **Contextual sidebar** qui s'adapte au contexte (pas de navigation fixe)
- **Breadcrumb trail** intelligent montrant la hierarchie ontologique (Division > Module > Entite)
- **Favoris / Pinned** pour les pages frequentes
- **Recent** pour les entites recemment consultees

### 10.2 Le Radar comme Boussole
Le radar 8 piliers est l'element visuel le plus identitaire. Il pourrait :
- Servir de **navigation** (cliquer sur un pilier = drill-down)
- Etre present comme **mini radar** dans les headers
- **Animer** les transitions quand le score change
- Devenir un **element de brand** reconnaissable

### 10.3 Narrative de Progression
Le systeme raconte une histoire : "De la Poussiere a l'Etoile".
- Zombie -> Ordinaire -> Forte -> Culte -> Icone
- APPRENTI -> COMPAGNON -> MAITRE -> ASSOCIE
- SPECTATEUR -> EVANGELISTE

Chaque progression devrait etre **ressentie** visuellement. Pas juste un changement de badge, mais une transformation de l'experience.

### 10.4 Couleurs des Divisions
Le systeme de couleurs par division est un levier fort mais sous-exploite :
- Violet = Oracle (strategie, sagesse)
- Bleu = Signal (intelligence, data)
- Ambre = Arene (communaute, chaleur)
- Emeraude = Fusee (action, execution)
- Rose = Academie (apprentissage)
- Rouge = Socle (finance)

### 10.5 L'experience "Before/After"
Chaque action devrait montrer son impact. Exemples :
- Livraison mission -> score avant/apres
- Campagne terminee -> evolution radar
- Nouveau membre communaute -> Devotion Ladder avant/apres

---

## 11. GLOSSAIRE — TERMES METIER

| Terme | Definition |
|---|---|
| **ADVE-RTIS** | Methodologie 8 piliers de cult marketing (Authenticite, Distinction, Valeur, Engagement, Risk, Track, Implementation, Strategie) |
| **AdvertisVector** | Objet JSON `{A, D, V, E, R, T, I, S}` — 8 scores /25 |
| **Score /200** | Somme des 8 piliers. Classification : Zombie < 80, Ordinaire < 120, Forte < 160, Culte < 180, Icone <= 200 |
| **Brand Instance** | Un client = une strategie de marque dans le systeme |
| **Driver** | Canal d'execution creatif (Instagram, Event, Print...) avec ses specs et contraintes |
| **GLORY Tools** | 39 outils creatifs en 4 couches (CR, DC, HYBRID, BRAND) |
| **Devotion Ladder** | 6 niveaux de relation communaute (Spectateur -> Evangeliste) |
| **Cult Index** | Score 0-100 mesurant le niveau de devotion communautaire |
| **Guilde** | Ecosysteme de creatifs avec 4 tiers (Apprenti -> Associe) |
| **Guild Organization** | Entite collective (agence) dans la Guilde |
| **Matching Engine** | Algorithme d'affectation creatif-mission multi-facteurs |
| **QC Distribue** | Controle qualite automatise + peer review (Maitres/Associes) |
| **Feedback Loop** | Action -> Signal -> Score recalcule -> Prescription -> Action |
| **Knowledge Graph** | Intelligence anonymisee cross-client qui enrichit le systeme |
| **Mestor** | Assistant IA contextuel (conversation, insights proactifs, scenarios) |
| **ARTEMIS** | 24 frameworks analytiques en 9 couches philosophiques |
| **SESHAT** | Module externe de benchmarks (Phase 2) |
| **Value Report** | Rapport mensuel : evolution scores, highlights, recommandations |
| **Boot Sequence** | Onboarding client complet (60-90 min) |
| **Quick Intake** | Diagnostic gratuit 15 min pour prospects |
| **Fixer** | Administrateur ecosysteme (Alexandre) |
| **Operateur** | Entite business (UPgraders en V1, multi-tenant futur) |
| **Le Sheitan** | L'ennemi existentiel de la marque (pas un concurrent, une force) |
| **LSI Matrix** | Layered Semantic Integration — distribution concepts visuels sur 5 couches |
| **AARRR** | Funnel pirate : Acquisition, Activation, Retention, Revenue, Referral |
| **LF8** | Life Force 8 — 8 desirs biologiques fondamentaux |
| **FCFA/XAF** | Franc CFA, devise reference |
| **SLA** | Service Level Agreement — delais mission |
| **FPR** | First Pass Rate — taux d'acceptation premiere soumission |

---

## 12. INVENTAIRE COMPLET DES PAGES (63)

### Quick Intake (4 pages)
- `/intake` — Landing page publique
- `/intake/[token]` — Questionnaire adaptatif
- `/intake/[token]/result` — Resultat score + CTA
- `/intake/score` — Score public partageable

### Cockpit - Brand OS (15 pages)
- `/cockpit` — Cult Dashboard
- `/cockpit/operate/missions` — Suivi missions
- `/cockpit/operate/campaigns` — Campagnes
- `/cockpit/operate/briefs` — Briefs creatifs
- `/cockpit/operate/requests` — Demandes d'intervention
- `/cockpit/brand/identity` — Profil ADVE complet
- `/cockpit/brand/guidelines` — Guidelines vivantes
- `/cockpit/brand/assets` — BrandVault
- `/cockpit/insights/reports` — Value Reports
- `/cockpit/insights/diagnostics` — Diagnostics piliers
- `/cockpit/insights/benchmarks` — Benchmarks secteur
- `/cockpit/insights/attribution` — Attribution signaux
- `/cockpit/messages` — Messagerie
- `/cockpit/mestor` — IA Mestor

### Creator - Guild OS (27 pages)
- `/creator` — Dashboard
- `/creator/missions/available` — Missions disponibles
- `/creator/missions/active` — Missions en cours
- `/creator/missions/collab` — Missions collaboratives
- `/creator/qc/submitted` — Soumissions QC
- `/creator/qc/peer` — Peer review
- `/creator/progress/metrics` — Metriques performance
- `/creator/progress/path` — Parcours progression
- `/creator/progress/strengths` — Forces ADVE perso
- `/creator/earnings/missions` — Gains missions
- `/creator/earnings/history` — Historique gains
- `/creator/earnings/invoices` — Factures
- `/creator/earnings/qc` — Gains QC
- `/creator/profile/skills` — Competences
- `/creator/profile/drivers` — Specialites Driver
- `/creator/profile/portfolio` — Portfolio
- `/creator/learn/adve` — Fondamentaux ADVE
- `/creator/learn/drivers` — Guide Drivers
- `/creator/learn/cases` — Etudes de cas
- `/creator/learn/resources` — Ressources
- `/creator/community/guild` — Annuaire Guilde
- `/creator/community/events` — Evenements
- `/creator/messages` — Messagerie

### Console - Fixer (16 pages)
- `/console` — Ecosystem Dashboard
- `/console/oracle/clients` — Clients & Strategies
- `/console/oracle/diagnostics` — Diagnostics transversaux
- `/console/oracle/intake` — Pipeline conversion
- `/console/oracle/boot` — Boot Sequence
- `/console/oracle/boot/[sessionId]` — Session Boot
- `/console/signal/intelligence` — RADAR
- `/console/signal/signals` — Signaux cross-client
- `/console/signal/knowledge` — Knowledge Graph
- `/console/signal/market` — Contexte Marche
- `/console/arene/guild` — Guilde (creatifs, metriques, promotions)
- `/console/arene/matching` — Matching engine
- `/console/arene/orgs` — Organisations
- `/console/fusee/missions` — Missions (cross-client)
- `/console/fusee/campaigns` — Campagnes
- `/console/fusee/drivers` — Drivers
- `/console/socle/revenue` — Revenus
- `/console/socle/commissions` — Commissions
- `/console/socle/pipeline` — Pipeline CRM/funnel

### Auth (2 pages)
- `/login` — Connexion
- `/unauthorized` — Acces refuse

---

## 13. LIVRABLES ATTENDUS DU DESIGNER

1. **Audit UX** de l'experience actuelle (navigation, information architecture, coherence)
2. **Nouvelle architecture de navigation** couvrant les 3 portails + Quick Intake
3. **Systeme de design** : couleurs par division, typographie, spacing, composants
4. **Wireframes HD** des pages cles (Dashboard Cockpit, Dashboard Creator, Dashboard Console, Quick Intake flow)
5. **Prototype interactif** de la navigation (sidebar, transitions, responsive)
6. **Mobile-first** pour Quick Intake et Creator Portal
7. **Specifications** pour les composants data viz (Radar, Devotion Ladder, Cult Index, Score)
8. **Design system tokens** alignes avec Tailwind CSS v4 (OKLCH)

---

*Ce document est genere a partir de 13 documents de specification totalisant ~200 pages. Pour toute question, se referer aux annexes source ou demander une clarification.*

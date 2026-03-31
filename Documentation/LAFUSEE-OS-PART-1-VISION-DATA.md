# CAHIER DE CHARGES — LaFusée Industry OS
# PARTIE 1/3 — VISION & DATA MODEL (Sections 1-2)

**Version** : 2.1 (standalone)
**Date** : 23 mars 2026
**Auteur** : Alexandre "Xtincell" Djengue Mbangue × Claude
**Base** : ADVERTIS Codebase (87 modèles Prisma, 43 routers tRPC, 65+ services, 4 serveurs MCP)
**Statut** : Document de référence pour le build

### Annexes techniques (spécifications détaillées)

Ce document est autonome mais référence 4 annexes pour les spécifications exhaustives des systèmes existants :

| Annexe | Contenu | Emplacement |
|--------|---------|-------------|
| **ANNEXE A** | Méthodologie ADVE-RTIS complète (8 piliers, schemas Zod, champs, scoring /200, cycle de génération) | `src/__docs__/ANNEXE-A-METHODOLOGIE-ADVE.md` |
| **ANNEXE B** | GLORY Tools complet (39 outils, 4 layers, inputs/outputs, dépendances, pipeline BRAND) | `src/__docs__/ANNEXE-B-GLORY-TOOLS.md` |
| **ANNEXE C** | Campaign Manager 360 (19 sous-routers, 92 procédures, 12 états, 100+ types d'actions, AARRR unifié) | `src/__docs__/ANNEXE-C-CAMPAIGN-MANAGER-360.md` |
| **ANNEXE D** | Systèmes existants (ARTEMIS 24 frameworks, Mestor AI, Serenite finance, Tarsis intel, Brand OS, Guilde, Club, Events, Boutique, Editorial, RADAR, PR, Social, Media Buying) | `src/__docs__/ANNEXE-D-SYSTEMES-EXISTANTS.md` |
| **ANNEXE E** | Audit de complétude — vérification de couverture de toutes les features existantes, gaps identifiés et intégrés dans ce cahier | `src/__docs__/ANNEXE-E-AUDIT-COMPLETUDE.md` |

Un développeur lisant ce document + les 5 annexes a **toute l'information nécessaire** pour construire LaFusée sans accès au code existant.

---

## 1. CONTEXTE ET VISION

### 1.1 Le problème fondamental

Aucune structure de classe mondiale ne sert correctement le marché créatif en Afrique francophone.

Les groupes internationaux (Havas, Publicis, WPP) maintiennent des bureaux à Abidjan, Douala, Dakar — des boîtes aux lettres. Leurs méthodologies (Meaningful Brands, BrandZ) restent à Paris ou Londres. Les équipes locales exécutent sans framework. Le client africain reçoit un service de tier 3 au prix du tier 1.

Les agences locales n'ont pas de méthode propriétaire. Elles ont du talent, de l'intuition, de la débrouillardise. Mais rien de codifié, rien de reproductible, rien de mesurable. Chaque projet est un artisanat. C'est ce qui empêche le marché de scaler, de professionnaliser, de facturer à sa vraie valeur.

Le freelance créatif reçoit des briefs vagues, est payé au lance-pierres, n'a aucune visibilité sur sa prochaine mission, et n'a aucun pouvoir de négociation.

Le DA dans une agence sous-dimensionnée porte la vision créative de 8 clients en même temps sans méthode formalisée, sans outil pour mesurer si un livrable est "on-brand", sans moyen de transférer son savoir à un junior.

Le chef de marque jongle entre prestataires qui ne se parlent pas, reçoit des livrables incohérents, et ne peut pas prouver la valeur de son budget com auprès de sa direction.

### 1.2 UPgraders — l'écosystème

UPgraders est un écosystème à 5 divisions qui forme un flywheel :

```
L'ORACLE (stratégie) → LE SIGNAL (intelligence) → L'ARÈNE (communauté)
       ↑                                                    ↓
L'ACADÉMIE (transmission) ←←←← LA FUSÉE (ingénierie) ←←←←←←
```

| Division | Métier | Offres clés | Motto |
|----------|--------|-------------|-------|
| **L'Oracle** | Architecture et stratégie de marque | IMPULSION™, Retainer Stratégique | "Voir ce que les autres ne voient pas" |
| **Le Signal** | Intelligence marché et production éditoriale | RADAR™, The Upgrade™ | "Rendre visible ce que personne ne mesure" |
| **L'Arène** | Communauté et événements | Upgraded Brands Club™, Upgrade Summit™, La Guilde™ | "Créer l'appartenance" |
| **La Fusée** | Technologie, outils, infrastructure opérationnelle | ADVERTIS (SaaS), BOOST™, SOCLE™ | "Construire le moteur" |
| **L'Académie** | Transmission, formation, certification | Certification ADVE™, Bootcamps, Playbooks | "Rendre chaque professionnel capable" |

**"De la Poussière à l'Étoile"** — chaque talent créatif, chaque marque, chaque projet peut atteindre l'excellence s'il a la structure pour.

### 1.3 L'ADVE — le protocole

L'ADVE est à UPgraders ce que le Meaningful Brands est à Havas : une méthode propriétaire. Sauf que le Meaningful Brands **mesure** si une marque compte. L'ADVE **prescrit** comment construire un culte de marque.

8 piliers. Chacun avec une question fondamentale :

| Pilier | Nom | Question | Focus |
|--------|-----|----------|-------|
| **A** | Authenticité | Qui êtes-vous vraiment ? | Identité, vision, mission, mythe fondateur |
| **D** | Distinction | Pourquoi vous et pas un autre ? | Positionnement, identité visuelle, voix, dialectes uniques |
| **V** | Valeur | Que promettez-vous au monde ? | Promesse divine, produits (sacrements), expérience multisensorielle |
| **E** | Engagement | Comment créer la dévotion ? | Devotion Ladder, temples, rituels, clergé, pèlerinages, évangélisation |
| **R** | Risk | Quels sont vos angles morts ? | SWOT, cartographie des risques, mitigation, plan de crise |
| **T** | Track | Comment mesurez-vous le succès ? | Validation marché, KPIs, scoring Cult Index |
| **I** | Implementation | De la stratégie à l'action ? | Roadmap 36 mois, budget, structure équipe, campagnes |
| **S** | Stratégie | Comment assembler le tout ? | Synthèse exécutive, bible de marque, playbooks, guidelines |

**En entrée** : n'importe quel objet (marque, brief, créatif, livrable, signal, campagne). L'ADVE le décompose en 8 dimensions. Score /25 par pilier. Composite /200. Confidence 0-1.

**En sortie** : un diagnostic + une prescription pour construire un mouvement de marque. Pas un audit statique — un protocole vivant.

**Échelle de scoring** :
- **0-80** : Zombie (invisible, pas d'identité distincte)
- **81-120** : Ordinaire (fonctionnel mais interchangeable)
- **121-160** : Forte (reconnue et respectée)
- **161-180** : Culte (adorée, inspire la dévotion)
- **181-200** : Icône (légendaire, référence mondiale)

### 1.4 LaFusée — l'Industry OS

LaFusée n'est pas un outil de gestion d'agence. C'est **l'infrastructure méthodologique qui manque à une industrie entière**.

LaFusée est l'encodage numérique des 5 divisions d'UPgraders dans un système où l'ADVE est le protocole pervasif. Le Brand OS est le produit vendu. L'Agency OS est l'infrastructure invisible. L'ADVE est la loi.

Ce que ça permet :
- Un freelance à Douala livre au même standard qu'un studio à Paris — parce que le protocole guide chaque décision
- Une agence locale à Abidjan facture du premium — parce qu'elle a une méthode prouvée et mesurable
- Un chef de marque à Libreville justifie son budget — parce qu'il a un score /200 et une Devotion Ladder
- Un DG mesure sa marque pour la première fois — parce que le Quick Intake lui donne un diagnostic en 15 minutes

L'ambition : devenir **l'infrastructure méthodologique du marché créatif africain**. Et le Knowledge Graph cross-clients est ce qui rend ça irréversible.

### 1.5 Principes architecturaux

1. **L'ADVE est un protocole, pas un module.** Chaque objet transactionnel porte un vecteur ADVERTIS. Le protocole est pervasif.
2. **Refactor over rewrite.** La stack actuelle (Next.js 16, tRPC v11, Prisma 87 modèles, 4 MCP servers, 43 routers) est solide. On rewire, on ne réécrit pas.
3. **Additif d'abord.** Les nouveaux champs sont optionnels (`Json?` nullable). Le système existant continue de fonctionner pendant la migration.
4. **Les portals sont des vues, pas des apps.** Les 3 portals (Client, Creator, Fixer) sont des vues filtrées sur le même backend. Pas de code dupliqué.
5. **Les 5 divisions structurent l'expérience.** Chaque feature appartient à une division. La Fixer Console les expose toutes. Les portals Client et Creator n'en montrent que les facettes pertinentes.
6. **Le Knowledge Graph est capturé dès le jour 1.** La capture est immédiate, l'intelligence est progressive.
7. **Multi-opérateur ready.** UPgraders est le premier opérateur. Le modèle de données prépare l'arrivée d'opérateurs licenciés (agences certifiées ADVE) sans le construire en V1.

### 1.6 Les 7 populations servies

| Acteur | Douleur | Ce que LaFusée résout | Portal |
|--------|---------|----------------------|--------|
| **Le Fixer** (Alexandre/ADMIN) | Impossible de scaler sa méthode au-delà de sa présence physique | God mode sur l'écosystème. Le système porte la méthode à sa place | Fixer Console |
| **Le propriétaire de marque** (DG/CEO) | Ne peut pas mesurer la force de sa marque ni justifier le budget | Score /200, Cult Index, Devotion Ladder, Value Reports | Client Portal (EXECUTIVE) |
| **Le responsable de marque** (Brand Manager) | Jongle entre prestataires incohérents, pas de métriques | Brand OS vivant, guidelines, briefs qualifiés, suivi par pilier | Client Portal (MARKETING) |
| **Le freelance créatif** | Briefs vagues, pricing au rabais, pas de progression | Guilde avec tiers, briefs qualifiés, tarifs structurés, apprentissage ADVE | Creator Portal |
| **L'agence opérationnelle/de production** | Sous-traitance à l'aveugle, marges compressées | Guild Organization, briefs qualifiés, pipeline stable | Creator Portal (org) |
| **L'agence conseil de grade inférieur** | Pas de méthode reproductible, dépend du talent des fondateurs | Licence ADVE, outils clé-en-main, qualité standardisée par le protocole | Fixer Console (light) |
| **Le réseau d'Alexandre** (DG, CMO, directeurs) | Pas de mesure objective de leur marque | Quick Intake partageable → diagnostic en 15 min → funnel vers le Brand OS | Quick Intake (public) |

---

## 2. DATA MODEL

### 2.1 Type fondamental : AdvertisVector

Nouveau type pervasif, attachable à tout objet transactionnel du système.

```typescript
// src/lib/types/advertis-vector.ts
import { z } from "zod";

export const AdvertisVectorSchema = z.object({
  a: z.number().min(0).max(25),  // Authenticité
  d: z.number().min(0).max(25),  // Distinction
  v: z.number().min(0).max(25),  // Valeur
  e: z.number().min(0).max(25),  // Engagement
  r: z.number().min(0).max(25),  // Risk
  t: z.number().min(0).max(25),  // Track
  i: z.number().min(0).max(25),  // Implementation
  s: z.number().min(0).max(25),  // Stratégie
  composite: z.number().min(0).max(200),  // Somme des 8 piliers
  confidence: z.number().min(0).max(1),   // Fiabilité du scoring
});

export type AdvertisVector = z.infer<typeof AdvertisVectorSchema>;

// Classification automatique
export function classifyBrand(composite: number): "ZOMBIE" | "ORDINAIRE" | "FORTE" | "CULTE" | "ICONE" {
  if (composite <= 80) return "ZOMBIE";
  if (composite <= 120) return "ORDINAIRE";
  if (composite <= 160) return "FORTE";
  if (composite <= 180) return "CULTE";
  return "ICONE";
}
```

**Modèles existants à enrichir** (ajout champ `advertis_vector Json?`) :

| Modèle | Raison |
|--------|--------|
| `Strategy` | Profil ADVERTIS vivant du client (Brand Instance) |
| `Campaign` | Objectif ADVERTIS cible de la campagne |
| `Mission` | Vecteur hérité de la campagne/strategy parente |
| `TalentProfile` | Forces ADVERTIS du créatif |
| `Signal` | Impact ADVERTIS du signal détecté |
| `GloryOutput` | Piliers renforcés par le livrable créatif |
| `BrandAsset` | Piliers que cet asset sert |

### 2.2 Nouveaux modèles Prisma

#### 2.2.1 Operator (multi-opérateur ready)

```prisma
model Operator {
  id            String   @id @default(cuid())
  name          String   // "UPgraders SARL", "Agence XYZ"
  slug          String   @unique // "upgraders", "agence-xyz"
  status        OperatorStatus @default(ACTIVE) // ACTIVE, SUSPENDED, CHURNED

  // Licence ADVE
  licenseType   LicenseType @default(OWNER) // OWNER (UPgraders), LICENSED, TRIAL
  licensedAt    DateTime?
  licenseExpiry DateTime?

  // Configuration
  branding      Json?    // Logo, couleurs, custom domain
  maxBrands     Int      @default(50)  // Limite de Brand Instances
  commissionRate Float   @default(0.10) // % reversé à UPgraders sur chaque transaction

  // Relations
  users         User[]
  strategies    Strategy[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

**Note** : en V1, seul l'Operator "UPgraders" existe (`licenseType: OWNER`). Le modèle prépare le multi-tenant sans le construire.

**Modification sur `User`** : ajout `operatorId String?` + relation `Operator`.
**Modification sur `Strategy`** : ajout `operatorId String?` + relation `Operator`.

#### 2.2.2 Driver (S2 — Machine de traduction stratégie → canal)

```prisma
model Driver {
  id            String   @id @default(cuid())
  strategyId    String
  strategy      Strategy @relation(fields: [strategyId], references: [id])

  channel       DriverChannel  // INSTAGRAM, FACEBOOK, TIKTOK, LINKEDIN, WEBSITE, PACKAGING, EVENT, PR, PRINT, VIDEO, RADIO, TV, OOH, CUSTOM
  channelType   DriverType     // DIGITAL, PHYSICAL, EXPERIENTIAL, MEDIA
  name          String         // "Instagram CIMENCAM"
  status        DriverStatus   @default(ACTIVE) // ACTIVE, INACTIVE, ARCHIVED

  // Specs de production
  formatSpecs   Json           // Specs techniques par format (taille, ratio, durée, résolution)
  constraints   Json           // Contraintes (interdits visuels, tonalité, fréquence)
  briefTemplate Json           // Template de brief pré-rempli pour ce driver
  qcCriteria    Json           // Critères de QC spécifiques au canal

  // Vecteur ADVERTIS de priorité pour ce canal
  pillarPriority Json          // AdvertisVector — quels piliers sont prioritaires

  // Relations
  missions      Mission[]
  processes     Process[]
  gloryTools    DriverGloryTool[]

  deletedAt     DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([strategyId])
}

model DriverGloryTool {
  id        String @id @default(cuid())
  driverId  String
  driver    Driver @relation(fields: [driverId], references: [id])
  gloryTool String // Identifiant du GLORY tool lié (slug)

  @@index([driverId])
}
```

#### 2.2.3 GuildOrganization (agences de prod dans la Guilde)

```prisma
model GuildOrganization {
  id              String   @id @default(cuid())
  name            String   // "Studio Bantoo", "Motion19"
  description     String?
  logoUrl         String?
  website         String?

  tier            GuildTier @default(APPRENTI)
  advertis_vector Json?    // Forces ADVERTIS collectives

  // Métriques agrégées
  totalMissions   Int      @default(0)
  firstPassRate   Float    @default(0)
  avgQcScore      Float    @default(0)

  // Spécialités
  specializations Json?    // [{channel: "VIDEO", level: "EXPERT"}, ...]

  // Relations
  members         TalentProfile[]

  deletedAt       DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Modification sur `TalentProfile`** : ajout `guildOrganizationId String?` + relation.

#### 2.2.4 QualityReview (QC distribué)

```prisma
model QualityReview {
  id              String   @id @default(cuid())
  deliverableId   String
  deliverable     MissionDeliverable @relation(fields: [deliverableId], references: [id])
  reviewerId      String
  reviewer        User     @relation(fields: [reviewerId], references: [id])

  // Verdict structuré par pilier
  verdict         ReviewVerdict  // ACCEPTED, MINOR_REVISION, MAJOR_REVISION, REJECTED, ESCALATED
  pillarScores    Json           // { a: {score, comment}, d: {score, comment}, ... } — piliers pertinents uniquement
  overallScore    Float          // Score global 0-10
  feedback        String         // Feedback général

  // Méta
  reviewType      ReviewType     // AUTOMATED, PEER, FIXER, CLIENT
  reviewDuration  Int?           // Durée en minutes (pour compensation)

  createdAt       DateTime @default(now())

  @@index([deliverableId])
  @@index([reviewerId])
}
```

#### 2.2.5 Enrichissement TalentProfile (Guilde avec tiers)

```prisma
// Champs à ajouter sur TalentProfile existant
model TalentProfile {
  // ... champs existants conservés ...

  tier              GuildTier @default(APPRENTI) // APPRENTI, COMPAGNON, MAITRE, ASSOCIE
  advertis_vector   Json?     // Forces ADVERTIS du créatif

  // Métriques de performance (enrichissement des existants totalMissions, avgScore)
  firstPassRate     Float     @default(0)  // Taux d'acceptation premier jet
  collabMissions    Int       @default(0)  // Missions collaboratives validées
  peerReviews       Int       @default(0)  // QC peer effectués

  // Spécialités par driver
  driverSpecialties Json?     // [{channel: "INSTAGRAM", level: "EXPERT"}, ...]

  // Guild Organization
  guildOrganizationId String?
  guildOrganization   GuildOrganization? @relation(fields: [guildOrganizationId], references: [id])

  // Relations nouvelles
  qualityReviews    QualityReview[]  // Reviews effectuées
  portfolioItems    PortfolioItem[]
  memberships       Membership[]
  commissions       Commission[]
}
```

#### 2.2.6 PortfolioItem

```prisma
model PortfolioItem {
  id              String @id @default(cuid())
  talentProfileId String
  talentProfile   TalentProfile @relation(fields: [talentProfileId], references: [id])
  deliverableId   String?
  title           String
  description     String?
  pillarTags      Json?    // Piliers ADVERTIS que cet item illustre
  fileUrl         String?
  thumbnailUrl    String?

  createdAt       DateTime @default(now())

  @@index([talentProfileId])
}
```

#### 2.2.7 Process (Scheduler)

```prisma
model Process {
  id            String   @id @default(cuid())
  strategyId    String?
  strategy      Strategy? @relation(fields: [strategyId], references: [id])

  type          ProcessType    // DAEMON, TRIGGERED, BATCH
  name          String
  description   String?
  status        ProcessStatus  // RUNNING, PAUSED, STOPPED, COMPLETED

  // Scheduling
  frequency     String?        // Cron expression pour DAEMON/BATCH
  triggerSignal String?        // Type de signal qui déclenche un TRIGGERED
  priority      Int @default(5) // 1 (critique) à 10 (faible)

  // Assignation
  driverId      String?
  driver        Driver?  @relation(fields: [driverId], references: [id])
  assigneeId    String?

  // Playbook (pour TRIGGERED)
  playbook      Json?    // Actions séquencées avec piliers ADVERTIS prioritaires

  // Tracking
  lastRunAt     DateTime?
  nextRunAt     DateTime?
  runCount      Int      @default(0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([strategyId])
  @@index([status])
}
```

#### 2.2.8 Commission (Value Capture)

```prisma
// Le modèle Commission EXISTE DÉJÀ dans le schema (missionId, talentId, grossAmount, commissionRate, etc.)
// Enrichissement :
model Commission {
  // ... champs existants conservés (missionId, talentId, grossAmount, commissionRate, commissionAmount, netAmount, currency, status, paidAt) ...

  // Nouveaux champs
  tierAtTime    GuildTier?       // Tier du créatif au moment de la commission
  operatorFee   Float?           // Part reversée à l'opérateur (si licencié)
  invoiceId     String?
  invoice       Invoice? @relation(fields: [invoiceId], references: [id])
}

model Membership {
  id              String   @id @default(cuid())
  talentProfileId String
  talentProfile   TalentProfile @relation(fields: [talentProfileId], references: [id])

  tier            GuildTier
  amount          Float          // Montant mensuel
  currency        String @default("XAF")
  status          MembershipStatus // ACTIVE, OVERDUE, CANCELLED, EXEMPT

  currentPeriodStart DateTime
  currentPeriodEnd   DateTime

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([talentProfileId])
}
```

#### 2.2.9 DevotionSnapshot

```prisma
model DevotionSnapshot {
  id            String   @id @default(cuid())
  strategyId    String
  strategy      Strategy @relation(fields: [strategyId], references: [id])

  // Distribution en % (somme = 100)
  spectateur    Float @default(0)
  interesse     Float @default(0)
  participant   Float @default(0)
  engage        Float @default(0)
  ambassadeur   Float @default(0)
  evangeliste   Float @default(0)

  // Score synthétique (0-100)
  devotionScore Float

  // Source
  trigger       String @default("manual") // manual, scheduled, signal, campaign_end

  measuredAt    DateTime @default(now())

  @@index([strategyId])
  @@index([measuredAt])
}
```

#### 2.2.10 KnowledgeEntry (Knowledge Graph)

```prisma
model KnowledgeEntry {
  id            String   @id @default(cuid())

  entryType     KnowledgeType // DIAGNOSTIC_RESULT, MISSION_OUTCOME, BRIEF_PATTERN, CREATOR_PATTERN, SECTOR_BENCHMARK, CAMPAIGN_TEMPLATE

  // Contexte
  sector        String?       // FMCG, BANQUE, STARTUP, TECH...
  market        String?       // CM, CI, GA, SN...
  channel       String?       // DriverChannel value
  pillarFocus   String?       // Pilier dominant (A, D, V, E, R, T, I, S)

  // Données
  data          Json          // Contenu structuré variable selon le type

  // Métriques
  successScore  Float?        // Indicateur de succès (0-1)
  sampleSize    Int @default(1)

  // Traçabilité (anonymisé — pas de lien direct vers Strategy)
  sourceHash    String?       // Hash anonymisé de la source

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([entryType])
  @@index([sector])
  @@index([market])
}
```

#### 2.2.11 DeliverableTracking (Feedback Loop)

```prisma
model DeliverableTracking {
  id              String   @id @default(cuid())
  deliverableId   String   @unique
  deliverable     MissionDeliverable @relation(fields: [deliverableId], references: [id])

  // Signaux attendus (configurés par le Driver)
  expectedSignals Json     // [{type: "engagement", target: 500}, {type: "impressions", target: 10000}]

  // Signaux reçus
  receivedSignals Json     @default("[]")

  // Impact mesuré sur les piliers
  pillarImpact    Json?    // AdvertisVector delta (avant/après)

  status          TrackingStatus // AWAITING_SIGNALS, PARTIAL, COMPLETE, EXPIRED
  expiresAt       DateTime

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

#### 2.2.12 QuickIntake (porte d'entrée du funnel)

```prisma
model QuickIntake {
  id            String   @id @default(cuid())

  // Identité (pas de compte requis)
  contactName   String
  contactEmail  String
  contactPhone  String?
  companyName   String
  sector        String?
  country       String?

  // Données collectées (15 min AI-guided)
  responses     Json     // Réponses structurées aux questions ADVE

  // Résultat
  advertis_vector Json?  // Score produit par le Quick Intake
  classification  String? // ZOMBIE, ORDINAIRE, FORTE, CULTE, ICONE
  diagnostic      Json?   // Diagnostic synthétique (forces, faiblesses, recommandations)

  // Conversion
  shareToken    String   @unique @default(cuid()) // Token pour lien partageable
  status        QuickIntakeStatus @default(IN_PROGRESS) // IN_PROGRESS, COMPLETED, CONVERTED, EXPIRED
  convertedToId String?  // strategyId si converti en Brand Instance

  // Tracking
  source        String?  // "direct_link", "referral_alexandre", "summit_2026", etc.
  completedAt   DateTime?

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([shareToken])
  @@index([contactEmail])
  @@index([status])
}
```

### 2.3 Nouveaux Enums

```prisma
enum OperatorStatus {
  ACTIVE
  SUSPENDED
  CHURNED
}

enum LicenseType {
  OWNER      // UPgraders
  LICENSED   // Agence certifiée ADVE
  TRIAL      // Période d'essai
}

enum GuildTier {
  APPRENTI
  COMPAGNON
  MAITRE
  ASSOCIE
}

enum DriverChannel {
  INSTAGRAM
  FACEBOOK
  TIKTOK
  LINKEDIN
  WEBSITE
  PACKAGING
  EVENT
  PR
  PRINT
  VIDEO
  RADIO
  TV
  OOH
  CUSTOM
}

enum DriverType {
  DIGITAL
  PHYSICAL
  EXPERIENTIAL
  MEDIA
}

enum DriverStatus {
  ACTIVE
  INACTIVE
  ARCHIVED
}

enum ProcessType {
  DAEMON
  TRIGGERED
  BATCH
}

enum ProcessStatus {
  RUNNING
  PAUSED
  STOPPED
  COMPLETED
}

enum ReviewVerdict {
  ACCEPTED
  MINOR_REVISION
  MAJOR_REVISION
  REJECTED
  ESCALATED
}

enum ReviewType {
  AUTOMATED
  PEER
  FIXER
  CLIENT
}

enum MissionMode {
  DISPATCH
  COLLABORATIF
}

enum MembershipStatus {
  ACTIVE
  OVERDUE
  CANCELLED
  EXEMPT
}

enum KnowledgeType {
  DIAGNOSTIC_RESULT
  MISSION_OUTCOME
  BRIEF_PATTERN
  CREATOR_PATTERN
  SECTOR_BENCHMARK
  CAMPAIGN_TEMPLATE
}

enum TrackingStatus {
  AWAITING_SIGNALS
  PARTIAL
  COMPLETE
  EXPIRED
}

enum QuickIntakeStatus {
  IN_PROGRESS
  COMPLETED
  CONVERTED
  EXPIRED
}
```

### 2.4 Modifications sur modèles existants

| Modèle existant | Champs à ajouter | Raison |
|---|---|---|
| `User` | `operatorId String?` | Lien vers l'opérateur |
| `Strategy` | `operatorId String?`, `advertis_vector Json?`, phase `QUICK_INTAKE` | Multi-opérateur + scoring ADVE + porte tactique |
| `Campaign` | `advertis_vector Json?`, `devotionObjective Json?` | Objectifs ADVE composites |
| `Mission` | `advertis_vector Json?`, `mode MissionMode?`, `driverId String?` | Mode dispatch/collaboratif + lien Driver |
| `TalentProfile` | `tier GuildTier`, `advertis_vector Json?`, `driverSpecialties Json?`, `guildOrganizationId String?`, métriques perf | Guilde complète |
| `Signal` | `advertis_vector Json?` | Impact ADVE du signal |
| `GloryOutput` | `advertis_vector Json?` | Piliers renforcés par le livrable |
| `BrandAsset` | `pillarTags Json?` | Tagging ADVE des assets |
| `Pillar` (existant, renommé PillarContent dans le contexte) | `confidence Float?` | Fiabilité du contenu |
| `Commission` (existant) | `tierAtTime GuildTier?`, `operatorFee Float?`, `invoiceId String?` | Enrichissement value capture |

### 2.5 Estimation du modèle cible

| Dimension | Actuel | Ajouté | Cible |
|-----------|--------|--------|-------|
| Modèles Prisma | 87 | +12 (Operator, Driver, DriverGloryTool, GuildOrganization, QualityReview, PortfolioItem, Process, Membership, DevotionSnapshot, KnowledgeEntry, DeliverableTracking, QuickIntake) | **~99** |
| Modèles modifiés | — | 10 | — |
| Enums ajoutés | — | 15 | — |

---


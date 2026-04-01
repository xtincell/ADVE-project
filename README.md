# LaFusee OS

**Plateforme SaaS de gestion de marque IA-powered** — Methodologie ADVE-RTIS, 42 modules, 6 serveurs MCP, 3 portails.

> *"Chaque marque a un ADN. On le decode, on le protege, on le fait performer."*

---

## Vue d'ensemble

LaFusee OS est le systeme d'exploitation de l'agence LaFusee. Il orchestre la gestion complete du cycle de vie des marques — du diagnostic initial au suivi de performance continu — via la methodologie proprietaire **ADVE-RTIS** (8 piliers, score /200).

### Chiffres cles

| Metrique | Valeur |
|---|---|
| Modules | 42 |
| Pages (routes) | 96 |
| Fichiers TypeScript | 290 |
| Lignes de code | ~68 000 |
| Routers tRPC | 49 |
| Modeles Prisma | ~80 |
| Serveurs MCP | 6 |
| Portails | 3 + 1 widget |

---

## Architecture

```
LaFusee OS
├── Portail Console (Fixer)     — 49 pages, 9 divisions, admin complet
├── Portail Cockpit (Client)    — dashboard marque, missions, insights
├── Portail Creator (Talent)    — missions, QC, gains, progression
├── Widget Intake               — formulaire public d'onboarding
├── 6 Serveurs MCP              — Intelligence, Operations, Creative, Pulse, Guild, Seshat
├── 49 Routers tRPC             — API type-safe backend complet
├── Prisma + PostgreSQL          — ~80 modeles, 2400+ lignes de schema
└── Anthropic Claude API         — AI pour diagnostic, scoring, generation, Glory tools
```

### Stack technique

- **Framework** : Next.js 15 (App Router, Turbopack)
- **Language** : TypeScript 5.8 (strict)
- **API** : tRPC v11 + React Query
- **Base de donnees** : PostgreSQL via Prisma 6
- **Auth** : NextAuth v5 (RBAC : FIXER, ASSOCIE, CLIENT, CREATOR)
- **AI** : Anthropic Claude API (@anthropic-ai/sdk + AI SDK)
- **MCP** : Model Context Protocol (@modelcontextprotocol/sdk)
- **UI** : Tailwind CSS 4, Lucide Icons, Recharts
- **Tests** : Vitest (unit) + Playwright (e2e)
- **Deploy** : Vercel (crons integres)

---

## Methodologie ADVE-RTIS

Le coeur de LaFusee. Chaque marque est evaluee sur 8 piliers, score /25 chacun, total /200 :

| Pilier | Nom | Description |
|---|---|---|
| **A** | Authenticite | ADN de marque, valeurs, mission, histoire |
| **D** | Distinction | Positionnement, differenciation, avantage competitif |
| **V** | Valeur | Proposition de valeur, pricing, perception marche |
| **E** | Engagement | Communaute, touchpoints, fidelisation |
| **R** | Risk | Risques identifies, vulnerabilites, plan de mitigation |
| **T** | Track | KPIs, metriques de suivi, objectifs chiffres |
| **I** | Implementation | Plan d'action, phases, ressources, timeline |
| **S** | Strategie | Vision long terme, roadmap, pivots strategiques |

### Classification AdvertisVector

| Score /200 | Classification |
|---|---|
| 170+ | LEGENDARY |
| 140-169 | ICONIC |
| 110-139 | ESTABLISHED |
| 80-109 | EMERGING |
| 50-79 | FRAGILE |
| < 50 | CRITICAL |

---

## Les 7 Divisions

| Division | Couleur | Role |
|---|---|---|
| **L'Oracle** | Violet | Diagnostic, ingestion, boot sequence, intake pipeline |
| **Le Signal** | Bleu | Intelligence marche, signaux, knowledge graph, attribution |
| **L'Arene** | Orange | Guilde de creatifs, matching, organisations, evenements |
| **La Fusee** | Rouge | Missions, campagnes, drivers, glory tools, social, PR, media |
| **Le Socle** | Vert | Revenus, commissions, pipeline, contrats, escrow, factures |
| **L'Academie** | Jaune | Formations, certifications, boutique, contenu editorial |
| **L'Ecosysteme** | — | Operateurs, metriques globales, scoring plateforme |

---

## 6 Serveurs MCP

Chaque serveur expose des **tools** (actions) et des **resources** (donnees) via le protocole MCP :

| Serveur | Tools | Resources | Role |
|---|---|---|---|
| **Intelligence** | 6 | 7 | Analyse marche, signaux, drift detection |
| **Operations** | 8 | 5 | Missions, campagnes, SLA, scheduling |
| **Creative** | 23 | 7 | Brand guardian, glory tools, generation creative |
| **Pulse** | 5 | 4 | Social metrics, engagement, tendances |
| **Guild** | 6 | 5 | Talent matching, QC, promotions |
| **Seshat** | 4 | 3 | Knowledge persistence, memoire organisationnelle |

---

## Glory Tools

39 outils AI specialises repartis en 4 couches :

| Couche | Outils | Role |
|---|---|---|
| **CR** (Creative) | 10 | Generation visuelle, copy, scripts |
| **DC** (Data-Creative) | 8 | Analyse data → creative briefs |
| **HYBRID** | 11 | Mix strategie + execution |
| **BRAND** | 10 | ADN de marque, guidelines, voice |

Chaque Glory tool recoit automatiquement le contexte ADVE de la marque (advertis_vector, sector, market, positioning).

---

## Demarrage rapide

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Cle API Anthropic (`ANTHROPIC_API_KEY`)

### Installation

```bash
# Clone
git clone https://github.com/xtincell/ADVE-project.git
cd ADVE-project

# Dependances
npm install

# Variables d'environnement
cp .env.example .env
# Remplir : DATABASE_URL, ANTHROPIC_API_KEY, NEXTAUTH_SECRET

# Base de donnees
npx prisma migrate dev
npx prisma db seed        # seed de base
npx prisma db seed:demo   # seed de demo (optionnel)

# Lancer
npm run dev
```

L'app tourne sur `http://localhost:3000`.

### Scripts disponibles

| Script | Description |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build production |
| `npm run start` | Start production |
| `npm run lint` | ESLint |
| `npm run test` | Tests unitaires (Vitest) |
| `npm run test:e2e` | Tests E2E (Playwright) |
| `npm run db:generate` | Regenerer le client Prisma |
| `npm run db:push` | Push schema sans migration |
| `npm run db:migrate` | Migration dev |
| `npm run db:seed` | Seed de base |
| `npm run db:seed:demo` | Seed de demo |

---

## Structure du projet

```
src/
├── app/
│   ├── (auth)/              # Pages d'auth (login, register)
│   ├── (cockpit)/           # Portail Client (Cockpit)
│   ├── (console)/           # Portail Admin (Console Fixer) — 49 pages
│   ├── (creator)/           # Portail Creatif (Creator)
│   ├── (intake)/            # Widget d'intake public
│   └── api/
│       ├── auth/            # NextAuth endpoints
│       ├── chat/            # AI chat endpoints
│       ├── cron/            # Crons Vercel (scheduler, feedback-loop)
│       ├── export/          # Export PDF/HTML
│       ├── mcp/             # MCP server endpoints
│       ├── trpc/            # tRPC handler
│       ├── webhooks/        # Webhooks entrants
│       └── widget/          # Widget API
├── components/
│   ├── navigation/          # AppShell, sidebar, portal configs
│   ├── shared/              # PageHeader, StatCard, StatusBadge, EmptyState, etc.
│   └── ui/                  # Composants UI de base
├── lib/
│   ├── schemas/             # Schemas Zod (pillar-schemas, etc.)
│   ├── trpc/                # Client tRPC
│   └── types/               # Types partages (advertis-vector, etc.)
└── server/
    ├── mcp/                 # 6 serveurs MCP (intelligence, operations, creative, pulse, guild, seshat)
    ├── services/            # Services metier (advertis-scorer, ingestion-pipeline, etc.)
    └── trpc/
        ├── routers/         # 49 routers tRPC
        └── router.ts        # Router principal
prisma/
├── schema.prisma            # ~2400 lignes, ~80 modeles
├── seed.ts                  # Seed de base
└── seed-demo.ts             # Seed de demo
Documentation/               # Cahier de charges, annexes A-H
```

---

## Portails et roles

| Portail | Route | Role RBAC | Acces |
|---|---|---|---|
| Console | `/console` | FIXER | Admin complet — toutes les divisions |
| Console | `/console` | ASSOCIE | Lecture seule (a venir) |
| Cockpit | `/cockpit` | CLIENT | Dashboard marque, missions, insights |
| Creator | `/creator` | CREATOR | Missions, QC, gains, progression |
| Intake | `/intake` | Public | Formulaire d'onboarding |

---

## Crons

Configures dans `vercel.json` :

| Cron | Frequence | Role |
|---|---|---|
| `/api/cron/scheduler` | Toutes les 5 min | Dispatch de missions, SLA checks |
| `/api/cron/feedback-loop` | Tous les jours 8h | Boucle de feedback, alertes drift |

---

## Modules (42)

Le projet est organise en 42 modules traces dans `.claude/module-registry.json`. Chaque module a :
- Un **score /100** de fidelite au cahier de charges
- Un **statut** (NOT_STARTED → COMPLETE)
- Une **priorite** (P0 bloquant → P5 futur)
- Des **dependances cross-module** trackees

### Modules principaux

| ID | Module | Score | Statut |
|---|---|---|---|
| M01 | ADVE-RTIS Methodology | 85 | FUNCTIONAL |
| M02 | AdvertisVector & Scorer | 70 | FUNCTIONAL |
| M03 | Glory Tools | 75 | FUNCTIONAL |
| M04 | Campaign Manager 360 | 65 | NEEDS_FIX |
| M16 | Quick Intake Engine | 90 | FUNCTIONAL |
| M28 | MCP Creative | 95 | FUNCTIONAL |
| M34 | Console Portal | 90 | FUNCTIONAL |
| M35 | Quick Intake Portal | 92 | FUNCTIONAL |
| M40 | CRM Pipeline | 82 | FUNCTIONAL |

> Score global actuel : **74/100** — en progression continue.

---

## Documentation

Le dossier `Documentation/` contient le cahier de charges complet :

| Document | Contenu |
|---|---|
| `ANNEXE-A-METHODOLOGIE-ADVE.md` | Methodologie ADVE-RTIS complete |
| `ANNEXE-B-GLORY-TOOLS.md` | 39 Glory tools, specs detaillees |
| `ANNEXE-C-CAMPAIGN-MANAGER-360.md` | Campaign Manager, missions, SLA |
| `ANNEXE-D-SYSTEMES-EXISTANTS.md` | Systemes existants a integrer |
| `ANNEXE-E-AUDIT-COMPLETUDE.md` | Audit de completude des modules |
| `LAFUSEE-OS-PART-1-VISION-DATA.md` | Vision, data model, architecture |
| `LAFUSEE-OS-PART-2-API-UI-SYSTEMES.md` | API, UI, systemes |
| `LAFUSEE-OS-PART-3-BUILD-ACCEPTATION.md` | Build, tests, acceptation |

---

## Variables d'environnement

```env
# Base de donnees
DATABASE_URL="postgresql://user:pass@localhost:5432/lafusee"

# Auth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Optionnel
VERCEL_URL=""
```

---

## Contribution

1. Chaque module a un **spec embarque** dans son fichier principal (header commentaire)
2. Les **dependances cross-module** sont documentees dans chaque module + dans `.claude/module-registry.json`
3. Toute modification d'un module doit verifier que les modules dependants restent fonctionnels (`npx tsc --noEmit`)
4. Les scores et statuts sont mis a jour dans le registry apres chaque fix

---

## Licence

Proprietary — LaFusee SARL. Tous droits reserves.

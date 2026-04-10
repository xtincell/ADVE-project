# LaFusee OS `v3.3.0`

**L'Industry OS du marche creatif africain.** Propulse par l'agence **UPgraders**.

> Un brief client arrive en PDF. 48h plus tard, la marque est diagnostiquee, la strategie est ecrite, les missions sont en production, et les freelances livrent.

---

## Le probleme

Aucune structure de classe mondiale ne sert correctement le marche creatif en Afrique francophone.

Les groupes internationaux (Havas, Publicis, WPP) maintiennent des bureaux a Abidjan, Douala, Dakar — des boites aux lettres. Leurs methodologies restent a Paris ou Londres. Le client africain recoit un service de tier 3 au prix du tier 1.

Les agences locales ont du talent, de l'intuition, de la debrouillardise. Mais rien de codifie, rien de reproductible, rien de mesurable. Chaque projet est un artisanat. C'est ce qui empeche le marche de scaler.

Le freelance creatif recoit des briefs vagues, est paye au lance-pierres, n'a aucune visibilite sur sa prochaine mission. Le DA porte la vision creative de 8 clients sans methode formalisee. Le chef de marque jongle entre prestataires qui ne se parlent pas.

## La solution

LaFusee OS **industrialise** la chaine de valeur creative — du brief au livrable, du diagnostic au paiement :

**Un brief entre** → le systeme le scanne, identifie la marque, diagnostique ses forces et faiblesses sur 8 piliers, genere la strategie, cree les missions par livrable, et les dispatche aux bons talents.

**Un operateur supervise** → il ne produit plus, il pilote. L'IA propose, l'humain valide. Chaque decision est tracee, chaque livrable est score, chaque franc depense est justifie.

**Les marques montent en puissance** → de CRITICAL a LEGENDARY, chaque marque a un score sur 200 qui evolue en temps reel. Le client voit son dashboard, comprend ou il en est, et sait exactement ce que son budget produit.

**Les creatifs sont structures** → tier system, matching automatique, QC, paiement. Un freelance a Douala peut livrer un KV pour une marque a Abidjan sans qu'un humain ait fait le dispatch.

---

## Comment ca marche

### 1. Le brief arrive

Un client envoie un PDF. Le systeme extrait tout : marque, contexte, objectifs, cibles, livrables, budget. L'operateur review et confirme en un clic.

### 2. La marque est diagnostiquee

Le **NETERU** — trois intelligences artificielles qui travaillent ensemble — prend le relais :

- **Mestor** decide quoi faire et dans quel ordre (le stratege)
- **Artemis** execute les diagnostics et produit les livrables (le protocole)
- **Seshat** observe le marche et enrichit la connaissance (la memoire)

En 24 frameworks diagnostiques, la marque est radiographiee sur 8 piliers :

| | Pilier | Ce qu'on mesure |
|---|---|---|
| **A** | Authenticite | L'ADN. Qui est cette marque, vraiment ? |
| **D** | Distinction | Ce qui la rend unique face a la concurrence |
| **V** | Valeur | Ce qu'elle apporte concretement au client |
| **E** | Engagement | Sa capacite a creer des fans, pas juste des clients |
| **R** | Risque | Ses vulnerabilites et comment les couvrir |
| **T** | Track | La realite du marche — chiffres, pas opinions |
| **I** | Innovation | Son potentiel inexploite |
| **S** | Strategie | Le plan pour passer de ou elle est a ou elle veut aller |

Score total sur 200. De CRITICAL (< 50) a LEGENDARY (170+).

### 3. La strategie s'ecrit toute seule

91 outils AI specialises — les **Glory Tools** — produisent les livrables : manifeste de marque, brandbook, offre, plan media, direction artistique, scripts TV/radio, KV affichage, plan annuel...

Organises en 31 sequences avec un **skill tree** : les fondations doivent etre posees avant de lancer la production. Pas de KV sans brandbook. Pas de campagne 360 sans strategie.

### 4. Les missions partent en production

Chaque livrable du brief devient une **mission** sur le wall. Les freelances et agences voient les missions disponibles, triees par match avec leur profil. Ils claim, ils livrent, c'est QC, c'est paye.

### 5. Tout est mesure

Chaque franc, chaque heure, chaque livrable, chaque score — tout est trace. Le client voit son cockpit. L'operateur voit sa console. Le createur voit sa progression.

---

## Qui utilise quoi

| Portail | Pour qui | Ce qu'il fait |
|---|---|---|
| **Console** | L'operateur (fixer) | Pilote toute l'industrie — clients, diagnostics, campagnes, missions, talents, revenus |
| **Cockpit** | Le client (marque) | Voit son score, ses piliers, ses livrables, sa strategie. Pas de jargon, que du concret |
| **Creator** | Le freelance/talent | Voit les missions dispo, claim, livre, est evalue, monte en tier |
| **Agency** | L'agence partenaire | Gere ses clients, missions, revenus, contrats via le systeme |
| **Intake** | Le prospect | Remplit un formulaire. L'IA fait le reste |

---

## Ce qui tourne sous le capot

### Architecture NETERU

```
                    ┌─────────────────────────────┐
                    │      MESTOR (Decision)       │
                    │  Hyperviseur + Commandant    │
                    │  Plans, RTIS, Scenarios      │
                    └──────────────┬──────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
    ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
    │    ARTEMIS      │  │    SESHAT       │  │ PILLAR GATEWAY │
    │  24 Frameworks  │  │  Knowledge     │  │   (LOI 1)      │
    │  91 Glory Tools │  │  Tarsis        │  │  Seul point    │
    │  31 Sequences   │  │  References    │  │  d'ecriture    │
    └────────────────┘  └────────────────┘  └────────────────┘
```

- **Mestor** lit l'etat de chaque pilier, construit un plan d'orchestration (deterministe, pas de LLM), et l'execute step-by-step. Le Commandant est le seul a faire des recommandations strategiques via LLM.
- **Artemis** execute. 24 frameworks diagnostiques avec dependances topologiques. 91 outils creatifs organises en 31 sequences. Skill tree avec prerequis.
- **Seshat** observe. Knowledge graph, signaux faibles (Tarsis), enrichissement de references par secteur et marche.
- **Pillar Gateway** — LOI 1 du systeme : toute ecriture sur un pilier passe par ce gateway. Versioning immutable, audit trail, confidence tracking.

### Les 9 divisions de la Console

| Division | Couleur | Ce qu'elle gere |
|---|---|---|
| **L'Oracle** | Or | Clients, diagnostics, ingestion de briefs, boot sequence |
| **Mestor** | Violet profond | Plans d'orchestration, recommandations, insights |
| **Artemis** | Emeraude | Missions, campagnes, Glory tools, Skill Tree, Vault |
| **Seshat** | Bleu | Intelligence marche, signaux, knowledge, Tarsis |
| **L'Arene** | Orange | Guilde de creatifs, matching, organisations |
| **Le Socle** | Vert | Revenus, commissions, contrats, facturation |
| **L'Academie** | Jaune | Formations, certifications, boutique |
| **Config** | Gris | Parametres systeme, bible des variables |
| **Ecosysteme** | — | Operateurs, metriques globales |

### Stack technique

| Composant | Technologie |
|---|---|
| Framework | Next.js 15, App Router, Turbopack |
| Language | TypeScript 5.8 strict |
| API | tRPC v11 + React Query v5 |
| Database | PostgreSQL via Prisma 6 (2600 lignes de schema) |
| Auth | NextAuth v5 (RBAC : FIXER, ASSOCIE, CLIENT, CREATOR, AGENCY) |
| AI | Anthropic Claude API — LLM Gateway central |
| Agents | Model Context Protocol (6 serveurs MCP) |
| UI | Tailwind CSS 4, Lucide Icons, Recharts |
| Tests | Vitest (unit) + Playwright (e2e) |
| Deploy | Vercel (crons integres) |

### Services principaux

| Service | Ce qu'il fait |
|---|---|
| **Brief Ingest** | PDF → ParsedBrief → pipeline NETERU complet |
| **Ingestion Pipeline** | Documents marque → remplissage ADVE par IA |
| **RTIS Protocols** | Cascade Risk → Track → Innovation → Strategy |
| **Campaign Manager 360** | State machine campagne, gates, budget, AARRR |
| **Matching Engine** | Score talent ↔ mission, suggestion top 3 |
| **Sequence Vault** | Staging → review operateur → promotion en asset marque |
| **AdvertisVector Scorer** | Score /200, snapshots, historique, classification |
| **LLM Gateway** | Retry, cost tracking, caller tags — chaque appel IA est trace |
| **Financial Engine** | Unit economics, budget allocator, P&L |

### Chiffres

| Metrique | Valeur |
|---|---|
| Pages/routes | 160 |
| Fichiers TypeScript | 490 |
| Routers tRPC | 66 |
| Modeles Prisma | ~80 |
| Serveurs MCP | 6 |
| Glory Tools | 91 |
| Sequences | 31 |
| Frameworks diagnostiques | 24 |

---

## Demarrage rapide

```bash
git clone https://github.com/xtincell/ADVE-project.git
cd ADVE-project
npm install
cp .env.example .env   # Remplir DATABASE_URL, ANTHROPIC_API_KEY, NEXTAUTH_SECRET
npx prisma migrate dev
npm run dev             # → http://localhost:3000
```

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Cle API Anthropic

### Scripts

| Script | Description |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Build production |
| `npm run test` | Tests unitaires (Vitest) |
| `npm run test:e2e` | Tests E2E (Playwright) |
| `npm run db:push` | Push schema Prisma |
| `npm run db:migrate` | Migration dev |

---

## Structure du projet

```
src/
├── app/
│   ├── (console)/           # Console operateur — 60+ pages, 9 divisions
│   ├── (cockpit)/           # Cockpit client — dashboard marque
│   ├── (creator)/           # Portail createur — missions, QC, gains
│   ├── (agency)/            # Portail agence — clients, revenus
│   ├── (intake)/            # Widget intake public (4 methodes)
│   ├── (auth)/              # Login, register, reset
│   └── api/                 # tRPC, MCP, crons, export, webhooks
├── components/              # 35+ composants partages
├── lib/                     # Types, schemas Zod, client tRPC
└── server/
    ├── services/            # 40+ services (mestor, artemis, seshat, brief-ingest, ...)
    ├── mcp/                 # 6 serveurs MCP
    └── trpc/                # 66 routers
```

---

## Documentation

| Document | Contenu |
|---|---|
| [CHANGELOG.md](./CHANGELOG.md) | Historique des versions (v1.0 → v3.3) |
| `Documentation/ANNEXE-A-METHODOLOGIE-ADVE.md` | Methodologie ADVE-RTIS |
| `Documentation/ANNEXE-B-GLORY-TOOLS.md` | 91 Glory Tools |
| `Documentation/ANNEXE-C-CAMPAIGN-MANAGER-360.md` | Campaign Manager, missions, SLA |
| `Documentation/CDC-V5.md` | Cahier de charges v5 — architecture NETERU |

---

## Versionnage

Format : **`MAJEURE.PHASE.ITERATION`** — voir [CHANGELOG.md](./CHANGELOG.md)

| Version | Date | Jalon |
|---|---|---|
| **v3.3.0** | 2026-04-10 | Brief Ingest Pipeline NETERU-governed |
| v3.2.0 | 2026-04-08 | Artemis Context System + Vault |
| v3.1.0 | 2026-04-04 | Architecture NETERU |
| v3.0.0 | 2026-03-31 | Bible ADVERTIS 134 variables |
| v2.5.0 | 2026-03-25 | Glory 91 tools, 31 sequences |
| v2.0.0 | 2026-02-20 | 3 portails operationnels |
| v1.0.0 | 2026-01-25 | Foundation |

---

## Licence

Proprietary — LaFusee SARL. Tous droits reserves.

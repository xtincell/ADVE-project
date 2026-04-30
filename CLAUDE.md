# La Fusée — Project Memory

This file is auto-loaded by Claude Code (local CLI, GitHub Action, claude.ai/code). It briefs any agent picking up work on this repo.

## ⚠️ PROTOCOLE EXPERT — À LIRE AVANT TOUTE MISE À JOUR

**[docs/governance/EXPERT-PROTOCOL.md](docs/governance/EXPERT-PROTOCOL.md)** — protocole rigoureux en 8 phases (Phase 0 check préventif → Phase 7 commit/push) à exécuter à la lettre. Pas du bon sens, du protocole. Inclut checklist condensée + exemple type.

**Avant d'ajouter un model Prisma, un service, un router, une page, un Glory tool, une séquence ou un Intent kind** :

1. **GREP [docs/governance/CODE-MAP.md](docs/governance/CODE-MAP.md)** avec mots-clés synonymes (auto-généré pre-commit, contient table "mot du métier" ↔ "entité dans le code")
2. **Si entité similaire existe → étendre, ne PAS doubler.** Doublons identifiés : `SuperAsset` doublait `BrandAsset` ; `/cockpit/forges` doublait `/cockpit/operate/*`.
3. **Si nouveau besoin justifié → ADR obligatoire** dans `docs/governance/adr/` avec justification "pourquoi pas extension".
4. **Synonymes critiques** (cf. CODE-MAP table complète) :
   - "vault de marque" / "asset rangé" → `BrandAsset` (Phase 10, ADR-0012)
   - "SuperAsset" / "actif intellectuel raffiné" → `BrandAsset.kind=BIG_IDEA/CREATIVE_BRIEF/MANIFESTO/...`
   - "asset forgé" / "image générée" → `AssetVersion` (Phase 9 Ptah) + `BrandAsset` matériel promu
   - "big idea active" → `Campaign.activeBigIdeaId` → `BrandAsset (kind=BIG_IDEA, state=ACTIVE)`
   - "brief créatif" → `BrandAsset.kind=CREATIVE_BRIEF` + `CampaignBrief` pointer business

**CODE-MAP régénéré pre-commit via husky** dès qu'une entité structurelle est modifiée. Si modifié manuellement, ré-exécuter `npx tsx scripts/gen-code-map.ts`.

## Mission (north star — read [docs/governance/MISSION.md](docs/governance/MISSION.md) before any non-trivial work)

**La Fusée transforme des marques en icônes culturelles, en industrialisant l'accumulation de superfans qui font basculer la fenêtre d'Overton dans leur secteur.**

Tout le reste — l'OS, les Neteru, l'Oracle, les Glory tools, ADVERTIS, APOGEE, les 4 portails, les manifests, NSP — n'existe que pour servir cette phrase. Quand un module ne contribue pas (directement ou via une chaîne explicite) à cette mécanique, il dérive — voir [MISSION.md §4](docs/governance/MISSION.md) pour le drift test et §8 pour la procédure d'auto-correction.

**Les deux mécanismes pivots ne sont pas des KPIs** :
- **Superfans** = masse stratégique (ambassadeurs + évangélistes) qui produit du travail organique pour la marque, pas un compteur de visiteurs.
- **Overton** = axe culturel sectoriel ; quand la marque le déplace, le secteur se redéfinit autour d'elle.

## Product identity (non-negotiable)

**La Fusée = Industry OS** for the African creative market. Built and operated by **UPgraders** (the agency / fixer). Never call it "LaFusee OS" or "platform" — it is an *Industry OS*, codé comme tel.

Vision: transform brands into cult / cultural phenomena via accumulation of superfans who shift the Overton window. The OS embodies the **ADVE/RTIS** method — cascade A→D→V→E→R→T→I→S where I=Innovation, S=Strategy.

Four portals: **Console** (UPgraders/Fixer), **Agency** (partner network), **Creator** (freelancers), **Cockpit** (founder brands). Plus a public **Intake** route group.

The flagship deliverable is the **Oracle** — a dynamic, modular consulting document (21 sections, 5 phases) that auto-updates. It is the *output*, not the engine.

## Governance — NETERU (read before touching backend)

The OS is governed by **5 Neteru actifs + 2 pré-réservés** (plafond APOGEE = 7). Source unique de vérité narrative : [docs/governance/PANTHEON.md](docs/governance/PANTHEON.md).

**Actifs** :
- **Mestor** — Guidance, Intent dispatcher unique (`src/server/services/mestor/`)
- **Artemis** — Propulsion (phase brief), Glory tools rédactionnels (`src/server/services/artemis/`)
- **Seshat** — Telemetry + Tarsis weak signals — sub-component, pas un Neter (`src/server/services/seshat/`)
- **Thot** — Sustainment + Operations, fuel/budget (`src/server/services/financial-brain/`)
- **Ptah** — Propulsion (phase forge), matérialisation des briefs Artemis en assets concrets via providers externes (Magnific, Adobe Firefly, Figma, Canva). Activation Phase 9, voir [ADR-0009](docs/governance/adr/0009-neter-ptah-forge.md). Service : `src/server/services/ptah/` (à créer).

**Pré-réservés** (slots canoniques figés, implémentation différée) :
- **Imhotep** — Crew Programs (Phase 7+), [ADR-0010](docs/governance/adr/0010-neter-imhotep-crew.md)
- **Anubis** — Comms (Phase 8+), [ADR-0011](docs/governance/adr/0011-neter-anubis-comms.md)

**Cascade Glory→Brief→Forge** : Mestor décide → Artemis produit le brief (Glory tool) → Ptah matérialise l'asset → Seshat observe → Thot facture. Séquence stricte (Loi 2 séquencement étages).

**Rule**: every business mutation must traverse `mestor.emitIntent()` (`src/server/services/mestor/intents.ts:179`). Direct service-from-router calls are bypass and will be lint-rejected once Phase 0 of the refonte ships.

**Manipulation Matrix** : paramètre transverse à 4 modes (peddler / dealer / facilitator / entertainer) qui décrit *comment* la brand transforme l'audience en propellant. Déclaré dans `Strategy.manipulationMix`, contrôlé par chaque forge via `GenerativeTask.manipulationMode`. Mestor pre-flight `MANIPULATION_COHERENCE` gate refuse les Intents qui sortent du mix stratégique. Source : [MANIPULATION-MATRIX.md](docs/governance/MANIPULATION-MATRIX.md).

**Sources de vérité synchronisées** (anti-drift CI `neteru-coherence.test.ts`) :
- `BRAINS` const ([src/server/governance/manifest.ts:23](src/server/governance/manifest.ts))
- `Governor` type ([src/domain/intent-progress.ts:29](src/domain/intent-progress.ts))
- [LEXICON.md](docs/governance/LEXICON.md) entrée NETERU
- [APOGEE.md](docs/governance/APOGEE.md) §4 mapping sous-systèmes
- [PANTHEON.md](docs/governance/PANTHEON.md) — récit complet
- ce fichier CLAUDE.md

## Framework — APOGEE

The OS is built on the **APOGEE** framework — see [docs/governance/APOGEE.md](docs/governance/APOGEE.md). APOGEE is the propulsion+guidance architecture that pilots brands from **ZOMBIE** (ground — barely existing) through 6 tiers (FRAGILE → ORDINAIRE → FORTE → CULTE) up to **ICONE** (apex — sector reference, patrimony, Overton shifted, superfans in stable orbit). Note: CULTE is when the cult is formed; ICONE is when the cult crystallizes into icon status.

Three Laws of Trajectory: (1) Conservation of altitude (no silent regression — hash-chained intent log), (2) Stage sequencing (cascade A→D→V→E→R→T→I→S unidirectional unless explicit re-entry), (3) Fuel conservation (Thot tracks propellant, refuses combustions that would flame-out the mission).

**8 sub-systems** (4 Mission Tier + 4 Ground Tier). **Mission** : Propulsion (Artemis briefs + Ptah forge + Glory tools + sequences + superfans), Guidance (Mestor, manifests, pre-conditions, ADVERTIS rules), Telemetry (Seshat, Tarsis, NSP, scores, IntentEmission), Sustainment (Thot, cost gate, SLOs, post-conditions). **Ground** : Operations (Thot extension — finances, mobile-money), Crew Programs (Imhotep — talent, formation), Comms (Anubis — messaging, ad networks), Console/Admin (INFRASTRUCTURE — config, ecosystem).

Three decks: **Mission Control** (Console/UPgraders), **Cockpit** (founders), **Crew Quarters** (Agency/Creator). Plus the **Launchpad** (public Intake).

Decision rationale in [ADR-0001](docs/governance/adr/0001-framework-name-apogee.md). The previous candidate name MAAT is deprecated.

## Active refactor — read this before any non-trivial change

A multi-phase governance refonte is in flight. Read [docs/governance/REFONTE-PLAN.md](docs/governance/REFONTE-PLAN.md) — it is the source of truth for current architectural direction.

Refactor Code of Conduct (Phase 0, mandatory):
- Every PR is labeled `phase/0`...`phase/9` (`phase/9` = Ptah Forge sub-phases A→K) or `out-of-scope`.
- `out-of-scope` requires written justification and tech-lead approval.
- Zero new bypass governance allowed. New features that need Mestor go through Mestor in the same PR.
- Zero new `* 2/` numbered duplicate folders.
- Feature freeze partial through Phase 5.

## Deeper context

For semantic project context (pillar semantics, philosophy, Mestor swarm details, Console levels, LLM architecture decisions, the 9 stub routers from the Windows machine), see [docs/governance/context/MEMORY.md](docs/governance/context/MEMORY.md) and the files it indexes.

## Stack

Next.js 15 + React 19 + TypeScript 5.8 + Tailwind 4 + tRPC 11 + Prisma 6 (PostgreSQL) + NextAuth v5. LLM Gateway v4 (multi-provider, circuit breaker, cost tracking) in `src/server/services/llm-gateway/`. Hybrid RAG + multi-provider embeddings (Ollama → OpenAI → no-op) since V5.2.

## Conventions (already enforced or in flight via refonte)

- Layering strict (will be enforced via `eslint-plugin-boundaries` + `madge --circular` in Phase 0):
  ```
  domain → lib → server/governance → server/services → server/trpc → components/neteru → app
  ```
- Pillar enum `["A","D","V","E","R","T","I","S"]` is being centralized in `src/domain/pillars.ts` (Phase 1). Do not hardcode.
- Conventional Commits enforced via commitlint (Phase 0).
- Migrations Prisma versionnées (`prisma migrate dev`) — pas de `db push` (Phase 5).

## Tone

User prefers terse, direct responses. No trailing recaps of completed work. Code over commentary. Production-quality only — no half-finished implementations, no scaffolding for hypothetical futures.

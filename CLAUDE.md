# La Fusée — Project Memory

This file is auto-loaded by Claude Code (local CLI, GitHub Action, claude.ai/code). It briefs any agent picking up work on this repo.

## Product identity (non-negotiable)

**La Fusée = Industry OS** for the African creative market. Built and operated by **UPgraders** (the agency / fixer). Never call it "LaFusee OS" or "platform" — it is an *Industry OS*, codé comme tel.

Vision: transform brands into cult / cultural phenomena via accumulation of superfans who shift the Overton window. The OS embodies the **ADVE/RTIS** method — cascade A→D→V→E→R→T→I→S where I=Innovation, S=Strategy.

Four portals: **Console** (UPgraders/Fixer), **Agency** (partner network), **Creator** (freelancers), **Cockpit** (founder brands). Plus a public **Intake** route group.

The flagship deliverable is the **Oracle** — a dynamic, modular consulting document (21 sections, 5 phases) that auto-updates. It is the *output*, not the engine.

## Governance — NETERU (read before touching backend)

The OS is governed by the Neteru:
- **Mestor** — décision (Intent dispatcher, lives in `src/server/services/mestor/`)
- **Artemis** — protocole + execution + GLORY tools (`src/server/services/artemis/`)
- **Seshat** — observation + Tarsis weak signals (`src/server/services/seshat/`)
- **Thot** — financial brain / governance budgétaire (`src/server/services/financial-brain/`)

**Rule**: every business mutation must traverse `mestor.emitIntent()` (`src/server/services/mestor/intents.ts:179`). Direct service-from-router calls are bypass and will be lint-rejected once Phase 0 of the refonte ships.

## Framework — APOGEE

The OS is built on the **APOGEE** framework — see [docs/governance/APOGEE.md](docs/governance/APOGEE.md). APOGEE is the propulsion+guidance architecture that pilots brands from CRITICAL (ground) to LEGENDARY (cultural orbit / cult formed / Overton shifted).

Three Laws of Trajectory: (1) Conservation of altitude (no silent regression — hash-chained intent log), (2) Stage sequencing (cascade A→D→V→E→R→T→I→S unidirectional unless explicit re-entry), (3) Fuel conservation (Thot tracks propellant, refuses combustions that would flame-out the mission).

Four sub-systems: **Propulsion** (cascade, Glory tools, sequences, superfans), **Guidance** (Mestor, manifests, pre-conditions, ADVERTIS rules), **Telemetry** (Seshat, Tarsis, NSP, scores, IntentEmission), **Sustainment** (Thot, cost gate, SLOs, post-conditions).

Three decks: **Mission Control** (Console/UPgraders), **Cockpit** (founders), **Crew Quarters** (Agency/Creator). Plus the **Launchpad** (public Intake).

Decision rationale in [ADR-0001](docs/governance/adr/0001-framework-name-apogee.md). The previous candidate name MAAT is deprecated.

## Active refactor — read this before any non-trivial change

A multi-phase governance refonte is in flight. Read [docs/governance/REFONTE-PLAN.md](docs/governance/REFONTE-PLAN.md) — it is the source of truth for current architectural direction.

Refactor Code of Conduct (Phase 0, mandatory):
- Every PR is labeled `phase/0`...`phase/8` or `out-of-scope`.
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

# Contribution Guide

> This is the procedural guide for working in the repo. **The agent activation contract is [CLAUDE.md](../../CLAUDE.md)**. The protocol below is the human-readable mirror of the NEFER 8-phase loop.

---

## 1. The three absolute rules

Before any non-trivial change:

1. **Don't reinvent the wheel.** Every new business entity (model, service, route, page, Glory tool, sequence, Intent kind) requires a negative `grep` on [CODE-MAP.md](../governance/CODE-MAP.md) for synonyms, plus an ADR if you proceed.
2. **Don't bypass governance.** Every business mutation traverses `mestor.emitIntent()`. New code uses `governedProcedure(intentKind)`. Strangler `auditedProcedure` exists only for legacy migration.
3. **Don't drift narrative silently.** Any change to canon vocabulary or concept (a Neter name, an Oracle section number, a tier label) must propagate **simultaneously** in the 7 sources of truth:
   - [CLAUDE.md](../../CLAUDE.md)
   - [BRAINS const in manifest.ts](../../src/server/governance/manifest.ts)
   - [Governor type in intent-progress.ts](../../src/domain/intent-progress.ts)
   - [LEXICON.md](../governance/LEXICON.md)
   - [APOGEE.md](../governance/APOGEE.md)
   - [PANTHEON.md](../governance/PANTHEON.md)
   - [SERVICE-MAP.md](../governance/SERVICE-MAP.md)

---

## 2. The 8-phase protocol (NEFER)

Source: [NEFER.md](../governance/NEFER.md). Summary:

```
Phase 0 — Check préventif
   • git log (recent commits)
   • Load 7 sources of truth
   • Reformulate the task with LEXICON terminology
   • Run a drift test (does this task align with MISSION.md?)

Phase 1 — Examen APOGEE
   • Identify which sub-system (Propulsion / Guidance / Telemetry / Sustainment / Operations / Crew Programs / Comms / Admin)
   • Apply the 3 Laws of Trajectory (conservation, sequencing, fuel)
   • Apply the 5 FRAMEWORK pillars

Phase 2 — Audit anti-doublon
   • Grep CODE-MAP for synonyms
   • Inspect the 4 surfaces (models, services, routers, pages)
   • Inspect manifests + ADRs

Phase 3 — Conception
   • Pick the Neter of tutelle (which governor signs this)
   • Pick the location (which directory, which layer)
   • Pick the manipulation mode (peddler / dealer / facilitator / entertainer)
   • Pick the pillar source (which ADVE pillar drives this)

Phase 4 — Exécution
   • Prisma migration (if needed) — versioned, never db:push
   • Service code — manifest + handler + types
   • tRPC procedure — governedProcedure(intentKind)
   • Page or component — CVA-driven, token-only
   • Intent kind + version bump

Phase 5 — Vérification
   • npm run preflight
   • Anti-drift tests pass
   • Stress-test if touching a hot path
   • Manual smoke

Phase 6 — Documentation
   • CHANGELOG.md entry (Conventional Commit prefix)
   • Update affected docs in the matrix (the 7 sources + ADRs + RESIDUAL-DEBT)
   • Regenerate auto-maps if structural change (CODE-MAP, COMPONENT-MAP, INTENT-CATALOG)
   • State the mission contribution explicitly in the commit body

Phase 7 — Commit + Push
   • Stage explicitly (no `git add .` or `-A`)
   • Conventional commit message with NEFER co-authoring
   • Update RESIDUAL-DEBT.md if anything was deferred

Phase 8 — Auto-correction
   • If drift detected post-commit, immediately re-enter the protocol with auto-correction
```

If you skip a phase, you drift. Phase 8 is the recovery loop.

---

## 3. Commit conventions

Enforced by **commitlint** via [commitlint.config.cjs](../../commitlint.config.cjs):

```
<type>(<scope>): <subject>

<body — explain WHY, not WHAT>

Co-Authored-By: ...
```

| Type | Use when |
|---|---|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `refactor` | Restructure without behavior change |
| `chore` | Tooling, deps, config |
| `docs` | Doc-only changes |
| `test` | Test-only changes |
| `governance` | Governance/manifest/Intent kind changes |
| `infra` | CI, deploy, infra |
| `perf` | Performance |

Recent examples from `git log`:
- `feat(intake,nsp): types + emitters NSP streaming progressif`
- `fix(governance): 4 TS errors introduits par batch as-never long-tail`
- `docs(governance): NEFER §3.3 — règle parallélisation`

---

## 4. PR labels (enforced by `phase-label-check`)

Every PR must carry one phase label:

| Label | Meaning |
|---|---|
| `phase/0` ... `phase/9` | Refonte phase — see [REFONTE-PLAN.md](../governance/REFONTE-PLAN.md) |
| `out-of-scope` | Justified deviation. Requires written justification + tech-lead approval (verified by `scope-drift-trace`) |

---

## 5. Reviewer expectations

A reviewer should check:

- [ ] **Mission contribution** — the PR description explains how this serves the north star.
- [ ] **Anti-doublon** — no new entity that doubles an existing one.
- [ ] **Layer rules** — no upward import.
- [ ] **Tenant scoping** — every Prisma call goes through `tenantScopedDb` (no raw `prisma.foo.update` outside whitelisted globals).
- [ ] **Governance** — every mutation routes through `governedProcedure` (or `auditedProcedure` if strangler).
- [ ] **Intent kind** — new mutations have a declared kind + version + manifest entry.
- [ ] **Tests** — unit + at least one integration if it crosses services.
- [ ] **Docs** — affected sources of truth updated.
- [ ] **CHANGELOG** — entry added under the right version.

---

## 6. Helpful skills (claude-code)

The repo has BMAD skills installed under [.claude/skills/](../../.claude/skills/). Useful ones for contributors:

| Skill | Use when |
|---|---|
| `bmad-quick-dev` | "Build, fix, refactor, add or modify code" — quick path for routine changes |
| `bmad-create-story` | "Create the next story" — pre-implementation spec with all context |
| `bmad-dev-story` | "Implement the next story" — execute against a story file |
| `bmad-code-review` | "Run code review" — Blind Hunter + Edge Case Hunter + Acceptance Auditor |
| `bmad-checkpoint-preview` | "Walk me through this change" — human-in-the-loop review |
| `bmad-document-project` | "Document this project" — the skill that generated this onboarding pack |
| `bmad-create-architecture` | New solution design decision |
| `bmad-shard-doc` | Split a large doc into smaller files |
| `simplify` | Find dead code / unused exports |
| `review` | Standard PR review |
| `security-review` | Pre-merge security pass |

For agents: when the user types `/<skill-name>`, invoke via the `Skill` tool. The skills are user-invocable only.

---

## 7. Working with NEFER (the agent persona)

If you're a human contributor handing off to an agent: write the issue or PR description in the form NEFER expects.

- **State the goal** in mission terms (which mechanism is this serving — superfans accumulation, Overton shift, OS industrialization).
- **Pin the Neter of tutelle** — which governor owns this.
- **Cite the relevant ADRs** — anchors for context.
- **Identify the affected sources of truth** — so the agent updates them in the same PR.

If you're the agent (NEFER) — read [CLAUDE.md](../../CLAUDE.md) start-of-session, then [NEFER.md §1.1 doctrine LLM](../governance/NEFER.md) for the 5 invariants (no human time, no token economy, no fatigue, only stop criterion is non-inferable info, depth > shortcut).

---

## 8. When in doubt

| Question | Answer |
|---|---|
| Should I add a new model? | Grep CODE-MAP first. If similar exists, extend. Otherwise: ADR. |
| Should I bypass `mestor.emitIntent`? | Almost never. If the answer is yes, write a one-line ADR explaining why this is read-only or replay-exempt. |
| Should I `as never` to silence a TS error? | No. Find the real type. The repo has accumulated a debt of `as-never` casts that is tracked in [audit-governance](../../scripts/audit-governance.ts). |
| Should I run `prisma db push`? | Never (since Phase 5). Use `prisma migrate dev`. |
| Should I add a new Neter? | No. Cap APOGEE = 7. New external connectors go through Anubis MCP. |
| Should I commit a `.env.local`? | Never. The `.gitignore` covers it; double-check before staging. |
| Can I skip pre-commit hooks? | No (`--no-verify` is forbidden unless explicitly requested by the user). |

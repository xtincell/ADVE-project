# NEFER Commit Protocol — Loaded into `on_complete` of code-touching workflows

> When a BMad workflow reaches its terminal step (PRD finalized, story shipped,
> architecture handed off), execute this protocol **before** declaring done.
> Skipping any step here is what creates the drift NEFER §3 forbids.

## P1 — Conventional Commits (enforced by commitlint)

Every commit follows:

```
<type>(<scope>): <subject — imperative, <72 chars, lowercase first letter>

<body — what changed and WHY, not how>

<footers>
```

**Allowed types** (any deviation → commit rejected):

| Type        | Use                                                         |
|-------------|-------------------------------------------------------------|
| `feat`      | New user-facing capability                                  |
| `fix`       | Bug fix                                                     |
| `refactor`  | Internal restructuring, no behavior change                  |
| `perf`      | Performance improvement                                     |
| `docs`      | Documentation only                                          |
| `test`      | Test addition or correction                                 |
| `chore`     | Tooling, deps, infra (no code/doc change)                   |
| `governance`| ADR, manifest, NEFER protocol, 7-sources sync               |
| `phase`     | Phase milestone (rare — reserved for ADR-marked closures)   |

**Allowed scopes** correspond to sub-systems: `mestor`, `artemis`, `seshat`,
`thot`, `ptah`, `imhotep`, `anubis`, `oracle`, `apogee`, `governance`,
`design-system`, `intake`, `cockpit`, `console`, `agency`, `creator`, `nsp`,
`campaign`, `brand-tree`, `phase-N` (where N is the active phase).

**Body** must contain a one-sentence motivation paragraph: *why* this change
matters to the mission (superfans × Overton). If you can't write that
sentence, the change probably shouldn't ship.

## P2 — Phase label on PR

Add label `phase/0`…`phase/9` (or `phase/16`/`phase/17a`/`phase/17b`/
`phase/18`/`phase/19`/`phase/21`/etc. — see CLAUDE.md "Phase status" for
active phases). Label `out-of-scope` requires written justification +
tech-lead approval per refactor Code of Conduct.

## P3 — Update RESIDUAL-DEBT if anything is deferred

If the workflow shipped a *partial* implementation, residuals must land in
[docs/governance/RESIDUAL-DEBT.md](docs/governance/RESIDUAL-DEBT.md) under
the active phase section, with:

- **What** is deferred (specific files, behaviors, tests)
- **Why** (calendar-locked rationale — not "out of time")
- **When** (target date or trigger — "after 1mo stress-test", "post-30d prod")
- **Where to resume** (file paths, residual model entry, NEFER memory pointer)

"We'll fix it later" without these four fields = drift (NEFER §3 violation).

## P4 — Propagate to the 7 sources of truth

If the change touched any of these axes, **all relevant sources must be
updated in the same PR**:

| Axis touched              | Sources to update                                              |
|---------------------------|----------------------------------------------------------------|
| Neter / sub-system        | `BRAINS` const + `Governor` type + LEXICON + APOGEE + PANTHEON + CODE-MAP + CLAUDE.md |
| Canonical concept         | LEXICON + CODE-MAP + the canonical service file + docs/        |
| New ADR                   | `docs/governance/adr/00XX-*.md` + LEXICON cross-ref + CLAUDE.md "Phase status" |
| Prisma schema             | migration via `prisma migrate dev` + CODE-MAP regen + types regenerated |
| Glory tool / sequence     | manifest + CODE-MAP + LEXICON if new vocabulary                |
| Pillar logic              | `src/domain/pillars.ts` + variable-bible if editable fields    |

The anti-drift CI test `neteru-coherence.test.ts` blocks PRs that break this.

## P5 — Tests state explicit

State explicitly in the commit body or PR description:

```
Tests:
- Anti-drift: <N tests passing in <mode>: soft/hard>
- Unit: <which suites ran>
- Integration: <if applicable>
- E2E: <if applicable>
- New tests added: <list>
- Mode baseline updated: <if applicable, justify>
```

A change that flips an anti-drift test from HARD to SOFT requires an ADR
justifying the regression window.

## P6 — CHANGELOG entry (if user-visible or governance)

For any `feat` / `fix` / `governance` / `phase` commit, add an entry to
[docs/governance/CHANGELOG.md](docs/governance/CHANGELOG.md) under the
current version. Version bumps follow semver but pre-1.0 → 0.X.Y where X
increments on phase closures, Y on feature/fix commits.

## P7 — APOGEE cap check (only for Neter / sub-system changes)

If the change touches a Neter or proposes a new sub-system: confirm the
APOGEE cap of **7 Neteru** is preserved. Adding an 8th Neter requires
an ADR that explicitly supersedes the cap decision — and that has not
yet been approved.

## P8 — Co-author footer

Add to commit footer (do not skip — this is the user's traceability convention):

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

Use the canonical Co-Authored-By that matches the active Claude model the
operator session is running on, per the user's convention.

## Final gate

If P1–P8 cannot all be ticked, **do not declare the workflow done.**
Surface what's blocking and let the user decide whether to defer
(then update RESIDUAL-DEBT) or fix (then re-run the gate).

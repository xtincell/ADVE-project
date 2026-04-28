# Refactor Code of Conduct — La Fusée Refonte

This document is the **non-negotiable** contract that every PR opened during
the refonte (Phases 0 → 8) must respect. It exists to prevent the
*wild-plant pattern* — features added during the audit that re-create the
governance debt the refonte is paid to remove.

Effective from 2026-04-28 until end of Phase 5 (full Phase 8 for some
clauses, see below).

## 1. Phase labels are mandatory

Every PR carries **exactly one** of these labels:

- `phase/0` — fundations, filets, code-of-conduct itself
- `phase/1` — domain SSOT (`src/domain/`)
- `phase/2` — manifests + registry (incl. Glory tools, plugin contract)
- `phase/3` — bus + intent dispatcher v2 (incl. hash-chain audit, tenant hardening, intake → strategy)
- `phase/4` — scoreObject wrapper + layering enforcement
- `phase/5` — NSP + Neteru UI Kit (incl. multi-LLM routing, CRDT, offline-first)
- `phase/6` — E2E filets + governance regression (incl. SLOs, chaos, runbooks)
- `phase/7` — Oracle exports + landing/README + UI debt
- `phase/8` — hardening, docs, observability, SDK
- `out-of-scope` — anything that does not advance a phase

PRs without a phase label fail CI (`phase-label-check` job).

## 2. `out-of-scope` requires written justification

If a fix genuinely cannot wait for its phase:

1. The PR description includes a section titled **"Justification — out-of-scope"**.
2. Tech-lead approval is recorded in a PR comment (no auto-approval, no
   self-approval).
3. The PR adds **one line** to `docs/governance/scope-drift.md`
   (auto-checked by CI).

The number of `out-of-scope` merges is a tracked metric. The refonte
considers itself failing if it exceeds **2 / week**.

## 3. Zero new bypass governance

A PR may not introduce a new code path that *should* go through Mestor and
does not. If a feature urgently needs Mestor and Mestor is not yet ready
for that intent kind, the PR adds the intent kind to Mestor **in the same
PR** — even rudimentary handler. Bypassing is **never** the path of least
resistance during the refonte.

Enforced by:

- ESLint rule `lafusee/no-direct-service-from-router` (warn → error end of Phase 3).
- AST audit `scripts/audit-governance.ts` in CI.

## 4. Zero new numbered duplicate folders

`landing 2/`, `notoria 2/`, etc. were the symptom of branchless
parallel-edits in 2025. They are now banned, period.

Enforced by ESLint rule `lafusee/no-numbered-duplicates` (active in
Phase 0).

## 5. Feature freeze (partial)

From 2026-04-28 to the end of Phase 5:

- **Frozen**: net-new features in Console, Agency, Creator portals.
- **Frozen**: net-new GLORY tools (existing 91 are inventoried in P2).
- **Frozen**: schema changes that are not migrations of existing tables.
- **Allowed**: bug fixes, governance work, the Phases themselves.
- **Allowed by exception**: a paying customer is blocked → tech lead can
  unfreeze a single line item with an `out-of-scope` PR.

Phases 6 → 8 progressively re-open feature work, in this order:
SLOs/observability first (P6), Oracle exports + landing (P7), SDK + plugins (P8).

## 6. Conventional Commits

All commits — including merges — follow Conventional Commits 1.0:

```
<type>(<scope>): <subject>

[body]

[footer]
```

Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `ci`, `chore`,
`build`, `revert`, `governance`. Scopes: `domain`, `mestor`, `artemis`,
`seshat`, `thot`, `oracle`, `nsp`, `ui`, `intake`, `cockpit`, `console`,
`agency`, `creator`, or a service slug.

Enforced by `commitlint` (Husky hook).

## 7. Pre-commit checks (Husky)

`.husky/pre-commit` runs:

1. `commitlint` on the staged commit message.
2. Phase label sanity (warn-only locally; CI enforces).

`.husky/pre-push` (optional) runs `npm run preflight:quick`.

## 8. Trunk-based, PRs ≤ 600 lines

No long-lived feature branches. Phase 3's dual-write strategy explicitly
relies on the ability to ship + revert quickly. PRs above 600 lines net
diff (excluding generated files) require tech-lead pre-review of the plan
*before* code is written.

## 9. Memory and docs

When a phase ships, update:

- `docs/governance/baseline-2026-04.md` — metrics table, mark
  improvements.
- `CLAUDE.md` — only if a convention changed and agents/contributors must
  be retrained.
- `docs/governance/REFONTE-PLAN.md` — add a "✅ shipped on YYYY-MM-DD"
  marker at the top of the relevant phase block.

## Enforcement summary

| Rule | Locally | In CI |
|---|---|---|
| Phase label present | warn | required-check fail |
| `out-of-scope` justification | n/a | grep PR body + scope-drift.md updated |
| `no-direct-service-from-router` | warn (P0) → error (end P3) | matching |
| `no-numbered-duplicates` | error from P0 | error |
| `no-hardcoded-pillar-enum` | warn (P0) → error (end P1) | matching |
| Conventional Commits | commit blocked | commitlint job |
| Madge cycles | warn | exit non-zero from end P4 |
| Schema vs migrations diff | warn | required from P6 |

## Sign-off

By merging a PR during the refonte you accept this Code of Conduct. If you
disagree with a clause, open an `out-of-scope` PR that revises this file
*before* the work it would block.

# Scope Drift Log

One line per PR labeled `out-of-scope` during the refonte. Format:

```
YYYY-MM-DD | #PR | <author> | <one-line reason> | <approver>
```

If you are merging an `out-of-scope` PR, you must add a row here in the
same PR. CI checks for the presence of the new line.

The refonte fails its discipline target if this file grows by more than
**2 lines per week** during Phases 0 → 5.

---

<!-- entries below this line -->

| 2026-05-02 | #39 | feat(brand-portal) RAG sources + filtreur qualifiant | NEFER (batch merge) | Extension fonctionnelle post-Phase 15 — pas de nouveau Neter, pas de nouveau model Prisma, pas de bypass governance. ADR-0027 (renuméroté post-merge — collision 0023 avec OPERATOR_AMEND_PILLAR). Cf. Justification dans body PR. |
| 2026-05-07 | #79 | fix(governance) NEFER fine-review CI 3 erreurs + 3 anti-récidives | NEFER (auto) | Tooling CI + tests pré-existants (vault-matcher/resolver bugs depuis 0fe1407). Cap APOGEE 7/7 préservé, aucun Neter, aucun model Prisma. Anti-récidives = ESLint rule lafusee/no-vi-mock-toplevel-var + PR template + NEFER.md Phase 7.2/7.4. |

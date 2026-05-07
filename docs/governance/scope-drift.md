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
| 2026-05-07 | #80 | feat(seshat) market research console + structured ingest manual-first | NEFER (auto) | Étend ADR-0037 PR-I (Phase 17 country-scoped KB) avec voie manual-first parity ADR-0060 sur 3 axes : (1) template canonique `structured-market-study/v1` + parser déterministe ; (2) page Console `/console/seshat/market-research` avec recherche LLM-ancrée sur sources URL fournies par l'opérateur (anti-SSRF + anti-fab triple-couche) ; (3) export PDF via jsPDF + persistance `KnowledgeEntry` cross-marques via indexes (countryCode, sector) existants. **0 nouveau Neter** (Cap APOGEE 7/7), **0 model Prisma**, **1 Intent kind** (`RUN_MARKET_RESEARCH` ≠ `INGEST_MARKET_STUDY` distinct par responsabilité — orchestre recherche vs persiste upload). Web search natif tool-use bloqué par absence intégration LLM gateway → opérateur fournit URLs explicites (mode mémoire-modèle warning UI). Embeddings RAG cross-brand reportés (résidu Phase 20). Le label `phase/17` n'existe pas dans le repo. |

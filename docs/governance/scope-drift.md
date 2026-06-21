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
| 2026-05-07 | #80 | feat(artemis,seshat) market research console + structured ingest + NEFER §3 doctrine + Glory tool wrapper | NEFER (auto) | Étend ADR-0037 PR-I (Phase 17 country-scoped KB) avec voie manual-first parity ADR-0060 + corrections doctrinales rétroactives v6.20.1 : **(1)** template canonique `structured-market-study/v1` + parser déterministe ; **(2)** page Console `/console/seshat/market-research` avec recherche LLM-ancrée sources URL (anti-SSRF + anti-fab triple-couche) ; **(3)** export PDF jsPDF + persistance `KnowledgeEntry` cross-marques ; **(4)** **service déplacé `seshat/market-research/` → `artemis/market-research/`** (NEFER §3.2 : actions/séquences = Artemis governance) ; **(5)** **Glory tool wrapper `market-research-runner`** dans EXTENDED registry (NEFER §3.1 : Glory tools = primary API surface, pattern wrap-service-via-Intent identique Phase 14 Imhotep) ; **(6)** **doctrine NEFER §3 enrichie** : interdit #1 en 2 passes (Glory tools first + grep CODE-MAP), §3.1 pre-check Glory tools, §3.2 mapping Neter ↔ responsabilité. **0 nouveau Neter** (Cap APOGEE 7/7), **0 model Prisma**, **1 Intent kind** (`RUN_MARKET_RESEARCH`), **1 Glory tool EXTENDED** (cardinalité CORE 56 préservée). Web search natif tool-use bloqué par absence intégration LLM gateway. Embeddings RAG cross-brand reportés (résidu Phase 20). Promotion à GlorySequence first-class reportée (résidu Phase 21). Label `phase/17` n'existe pas dans le repo. |
| 2026-06-21 | #278 | fix(governance) green two pre-existing vitest failures on main (writePillar allowlist line-drift + tarsis signal-type stale mock) | NEFER (auto) — opérateur | Dette de test pré-existante sur `main`, hors phases 0–9 (même nature que #79). **Test-only** : 0 code de production touché, 0 nouveau Neter, 0 model Prisma, 0 bypass. Greene la CI de `main`. Cf. Justification — out-of-scope dans le body PR. |
| 2026-06-21 | #280 | fix(ui) Golden Path 1-landing : ajoute les 2 icônes PWA manquantes (cause racine du 404) + golden-path auto-diagnostiquable | NEFER (auto) — opérateur | Correctif racine du finding `1-landing` pré-existant (rouge depuis ~2026-05-31) : `manifest.webmanifest` référençait `/images/icon-192.png` + `/images/icon-512.png` absents → 404 console au 1er chargement de `/intake`. Ajout des 2 assets statiques (générés depuis `src/app/icon.svg`) + diagnostic CI golden-path (URL de la ressource dans le finding). Hors phases 0–9 (même nature que #79/#278). **0 code de production touché** (assets statiques + outillage CI), 0 nouveau Neter, 0 model Prisma, 0 bypass. Cf. Justification — out-of-scope dans le body PR. |

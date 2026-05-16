# ADR-0078 — Overton canonical home : `sector-intelligence/`

**Status** : Accepted (stub — finalization in Phase 23 Epic 7 Story 7.9)
**Date** : 2026-05-16
**Phase** : 23 (Câblage pivots mission)
**Parent** : ADR-0077 (Phase 23 pivot-mechanics wiring)
**Depends on** : ADR-0052 (Campaign module canonical trajectory instrument), ADR-0077 (parent)
**Supersedes** : phantom reference `0055-overton-algo`

## Contexte

Phase 19 (ADR-0052 v2) a livré `campaign-tracker/culture.overtonShift|overtonReadiness|tarsisBridge` en état `PARTIAL` avec un commentaire explicite `MVP heuristic — vrai algo Overton viendra` (`services/campaign-tracker/signals-culture.ts`). Le calcul actuel est un overlap de tokens Jaccard sur les briefs sectoriels — pas un Overton-shift réel.

Pendant ce temps, **`services/sector-intelligence/` existe déjà** (Seshat-governed, backed by `Sector` Prisma model, avec `getSectorAxis` / `refreshSectorOverton` / `detectDrift` / `computeBrandDeflection`) — il **implémente déjà** l'algorithme sectoriel à base de vecteurs / embeddings que `signals-culture.ts` réclame.

Deux homes possibles pour la mesure Overton : `campaign-tracker/culture.*` (campaign-level verdict) OU `sector-intelligence/` (sector-level engine). Sans décision canonique, le port risque le **doubling NEFER §3.2 #1** — réimplémenter dans `campaign-tracker/` ce qui est déjà dans `sector-intelligence/`.

## Décision

**`sector-intelligence/` est le canonical Overton engine.** `campaign-tracker/culture.*` **délègue** à `sector-intelligence/` pour les calculs sectoriels et **n'écrit pas** dans `Sector`.

Seam ownership :
- `sector-intelligence/` **owns** le sector-level axis, drift, snapshot, brand deflection.
- `campaign-tracker/culture.*` **owns** les campaign-level readiness/shift verdicts qui *consomment* le résultat sectoriel.
- One-way import : `campaign-tracker/` → imports `sector-intelligence/` ; jamais l'inverse.
- `sector-intelligence/` **ne dépend pas** du connecteur Tarsis (`services/seshat/tarsis/connector.ts`) — il accepte un `ConnectorResult<TarsisSignal>` en entrée que le caller (`campaign-tracker/culture.tarsisBridge`) lui injecte. Pure data-in / data-out.

Wiring concret (livré en Epic 3) :
- `campaign-tracker/culture.overtonShift` → `sector-intelligence.detectDrift({ brandId, sectorSlug })` + `computeBrandDeflection(...)` ; drop Jaccard.
- `campaign-tracker/culture.overtonReadiness` → `sector-intelligence.getSectorAxis({ sectorSlug })` ; drop Jaccard.
- `campaign-tracker/culture.tarsisBridge` → feed `sector-intelligence.refreshSectorOverton({ slug, signals: ConnectorResult<TarsisSignal> })`.

Le `capability-state.ts` entry de chaque sous-cluster lifte `PARTIAL → MVP` avec `childAdr: "0078"` (replacement de la dangling `0055-overton-algo` — pattern P22-7).

## Conséquences

**Positives** :
- Zéro doubling — `sector-intelligence/` reste la seule implémentation Overton.
- Capability-state cohérent : un sous-cluster ne mesure jamais ce qu'un autre service mesure déjà.
- `Sector` model utilisé tel quel ; aucune migration Prisma requise pour Overton (D8 préservé).
- Oracle §33 "État Overton sectoriel" consomme la sortie via `campaign-tracker/culture.*` qui consomme `sector-intelligence/` — chaîne unique, traçable.

**Négatives / coûts** :
- `campaign-tracker/culture.*` ajoute une dépendance d'import sur `sector-intelligence/` — vérifier via `madge --circular` que la layering cascade reste propre.
- Quand `sector-intelligence/` retourne `INSUFFICIENT_DATA` (sparse signal), `campaign-tracker/culture.*` doit propager le branch — pattern P22-2 (jamais zero silencieux).

**Neutres** :
- L'algorithme sectoriel concret (vector / embedding) est laissé inchangé — ADR-0078 décide l'ownership, pas la méthode. Toute amélioration future de l'algo se fait dans `sector-intelligence/`.

## Migration

- Phase 23 Epic 3 Story 3.1 étend `sector-intelligence/index.ts` pour accepter `ConnectorResult<TarsisSignal>`.
- Phase 23 Epic 3 Stories 3.2 / 3.3 / 3.4 ré-écrivent `campaign-tracker/signals-culture.ts` pour déléguer.
- Phase 23 Epic 3 Story 3.6 étend `services/strategy-presentation/` (Oracle §33 reader) pour consommer la chaîne via les sous-clusters culture.

## Suivi

- HARD test `phase22-no-silent-zero.test.ts` (activé Epic 3 Story 3.8) couvre les paths Overton.
- `campaign-tracker-coherence.test.ts` (Epic 7 Story 7.10 extension) assert que les 3 sous-clusters culture passent à lifecycle ≥ MVP.
- Le test `madge --circular` doit rester clean — ESLint `boundaries` configuré.

## Notes

- L'algo Overton sera amélioré progressivement post-Phase 23 (Growth : scheduled re-calibration ; Vision : predictive radar) — toujours dans `sector-intelligence/`, jamais en parallel implementation dans `campaign-tracker/`.
- Si une future Phase identifie un besoin Overton qui ne peut **pas** être servi par `sector-intelligence/`, c'est un signal d'ADR — proposer l'extension de `sector-intelligence/` ou justifier le fork.

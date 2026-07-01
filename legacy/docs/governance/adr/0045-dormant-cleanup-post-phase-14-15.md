# ADR-0045 — DORMANT cleanup post-Phase 14/15 : sections Imhotep/Anubis promues CORE

**Status** : Accepted
**Date** : 2026-05-04
**Phase** : 17 — Refonte rigueur Artemis (mégasprint NEFER) / cleanup résiduel
**Supersedes** : aucun
**Related** : [ADR-0017](0017-imhotep-partial-pre-reserve-oracle-only.md), [ADR-0018](0018-anubis-partial-pre-reserve-oracle-only.md), [ADR-0019](0019-imhotep-full-activation.md), [ADR-0020](0020-anubis-full-activation.md), [ADR-0014](0014-oracle-35-framework-canonical.md)

---

## Contexte

Phase 14 (ADR-0019) a activé Imhotep complètement (Crew Programs full handlers). Phase 15 (ADR-0020) a activé Anubis complètement (Comms full handlers + Credentials Vault). Les ADRs 0019/0020 portent explicitement la mention `Supersedes ADR-0017 / ADR-0018`. Les services `src/server/services/imhotep/` et `src/server/services/anubis/` ont leurs handlers Phase 14+/15+ branchés (`draftCrewProgram`, `draftCommsPlan`, etc.).

CLAUDE.md a documenté ce qui restait :

> **DORMANT** (2) : ⚠️ ces sections étaient Imhotep/Anubis pré-réservés Phase 13 ; **Phase 14/15 les a activées** — elles passent CORE en sprint cleanup ultérieur.

**Ce sprint cleanup n'a jamais été exécuté.** Audit observé sur Makrea (Oracle 35/35, 2026-05-04) : la marque affiche un Oracle dont les **sections 34 et 35 portent encore le badge `DORMANT — pré-réservé`** avec mentions des **ADRs superseded 0017/0018**, alors qu'Imhotep et Anubis sont actifs depuis ~3 mois (Phase 14/15 mergés).

Le drift survit dans 3 surfaces de code applicatif + 5 tests + 1 UI tracker :

| Surface | Drift résiduel | Type |
|---|---|---|
| `src/server/services/strategy-presentation/types.ts` | `tier: "DORMANT"` + `isDormant: true` sur sections 34/35, type `SectionTier` inclut `"DORMANT"` | Source de vérité SECTION_REGISTRY |
| `src/server/services/strategy-presentation/enrich-oracle.ts` | Branch `if (spec._isDormant)`, placeholders "Phase 7+/8+ activation pending", commentaires `+ ADRs 0017/0018` | Pipeline d'enrichissement |
| `src/components/strategy-presentation/sections/phase13-sections.tsx` | Composants `ImhotepCrewProgramDormant` / `AnubisCommsDormant`, badge `Dormant — pré-réservé`, copy `"Sortie partielle Oracle-only"`, mentions ADR-0010 + ADR-0017 / ADR-0011 + ADR-0018 | Rendu UI (visible client) |
| `src/components/strategy-presentation/presentation-layout.tsx` | Imports + ids mapping `imhotep-crew-program-dormant` / `anubis-comms-dormant` | Routing UI |
| `src/server/services/artemis/tools/phase13-oracle-sequences.ts` | Constante `ORACLE_DORMANT_SEQUENCES`, family `"ORACLE_DORMANT"`, name `"(DORMANT — pré-réservé)"`, mentions ADR-0017/0018 dans description | Catalogue sequences |
| `src/server/services/artemis/tools/sequences.ts` | Family `"ORACLE_DORMANT"` dans le union `GlorySequenceFamily` + commentaire `"Dormantes (2) — handlers stubs Oracle-only (B9, ADR-0017/0018)"` | Type-level |
| `src/components/neteru/oracle-enrichment-tracker.tsx` | `TIER_LABEL.DORMANT = "Dormants (2)"` + initialisation `byTier.DORMANT` | Tracker UI |
| 5 tests anti-drift sous `tests/unit/governance/oracle-*` | Vérifient explicitement les anciens ids/flags/family — perpétuent le drift à la place de le bloquer | Tests anti-drift inversés |

NEFER §3 interdit n°3 (drift narratif silencieux) explicitement violé : Phase 14/15 a propagé le canon dans 6 sources de vérité (BRAINS, manifests Imhotep/Anubis, PANTHEON, LEXICON, CLAUDE.md, ADRs 0019/0020) **mais a oublié 3 surfaces applicatives + 1 tracker + 5 tests**. Le test `tests/unit/governance/neteru-coherence.test.ts` ne vérifiait pas ces surfaces — d'où drift silencieux passé en CI.

## Décision

### §1 — Suppression `"DORMANT"` du domaine

`SectionTier` est restreint à `"CORE" | "BIG4_BASELINE" | "DISTINCTIVE"`. Aucune section Oracle ne peut plus déclarer `tier: "DORMANT"`. Le flag `isDormant?: boolean` est retiré de `SectionMeta`.

Justification : aucun cas business actuel ne nécessite un état "dormant" pour une section Oracle. Le cap APOGEE 7/7 Neteru est plein (Phase 15) ; tout futur sous-système hors-Neteru passerait par un nouveau tier dédié, pas par une réintroduction de DORMANT.

### §2 — Migration sections 34/35 vers CORE

| Avant (Phase 13 + ADR-0017/0018) | Après (Phase 17 cleanup ADR-0045) |
|---|---|
| `id: "imhotep-crew-program-dormant"` | `id: "imhotep-crew-program"` |
| `id: "anubis-comms-dormant"` | `id: "anubis-plan-comms"` |
| `title: "Crew Program (Imhotep — pré-réservé)"` | `title: "Crew Program (Imhotep)"` |
| `title: "Plan Comms (Anubis — pré-réservé)"` | `title: "Plan Comms (Anubis)"` |
| `tier: "DORMANT"`, `isDormant: true` | `tier: "CORE"`, flags retirés |
| `data.anubisCommsPlaceholder` | `data.anubisPlanCommsPlaceholder` |

Composition canonique post-cleanup : **23 CORE + 7 BIG4_BASELINE + 5 DISTINCTIVE = 35 sections**.

### §3 — Renommage `_isDormant` → `_skipSequenceExecution`

Dans `enrich-oracle.ts` `SECTION_ENRICHMENT`, le flag interne `_isDormant?: boolean` est renommé `_skipSequenceExecution?: boolean`. La sémantique change pour refléter la réalité Phase 14/15 : la section est active, mais **sa sequence Artemis reste un stub** ; l'output réel vit hors-sequence (appel direct `imhotep.draftCrewProgram` / `anubis.draftCommsPlan` côté Cockpit). Le flag indique seulement "n'exécute pas la sequence, fais juste tourner le writeback statique".

Le wire-up complet sequence Artemis → handler Imhotep/Anubis est out-of-scope de ce ADR (suivi Sprint C).

### §4 — Renommage `ORACLE_DORMANT` → `ORACLE_NETERU_GROUND`

Family `GlorySequenceFamily` : `"ORACLE_DORMANT"` retiré, remplacé par `"ORACLE_NETERU_GROUND"`. Sémantique : sequences appartenant aux Neteru du Ground Tier APOGEE (Imhotep #6, Anubis #7) avec un output produit hors-sequence (par opposition à `ORACLE_BIG4` consulting frameworks et `ORACLE_DISTINCTIVE` La Fusée value-add qui produisent leur output via la sequence).

Export `ORACLE_DORMANT_SEQUENCES` renommé `ORACLE_NETERU_GROUND_SEQUENCES`.

### §5 — Tests anti-drift bloquants

Deux nouveaux invariants ajoutés dans `tests/unit/governance/neteru-coherence.test.ts` :

1. **Surface scan tier "DORMANT" / isDormant / ids `*-dormant`** sur 7 surfaces clés (types.ts, enrich-oracle.ts, phase13-sections.tsx, presentation-layout.tsx, oracle-enrichment-tracker.tsx, sequences.ts, phase13-oracle-sequences.ts).
2. **ADR-0017 / ADR-0018 leak detection** dans 3 surfaces UI/runtime (phase13-sections.tsx, presentation-layout.tsx, phase13-oracle-sequences.ts) — autorise les commentaires explicitement historiques (`ex-ADR-0017`, `retiré par ADR-0045`).

Tout futur PR qui réintroduit l'un de ces motifs casse la CI.

### §6 — Source-of-truth de vocabulaire

Trois mots qui doivent maintenant disparaître du code applicatif (`src/`) hors commentaires historiques explicites :

- `"DORMANT"` (tier literal)
- `pré-réservé` / `pre-reserved` dans les UI sections
- `ADR-0017` / `ADR-0018` dans les UI sections (les ADRs eux-mêmes restent dans `docs/governance/adr/` pour archive et lineage)

## Conséquences

### Bénéfices

- **Cohérence avec CLAUDE.md** : la phrase "elles passent CORE en sprint cleanup ultérieur" est enfin réalisée.
- **UI client cohérente** : un founder qui consulte l'Oracle ne voit plus "Section dormante. Activation Phase 7+/8+" alors que les Neteru qui la produisent sont actifs depuis 3 mois.
- **Drift verrouillé** : 2 invariants CI bloquants empêchent la régression.
- **Refactor downstream simplifié** : Sprint C (wire-up sequence → handler Imhotep/Anubis) part d'une base propre, sans dette narrative à compenser.

### Coûts

- 8 fichiers de code applicatif touchés + 5 tests + 1 nouveau ADR = volume de migration moyen, mais 100 % chirurgical (rename + removal, pas de refonte logique).
- Les BrandAssets existants en DB qui pointent sur `metadata.sectionId === "imhotep-crew-program-dormant"` ou `"anubis-comms-dormant"` resteront orphelins jusqu'au prochain cycle d'enrichissement Oracle (qui les recréera sous le nouvel id). Effet visible sur Makrea : sections 34/35 affichent placeholder Phase 14/15 cohérent au prochain run d'enrichissement.

### Aucune régression backwards-compat à conserver

Le code legacy n'est pas distribué hors repo. Aucun consommateur externe (npm package, API publique) ne référence `tier: "DORMANT"`, `isDormant`, ou les ids `*-dormant`. Cleanup direct sans shim de migration.

## Open work non-couverte par cet ADR

- **Sprint B / C / D du plan d'audit** : re-validation `AdvertisVector` post-load DB, clamp défensif côté `01-executive-summary.tsx`, séparation `DevotionLadderTier` vs `BrandClassification`, helper `assertClassificationCoherence(ICONE ⟹ superfans)`, refonte Forces/Faiblesses sémantiques, refonte governor `advertis-scorer` `INFRASTRUCTURE` → `SESHAT`, Intent kinds `CLASSIFY_BRAND_TIER` / `RECOMPUTE_CULT_INDEX`, migration Section 01 vers `synthesize-section` Phase 17, tests pillar-cap / composite-cap / classification-coherence / Loi 1 altitude. Cf. plan d'audit `~/.claude/plans/1-ingere-nefer-md-http-nefer-md-2-woolly-gadget.md`.
- **Wire-up sequence → handler Imhotep/Anubis** : actuellement la sequence reste stub + writeback statique. Sprint C (post-cleanup).
- **Migration BrandAssets DB existants** : les rows orphelins sous l'ancien sectionId ne sont pas migrés par cet ADR. Le prochain enrichissement Oracle les recréera proprement.

## Vérification

```bash
# Anti-drift CI bloquante
npx vitest run tests/unit/governance/neteru-coherence.test.ts \
                tests/unit/governance/oracle-registry-completeness.test.ts \
                tests/unit/governance/oracle-ui-phase13.test.ts \
                tests/unit/governance/oracle-sequences-phase13.test.ts \
                tests/unit/governance/oracle-section-enrichment-phase13.test.ts \
                tests/unit/governance/oracle-ptah-forge-phase13.test.ts

# Typecheck
npx tsc --noEmit

# Régen CODE-MAP (entité structurelle SectionTier modifiée)
npx tsx scripts/gen-code-map.ts

# Vérifier visuellement que les sections 34/35 d'un Oracle ne portent plus
# le badge "Dormant — pré-réservé" et ne référencent plus ADR-0017/0018.
# (Test E2E manuel : recharger /cockpit/strategy/[id]/oracle de Makrea)
```

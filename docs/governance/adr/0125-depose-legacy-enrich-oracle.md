# ADR-0125 — Dépose du chemin legacy `enrichOracle` (drift D-6.3)

**Status** : Accepted
**Date** : 2026-07-11
**Phase** : intégration PR #447×#448 — résiduel (f) audit UX Cockpit v2
**Depends on** : ADR-0068 (OracleSection), ADR-0070/0071 (GENERATE/ASSEMBLE manual-first), ADR-0072/0073 (NSP stream + panel progressif), ADR-0091 (composers déterministes)
**Supersedes** : la cohabitation ADR-0073 §« coexistence legacy » + ADR-0074 §« Cohabitation legacy enrichOracle »

## Contexte

Le legacy `enrich-oracle.ts` (1 767 lignes : `enrichAllSections` v1 + `enrichAllSectionsNeteru` v2) cohabitait avec le chemin moderne depuis Phase 21. Le drift **D-6.3** exigeait sa dépose « après audit de couverture du panel progressif ». L'audit (2026-07-11, exhaustif — 18 capacités comparées) a établi :

- **v2 (`enrichAllSectionsNeteru`)** : 0 caller UI — mort.
- **Tout ce que le client voit est couvert** par le chemin moderne : rendu 35/35 (`assemblePresentation` read-time), scopes ALL/MISSING/STALE, sequences + composers déterministes fallback, promotion BrandAsset (`section-writeback`), snapshots ADR-0016, exports PDF, streaming NSP réel (vs polling), staleness per-section.
- **Aucun call-site programmatique** : boot-sequence émet `FILL_ADVE`, jamais `ENRICH_ORACLE`.
- **Gap unique (richesse, pas compile)** : le legacy exécutait les frameworks fw-01..28 avec writeback vers des SOUS-CHAMPS de piliers (unitEconomics, berkus, TAM/SAM/SOM, growth loops…) lus par certains mappers CORE, + créait des rows `Signal` (§09). Tous ces mappers dégradent proprement (EmptyState) et la complétude se calcule sur les champs primaires.

## Décision — Option A (doctrine ADR-0091 : « lacune honnête > champ inventé »)

Dépose **maintenant**, en assumant explicitement la perte de l'enrichissement automatique fw→pilier :

- Les sous-champs framework tombent en EmptyState (déjà géré partout — cohérent avec le healer pass et le Lot 5).
- Les frameworks restent **lançables manuellement** via le router `framework` (manual-first ADR-0060) ; un re-hébergement moderne (Intent `ENRICH_PILLARS_VIA_FRAMEWORKS` ou fold dans la cascade RTIS) reste possible en chantier séparé si la richesse manque à l'usage.
- La création de `Signal` §09 appartient à Seshat/Tarsis (lecteurs réels), pas à un side-effect d'enrichissement.

### Supprimé

`enrich-oracle.ts` (v1+v2+`SECTION_ENRICHMENT`+helpers) · procédures tRPC `enrichOracle`/`enrichOracleNeteru` · composant `OracleEnrichmentTracker` (remplacé par `useOracleStream` + panel progressif) · kind `ENRICH_ORACLE` (intent-kinds, SLOs, manifest `acceptsIntents` + capability `enrichOracleNeteru`) · tests legacy (`oracle-intent-capture-r2`, `oracle-section-enrichment-phase13`, `oracle-nsp-streaming-phase13`, bloc cohabitation de `oracle-progressive-ui`, F2 d'`artemis-hierarchy`).

### Rebranché

- Page `proposition` : le bouton opérateur « Assembler la proposition » (via `ArtemisLaunchModal` de préparation ADVE, conservée) déclenche désormais `oracle.assembleOracle({ scope: "MISSING" })` — l'orchestrateur manual-first. Le panel progressif (ADR-0073) est la surface de détail unique.
- `forgeForSection` conservé (lit le BrandAsset DRAFT, produit aussi par le chemin moderne) — message d'erreur reformulé.
- F3 (`promoteSectionToBrandAsset`) re-ciblé sur son foyer canonique `section-writeback.ts`.

## Conséquences

- ~2 300 lignes de chemin parallèle en moins ; une seule voie d'assemblage (Q3 renforcé, plus de dispatch inline hors `emitIntent`).
- `assembler-uses-manual-path.test.ts` (HARD) inchangé et vert.
- Perte assumée : enrichissement automatique fw→pilier (voir Option B de l'audit si le besoin revient — tracé RESIDUAL-DEBT).

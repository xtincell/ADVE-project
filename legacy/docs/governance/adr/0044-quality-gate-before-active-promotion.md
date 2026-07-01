# ADR-0044 — Quality gate avant promote BrandAsset ACTIVE

**Status** : Accepted
**Date** : 2026-05-04
**Phase** : 18 — Remédiation résidus mission Oracle Makrea
**Supersedes** : aucun (branche le helper de [ADR-0041](0041-sequence-robustness-loop.md))
**Related** : [ADR-0041](0041-sequence-robustness-loop.md), [ADR-0012](0012-brand-vault-superassets.md)

---

## Contexte

Audit observé sur Makrea (mission Oracle 35/35, mai 2026) : le compteur affiche `35/35 complete` alors que **4 BrandAssets ACTIVE ont un `content` structurellement vide** (`{ mckinsey7s: {} }`, etc.). Cause :

1. Glory sequences `MCK-7S`, `BAIN-NPS`, `MCK-3H`, `MANIP-MATRIX` ont tourné avec LLM dégradé (Anthropic circuit breaker open) → output `{}`.
2. `promoteSectionToBrandAsset` ([enrich-oracle.ts:66](../../../src/server/services/strategy-presentation/enrich-oracle.ts:66)) écrit le content sans valider sa qualité.
3. `brandVault.promoteToActive` ([engine.ts:324](../../../src/server/services/brand-vault/engine.ts:324)) flippe `state="ACTIVE"` sans vérifier le content.
4. `checkCompleteness` ([index.ts:235](../../../src/server/services/strategy-presentation/index.ts:235)) traite `state==="ACTIVE"` comme `complete` indépendamment du content.

**Résultat** : le compteur 35/35 est cosmétique. Un Oracle "complet" peut afficher du contenu vide côté client → trahison de la promesse founder.

ADR-0041 §3 a posé le helper `applySequenceQualityGate` ([quality-gate.ts](../../../src/server/services/artemis/tools/quality-gate.ts)) mais a documenté son **branchement comme open work** (`(2) Branchement applySequenceQualityGate dans sequence-executor.ts post-dernier-step + dans enrich-oracle.ts catch — chantier C-bis`).

Ce ADR ferme cette open work.

## Décision

### §1 — Invariant canonique

> **`BrandAsset.state === "ACTIVE"` ⇒ `content` non-empty (au sens `applySequenceQualityGate`).**

Toute violation de cet invariant est un bug. Le quality gate est appliqué à **deux points d'entrée** :

### §2 — Gate dans `promoteSectionToBrandAsset` ([enrich-oracle.ts](../../../src/server/services/strategy-presentation/enrich-oracle.ts))

Avant de créer/updater un BrandAsset, applique `applySequenceQualityGate(sectionId, content)`. Si fail :
- **Comportement** : crée/garde un `state="DRAFT"` (pas de promote ACTIVE), log warn explicite, retourne `{ created: false, updated: false, skipped: true, qualityFail: true }`.
- **Override** : flag `_isDormant: true` dans `SECTION_ENRICHMENT` court-circuite (sections dormantes Imhotep/Anubis sont par design des placeholders et passent en ACTIVE avec un payload minimal contractualisé).

### §3 — Gate dans `brandVault.promoteToActive` ([engine.ts:324](../../../src/server/services/brand-vault/engine.ts:324))

Avant de flipper `state="ACTIVE"`, charge le BrandAsset, applique `applySequenceQualityGate`. Si fail :
- **Comportement par défaut** : refuse le promote avec `SequenceQualityError`. Le DRAFT reste DRAFT.
- **Override opérateur** : nouveau param `force: boolean` (defaut false). Si `true`, log audit `OVERRIDE_QUALITY_GATE` dans IntentEmission + autorise ACTIVE. Cas légitimes : sections dormantes par design, BrandAssets opérateur-saisis bypass-Glory.

### §4 — Pas de migration des BrandAssets ACTIVE existants

L'invariant s'applique aux **futurs** promotes. Les BrandAssets ACTIVE actuels qui violeraient la règle (cf. mission Makrea : 8 BrandAssets fillés/tronqués) sont nettoyés via `scripts/reset-makrea-fake-fills.ts` qui les repasse en DRAFT, à re-promote après vrai re-enrich.

### §5 — Quality gate audit

`tests/unit/oracle/quality-gate-promote.test.ts` verrouille que :
- Promote `{ mckinsey7s: {} }` → refus
- Promote `{ mckinsey7s: { strategy: { state: "..." } } }` → OK
- Promote avec `force: true` → OK + log audit visible

## Conséquences

### Bénéfices
- **Compteur Oracle honnête** : `35/35` ne peut plus être atteint avec du fake. Un Oracle complet est complet en contenu réel.
- **Confiance founder** : le client voit du contenu, pas des cellules vides
- **Détection régression sequences** : si une Glory sequence se met à produire du vide, l'output reste DRAFT (visible côté Vault) au lieu de pourrir l'Oracle ACTIVE

### Coûts
- Override `force: true` doit être utilisé avec parcimonie côté UI Vault (pas de bouton générique "promote")
- Sections dormantes Imhotep/Anubis exigent un payload contractualisé minimal (déjà fait : `{ imhotepCrewProgramPlaceholder: "..." }`)

### Risques
- Si `applySequenceQualityGate` est trop strict, des promotes légitimes échouent. Mitigation : test fixtures variées + override `force` documenté.

## Open work

- Backfill audit `scripts/audit-brandasset-quality.ts` qui scanne tous les `state="ACTIVE"` du repo et flag les violations actuelles (post-merge).
- Documentation UI Vault : opérateur sait que "promote" peut être refusé, comprend pourquoi.

## Références implémentation

- [src/server/services/strategy-presentation/enrich-oracle.ts](../../../src/server/services/strategy-presentation/enrich-oracle.ts) — `promoteSectionToBrandAsset`
- [src/server/services/brand-vault/engine.ts](../../../src/server/services/brand-vault/engine.ts) — `promoteToActive`
- [src/server/services/artemis/tools/quality-gate.ts](../../../src/server/services/artemis/tools/quality-gate.ts) — helper existant (ADR-0041)
- Tests : `tests/unit/oracle/quality-gate-promote.test.ts`

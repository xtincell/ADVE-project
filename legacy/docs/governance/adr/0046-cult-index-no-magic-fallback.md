# ADR-0046 — Cult Index : suppression du fallback magic `× 0.45`, dérivation explicite ou null

**Status** : Accepted
**Date** : 2026-05-04
**Phase** : 17 — cleanup résiduel post audit Makrea
**Supersedes** : aucun
**Related** : [ADR-0045](0045-dormant-cleanup-post-phase-14-15.md), [ADR-0014](0014-oracle-35-framework-canonical.md)

---

## Contexte

Audit Makrea (mai 2026, ADR-0045 §findings) a observé dans `mapExecutiveSummary` un fallback non-documenté :

```ts
const derivedCultIndex = cultSnap
  ? { score: cultSnap.compositeScore, tier: cultSnap.tier }
  : vector.composite > 0
    ? { score: Math.round(vector.composite * 0.45 * 10) / 10, tier: classification }
    : null;
```

Trois problèmes :

1. **`× 0.45` est un magic number** — aucun commentaire, aucune entrée variable-bible, aucun ADR. Origine empirique non tracée. La même formule était dupliquée dans `mapCommunity` ([section-mappers.ts:651](../../../src/server/services/strategy-presentation/section-mappers.ts:651)). Pour un brand avec composite 186.67, ce fallback produisait `cultIndex.score ≈ 84` — pas du tout aligné avec le tier `cultSnap.tier` réel observé (APPRENTI, soit ~25). Les deux sources de vérité divergeaient silencieusement.
2. **Conflation de deux enums** — la branche `cultSnap` retournait `tier: cultSnap.tier` (Devotion Ladder : APPRENTI / PRATIQUANT / INITIE / FIDELE / EVANGELISTE), tandis que la branche fallback retournait `tier: classification` (BrandClassification : ZOMBIE / ORDINAIRE / FORTE / CULTE / ICONE). Deux dimensions de mesure orthogonales mappées sur le même champ `cultIndex.tier`. Cf. ADR-0047 pour la séparation type-level.
3. **`Cult Index = composite × constante` est une approximation paresseuse** — le cult-index réel calcule sur engagement velocity, community health, superfan velocity (cf. `KpisMesureSection.cultIndex`). Réduire à un coefficient sur le composite pillarisé efface la sémantique du score.

## Décision

### §1 — Le fallback est supprimé

`mapExecutiveSummary` n'invente plus de cultIndex quand aucun snapshot SESHAT n'existe :

```ts
const derivedCultIndex = cultSnap
  ? { score: cultSnap.compositeScore, tier: cultSnap.tier }
  : null;
```

Le composant React Executive Summary affiche `—` pour score et `""` pour tier quand `cultIndex === null` — c'est l'état honnête : « pas encore mesuré ».

### §2 — Pas de magic number ailleurs dans la mapper

Toute future dérivation de cultIndex côté `section-mappers.ts` (ou ailleurs) doit :

- Soit pull un snapshot existant (`Strategy.cultIndexSnapshots[0]`).
- Soit appeler le service cult-index dédié (`src/server/services/cult-index-engine/` ou son successeur sous gouvernance Seshat) via `mestor.emitIntent({ kind: "RECOMPUTE_CULT_INDEX" })` — pas de calcul inline.
- Soit retourner `null` (état honnête « pas mesuré »).

Aucun coefficient empirique n'est admis dans le mapping path sans :
- une entrée variable-bible documentant le coefficient + sa justification métier,
- ou un ADR formalisant la formule + sa source.

### §3 — Audit anti-drift

Test bloquant à ajouter en CI (Sprint follow-up) : `tests/unit/lib/no-magic-cult-coefficient.test.ts` qui grep dans `src/server/services/strategy-presentation/**` la regex `composite\s*\*\s*0\.[0-9]+` et fail si match.

## Conséquences

### Bénéfices

- **Cohérence ↔ snapshot** : ce qui est affiché correspond strictement à ce qui a été mesuré. Pas de score fantôme.
- **Honnêteté UX** : un brand sans cult-index snapshot voit `—` au lieu d'un nombre fabriqué. Le founder voit où le système n'a pas encore d'observation.
- **Préparation ADR-0047** : la séparation `DevotionLadderTier` vs `BrandClassification` devient triviale puisque le fallback qui mélangeait les deux est supprimé.

### Coûts

- Marques sans cult-index snapshot affichent désormais `—` dans la card "Cult Index" de l'Executive Summary. Précédemment elles voyaient un nombre dérivé (incorrect mais visuellement présent). Pas de régression réelle car le nombre fabriqué était déjà incohérent avec le badge tier (cf. cas Makrea observé : composite × 0.45 ≈ 84, mais cultSnap.tier rendait APPRENTI ≈ 25).
- Le path `mapCommunity` ([section-mappers.ts:651](../../../src/server/services/strategy-presentation/section-mappers.ts:651)) utilisait la même formule — à migrer dans le même esprit (suivi Sprint B.3-bis).

## Open work

- Migrer `mapCommunity` (ligne 651) sur le même pattern (snapshot ou null).
- Test anti-drift CI bloquant (cf. §3).
- Décider : si le besoin de "cult-index estimate quand snapshot absent" est réel côté UX, créer un Glory tool gouverné `estimate-cult-index` qui invoque le cult-index-engine SESHAT avec une formule formellement documentée (variable-bible entry + tests). Pas de coefficient inline.

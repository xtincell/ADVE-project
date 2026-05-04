# ADR-0043 — Oracle budget découplé de Campaigns

**Status** : Accepted
**Date** : 2026-05-04
**Phase** : 18 — Remédiation résidus mission Oracle Makrea
**Supersedes** : aucun (corrige un critère préexistant dans [ADR-0014](0014-oracle-35-framework-canonical.md))
**Related** : [ADR-0014](0014-oracle-35-framework-canonical.md), [ADR-0023](0023-operator-amend-pillar.md)

---

## Contexte

La section Oracle `budget` ([SECTION_REGISTRY](../../../src/server/services/strategy-presentation/types.ts:101)) avait jusqu'ici un critère de complétude trop strict :

```ts
"budget": check(!!s.budget.unitEconomics, s.budget.campaignBudgets.length > 0)
```

Conséquences :

1. **Marque BOOT impossible à compiler** : un opérateur qui chiffre proprement son CAC, LTV, marge nette dans pillar V mais n'a pas encore lancé de Campaign reste bloqué en `partial` indéfiniment.
2. **Force la création de Campaigns fictives** : observé sur Makrea (mission Oracle 35/35, mai 2026) — j'ai créé une `Campaign Q3 - Lancement, 50000 EUR` purement pour passer le critère, sans valeur stratégique réelle. C'est de la triche métier.
3. **Couplage non aligné avec la cascade ADVERTIS** : le budget est un paramètre stratégique (pillar S — Strategy) qui peut exister AVANT toute Campaign concrète. Le critère actuel inverse la dépendance (Strategy dépend d'Operations).

## Décision

### §1 — Réutilisation du champ existant `pillarS.globalBudget`

NEFER interdit #1 — pas réinventer la roue. Le champ canonique existe déjà dans
BIBLE_S ([variable-bible.ts:740](../../../src/lib/types/variable-bible.ts:740)) :

```ts
globalBudget: {
  description: "Budget total de la strategie — enveloppe globale allouee a l'execution de la roadmap",
  format: "Nombre en XAF"
}
```

C'est exactement la sémantique Option C — enveloppe budgétaire annuelle/stratégique
découplée des Campaigns concrètes. On l'utilise directement, sans ajouter un
nouveau champ.

Ce champ peut être amendé via `OPERATOR_AMEND_PILLAR` mode PATCH_DIRECT ([ADR-0023](0023-operator-amend-pillar.md)).
Sa valeur typique : un nombre ≥ 0 (XAF). `null`/absent = pas encore renseigné.

Bonus : `budgetBreakdown` existe également dans BIBLE_S — ventilation
production/media/talent/logistics/technology/contingency/agencyFees. Le mapper
peut l'exposer en lecture si présent.

### §2 — Critère `complete` ouvert (Option C)

Avant :
```ts
"budget": check(!!s.budget.unitEconomics, s.budget.campaignBudgets.length > 0)
```

Après :
```ts
"budget": check(
  !!s.budget.unitEconomics || !!s.budget.globalBudget,
  s.budget.campaignBudgets.length > 0
    || (typeof s.budget.globalBudget === "number" && s.budget.globalBudget > 0)
)
```

Sémantique :
- `partial` si `unitEconomics` OU `globalBudget` présent
- `complete` si `globalBudget > 0` OU au moins une `Campaign.budget` non nulle
- Compatible rétrocompat — toutes les strategies existantes avec Campaigns budgetées passent toujours

### §3 — `mapBudget` étendu

`mapBudget` ([section-mappers.ts:671](../../../src/server/services/strategy-presentation/section-mappers.ts:671)) lit `pillarS.globalBudget` (et optionnellement `pillarS.budgetBreakdown`) et les expose dans `BudgetSection.globalBudget: number | null` et `BudgetSection.budgetBreakdown: object | null`. Le composant React rend ces champs à côté de `unitEconomics` et `campaignBudgets`.

### §4 — Drift test

Si demain quelqu'un veut un quatrième critère (ex: budget pillar V alimenté), il étend ce mécanisme — pas de régression vers le couplage strict Campaigns.

## Conséquences

### Bénéfices
- **Marques BOOT compilent un Oracle complet** sans avoir à lancer une campagne fictive
- **Triche métier impossible** sur ce critère (la Campaign Q3 fake que j'ai créée pendant la mission Makrea peut être supprimée)
- **Cascade ADVERTIS respectée** : pillar S porte la planification budgétaire, Campaigns alimentent l'exécution

### Coûts
- Migration codemod nulle (champ optionnel)
- Tests anti-régression à ajouter (`tests/unit/oracle/budget-section-completeness.test.ts`)

### Risques
- Composant `BudgetSection` doit gracefully render avec `budgetAllocation: null` (legacy strategies sans le champ)

## Open work

Suppression de la `Campaign Q3 - Lancement, 50000 EUR` créée artificiellement pendant la mission Makrea — cf. `scripts/reset-makrea-fake-fills.ts`.

## Références implémentation

- [src/lib/types/variable-bible.ts](../../../src/lib/types/variable-bible.ts) — BIBLE_S +1 entry
- [src/server/services/strategy-presentation/section-mappers.ts](../../../src/server/services/strategy-presentation/section-mappers.ts) — `mapBudget` + `checkSectionCompleteness`
- Tests : `tests/unit/oracle/budget-section-completeness.test.ts`

# ADR-0069 — Readiness UI parity (Phase 21 F-A.5)

**Status** : Accepted
**Date** : 2026-05-08
**Phase** : 21 — Oracle Generation Robustness + Manual-First Section Control
**Sub-phase** : F-A.5 (mini-chantier inséré entre F-A et F-C — readiness UI parity)
**Depends on** : ADR-0023 (OPERATOR_AMEND_PILLAR cascade staleness), ADR-0030 (pillar-readiness governance), ADR-0060 (manual-first parity)
**Related to** : ADR-0067 (LLM output structured enforcement, F-A), ADR-0068 (OracleSection first-class, F-B)

## Contexte

Bug observé en production (capture opérateur 2026-05-08) :

- **Notoria UI** affiche les chips ADVE/RTIS comme `COMPLET` (couleur bleue) pour V/E/R/T/I/S.
- **Page pilier "Potentiel"** affiche `Suffisant 100%`, `Complet 65%`, status `ENRICHED`.
- **Service `getStrategyReadiness()`** ([pillar-readiness.ts:187-194](../../src/server/governance/pillar-readiness.ts)) bloque le gate `RTIS_CASCADE` avec 6 blockers `PILLAR_STALE` (V/E/R/T/I/S).
- **Conséquence** : l'opérateur clique "Lancer la veille R+T" et reçoit un veto avec un message obscur — la chip lui disait que tout était prêt.

Cause racine : trois sources de vérité distinctes pour le statut pillaire :

1. **Chip Notoria** lit `dashboard.completionLevels[k]` qui vient de `notoria.getDashboard` ([routers/notoria.ts:229-244](../../src/server/trpc/routers/notoria.ts)) — qui se contentait de `db.pillar.findMany({ select: { completionLevel: true } })`. **Aucune lecture de `staleAt`**.
2. **Page pilier** utilise `assessPillar()` direct (stage + completionPct) — correct mais non synchronisé avec la chip.
3. **Service readiness** combine `assessPillar()` + `staleAt` + `validationStatus` + `cacheConsistency` — c'est la source canonique mais elle n'était pas exposée à l'UI.

`pillar-readiness.ts` exposait déjà `displayLabel: "Périmé"` quand `stale=true`. **Mais aucun consommateur UI ne le lisait.**

## Décision

**`notoria.getDashboard` devient le pont canonique** entre `getStrategyReadiness()` et l'UI. Trois changements :

### 1. Backend — `notoria.getDashboard` étendu

```ts
return {
  pendingByPillar, // legacy
  statusCounts,    // legacy
  completionLevels, // legacy — kept for backward-compat, NE PAS lire pour rendu chip
  // Phase 21 F-A.5 — nouveau contrat :
  byPillar: {
    [pillarKey]: {
      completionLevel: "INCOMPLET" | "COMPLET" | "FULL",
      stage: string,
      stale: boolean,        // ← NOUVEAU : staleAt != null
      displayLabel: string,  // ← NOUVEAU : "Vide" | "Brouillon" | "Enrichi" | "Complet" | "Validé" | "Verrouillé" | "Périmé"
      validationStatus: string,
      rtisCascadeReady: boolean, // ← NOUVEAU : gates.RTIS_CASCADE.ok
      pendingCount: number,
    }
  }
}
```

Implémentation : appelle `getStrategyReadiness(strategyId)` en parallèle des deux groupBy existantes, projette `byPillar[k]` à partir de `readiness.byPillar[k]`. Coût marginal : 1 query Postgres + assessment in-memory.

### 2. Helper UI canonique — `getPillarChipStatus`

[`src/components/cockpit/notoria/lib/pillar-chip-status.ts`](../../src/components/cockpit/notoria/lib/pillar-chip-status.ts) :

```ts
export function getPillarChipStatus(p: PillarReadinessProjection): PillarChipStatus
```

Précédence stricte (overrides) :
1. `stale === true` → variant `"stale"` + label `"PÉRIMÉ"` + `isReadyForCascade=false` (override COMPLET/FULL).
2. `completionLevel === "FULL"` → variant `"full"` + label `"FULL"`.
3. `completionLevel === "COMPLET"` → variant `"complet"` + label `"COMPLET"`.
4. Sinon → variant `"incomplet"` + label `"INCOMPLET"`.

Retour `{ label, className, variant, isReadyForCascade, shouldRegenerate }` — UI lit ce shape, pas de calcul local.

### 3. Refit `notoria-page.tsx`

- Import `getPillarChipStatus` + retrait du mapping legacy `COMPLETION_COLORS` (Record literal supprimé).
- `chipStatus(k)` interne dérive de `dashboard.byPillar[k]` (avec fallback "INCOMPLET" si dashboard pas chargé).
- `isReady(k)` consulte maintenant `chipStatus(k).isReadyForCascade` qui inclut le check stale → cohérent avec le veto serveur.
- Rendu chip : `className: status.className`, `label: status.label`. Tooltip `"Pilier périmé — un pilier amont a muté. Régénère pour débloquer la cascade."` quand `shouldRegenerate=true`.

## Garanties

| Avant | Après |
|-------|-------|
| Chip dit COMPLET, veto serveur "PILLAR_STALE" — drift | Chip dit PÉRIMÉ (amber), opérateur sait qu'il faut régénérer |
| 3 sources de vérité divergentes | 1 source canonique (`getStrategyReadiness`) projetée 1× via `notoria.getDashboard` |
| `isReady()` ignore `staleAt` | `isReady()` délègue à `chipStatus(k).isReadyForCascade` (stale-aware) |
| `COMPLETION_COLORS` mapping ad-hoc dans le composant | Helper `getPillarChipStatus` testé unit + anti-drift |

## Cap APOGEE

**7/7 préservé.** Aucun nouveau Neter, aucun nouveau Intent. Pure cohérence inter-couches (governance → tRPC → UI).

## Tests anti-drift (21 tests passing)

[`tests/unit/lib/pillar-chip-status.test.ts`](../../tests/unit/lib/pillar-chip-status.test.ts) — 12 tests sur le helper :
- Précédence stale > FULL/COMPLET (override).
- Mapping classes Tailwind par variant (amber/emerald/blue/error).
- `isPillarReadyForCascade` convenience délègue au helper.

[`tests/unit/governance/readiness-ui-parity.test.ts`](../../tests/unit/governance/readiness-ui-parity.test.ts) — 9 tests :
- `notoria.ts` importe `getStrategyReadiness`.
- `byPillar` contient `stale` + `displayLabel` + `rtisCascadeReady`.
- Helper canonique exporte les API attendues.
- `notoria-page.tsx` consomme le helper (no `COMPLETION_COLORS` Record).
- **Mode soft baseline 5** — interdit l'augmentation des patterns directs `cl[k] === "COMPLET"` dans `src/components/`. Promotion hard quand baseline=0.

## Doctrine NEFER §1.1

- **Pas de notion de temps humain** — fix en profondeur (helper canonique + refit + tests + ADR), pas un patch isolé sur la chip.
- **Pas d'économie de tokens** — extension `getDashboard` enrichie + helper documenté + 21 tests.
- **Profondeur > raccourci** — au lieu de juste ajouter `if (staleAt) return "PÉRIMÉ"` dans la chip, on a unifié la source de vérité backend + créé le helper UI + verrouillé via test anti-drift.

## Suite

Le helper `getPillarChipStatus` est maintenant disponible pour tous les futurs surfaces (cockpit pillar pages, console dashboard, agency views). Migration graduelle des autres composants tracée par le test soft baseline 5.

Prochaine sub-phase mégasprint : **F-C** — Intent kind `GENERATE_ORACLE_SECTION` (consomme F-A pour LLM enforcement + F-B pour OracleSection lifecycle).

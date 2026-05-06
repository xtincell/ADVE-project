# ADR-0052 — Strict LLM output validation at system boundaries

**Date** : 2026-05-06
**Status** : Accepted
**Auteurs** : NEFER (branche `claude/angry-ritchie-94b2f1`)
**Supersede** : —
**Lié** : [ADR-0044](0044-quality-gate-before-active-promotion.md) (quality gate before promotion), [ADR-0051](0051-rtis-cascade-canonical-path.md) (cascade RTIS canonical path), [ADR-0014](0014-oracle-35-framework-canonical.md) (Oracle 35 framework canonical), Pillar Gateway LOI 1 ([src/server/services/pillar-gateway/index.ts](../../../src/server/services/pillar-gateway/index.ts))

---

## 1. Contexte

Symptôme observé sur Makrea (`/cockpit/brand/potential`, mai 2026) : la section "Catalogue par canal (36 actions)" affichait 36 rectangles vides (titre absent, format absent, objectif absent), un par item de chaque canal DIGITAL/PRODUCTION/EVENEMENTIEL/PR_INFLUENCE. Les chevrons `>` à droite confirmaient que `actions.map(...)` rendait bien les items — mais aucun n'avait de contenu.

Diagnostic en remontant la chaîne :

1. **Renderer** ([src/components/cockpit/field-renderers.tsx:702](../../../src/components/cockpit/field-renderers.tsx)) — `<span>{String(a.action ?? a.name ?? "")}</span>` : tombe à `""` quand l'item LLM n'a ni `action` ni `name`.
2. **Schéma** ([src/lib/types/pillar-schemas.ts:1048](../../../src/lib/types/pillar-schemas.ts)) — `PotentialActionSchema.action: z.string().min(1)` : strict, devrait rejeter les items sans `action`.
3. **Pipeline LLM** ([src/server/services/rtis-protocols/innovation.ts:131-132](../../../src/server/services/rtis-protocols/innovation.ts), idem `risk.ts:238`, `track.ts:255`, `strategy.ts:162-163`) :
   ```ts
   const { extractJSON } = await import("@/server/services/utils/llm");
   return extractJSON(text) as Record<string, unknown>;
   ```
   `extractJSON` parse le JSON structurel mais **ne valide pas la shape**. Le `as` est un cast TypeScript — zéro check runtime. Le LLM peut retourner `{ catalogueParCanal: { DIGITAL: [{}, {}, ...] } }` (items vides) et tout passe.
4. **Gateway** ([src/server/services/pillar-gateway/index.ts:413](../../../src/server/services/pillar-gateway/index.ts)) — `validatePillarPartial` est appelé, les erreurs Zod sont pushed dans `warnings[]`, mais le commentaire explicite `// Don't block — partial validation allows incomplete data` neutralise le filet.

**Cause racine** : la validation Zod existe à plusieurs niveaux (schémas declarés, fonction `validatePillarPartial` appelée), mais **aucun étage du pipeline ne BLOQUE** sur une violation de shape. Le contenu malformé du LLM se propage jusqu'au DOM.

Cette ADR résout 4 protocoles RTIS et trace le pattern réutilisable pour tout autre call-site (Glory tools, recommendations Notoria, ingestion brief) qui doit consommer une sortie LLM.

## 2. Décision

### 2.1. Helper canonique `parseAndValidateLLM`

Nouveau module : [src/server/services/llm-gateway/parse-validate.ts](../../../src/server/services/llm-gateway/parse-validate.ts), re-exporté via [src/server/services/utils/llm.ts](../../../src/server/services/utils/llm.ts).

Signature :

```ts
function parseAndValidateLLM<T>(
  text: string,
  schema: ZodType<T>,
  opts?: { context?: string; mode?: "prune" | "strict"; onWarning?: (...) => void }
): { data: T; warnings: string[]; droppedPaths: string[]; partial: boolean }
```

Comportement :

- **Stage 1** — `extractJSON(text)` (existant, robuste 3-step : JSON pur / markdown fences / accolades équilibrées).
- **Stage 2** — `schema.safeParse(parsed)`. Succès → return.
- **Stage 3** (mode `prune`, default) — pour chaque issue Zod, retire le path correspondant et re-tente. **Heuristique critique** : quand un path traverse un index de tableau, on supprime l'élément ENTIER, pas juste la feuille — sinon `[{}]` reste invalide après suppression du leaf. Tri des issues "deepest-first + numeric-desc" pour que `splice()` ne décale pas les indices restants.
- **Stage 4** — fallback `schema.partial()` si `ZodObject` (entouré d'un try/catch car `.partial()` jette sur les schémas avec `.refine()` / `.transform()`).
- **Mode `strict`** — throw `LLMValidationError` au premier écart (pour les call-sites qui ne tolèrent aucune perte).

### 2.2. Sub-schemas LLM-only dans chaque protocole RTIS

Au lieu de valider contre `PillarISchema` complet (qui inclut des champs CALC remplis par le code), chaque protocole déclare un sub-schema mirroir des champs que **le prompt LLM** demande :

```ts
// innovation.ts
const InnovationLLMResponseSchema = PillarISchema.pick({
  catalogueParCanal: true, assetsProduisibles: true,
  activationsPossibles: true, formatsDisponibles: true, innovationsProduit: true,
}).partial();
```

`.pick().partial()` rend chaque champ top-level optionnel mais **conserve la validité interne stricte** (`PotentialActionSchema.action: z.string().min(1)` reste actif sur chaque item du tableau). Le pruner drop les items individuels invalides, garde les valides.

Pour `risk.ts`, certains champs ont des `.min(N)` au niveau du parent (`probabilityImpactMatrix.min(5)`, `mitigationPriorities.min(5)`) qui rejetteraient l'array entier si le LLM produit moins de N items. Pour ce cas, on a exporté les item-schemas (`SWOTQuadrantSchema`, `RiskEntrySchema`, `MitigationPrioritySchema`, `OvertonBlockerSchema`) depuis `pillar-schemas.ts` et composé un `RiskLLMResponseSchema` sans contrainte `.min(N)` au parent — tradeoff documenté : on accepte un sous-effectif côté LLM, c'est le step CALC suivant ou l'opérateur qui complète.

### 2.3. Strict mode opt-in dans le Pillar Gateway

Nouveau champ dans `PillarWriteOptions` :

```ts
interface PillarWriteOptions {
  // ...existing fields...
  strictSchemaValidation?: boolean;  // ADR-0052
}
```

Comportement quand `true` :

```ts
if (!validation.success && options?.strictSchemaValidation) {
  return { success: false, version, ..., error: `Strict schema validation failed (N issues): ...` };
}
```

Le défaut reste `false` pour préserver le contrat actuel des autres call-sites (operator drafts, ingestion incrémentale, recommendation apply) — l'opt-in est explicite, ADR-isé.

Activé pour les 4 protocoles RTIS dans deux endroits :

- [src/server/services/mestor/hyperviseur.ts](../../../src/server/services/mestor/hyperviseur.ts) — switch case `PROTOCOLE_R/T/I/S`.
- [src/server/services/rtis-protocols/index.ts](../../../src/server/services/rtis-protocols/index.ts) — fonction `persistViaGateway` (utilisée par `executeRTISCascade`).

### 2.4. Filtre défensif côté renderer

Defence in depth : même si un Pillar.i.content legacy (pré-fix) contient encore des items malformés, `CatalogueParCanalCard` les filtre AVANT de rendre les rectangles :

```tsx
const isRenderable = (a: unknown): a is Record<string, unknown> =>
  !!a && typeof a === "object" && !Array.isArray(a)
  && (typeof (a as ...).action === "string"
    || typeof (a as ...).name === "string"
    || typeof (a as ...).title === "string");
```

Le fallback de titre passe aussi de `a.action ?? a.name ?? ""` à `a.action ?? a.name ?? a.title ?? ""` (cohérent avec ce que `i-action-extractor.ts:127-129` reconnaît déjà comme keys de titre légales).

## 3. Architecture des 4 stages de défense

```
┌─────────┐   ┌────────────────────┐   ┌─────────────────────┐   ┌──────────┐
│  LLM    │ → │parseAndValidateLLM │ → │Pillar Gateway      │ → │Renderer  │
│ output  │   │(prune malformed   │   │(strictSchema      │   │(defensive │
│         │   │ items)            │   │ validation block) │   │ filter)  │
└─────────┘   └────────────────────┘   └─────────────────────┘   └──────────┘
   raw           Stage 1: shape         Stage 2: belt+suspender   Stage 3: legacy
                 enforcement at         against post-prune        data tolerance
                 boundary               drift / regressions
```

Chaque stage est nécessaire, aucun n'est suffisant seul :

- Stage 1 (parser) : couvre les sorties LLM directes.
- Stage 2 (gateway) : couvre les autres écritures (Glory tools, recos appliquées, mutations mid-pipeline).
- Stage 3 (renderer) : couvre les Pillar.content legacy et les Pillar.content écrits via `skipValidation: true` (ingestion).

## 4. Conséquences

### 4.1. Positives

- Les 36 rectangles vides ne réapparaîtront plus côté Makrea (et toute autre marque) après une ré-exécution de `PROTOCOLE_I` — les items sans `action` sont droppés au point d'extraction.
- Le pattern est **réutilisable** : tout futur call-site LLM peut adopter `parseAndValidateLLM` en une ligne.
- La gateway gagne un mode strict opt-in qui peut être activé progressivement sur d'autres call-sites (Glory tools, ingestion validée) au cas par cas, sans casser la back-compat.
- Détection précoce des dérives schema : si un schéma Zod évolue et qu'un protocole LLM continue à produire l'ancienne shape, le `console.warn` + le `Strict schema validation failed` rendent visible le drift.

### 4.2. Négatives / Tradeoffs

- **Sous-effectif silencieux possible** : pour les schémas avec `.min(N)` au parent qu'on a contournés (Risk), si le LLM produit 3 items au lieu des 5 demandés, le pruner ne le détecte pas. Mitigation : log explicite en warnings ; le step CALC suivant (`buildHypothesisTestActions`, `buildRiskMitigationActions`, etc.) traite le sous-effectif comme un cas normal.
- **Coût CPU négligeable** : Zod safeParse sur des objets de quelques centaines de KB max. Negligible vs le coût LLM (~5–8s par appel).
- **Données legacy** : les Pillar.i.content déjà persistés avec items malformés ne sont PAS auto-corrigés — il faudra ré-exécuter `PROTOCOLE_I` pour ces stratégies. Le filtre défensif renderer évite l'affichage de fantômes en attendant.

### 4.3. Non concerné par cette ADR

- Les autres call-sites LLM (Glory tools, Notoria recommendations, ingestion brief, quick-intake) — ils continuent à utiliser `extractJSON` cast direct. Migration incrémentale via PRs séparées suivant le même pattern.
- Le bug "validation non-bloquante" persiste pour les call-sites qui n'opt-in pas `strictSchemaValidation: true` — c'est volontaire (back-compat).
- Pas de migration data : les Pillar.content legacy restent. Re-run `PROTOCOLE_I` au cas par cas.

## 5. Validation

- Tests unitaires : [tests/unit/services/parse-validate-llm.test.ts](../../../tests/unit/services/parse-validate-llm.test.ts) — 12 tests, dont reproduction explicite du bug catalogueParCanal.
- TypeCheck : `npx tsc --noEmit` propre.
- Lint : `npx eslint <fichiers touchés>` 0 errors.
- Test régression `tests/unit/services/llm-gateway.test.ts` (extractJSON) — 26 tests passent.

## 6. Files touched

**Nouveaux** :
- `src/server/services/llm-gateway/parse-validate.ts`
- `tests/unit/services/parse-validate-llm.test.ts`
- `docs/governance/adr/0052-strict-llm-output-validation.md` (this ADR)

**Modifiés** :
- `src/server/services/utils/llm.ts` (re-export)
- `src/server/services/rtis-protocols/innovation.ts` (sub-schema + parseAndValidateLLM)
- `src/server/services/rtis-protocols/risk.ts` (sub-schema + parseAndValidateLLM)
- `src/server/services/rtis-protocols/track.ts` (sub-schema + parseAndValidateLLM, VALIDATED-downgrade preserved)
- `src/server/services/rtis-protocols/strategy.ts` (sub-schema + parseAndValidateLLM)
- `src/server/services/rtis-protocols/index.ts` (`persistViaGateway` returns + strict opt-in)
- `src/server/services/pillar-gateway/index.ts` (`strictSchemaValidation` option + block path)
- `src/server/services/mestor/hyperviseur.ts` (4 cases `PROTOCOLE_*` enable strict)
- `src/lib/types/pillar-schemas.ts` (export item-level schemas)
- `src/components/cockpit/field-renderers.tsx` (defensive filter + title fallback)

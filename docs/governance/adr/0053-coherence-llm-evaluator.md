# ADR-0052-B — Coherence LLM evaluator (promotion `coherence.bigIdeaCoherence` + `coherence.mythArc` MVP → PRODUCTION)

**Date** : 2026-05-06
**Statut** : Proposed (enfant de [ADR-0052](0052-campaign-module-canonical-trajectory-instrument.md))
**Phase** : 19 — Campaign tracker Cluster B promotion
**Parent** : ADR-0052 v2 §16 ligne #5 + matrice promotions PARTIAL→PRODUCTION
**Glory tools concernés** : `big-idea-coherence-checker`, `myth-arc-cohesion-evaluator` (déclarés [PHASE19_TOOLS](../../../src/server/services/artemis/tools/phase19-tools.ts))

## Contexte

Vague 1 a shippé 2 sous-clusters Cluster B en mode `READY/MVP` avec heuristic Jaccard tokens :
- `coherence.bigIdeaCoherence` — score 0..1 d'une CampaignAction vs BigIdea + Manifesto snapshots Campaign
- `coherence.mythArc` — score similarity entre BigIdea snapshots N et N-1 d'une Strategy

**Limitation MVP** : Jaccard est lexical-only. Faux-négatifs garantis quand un copy est refondu en synonymes alignés sémantiquement (ex: "héros du quotidien" vs "champion ordinaire" → Jaccard 0, sémantique 0.85+). PRODUCTION exige un evaluator LLM.

## Décision

Promotion `MVP → PRODUCTION` via les 2 Glory tools dédiés déjà déclarés dans le registry EXTENDED (Phase 19 Vague 3).

### §1 — Cible PRODUCTION pour `coherence.bigIdeaCoherence`

Le handler `checkBigIdeaCoherence` ([coherence.ts:130](../../../src/server/services/campaign-tracker/coherence.ts)) bascule de l'heuristic Jaccard vers `executeTool("big-idea-coherence-checker", ...)` quand `Strategy.evaluatorMode === "llm"` ou via `forceMethod: "llm"` input.

Output type-mappé :
```ts
{
  score: 0..1,                  // = JSON.score du LLM
  rationale: string,            // = JSON.rationale (NEW field — ajouter au type BigIdeaCoherenceResult)
  manipulationDrift: boolean,   // = JSON.manipulationDrift (cross-check serveur côté Strategy.manipulationMix)
  redFlags: string[],
  alignmentSignals: string[]
}
```

### §2 — Cible PRODUCTION pour `coherence.mythArc`

Le handler `evaluateMythArcCohesion` ([myth-arc.ts:30](../../../src/server/services/campaign-tracker/myth-arc.ts)) bascule pour chaque paire (N, N-1) vers `executeTool("myth-arc-cohesion-evaluator", ...)` quand `Strategy.evaluatorMode === "llm"`.

### §3 — Quality gate de promotion

`MVP → PRODUCTION` admis quand les 2 conditions sont remplies :
1. ROC analysis sur ≥30 actions étiquetées manuellement par opérateur — Glory tool LLM doit dépasser AUC ≥ 0.85 vs Jaccard baseline
2. Coût p95 par action ≤ 0.05 USD (SLO `CHECK_BIG_IDEA_COHERENCE` actuel 8s / $0.05 — préservé)

### §4 — Migration des sous-clusters

Capability state passe de `READY` à `READY` (aucun changement runtime). `lifecycle` passe de `MVP` à `PRODUCTION`. Le `Strategy.evaluatorMode` (nouveau field, à ajouter au schema) contrôle le mode par tenant — opt-in.

## Conséquences

### Positives
- Élimine les faux-négatifs lexicaux (synonymes sémantiquement alignés)
- Fournit `rationale` + `redFlags` exploitables UI Cockpit (tracker page enrichie)
- Promotion sans rupture API — ajout `Strategy.evaluatorMode` opt-in default `"lexical"` rétrocompat

### Négatives
- Coût LLM par action (~$0.05) — multiplie par N actions par campagne
- Latence p95 ↑ 8s (vs Jaccard ~50ms)
- Drift sémantique LLM possible si prompt template mute — anti-drift via `promptHash` (cf. [ADR-0042](0042-sequence-modes-and-lifecycle.md))

## Open work
- Ajouter `Strategy.evaluatorMode: String?` au schema Prisma (default null = "lexical")
- Câbler `executeTool` invocation dans `checkBigIdeaCoherence` + `evaluateMythArcCohesion`
- Test ROC : `tests/integration/campaign-tracker/coherence-llm-roc.test.ts`
- UI Cockpit `/cockpit/operate/campaigns/[id]/tracker` : afficher `rationale` + `redFlags` quand mode=llm

# ADR-0042 — Modes first-class + lifecycle versioning sequences

**Status** : Accepted
**Date** : 2026-05-04
**Phase** : 17 — Refonte rigueur Artemis (mégasprint NEFER F1→F11)
**Supersedes** : aucun
**Related** : [ADR-0039](0039-sequence-as-unique-public-unit.md), [ADR-0041](0041-sequence-robustness-loop.md), [NEFER.md](../NEFER.md) §3

---

## Contexte

Audit gouvernance NEFER 2026-05-04 a révélé F8 + F9 :

### F8 — `_oracleEnrichmentMode` est un flag ad-hoc enfoui

[sequence-executor.ts:90-107](../../../src/server/services/artemis/tools/sequence-executor.ts:90) — `_oracleEnrichmentMode: boolean` est un flag interne du `SequenceContext`, passé à la main par [enrich-oracle.ts:909](../../../src/server/services/strategy-presentation/enrich-oracle.ts:909) `executeSequence(seqKey, strategyId, { _oracleEnrichmentMode: true })`. Pas de type union `SequenceMode = "ENRICHMENT" | "PRODUCTION" | "FORGE" | "AUDIT" | "PREVIEW"` — c'est un boolean.

→ Demain quand on ajoutera un mode "audit" ou "preview" il faudra encore un flag ad-hoc. L'audit cross-mode (combien de sequences tournées en mode ENRICHMENT vs PRODUCTION ?) n'est pas requêtable en DB — le mode n'existe nulle part en persistance.

### F9 — `refined: false` partout : versioning effectif inexistant

`grep -c "refined: false" sequences.ts` → 40. `grep -c "refined: true" sequences.ts` → 3. [sequences.ts:107-108](../../../src/server/services/artemis/tools/sequences.ts:107) commentaire dit "True if the sequence has been refined and validated" mais aucun mécanisme dans le sequence-executor ne fait de différence entre `refined: true` et `refined: false`.

→ Le champ existe mais n'a aucun effet → false advertising. Pas de promotion explicite "draft → refined" trackée en governance. Pas d'anti-drift sur `promptTemplate` hash : un tool/sequence peut voir son prompt modifié sans que son `refined` ne soit invalidé.

## Décision

### §1 — `SequenceMode` first-class

Type union dans [sequences.ts](../../../src/server/services/artemis/tools/sequences.ts) :

```ts
export type SequenceMode = "ENRICHMENT" | "PRODUCTION" | "FORGE" | "AUDIT" | "PREVIEW";
```

Ajouté à `GlorySequenceDef` ([sequences.ts:96-113](../../../src/server/services/artemis/tools/sequences.ts:96)) — champ obligatoire pour les nouvelles sequences (CORE/DERIVED/WRAP). Sequences existantes (PILLAR, PRODUCTION, …) reçoivent `mode: "PRODUCTION"` par défaut via codemod auto.

`SequenceContext` ([sequence-executor.ts:65+](../../../src/server/services/artemis/tools/sequence-executor.ts:65)) — `_oracleEnrichmentMode: boolean` deprecated → `mode: SequenceMode`. Wrapper backward-compat 1 semaine : si `_oracleEnrichmentMode === true` et pas de `mode`, on infère `"ENRICHMENT"` + warn.

[enrich-oracle.ts:909](../../../src/server/services/strategy-presentation/enrich-oracle.ts:909) — `executeSequence(sequenceKey, strategyId, { _oracleEnrichmentMode: true })` → `executeSequence(sequenceKey, strategyId, { mode: "ENRICHMENT" })`.

`shouldChainPtahForge` ([sequence-executor.ts:43-58](../../../src/server/services/artemis/tools/sequence-executor.ts:43)) — refactor signature : `({ hasForgeOutput, oracleEnrichmentMode })` → `({ hasForgeOutput, mode })`. Skip si `mode ∈ {"ENRICHMENT", "AUDIT", "PREVIEW"}`. Chain actif uniquement en `PRODUCTION` ou `FORGE`.

Stocké dans `SequenceExecution.mode` (cf. [ADR-0041](0041-sequence-robustness-loop.md) migration Prisma). Audit cross-mode requêtable.

### §2 — `SequenceLifecycle` first-class

Type union :

```ts
export type SequenceLifecycle = "DRAFT" | "STABLE" | "DEPRECATED";
```

Ajouté à `GlorySequenceDef` — champ obligatoire. Codemod migration : 40 occurrences `refined: false` → ajout `lifecycle: "DRAFT"`. 3 occurrences `refined: true` → ajout `lifecycle: "STABLE"`. Le champ `refined` reste comme alias rétrocompat pendant 1 semaine, puis retiré.

### §3 — Hash `promptHash` calculé au build

```ts
function computePromptHash(seq: GlorySequenceDef): string {
  const tools = seq.steps
    .filter(s => s.type === "GLORY")
    .map(s => getGloryTool(s.ref)?.promptTemplate ?? "");
  const concatenated = tools.join("\n---\n").replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(concatenated).digest("hex").slice(0, 16);
}
```

Stocké dans `SequenceExecution.promptHash` (cache + audit) et dans la définition `GlorySequenceDef.promptHash` (généré au build, frozen pour STABLE).

Whitespace + casing normalisés avant hash pour éviter les false positives sur reformatting.

### §4 — Intent `PROMOTE_SEQUENCE_LIFECYCLE`

[mestor/intents.ts](../../../src/server/services/mestor/intents.ts) — nouveau Intent :

```ts
| {
    kind: "PROMOTE_SEQUENCE_LIFECYCLE";
    sequenceKey: GlorySequenceKey;
    fromLifecycle: SequenceLifecycle;
    toLifecycle: SequenceLifecycle;
    operatorId: string;
    justification: string;
    strategyId: "(governance)";
  }
```

Handler dans [commandant.ts](../../../src/server/services/artemis/commandant.ts) :
- Valide la transition : DRAFT → STABLE → DEPRECATED uniquement. Jamais en arrière sans justification + ADR.
- Recalcule `promptHash` au moment de la promotion vers STABLE.
- Stocke dans `IntentEmission` avec hash chain (audit complet).

SLO ajouté dans [governance/slos.ts](../../../src/server/governance/slos.ts) : `PROMOTE_SEQUENCE_LIFECYCLE` p95 < 5s.

### §5 — Anti-drift CI sur prompt hashes

Test bloquant `tests/unit/governance/sequence-prompt-drift.test.ts` :

```ts
test("STABLE sequences have a frozen promptHash matching current code", () => {
  for (const seq of ALL_SEQUENCES.filter(s => s.lifecycle === "STABLE")) {
    const current = computePromptHash(seq);
    expect(current).toBe(seq.promptHash);
  }
});
```

Toute modification d'un `promptTemplate` d'une sequence STABLE → CI fail. Le contributeur doit soit :
1. Émettre un `PROMOTE_SEQUENCE_LIFECYCLE` Intent (DRAFT → STABLE → re-frozen new hash)
2. Soit revert en DRAFT temporairement le temps d'itérer

DRAFT sequences : pas de check, peuvent dériver librement.

## Conséquences

### Bénéfices

- **F8 fermée** : mode requêtable en DB, cross-mode audit possible (ex: "combien de sequences PREVIEW ont tourné cette semaine ?")
- **F9 fermée** : promotion DRAFT → STABLE explicite via Intent gouverné, prompt hash frozen, anti-drift CI bloquante
- **Continuité narrative** : sequences STABLE ne dérivent pas silencieusement
- **Symétrie avec lifecycle existant** : `BrandAsset.state ∈ {DRAFT, ACTIVE, …}` patterns connus

### Coûts

- **Migration codemod** sur 43 sequences existantes (40 DRAFT + 3 STABLE) — automatisable
- **Prompt hash compute** au build → +50 ms compile time, négligeable
- **Tests anti-drift** sur 3 STABLE actuelles — faible coût mais maintenance accrue à chaque PR qui touche sequences/glory tools

### Risques

- **False positives prompt hash** sur reformatting whitespace → mitigé par normalisation avant hash
- **Promotion DRAFT → STABLE non rituelle** au démarrage → les 21 nouvelles sequences (CORE+DERIVED) restent DRAFT, audit qualité narrative requis avant promotion (tracking [RESIDUAL-DEBT.md](../RESIDUAL-DEBT.md))
- **Backward compat `_oracleEnrichmentMode`** 1 semaine → rappel suppression dans calendrier post-merge

## Open work

- Promotion `lifecycle: "STABLE"` des 21 nouvelles sequences après stress-test prolongé (1 mois) + audit narratif manuel
- Suppression backward-compat `_oracleEnrichmentMode` 1 semaine post-merge
- Suppression alias `refined: true|false` 1 mois post-merge

## Références implémentation

- Fichiers modifiés : [sequences.ts](../../../src/server/services/artemis/tools/sequences.ts), [sequence-executor.ts](../../../src/server/services/artemis/tools/sequence-executor.ts), [mestor/intents.ts](../../../src/server/services/mestor/intents.ts), [commandant.ts](../../../src/server/services/artemis/commandant.ts), [governance/slos.ts](../../../src/server/governance/slos.ts)
- Fichiers nouveaux : `src/server/services/artemis/tools/sequence-hash.ts`
- Tests nouveaux : `tests/unit/governance/sequence-prompt-drift.test.ts`, `tests/unit/sequence/mode-first-class.test.ts`, `tests/unit/sequence/lifecycle-versioning.test.ts`, `tests/integration/governance/promote-lifecycle-intent.test.ts`
- Migration Prisma déjà couverte par [ADR-0041](0041-sequence-robustness-loop.md) §2 (`mode`, `lifecycle`, `promptHash` colonnes)

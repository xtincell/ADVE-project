# Story: Fix RTIS T Pillar Completion — Decoupling Enrichir + CALC Fallbacks for marketReality/weakSignalAnalysis

Status: review

---

## NEFER Pre-flight

```
C1 ✓  CLAUDE.md + recent ADRs (0084-0087) read. Phase 23 CLOSED.
C2 ✓  CODE-MAP grep: "marketReality" → PillarTSchema field (no new model); "weakSignalAnalysis" → PillarTSchema field; "runMarketIntelligence" → seshat/tarsis barrel; "handleRegenerate" → pillar-page.tsx. Zero new entities — pure extension.
C3 ✓  Canonical terms: "T pilier" = pilier Track (Réalité Marché). Intent: ENRICH_T_FROM_ADVE_R_SESHAT. "Enrichir" = vault scan op. "Recalculer ce pilier" = RTIS cascade trigger.
C4 ✓  APOGEE: (1) CALC fallback → no altitude regression; (2) T stays downstream of R; (3) fewer LLM calls = fuel conserved.
Phase label: out-of-scope (post-sprint critical bug fix, justified below)
Mission link: T pillar reaching COMPLETE enables Oracle §12–15 (Realité Marché, Overton, TAM/SAM/SOM) — required for superfan measurement and Overton scoring (Phase 23 mechanics).
CODE-MAP grep: marketReality / weakSignalAnalysis / handleRegenerate — all extend existing code, no new ADR required.
```

---

## Story

As an operator using La Fusée Cockpit,  
I want the T pillar (Réalité Marché) to reliably reach 100% Complet after clicking "Recalculer ce pilier",  
so that all Oracle sections depending on T data are unlocked and the Enrichir button on RTIS pages does only what it says (vault scan) without silently triggering a 90s LLM cascade.

---

## Root Cause Analysis (MANDATORY READ before touching any file)

Three distinct bugs combine to block T at 70%:

### Bug 1 — `marketReality` has no CALC fallback (primary blocker)

**File**: `src/server/services/seshat/tarsis/index.ts` · `runMarketIntelligence()`  
**Line**: 244–250 (LLM parse) + 252–261 (metadata injection)

`runMarketIntelligence` asks the LLM for `marketReality` in the system prompt JSON spec (lines 220–223). The response is parsed with a bare `JSON.parse`. If the LLM truncates its output, skips the field, or uses different key names (e.g. `macro_trends` instead of `macroTrends`), `pillarContent.marketReality` is `undefined`. No CALC fallback exists.

`weakSignals` and `freshSignals` — the exact data needed to derive `marketReality` — are already available at that point but never used to build the field.

### Bug 2 — `weakSignalAnalysis = []` when no signals → `non_empty` fails

**File**: `src/server/services/seshat/tarsis/index.ts`  
**Line**: 255 — `pillarContent.weakSignalAnalysis = weakSignals;`

When no fresh signals are collected and no sector knowledge is reused, `weakSignals = []` from the Tarsis analyzer. The code unconditionally writes `pillarContent.weakSignalAnalysis = []`. The assessor's `non_empty` validator rejects an empty array → field marked missing → blocks COMPLETE even though the data absence is legitimate.

### Bug 3 — `handleRegenerate` chains vault scan + RTIS cascade silently

**File**: `src/components/cockpit/pillar-page.tsx`  
**Lines**: 247–264

For RTIS pillars, "Enrichir" runs:
1. `vaultEnrichMutation` (generates Notoria recs, ~10s)
2. `actualizeMutation` (RTIS cascade = full `runMarketIntelligence` + LLM, ~60–80s)

This makes the button appear to spin for 90s with no intermediate feedback. The cascade result is invisible to the user. "Recalculer ce pilier" already exposes the cascade as a standalone action — combining both is redundant and misleading.

---

## Acceptance Criteria

**AC1 — marketReality always populated after cascade**  
After `runMarketIntelligence` completes, `pillarContent.marketReality` is always a non-empty object `{ macroTrends: string[], weakSignals: string[] }` with at least 1 item in each array. If the LLM did not return it, a CALC fallback derives it from available data.

**AC2 — weakSignalAnalysis not written as empty array**  
If `weakSignals.length === 0`, `pillarContent.weakSignalAnalysis` is NOT set (left undefined). The assessor can then mark it as derivable and the auto-filler can attempt generation in a subsequent pass. If `weakSignals.length > 0`, it IS written.

**AC3 — T pillar reaches ≥90% Complet after Recalculer ce pilier**  
Running `actualizePillar(strategyId, "T")` on a strategy with complete ADVE + R produces a T pillar where `assessPillar("t", content)` returns `completionPct >= 90`. The remaining gap (if any) is only `traction` (needsHuman) and optionally `weakSignalAnalysis` if no market data is available.

**AC4 — Enrichir on RTIS pillar pages does vault scan only**  
On `/cockpit/brand/market` (and all RTIS pillar pages), clicking "Enrichir":
- Runs `vaultEnrichMutation` only
- Shows toast: "N reco(s) générée(s) depuis le vault — à valider dans Notoria. Utilise **Recalculer ce pilier** pour lancer la cascade Track."
- Does NOT call `actualizeMutation`
- Spinner stops in <20s

**AC5 — Recalculer ce pilier remains the cascade trigger**  
The "Recalculer ce pilier" button continues to call `actualizeMutation` independently. Its behavior is unchanged.

**AC6 — Unit test verifies marketReality is always in result**  
A unit test in `tests/unit/services/tarsis/` (or adjacent) calls `runMarketIntelligence` with a mock strategy and asserts `result.pillarContent.marketReality` is a non-empty object with `macroTrends` and `weakSignals` arrays.

**AC7 — Governance tests stay green**  
`npx vitest run tests/unit/governance/` passes 768/768.

---

## Tasks / Subtasks

### Task 1 — Fix `runMarketIntelligence` in `seshat/tarsis/index.ts` (Bugs 1 + 2)

- [x] 1.1 After LLM parse (line ~247), add CALC fallback for `marketReality`:
  ```typescript
  // CALC fallback — derive from available signal data if LLM skipped it
  if (!pillarContent.marketReality || typeof pillarContent.marketReality !== "object") {
    const macroTrends = freshSignals.length > 0
      ? freshSignals.slice(0, 5).map((s) => s.title).filter(Boolean)
      : (existingData as Array<{ type?: string; title?: string }>).slice(0, 5).map((e) => e.title ?? String(e.type)).filter(Boolean);
    const weakSignalTheses = weakSignals.slice(0, 3).map((ws) => ws.thesis).filter(Boolean);
    pillarContent.marketReality = {
      macroTrends: macroTrends.length > 0 ? macroTrends : ["Données marché en cours de collecte"],
      weakSignals: weakSignalTheses.length > 0 ? weakSignalTheses : ["Signaux faibles à analyser"],
    };
  }
  ```

- [x] 1.2 Fix `weakSignalAnalysis` assignment (line ~255): only write if non-empty:
  ```typescript
  // Before: pillarContent.weakSignalAnalysis = weakSignals;
  // After:
  if (weakSignals.length > 0) {
    pillarContent.weakSignalAnalysis = weakSignals;
  }
  // When empty, leave undefined — assessor marks derivable, auto-filler handles next pass
  ```

- [x] 1.3 Verify the `marketReality` validation: schema requires `macroTrends: z.array(textShort).min(3)` and `weakSignals: z.array(textShort).min(2)`. Ensure fallback produces at least 3 macroTrends and 2 weakSignals. Pad with placeholder strings if needed to pass min() constraint.

### Task 2 — Decouple `handleRegenerate` in `pillar-page.tsx` (Bug 3)

- [x] 2.1 In `handleRegenerate` (line ~258 for RTIS path), remove the `actualizeMutation.mutateAsync` call:
  ```typescript
  // BEFORE (RTIS path):
  } else {
    await actualizeMutation.mutateAsync({ strategyId, key: upperKey });
    filledCount = -1;
  }
  
  // AFTER:
  } else {
    // Enrichir = vault scan only. Cascade = "Recalculer ce pilier" button.
    filledCount = -1; // vault recs generated, cascade not triggered
  }
  ```

- [x] 2.2 Update the toast message for RTIS path (lines ~272–280). When `!isAdve` and `filledCount === -1`:
  ```typescript
  if (vaultRecoCount > 0) {
    parts.push(`${vaultRecoCount} reco(s) vault à valider dans Notoria`);
    parts.push("Utilise **Recalculer ce pilier** pour lancer la cascade Track");
  } else {
    parts.push("Aucune recommandation vault — utilise Recalculer ce pilier pour générer le contenu");
  }
  ```

- [x] 2.3 Ensure the `autoFillMutation` path for ADVE pillars is UNCHANGED (only RTIS path is modified).

### Task 3 — Revert partial prompt patch in `rtis-protocols/track.ts`

The patch added `marketReality` and `weakSignalAnalysis` to `TrackLLMResponseSchema` and the prompt in `track.ts`. This file is used for the **fallback LLM path** when `runMarketIntelligence` fails. Keep the patch — it improves the fallback path as belt-and-suspenders. No revert needed.

**BUT**: the fallback prompt in `rtis-cascade.ts` (line ~384, `RTIS_PROMPTS.T`) may not request `marketReality`. Check and add if missing.

- [x] 3.1 Read `src/server/services/mestor/rtis-cascade.ts` — find `RTIS_PROMPTS.T` definition. If it doesn't include `marketReality` in the JSON spec, add it.

### Task 4 — Unit test for AC6

- [x] 4.1 Create `tests/unit/services/tarsis/market-intelligence.test.ts`:
  - Mock `collectMarketSignals` to return empty array (worst case)
  - Mock `analyzeWeakSignals` to return `[]`
  - Mock `callLLM` to return valid JSON without `marketReality`
  - Assert `result.pillarContent.marketReality` is non-empty object
  - Assert `result.pillarContent.weakSignalAnalysis` is undefined (not `[]`)

- [x] 4.2 Add a second test case where LLM returns complete JSON including `marketReality`:
  - Assert the LLM-provided value is used (not overwritten by CALC fallback)
  - Assert `weakSignalAnalysis` IS set when `weakSignals.length > 0`

### Task 5 — Run governance tests (AC7)

- [x] 5.1 `npx tsc --noEmit` — 0 errors
- [x] 5.2 `npx vitest run tests/unit/governance/` — 768/768 pass

---

## Dev Notes

### Architecture — owning services

| Concern | Owner | File |
|---|---|---|
| T pillar generation | **Seshat** (Tarsis sub-component) | `src/server/services/seshat/tarsis/index.ts` |
| RTIS cascade orchestration | **Mestor** | `src/server/services/mestor/rtis-cascade.ts` |
| Pillar page UI | Cockpit component | `src/components/cockpit/pillar-page.tsx` |
| Maturity contracts | Domain | `src/lib/types/pillar-maturity-contracts.ts` |
| Gateway (write path) | Pillar Gateway | `src/server/services/pillar-gateway/index.ts` |

### Critical invariants to preserve

1. **LOI 1 (pillar writes)**: All T pillar content writes MUST go through `writePillarAndScore` — never `writePillar` directly or raw Prisma. `runMarketIntelligence` already does this correctly at line 267.

2. **MERGE_DEEP semantics**: `runMarketIntelligence` uses `MERGE_DEEP` (not `REPLACE_FULL`). The CALC fallback for `marketReality` must set the key on `pillarContent` BEFORE the `writePillarAndScore` call (line 267), not after.

3. **`traction` is `needsHuman`**: Already in `NEEDS_HUMAN_BY_PILLAR["t"]`. Do NOT attempt to generate it. It's excluded from COMPLETE derivable requirements.

4. **Auto-filler 3-pass limit**: If `weakSignalAnalysis` is left undefined, the auto-filler will attempt to generate it via AI in subsequent `fillToStage` calls. This is acceptable — it's the designed fallback. The fix here is to NOT break this path by setting an empty array.

5. **Notoria chips**: After T pillar reaches COMPLETE, `reconcileCompletionLevelCache` fires via `writePillarAndScore` → Notoria chips update automatically. No extra wiring needed.

### RTIS_PROMPTS.T location

Look for `RTIS_PROMPTS` const in `src/server/services/mestor/rtis-cascade.ts`. The `T` entry is the fallback LLM prompt used when `runMarketIntelligence` throws. It's a plain string template — add `marketReality` to its JSON spec if missing (same format as in `seshat/tarsis/index.ts` line 220–223).

### T pillar schema fields quick reference

From `src/lib/types/pillar-schemas.ts`:

| Field | Type | Required | Generated by |
|---|---|---|---|
| triangulation | object | yes | CALC (buildTriangulation) |
| hypothesisValidation | array min(5) | yes | LLM (runMarketIntelligence) |
| tamSamSom | object | yes | LLM (runMarketIntelligence) |
| riskValidation | array min(1) | yes | LLM (runMarketIntelligence) |
| overtonPosition | object | optional | LLM (runMarketIntelligence) |
| perceptionGap | object | optional | LLM (runMarketIntelligence) |
| competitorOvertonPositions | array | optional | LLM (runMarketIntelligence) |
| brandMarketFitScore | number | optional | CALC (calculateBMF) |
| **marketReality** | object | optional | **LLM + CALC fallback (this story)** |
| **weakSignalAnalysis** | array | optional | **Tarsis analyzer (fix empty handling)** |
| marketDataSources | array | optional | CALC (freshSignals.map) |
| lastMarketDataRefresh | string | optional | CALC (new Date().toISOString()) |
| sectorKnowledgeReused | boolean | optional | CALC (sectorReused) |
| traction | object | optional | **needsHuman** — operator only |

### ENRICHED_T requirements (6 fields — all satisfied when T is ENRICHED)

triangulation, hypothesisValidation, tamSamSom, riskValidation, overtonPosition, perceptionGap

These are already passing (`enrichedPct = 100%` confirmed in prod). Do not regress them.

### COMPLETE requirements delta (what's missing at 70%)

COMPLETE = ENRICHED_T (6) + schema-derived top-level (14 minus traction = 13) + glory-tool binding paths

The missing fields at 70% are primarily `marketReality` and potentially `weakSignalAnalysis` when no signals exist.

### Uncommitted patches to integrate (not revert)

The session before this story applied partial fixes. These are CORRECT and should be kept:

| File | Change | Keep? |
|---|---|---|
| `src/server/services/pillar-gateway/index.ts` | upsert before tx (pillar not found fix) | ✅ Keep |
| `src/components/cockpit/notoria/notoria-page.tsx` | onError + feedback banner | ✅ Keep |
| `src/server/services/notoria/lifecycle.ts` | server logs on gateway failure | ✅ Keep |
| `src/server/services/rtis-protocols/track.ts` | marketReality + weakSignalAnalysis in fallback schema | ✅ Keep (belt-and-suspenders for fallback path) |
| `src/lib/types/pillar-maturity-contracts.ts` | traction → needsHuman | ✅ Keep |
| `tests/unit/governance/no-bare-writepillar.test.ts` | allowlist line 593 | ✅ Keep |

### pillar-page.tsx handleRegenerate — current RTIS flow (lines 247–264)

```typescript
} else {
  await actualizeMutation.mutateAsync({ strategyId, key: upperKey }); // ← REMOVE THIS LINE
  filledCount = -1; // signal "RTIS cascade ran"
}
```

The `actualizeMutation` is declared at line ~146:
```typescript
const actualizeMutation = trpc.pillar.actualize.useMutation({
  onSuccess: () => pillarQuery.refetch()
});
```

After the fix, `actualizeMutation` is ONLY called by "Recalculer ce pilier" button (which already exists, separate from "Enrichir").

### marketReality schema constraint

`marketReality` in `PillarTSchema` (pillar-schemas.ts):
```typescript
marketReality: z.object({
  macroTrends: z.array(textShort).min(3),
  weakSignals: z.array(textShort).min(2),
}).optional(),
```

The CALC fallback MUST produce at least 3 macroTrends and 2 weakSignals to pass schema validation. If signal data provides fewer items, pad with contextual placeholders:
- macroTrends fallback: `["Tendance sectorielle en cours d'analyse", "Signaux économiques collectés", "Dynamiques concurrentielles à surveiller"]`
- weakSignals fallback: `["Signal faible à confirmer", "Indicateur précurseur en observation"]`

### References

- `runMarketIntelligence`: [Source: src/server/services/seshat/tarsis/index.ts#126-335]
- `handleRegenerate`: [Source: src/components/cockpit/pillar-page.tsx#220-282]
- `actualizePillar("T")`: [Source: src/server/services/mestor/rtis-cascade.ts#372-391]
- `PillarTSchema`: [Source: src/lib/types/pillar-schemas.ts#924-1057]
- `ENRICHED_T`: [Source: src/lib/types/pillar-maturity-contracts.ts#132-141]
- `NEEDS_HUMAN_BY_PILLAR`: [Source: src/lib/types/pillar-maturity-contracts.ts#183-196]
- `isFieldSatisfied non_empty`: [Source: src/server/services/pillar-maturity/assessor.ts#44-50]
- Pillar Gateway LOI 1: [Source: src/server/services/pillar-gateway/index.ts#1-20]
- ADR-0063 strict schema: [Source: docs/governance/adr/0063-*.md] — apply Zod validation at LLM boundary

---

## Verification Protocol

After implementation, verify with this sequence:

1. `npx tsc --noEmit` → 0 errors
2. `npx vitest run tests/unit/governance/` → 768/768
3. `npx vitest run tests/unit/services/tarsis/` → all pass (including new AC6 tests)
4. Start dev server, navigate to `/cockpit/brand/market`
5. Click "Enrichir" → spinner stops in <20s, toast shows "N reco(s) vault à valider dans Notoria — Utilise Recalculer ce pilier..."
6. Click "Recalculer ce pilier" → spinner (60–90s), then `Complet%` updates above 70%
7. In Notoria, `T` chip updates to reflect new completion level

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Session analysis: T pillar stuck at 70% due to missing CALC fallback for marketReality + empty weakSignalAnalysis written unconditionally
- Confirmed: `weakSignalAnalysis` IS injected from Tarsis analyzer (line 255 tarsis/index.ts) but set to [] when no signals
- Confirmed: `marketReality` depends entirely on LLM cooperation — no fallback
- Confirmed: `handleRegenerate` chains vault + cascade — 90s spin, no intermediate feedback
- Partial patches applied in prior session (see "Uncommitted patches" section above)

### Completion Notes List

- Bug 1 fixed: CALC fallback for `marketReality` inserted in `runMarketIntelligence` after LLM parse — derives from `freshSignals`/`existingData` titles + `weakSignals` theses, pads to schema min(3)/min(2) with French placeholders. LLM-provided value is preserved when present.
- Bug 2 fixed: `weakSignalAnalysis` is now guarded with `if (weakSignals.length > 0)` — empty array no longer written, assessor's `non_empty` validator no longer trips on zero-signal runs.
- Bug 3 fixed: `actualizeMutation.mutateAsync` removed from `handleRegenerate` RTIS path — Enrichir now runs vault scan only. Toast updated to guide user toward "Recalculer ce pilier" for the cascade. ADVE path (`autoFillMutation`) unchanged.
- Task 3: `RTIS_PROMPTS.T` (fallback LLM path) now includes `marketReality` in the JSON spec — belt-and-suspenders for when `runMarketIntelligence` throws.
- 5 unit tests created and passing (5/5). 768/768 governance tests green. `tsc --noEmit` = 0 errors.

### File List

- `src/server/services/seshat/tarsis/index.ts` — MODIFIED (Tasks 1.1, 1.2, 1.3)
- `src/components/cockpit/pillar-page.tsx` — MODIFIED (Tasks 2.1, 2.2, 2.3)
- `src/server/services/mestor/rtis-cascade.ts` — MODIFIED (Task 3.1)
- `tests/unit/services/tarsis/market-intelligence.test.ts` — CREATED (Tasks 4.1, 4.2)

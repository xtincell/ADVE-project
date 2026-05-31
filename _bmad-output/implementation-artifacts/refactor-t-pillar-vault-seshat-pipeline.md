# Story: Refactor T Pillar — Vault-first, Seshat-conditional, executeProtocoleTrack terminal

Status: review

---

## NEFER Pre-flight

```
C1 ✓  CLAUDE.md + STATE_FINAL_BLUEPRINT + ADR-0037, 0060, 0085 read.
C2 ✓  CODE-MAP grep: "vault-bridge" → 0 hits (new file); "actualizePillar" → rtis-cascade.ts only;
       "collectMarketSignals" → seshat/tarsis/signal-collector.ts + tarsis/index.ts;
       "executeProtocoleTrack" → rtis-protocols/track.ts + index.ts + hyperviseur.ts.
       No entity collision. vault-bridge.ts is a new sub-module of seshat/tarsis.
C3 ✓  Canonical terms: "vault" = BrandAsset table; "Seshat" = seshat/ service + KnowledgeEntry;
       "Tarsis" = seshat/tarsis sub-component (signal collection + weak-signal analysis);
       "pillar T" = Réalité Marché; "Protocole Track" = executeProtocoleTrack.
C4 ✓  APOGEE: (1) No altitude regression — Phase 0 skip preserves existing good T data;
       (2) Stage sequencing — vault check → Seshat → T generation is additive, doesn't short-circuit;
       (3) Fuel conservation — skip-if-sufficient avoids redundant LLM calls.
Phase label: out-of-scope (post-sprint architectural fix, justified by T pillar blocking ≥90%)
Mission link: T pillar ≥90% unlocks Oracle §12–15 (TAM/SAM/SOM, Overton, Réalité Marché) →
             superfan measurement + Overton scoring (Phase 23 mission-pivot mechanics) depend on it.
```

---

## Story

As an operator clicking "Recalculer ce pilier" on the T pillar (Réalité Marché),  
I want the system to first consult existing market data in the vault and Seshat  
before triggering a full signal collection,  
so that T always reaches ≥90% complete using authoritative, traceable data — not redundant LLM calls.

---

## Root Cause (mandatory read before touching any file)

### Current broken flow

```
"Recalculer ce pilier" → actualizePillar("T") → runMarketIntelligence()
                           ├─ sectorReused=true → freshSignals=[] → skip collection
                           ├─ LLM prompt MISSING: overtonPosition, perceptionGap,
                           │   riskValidation, competitorOvertonPositions
                           ├─ runMarketIntelligence() calls writePillarAndScore() internally
                           │   → DOUBLE WRITE BUG (actualizePillar also calls savePillar)
                           └─ 4 COMPLETE fields always absent → stuck at 70%
```

### Target flow (3 phases + Phase 0 guard)

```
"Recalculer ce pilier" → actualizePillar("T"):
  Phase 0: assess current T → if completionPct ≥ 90 → return early (no DB write)
  Phase 1: buildSearchContext() → vault scan (BrandAsset market kinds)
           → if vault data found → ingestVaultToKnowledgeEntry() → KnowledgeEntry MARKET_STUDY_*/EXTERNAL_FEED_DIGEST
  Phase 2: loadCountrySectorIntelligence() → if no useful data found
           → collectMarketSignals(forceRefresh=true) → db.signal (type=EXTERNAL_SAAS)
  Phase 3: executeProtocoleTrack() → reads KnowledgeEntry + EXTERNAL_SAAS signals
                                   → generates ALL T fields
                                   → returns { content, confidence } (no internal write)
  savePillar(strategyId, "T", content, confidence)  ← single canonical write
  completion pass (lines 467-518 — already exists, do NOT touch)
```

### Why executeProtocoleTrack, not runMarketIntelligence

`executeProtocoleTrack` (rtis-protocols/track.ts) asks the LLM for ALL T fields:
- hypothesisValidation, tamSamSom, overtonPosition, perceptionGap,
  competitorOvertonPositions, riskValidation, brandMarketFitScore, marketReality, weakSignalAnalysis

`runMarketIntelligence` (seshat/tarsis/index.ts) asks for a subset and writes internally.
`executeProtocoleTrack` returns content and does NOT write — compatible with actualizePillar's write path.

### Why vault first

BrandAssets of kinds TREND_RADAR, SEO_REPORT, OVERTON_WINDOW, MCK_7S, BCG_PORTFOLIO, BAIN_NPS, MCK_3H
contain operator-curated market intelligence. This is authoritative (manual-first parity, ADR-0060).
It should populate Seshat before any LLM-simulated signal collection.

### Why change collectMarketSignals signal type

`collectMarketSignals` currently stores signals as `type: "MARKET_SIGNAL"`.
`executeProtocoleTrack`'s `loadSeshatKnowledge` reads `type: "EXTERNAL_SAAS"` only.
Changing to EXTERNAL_SAAS connects the pipeline end-to-end.

---

## Acceptance Criteria

**AC1 — Phase 0 skip**
When `assessPillar("t", currentContent).completionPct >= 90`, `actualizePillar("T")` returns
`{ pillarKey: "T", updated: false }` immediately without any DB write or LLM call.

**AC2 — Vault ingest**
When BrandAssets with market-relevant kinds (TREND_RADAR, SEO_REPORT, OVERTON_WINDOW,
MCK_7S, BCG_PORTFOLIO, BAIN_NPS, MCK_3H) exist for the strategy with state ACTIVE or CANDIDATE,
`scanVaultForMarketIntelligence` finds them and `ingestVaultToKnowledgeEntry` writes the data
into KnowledgeEntry (MARKET_STUDY_COMPETITOR, EXTERNAL_FEED_DIGEST) using the strategy's
countryCode + sector from `buildSearchContext`.

**AC3 — Seshat collection is conditional**
`collectMarketSignals` is called ONLY when:
- Vault scan found no relevant BrandAssets, AND
- `loadCountrySectorIntelligence(countryCode, sector)` returns:
  `tamSamSom === null && competitors.length === 0 && signals.macroSignals.length === 0`

**AC4 — collectMarketSignals writes EXTERNAL_SAAS**
After the change, `db.signal.create` in `signal-collector.ts` uses `type: "EXTERNAL_SAAS"`.
`executeProtocoleTrack`'s `loadSeshatKnowledge` reads those signals correctly.

**AC5 — executeProtocoleTrack generates all T fields**
After "Recalculer ce pilier" on a strategy with complete ADVE+R, the T pillar content contains:
`overtonPosition`, `perceptionGap`, `riskValidation`, `competitorOvertonPositions`,
`hypothesisValidation` (≥5 items), `tamSamSom`, `triangulation` — all non-null.

**AC6 — T pillar reaches ≥90% Complet**
`assessPillar("t", newContent).completionPct >= 90` after actualizePillar("T") completes.
The completion pass (existing, untouched) fills any remaining derivable gaps.

**AC7 — runMarketIntelligence not called by actualizePillar("T")**
The T block in `actualizePillar` imports and calls `executeProtocoleTrack`, not `runMarketIntelligence`.
`runMarketIntelligence` remains exported from `seshat/tarsis/index.ts` for other callers (background daemon, cascade).

**AC8 — Governance tests pass**
`npx vitest run tests/unit/governance/` → 768/768 (no regression).

---

## Tasks / Subtasks

### Task 1 — Create `src/server/services/seshat/tarsis/vault-bridge.ts`

- [x] 1.1 Define `MARKET_INTELLIGENCE_KINDS` constant — array of BrandAssetKind values that contain
  market data: `["TREND_RADAR", "SEO_REPORT", "OVERTON_WINDOW", "MCK_7S", "BCG_PORTFOLIO",
  "BAIN_NPS", "MCK_3H", "BCG_STRATEGY_PALETTE"]`

- [x] 1.2 Implement `scanVaultForMarketIntelligence(strategyId: string): Promise<VaultMarketSnapshot>`:
  - Query `db.brandAsset.findMany({ where: { strategyId, kind: { in: MARKET_INTELLIGENCE_KINDS }, state: { in: ["ACTIVE", "CANDIDATE"] } }, select: { id, kind, content, name, summary } })`
  - Return `{ assets: BrandAsset[], hasData: boolean, vaultAssetCount: number }`

- [x] 1.3 Implement `ingestVaultToKnowledgeEntry(strategyId, searchContext, assets)`:
  - For each asset, extract relevant market data from `asset.content`:
    - TREND_RADAR, SEO_REPORT → write `KnowledgeEntry { entryType: "EXTERNAL_FEED_DIGEST", countryCode, sector, data: { macroSignals: extractedTrends, weakSignals: [], trendTracker: null } }`
    - MCK_7S, BCG_PORTFOLIO, BCG_STRATEGY_PALETTE → write `KnowledgeEntry { entryType: "MARKET_STUDY_COMPETITOR", countryCode, sector, data: { name: "vault-import", ... } }` (best-effort extraction)
    - OVERTON_WINDOW → write `KnowledgeEntry { entryType: "EXTERNAL_FEED_DIGEST", countryCode, sector, data: { macroSignals: [{trend: asset.summary, evidence: "vault"}] } }`
    - BAIN_NPS, MCK_3H → write `KnowledgeEntry { entryType: "SECTOR_BENCHMARK", countryCode, sector, data: { source: asset.kind, content: asset.content, generatedFor: strategyId } }`
  - Idempotent: check `db.knowledgeEntry.findFirst({ where: { sector, countryCode, entryType, market: "vault-bridge" } })` before creating — skip if fresh entry exists (< 7 days)
  - Return `{ created: number }`

- [x] 1.4 Export `VaultMarketSnapshot` type and both functions from the file

### Task 2 — Fix `collectMarketSignals` signal type (`signal-collector.ts`)

- [x] 2.1 In `signal-collector.ts` line ~188, change:
  ```typescript
  // BEFORE:
  type: "MARKET_SIGNAL",
  // AFTER:
  type: "EXTERNAL_SAAS",
  ```
  This makes `loadSeshatKnowledge` in `executeProtocoleTrack` read the signals correctly.

- [x] 2.2 Check if any other code reads `Signal.type = "MARKET_SIGNAL"` — search codebase.
  If found, update those reads to also include EXTERNAL_SAAS or handle migration.
  Updated: `src/app/api/cron/sentinels/route.ts` and `src/server/services/sentinel-handlers/index.ts` now include EXTERNAL_SAAS in their in-filter.

### Task 3 — Refactor `actualizePillar("T")` in `rtis-cascade.ts`

Read `src/server/services/mestor/rtis-cascade.ts` fully before editing.
The T block is at line ~376. Critical context:
- Lines 467-518: completion pass (fills missing derivable fields after T generation) — DO NOT TOUCH
- Line 521: `savePillar(strategyId, pillarKey, newContent, confidence)` — DO NOT TOUCH (single write)
- Line 524: `recalcScores(strategyId)` — DO NOT TOUCH
- `runMarketIntelligence` import at line 24 — KEEP (used elsewhere), just stop calling from this block

- [x] 3.1 Phase 0 — Assess current T, skip if already sufficient:
  ```typescript
  } else if (pillarKey === "T") {
    // Phase 0: Skip if T is already sufficient
    const { assessPillar: assess } = await import("@/server/services/pillar-maturity/assessor");
    const { getContract } = await import("@/server/services/pillar-maturity/contracts-loader");
    const currentT = await db.pillar.findFirst({ where: { strategyId, key: "t" }, select: { content: true } });
    const currentTContent = (currentT?.content ?? null) as Record<string, unknown> | null;
    const tContract = getContract("t");
    if (currentTContent && tContract) {
      const tAssessment = assess("t", currentTContent, tContract);
      if (tAssessment.completionPct >= 90) {
        return { pillarKey, updated: false, maturityStage: tAssessment.currentStage, maturityCompletionPct: tAssessment.completionPct };
      }
    }
  ```

- [x] 3.2 Phase 1 — Vault scan and ingest:
  ```typescript
    // Phase 1: Vault → Seshat ingest
    const { buildSearchContext } = await import("@/server/services/seshat/tarsis/weak-signal-analyzer");
    const { scanVaultForMarketIntelligence, ingestVaultToKnowledgeEntry } = await import("@/server/services/seshat/tarsis/vault-bridge");
    let searchCtx: Awaited<ReturnType<typeof buildSearchContext>> | null = null;
    try {
      searchCtx = await buildSearchContext(strategyId);
      const vaultSnapshot = await scanVaultForMarketIntelligence(strategyId);
      if (vaultSnapshot.hasData && searchCtx) {
        await ingestVaultToKnowledgeEntry(strategyId, searchCtx, vaultSnapshot.assets);
      }
    } catch (err) {
      console.warn("[rtis-cascade:T] vault scan failed (non-fatal):", err instanceof Error ? err.message : err);
    }
  ```

- [x] 3.3 Phase 2 — Conditional Seshat collection:
  ```typescript
    // Phase 2: Collect if Seshat has no useful data
    if (searchCtx?.countryCode && searchCtx?.sector) {
      try {
        const { loadCountrySectorIntelligence } = await import("@/server/services/seshat/knowledge/access");
        const intelligence = await loadCountrySectorIntelligence(searchCtx.countryCode, searchCtx.sector);
        const hasSeshatData = intelligence.tamSamSom !== null
          || intelligence.competitors.length > 0
          || intelligence.signals.macroSignals.length > 0;
        if (!hasSeshatData) {
          // No vault data, no KnowledgeEntry → collect fresh signals
          const { collectMarketSignals } = await import("@/server/services/seshat/tarsis/signal-collector");
          await collectMarketSignals({
            strategyId,
            sector: searchCtx.sector,
            market: searchCtx.market,
            countryCode: searchCtx.countryCode,
            countryName: searchCtx.countryName,
            primaryLanguage: searchCtx.primaryLanguage,
            purchasingPowerIndex: searchCtx.purchasingPowerIndex,
            region: searchCtx.region,
            countryMeta: searchCtx.countryMeta,
            keywords: searchCtx.keywords,
            competitors: searchCtx.competitors,
            frequency: "DAILY",
          });
        }
      } catch (err) {
        console.warn("[rtis-cascade:T] Seshat collection failed (non-fatal):", err instanceof Error ? err.message : err);
      }
    }
  ```

- [x] 3.4 Phase 3 — executeProtocoleTrack (no internal write):
  ```typescript
    // Phase 3: Generate full T pillar via Protocole Track
    const { executeProtocoleTrack } = await import("@/server/services/rtis-protocols");
    const tResult = await executeProtocoleTrack(strategyId);
    if (tResult.error || Object.keys(tResult.content).length === 0) {
      throw new Error(`[protocole-track] ${tResult.error ?? "empty content returned"}`);
    }
    newContent = tResult.content;
    confidence = tResult.confidence;
  ```

- [x] 3.5 Close the T block. The code after (completion pass + savePillar + recalcScores) is UNCHANGED.

### Task 4 — Unit tests

- [x] 4.1 Create `tests/unit/services/tarsis/vault-bridge.test.ts`:
  - Mock `db.brandAsset.findMany` to return a TREND_RADAR asset with content
  - Mock `db.knowledgeEntry.findFirst` to return null (no existing entry)
  - Mock `db.knowledgeEntry.create` → spy
  - Call `scanVaultForMarketIntelligence("strat-1")` → assert `hasData = true`, `vaultAssetCount = 1`
  - Call `ingestVaultToKnowledgeEntry("strat-1", searchCtx, assets)` → assert `db.knowledgeEntry.create` called with `entryType: "EXTERNAL_FEED_DIGEST"`
  - Test idempotency: if `db.knowledgeEntry.findFirst` returns an existing entry → `create` NOT called

- [x] 4.2 Create `tests/unit/services/tarsis/signal-type.test.ts`:
  - Assert that `collectMarketSignals` writes `Signal.type = "EXTERNAL_SAAS"` (not MARKET_SIGNAL)
  - Mock `callLLM` to return valid JSON array of signals
  - Mock `db.signal.create` → spy
  - Assert spy called with `type: "EXTERNAL_SAAS"`

- [x] 4.3 Add a test in `tests/unit/services/tarsis/market-intelligence.test.ts` (existing file):
  - Verify `runMarketIntelligence` is NOT imported or called in `rtis-cascade.ts` T block
  - (Static assertion: grep the file for the call site after refactor)

### Task 5 — Governance tests

- [x] 5.1 `npx tsc --noEmit` → 0 errors
- [x] 5.2 `npx vitest run tests/unit/governance/` → 768/768 pass
- [x] 5.3 `npx vitest run tests/unit/services/tarsis/` → 16/16 pass (3 test files)

---

## Dev Notes

### Architecture — owning services

| Concern | Owner | File |
|---|---|---|
| Vault scan + Seshat ingest | **Seshat** (new sub-module) | `src/server/services/seshat/tarsis/vault-bridge.ts` (NEW) |
| T pillar orchestration | **Mestor** (rtis-cascade) | `src/server/services/mestor/rtis-cascade.ts` |
| T pillar generation | **Mestor** (Protocole Track) | `src/server/services/rtis-protocols/track.ts` |
| Signal collection | **Seshat** (Tarsis) | `src/server/services/seshat/tarsis/signal-collector.ts` |
| Knowledge access | **Seshat** | `src/server/services/seshat/knowledge/access.ts` |

### Critical invariants to preserve

1. **LOI 1 (single write path)**: `savePillar` at line 521 in `actualizePillar` is the single canonical write for T. `executeProtocoleTrack` must NOT write internally when called from `actualizePillar`. It returns `{ content, confidence }` — the caller writes.

2. **No double-write**: `runMarketIntelligence` calls `writePillarAndScore` internally. Do NOT call it from the T block. The new flow uses `executeProtocoleTrack` which is pure-return.

3. **Completion pass untouched**: Lines 467-518 in `rtis-cascade.ts` run `runChunkedFieldGeneration` after `newContent` is set. This fills any missing derivable fields (e.g., `weakSignalAnalysis` if signals exist). DO NOT remove or modify this block.

4. **Phase 0 return shape**: When returning early (completionPct ≥ 90), return `ActualizeResult` with `updated: false` so the caller (tRPC router) handles it correctly without attempting a score update.

5. **vault-bridge idempotency**: `ingestVaultToKnowledgeEntry` checks for existing fresh KnowledgeEntry before creating. Use `market: "vault-bridge"` as a sentinel field to distinguish vault-ingested entries from LLM-generated ones.

6. **loadSeshatKnowledge already reads ALL KnowledgeEntry types**: In `executeProtocoleTrack`, `loadSeshatKnowledge` queries `db.knowledgeEntry.findMany` with no `entryType` filter — just sector/market match and freshness. Any KnowledgeEntry written by vault-bridge IS automatically read by executeProtocoleTrack. No change to track.ts needed.

7. **EXTERNAL_SAAS signals**: `loadSeshatKnowledge` reads `db.signal.findMany({ where: { type: "EXTERNAL_SAAS" } })`. After Task 2, `collectMarketSignals` writes this type → signals flow through to executeProtocoleTrack's context.

8. **CompetitorSnapshot table**: `loadCompetitorData` in `track.ts` reads `db.competitorSnapshot.findMany()` — this table is still empty. Do NOT attempt to populate it in this story. The LLM will generate `competitorOvertonPositions` from D pillar context. This is acceptable for now.

9. **runMarketIntelligence survival**: This function stays exported. It's used by background daemons and the internal cascade. Only the `actualizePillar("T")` call site is changed.

### KnowledgeEntry structure for vault-bridge

```typescript
// TREND_RADAR / SEO_REPORT / OVERTON_WINDOW vault assets → EXTERNAL_FEED_DIGEST
{
  entryType: "EXTERNAL_FEED_DIGEST",
  sector: searchCtx.sector,
  market: searchCtx.market ?? "vault-bridge",
  countryCode: searchCtx.countryCode,
  data: {
    macroSignals: [{ trend: asset.name ?? asset.kind, evidence: asset.summary ?? "vault-import" }],
    weakSignals: [],
    trendTracker: null,
    // Mark as vault-ingested for idempotency check
    _source: "vault-bridge",
    _vaultAssetId: asset.id,
  }
}

// MCK_7S / BCG_PORTFOLIO → MARKET_STUDY_COMPETITOR (best-effort extraction)
{
  entryType: "SECTOR_BENCHMARK",  // broad — picked up by loadSeshatKnowledge
  sector: searchCtx.sector,
  market: "vault-bridge",
  countryCode: searchCtx.countryCode,
  data: {
    type: "vault_framework_import",
    frameworkKind: asset.kind,
    content: asset.content,  // raw BrandAsset content
    generatedFor: strategyId,
    _source: "vault-bridge",
    _vaultAssetId: asset.id,
  }
}
```

### Idempotency check for vault-bridge

```typescript
// Before creating, check: does a fresh entry already exist from this vault asset?
const existing = await db.knowledgeEntry.findFirst({
  where: {
    sector: { contains: searchCtx.sector, mode: "insensitive" },
    countryCode: searchCtx.countryCode,
    data: { path: ["_vaultAssetId"], equals: asset.id },
    createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },  // 7 days
  },
});
if (existing) continue;  // Already ingested recently
```

### Phase 0 completionPct threshold rationale

90% allows 1 missing field out of ~14 COMPLETE requirements (13/14 = 92.8%).
The only systematically-missing field is `traction` (needsHuman — never auto-generated).
At 90%+, the pillar is functionally complete for Oracle §12–15 and Glory tool sequences.

### Signal collection `forceRefresh` note

`collectMarketSignals` does not currently accept a `forceRefresh` flag — it always collects.
The "no collection" case is when Seshat already has data (Phase 2 guard). The existing function
signature doesn't need a flag; the guard is in the caller.

### References

- `actualizePillar` T block: [src/server/services/mestor/rtis-cascade.ts#376-395]
- Completion pass: [src/server/services/mestor/rtis-cascade.ts#467-518]
- savePillar call: [src/server/services/mestor/rtis-cascade.ts#521]
- executeProtocoleTrack: [src/server/services/rtis-protocols/track.ts#345-413]
- loadSeshatKnowledge: [src/server/services/rtis-protocols/track.ts#60-109]
- collectMarketSignals (signal type to fix): [src/server/services/seshat/tarsis/signal-collector.ts#188]
- loadCountrySectorIntelligence: [src/server/services/seshat/knowledge/access.ts#182-200]
- buildSearchContext: [src/server/services/seshat/tarsis/weak-signal-analyzer.ts#272-380]
- BrandAssetKind enum: [src/domain/brand-asset-kinds.ts]
- db.brandAsset.findMany: Prisma — strategyId, kind, state fields available

### Uncommitted patches to keep

From previous story `fix-rtis-t-pillar-completion` (already merged):
- `seshat/tarsis/index.ts`: marketReality CALC fallback + weakSignalAnalysis guard + marketDataSources guard
- `pillar-page.tsx`: Enrichir decoupled from cascade
- `rtis-cascade.ts`: marketReality in RTIS_PROMPTS.T
- `tests/unit/services/tarsis/market-intelligence.test.ts`: 5 tests passing

These are correct and must not be reverted.

---

## Verification Protocol

After implementation:

1. `npx tsc --noEmit` → 0 errors
2. `npx vitest run tests/unit/governance/ tests/unit/services/tarsis/` → all pass
3. Dev server: navigate to `/cockpit/brand/market`
4. T pillar at 70% → click **"Recalculer ce pilier"**
5. Wait 60-90s → Complet% updates to ≥90%
6. Click again immediately → should return fast (Phase 0 skip — completionPct ≥ 90)
7. Check T pillar content: `overtonPosition`, `perceptionGap`, `competitorOvertonPositions` present

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Session investigation: "Recalculer ce pilier" → actualizePillar("T") → runMarketIntelligence (wrong path)
- executeProtocoleTrack identified as correct terminal stage (all T fields, returns content)
- loadSeshatKnowledge reads ALL KnowledgeEntry types — vault-bridge writes flow automatically
- EXTERNAL_SAAS signal type mismatch between collectMarketSignals (writes MARKET_SIGNAL) and executeProtocoleTrack (reads EXTERNAL_SAAS)
- Double-write bug: runMarketIntelligence writes internally, actualizePillar also calls savePillar
- Phase 0 skip: completion pass at lines 467-518 already handles gap-fill post-generation

### Completion Notes List

- ✅ vault-bridge.ts created: MARKET_INTELLIGENCE_KINDS (8 kinds), scanVaultForMarketIntelligence, ingestVaultToKnowledgeEntry with _vaultAssetId idempotency guard (7-day window).
- ✅ signal-collector.ts: MARKET_SIGNAL → EXTERNAL_SAAS on db.signal.create. Sentinel handlers (route.ts + index.ts) updated to also catch EXTERNAL_SAAS.
- ✅ rtis-cascade.ts T block replaced with 4-phase pipeline: Phase 0 skip (≥90%), Phase 1 vault-bridge, Phase 2 conditional Seshat collection, Phase 3 executeProtocoleTrack. Completion pass (lines 506-565) and savePillar/recalcScores untouched. LOI 1 (single write path) preserved.
- ✅ 3 test files: vault-bridge.test.ts (8 tests), signal-type.test.ts (3 tests), + AC7 static assertion in market-intelligence.test.ts. 16/16 tarsis tests pass.
- ✅ tsc → 0 errors. Governance 768/768. No new Prisma migration required (no schema change).
- Note: ingestVaultToKnowledgeEntry uses SECTOR_BENCHMARK (not MARKET_STUDY_COMPETITOR) for framework assets per Dev Notes code snippet — picked up by loadSeshatKnowledge which has no entryType filter.

### File List

- `src/server/services/seshat/tarsis/vault-bridge.ts` — CREATE
- `src/server/services/mestor/rtis-cascade.ts` — MODIFY (T block only, lines 376-442)
- `src/server/services/seshat/tarsis/signal-collector.ts` — MODIFY (type: "MARKET_SIGNAL" → "EXTERNAL_SAAS")
- `src/app/api/cron/sentinels/route.ts` — MODIFY (add EXTERNAL_SAAS to in-filter)
- `src/server/services/sentinel-handlers/index.ts` — MODIFY (add EXTERNAL_SAAS to in-filter)
- `tests/unit/services/tarsis/vault-bridge.test.ts` — CREATE
- `tests/unit/services/tarsis/signal-type.test.ts` — CREATE
- `tests/unit/services/tarsis/market-intelligence.test.ts` — MODIFY (AC7 static assertion appended)

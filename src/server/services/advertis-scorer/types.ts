/**
 * advertis-scorer/types.ts — Types extracted from index.ts to break the
 * circular dependency `index.ts ↔ structural.ts` (Phase 4).
 *
 * Importing from this file is safe across the scorer submodule. `index.ts`
 * re-exports `ScorableType` for external consumers so existing imports
 * (`import { ScorableType } from "@/server/services/advertis-scorer"`)
 * keep working without change.
 */

export type ScorableType =
  | "strategy"
  | "campaign"
  | "mission"
  | "talentProfile"
  | "signal"
  | "gloryOutput"
  | "brandAsset";

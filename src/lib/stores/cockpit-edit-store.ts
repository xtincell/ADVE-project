/**
 * COCKPIT EDIT STORE — UI-local staging (ADR-0088)
 *
 * A thin Zustand store for the cockpit's *working* state. It is NOT a second
 * source of truth: the server (Prisma, via tRPC) stays authoritative. The store
 * holds only what is in-flight in the operator's session:
 *
 *   1. ADVE edit drafts — optimistic per-field buffers before the operator
 *      commits them through the OPERATOR_AMEND_PILLAR intent.
 *   2. Recommendation review queue — local accept/reject staging of AI recos
 *      before flushing to APPLY_RECOMMENDATIONS.
 *
 * Lifecycle: hydrate() from a tRPC query on mount → mutate locally → flush via
 * the existing mutations → clear on success + invalidate the query. The store
 * never fetches and never writes; it stages.
 *
 * NB (mission constraint): this is hidden machinery only. Graphical cockpit
 * components are intentionally left unwired for now — they consume this API in
 * a later increment.
 */

import { create } from "zustand";
import type { EditableMode } from "@/lib/types/variable-bible";

export type RecoReview = "ACCEPT" | "REJECT";

export interface DraftEntry {
  value: unknown;
  mode: EditableMode;
  dirty: boolean;
}

/** Canonical key for a per-field draft. */
export function draftKey(pillarKey: string, field: string): string {
  return `${pillarKey.toLowerCase()}.${field}`;
}

export interface CockpitEditState {
  /** Optimistic ADVE field drafts, keyed by `${pillarKey}.${field}`. */
  drafts: Record<string, DraftEntry>;
  /** Local accept/reject staging, keyed by recommendation id. */
  recoQueue: Record<string, RecoReview>;

  // ── Drafts ──────────────────────────────────────────────────────────
  setDraft: (pillarKey: string, field: string, value: unknown, mode: EditableMode) => void;
  clearDraft: (pillarKey: string, field: string) => void;
  getDraft: (pillarKey: string, field: string) => DraftEntry | undefined;
  /** Keys (`${pillarKey}.${field}`) of all dirty drafts. */
  dirtyKeys: () => string[];

  // ── Recommendation review ───────────────────────────────────────────
  stageReco: (recoId: string, review: RecoReview) => void;
  unstageReco: (recoId: string) => void;
  /** recoIds staged with the given review. */
  stagedRecoIds: (review: RecoReview) => string[];

  // ── Sync ────────────────────────────────────────────────────────────
  /** Seed the store from server state (called once from a tRPC query). */
  hydrate: (state: Partial<Pick<CockpitEditState, "drafts" | "recoQueue">>) => void;
  /** Drop drafts + reviewed recos after a successful flush. */
  clearReviewed: (recoIds: string[]) => void;
  reset: () => void;
}

export const useCockpitEditStore = create<CockpitEditState>((set, get) => ({
  drafts: {},
  recoQueue: {},

  setDraft: (pillarKey, field, value, mode) =>
    set((s) => ({
      drafts: { ...s.drafts, [draftKey(pillarKey, field)]: { value, mode, dirty: true } },
    })),

  clearDraft: (pillarKey, field) =>
    set((s) => {
      const next = { ...s.drafts };
      delete next[draftKey(pillarKey, field)];
      return { drafts: next };
    }),

  getDraft: (pillarKey, field) => get().drafts[draftKey(pillarKey, field)],

  dirtyKeys: () => Object.entries(get().drafts).filter(([, d]) => d.dirty).map(([k]) => k),

  stageReco: (recoId, review) => set((s) => ({ recoQueue: { ...s.recoQueue, [recoId]: review } })),

  unstageReco: (recoId) =>
    set((s) => {
      const next = { ...s.recoQueue };
      delete next[recoId];
      return { recoQueue: next };
    }),

  stagedRecoIds: (review) =>
    Object.entries(get().recoQueue).filter(([, r]) => r === review).map(([id]) => id),

  hydrate: (state) =>
    set((s) => ({
      drafts: state.drafts ?? s.drafts,
      recoQueue: state.recoQueue ?? s.recoQueue,
    })),

  clearReviewed: (recoIds) =>
    set((s) => {
      const recoQueue = { ...s.recoQueue };
      for (const id of recoIds) delete recoQueue[id];
      return { recoQueue, drafts: {} };
    }),

  reset: () => set({ drafts: {}, recoQueue: {} }),
}));

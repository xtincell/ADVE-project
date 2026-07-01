/**
 * cockpit-edit-store — ADR-0088 UI-local staging.
 *
 * Verifies the store stages drafts + reco reviews and clears cleanly on flush.
 * Zustand stores are testable outside React via getState()/setState().
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useCockpitEditStore, draftKey } from "@/lib/stores/cockpit-edit-store";

const store = () => useCockpitEditStore.getState();

describe("cockpit-edit-store (ADR-0088)", () => {
  beforeEach(() => store().reset());

  it("stages ADVE drafts and lists dirty keys", () => {
    store().setDraft("a", "accroche", "nouvelle accroche", "LLM_REPHRASE");
    expect(store().getDraft("a", "accroche")?.value).toBe("nouvelle accroche");
    expect(store().getDraft("a", "accroche")?.dirty).toBe(true);
    expect(store().dirtyKeys()).toEqual([draftKey("a", "accroche")]);
  });

  it("clears a single draft", () => {
    store().setDraft("d", "positionnement", "x", "PATCH_DIRECT");
    store().clearDraft("d", "positionnement");
    expect(store().getDraft("d", "positionnement")).toBeUndefined();
  });

  it("stages reco reviews and partitions by verdict", () => {
    store().stageReco("r1", "ACCEPT");
    store().stageReco("r2", "REJECT");
    store().stageReco("r3", "ACCEPT");
    expect(store().stagedRecoIds("ACCEPT").sort()).toEqual(["r1", "r3"]);
    expect(store().stagedRecoIds("REJECT")).toEqual(["r2"]);
  });

  it("hydrates from server state without fetching", () => {
    store().hydrate({ recoQueue: { srv: "ACCEPT" } });
    expect(store().stagedRecoIds("ACCEPT")).toEqual(["srv"]);
  });

  it("clearReviewed drops reviewed recos + all drafts after flush", () => {
    store().setDraft("a", "accroche", "v", "PATCH_DIRECT");
    store().stageReco("r1", "ACCEPT");
    store().stageReco("r2", "REJECT");
    store().clearReviewed(["r1"]);
    expect(store().stagedRecoIds("ACCEPT")).toEqual([]); // r1 dropped
    expect(store().stagedRecoIds("REJECT")).toEqual(["r2"]); // r2 kept
    expect(store().dirtyKeys()).toEqual([]); // drafts cleared
  });
});

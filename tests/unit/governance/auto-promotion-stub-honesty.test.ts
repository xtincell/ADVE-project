/**
 * Anti-drift — honnêteté du stub PROMOTE_SEQUENCE_LIFECYCLE (ADR-0139, audit T14).
 *
 * Le handler de promotion est un STUB d'audit : il consigne la transition
 * DRAFT→STABLE dans l'IntentEmission hash-chained, mais NE PERSISTE PAS le
 * lifecycle — celui-ci vit dans le code (`sequences.ts`) jusqu'au store
 * `SequenceLifecycleState` jamais construit (Chantier D-bis).
 *
 * Ce test verrouille que `promoteSequence` ne rapporte JAMAIS `PROMOTE` tant
 * que l'émission retourne `persisted !== true`. Sinon `totalPromoted`
 * mentirait sur un changement d'état inexistant (aucune séquence ne quitte
 * réellement DRAFT) — exactement l'inflation malhonnête que NEFER refuse.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { EligibilityResult } from "@/server/services/auto-promotion/types";

const { emitIntentMock } = vi.hoisted(() => ({ emitIntentMock: vi.fn() }));

vi.mock("@/server/services/mestor/intents", () => ({
  emitIntent: emitIntentMock,
}));

const eligible: EligibilityResult = {
  itemKind: "SEQUENCE_DRAFT_TO_STABLE",
  itemId: "TEST-SEQ",
  eligible: true,
  reasons: ["all conditions met"],
  metrics: { ageDays: 70, totalExecutions: 50 },
};

describe("ADR-0139 — le stub de promotion ne ment pas sur l'état", () => {
  beforeEach(() => emitIntentMock.mockReset());

  it("émission OK mais persisted:false → SKIP (jamais PROMOTE)", async () => {
    emitIntentMock.mockResolvedValue({
      status: "OK",
      output: { persisted: false },
      intentKind: "PROMOTE_SEQUENCE_LIFECYCLE",
      summary: "audit-only",
    });
    const { promoteSequence } = await import(
      "@/server/services/auto-promotion/actions"
    );
    const decision = await promoteSequence(eligible, "op", false);
    expect(decision.action).toBe("SKIP");
    expect(decision.reason).toMatch(/non persist|ADR-0139|stub/i);
  });

  it("dry-run → PROMOTE simulé SANS émettre d'Intent", async () => {
    const { promoteSequence } = await import(
      "@/server/services/auto-promotion/actions"
    );
    const decision = await promoteSequence(eligible, "op", true);
    expect(decision.action).toBe("PROMOTE");
    expect(decision.reason).toMatch(/dry run/i);
    expect(emitIntentMock).not.toHaveBeenCalled();
  });

  it("persisted:true → PROMOTE réel (contrat futur Chantier D-bis)", async () => {
    emitIntentMock.mockResolvedValue({
      status: "OK",
      output: { persisted: true },
      intentKind: "PROMOTE_SEQUENCE_LIFECYCLE",
      summary: "persisted",
    });
    const { promoteSequence } = await import(
      "@/server/services/auto-promotion/actions"
    );
    const decision = await promoteSequence(eligible, "op", false);
    expect(decision.action).toBe("PROMOTE");
  });

  it("Intent FAILED → SKIP", async () => {
    emitIntentMock.mockResolvedValue({
      status: "FAILED",
      summary: "boom",
      intentKind: "PROMOTE_SEQUENCE_LIFECYCLE",
    });
    const { promoteSequence } = await import(
      "@/server/services/auto-promotion/actions"
    );
    const decision = await promoteSequence(eligible, "op", false);
    expect(decision.action).toBe("SKIP");
  });

  it("non éligible → WAIT, jamais d'émission", async () => {
    const { promoteSequence } = await import(
      "@/server/services/auto-promotion/actions"
    );
    const decision = await promoteSequence(
      { ...eligible, eligible: false, reasons: ["age 10d < 30d"] },
      "op",
      false,
    );
    expect(decision.action).toBe("WAIT");
    expect(emitIntentMock).not.toHaveBeenCalled();
  });
});

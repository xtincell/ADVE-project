import { describe, it, expect } from "vitest";
import { Prisma } from "@prisma/client";

/**
 * Regression guard for the `getCampaignTimeline` 500 (PR #357, Lot A1).
 *
 * Root cause + CI blind spot: `tsc` does NOT reliably reject invalid keys
 * inside *nested* Prisma relation `select` blocks. The query selected
 * `name`/`description` on CampaignMilestone (real field: `title`) and
 * `type`/`updatedAt`/`notes` on CampaignApproval (real fields:
 * `approvalType`/`comment`/`createdAt`) — so it shipped CI-green yet threw
 * `PrismaClientValidationError` on every call.
 *
 * This test pins the field contract of the models read by that query against
 * the live Prisma DMMF (no DB needed — `prisma generate` is enough), so the
 * exact bug can never silently reappear. Same DMMF access pattern as
 * `src/server/governance/market-scoped-db.ts`.
 */

function fieldNames(model: string): Set<string> {
  const m = Prisma.dmmf.datamodel.models.find((x) => x.name === model);
  if (!m) throw new Error(`Model ${model} not found in Prisma DMMF`);
  return new Set(m.fields.map((f) => f.name));
}

describe("getCampaignTimeline — Prisma select field contract (PR #357 regression)", () => {
  it("CampaignMilestone exposes the selected fields (and not the 500-causing ones)", () => {
    const f = fieldNames("CampaignMilestone");
    for (const k of ["id", "title", "dueDate", "completedAt", "status"]) {
      expect(f.has(k), `CampaignMilestone.${k} must exist (selected by getCampaignTimeline)`).toBe(true);
    }
    // These were the bug: selecting them throws PrismaClientValidationError.
    expect(f.has("name"), "CampaignMilestone.name must NOT exist (it is `title`)").toBe(false);
    expect(f.has("description"), "CampaignMilestone.description must NOT exist").toBe(false);
  });

  it("CampaignApproval exposes the selected fields (and not the 500-causing ones)", () => {
    const f = fieldNames("CampaignApproval");
    for (const k of ["id", "approvalType", "status", "createdAt", "decidedAt", "comment"]) {
      expect(f.has(k), `CampaignApproval.${k} must exist (selected by getCampaignTimeline)`).toBe(true);
    }
    expect(f.has("type"), "CampaignApproval.type must NOT exist (it is `approvalType`)").toBe(false);
    expect(f.has("updatedAt"), "CampaignApproval.updatedAt must NOT exist (use `createdAt`/`decidedAt`)").toBe(false);
    expect(f.has("notes"), "CampaignApproval.notes must NOT exist (it is `comment`)").toBe(false);
  });
});

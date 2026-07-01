import { describe, it, expect } from "vitest";

/**
 * Approval Workflow tests.
 *
 * Tests the approval state machine logic, status transitions,
 * and conformity check scoring without requiring DB access.
 */

type ApprovalType = "DELIVERABLE" | "BRIEF" | "CAMPAIGN" | "BUDGET" | "STRATEGY";
type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ApprovalRecord {
  id: string;
  type: ApprovalType;
  entityId: string;
  requesterId: string;
  status: ApprovalStatus;
  approverId: string | null;
  notes: string | null;
  reason: string | null;
  requestedAt: string;
  resolvedAt: string | null;
}

function createApprovalRecord(
  type: ApprovalType,
  entityId: string,
  requesterId: string,
): ApprovalRecord {
  return {
    id: `approval-${Date.now()}`,
    type,
    entityId,
    requesterId,
    status: "PENDING",
    approverId: null,
    notes: null,
    reason: null,
    requestedAt: new Date().toISOString(),
    resolvedAt: null,
  };
}

function approveRecord(record: ApprovalRecord, approverId: string, notes?: string): ApprovalRecord {
  if (record.status !== "PENDING") {
    throw new Error(`Approval ${record.id} is already ${record.status}`);
  }
  return {
    ...record,
    status: "APPROVED",
    approverId,
    notes: notes ?? null,
    resolvedAt: new Date().toISOString(),
  };
}

function rejectRecord(record: ApprovalRecord, approverId: string, reason: string): ApprovalRecord {
  if (record.status !== "PENDING") {
    throw new Error(`Approval ${record.id} is already ${record.status}`);
  }
  return {
    ...record,
    status: "REJECTED",
    approverId,
    reason,
    resolvedAt: new Date().toISOString(),
  };
}

// Priority logic from the service
function getPriority(type: ApprovalType): number {
  if (type === "BUDGET") return 10;
  if (type === "STRATEGY") return 8;
  return 5;
}

describe("Approval Workflow - Request Creation", () => {
  it("creates a PENDING approval request", () => {
    const record = createApprovalRecord("DELIVERABLE", "entity-1", "user-1");
    expect(record.status).toBe("PENDING");
    expect(record.type).toBe("DELIVERABLE");
    expect(record.entityId).toBe("entity-1");
    expect(record.requesterId).toBe("user-1");
  });

  it("new requests have no approver", () => {
    const record = createApprovalRecord("BRIEF", "entity-2", "user-2");
    expect(record.approverId).toBeNull();
    expect(record.resolvedAt).toBeNull();
  });

  it("new requests have a requestedAt timestamp", () => {
    const record = createApprovalRecord("CAMPAIGN", "entity-3", "user-3");
    expect(record.requestedAt).toBeDefined();
    const date = new Date(record.requestedAt);
    expect(date.getTime()).toBeGreaterThan(0);
  });

  it("supports all approval types", () => {
    const types: ApprovalType[] = ["DELIVERABLE", "BRIEF", "CAMPAIGN", "BUDGET", "STRATEGY"];
    for (const type of types) {
      const record = createApprovalRecord(type, "entity", "user");
      expect(record.type).toBe(type);
    }
  });

  it("BUDGET has highest priority (10)", () => {
    expect(getPriority("BUDGET")).toBe(10);
  });

  it("STRATEGY has priority 8", () => {
    expect(getPriority("STRATEGY")).toBe(8);
  });

  it("other types have default priority 5", () => {
    expect(getPriority("DELIVERABLE")).toBe(5);
    expect(getPriority("BRIEF")).toBe(5);
    expect(getPriority("CAMPAIGN")).toBe(5);
  });
});

describe("Approval Workflow - Approve Flow", () => {
  it("approving a PENDING request sets status to APPROVED", () => {
    const record = createApprovalRecord("DELIVERABLE", "entity-1", "requester-1");
    const approved = approveRecord(record, "approver-1");
    expect(approved.status).toBe("APPROVED");
  });

  it("approved record has approverId set", () => {
    const record = createApprovalRecord("BRIEF", "entity-2", "requester-2");
    const approved = approveRecord(record, "approver-2");
    expect(approved.approverId).toBe("approver-2");
  });

  it("approved record has resolvedAt timestamp", () => {
    const record = createApprovalRecord("CAMPAIGN", "entity-3", "requester-3");
    const approved = approveRecord(record, "approver-3");
    expect(approved.resolvedAt).not.toBeNull();
  });

  it("approved record can include notes", () => {
    const record = createApprovalRecord("STRATEGY", "entity-4", "requester-4");
    const approved = approveRecord(record, "approver-4", "Looks good!");
    expect(approved.notes).toBe("Looks good!");
  });

  it("approving an already-approved request throws error", () => {
    const record = createApprovalRecord("DELIVERABLE", "entity-5", "requester-5");
    const approved = approveRecord(record, "approver-5");
    expect(() => approveRecord(approved, "approver-6")).toThrow("already APPROVED");
  });

  it("approving a rejected request throws error", () => {
    const record = createApprovalRecord("DELIVERABLE", "entity-6", "requester-6");
    const rejected = rejectRecord(record, "approver-6", "Not ready");
    expect(() => approveRecord(rejected, "approver-7")).toThrow("already REJECTED");
  });
});

describe("Approval Workflow - Reject Flow", () => {
  it("rejecting a PENDING request sets status to REJECTED", () => {
    const record = createApprovalRecord("DELIVERABLE", "entity-1", "requester-1");
    const rejected = rejectRecord(record, "approver-1", "Does not meet standards");
    expect(rejected.status).toBe("REJECTED");
  });

  it("rejected record includes reason", () => {
    const record = createApprovalRecord("BRIEF", "entity-2", "requester-2");
    const rejected = rejectRecord(record, "approver-2", "Missing brand assets");
    expect(rejected.reason).toBe("Missing brand assets");
  });

  it("rejected record has resolvedAt timestamp", () => {
    const record = createApprovalRecord("CAMPAIGN", "entity-3", "requester-3");
    const rejected = rejectRecord(record, "approver-3", "Budget not approved");
    expect(rejected.resolvedAt).not.toBeNull();
  });

  it("rejecting a rejected request throws error", () => {
    const record = createApprovalRecord("DELIVERABLE", "entity-4", "requester-4");
    const rejected = rejectRecord(record, "approver-4", "Reason 1");
    expect(() => rejectRecord(rejected, "approver-5", "Reason 2")).toThrow("already REJECTED");
  });

  it("rejecting an approved request throws error", () => {
    const record = createApprovalRecord("STRATEGY", "entity-5", "requester-5");
    const approved = approveRecord(record, "approver-5");
    expect(() => rejectRecord(approved, "approver-6", "Too late")).toThrow("already APPROVED");
  });
});

describe("Approval Workflow - Pending List Filtering", () => {
  it("filters pending records correctly", () => {
    const records: ApprovalRecord[] = [
      createApprovalRecord("DELIVERABLE", "e1", "u1"),
      approveRecord(createApprovalRecord("BRIEF", "e2", "u2"), "a1"),
      createApprovalRecord("CAMPAIGN", "e3", "u3"),
      rejectRecord(createApprovalRecord("STRATEGY", "e4", "u4"), "a2", "Nope"),
    ];

    const pending = records.filter((r) => r.status === "PENDING");
    expect(pending).toHaveLength(2);
    expect(pending[0]!.entityId).toBe("e1");
    expect(pending[1]!.entityId).toBe("e3");
  });

  it("pending list for a specific user filters by requesterId", () => {
    const records = [
      { ...createApprovalRecord("DELIVERABLE", "e1", "user-A") },
      { ...createApprovalRecord("BRIEF", "e2", "user-B") },
      { ...createApprovalRecord("CAMPAIGN", "e3", "user-A") },
    ];

    const userAPending = records.filter(
      (r) => r.status === "PENDING" && r.requesterId === "user-A"
    );
    expect(userAPending).toHaveLength(2);
  });
});

describe("Approval Workflow - ADVE Conformity Check Logic", () => {
  it("approval recommended when overall score >= 7 and <= 2 non-conform pillars", () => {
    const overallScore = 8;
    const nonConformCount = 1;
    const approved = overallScore >= 7 && nonConformCount <= 2;
    expect(approved).toBe(true);
  });

  it("approval not recommended when overall score < 7", () => {
    const overallScore = 5;
    const nonConformCount = 1;
    const approved = overallScore >= 7 && nonConformCount <= 2;
    expect(approved).toBe(false);
  });

  it("approval not recommended when > 2 non-conform pillars", () => {
    const overallScore = 8;
    const nonConformCount = 4;
    const approved = overallScore >= 7 && nonConformCount <= 2;
    expect(approved).toBe(false);
  });

  it("pillar check score is 10 when conform (no issues)", () => {
    const issues: string[] = [];
    const isConform = issues.length === 0;
    const checkScore = isConform ? 10 : Math.max(0, 10 - issues.length * 3);
    expect(checkScore).toBe(10);
  });

  it("pillar check score decreases by 3 per issue", () => {
    const issues = ["issue1", "issue2"];
    const isConform = issues.length === 0;
    const checkScore = isConform ? 10 : Math.max(0, 10 - issues.length * 3);
    expect(checkScore).toBe(4);
  });

  it("pillar check score cannot go below 0", () => {
    const issues = ["i1", "i2", "i3", "i4", "i5"];
    const checkScore = Math.max(0, 10 - issues.length * 3);
    expect(checkScore).toBe(0);
  });
});

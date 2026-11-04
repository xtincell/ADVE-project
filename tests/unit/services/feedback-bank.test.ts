import { describe, expect, it, vi } from "vitest";
const calls = vi.hoisted(() => ({ update: vi.fn(), findMany: vi.fn(), count: vi.fn() }));
vi.mock("@/lib/db", () => ({ db: { feedback: calls } }));
import { listFeedback, triageFeedback, unresolvedFeedbackCount } from "@/server/services/tester-feedback";
describe("existing feedback bank", () => {
  it("clears resolution when reopening, then records the actual resolver", async () => {
    await triageFeedback({ id: "test", status: "NEW", reviewedBy: "operator" });
    expect(calls.update).toHaveBeenLastCalledWith({ where: { id: "test" }, data: { status: "NEW", resolvedAt: null, resolvedBy: null } });
    await triageFeedback({ id: "test", status: "RESOLVED", reviewedBy: "operator" });
    expect(calls.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: { status: "RESOLVED", resolvedBy: "operator", resolvedAt: expect.any(Date) } }));
  });
  it("searches and paginates the bank rather than hiding requests after a fixed cap", async () => {
    await listFeedback({ status: "TRIAGED", search: "  Source  ", cursor: "previous" });
    expect(calls.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { status: "TRIAGED", OR: expect.arrayContaining([{ message: { contains: "Source", mode: "insensitive" } }]) }, cursor: { id: "previous" }, skip: 1, take: 50 }));
  });
  it("keeps in-progress requests in the unresolved count", async () => {
    await unresolvedFeedbackCount(); expect(calls.count).toHaveBeenCalledWith({ where: { status: { in: ["NEW", "TRIAGED"] } } });
  });
});

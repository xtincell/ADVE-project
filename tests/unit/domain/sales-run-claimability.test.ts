import { describe, expect, it } from "vitest";
import { salesBudgetDay, salesDailyUsage, salesRunAllowedToday } from "@/domain/sales-run-claimability";

const seller = { budgetDay: "2026-11-18", dailyTokensReserved: 90000, dailyRunsClaimed: 2, dailyTokenBudget: 150000, dailyRunLimit: 3, maxTokens: 60000 };

describe("sales run claimability", () => {
  it("counts today's reservations only on the UTC day they were made", () => {
    expect(salesBudgetDay(new Date("2026-11-18T23:59:59Z"))).toBe("2026-11-18");
    expect(salesDailyUsage(seller, "2026-11-18")).toEqual({ tokens: 90000, runs: 2 });
    expect(salesDailyUsage(seller, "2026-11-19")).toEqual({ tokens: 0, runs: 0 });
    expect(salesDailyUsage({ ...seller, budgetDay: null }, "2026-11-18")).toEqual({ tokens: 0, runs: 0 });
  });
  it("allows one more run only within both the token budget and the run limit", () => {
    expect(salesRunAllowedToday(seller, "2026-11-18")).toBe(true); // 90 000 + 60 000 = 150 000, exactly the budget
    expect(salesRunAllowedToday({ ...seller, dailyTokensReserved: 90001 }, "2026-11-18")).toBe(false);
    expect(salesRunAllowedToday({ ...seller, dailyRunsClaimed: 3 }, "2026-11-18")).toBe(false);
    expect(salesRunAllowedToday({ ...seller, dailyRunsClaimed: 3, dailyTokensReserved: 150000 }, "2026-11-19")).toBe(true);
  });
});

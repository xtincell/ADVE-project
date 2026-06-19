/**
 * Manual payment mechanic (WhatsApp + operator validation) — surface + invariant.
 *
 * Production payment path that bypasses the automatic providers (no creds needed):
 * "Payer" → WhatsApp redirect + a `pending_manual` Subscription recorded → operator
 * validates in Console → tier activates.
 *
 * The load-bearing invariant: a `pending_manual` request grants NO access until an
 * operator flips it to `active`. checkPaidTier must honour ONLY active/trialing.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf-8");

describe("manual payment — router procedures", () => {
  const payment = read("src/server/trpc/routers/payment.ts");
  it("exposes the manual-subscription procedures", () => {
    expect(payment).toContain("initManualSubscription");
    expect(payment).toContain("listManualSubscriptions");
    expect(payment).toContain("approveManualSubscription");
    expect(payment).toContain("rejectManualSubscription");
  });
  it("records requests as pending_manual (inert until validated)", () => {
    expect(payment).toContain('status: "pending_manual"');
  });
  it("approval activates the tier (status active + period)", () => {
    expect(payment).toContain('status: "active"');
    expect(payment).toContain("currentPeriodEnd");
  });
  it("WhatsApp number is env-driven (not hardcoded as the only source)", () => {
    expect(payment).toContain("MANUAL_PAYMENT_WHATSAPP_NUMBER");
    expect(payment).toContain("wa.me/");
  });
});

describe("manual payment — INVARIANT: pending_manual grants no access", () => {
  it("checkPaidTier honours ONLY active/trialing — never pending_manual", () => {
    const gate = read("src/server/services/glory-tools/tier-gate.ts");
    expect(gate).toContain('"active"');
    expect(gate).toContain('"trialing"');
    expect(gate).not.toContain("pending_manual");
  });
});

describe("manual payment — UI surface", () => {
  it("pricing page CTA uses the manual flow (not the auto provider redirect)", () => {
    const pricing = read("src/app/(marketing)/pricing/page.tsx");
    expect(pricing).toContain("initManualSubscription");
    expect(pricing).toContain("whatsappUrl");
  });
  it("console validation queue route exists + is in the nav", () => {
    expect(existsSync(join(ROOT, "src/app/(console)/console/socle/manual-subscriptions/page.tsx"))).toBe(true);
    const nav = read("src/components/navigation/portal-configs.ts");
    expect(nav).toContain("/console/socle/manual-subscriptions");
  });
});

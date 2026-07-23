/**
 * Verrou HARD — intégrité financière (round-8 d).
 *
 *  - `commission.generatePaymentOrder` (MED) : `PaymentOrder` n'a pas d'unique sur
 *    `commissionId` → deux appels (double-clic/retry) créaient DEUX ordres de
 *    payout capturables = talent payé DEUX FOIS. Garde d'idempotence applicative.
 *  - Webhook mobile money (MED) : `publicProcedure` SANS auth → quiconque connaît
 *    un `transactionRef` basculait un payout à COMPLETED/FAILED. Secret partagé
 *    fail-closed (doctrine `verifyCronSecret`).
 *  - Webhooks Stripe/CinetPay (LOW) : `update` inconditionnel → re-fulfillment
 *    (emails + assemblage Oracle) à chaque redelivery de l'événement. Claim
 *    atomique (comme PayPal) → PAID + fulfillment une seule fois.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("commission.generatePaymentOrder — idempotent (round-8 MED)", () => {
  const src = read("src/server/services/commission-engine/index.ts");
  const fn = src.match(/export async function generatePaymentOrder[\s\S]*?\n\}/);
  it("cherche un PaymentOrder non-FAILED existant AVANT de créer", () => {
    expect(fn, "generatePaymentOrder introuvable").toBeTruthy();
    expect(fn![0]).toMatch(/findFirst\(\{\s*where:\s*\{\s*commissionId,\s*status:\s*\{\s*not:\s*"FAILED"/);
    expect(fn![0]).toMatch(/if \(existing\) return existing/);
  });
});

describe("webhook mobile money — authentifié fail-closed (round-8 MED)", () => {
  const src = read("src/server/trpc/routers/mobile-money.ts");
  it("vérifie MOBILE_MONEY_WEBHOOK_SECRET avant de muter le ledger", () => {
    expect(src).toMatch(/assertMomoWebhookSecret\(/);
    expect(src).toContain("MOBILE_MONEY_WEBHOOK_SECRET");
    // fail-closed en production si non configuré.
    expect(src).toMatch(/SERVICE_UNAVAILABLE/);
    expect(src).toMatch(/UNAUTHORIZED/);
  });
});

describe("webhooks paiement — fulfillment idempotent sur redelivery (round-8 LOW)", () => {
  it.each([
    "src/app/api/payment/webhook/stripe/route.ts",
    "src/app/api/payment/webhook/cinetpay/route.ts",
  ])("%s claim PAID via updateMany({status not PAID})", (p) => {
    const src = read(p);
    expect(src).toMatch(/updateMany\(\{\s*where:\s*\{\s*reference,\s*status:\s*\{\s*not:\s*"PAID"/);
  });
});

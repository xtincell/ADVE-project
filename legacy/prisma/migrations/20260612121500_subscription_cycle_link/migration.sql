-- Vague 5 — abonnements à cycle manuel (CinetPay/mobile money sans recurring natif) :
-- un paiement de cycle est relié à sa Subscription pour extension à l'encaissement.

ALTER TABLE "IntakePayment" ADD COLUMN "subscriptionId" TEXT;
CREATE INDEX "IntakePayment_subscriptionId_idx" ON "IntakePayment"("subscriptionId");

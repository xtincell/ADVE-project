-- Existing payments remain intact. Unbound CinetPay notifications require
-- manual reconciliation; neither historical rights nor raw secrets are changed.
ALTER TABLE "IntakePayment" ADD COLUMN "notificationTokenHash" TEXT;

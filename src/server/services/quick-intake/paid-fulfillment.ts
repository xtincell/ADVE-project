/**
 * Fulfillment d'un paiement one-shot intake — LE chaînon qui manquait.
 *
 * Audit intention/exécution 2026-07-16 (`oracle-full-paye-jamais-livre`,
 * CRITICAL) : payer ORACLE_FULL produisait EXACTEMENT le même résultat que le
 * tier PDF — le webhook marquait PAID + re-extraction premium, et RIEN d'autre.
 * Aucune activation, aucun Oracle assemblé, aucun lien, aucune alerte.
 *
 * Désormais, chaque chemin PAID (webhooks Stripe/CinetPay/PayPal + bypass
 * admin/zéro/mock) appelle `fulfillPaidIntakeReport(reference)` :
 *   - toujours : re-extraction premium (comportement historique, centralisé) ;
 *   - si tierKey = ORACLE_FULL :
 *       1. activation de la marque (réutilise `activateBrand`, idempotent) ;
 *       2. `ASSEMBLE_ORACLE scope=ALL` (gouverné, 35 sections — composers
 *          déterministes en secours LLM-down, ADR-0091) ;
 *       3. lien de partage `/shared/strategy/<token>` matérialisé ;
 *       4. alerte admins (le payeur est joignable — contactEmail sur l'intake).
 *
 * Best-effort : jamais throw (l'ACK webhook ne doit pas échouer), fire-and-
 * forget côté appelants. Idempotent (activateBrand l'est ; ASSEMBLE re-scope).
 */

import { db } from "@/lib/db";

export async function fulfillPaidIntakeReport(reference: string): Promise<void> {
  try {
    const payment = await db.intakePayment.findUnique({
      where: { reference },
      select: { status: true, intakeToken: true, tierKey: true },
    });
    if (!payment || payment.status !== "PAID" || !payment.intakeToken) return;

    // ── Toujours : rapport premium (comportement historique) ──
    const { premiumReextractAfterPayment } = await import("./index");
    premiumReextractAfterPayment(payment.intakeToken);

    if (payment.tierKey !== "ORACLE_FULL") return;

    // ── ORACLE_FULL : livrer réellement ce qui a été payé ──
    const { createCallerFactory } = await import("@/server/trpc/init");
    const { quickIntakeRouter } = await import("@/server/trpc/routers/quick-intake");
    // Contexte minimal service-side : activateBrand est publicProcedure et ne
    // lit que ctx.db (même pattern que api/test-e2e).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const caller = createCallerFactory(quickIntakeRouter)({ db, session: null } as any);
    const activated = await caller.activateBrand({ token: payment.intakeToken });

    // Oracle complet — gouverné via le spine. Les sections LLM-down retombent
    // sur les composers déterministes (jamais un livrable vide).
    const { emitIntentTyped } = await import("@/server/services/mestor/intents");
    await emitIntentTyped(
      {
        kind: "ASSEMBLE_ORACLE",
        strategyId: activated.strategyId,
        scope: "ALL",
        operatorId: activated.userId,
      },
      { caller: "payment:fulfill-oracle-full" },
    ).catch((err) => {
      console.error("[paid-fulfillment] ASSEMBLE_ORACLE failed (non-bloquant):", err);
    });

    // Lien de partage — la surface où le payeur consulte sa stratégie complète.
    const { getShareToken } = await import("@/server/services/strategy-presentation");
    const share = await getShareToken(activated.strategyId).catch(() => null);

    // Alerte admins — un ORACLE_FULL payé mérite un suivi humain (email du
    // payeur sur l'intake, lien direct vers la stratégie activée).
    try {
      const { pushNotification } = await import("@/server/services/anubis/notifications");
      const admins = await db.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
      for (const a of admins) {
        await pushNotification({
          userId: a.id,
          type: "PAYMENT",
          priority: "HIGH",
          title: "💎 Oracle complet payé",
          body: `${activated.clientName} — marque activée, Oracle en assemblage.${share ? ` Lien de partage : ${share.url}` : ""}`,
          link: "/console/strategy-operations/intake",
          entityType: "Strategy",
          entityId: activated.strategyId,
          channels: ["IN_APP"],
        }).catch(() => {});
      }
    } catch {
      /* notif best-effort */
    }

    // P0-2 (audit onboarding 2026-07-19) — le PAYEUR ne recevait AUCUN accusé
    // de son achat (seuls les admins étaient notifiés). Email de confirmation
    // avec le lien de sa stratégie. Best-effort.
    try {
      const intakeRow = await db.quickIntake.findUnique({
        where: { shareToken: payment.intakeToken },
        select: { contactEmail: true },
      });
      if (intakeRow?.contactEmail) {
        const { sendEmail } = await import("@/server/services/email");
        await sendEmail({
          to: intakeRow.contactEmail,
          subject: `${activated.clientName} — votre achat est confirmé, votre stratégie s'assemble`,
          tag: "payment-confirmation",
          html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a"><p style="font-weight:bold;font-size:17px">Merci — votre paiement est confirmé.</p><p>Votre marque <strong>${activated.clientName}</strong> est activée et votre stratégie complète est en cours d'assemblage (quelques minutes).</p>${share ? `<p style="margin:20px 0"><a href="${share.url}" style="background:#E56458;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">Consulter ma stratégie</a></p><p style="font-size:13px;color:#555">Ou copiez ce lien : ${share.url}</p>` : ""}</div>`,
          text: `Votre paiement est confirmé. ${activated.clientName} est activée.${share ? ` Votre stratégie : ${share.url}` : ""}`,
        });
      }
    } catch {
      /* email best-effort */
    }
  } catch (err) {
    console.error("[paid-fulfillment] échec (non-bloquant):", err);
  }
}

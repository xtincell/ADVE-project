"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

const field = "mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm";
const button = "rounded-lg border border-border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
type Reconciliation = { dealId: string; requestId: string; observedAmount: number; currency: string; externalReference: string; evidence: string };
function uncertain(cause: unknown) { const code = (cause as { data?: { code?: string } }).data?.code; return !code || ["TIMEOUT", "INTERNAL_SERVER_ERROR"].includes(code); }

/** Financial proof stays in the existing sales desk and is never inferred from a client's message. */
export function CrmSalesPayment({ dealId, strategyId, revision, node, canRequest }: { dealId: string; strategyId: string; revision: number; node: string; canRequest: boolean }) {
  const utils = trpc.useUtils();
  const requests = trpc.crm.listCommercialPaymentRequests.useQuery({ strategyId }, { refetchInterval: 10000 });
  const create = trpc.crm.requestSalesPayment.useMutation();
  const reconcile = trpc.crm.reconcileSalesPayment.useMutation();
  const [error, setError] = useState("");
  const [pendingRequest, setPendingRequest] = useState<{ dealId: string; requestId: string; expectedRevision: number } | null>(null);
  const [pendingReconciliation, setPendingReconciliation] = useState<Reconciliation | null>(null);
  const request = requests.data?.find(item => item.dealId === dealId);
  return <section aria-label="Règlement de l’affaire" className="space-y-3 rounded-lg border border-border p-4">
    <h3 className="font-medium">Règlement de l’affaire</h3>
    {requests.isLoading && <p className="text-sm text-foreground-muted">Chargement du règlement…</p>}
    {!requests.isLoading && !request && <>
      <p className="text-sm text-foreground-muted">La demande utilisera le prix, le bénéficiaire et la destination attestés dans le mandat. Un accord client est nécessaire avant sa création.</p>
      {canRequest && node === "ACCEPTED" && <button type="button" className={button} disabled={create.isPending} onClick={async () => {
        setError(""); const input = pendingRequest ?? { dealId, requestId: crypto.randomUUID(), expectedRevision: revision }; setPendingRequest(input);
        try { await create.mutateAsync(input); await utils.crm.invalidate(); setPendingRequest(null); }
        catch (cause) { if (!uncertain(cause)) setPendingRequest(null); setError((cause as Error).message); }
      }}>{create.isPending ? "Vérification en cours…" : pendingRequest ? "Vérifier la même demande" : "Créer la demande de règlement"}</button>}
    </>}
    {request && <>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-foreground-muted">État</dt><dd>{request.status === "PAID" ? "Règlement rapproché" : request.status === "FAILED" ? "Demande à vérifier" : "En attente de rapprochement financier"}{request.paidAt && <><br />{new Date(request.paidAt).toLocaleString("fr-FR")}</>}</dd></div>
        <div><dt className="text-foreground-muted">Montant attendu</dt><dd>{new Intl.NumberFormat("fr-FR", { style: "currency", currency: request.currency }).format(request.amount)}</dd></div>
        <div><dt className="text-foreground-muted">Référence à communiquer</dt><dd className="break-words">{request.reference}</dd></div>
        <div><dt className="text-foreground-muted">Bénéficiaire et destination</dt><dd className="break-words">{request.beneficiary}<br />{request.destinationRef}</dd></div>
        <div className="sm:col-span-2"><dt className="text-foreground-muted">Instructions de règlement</dt><dd className="whitespace-pre-wrap break-words">{request.paymentInstructions}</dd></div>
      </dl>
      <p className="text-xs text-foreground-muted">Un message client ne confirme pas un paiement. Le rapprochement exige le montant effectivement reçu et une preuve externe vérifiée par le responsable financier.</p>
      {request.status !== "PAID" && request.canReconcile && <details><summary className="cursor-pointer text-sm underline">Rapprocher un règlement reçu</summary>
        <form aria-label="Rapprocher un règlement reçu" className="mt-3 space-y-3" onSubmit={async event => {
          event.preventDefault(); setError(""); const form = new FormData(event.currentTarget);
          const input = pendingReconciliation ?? { dealId, requestId: crypto.randomUUID(), observedAmount: Number(form.get("amount")), currency: String(form.get("currency") ?? "").trim(), externalReference: String(form.get("externalReference") ?? "").trim(), evidence: String(form.get("evidence") ?? "").trim() };
          setPendingReconciliation(input);
          try { await reconcile.mutateAsync(input); await utils.crm.invalidate(); setPendingReconciliation(null); }
          catch (cause) { if (!uncertain(cause)) setPendingReconciliation(null); setError((cause as Error).message); }
        }}>
          <fieldset disabled={reconcile.isPending || Boolean(pendingReconciliation)} className="grid gap-3 sm:grid-cols-2">
            <label>Montant effectivement reçu<input className={field} name="amount" type="number" min="0" step="0.01" required /></label>
            <label>Devise reçue<input className={field} name="currency" pattern="[A-Z]{3}" maxLength={3} defaultValue={request.currency} required /></label>
            <label className="sm:col-span-2">Référence externe du règlement<input className={field} name="externalReference" minLength={3} maxLength={4000} required /></label>
            <label className="sm:col-span-2">Preuve externe vérifiée<textarea className={field} name="evidence" minLength={3} maxLength={4000} rows={3} placeholder="Référence du relevé, reçu ou confirmation indépendante consultée" required /></label>
          </fieldset>
          {pendingReconciliation && !reconcile.isPending && <p className="text-sm text-foreground-muted">Le résultat n’est pas confirmé. La vérification reprend la même preuve et la même demande.</p>}
          <button className={button} disabled={reconcile.isPending}>{reconcile.isPending ? "Vérification en cours…" : pendingReconciliation ? "Vérifier ce rapprochement" : "Confirmer le règlement reçu"}</button>
        </form>
      </details>}
      {request.status !== "PAID" && !request.canReconcile && <p className="text-xs text-foreground-muted">Le responsable financier désigné effectue le rapprochement.</p>}
    </>}
    {(error || requests.error) && <p role="alert" className="text-sm text-error">{error || requests.error?.message}</p>}
  </section>;
}

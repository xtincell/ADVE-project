"use client";

/**
 * /console/governance/campaign-tracker/overton-delta-manual — Phase 23 Epic 3 Story 3.7.
 *
 * Operator-entry form for `CampaignAction.overtonDeltaManual` — the manual-first
 * peer (FR26) to the algorithmic embeddings path (FR13). Persists via
 * `campaignTracker.tagOvertonDeltaManual` which emits the governed
 * `OPERATOR_TAG_OVERTON_DELTA` Intent through `mestor.emitIntent` (hash-chained).
 *
 * UX-DR13 — manual-first as **peer toggle visible before any error**. The form
 * is the surface, not an error-recovery affordance. The downstream consumer
 * (`measureOvertonShift`) cannot distinguish operator-tagged vs algorithmic
 * except via the auditable `MANUAL_OPERATOR_DELTA` degradation code.
 *
 * Keyboard flow : form open → tab through inputs → enter to submit. All inputs
 * are native HTML elements with no focus-trap workarounds.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";

export default function OvertonDeltaManualPage() {
  const [strategyId, setStrategyId] = useState("");
  const [campaignActionId, setCampaignActionId] = useState("");
  const [overtonDeltaManual, setOvertonDeltaManual] = useState("0");
  const [reason, setReason] = useState("");
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const mutation = trpc.campaignTracker.tagOvertonDeltaManual.useMutation({
    onSuccess: (result) => {
      setLastResult(result.summary);
      setLastError(null);
    },
    onError: (err) => {
      setLastError(err.message);
      setLastResult(null);
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = Number.parseFloat(overtonDeltaManual);
    if (!Number.isFinite(parsed) || parsed < -1 || parsed > 1) {
      setLastError("overtonDeltaManual doit être un nombre fini dans [-1, 1].");
      setLastResult(null);
      return;
    }
    mutation.mutate({
      strategyId: strategyId.trim(),
      campaignActionId: campaignActionId.trim(),
      overtonDeltaManual: parsed,
      reason: reason.trim() || undefined,
    });
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Manual Overton delta — operator tag"
        description="Phase 23 Epic 3 Story 3.7 (ADR-0078 + ADR-0060). Surface peer manual-first à la voie algorithmique (measureOvertonShift). Gouverné via mestor.emitIntent — hash-chainé, auditable via IntentEmission.payload.source = MANUAL_OPERATOR."
      />

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div className="space-y-1">
          <label htmlFor="strategyId" className="block text-sm font-medium text-foreground">
            Strategy ID
          </label>
          <input
            id="strategyId"
            type="text"
            required
            autoFocus
            value={strategyId}
            onChange={(e) => setStrategyId(e.target.value)}
            className="w-full rounded-md bg-surface px-3 py-2 text-sm text-foreground ring-1 ring-inset ring-border focus:ring-2 focus:ring-accent focus:outline-none"
            placeholder="cuid de la Strategy"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="campaignActionId" className="block text-sm font-medium text-foreground">
            CampaignAction ID
          </label>
          <input
            id="campaignActionId"
            type="text"
            required
            value={campaignActionId}
            onChange={(e) => setCampaignActionId(e.target.value)}
            className="w-full rounded-md bg-surface px-3 py-2 text-sm text-foreground ring-1 ring-inset ring-border focus:ring-2 focus:ring-accent focus:outline-none"
            placeholder="cuid de la CampaignAction"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="overtonDeltaManual" className="block text-sm font-medium text-foreground">
            Overton delta manuel <span className="text-foreground-secondary">(plage [-1, 1])</span>
          </label>
          <input
            id="overtonDeltaManual"
            type="number"
            step="0.01"
            min={-1}
            max={1}
            required
            value={overtonDeltaManual}
            onChange={(e) => setOvertonDeltaManual(e.target.value)}
            className="w-full rounded-md bg-surface px-3 py-2 text-sm font-mono text-foreground ring-1 ring-inset ring-border focus:ring-2 focus:ring-accent focus:outline-none"
          />
          <p className="text-xs text-foreground-secondary">
            +1 = secteur déplacé vers l&apos;hypothèse de marque · -1 = secteur résiste / s&apos;éloigne.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="reason" className="block text-sm font-medium text-foreground">
            Raison <span className="text-foreground-secondary">(optionnel — persiste dans IntentEmission.payload)</span>
          </label>
          <textarea
            id="reason"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-md bg-surface px-3 py-2 text-sm text-foreground ring-1 ring-inset ring-border focus:ring-2 focus:ring-accent focus:outline-none"
            placeholder="Pourquoi cette valeur manuelle vs la voie algorithmique ?"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {mutation.isPending ? "Émission Intent…" : "Tagger overtonDeltaManual"}
          </button>
          <span className="text-xs text-foreground-secondary">
            Soumet via mestor.emitIntent (OPERATOR_TAG_OVERTON_DELTA)
          </span>
        </div>
      </form>

      {lastResult ? (
        <div className="rounded-md bg-emerald-400/10 p-4 text-sm text-emerald-400 ring-1 ring-inset ring-emerald-400/30">
          <div className="font-semibold">Tag persisté</div>
          <div className="mt-1 text-foreground-secondary">{lastResult}</div>
        </div>
      ) : null}

      {lastError ? (
        <div className="rounded-md bg-error/10 p-4 text-sm text-error ring-1 ring-inset ring-red-400/30">
          <div className="font-semibold">Erreur</div>
          <div className="mt-1 text-foreground-secondary">{lastError}</div>
        </div>
      ) : null}

      <footer className="rounded-lg bg-surface-secondary p-4 text-xs text-foreground-secondary ring-1 ring-inset ring-border">
        <div className="font-semibold text-foreground">Pourquoi ce surface manuel ?</div>
        <p className="mt-2">
          ADR-0060 manual-first parity invariant : toute mesure LLM/algorithmique
          ship un peer manuel. Pour l&apos;Overton, la voie algorithmique
          (<code>measureOvertonShift</code>) délègue à <code>sector-intelligence</code> ;
          le peer manuel est ce formulaire. Quand les deux valeurs existent, la
          voie algorithmique consomme la manuelle (override opérateur) et stamp
          le résultat avec <code>MANUAL_OPERATOR_DELTA</code> dans les
          degradationCodes — auditable au runtime ET dans le log Mestor
          (IntentEmission.payload.source = <code>MANUAL_OPERATOR</code>).
        </p>
      </footer>
    </div>
  );
}

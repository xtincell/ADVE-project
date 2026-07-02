"use client";

import { useActionState } from "react";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney, formatRate } from "@/components/payouts/status";
import type { FormState } from "@/lib/forms";
import { validateMissionAction } from "./actions";

/**
 * Gate DELIVERED → VALIDATED d'une mission gagnée VIA LA GUILDE (WP-024) :
 * la validation crée l'ordre de gain du talent dans la même transaction.
 * Le brut est l'estimation dailyRate × jours quand elle est dérivable
 * (champ optionnel pour la corriger), sinon la saisie du montant convenu
 * est OBLIGATOIRE — jamais de montant inventé. Taux, commission et net
 * affichés viennent du référentiel (« commission », guild.rate) ; barème
 * absent = validation désactivée avec la marche à suivre, dit tel quel.
 */
export type ValidatePayoutFormProps = {
  missionId: string;
  campaignId: string;
  talentName: string;
  currency: string;
  dailyRate: number | null;
  days: number | null;
  estimatedGross: number | null;
  /** Taux en vigueur — null = référentiel non seedé (soumission désactivée). */
  rate: { value: number; placeholder: boolean } | null;
};

export function ValidateMissionForm({
  missionId,
  campaignId,
  talentName,
  currency,
  dailyRate,
  days,
  estimatedGross,
  rate,
}: ValidatePayoutFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    validateMissionAction,
    null,
  );

  const estimatedCommission =
    estimatedGross !== null && rate !== null ? Math.round(estimatedGross * rate.value) : null;
  const estimatedNet =
    estimatedGross !== null && estimatedCommission !== null
      ? estimatedGross - estimatedCommission
      : null;

  return (
    <form action={formAction} className="space-y-3" aria-label="Valider la livraison">
      <input type="hidden" name="missionId" value={missionId} />
      <input type="hidden" name="campaignId" value={campaignId} />

      {rate === null ? (
        <p className="rounded-md border border-coral/40 bg-coral/8 px-4 py-3 text-sm text-sand">
          Barème de commission Guilde introuvable dans le référentiel (famille «&nbsp;commission&nbsp;»,
          clé «&nbsp;guild.rate&nbsp;») — le gain de {talentName} ne se calcule pas sans taux.
          Demandez à l&apos;opérateur de le poser dans les référentiels, puis revenez valider.
        </p>
      ) : estimatedGross !== null ? (
        <div className="rounded-md border border-line-soft bg-ink-3/40 px-4 py-3 text-sm text-sand">
          <p>
            Gain estimé de <span className="font-semibold text-sand-2">{talentName}</span> :{" "}
            {days} jour{days !== null && days > 1 ? "s" : ""} ×{" "}
            {dailyRate !== null ? formatMoney(dailyRate, currency) : "—"} ={" "}
            <span className="font-semibold text-bone">{formatMoney(estimatedGross, currency)}</span>{" "}
            brut
          </p>
          <p className="mt-1 font-mono text-[11px] text-smoke-2">
            commission {formatRate(rate.value)}
            {rate.placeholder ? " (taux à confirmer par l'opérateur)" : ""} ={" "}
            {estimatedCommission !== null ? formatMoney(estimatedCommission, currency) : "—"} · net
            talent {estimatedNet !== null ? formatMoney(estimatedNet, currency) : "—"}
          </p>
        </div>
      ) : (
        <p className="rounded-md border border-line-soft bg-ink-3/40 px-4 py-3 text-sm text-sand">
          Le gain de <span className="font-semibold text-sand-2">{talentName}</span> n&apos;est pas
          dérivable (tarif journalier non communiqué ou dates manquantes) — saisissez le montant
          brut convenu, en {currency}.
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="payout-gross" className="block text-sm font-semibold text-sand">
          Montant brut convenu ({currency})
          {estimatedGross !== null ? (
            <span className="ml-2 font-normal text-smoke-2">
              — optionnel, vide = estimation retenue
            </span>
          ) : null}
        </label>
        <Input
          id="payout-gross"
          name="grossAmount"
          inputMode="numeric"
          placeholder={
            estimatedGross !== null
              ? String(estimatedGross)
              : `Montant convenu avec ${talentName}, en ${currency}`
          }
          required={estimatedGross === null}
          maxLength={11}
          aria-invalid={Boolean(state?.fieldErrors?.grossAmount?.length) || undefined}
        />
        {state?.fieldErrors?.grossAmount?.[0] ? (
          <p className="text-sm text-coral" role="alert">
            {state.fieldErrors.grossAmount[0]}
          </p>
        ) : null}
      </div>

      {state?.formError ? (
        <p className="text-sm text-coral" role="alert">
          {state.formError}
        </p>
      ) : null}

      <Button type="submit" disabled={pending || rate === null}>
        <BadgeCheck aria-hidden />
        {pending ? "Validation…" : "Valider et créer l'ordre de gain"}
      </Button>
      <p className="text-xs text-smoke-2">
        La validation clôt le circuit et crée l&apos;ordre de gain (statut «&nbsp;en attente&nbsp;») —
        l&apos;opérateur l&apos;approuve puis règle le net en mobile money, sous 72&nbsp;h ouvrées.
      </p>
    </form>
  );
}

"use client";

/**
 * PricingModal — consultation des formules SANS quitter la page (mandat
 * opérateur 2026-07-13 : « le bouton doit déclencher une modale de
 * consultation des forfaits — 3 côte à côte avec prix et avantages, et un
 * bouton vers plus d'options ; pas une redirection immédiate »).
 *
 * Source de vérité : `payment.getTierGrid` (prix par pays, réduction ADMIN
 * appliquée serveur — jamais une grille statique). Les 3 abonnements montrés
 * ici sont les tiers récurrents d'entrée ; « Voir toutes les formules »
 * ouvre /pricing (one-shots, entreprise, détails complets).
 *
 * Registre client (ADR-0123) : zéro jargon interne.
 */

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Dialog, Button } from "@/components/primitives";
import { ArrowRight, Check } from "lucide-react";

const MODAL_TIERS = ["COCKPIT_MONTHLY", "RETAINER_BASE", "RETAINER_PRO"] as const;

function fmtAmount(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: currency === "EUR" || currency === "USD" ? 2 : 0,
  }).format(amount);
  return `${formatted} ${currency === "XAF" ? "FCFA" : currency}`;
}

function billingLabel(billing: string): string {
  if (billing === "MONTHLY") return "/mois";
  if (billing === "ONE_SHOT") return " une fois";
  return "";
}

export function PricingModal({
  open,
  onClose,
  /** Contexte affiché en description (ex : « Suivi communauté »). */
  featureLabel,
}: {
  open: boolean;
  onClose: () => void;
  featureLabel?: string;
}) {
  const router = useRouter();
  const grid = trpc.payment.getTierGrid.useQuery(
    { countryCode: "CM" },
    { enabled: open, staleTime: 5 * 60_000 },
  );

  const tiers = (grid.data ?? []).filter((t) =>
    (MODAL_TIERS as readonly string[]).includes(t.key),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
      size="lg"
      title="Nos formules"
      description={
        featureLabel
          ? `${featureLabel} fait partie des abonnements — voici les formules, sans quitter votre page.`
          : "Choisissez la formule qui suit votre marque — sans quitter votre page."
      }
    >
      {grid.isLoading ? (
        <div className="ck-tiers">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ck-tiers__card ck-tiers__card--loading" />
          ))}
        </div>
      ) : tiers.length === 0 ? (
        <p className="ck-ops__note">
          Les formules sont momentanément indisponibles — réessayez ou consultez la page complète.
        </p>
      ) : (
        <div className="ck-tiers">
          {tiers.map((t, i) => (
            <div className="ck-tiers__card" key={t.key} data-featured={i === 1 || undefined}>
              <p className="ck-tiers__label">{t.label}</p>
              <p className="ck-tiers__price">
                {t.amount === 0 && t.adminFree ? (
                  <>
                    Offert
                    <span className="ck-tiers__list">{fmtAmount(t.listAmount, t.currencyCode)}</span>
                  </>
                ) : (
                  <>
                    {fmtAmount(t.amount, t.currencyCode)}
                    <span className="ck-tiers__per">{billingLabel(t.billing)}</span>
                  </>
                )}
              </p>
              {t.summary ? <p className="ck-tiers__sum">{t.summary}</p> : null}
              <ul className="ck-tiers__inc">
                {(t.inclusions ?? []).slice(0, 4).map((inc) => (
                  <li key={inc}><Check />{inc}</li>
                ))}
              </ul>
              <Button
                size="sm"
                variant={i === 1 ? "primary" : "outline"}
                onClick={() => router.push(`/pricing?tier=${encodeURIComponent(t.key)}`)}
              >
                Choisir cette formule
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="ck-tiers__foot">
        <Button variant="link" onClick={() => router.push("/pricing")}>
          Voir toutes les formules et options <ArrowRight />
        </Button>
      </div>
    </Dialog>
  );
}

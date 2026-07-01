"use client";

/**
 * <LaFuseeTierPrices> — prix CONCRETS des paliers La Fusée sur /tarifs.
 *
 * Corrige le constat opérateur : la page tarifs n'affichait aucun prix pour les
 * one-shots (« Gratuit → sur devis », fourchettes) alors que ce sont des
 * produits à PRIX FIXE. Ici on affiche le prix réel résolu par zone (déterministe,
 * via `getTierGrid` → `buildTierGrid`), un par palier — jamais une fourchette,
 * jamais « sur devis » (sauf Enterprise multi-marques, légitimement cadré sur mesure).
 *
 * On affiche `listAmount` (le prix catalogue réel) et non `amount` (qui tombe à 0
 * pour un compte admin/god-mode) : une page tarifs montre toujours le prix public.
 * Les PRESTATIONS agence sur mesure (audit, charte, production) restent sur devis
 * dans le catalogue statique — c'est honnête, elles sont cadrées au périmètre.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";

const ZONES = [
  { code: "CM", label: "Cameroun (FCFA)" },
  { code: "CI", label: "Côte d'Ivoire (FCFA)" },
  { code: "SN", label: "Sénégal (FCFA)" },
  { code: "FR", label: "Europe (EUR)" },
  { code: "US", label: "International (USD)" },
] as const;

const ONE_SHOT_KEYS = new Set(["INTAKE_PDF", "ORACLE_FULL"]);
const MONTHLY_KEYS = new Set(["COCKPIT_MONTHLY", "RETAINER_BASE", "RETAINER_PRO", "RETAINER_ENTERPRISE"]);

function fmtAmount(amount: number, currency: string): string {
  if (amount === 0) return "Gratuit";
  const formatted = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: currency === "EUR" || currency === "USD" ? 2 : 0,
  }).format(amount);
  return `${formatted} ${currency}`;
}

export function LaFuseeTierPrices() {
  const [country, setCountry] = useState<string>("CM");
  const { data: grid, isLoading } = trpc.payment.getTierGrid.useQuery({ countryCode: country });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-2xs uppercase tracking-widest text-foreground-secondary">Zone :</span>
        {ZONES.map((z) => (
          <button
            key={z.code}
            onClick={() => setCountry(z.code)}
            className={`border px-3 py-1.5 font-mono text-2xs uppercase tracking-wider transition-colors ${
              country === z.code ? "bg-accent text-accent-foreground border-accent" : "hover:border-accent"
            }`}
            style={country === z.code ? {} : { borderColor: "color-mix(in oklab, var(--color-foreground) 18%, transparent)" }}
          >
            {z.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse border border-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {grid?.map((tier) => {
            const oneShot = ONE_SHOT_KEYS.has(tier.key);
            const monthly = MONTHLY_KEYS.has(tier.key);
            const enterprise = tier.key === "RETAINER_ENTERPRISE";
            // Prix catalogue réel (listAmount) — toujours le prix public, même pour un admin.
            const priceText = enterprise && tier.listAmount === 0
              ? "Sur devis"
              : fmtAmount(tier.listAmount, tier.currencyCode);
            return (
              <div key={tier.key} className="flex flex-col gap-1 border border-border bg-background p-4">
                <span className="font-mono text-2xs uppercase tracking-widest text-accent">
                  {oneShot ? "À l'acte" : monthly ? "Abonnement" : "Gratuit"}
                </span>
                <span className="font-display text-base font-semibold tracking-tight">{tier.label}</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-display text-2xl font-semibold">{priceText}</span>
                  {monthly && !enterprise && tier.listAmount > 0 ? (
                    <span className="text-xs text-foreground-secondary">/ mois</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="font-mono text-2xs uppercase tracking-widest text-foreground-muted">
        ↳ Prix résolus par zone (déterministe) — un prix par palier, pas une fourchette. Diagnostic d&apos;entrée gratuit.
      </p>
    </div>
  );
}

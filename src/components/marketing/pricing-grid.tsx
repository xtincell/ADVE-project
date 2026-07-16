"use client";

/**
 * <PricingGrid> — grille tarifaire LA FUSÉE, localisée, sans chrome.
 * Prix RÉSOLUS par zone (SPU × market-factor × FX, déterministe) — jamais une
 * grille statique. C'est l'univers de prix du PRODUIT La Fusée (self-serve) :
 * diagnostic gratuit → one-shots à prix fixe (rapport, Oracle) → abonnements
 * « à partir de » (Cockpit, Retainers) → Enterprise sur devis.
 *
 * NB : les PRESTATIONS agence d'UPgraders (Audit ADVE, Mandat RTIS, Marque
 * blanche) ne vivent PAS ici — elles sont sur /tarifs (catalogue UPgraders),
 * sur devis. Ne pas re-mélanger les deux univers. `callbackPath` = retour login.
 */

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

const ZONES = [
  { code: "CM", label: "Cameroun (XAF)" },
  { code: "CI", label: "Côte d'Ivoire (XOF)" },
  { code: "SN", label: "Sénégal (XOF)" },
  { code: "GA", label: "Gabon (XAF)" },
  { code: "BJ", label: "Bénin (XOF)" },
  { code: "FR", label: "Europe (EUR)" },
  { code: "US", label: "International (USD)" },
] as const;

const MONTHLY_KEYS = new Set(["COCKPIT_MONTHLY", "RETAINER_BASE", "RETAINER_PRO", "RETAINER_ENTERPRISE"]);
const FEATURED_KEY = "RETAINER_PRO";

function fmtAmount(amount: number, currency: string): string {
  if (amount === 0) return "Gratuit";
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: currency === "EUR" || currency === "USD" ? 2 : 0 }).format(amount);
  return `${formatted} ${currency}`;
}

export function PricingGrid({ callbackPath = "/pricing" }: { callbackPath?: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [country, setCountry] = useState<string>("CM");
  const [pendingTier, setPendingTier] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: grid, isLoading } = trpc.payment.getTierGrid.useQuery({ countryCode: country });
  const initSubscription = trpc.payment.initSubscription.useMutation();
  const initManualSubscription = trpc.payment.initManualSubscription.useMutation();

  /**
   * Rail canonique d'abord (`initSubscription` AUTO : Stripe si carte + clé,
   * cycle mobile money sinon, gratuit ADMIN) — la copy promettait « carte
   * (Stripe/PayPal) à l'international » mais TOUTES les zones partaient sur
   * wa.me (audit 2026-07-16). Repli WhatsApp (validation manuelle) uniquement
   * si aucun provider n'est provisionné.
   */
  const handleSubscribe = async (tierKey: string) => {
    setCheckoutError(null);
    if (!session?.user) {
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
      return;
    }
    setPendingTier(tierKey);
    const typedTier = tierKey as "COCKPIT_MONTHLY" | "RETAINER_BASE" | "RETAINER_PRO" | "RETAINER_ENTERPRISE";
    try {
      const res = await initSubscription.mutateAsync({
        tierKey: typedTier,
        countryCode: country,
        returnUrl: `${window.location.origin}/cockpit?subscribed=1`,
      });
      if (res.mode === "ADMIN_FREE") { router.push("/cockpit"); return; }
      if (res.paymentUrl) { window.location.href = res.paymentUrl; return; }
      throw new Error("Aucune URL de paiement retournée.");
    } catch {
      // Provider indisponible (clé absente, zone non couverte) → paiement
      // manuel via WhatsApp, validé par l'équipe (ADR PR #258).
      try {
        const res = await initManualSubscription.mutateAsync({ tierKey: typedTier, countryCode: country });
        if (res.mode === "ADMIN_FREE") { router.push("/cockpit"); return; }
        if (res.whatsappUrl) { window.location.href = res.whatsappUrl; }
      } catch (err) {
        setCheckoutError(err instanceof Error ? err.message : "Échec de la demande d'abonnement.");
        setPendingTier(null);
      }
    }
  };

  return (
    <main className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-24">
      <div className="mb-8 flex items-baseline gap-3.5 font-mono text-2xs uppercase tracking-widest" style={{ color: "var(--color-foreground-secondary)" }}>
        <span className="h-px w-8 bg-accent" />
        La Fusée · Tarifs
      </div>

      <header className="mb-10 max-w-3xl">
        <h1 className="font-display font-semibold tracking-tight" style={{ fontSize: "var(--text-display)", lineHeight: 0.96 }}>
          Un prix par palier.<br />
          Recalculé pour <span className="relative inline-block">votre zone.<span className="absolute inset-x-[-2%] bottom-1 -z-10 h-[0.18em] bg-accent" style={{ transform: "skewX(-12deg)" }} /></span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm" style={{ color: "var(--color-foreground-secondary)" }}>
          Les montants sont résolus en temps réel selon votre marché (indice de zone + devise locale) —
          jamais une grille statique. Mobile money (CinetPay) en zone FCFA, carte (Stripe/PayPal) à
          l&apos;international. Chaque devis et chaque paiement sont tracés.
        </p>
        <p className="mt-3 text-sm" style={{ color: "var(--color-foreground-secondary)" }}>
          La Fusée est le produit self-serve d&apos;UPgraders. Pour les prestations agence
          (audit, mandat, marque blanche),{" "}
          <a href="/tarifs" className="underline hover:text-accent">voir les offres UPgraders →</a>
        </p>
      </header>

      <div className="mb-12 flex flex-wrap items-center gap-2">
        <span className="font-mono text-2xs uppercase tracking-widest" style={{ color: "var(--color-foreground-secondary)" }}>Zone :</span>
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

      {checkoutError && (
        <div className="mb-8 border border-error/40 bg-error/10 p-4 text-sm text-error">{checkoutError}</div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 animate-pulse border" style={{ borderColor: "color-mix(in oklab, var(--color-foreground) 12%, transparent)", background: "color-mix(in oklab, var(--color-foreground) 4%, transparent)" }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grid?.map((tier) => {
            const monthly = MONTHLY_KEYS.has(tier.key);
            const featured = tier.key === FEATURED_KEY;
            const enterprise = tier.key === "RETAINER_ENTERPRISE";
            return (
              <article
                key={tier.key}
                className={`relative flex min-h-[420px] flex-col gap-5 p-8 ${featured ? "" : "border border-border bg-background"}`}
                style={
                  featured
                    ? { background: "var(--color-foreground)", color: "var(--color-background)" }
                    : { borderColor: "color-mix(in oklab, var(--color-foreground) 18%, transparent)" }
                }
              >
                {featured && (
                  <span className="absolute -top-3 left-8 bg-accent px-2.5 py-1 font-mono text-2xs uppercase tracking-widest text-accent-foreground">
                    ★ Recommandé
                  </span>
                )}
                <header className="flex flex-col gap-1.5">
                  <span className="font-mono text-2xs uppercase tracking-widest text-accent">{tier.key.replaceAll("_", " ")}</span>
                  <h3 className="font-display text-3xl font-semibold tracking-tight">{tier.label}</h3>
                  <p className="text-sm opacity-75">{tier.summary}</p>
                </header>

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-semibold">
                      {enterprise && tier.listAmount === 0
                        ? "Sur devis"
                        : tier.adminFree
                          ? "Inclus"
                          : fmtAmount(tier.amount, tier.currencyCode)}
                    </span>
                    {tier.adminFree && tier.listAmount > 0 && (
                      <span className="text-sm line-through opacity-50">{fmtAmount(tier.listAmount, tier.currencyCode)}</span>
                    )}
                    {monthly && tier.amount > 0 && !tier.adminFree && <span className="text-sm opacity-60">/ mois</span>}
                  </div>
                </div>
                {tier.adminFree && (
                  <span className="-mt-3 inline-block w-fit bg-accent px-2 py-0.5 font-mono text-2xs uppercase tracking-widest text-accent-foreground">
                    Accès admin · -100%
                  </span>
                )}

                <ul className="flex flex-1 flex-col gap-2 text-sm">
                  {tier.inclusions.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-accent">▸</span>
                      <span className="opacity-85">{f}</span>
                    </li>
                  ))}
                </ul>

                {monthly ? (
                  enterprise ? (
                    <a
                      href="/contact?offre=lafusee-enterprise"
                      className="mt-auto inline-block bg-accent px-5 py-3 text-center font-mono text-[12px] uppercase tracking-widest text-accent-foreground hover:opacity-90"
                    >
                      Demander un devis →
                    </a>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(tier.key)}
                      disabled={pendingTier === tier.key}
                      className="mt-auto bg-accent px-5 py-3 font-mono text-[12px] uppercase tracking-widest text-accent-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {pendingTier === tier.key ? "Initialisation…" : tier.adminFree ? "Activer (offert) →" : session?.user ? "Payer via WhatsApp →" : "Se connecter pour s'abonner →"}
                    </button>
                  )
                ) : (
                  <a
                    href="/intake"
                    className={`mt-auto inline-block px-5 py-3 text-center font-mono text-[12px] uppercase tracking-widest hover:opacity-90 ${
                      tier.amount === 0 ? "bg-accent text-accent-foreground" : "border"
                    }`}
                    style={tier.amount === 0 ? {} : { borderColor: "currentColor" }}
                  >
                    {tier.amount === 0 ? "Lancer le diagnostic →" : "Via le diagnostic →"}
                  </a>
                )}
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-10 max-w-2xl text-xs" style={{ color: "var(--color-foreground-secondary)" }}>
        Zone FCFA : l&apos;abonnement fonctionne par cycles de 30 jours réglés en mobile money — pas de
        prélèvement automatique silencieux, vous re-consentez chaque cycle. International : abonnement
        récurrent Stripe, annulable à tout moment à fin de période. Les commissions Hub-Escrow sont
        dégressives avec votre palier (20 % → 8 %).
      </p>
    </main>
  );
}

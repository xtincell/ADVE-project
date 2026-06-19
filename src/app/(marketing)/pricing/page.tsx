"use client";

/**
 * /pricing — grille tarifaire publique localisée (Vague 5 mégasprint).
 *
 * Le product ladder complet (Blueprint §∞.3) avec prix RÉSOLUS par zone
 * (SPU × market-factor × FX + overrides — déterministe, jamais de grille
 * statique). CTA :
 *   - tiers one-shot (audit / Oracle) → funnel intake ;
 *   - tiers mensuels → checkout abonnement (Stripe recurring à
 *     l'international, cycle manuel mobile money en zone FCFA).
 */

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { MarketingNav } from "@/components/landing/marketing-nav";
import { MarketingFooter } from "@/components/landing/marketing-footer";

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

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [country, setCountry] = useState<string>("CM");
  const [pendingTier, setPendingTier] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: grid, isLoading } = trpc.payment.getTierGrid.useQuery({ countryCode: country });
  // Manual payment mechanic: "Payer" records a pending request + redirects to the
  // operator's WhatsApp. The operator validates it in the Console → tier activated.
  // Bypasses the automatic providers (which require creds). Admins are activated free.
  const initManualSubscription = trpc.payment.initManualSubscription.useMutation();

  const handleSubscribe = async (tierKey: string) => {
    setCheckoutError(null);
    if (!session?.user) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/pricing")}`);
      return;
    }
    setPendingTier(tierKey);
    try {
      const res = await initManualSubscription.mutateAsync({
        tierKey: tierKey as "COCKPIT_MONTHLY" | "RETAINER_BASE" | "RETAINER_PRO" | "RETAINER_ENTERPRISE",
        countryCode: country,
      });
      if (res.mode === "ADMIN_FREE") {
        router.push("/cockpit");
        return;
      }
      if (res.whatsappUrl) {
        // Redirect to WhatsApp to finalize; the request is already recorded for
        // operator validation. Access unlocks once the operator approves it.
        window.location.href = res.whatsappUrl;
      }
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : "Échec de la demande d'abonnement.");
      setPendingTier(null);
    }
  };

  return (
    <div data-theme="bone" className="min-h-screen bg-background text-foreground">
      <MarketingNav />

      <main className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)] py-24">
        <div className="mb-8 flex items-baseline gap-3.5 font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--color-foreground-secondary)" }}>
          <span className="h-px w-8 bg-accent" />
          Tarifs · Product ladder
        </div>

        <header className="mb-10 max-w-3xl">
          <h1 className="font-display font-semibold tracking-tight" style={{ fontSize: "var(--text-display)", lineHeight: 0.96 }}>
            Un prix par palier.<br />
            Recalculé pour <span className="relative inline-block">votre zone.<span className="absolute inset-x-[-2%] bottom-1 -z-10 h-[0.18em] bg-accent" style={{ transform: "skewX(-12deg)" }} /></span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm" style={{ color: "var(--color-foreground-secondary)" }}>
            Les montants sont résolus en temps réel selon votre marché (indice de zone + devise locale) —
            jamais une grille statique. Mobile money (CinetPay) en zone FCFA, carte (Stripe/PayPal) à
            l'international. Chaque devis et chaque paiement sont tracés.
          </p>
        </header>

        {/* Sélecteur de zone */}
        <div className="mb-12 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--color-foreground-secondary)" }}>
            Zone :
          </span>
          {ZONES.map((z) => (
            <button
              key={z.code}
              onClick={() => setCountry(z.code)}
              className={`border px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider transition-colors ${
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

        {/* Grille */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                  className={`relative flex min-h-[420px] flex-col gap-5 p-8 ${featured ? "" : "border bg-white"}`}
                  style={
                    featured
                      ? { background: "var(--color-foreground)", color: "var(--color-background)" }
                      : { borderColor: "color-mix(in oklab, var(--color-foreground) 18%, transparent)" }
                  }
                >
                  {featured && (
                    <span className="absolute -top-3 left-8 bg-accent px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-accent-foreground">
                      ★ Recommandé
                    </span>
                  )}
                  <header className="flex flex-col gap-1.5">
                    <span className="font-mono text-[11px] uppercase tracking-widest text-accent">{tier.key.replaceAll("_", " ")}</span>
                    <h3 className="font-display text-3xl font-semibold tracking-tight">{tier.label}</h3>
                    <p className="text-sm opacity-75">{tier.summary}</p>
                  </header>

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
                  {tier.adminFree && (
                    <span className="-mt-3 inline-block w-fit bg-accent px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-accent-foreground">
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
                        href="mailto:alexandre@upgraders.com?subject=La%20Fus%C3%A9e%20%E2%80%94%20Enterprise"
                        className="mt-auto inline-block bg-accent px-5 py-3 text-center font-mono text-[12px] uppercase tracking-widest text-accent-foreground hover:opacity-90"
                      >
                        Briefer un opérateur →
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
          Zone FCFA : l'abonnement fonctionne par cycles de 30 jours réglés en mobile money — pas de
          prélèvement automatique silencieux, vous re-consentez chaque cycle. International : abonnement
          récurrent Stripe, annulable à tout moment à fin de période. Les commissions Hub-Escrow sont
          dégressives avec votre palier (20 % → 8 %).
        </p>
      </main>

      <MarketingFooter />
    </div>
  );
}

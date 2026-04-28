// ============================================================================
// MODULE M35 — Quick Intake Portal: Result Page (MVP)
// Spec: §5.2 | Division: L'Oracle
// ============================================================================
//
// MVP scope (rev 6):
//   - Tiny ADVE score badge in header (de-emphasized — not the focus)
//   - WRITTEN ADVE diagnostic (4 pillar paragraphs, free preview + paywalled full)
//   - WRITTEN RTIS strategic proposition (3 axes, free preview + paywalled full)
//   - Paywall = 0 FCFA (free unlock; gate stays in place to flip to a real
//     price later without UI changes)
//   - Post-unlock CTA: "Activer mon cockpit" → calls quickIntake.activateBrand
//     (creates Client + Strategy linked to the prospect's email)
//
// ROUTE: /intake/[token]/result
// ============================================================================

"use client";

import { use, useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import {
  Loader2, Lock, Check, ArrowRight, Sparkles, Rocket, ShieldCheck, AlertTriangle,
} from "lucide-react";

// ── Types matching the narrative-report service ────────────────────
interface AdvePillarReport {
  key: "a" | "d" | "v" | "e";
  name: string;
  preview: string;
  full: string;
}
interface RtisAxis {
  title: string;
  preview: string;
  full: string;
  priority: "P0" | "P1" | "P2";
}
interface NarrativeReport {
  executiveSummary: string;
  adve: AdvePillarReport[];
  rtis: { framing: string; axes: RtisAxis[] };
}

interface Diagnostic {
  classification?: string;
  summary?: string;
  narrativeReport?: NarrativeReport;
}

const PRIORITY_LABEL: Record<RtisAxis["priority"], string> = {
  P0: "Urgent",
  P1: "Sous 30 jours",
  P2: "Roadmap",
};
const PRIORITY_COLOR: Record<RtisAxis["priority"], string> = {
  P0: "border-destructive/40 bg-destructive/10 text-destructive",
  P1: "border-warning/40 bg-warning/10 text-warning",
  P2: "border-border bg-card text-foreground-muted",
};

export default function IntakeResult({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      }
    >
      <IntakeResultContent params={params} />
    </Suspense>
  );
}

function IntakeResultContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const searchParams = useSearchParams();
  const paymentRef = searchParams.get("ref");
  const paymentStatus = searchParams.get("status");

  const [unlockedByPayment, setUnlockedByPayment] = useState(false);
  const [paywallLoading, setPaywallLoading] = useState(false);
  const [activated, setActivated] = useState<{ clientName: string; userEmail: string } | null>(null);

  const { data: me } = trpc.auth.me.useQuery();
  const isAdmin = me?.role === "ADMIN";

  const { data: intake, isLoading, error, refetch } = trpc.quickIntake.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: 2, staleTime: 0 },
  );

  // Verify payment if redirected from provider (?ref=xxx&status=paid)
  const { data: paymentData } = trpc.payment.verifyPayment.useQuery(
    { reference: paymentRef ?? "" },
    { enabled: !!paymentRef && paymentStatus === "paid", retry: 1 },
  );

  // Free pricing payload (drives the paywall card label)
  const { data: pricing } = trpc.payment.getPricing.useQuery(
    { country: intake?.country ?? undefined },
    { enabled: !!intake },
  );

  useEffect(() => {
    if (paymentData?.paid === true) setUnlockedByPayment(true);
  }, [paymentData]);

  const isPaid = isAdmin || unlockedByPayment || paymentData?.paid === true;
  const isFree = (pricing?.prices.fcfa ?? 0) === 0 && (pricing?.prices.eur ?? 0) === 0;

  // ── Paywall ────────────────────────────────────────────────────────
  const initPaymentMutation = trpc.payment.initIntakeReport.useMutation({
    onSuccess: (data) => {
      // For free unlock, the mock provider auto-confirms — just redirect to
      // the same URL with ?ref=...&status=paid; verifyPayment will flip the gate.
      window.location.href = data.paymentUrl;
    },
    onError: () => setPaywallLoading(false),
  });

  const handleUnlockClick = useCallback(() => {
    if (!intake) return;
    setPaywallLoading(true);
    initPaymentMutation.mutate({
      intakeToken: token,
      provider: "AUTO",
      returnUrl:
        typeof window !== "undefined" ? window.location.origin + window.location.pathname : "",
    });
  }, [intake, token, initPaymentMutation]);

  // ── Activate brand ────────────────────────────────────────────────
  const activateMutation = trpc.quickIntake.activateBrand.useMutation({
    onSuccess: (data) => {
      setActivated({ clientName: data.clientName, userEmail: data.userEmail });
      void refetch();
    },
  });

  // ── Loading / error ────────────────────────────────────────────────
  if (isLoading || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (error || !intake || !intake.advertis_vector) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
        <AlertTriangle className="h-10 w-10 text-warning" />
        <h1 className="mt-3 text-2xl font-bold text-foreground">Diagnostic non disponible</h1>
        <p className="mt-2 max-w-md text-foreground-muted">
          Ce diagnostic n'est pas encore termine ou le lien est invalide.
        </p>
        {error && <p className="mt-3 text-xs text-destructive">Erreur : {error.message}</p>}
      </main>
    );
  }

  // ── Score (small badge, not centerpiece) ───────────────────────────
  const vector = intake.advertis_vector as Record<string, number>;
  const cap = (v: number) => Math.round(Math.min(v, 25) * 10) / 10;
  const composite = Math.round(
    (cap(vector.a ?? 0) + cap(vector.d ?? 0) + cap(vector.v ?? 0) + cap(vector.e ?? 0)) * 10,
  ) / 10;

  const diagnostic = (intake.diagnostic as Diagnostic | null) ?? null;
  const report = diagnostic?.narrativeReport ?? null;
  const classification = diagnostic?.classification ?? null;
  const fallbackSummary = diagnostic?.summary ?? null;

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        {/* Header — small score, big report focus */}
        <header className="mb-10 flex flex-col gap-3 border-b border-border-subtle pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
              Rapport ADVE — Diagnostic de marque
            </p>
            <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
              {intake.companyName}
            </h1>
            {classification && (
              <p className="mt-1 text-sm text-foreground-muted">
                Classification : <span className="font-medium text-foreground">{classification}</span>
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-baseline gap-2 rounded-lg border border-border bg-card px-4 py-2">
            <span className="text-3xl font-bold tabular-nums text-foreground">{composite}</span>
            <span className="text-sm text-foreground-muted">/100</span>
          </div>
        </header>

        {/* Executive summary — always free */}
        {(report?.executiveSummary || fallbackSummary) && (
          <section className="mb-10 rounded-2xl border border-primary/20 bg-primary-subtle/20 p-6">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="h-4 w-4" />
              Synthese executive
            </h2>
            <p className="text-base leading-relaxed text-foreground">
              {report?.executiveSummary ?? fallbackSummary}
            </p>
          </section>
        )}

        {/* ── ADVE NARRATIVE ─────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="mb-1 text-lg font-bold text-foreground">Rapport ADVE</h2>
          <p className="mb-6 text-sm text-foreground-muted">
            Diagnostic narratif sur les quatre piliers de votre marque.
          </p>
          <div className="space-y-4">
            {report?.adve?.length ? (
              report.adve.map((p) => (
                <article
                  key={p.key}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <header className="mb-2 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-foreground">
                      {p.name}
                    </h3>
                    <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium tabular-nums text-foreground-muted">
                      {cap(vector[p.key] ?? 0).toFixed(1)} / 25
                    </span>
                  </header>
                  <p className="text-sm leading-relaxed text-foreground">
                    {p.preview}
                  </p>
                  {isPaid ? (
                    <p className="mt-3 border-t border-border-subtle pt-3 text-sm leading-relaxed text-foreground-secondary">
                      {p.full}
                    </p>
                  ) : (
                    <p className="mt-3 flex items-center gap-2 border-t border-border-subtle pt-3 text-xs text-foreground-muted">
                      <Lock className="h-3.5 w-3.5" />
                      Analyse approfondie disponible apres deblocage
                    </p>
                  )}
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-foreground-muted">
                Le rapport narratif est en cours de generation. Recharge la page dans quelques secondes.
              </p>
            )}
          </div>
        </section>

        {/* ── RTIS PROPOSITION ──────────────────────────────────────── */}
        {report?.rtis && (
          <section className="mb-10">
            <h2 className="mb-1 text-lg font-bold text-foreground">Proposition strategique RTIS</h2>
            <p className="mb-4 text-sm text-foreground-muted">{report.rtis.framing}</p>
            <div className="space-y-4">
              {report.rtis.axes.map((axis, i) => (
                <article key={i} className="rounded-xl border border-border bg-card p-5">
                  <header className="mb-2 flex items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-foreground">{axis.title}</h3>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[axis.priority]}`}
                    >
                      {axis.priority} · {PRIORITY_LABEL[axis.priority]}
                    </span>
                  </header>
                  <p className="text-sm leading-relaxed text-foreground">{axis.preview}</p>
                  {isPaid ? (
                    <p className="mt-3 border-t border-border-subtle pt-3 text-sm leading-relaxed text-foreground-secondary">
                      {axis.full}
                    </p>
                  ) : (
                    <p className="mt-3 flex items-center gap-2 border-t border-border-subtle pt-3 text-xs text-foreground-muted">
                      <Lock className="h-3.5 w-3.5" />
                      Mecanique d'execution disponible apres deblocage
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ── PAYWALL CARD ──────────────────────────────────────────── */}
        {!isPaid && (
          <section className="mb-10 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-subtle/40 to-card p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground">
                  Debloquer le rapport complet
                </h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Acces integral au diagnostic ADVE et a la proposition strategique RTIS.
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">
                  {isFree ? "Gratuit" : pricing?.recommended === "CINETPAY"
                    ? `${pricing?.prices.fcfa ?? 0} FCFA`
                    : `${pricing?.prices.eur ?? 0} EUR`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUnlockClick}
              disabled={paywallLoading}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {paywallLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Deblocage...
                </>
              ) : (
                <>
                  Debloquer maintenant <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            {initPaymentMutation.error && (
              <p className="mt-3 text-xs text-destructive">
                {initPaymentMutation.error.message}
              </p>
            )}
          </section>
        )}

        {/* ── ACTIVATION CTA (post-unlock) ──────────────────────────── */}
        {isPaid && !activated && (
          <section className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/5 to-card p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Rocket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Activer votre cockpit</h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Creez votre espace marque pour piloter ces recommandations.
                </p>
              </div>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-foreground-secondary">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Votre marque <span className="font-semibold text-foreground">{intake.companyName}</span> est creee dans le systeme
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Vos recommandations RTIS sont attachees a votre cockpit
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Vous pourrez vous connecter avec <span className="font-mono text-foreground">{intake.contactEmail}</span> pour reprendre la main
              </li>
            </ul>

            <button
              type="button"
              onClick={() => activateMutation.mutate({ token })}
              disabled={activateMutation.isPending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Creation en cours...
                </>
              ) : (
                <>
                  Activer mon cockpit <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            {activateMutation.error && (
              <p className="mt-3 text-xs text-destructive">{activateMutation.error.message}</p>
            )}
          </section>
        )}

        {/* ── POST-ACTIVATION SUCCESS ──────────────────────────────── */}
        {activated && (
          <section className="rounded-2xl border border-primary/50 bg-primary/5 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/15 p-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  Cockpit cree pour {activated.clientName}
                </h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Inscrivez-vous avec <span className="font-mono text-foreground">{activated.userEmail}</span> pour acceder a votre marque.
                </p>
              </div>
            </div>
            <Link
              href={`/register?email=${encodeURIComponent(activated.userEmail)}`}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              Creer mon mot de passe <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}

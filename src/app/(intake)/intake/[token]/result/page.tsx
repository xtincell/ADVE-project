// ============================================================================
// MODULE M35 — Quick Intake Portal: Result Page (MVP)
// Spec: §5.2 | Division: L'Oracle
// ============================================================================
//
// MVP scope (rev 8 — values-first):
//   - PRIMARY: per-pillar EXTRACTED VALUES (the actual fields the system
//     produced from the brand's responses — what the client wants to see).
//   - SECONDARY: narrative commentary that CITES the extracted values.
//   - TERTIARY: small score badge in the header (de-emphasized).
//   - PARTIAL ADVE TABLE (4/8 pillars) — quick-glance after exec summary.
//   - WRITTEN RTIS strategic proposition (3 axes, FREE).
//   - CONTACT CTA — email + WhatsApp (Alexandre / La Fusee).
//   - Paywall gates the PDF DOWNLOAD only. 0 FCFA = free unlock.
//   - Post-unlock: download button enabled + "Activer mon cockpit" CTA.
//
// ROUTE: /intake/[token]/result
// ============================================================================

"use client";

import { use, useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import {
  Loader2, Check, ArrowRight, Sparkles, Rocket, ShieldCheck, AlertTriangle,
  Download, Mail, MessageCircle, Lock, Database,
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

const ADVE_PILLARS: { key: "a" | "d" | "v" | "e"; name: string; tagline: string }[] = [
  { key: "a", name: "Authenticite", tagline: "ADN & legitimite" },
  { key: "d", name: "Distinction", tagline: "Differenciation" },
  { key: "v", name: "Valeur", tagline: "Promesse & pricing" },
  { key: "e", name: "Engagement", tagline: "Communaute" },
];

const CONTACT_EMAIL = "xtincell@gmail.com";
const CONTACT_WHATSAPP_NUMBER = "237675583639";
const CONTACT_WHATSAPP_DISPLAY = "+237 675 58 36 39";

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

// ── Helpers for formatting extracted values ────────────────────────
function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[._-]/g, " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function flattenValue(value: unknown, depth = 0): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    return value
      .map((v) => (typeof v === "string" ? v : flattenValue(v, depth + 1)))
      .filter((v) => v && v.length > 0)
      .join(" · ");
  }
  if (typeof value === "object") {
    if (depth > 1) return JSON.stringify(value);
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => {
        const formatted = flattenValue(v, depth + 1);
        return formatted ? `${humanizeKey(k)} : ${formatted}` : "";
      })
      .filter(Boolean);
    return entries.join(" — ");
  }
  return "";
}

function flattenContent(content: Record<string, unknown>): Array<{ key: string; value: string }> {
  return Object.entries(content)
    .map(([k, v]) => ({ key: humanizeKey(k), value: flattenValue(v) }))
    .filter((entry) => entry.value && entry.value.length > 0);
}

function IntakeResultContent({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const searchParams = useSearchParams();
  const paymentRef = searchParams.get("ref");
  const paymentStatus = searchParams.get("status");

  const [unlockedByPayment, setUnlockedByPayment] = useState(false);
  const [paywallLoading, setPaywallLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [activated, setActivated] = useState<{ clientName: string; userEmail: string } | null>(null);
  // Scoped to the printable section so the paywall + CTA cards don't end up in the PDF.
  const reportRef = useRef<HTMLDivElement>(null);

  const { data: me } = trpc.auth.me.useQuery();
  const isAdmin = me?.role === "ADMIN";

  const { data: intake, isLoading, error, refetch } = trpc.quickIntake.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: 2, staleTime: 0 },
  );

  // Extracted pillar values — drive the "Ce que le systeme a compris" section
  const { data: pillarsData } = trpc.quickIntake.getPillarsByToken.useQuery(
    { token },
    { enabled: !!intake?.convertedToId, staleTime: 0 },
  );

  const { data: paymentData } = trpc.payment.verifyPayment.useQuery(
    { reference: paymentRef ?? "" },
    { enabled: !!paymentRef && paymentStatus === "paid", retry: 1 },
  );

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

  // ── PDF download — uses the browser's native print-to-PDF dialog.
  // We avoid html2canvas because Tailwind v4 emits `oklch()/lab()` colors
  // that html2canvas can't parse. Native print respects the styles and
  // hides the paywall + CTA via the `print:hidden` utility classes.
  const handlePdfDownload = useCallback(() => {
    if (typeof window === "undefined") return;
    setPdfError(null);
    setPdfGenerating(true);
    try {
      window.print();
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Echec de l'impression");
    } finally {
      // Brief loading flash while the print dialog opens
      setTimeout(() => setPdfGenerating(false), 800);
    }
  }, []);

  // ── Activate brand ─────────────────────────────────────────────────
  const activateMutation = trpc.quickIntake.activateBrand.useMutation({
    onSuccess: (data) => {
      setActivated({ clientName: data.clientName, userEmail: data.userEmail });
      void refetch();
    },
  });

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
  const pillarScores = ADVE_PILLARS.map((p) => ({ ...p, score: cap(vector[p.key] ?? 0) }));
  const composite = Math.round(pillarScores.reduce((s, p) => s + p.score, 0) * 10) / 10;

  const diagnostic = (intake.diagnostic as Diagnostic | null) ?? null;
  const report = diagnostic?.narrativeReport ?? null;
  const classification = diagnostic?.classification ?? null;
  const fallbackSummary = diagnostic?.summary ?? null;

  // Build a key-indexed map of extracted values for the per-pillar view.
  const extractedByKey: Record<string, Array<{ key: string; value: string }>> = {};
  for (const p of pillarsData?.pillars ?? []) {
    extractedByKey[p.key] = flattenContent(p.content as Record<string, unknown>);
  }

  return (
    <main className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        {/* Printable region — only the report body, not the paywall/CTA */}
        <div ref={reportRef} className="space-y-10">
          {/* Header */}
          <header className="flex flex-col gap-3 border-b border-border-subtle pb-6 sm:flex-row sm:items-end sm:justify-between">
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
              <span className="text-2xl font-bold tabular-nums text-foreground">{composite}</span>
              <span className="text-sm text-foreground-muted">/100</span>
            </div>
          </header>

          {/* Executive summary */}
          {(report?.executiveSummary || fallbackSummary) && (
            <section className="rounded-2xl border border-primary/20 bg-primary-subtle/20 p-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary">
                <Sparkles className="h-4 w-4" />
                Synthese executive
              </h2>
              <p className="text-base leading-relaxed text-foreground">
                {report?.executiveSummary ?? fallbackSummary}
              </p>
            </section>
          )}

          {/* ADVE — VALUES-FIRST PER PILLAR */}
          <section>
            <header className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-foreground">Ce que le systeme a compris</h2>
              <span className="rounded-full border border-border-subtle bg-card px-2 py-0.5 text-xs text-foreground-muted">
                4 piliers / 8 (R·T·I·S apres activation)
              </span>
            </header>
            <p className="mb-6 text-sm text-foreground-muted">
              Pour chaque pilier ADVE : les <span className="text-foreground">valeurs extraites</span> de votre marque, puis le commentaire strategique qui les analyse.
            </p>

            <div className="space-y-5">
              {ADVE_PILLARS.map((meta) => {
                const extracted = extractedByKey[meta.key] ?? [];
                const reportPillar = report?.adve?.find((p) => p.key === meta.key);
                const score = cap(vector[meta.key] ?? 0);
                return (
                  <article key={meta.key} className="rounded-xl border border-border bg-card p-5">
                    {/* Pillar header */}
                    <header className="mb-4 flex items-center justify-between gap-3 border-b border-border-subtle pb-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
                          {meta.key.toUpperCase()} · {meta.tagline}
                        </p>
                        <h3 className="mt-0.5 text-lg font-semibold text-foreground">{meta.name}</h3>
                      </div>
                      <div className="flex shrink-0 items-baseline gap-1 rounded-md bg-background px-2.5 py-1">
                        <span className="text-base font-semibold tabular-nums text-foreground">
                          {score.toFixed(1)}
                        </span>
                        <span className="text-xs text-foreground-muted">/25</span>
                      </div>
                    </header>

                    {/* EXTRACTED VALUES — primary content */}
                    <div className="mb-4">
                      <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                        <Database className="h-3.5 w-3.5" />
                        Valeurs extraites ({extracted.length})
                      </h4>
                      {extracted.length === 0 ? (
                        <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-foreground-muted">
                          Aucune valeur n'a pu etre extraite de vos reponses pour ce pilier. Le systeme attend des informations plus directes pour produire des champs exploitables.
                        </p>
                      ) : (
                        <dl className="space-y-2">
                          {extracted.map((entry, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-1 gap-1 rounded-lg border border-border-subtle bg-background p-3 sm:grid-cols-[180px_1fr] sm:gap-4"
                            >
                              <dt className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
                                {entry.key}
                              </dt>
                              <dd className="text-sm leading-relaxed text-foreground">
                                {entry.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>

                    {/* NARRATIVE — secondary, references the values above */}
                    {reportPillar && (
                      <div className="border-t border-border-subtle pt-4">
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                          Lecture strategique
                        </h4>
                        <p className="text-sm leading-relaxed text-foreground">
                          {reportPillar.preview}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">
                          {reportPillar.full}
                        </p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          {/* RTIS strategic proposition */}
          {report?.rtis && (
            <section>
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
                    <p className="mt-3 border-t border-border-subtle pt-3 text-sm leading-relaxed text-foreground-secondary">
                      {axis.full}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
        {/* end ref={reportRef} */}

        {/* CONTACT CTA */}
        <section className="mt-10 rounded-2xl border border-border bg-card p-6 print:hidden">
          <h2 className="mb-1 text-lg font-bold text-foreground">Echanger avec La Fusee</h2>
          <p className="mb-5 text-sm text-foreground-muted">
            Une question sur votre rapport ? Un projet a discuter ? Reponse sous 24h.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Rapport ADVE — ${intake.companyName}`)}`}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-background p-4 transition hover:border-primary/40 hover:bg-primary-subtle/10"
            >
              <div className="rounded-full bg-primary/10 p-2">
                <Mail className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">Email</p>
                <p className="truncate text-sm font-medium text-foreground">{CONTACT_EMAIL}</p>
              </div>
            </a>
            <a
              href={`https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Bonjour, je viens de finaliser mon diagnostic ADVE pour ${intake.companyName}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-background p-4 transition hover:border-primary/40 hover:bg-primary-subtle/10"
            >
              <div className="rounded-full bg-primary/10 p-2">
                <MessageCircle className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">WhatsApp</p>
                <p className="truncate text-sm font-medium text-foreground">{CONTACT_WHATSAPP_DISPLAY}</p>
              </div>
            </a>
          </div>
        </section>

        {/* PAYWALL — gates the PDF download */}
        <section className="mt-10 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-subtle/40 to-card p-6 sm:p-8 print:hidden">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              {isPaid ? <Check className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">
                Telecharger le rapport complet (PDF)
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Version PDF a partager en interne ou archiver. Inclut les valeurs extraites, le diagnostic ADVE et la proposition RTIS.
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

          {isPaid ? (
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={pdfGenerating}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Generation du PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> Telecharger le PDF
                </>
              )}
            </button>
          ) : (
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
                  Debloquer le telechargement <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
          {pdfError && <p className="mt-3 text-xs text-destructive">{pdfError}</p>}
          {initPaymentMutation.error && (
            <p className="mt-3 text-xs text-destructive">{initPaymentMutation.error.message}</p>
          )}
        </section>

        {/* ACTIVATION CTA */}
        {isPaid && !activated && (
          <section className="mt-10 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/5 to-card p-6 sm:p-8 print:hidden">
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
                La cascade RTIS (R·T·I·S) est lancee sur votre cockpit
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

        {/* POST-ACTIVATION SUCCESS */}
        {activated && (
          <section className="mt-10 rounded-2xl border border-primary/50 bg-primary/5 p-6 sm:p-8">
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

// ============================================================================
// MODULE M35 — Quick Intake Portal: Result Page (MVP rev 9)
// Spec: §5.2 | Division: L'Oracle
// ============================================================================
//
// Architecture (rev 9):
//   PAGE (web)                      |  PDF (print)
//   ───────────────────────────────────────────────────────────────────
//   Header + petit score badge      |  Cover (logo / marque / date)
//   Synthese executive              |  Intro templatee (par classification)
//   ADVE PARTIEL (2 valeurs/pilier  |  Contexte business (responses.biz)
//   + preview narratif)             |  ADVE COMPLET (toutes valeurs + full)
//   RTIS — 1 pilier preview only    |  RTIS COMPLET (4 piliers R/T/I/S)
//   Contact CTA (print:hidden)      |  Conclusion + CTA retainer
//   Paywall (print:hidden)          |  Annexe : reponses verbatim
//   Activation CTA (print:hidden)   |
//
// PDF generation: window.print() (Tailwind v4 emits oklch/lab colors that
// html2canvas cannot parse — native browser print is the clean path).
// Sections marked `hidden print:block` show up only in the PDF.
// ============================================================================

"use client";

import { use, useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import {
  Loader2, Check, ArrowRight, Sparkles, Rocket, ShieldCheck, AlertTriangle,
  Download, Mail, MessageCircle, Lock, Database,
} from "lucide-react";
import { PricingTiers, OracleTeaser, RapportPdfPreview } from "@/components/neteru";
import { Modal } from "@/components/shared/modal";
import { FootprintSection } from "./footprint-section";
import { ForceSection } from "./force-section";
import { AdvertisRadar } from "@/components/shared/advertis-radar";
import { PILLAR_KEYS } from "@/lib/types/advertis-vector";
import { HIDDEN_FIELDS, humanizeValue } from "@/server/services/quick-intake/report-composer";
import { useT } from "@/lib/i18n/use-t";

// ── Types matching the narrative-report service ────────────────────
interface AdvePillarReport {
  key: "a" | "d" | "v" | "e";
  name: string;
  preview: string;
  full: string;
}
interface RtisPillarReport {
  key: "r" | "t" | "i" | "s";
  name: string;
  preview: string;
  full: string;
  priority: "P0" | "P1" | "P2";
  keyMove: string;
}
/** V3 — autonomous strategic recommendation block (Opus). Optional: only
 *  present when `ModelPolicy[final-report].pipelineVersion === "V3"`. */
interface RecommendationBlock {
  strategicMove: string;
  why: string;
  prioritizedActions: Array<{
    title: string;
    rationale: string;
    when: "0-30j" | "30-90j" | "90j+";
    owner: "founder" | "operator" | "creative";
    successKpi: string;
    /** V3+ — exactly 2 concrete, applicable examples per action. */
    examples?: [string, string] | string[];
  }>;
  roadmap90d: {
    phase1_0_30j: string;
    phase2_30_60j: string;
    phase3_60_90j: string;
  };
  risksToWatch: string[];
  foundedOnTension: string;
}

interface NarrativeReport {
  executiveSummary: string;
  adve: AdvePillarReport[];
  rtis: { framing: string; pillars: RtisPillarReport[] };
  /** V3 only — central tension explicitly named, used by the recommendation. */
  centralTension?: string;
  /** V3 only — Opus strategic recommendation, rendered as its own block. */
  recommendation?: RecommendationBlock;
}

type BrandLevel = "LATENT" | "FRAGILE" | "ORDINAIRE" | "FORTE" | "CULTE" | "ICONE";

interface BrandLevelEvaluation {
  level: BrandLevel;
  confidence: number;
  justification: string;
  pillarSignals: Array<{ pillar: "a" | "d" | "v" | "e"; level: BrandLevel; signal: string }>;
  nextMilestone: { targetLevel: BrandLevel; headline: string; moves: string[] };
  pathToIcone: Array<{ level: BrandLevel; description: string; keyMilestone: string }>;
  iconeVision: string;
}

/** Plan d'action déterministe (généré par generateDiagnostic — jeté avant l'audit 2026-07-16). */
interface DiagnosticRecommendation {
  pillar: string;
  key: string;
  score: number;
  diagnostic: string;
  actions: string[];
}

interface Diagnostic {
  classification?: string;
  summary?: string;
  narrativeReport?: NarrativeReport;
  brandLevel?: BrandLevelEvaluation;
  strengths?: Array<{ pillar: string; key: string; score: number; insight?: string }>;
  recommendations?: DiagnosticRecommendation[];
}

// i18n keys — resolved with t() at render time (fragment intake-result.ts).
const LEVEL_TAGLINE: Record<BrandLevel, string> = {
  LATENT: "intakeResult.levelTagline.LATENT",
  FRAGILE: "intakeResult.levelTagline.FRAGILE",
  ORDINAIRE: "intakeResult.levelTagline.ORDINAIRE",
  FORTE: "intakeResult.levelTagline.FORTE",
  CULTE: "intakeResult.levelTagline.CULTE",
  ICONE: "intakeResult.levelTagline.ICONE",
};

const LEVEL_ORDER: BrandLevel[] = ["LATENT", "FRAGILE", "ORDINAIRE", "FORTE", "CULTE", "ICONE"];

const LEVEL_COLOR: Record<BrandLevel, string> = {
  LATENT: "border-destructive/50 bg-destructive/10 text-destructive",
  FRAGILE: "border-warning/50 bg-warning/10 text-warning",
  ORDINAIRE: "border-foreground-muted/50 bg-card text-foreground-muted",
  FORTE: "border-primary/50 bg-primary/10 text-primary",
  CULTE: "border-primary/70 bg-primary/20 text-primary",
  ICONE: "border-primary bg-primary/30 text-primary",
};

// ── Static constants ───────────────────────────────────────────────
// i18n keys — resolved with t() at render time.
const PRIORITY_LABEL: Record<RtisPillarReport["priority"], string> = {
  P0: "intakeResult.priority.P0",
  P1: "intakeResult.priority.P1",
  P2: "intakeResult.priority.P2",
};
const PRIORITY_COLOR: Record<RtisPillarReport["priority"], string> = {
  P0: "border-destructive/40 bg-destructive/10 text-destructive",
  P1: "border-warning/40 bg-warning/10 text-warning",
  P2: "border-border bg-card text-foreground-muted",
};

// name/tagline = i18n keys — resolved with t() at render time.
const ADVE_PILLARS: { key: "a" | "d" | "v" | "e"; name: string; tagline: string }[] = [
  { key: "a", name: "intakeResult.pillar.a.name", tagline: "intakeResult.pillar.a.tagline" },
  { key: "d", name: "intakeResult.pillar.d.name", tagline: "intakeResult.pillar.d.tagline" },
  { key: "v", name: "intakeResult.pillar.v.name", tagline: "intakeResult.pillar.v.tagline" },
  { key: "e", name: "intakeResult.pillar.e.name", tagline: "intakeResult.pillar.e.tagline" },
];
const RTIS_PILLARS_META: { key: "r" | "t" | "i" | "s"; name: string; tagline: string }[] = [
  { key: "r", name: "intakeResult.pillar.r.name", tagline: "intakeResult.pillar.r.tagline" },
  { key: "t", name: "intakeResult.pillar.t.name", tagline: "intakeResult.pillar.t.tagline" },
  { key: "i", name: "intakeResult.pillar.i.name", tagline: "intakeResult.pillar.i.tagline" },
  { key: "s", name: "intakeResult.pillar.s.name", tagline: "intakeResult.pillar.s.tagline" },
];

const CONTACT_EMAIL = "xtincell@gmail.com";
const CONTACT_WHATSAPP_NUMBER = "237675583639";
const CONTACT_WHATSAPP_DISPLAY = "+237 675 58 36 39";

// Template intro / conclusion that adapt to the classification.
// Values = i18n keys — resolved with t() at render time.
const CLASSIFICATION_INTRO: Record<string, string> = {
  LATENT: "intakeResult.intro.LATENT",
  FRAGILE: "intakeResult.intro.FRAGILE",
  ORDINAIRE: "intakeResult.intro.ORDINAIRE",
  FORTE: "intakeResult.intro.FORTE",
  CULTE: "intakeResult.intro.CULTE",
  ICONE: "intakeResult.intro.ICONE",
};

const CLASSIFICATION_RETAINER_PITCH: Record<string, string> = {
  LATENT: "intakeResult.retainer.LATENT",
  FRAGILE: "intakeResult.retainer.FRAGILE",
  ORDINAIRE: "intakeResult.retainer.ORDINAIRE",
  FORTE: "intakeResult.retainer.FORTE",
  CULTE: "intakeResult.retainer.CULTE",
  ICONE: "intakeResult.retainer.ICONE",
};

// ── Formatting helpers ─────────────────────────────────────────────
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
    // Plus jamais de JSON brut dans un rapport payant (audit 2026-07-16) —
    // le humanize borné du composer produit du texte lisible à toute profondeur.
    if (depth > 1) return humanizeValue(value) ?? "";
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
    // Champs méta/techniques (narrativeFull dupliqué, webPresence JSON,
    // fieldCertainty…) — même liste que le composer (audit 2026-07-16).
    .filter(([k]) => !HIDDEN_FIELDS.has(k))
    .map(([k, v]) => ({ key: humanizeKey(k), value: flattenValue(v) }))
    .filter((entry) => entry.value && entry.value.length > 0);
}

// Format the biz responses (positioning, business model, etc.) into a list.
function formatBizContext(
  intake: { businessModel?: string | null; economicModel?: string | null; positioning?: string | null; sector?: string | null; country?: string | null; responses?: unknown },
  t: (key: string) => string,
): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  if (intake.sector) out.push({ label: t("intakeResult.biz.sector"), value: intake.sector });
  if (intake.country) out.push({ label: t("intakeResult.biz.country"), value: intake.country });
  if (intake.businessModel) out.push({ label: t("intakeResult.biz.businessModel"), value: intake.businessModel });
  if (intake.economicModel) out.push({ label: t("intakeResult.biz.economicModel"), value: intake.economicModel });
  if (intake.positioning) out.push({ label: t("intakeResult.biz.positioning"), value: intake.positioning });
  // Free-form biz Q&A from the intake
  const bizResponses = (intake.responses as Record<string, unknown> | null)?.biz as
    | Record<string, unknown>
    | undefined;
  if (bizResponses) {
    for (const [k, v] of Object.entries(bizResponses)) {
      if (typeof v === "string" && v.trim()) {
        out.push({ label: humanizeKey(k), value: v });
      }
    }
  }
  return out;
}

// Verbatim — flatten the user's actual answers per pillar, for the appendix.
function formatVerbatim(
  intake: { rawText?: string | null; responses?: unknown },
  t: (key: string) => string,
): Array<{ pillar: string; entries: Array<{ q: string; a: string }> }> {
  const responses = intake.responses as Record<string, unknown> | null;
  if (!responses) {
    return intake.rawText
      ? [{ pillar: t("intakeResult.verbatim.freeText"), entries: [{ q: t("intakeResult.verbatim.freeDesc"), a: intake.rawText }] }]
      : [];
  }
  const groups: Array<{ pillar: string; entries: Array<{ q: string; a: string }> }> = [];
  const order = ["biz", "a", "d", "v", "e"];
  for (const k of order) {
    const v = responses[k];
    if (v && typeof v === "object") {
      const entries = Object.entries(v as Record<string, unknown>)
        .filter(([, val]) => typeof val === "string" && val.trim())
        .map(([q, val]) => ({ q: humanizeKey(q), a: String(val) }));
      if (entries.length > 0) {
        groups.push({ pillar: k === "biz" ? t("intakeResult.verbatim.biz") : `${t("intakeResult.verbatim.pillar")} ${k.toUpperCase()}`, entries });
      }
    }
  }
  return groups;
}

// ── Component ──────────────────────────────────────────────────────
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
  const { t } = useT();
  const { token } = use(params);
  const searchParams = useSearchParams();
  const paymentRef = searchParams.get("ref");
  const paymentStatus = searchParams.get("status");

  const [unlockedByPayment, setUnlockedByPayment] = useState(false);
  const [paywallLoading, setPaywallLoading] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [activated, setActivated] = useState<{ clientName: string; userEmail: string } | null>(null);
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

  const { data: me } = trpc.auth.me.useQuery();
  const isAdmin = me?.role === "ADMIN";

  const { data: intake, isLoading, error, refetch } = trpc.quickIntake.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: 2, staleTime: 0 },
  );

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

  // ── Tiered pricing grid (monetization service) ──
  const { data: tierGrid } = trpc.monetization.getTierGrid.useQuery(
    { countryCode: intake?.country ?? "FR" },
    { enabled: !!intake },
  );

  useEffect(() => {
    if (paymentData?.paid === true) setUnlockedByPayment(true);
  }, [paymentData]);

  // F1 async : pendant un traitement de fond (statut PROCESSING), la page
  // suit l'avancement — refetch 4 s jusqu'à l'état terminal réel en base.
  useEffect(() => {
    if (intake?.status !== "PROCESSING") return;
    const id = window.setInterval(() => void refetch(), 4_000);
    return () => window.clearInterval(id);
  }, [intake?.status, refetch]);

  const isPaid = isAdmin || unlockedByPayment || paymentData?.paid === true;
  // Use the canonical localized price (handles ALL currencies, not just XAF/XOF/EUR).
  // Default = paid (false) while pricing is loading/erroring — never claim "Gratuit"
  // before the pricing query has actually resolved.
  const isFree = pricing?.localized != null && pricing.localized.amount === 0;

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

  const handlePdfDownload = useCallback(async () => {
    if (typeof window === "undefined") return;
    setPdfError(null);
    setPdfGenerating(true);
    try {
      const res = await fetch(`/api/intake/${token}/pdf`, { method: "GET" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      // Filename is also sent by the server via Content-Disposition; this is a fallback.
      a.download = `rapport-adve-rtis-${token}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Defer revoke so the browser has time to start the download.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : t("intakeResult.download.error"));
    } finally {
      setPdfGenerating(false);
    }
  }, [token, t]);

  const activateMutation = trpc.quickIntake.activateBrand.useMutation({
    onSuccess: (data) => {
      setActivated({ clientName: data.clientName, userEmail: data.userEmail });
      void refetch();
    },
  });

  // Tier selection logic — extracted so the inline CTA, sticky CTA, and the
  // modal grid all dispatch through the same path. Without this the code
  // would diverge as soon as we add a third entry point.
  const handleSelectTier = useCallback(
    async (tierKey: string) => {
      if (!intake) return;
      if (tierKey === "INTAKE_PDF") {
        handleUnlockClick();
        return;
      }
      if (tierKey === "ORACLE_FULL") {
        setPaywallLoading(true);
        try {
          const result = await initPaymentMutation.mutateAsync({
            intakeToken: token,
            provider: "AUTO",
            returnUrl: window.location.href.split("?")[0]!,
            tierKey: "ORACLE_FULL",
          });
          window.location.href = result.paymentUrl;
        } catch (err) {
          console.error(err);
          setPaywallLoading(false);
        }
        return;
      }
      if (
        tierKey === "COCKPIT_MONTHLY"
        || tierKey === "RETAINER_BASE"
        || tierKey === "RETAINER_PRO"
        || tierKey === "RETAINER_ENTERPRISE"
      ) {
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        const res = await fetch(`${baseUrl}/api/trpc/monetization.initSubscription?batch=1`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "0": {
              json: {
                tierKey,
                countryCode: intake.country ?? "FR",
                email: intake.contactEmail,
                name: intake.contactName,
                returnUrl: `${baseUrl}/cockpit/new`,
              },
            },
          }),
        });
        type TrpcSubResp = Array<{ result?: { data?: { json?: { paymentUrl: string } } } }>;
        let url: string | undefined;
        try {
          const data = (await res.json()) as TrpcSubResp;
          url = data?.[0]?.result?.data?.json?.paymentUrl;
        } catch {
          url = undefined;
        }
        if (url) {
          window.location.href = url;
        } else {
          // Rail manuel WhatsApp (audit 2026-07-16 `funnel-monthly-cta-stripe-
          // only-dead-end`) : l'init Stripe-only échouait et le lead était
          // redirigé EN SILENCE vers l'ignition sans paiement ni explication.
          // Même rail que /pricing : la demande part sur WhatsApp.
          const waMessage =
            `Bonjour, je souhaite m'abonner à La Fusée — formule ${tierKey}. ` +
            `Marque : ${intake.companyName ?? "—"}. Email : ${intake.contactEmail ?? "—"}.`;
          window.location.href = `https://wa.me/237694171799?text=${encodeURIComponent(waMessage)}`;
        }
      }
    },
    [intake, token, handleUnlockClick, initPaymentMutation],
  );

  if (isLoading || !token) {
    // P2-3 (audit UX) — la page-récompense du parcours méritait mieux qu'un
    // spinner nu : contexte + attente cadrée.
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-5 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">{t("intakeResult.loading.title")}</p>
        <p className="text-xs text-foreground-muted">{t("intakeResult.loading.sub")}</p>
      </main>
    );
  }

  if (error || !intake) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
        <AlertTriangle className="h-10 w-10 text-warning" />
        <h1 className="mt-3 text-2xl font-bold text-foreground">{t("intakeResult.error.title")}</h1>
        <p className="mt-2 max-w-md text-foreground-muted">
          {t("intakeResult.error.body")}
        </p>
        {error && <p className="mt-3 text-xs text-destructive">{t("intakeResult.error.label")} {error.message}</p>}
        {/* P1-5 (audit UX) — refetch existait mais aucun bouton ne l'exposait :
            une erreur passagère (réseau) était un cul-de-sac. */}
        {error ? (
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {t("intakeResult.error.retry")}
          </button>
        ) : null}
      </main>
    );
  }

  // F1 async : un lien /result ouvert PENDANT le traitement de fond suit
  // l'avancement au lieu de renvoyer « non finalisé » — le rapport apparaît
  // tout seul à la fin (refetch 4 s, statut terminal réel uniquement).
  if (intake.status === "PROCESSING") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <h1 className="mt-4 text-xl font-bold text-foreground">{t("intakeResult.loading.title")}</h1>
        <p className="mt-2 max-w-md text-sm text-foreground-muted">{t("intakeResult.loading.sub")}</p>
      </main>
    );
  }

  // Status gate FIRST — an intake in any pre-completion state (IN_PROGRESS,
  // QUEUED, RECOVERED) must bounce back to the form. Renders before the
  // vector check so the user sees a meaningful CTA, not a generic "non
  // disponible" wall. Without this gate, a recovered intake (vector=null)
  // would simply hit the next branch's generic message — and an intake
  // left mid-completion with a stale vector would render a phantom report.
  if (intake.status !== "COMPLETED" && intake.status !== "CONVERTED") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
        <AlertTriangle className="h-10 w-10 text-warning" />
        <h1 className="mt-3 text-2xl font-bold text-foreground">{t("intakeResult.incomplete.title")}</h1>
        <p className="mt-2 max-w-md text-foreground-muted">
          {t("intakeResult.incomplete.body")}
        </p>
        <Link
          href={`/intake/${token}`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          {t("intakeResult.incomplete.cta")} <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    );
  }

  // Sanity gate — even if status says COMPLETED, refuse to render when the
  // canonical scoring vector is missing. That should not happen in practice
  // (complete() now refuses to score an empty intake), but defending the
  // boundary stays cheap.
  if (!intake.advertis_vector) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
        <AlertTriangle className="h-10 w-10 text-warning" />
        <h1 className="mt-3 text-2xl font-bold text-foreground">{t("intakeResult.corrupt.title")}</h1>
        <p className="mt-2 max-w-md text-foreground-muted">
          {t("intakeResult.corrupt.body")}
        </p>
        <Link
          href={`/intake/${token}`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          {t("intakeResult.incomplete.cta")} <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    );
  }

  const vector = intake.advertis_vector as Record<string, number>;
  const cap = (v: number) => Math.round(Math.min(v, 25) * 10) / 10;
  const composite = Math.round(
    (cap(vector.a ?? 0) + cap(vector.d ?? 0) + cap(vector.v ?? 0) + cap(vector.e ?? 0)) * 10,
  ) / 10;

  const diagnostic = (intake.diagnostic as Diagnostic | null) ?? null;
  const report = diagnostic?.narrativeReport ?? null;
  const brandLevel = diagnostic?.brandLevel ?? null;
  const classification = (brandLevel?.level ?? diagnostic?.classification ?? "NON_CLASSIFIE") as BrandLevel | "NON_CLASSIFIE";
  const fallbackSummary = diagnostic?.summary ?? null;
  const levelIdx = LEVEL_ORDER.indexOf(classification as BrandLevel);
  // lafusee:allow-adhoc-completion: intake wizard progress percentage (questionnaire step counter, not pillar completion)
  const levelProgressPct = levelIdx >= 0 ? Math.round(((levelIdx + 1) / LEVEL_ORDER.length) * 100) : 0;

  const extractedByKey: Record<string, Array<{ key: string; value: string }>> = {};
  for (const p of pillarsData?.pillars ?? []) {
    extractedByKey[p.key] = flattenContent(p.content as Record<string, unknown>);
  }

  // Page-only previews: 2 ADVE values per pillar, all 4 RTIS pillars
  // visible in preview mode (full paragraphs gated to the PDF).
  const PAGE_VALUES_PER_PILLAR = 2;

  const introText = t(CLASSIFICATION_INTRO[classification] ?? "intakeResult.intro.default");
  const retainerPitch = t(CLASSIFICATION_RETAINER_PITCH[classification] ?? "intakeResult.retainer.default");

  const bizContext = formatBizContext(intake, t);
  const verbatim = formatVerbatim(intake, t);
  const reportDate = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <main className="min-h-screen bg-background pb-24 print:bg-white print:pb-0">
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12 print:px-6 print:py-0">

        {/* ════════════════════════════════════════════════════════════
            PDF-ONLY: Cover page (hidden on screen)
        ════════════════════════════════════════════════════════════ */}
        <section className="hidden print:block print:mb-10 print:break-after-page">
          <div className="border-b-4 border-foreground pb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground-muted">
              {t("intakeResult.cover.kicker")}
            </p>
            <h1 className="mt-2 text-4xl font-bold text-foreground">{t("intakeResult.cover.title")}</h1>
            {/* Personnalisation (vague E) : identité visuelle DÉTECTÉE de la
                marque (og:image du site, déjà collectée) — jamais un logo
                inventé, rien si non détectée. */}
            {(() => {
              const og = ((intake as { webFootprint?: { site?: { ogImage?: string | null } | null } }).webFootprint?.site?.ogImage ?? null);
              return og ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={og} alt={intake.companyName} className="mt-4 max-h-20 w-auto max-w-[240px] object-contain" />
              ) : null;
            })()}
            <p className="mt-2 text-lg text-foreground-secondary">{intake.companyName}</p>
            <p className="mt-1 text-sm text-foreground-muted">
              {classification} · {t("intakeResult.cover.score")} {composite}/100 · {reportDate}
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 text-xs text-foreground-secondary">
            <div>
              <p className="font-bold uppercase tracking-wider text-foreground-muted">{t("intakeResult.cover.contact")}</p>
              <p className="mt-1">{intake.contactName}</p>
              <p>{intake.contactEmail}</p>
              {intake.contactPhone && <p>{intake.contactPhone}</p>}
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-foreground-muted">{t("intakeResult.cover.lafusee")}</p>
              <p className="mt-1">{CONTACT_EMAIL}</p>
              <p>{CONTACT_WHATSAPP_DISPLAY}</p>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            HEADER + LEVEL (page only — the LEVEL is the headline)
        ════════════════════════════════════════════════════════════ */}
        <header className="mb-10 print:hidden">
          <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
            {t("intakeResult.header.kicker")}
          </p>
          {/* Identité visuelle DÉTECTÉE (og:image du site collecté, ADR-0164) —
              jamais un visuel inventé, rien si non détectée. */}
          <div className="mt-1 flex items-center gap-4">
            {(() => {
              const og = ((intake as { webFootprint?: { site?: { ogImage?: string | null } | null } }).webFootprint?.site?.ogImage ?? null);
              return og ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={og}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-xl border border-border object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : null;
            })()}
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {intake.companyName}
            </h1>
          </div>

          {/* Level placement — the headline */}
          {classification !== "NON_CLASSIFIE" && (
            <div className="mt-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary-subtle/30 to-card p-5 sm:p-6">
              <p className="text-2xs font-bold uppercase tracking-widest text-primary">
                {t("intakeResult.header.levelKicker")}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                  {classification}
                </h2>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${LEVEL_COLOR[classification as BrandLevel]}`}>
                  {t(LEVEL_TAGLINE[classification as BrandLevel])}
                </span>
              </div>
              {brandLevel?.justification && (
                <p className="mt-3 text-sm leading-relaxed text-foreground">
                  {brandLevel.justification}
                </p>
              )}

              {/* Ladder progress */}
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-2xs font-semibold uppercase tracking-widest text-foreground-muted">
                  <span>{t("intakeResult.header.ladder")}</span>
                  <span>{t("intakeResult.header.ladderTarget")}</span>
                </div>
                <div className="grid grid-cols-6 gap-1">
                  {LEVEL_ORDER.map((lvl, i) => {
                    const reached = levelIdx >= i;
                    const isCurrent = levelIdx === i;
                    return (
                      <div
                        key={lvl}
                        className={`flex flex-col items-center rounded-md border px-1 py-1.5 ${
                          isCurrent
                            ? "border-primary bg-primary/15"
                            : reached
                              ? "border-primary/50 bg-primary/5"
                              : "border-border-subtle bg-background"
                        }`}
                      >
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider ${
                            isCurrent ? "text-primary" : reached ? "text-foreground" : "text-foreground-muted"
                          }`}
                        >
                          {lvl}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Next milestone — the immediate promise */}
              {brandLevel?.nextMilestone && classification !== "ICONE" && (
                <div className="mt-5 rounded-lg border border-primary/40 bg-card p-4">
                  <p className="text-2xs font-bold uppercase tracking-widest text-primary">
                    {t("intakeResult.header.nextStep")} {brandLevel.nextMilestone.targetLevel}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {brandLevel.nextMilestone.headline}
                  </p>
                  {brandLevel.nextMilestone.moves.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-sm text-foreground-secondary">
                      {brandLevel.nextMilestone.moves.map((m, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          {m}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ORACLE_FULL payé : le lien vers la stratégie complète activée
              (audit 2026-07-16 — le payeur ne voyait RIEN de ce qu'il avait payé). */}
          {paymentData?.oracleShareUrl ? (
            <div className="mt-6 rounded-2xl border-2 border-success/40 bg-success/10 p-5">
              <p className="text-2xs font-bold uppercase tracking-widest text-success">
                {t("intakeResult.oracle.activated")}
              </p>
              <p className="mt-2 text-sm text-foreground">
                {t("intakeResult.oracle.body")}
              </p>
              <a
                href={paymentData.oracleShareUrl}
                className="mt-2 inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
              >
                {t("intakeResult.oracle.open")} <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ) : null}

          {/* Radar 4 piliers — la promesse « radar » enfin livrée (audit
              2026-07-16 : le composant existait partout sauf ici). */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <AdvertisRadar
              scores={{ a: cap(vector.a ?? 0), d: cap(vector.d ?? 0), v: cap(vector.v ?? 0), e: cap(vector.e ?? 0) }}
              pillarKeys={PILLAR_KEYS.filter((k) => k === "a" || k === "d" || k === "v" || k === "e")}
              maxScore={25}
              size="md"
              interactive={false}
            />
            <p className="max-w-[52ch] text-center text-xs text-foreground-muted">
              {t("intakeResult.radar.before")} {composite}{t("intakeResult.radar.after")}
            </p>
          </div>

          {/* P1-2 (audit UX 2026-07-19) — le MÊME composite était affiché deux
              fois sous deux noms (« score socle » puis « complétude du
              dossier ») : double sens supprimé, un seul chiffre, un seul nom.
              P1-3 — une ligne relie les deux paliers qui coexistent : le
              niveau ESTIMÉ (déclaratif, ce questionnaire) vs le palier RÉVÉLÉ
              (preuve publique, section Force ci-dessous). */}
          <p className="mt-3 max-w-[58ch] text-xs text-foreground-muted">
            {t("intakeResult.estRev.p1")} <strong>{t("intakeResult.estRev.estimated")}</strong>{" "}
            {t("intakeResult.estRev.p2")} <strong>{t("intakeResult.estRev.revealed")}</strong>{" "}
            {t("intakeResult.estRev.p3")}
          </p>
        </header>

        {/* ════════════════════════════════════════════════════════════
            PDF-ONLY: Intro + Contexte business
        ════════════════════════════════════════════════════════════ */}
        <section className="hidden print:block print:mb-8">
          <h2 className="mb-3 text-2xl font-bold text-foreground">{t("intakeResult.pdf.introTitle")}</h2>
          <p className="text-base leading-relaxed text-foreground">{introText}</p>
        </section>

        {bizContext.length > 0 && (
          <section className="hidden print:block print:mb-8 print:break-after-page">
            <h2 className="mb-3 text-2xl font-bold text-foreground">{t("intakeResult.pdf.bizTitle")}</h2>
            <p className="mb-4 text-sm text-foreground-muted">
              {t("intakeResult.pdf.bizSub")}
            </p>
            <dl className="space-y-2">
              {bizContext.map((item, i) => (
                <div key={i} className="grid grid-cols-[200px_1fr] gap-4 border-b border-border-subtle py-2">
                  <dt className="text-sm font-semibold text-foreground-muted">{item.label}</dt>
                  <dd className="text-sm text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════
            PDF-ONLY: Niveau actuel + trajectoire vers ICONE
        ════════════════════════════════════════════════════════════ */}
        {brandLevel && (
          <section className="hidden print:block print:mb-8 print:break-after-page">
            <h2 className="mb-3 text-2xl font-bold text-foreground">{t("intakeResult.pdf.levelTitle")}</h2>
            <div className="mb-6 rounded-lg border-2 border-foreground p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                {t("intakeResult.pdf.currentLevel")}
              </p>
              <p className="mt-1 text-3xl font-bold text-foreground">{classification}</p>
              <p className="mt-1 text-sm italic text-foreground-secondary">
                {classification !== "NON_CLASSIFIE" && t(LEVEL_TAGLINE[classification as BrandLevel])}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground">{brandLevel.justification}</p>
            </div>

            {brandLevel.pillarSignals.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-2 text-base font-bold text-foreground">{t("intakeResult.pdf.pillarRead")}</h3>
                <dl className="space-y-2">
                  {brandLevel.pillarSignals.map((s) => (
                    <div key={s.pillar} className="grid grid-cols-[140px_1fr] gap-3 border-b border-border-subtle py-2">
                      <dt className="text-sm font-bold text-foreground-muted">
                        {s.pillar.toUpperCase()} · {s.level}
                      </dt>
                      <dd className="text-sm text-foreground">{s.signal}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <h3 className="mb-3 text-base font-bold text-foreground">
              {t("intakeResult.path.title")} ({brandLevel.pathToIcone.length} {brandLevel.pathToIcone.length > 1 ? t("intakeResult.unit.tiers") : t("intakeResult.unit.tier")})
            </h3>
            <ol className="mb-6 space-y-3">
              {brandLevel.pathToIcone.map((step, i) => (
                <li key={i} className="border-l-4 border-foreground pl-4">
                  <p className="text-sm font-bold uppercase tracking-wider text-foreground">
                    {i + 1}. {step.level} {step.level === classification ? t("intakeResult.path.current") : ""}
                  </p>
                  <p className="mt-1 text-sm text-foreground">{step.description}</p>
                  {step.keyMilestone && (
                    <p className="mt-1 text-xs italic text-foreground-secondary">
                      {t("intakeResult.lock.label")} {step.keyMilestone}
                    </p>
                  )}
                </li>
              ))}
            </ol>

            {brandLevel.iconeVision && (
              <div className="rounded border-2 border-primary p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {t("intakeResult.vision.kicker")} {intake.companyName}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{brandLevel.iconeVision}</p>
              </div>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════
            EXECUTIVE SUMMARY (page + print)
        ════════════════════════════════════════════════════════════ */}
        {(report?.executiveSummary || fallbackSummary) && (
          <section className="mb-8 rounded-2xl border border-primary/20 bg-primary-subtle/20 p-6 print:rounded-none print:border-0 print:bg-transparent print:p-0 print:mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary print:text-2xl print:text-foreground print:normal-case print:tracking-normal">
              <Sparkles className="h-4 w-4 print:hidden" />
              <span className="print:hidden">{t("intakeResult.exec.title")}</span>
              <span className="hidden print:inline">{t("intakeResult.exec.titlePdf")}</span>
            </h2>
            <p className="text-base leading-relaxed text-foreground">
              {report?.executiveSummary ?? fallbackSummary}
            </p>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════
            EMPREINTE DIGITALE PUBLIQUE (ADR-0121) — score /100 + barres
            par dimension + sous-blocs mesurés + narratif. Honnête : les
            dimensions non mesurées sont dites, jamais fabriquées.
        ════════════════════════════════════════════════════════════ */}
        {/* P1-2 (audit UX) — phrases-ponts : les scores se LISENT dans un ordre
            (présence publique → socle déclaré → force révélée), pas en pile. */}
        <p className="mx-auto mt-10 max-w-[60ch] text-center text-sm text-foreground-secondary">
          {t("intakeResult.bridge.footprintBefore")} {intake.companyName} {t("intakeResult.bridge.footprintAfter")}
        </p>
        <FootprintSection
          footprint={(intake as { webFootprint?: unknown }).webFootprint ?? null}
          companyName={intake.companyName}
          declaredE={
            ((intake.responses as Record<string, unknown> | null)?.e as Record<string, unknown> | undefined) ?? null
          }
          gateLabels={{
            title: t("intakeResult.gate.title"),
            filteredSuffix: t("intakeResult.gate.filteredSuffix"),
            judgeDet: t("intakeResult.gate.judgeDet"),
            judgeLlm: t("intakeResult.gate.judgeLlm"),
            discriminants: t("intakeResult.gate.discriminants"),
          }}
        />

        {/* ════════════════════════════════════════════════════════════
            FORCE DE MARQUE (nouveau scoreur, ADR-0149) — note révélée sur
            la preuve publique captée. Lecture seule, honnête (couverture +
            palier suivant). Le classement public reste un choix (payant/opérateur).
        ════════════════════════════════════════════════════════════ */}
        <p className="mx-auto mt-10 max-w-[60ch] text-center text-sm text-foreground-secondary">
          {t("intakeResult.bridge.force")}
        </p>
        <ForceSection token={token} />


        {/* ════════════════════════════════════════════════════════════
            PATH TO ICONE — visible on page (the promise)
        ════════════════════════════════════════════════════════════ */}
        {brandLevel?.pathToIcone && brandLevel.pathToIcone.length > 0 && (
          <section className="mb-10 print:hidden">
            <header className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-foreground">{t("intakeResult.path.title")}</h2>
              <span className="rounded-full border border-border-subtle bg-card px-2 py-0.5 text-xs text-foreground-muted">
                {brandLevel.pathToIcone.length} {t("intakeResult.path.badge")}
              </span>
            </header>
            <p className="mb-4 text-sm text-foreground-muted">
              {t("intakeResult.path.subBefore")} <span className="font-medium text-foreground">{intake.companyName}</span>{t("intakeResult.path.subAfter")}
            </p>
            <ol className="space-y-3">
              {brandLevel.pathToIcone.map((step, i) => {
                const isCurrent = step.level === classification;
                return (
                  <li
                    key={`${step.level}-${i}`}
                    className={`relative rounded-xl border p-4 ${
                      isCurrent
                        ? "border-primary/60 bg-primary/5"
                        : "border-border-subtle bg-card"
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                            isCurrent ? "bg-primary text-primary-foreground" : "bg-background text-foreground-muted"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className={`text-sm font-bold uppercase tracking-wider ${isCurrent ? "text-primary" : "text-foreground"}`}>
                          {step.level}
                        </span>
                        {isCurrent && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-2xs font-medium text-primary-foreground">
                            {t("intakeResult.path.youAreHere")}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">{step.description}</p>
                    {step.keyMilestone && (
                      <p className="mt-2 border-l-2 border-primary/40 pl-3 text-xs text-foreground-secondary">
                        <span className="font-semibold text-primary">{t("intakeResult.lock.label")} </span>
                        {step.keyMilestone}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>

            {brandLevel.iconeVision && (
              <div className="mt-6 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-card p-5">
                <p className="text-2xs font-bold uppercase tracking-widest text-primary">
                  {t("intakeResult.vision.kicker")} {intake.companyName}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{brandLevel.iconeVision}</p>
              </div>
            )}
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════
            ADVE — page (PARTIAL: 2 values + preview only)
        ════════════════════════════════════════════════════════════ */}
        <section className="mb-10 print:hidden">
          <header className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-foreground">{t("intakeResult.adve.title")}</h2>
            <span className="rounded-full border border-border-subtle bg-card px-2 py-0.5 text-xs text-foreground-muted">
              {t("intakeResult.adve.badge")}
            </span>
          </header>
          <p className="mb-6 text-sm text-foreground-muted">
            {t("intakeResult.adve.sub")}
          </p>

          <div className="space-y-5">
            {ADVE_PILLARS.map((meta) => {
              const allExtracted = extractedByKey[meta.key] ?? [];
              const previewExtracted = allExtracted.slice(0, PAGE_VALUES_PER_PILLAR);
              const moreCount = Math.max(0, allExtracted.length - PAGE_VALUES_PER_PILLAR);
              const reportPillar = report?.adve?.find((p) => p.key === meta.key);
              const score = cap(vector[meta.key] ?? 0);
              return (
                <article key={meta.key} className="rounded-xl border border-border bg-card p-5">
                  <header className="mb-4 flex items-center justify-between gap-3 border-b border-border-subtle pb-3">
                    <div>
                      <p className="text-2xs font-bold uppercase tracking-widest text-foreground-muted">
                        {meta.key.toUpperCase()} · {t(meta.tagline)}
                      </p>
                      <h3 className="mt-0.5 text-lg font-semibold text-foreground">{t(meta.name)}</h3>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-1 rounded-md bg-background px-2.5 py-1">
                      <span className="text-base font-semibold tabular-nums text-foreground">{score.toFixed(1)}</span>
                      <span className="text-xs text-foreground-muted">/25</span>
                    </div>
                  </header>

                  <div className="mb-4">
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                      <Database className="h-3.5 w-3.5" />
                      {t("intakeResult.adve.extracted")} ({allExtracted.length})
                    </h4>
                    {allExtracted.length === 0 ? (
                      <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-foreground-muted">
                        {t("intakeResult.adve.noValues")}
                      </p>
                    ) : (
                      <>
                        <dl className="space-y-2">
                          {previewExtracted.map((entry, idx) => (
                            <div
                              key={idx}
                              className="grid grid-cols-1 gap-1 rounded-lg border border-border-subtle bg-background p-3 sm:grid-cols-[180px_1fr] sm:gap-4"
                            >
                              <dt className="text-xs font-medium uppercase tracking-wider text-foreground-muted">{entry.key}</dt>
                              <dd className="text-sm leading-relaxed text-foreground">{entry.value}</dd>
                            </div>
                          ))}
                        </dl>
                        {moreCount > 0 && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-foreground-muted">
                            <Lock className="h-3 w-3" />
                            +{moreCount} {t("intakeResult.adve.moreFields")}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {reportPillar && (
                    <div className="border-t border-border-subtle pt-4">
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                        {t("intakeResult.adve.strategicRead")}
                      </h4>
                      <p className="text-sm leading-relaxed text-foreground">{reportPillar.preview}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-foreground-muted">
                        <Lock className="h-3 w-3" />
                        {t("intakeResult.adve.deepDive")}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            ADVE — print (FULL: all values + full narrative)
        ════════════════════════════════════════════════════════════ */}
        <section className="hidden print:block print:mb-8 print:break-after-page">
          <h2 className="mb-3 text-2xl font-bold text-foreground">{t("intakeResult.pdf.adveTitle")}</h2>
          <div className="space-y-6">
            {ADVE_PILLARS.map((meta) => {
              const allExtracted = extractedByKey[meta.key] ?? [];
              const reportPillar = report?.adve?.find((p) => p.key === meta.key);
              const score = cap(vector[meta.key] ?? 0);
              return (
                <div key={meta.key} className="border-b border-border-subtle pb-6 last:border-0">
                  <header className="mb-2 flex items-baseline justify-between gap-3">
                    <h3 className="text-xl font-bold text-foreground">
                      {meta.key.toUpperCase()} · {t(meta.name)}
                    </h3>
                    <span className="text-sm tabular-nums text-foreground-muted">{score.toFixed(1)} / 25</span>
                  </header>
                  <p className="mb-3 text-sm italic text-foreground-muted">{t(meta.tagline)}</p>

                  {allExtracted.length > 0 && (
                    <>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground-muted">
                        {t("intakeResult.adve.extracted")}
                      </h4>
                      <dl className="mb-4 space-y-1">
                        {allExtracted.map((entry, idx) => (
                          <div key={idx} className="grid grid-cols-[160px_1fr] gap-3 py-1">
                            <dt className="text-xs font-semibold text-foreground-muted">{entry.key}</dt>
                            <dd className="text-sm text-foreground">{entry.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </>
                  )}

                  {reportPillar && (
                    <>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground-muted">
                        {t("intakeResult.adve.strategicRead")}
                      </h4>
                      <p className="text-sm leading-relaxed text-foreground">{reportPillar.preview}</p>
                      <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{reportPillar.full}</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            RTIS — page (1 pilier preview, others teased)
        ════════════════════════════════════════════════════════════ */}
        {report?.rtis && (
          <section className="mb-10 print:hidden">
            <header className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-foreground">{t("intakeResult.rtis.title")}</h2>
              <span className="rounded-full border border-border-subtle bg-card px-2 py-0.5 text-xs text-foreground-muted">
                {t("intakeResult.rtis.badge")}
              </span>
            </header>
            <p className="mb-6 text-sm text-foreground-muted">{report.rtis.framing}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {report.rtis.pillars.map((p) => (
                <article key={p.key} className="flex flex-col rounded-xl border border-border bg-card p-5">
                  <header className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-2xs font-bold uppercase tracking-widest text-foreground-muted">
                        {p.key.toUpperCase()} · {(() => { const tagline = RTIS_PILLARS_META.find((m) => m.key === p.key)?.tagline; return tagline ? t(tagline) : ""; })()}
                      </p>
                      <h3 className="mt-0.5 text-base font-semibold text-foreground">{p.name}</h3>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[p.priority]}`}
                    >
                      {p.priority}
                    </span>
                  </header>
                  {/* ADR-0164 — ≥ 2 propositions visibles À L'ÉCRAN (le chip
                      keyMove est masqué quand il duplique la 1ʳᵉ proposition ;
                      contenu long clampé, l'intégral reste dans le PDF). */}
                  {p.keyMove && !p.full.includes(p.keyMove.slice(0, 60)) && (
                    <p className="mb-3 rounded-md bg-primary-subtle/30 px-3 py-2 text-xs font-medium leading-snug text-primary">
                      {p.keyMove}
                    </p>
                  )}
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {p.full.split("\n").slice(0, 9).join("\n") || p.preview}
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 border-t border-border-subtle pt-3 text-xs text-foreground-muted">
                    <Lock className="h-3 w-3" />
                    {t("intakeResult.rtis.lock")}
                  </p>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════
            RTIS — print (FULL: 4 piliers R/T/I/S complete)
        ════════════════════════════════════════════════════════════ */}
        {report?.rtis && (
          <section className="hidden print:block print:mb-8 print:break-after-page">
            <h2 className="mb-3 text-2xl font-bold text-foreground">{t("intakeResult.pdf.rtisTitle")}</h2>
            <p className="mb-4 text-sm italic text-foreground-secondary">{report.rtis.framing}</p>
            <div className="space-y-6">
              {report.rtis.pillars.map((p) => (
                <div key={p.key} className="border-b border-border-subtle pb-6 last:border-0">
                  <header className="mb-2 flex items-baseline justify-between gap-3">
                    <h3 className="text-xl font-bold text-foreground">
                      {p.key.toUpperCase()} · {p.name}
                    </h3>
                    <span className="rounded border border-foreground-muted px-2 py-0.5 text-xs">
                      {p.priority} · {t(PRIORITY_LABEL[p.priority])}
                    </span>
                  </header>
                  {p.keyMove && (
                    <p className="mb-3 border-l-4 border-primary bg-primary-subtle/30 px-3 py-2 text-sm font-semibold text-foreground">
                      {t("intakeResult.rtis.keyMove")} {p.keyMove}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-foreground">{p.preview}</p>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{p.full}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════
            RECOMMANDATION STRATÉGIQUE — V3 only (Opus, autonomous block)
            Renders both on-screen AND in PDF. The diagnostic above answers
            "what is true"; this block answers "what to do".
        ════════════════════════════════════════════════════════════ */}
        {report?.recommendation && (
          <section className="mt-10 rounded-2xl border border-amber-700/50 bg-gradient-to-br from-amber-950/15 via-card to-card p-6 sm:p-8 print:mt-0 print:rounded-none print:border-0 print:bg-transparent print:break-before-page">
            <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <div>
                <p className="text-2xs font-bold uppercase tracking-[0.25em] text-amber-400 print:text-foreground-muted">
                  {t("intakeResult.reco.kicker")}
                </p>
                <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl print:text-2xl">
                  {report.recommendation.strategicMove}
                </h2>
              </div>
              <span className="hidden rounded-full border border-amber-700/50 bg-amber-950/30 px-2 py-0.5 text-2xs font-medium text-amber-300 print:hidden sm:inline-flex">
                {t("intakeResult.reco.badge")}
              </span>
            </header>

            {report.recommendation.why && (
              <p className="mb-6 text-sm leading-relaxed text-foreground sm:text-base">
                {report.recommendation.why}
              </p>
            )}

            {/* Prioritized actions */}
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              {t("intakeResult.reco.actions")}
            </h3>
            <ol className="mb-6 space-y-3">
              {report.recommendation.prioritizedActions.map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border-subtle bg-card/50 p-4 print:border-0 print:border-b print:border-foreground-muted print:rounded-none print:bg-transparent print:px-0 print:py-3"
                >
                  <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-2xs font-bold text-foreground-muted">
                      #{i + 1}
                    </span>
                    <span className="font-semibold text-foreground">{a.title}</span>
                    <span className="rounded-full border border-border bg-background-overlay px-2 py-0.5 text-2xs uppercase tracking-wider text-foreground-secondary">
                      {a.when}
                    </span>
                    <span className="rounded-full border border-border bg-background-overlay px-2 py-0.5 text-2xs uppercase tracking-wider text-foreground-secondary">
                      {a.owner}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-secondary">{a.rationale}</p>
                  {Array.isArray(a.examples) && a.examples.length > 0 && (
                    <div className="mt-3 rounded-md border border-border-subtle bg-background-overlay/40 p-3 print:border-foreground-muted print:bg-transparent">
                      <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-foreground-muted">
                        {t("intakeResult.reco.examples")}
                      </p>
                      <ul className="space-y-1.5 text-sm text-foreground-secondary">
                        {a.examples.slice(0, 2).map((ex, j) => (
                          <li key={j} className="flex gap-2">
                            <span className="text-primary">▸</span>
                            <span>{ex}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="mt-2 border-t border-border-subtle pt-2 text-xs text-foreground-muted">
                    <span className="font-semibold">{t("intakeResult.reco.success")}</span> {a.successKpi}
                  </p>
                </li>
              ))}
            </ol>

            {/* 90-day roadmap */}
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              {t("intakeResult.reco.roadmap")}
            </h3>
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: t("intakeResult.reco.phase1"), text: report.recommendation.roadmap90d.phase1_0_30j },
                { label: t("intakeResult.reco.phase2"), text: report.recommendation.roadmap90d.phase2_30_60j },
                { label: t("intakeResult.reco.phase3"), text: report.recommendation.roadmap90d.phase3_60_90j },
              ].map((phase) => (
                <div
                  key={phase.label}
                  className="rounded-lg border border-border-subtle bg-card/50 p-3 print:border-foreground-muted print:bg-transparent print:rounded-none print:border-0 print:border-l-2 print:pl-3 print:p-0 print:mb-4"
                >
                  <p className="mb-1 text-2xs font-bold uppercase tracking-widest text-amber-400 print:text-foreground-muted">
                    {phase.label}
                  </p>
                  <p className="text-sm leading-snug text-foreground">{phase.text}</p>
                </div>
              ))}
            </div>

            {/* Risks to watch */}
            {report.recommendation.risksToWatch.length > 0 && (
              <>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                  {t("intakeResult.reco.risks")}
                </h3>
                <ul className="mb-6 space-y-1.5">
                  {report.recommendation.risksToWatch.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground-secondary">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Founded on tension — the hash-link back to the diagnostic */}
            <p className="mt-6 border-t border-border-subtle pt-4 text-xs italic text-foreground-muted">
              <span className="font-semibold">{t("intakeResult.reco.foundedOn")}</span>{" "}
              {report.recommendation.foundedOnTension}
            </p>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════
            PLAN D'ACTION PRIORITAIRE — déterministe, TOUJOURS livré.
            Fallback quand le bloc stratégique V3 est absent : le plan
            généré par l'analyse des réponses (generateDiagnostic) était
            calculé, persisté… et jamais rendu (audit 2026-07-16 — la
            promesse « plan d'action » du tier PDF devient inconditionnelle).
            Rendu écran ET PDF.
        ════════════════════════════════════════════════════════════ */}
        {!report?.recommendation && (diagnostic?.recommendations?.length ?? 0) > 0 && (
          <section className="mt-10 rounded-2xl border border-primary/40 bg-card p-6 sm:p-8 print:mt-0 print:rounded-none print:border-0 print:break-before-page">
            <header className="mb-6">
              <p className="text-2xs font-bold uppercase tracking-[0.25em] text-primary">
                {t("intakeResult.plan.kicker")}
              </p>
              <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
                {t("intakeResult.plan.title")}
              </h2>
            </header>
            <div className="space-y-6">
              {diagnostic!.recommendations!.map((rec) => (
                <div key={rec.key} className="rounded-xl border border-border p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-bold text-foreground">{rec.pillar}</h3>
                    <span className="text-xs font-mono text-foreground-muted">{Math.round(rec.score * 10) / 10}/25</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-foreground-secondary">{rec.diagnostic}</p>
                  {rec.actions.length > 0 && (
                    <ul className="mt-3 space-y-1.5 text-sm text-foreground">
                      {rec.actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════
            PDF-ONLY: Conclusion + CTA retainer
        ════════════════════════════════════════════════════════════ */}
        <section className="hidden print:block print:mb-8 print:break-after-page">
          <h2 className="mb-3 text-2xl font-bold text-foreground">{t("intakeResult.pdf.conclusionTitle")}</h2>
          <p className="text-base leading-relaxed text-foreground">{retainerPitch}</p>
          <div className="mt-6 rounded-lg border-2 border-primary p-5">
            <h3 className="mb-2 text-base font-bold text-foreground">{t("intakeResult.pdf.activate")}</h3>
            <p className="mb-4 text-sm leading-relaxed text-foreground-secondary">
              {t("intakeResult.pdf.activateBody")}
            </p>
            <dl className="space-y-1 text-sm">
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <dt className="font-semibold text-foreground-muted">{t("intakeResult.contact.email")}</dt>
                <dd className="text-foreground">{CONTACT_EMAIL}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <dt className="font-semibold text-foreground-muted">{t("intakeResult.contact.whatsapp")}</dt>
                <dd className="text-foreground">{CONTACT_WHATSAPP_DISPLAY}</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* ════════════════════════════════════════════════════════════
            PDF-ONLY: Annexe — verbatim
        ════════════════════════════════════════════════════════════ */}
        {verbatim.length > 0 && (
          <section className="hidden print:block print:mb-4">
            <h2 className="mb-3 text-2xl font-bold text-foreground">{t("intakeResult.pdf.annexTitle")}</h2>
            <p className="mb-4 text-xs italic text-foreground-muted">
              {t("intakeResult.pdf.annexSub")}
            </p>
            <div className="space-y-4">
              {verbatim.map((group, gi) => (
                <div key={gi}>
                  <h3 className="mb-2 text-base font-bold text-foreground">{group.pillar}</h3>
                  <dl className="space-y-2">
                    {group.entries.map((e, ei) => (
                      <div key={ei} className="border-l-2 border-border-subtle pl-3">
                        <dt className="text-xs font-semibold text-foreground-muted">{e.q}</dt>
                        <dd className="mt-0.5 text-sm text-foreground">{e.a}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════
            PAGE-ONLY: Contact / paywall / activation (print:hidden)
        ════════════════════════════════════════════════════════════ */}
        <section className="mt-10 rounded-2xl border border-border bg-card p-6 print:hidden">
          <h2 className="mb-1 text-lg font-bold text-foreground">{t("intakeResult.contact.title")}</h2>
          <p className="mb-5 text-sm text-foreground-muted">
            {t("intakeResult.contact.sub")}
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Rapport ADVE — ${intake.companyName}`)}`}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-background p-4 transition hover:border-primary/40 hover:bg-primary-subtle/10"
            >
              <div className="rounded-full bg-primary/10 p-2"><Mail className="h-4 w-4 text-primary" /></div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">{t("intakeResult.contact.email")}</p>
                <p className="truncate text-sm font-medium text-foreground">{CONTACT_EMAIL}</p>
              </div>
            </a>
            <a
              href={`https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent(`Bonjour, je viens de finaliser mon diagnostic ADVE pour ${intake.companyName}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-background p-4 transition hover:border-primary/40 hover:bg-primary-subtle/10"
            >
              <div className="rounded-full bg-primary/10 p-2"><MessageCircle className="h-4 w-4 text-primary" /></div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">{t("intakeResult.contact.whatsapp")}</p>
                <p className="truncate text-sm font-medium text-foreground">{CONTACT_WHATSAPP_DISPLAY}</p>
              </div>
            </a>
          </div>
        </section>

        {/* Rapport PDF preview — paywall FOMO. Shows the structure of the
            paid PDF (page thumbnails + ADVE/RTIS/recommandation) with the
            founder's verbatim voice surfaced on page 1 to anchor authenticity,
            and the strategic content redacted to drive conversion. */}
        {!isPaid && (
          <div className="mt-10">
            {/* ADR-0164 — bandeau de preuves RÉELLES au-dessus du paywall :
                on vend sur ce qui a déjà été mesuré/produit, jamais sur du
                vent. Chaque compteur vient des données de CE rapport. */}
            {(() => {
              const fpx = (intake as { webFootprint?: { press?: unknown[]; webMentions?: { items?: unknown[] }; maps?: { status?: string; reviewCount?: number | null }; followerCounts?: Array<{ followerCount?: number }> } }).webFootprint;
              const propositionCount = (report?.rtis?.pillars ?? []).reduce(
                (n, p) => n + ((p.full.match(/•/g) ?? []).length || 1),
                0,
              );
              const chips: string[] = [];
              if (propositionCount > 0) chips.push(`${propositionCount} ${t("intakeResult.proof.propositions")}`);
              const cit = fpx?.webMentions?.items?.length ?? 0;
              if (cit > 0) chips.push(`${cit} ${t("intakeResult.proof.citations")}`);
              const pressN = fpx?.press?.length ?? 0;
              if (pressN > 0) chips.push(`${pressN} ${t("intakeResult.proof.press")}`);
              if (fpx?.maps?.status === "LIVE" && fpx.maps.reviewCount) chips.push(`${fpx.maps.reviewCount} ${t("intakeResult.proof.reviews")}`);
              const audience = (fpx?.followerCounts ?? []).reduce((n, f) => n + (f.followerCount ?? 0), 0);
              if (audience > 0) chips.push(`${audience.toLocaleString("fr-FR")} ${t("intakeResult.proof.audience")}`);
              if (chips.length === 0) return null;
              return (
                <div className="mb-4 rounded-xl border border-primary/20 bg-primary-subtle/20 p-4">
                  <p className="text-2xs font-bold uppercase tracking-widest text-primary">
                    {t("intakeResult.proof.kicker")} {intake.companyName}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground">
                    {chips.join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-foreground-muted">{t("intakeResult.proof.tail")}</p>
                </div>
              );
            })()}
            <RapportPdfPreview
              brandName={intake.companyName}
              classification={classification}
              centralTension={report?.centralTension}
              authVerbatimSample={
                // Surface a slice of the founder's actual ADVE narrative — read
                // from the persisted Pillar.content[a].narrativeFull (V3 path)
                // or from the executive summary as a fallback.
                report?.adve?.[0]?.full ?? report?.executiveSummary
              }
              unlockPriceLabel={
                isFree
                  ? t("intakeResult.paywall.free")
                  : pricing?.localized?.display ?? (pricing?.recommended === "CINETPAY"
                    ? `${pricing?.prices.fcfa ?? 0} FCFA`
                    : `${pricing?.prices.eur ?? 0} EUR`)
              }
              onUnlock={handleUnlockClick}
              unlockDisabled={paywallLoading}
            />
            {/* Copy client, jamais le message technique (audit 2026-07-16 :
                le lead lisait des noms de variables d'environnement). */}
            {initPaymentMutation.error && (
              <p className="mt-3 px-2 text-xs text-destructive">
                {t("intakeResult.paywall.paymentDown")}
              </p>
            )}
          </div>
        )}

        {isPaid && (
          <section className="mt-10 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-subtle/40 to-card p-6 sm:p-8 print:hidden">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Check className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-foreground">{t("intakeResult.download.title")}</h2>
                <p className="mt-1 text-sm text-foreground-muted">{t("intakeResult.download.ready")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={pdfGenerating}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {t("intakeResult.download.opening")}</>
              ) : (
                <><Download className="h-4 w-4" /> {t("intakeResult.download.cta")}</>
              )}
            </button>
            {pdfError && <p className="mt-3 text-xs text-destructive">{pdfError}</p>}
          </section>
        )}

        {/* Oracle teaser — placed AFTER the rapport-PDF flow on purpose. The
            Oracle is a separate, deeper deliverable (21 structured sections)
            with its own paywall. Mirrors the real Oracle layout from
            /shared/strategy/[token] so the FOMO is faithful, not generic. */}
        <div className="mt-10 print:hidden">
          <OracleTeaser
            brandName={intake.companyName}
            unlockPriceLabel={
              tierGrid?.find((t) => t.definition.key === "ORACLE_FULL")?.price.display
            }
          />
        </div>

        {/* Tier funnel teaser — opens a focused modal containing the full grid.
            Inline rendering of the 5-tier grid was overloading the page in
            landscape (cf. PRIX LOCAL badge bleed). Per "fais le plus robuste",
            we surface a single CTA card that opens a modal with focus trap +
            scroll containment + matching sticky CTA bar (below). */}
        {tierGrid && tierGrid.length > 0 && (() => {
          const recommendedTile = tierGrid.find((t) => t.definition.key === "ORACLE_FULL");
          const recommendedPrice = recommendedTile?.price.display ?? "";
          return (
            <div className="mt-10 print:hidden">
              <div className="rounded-2xl border border-amber-700/40 bg-gradient-to-br from-amber-950/20 via-zinc-950 to-zinc-900 p-5 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-2xs font-semibold uppercase tracking-[0.25em] text-amber-400">
                      {t("intakeResult.tiers.kicker")}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-zinc-50 sm:text-2xl">
                      {t("intakeResult.tiers.title")}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      {t("intakeResult.tiers.sub")}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setPricingModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-500"
                    >
                      {t("intakeResult.tiers.cta")}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    {recommendedPrice && (
                      <p className="mt-2 text-right text-2xs text-zinc-500">
                        {t("intakeResult.tiers.recommended")} <span className="text-zinc-300">{recommendedPrice}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {isPaid && !activated && (
          <section className="mt-10 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/5 to-card p-6 sm:p-8 print:hidden">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2"><Rocket className="h-5 w-5 text-primary" /></div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{t("intakeResult.activate.title")}</h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  {t("intakeResult.activate.sub")}
                </p>
              </div>
            </div>

            <ul className="mt-5 space-y-2 text-sm text-foreground-secondary">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("intakeResult.activate.li1Before")} <span className="font-semibold text-foreground">{intake.companyName}</span> {t("intakeResult.activate.li1After")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("intakeResult.activate.li2")}
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t("intakeResult.activate.li3Before")} <span className="font-mono text-foreground">{intake.contactEmail}</span> {t("intakeResult.activate.li3After")}
              </li>
            </ul>

            <button
              type="button"
              onClick={() => activateMutation.mutate({ token })}
              disabled={activateMutation.isPending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {activateMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> {t("intakeResult.activate.pending")}</>
              ) : (
                <>{t("intakeResult.activate.cta")} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
            {activateMutation.error && (
              <p className="mt-3 text-xs text-destructive">{activateMutation.error.message}</p>
            )}
          </section>
        )}

        {activated && (
          <section className="mt-10 rounded-2xl border border-primary/50 bg-primary/5 p-6 sm:p-8 print:hidden">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/15 p-2"><ShieldCheck className="h-6 w-6 text-primary" /></div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{t("intakeResult.activated.titleBefore")} {activated.clientName}</h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  {t("intakeResult.activated.subBefore")} <span className="font-mono text-foreground">{activated.userEmail}</span> {t("intakeResult.activated.subAfter")}
                </p>
              </div>
            </div>
            <Link
              href={`/register?email=${encodeURIComponent(activated.userEmail)}`}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              {t("intakeResult.activated.cta")} <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        )}
      </div>

      {/* Pricing modal — focus-trapped, scroll-contained.
          The grid is rendered inside a Modal (size=2xl) so it can spread on
          desktop without overflowing, and stack vertically on mobile. */}
      {tierGrid && tierGrid.length > 0 && (
        <Modal
          open={pricingModalOpen}
          onClose={() => setPricingModalOpen(false)}
          title={t("intakeResult.modal.title")}
          size="2xl"
        >
          <PricingTiers
            tiers={tierGrid as Parameters<typeof PricingTiers>[0]["tiers"]}
            recommendedTier="ORACLE_FULL"
            currentTier={isPaid ? "INTAKE_PDF" : undefined}
            loadingTier={paywallLoading ? "INTAKE_PDF" : undefined}
            onSelectTier={handleSelectTier}
          />
        </Modal>
      )}

      {/* Sticky CTA — present on every viewport size, hidden when the user
          has already unlocked or activated. Pushes itself above mobile
          home-indicator via env(safe-area-inset-bottom). Hidden in print. */}
      {!isPaid && !activated && tierGrid && tierGrid.length > 0 && (() => {
        const recommended = tierGrid.find((t) => t.definition.key === "ORACLE_FULL");
        const cheapest = tierGrid.find((t) => t.definition.key === "INTAKE_PDF");
        return (
          <div
            className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-sm print:hidden"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <div className="min-w-0">
                <p className="truncate text-2xs uppercase tracking-wider text-zinc-500">
                  {t("intakeResult.sticky.kicker")}
                </p>
                <p className="truncate text-sm text-zinc-200">
                  {t("intakeResult.sticky.from")}{" "}
                  <span className="font-semibold text-amber-400">
                    {cheapest?.price.display ?? "—"}
                  </span>
                  {recommended && (
                    <span className="hidden sm:inline text-zinc-500">
                      {" "}{t("intakeResult.sticky.recommended")}{" "}
                      <span className="text-zinc-300">{recommended.price.display}</span>
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPricingModalOpen(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-500"
              >
                {t("intakeResult.tiers.cta")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })()}
    </main>
  );
}

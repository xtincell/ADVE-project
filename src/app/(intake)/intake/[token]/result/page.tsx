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

type BrandLevel = "ZOMBIE" | "FRAGILE" | "ORDINAIRE" | "FORTE" | "CULTE" | "ICONE";

interface BrandLevelEvaluation {
  level: BrandLevel;
  confidence: number;
  justification: string;
  pillarSignals: Array<{ pillar: "a" | "d" | "v" | "e"; level: BrandLevel; signal: string }>;
  nextMilestone: { targetLevel: BrandLevel; headline: string; moves: string[] };
  pathToIcone: Array<{ level: BrandLevel; description: string; keyMilestone: string }>;
  iconeVision: string;
}

interface Diagnostic {
  classification?: string;
  summary?: string;
  narrativeReport?: NarrativeReport;
  brandLevel?: BrandLevelEvaluation;
}

const LEVEL_TAGLINE: Record<BrandLevel, string> = {
  ZOMBIE: "Invisible — fondations a poser",
  FRAGILE: "Intuitions justes — coherence a stabiliser",
  ORDINAIRE: "Fonctionnelle — substituable",
  FORTE: "Distincte — preferee par certains",
  CULTE: "Mouvement — communaute engagee",
  ICONE: "Reference sectorielle — patrimoine",
};

const LEVEL_ORDER: BrandLevel[] = ["ZOMBIE", "FRAGILE", "ORDINAIRE", "FORTE", "CULTE", "ICONE"];

const LEVEL_COLOR: Record<BrandLevel, string> = {
  ZOMBIE: "border-destructive/50 bg-destructive/10 text-destructive",
  FRAGILE: "border-warning/50 bg-warning/10 text-warning",
  ORDINAIRE: "border-foreground-muted/50 bg-card text-foreground-muted",
  FORTE: "border-primary/50 bg-primary/10 text-primary",
  CULTE: "border-primary/70 bg-primary/20 text-primary",
  ICONE: "border-primary bg-primary/30 text-primary",
};

// ── Static constants ───────────────────────────────────────────────
const PRIORITY_LABEL: Record<RtisPillarReport["priority"], string> = {
  P0: "Urgent",
  P1: "Sous 30 jours",
  P2: "Roadmap",
};
const PRIORITY_COLOR: Record<RtisPillarReport["priority"], string> = {
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
const RTIS_PILLARS_META: { key: "r" | "t" | "i" | "s"; name: string; tagline: string }[] = [
  { key: "r", name: "Risque", tagline: "Vulnerabilites & risques" },
  { key: "t", name: "Track", tagline: "Validation marche" },
  { key: "i", name: "Innovation", tagline: "Innovation & exploration" },
  { key: "s", name: "Strategie", tagline: "Plan & priorites" },
];

const CONTACT_EMAIL = "xtincell@gmail.com";
const CONTACT_WHATSAPP_NUMBER = "237675583639";
const CONTACT_WHATSAPP_DISPLAY = "+237 675 58 36 39";

// Template intro / conclusion that adapt to the classification.
const CLASSIFICATION_INTRO: Record<string, string> = {
  ZOMBIE:
    "Le diagnostic revele que votre marque est, a ce stade, quasi-invisible sur son marche. Les fondations identitaires sont absentes ou trop sous-developpees pour produire une preference. C'est le moment de tout poser proprement avant de communiquer plus.",
  FRAGILE:
    "Votre marque a des intuitions justes mais une architecture incomplete. Le risque : multiplier les actions tactiques sans coherence, ce qui dilue le peu de signal deja construit. La priorite est de stabiliser la plateforme avant d'accelerer.",
  ORDINAIRE:
    "Votre marque est fonctionnelle mais substituable. Sur un marche sature, l'absence de differenciation forte expose a la guerre des prix et a la commoditisation. Le diagnostic suivant pointe les leviers de distinction concrets.",
  FORTE:
    "Vous avez des fondations solides et des forces reelles. L'enjeu n'est plus de poser les bases mais de combler les lacunes restantes pour passer de marque competente a marque preferee.",
  CULTE:
    "Vous touchez le statut culte. Votre marque a une communaute, un point de vue, une signature. La phase suivante consiste a structurer ce qui se cree organiquement pour le rendre transmissible et durable.",
  ICONE:
    "Votre marque transcende son marche. Les enjeux sont desormais ceux d'une marque etablie : perennite, transmission, defense de la position acquise.",
};

const CLASSIFICATION_RETAINER_PITCH: Record<string, string> = {
  ZOMBIE:
    "La Fusee accompagne en priorite les marques qui doivent (re)poser les bases. Notre retainer demarrage couvre la consolidation des piliers ADVE en 8 semaines : audit, ateliers fondateur, livrables identitaires, premier plan d'engagement.",
  FRAGILE:
    "La Fusee accompagne les marques en phase de stabilisation. Notre retainer 'Cap structurel' tient sur 12 semaines : verrouillage des piliers ADVE, mise en coherence verbal/visuel, plan RTIS execute.",
  ORDINAIRE:
    "La Fusee accompagne les marques en quete de differenciation. Notre retainer 'Distinction' (12 semaines) cible la position concurrentielle, le territoire d'expression et la cascade RTIS pour ouvrir un avantage durable.",
  FORTE:
    "La Fusee accompagne les marques fortes a passer un cap. Notre retainer 'Acceleration' (16 semaines) industrialise vos forces existantes et active la cascade RTIS pour amplifier la traction commerciale.",
  CULTE:
    "La Fusee accompagne les marques cultes a transformer leur communaute en mouvement durable. Retainer 'Transmission' : structure operationnelle, programme ambassadeurs, codification des rituels.",
  ICONE:
    "La Fusee accompagne les marques iconiques sur la perennite et la transmission. Retainer 'Heritage' : protection de la position, formation des relais, capitalisation patrimoniale.",
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

// Format the biz responses (positioning, business model, etc.) into a list.
function formatBizContext(
  intake: { businessModel?: string | null; economicModel?: string | null; positioning?: string | null; sector?: string | null; country?: string | null; responses?: unknown },
): Array<{ label: string; value: string }> {
  const out: Array<{ label: string; value: string }> = [];
  if (intake.sector) out.push({ label: "Secteur", value: intake.sector });
  if (intake.country) out.push({ label: "Pays", value: intake.country });
  if (intake.businessModel) out.push({ label: "Modele business", value: intake.businessModel });
  if (intake.economicModel) out.push({ label: "Modele economique", value: intake.economicModel });
  if (intake.positioning) out.push({ label: "Positionnement", value: intake.positioning });
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
function formatVerbatim(intake: { rawText?: string | null; responses?: unknown }): Array<{ pillar: string; entries: Array<{ q: string; a: string }> }> {
  const responses = intake.responses as Record<string, unknown> | null;
  if (!responses) {
    return intake.rawText
      ? [{ pillar: "Texte fourni", entries: [{ q: "Description libre", a: intake.rawText }] }]
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
        groups.push({ pillar: k === "biz" ? "Contexte business" : `Pilier ${k.toUpperCase()}`, entries });
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
      setPdfError(err instanceof Error ? err.message : "Echec du téléchargement");
    } finally {
      setPdfGenerating(false);
    }
  }, [token]);

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
        const data = (await res.json()) as TrpcSubResp;
        const url = data?.[0]?.result?.data?.json?.paymentUrl;
        if (url) {
          window.location.href = url;
        } else {
          window.location.href = `/cockpit/new?tier=${tierKey}&intake=${token}`;
        }
      }
    },
    [intake, token, handleUnlockClick, initPaymentMutation],
  );

  if (isLoading || !token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (error || !intake) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 text-center">
        <AlertTriangle className="h-10 w-10 text-warning" />
        <h1 className="mt-3 text-2xl font-bold text-foreground">Diagnostic non disponible</h1>
        <p className="mt-2 max-w-md text-foreground-muted">
          Ce lien est invalide ou l'intake n'a jamais existé.
        </p>
        {error && <p className="mt-3 text-xs text-destructive">Erreur : {error.message}</p>}
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
        <h1 className="mt-3 text-2xl font-bold text-foreground">Diagnostic non finalisé</h1>
        <p className="mt-2 max-w-md text-foreground-muted">
          Le questionnaire n'est pas encore terminé. Reprenez-le pour générer votre rapport.
        </p>
        <Link
          href={`/intake/${token}`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Reprendre le questionnaire <ArrowRight className="h-4 w-4" />
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
        <h1 className="mt-3 text-2xl font-bold text-foreground">Rapport corrompu</h1>
        <p className="mt-2 max-w-md text-foreground-muted">
          L'intake est marqué comme terminé mais le score est introuvable. Recommencez le questionnaire.
        </p>
        <Link
          href={`/intake/${token}`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
        >
          Reprendre le questionnaire <ArrowRight className="h-4 w-4" />
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

  const introText = CLASSIFICATION_INTRO[classification] ??
    "Voici le diagnostic synthetique de votre marque, suivi des leviers strategiques recommandes.";
  const retainerPitch = CLASSIFICATION_RETAINER_PITCH[classification] ??
    "La Fusee accompagne les marques sur la mise en coherence et l'execution strategique. Echangeons sur votre besoin.";

  const bizContext = formatBizContext(intake);
  const verbatim = formatVerbatim(intake);
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
              La Fusee — Industry OS
            </p>
            <h1 className="mt-2 text-4xl font-bold text-foreground">Rapport ADVE complet</h1>
            <p className="mt-2 text-lg text-foreground-secondary">{intake.companyName}</p>
            <p className="mt-1 text-sm text-foreground-muted">
              {classification} · Score {composite}/100 · {reportDate}
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-4 text-xs text-foreground-secondary">
            <div>
              <p className="font-bold uppercase tracking-wider text-foreground-muted">Contact prepare</p>
              <p className="mt-1">{intake.contactName}</p>
              <p>{intake.contactEmail}</p>
              {intake.contactPhone && <p>{intake.contactPhone}</p>}
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider text-foreground-muted">La Fusee</p>
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
            Rapport ADVE — Pre-evaluation de marque
          </p>
          <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
            {intake.companyName}
          </h1>

          {/* Level placement — the headline */}
          {classification !== "NON_CLASSIFIE" && (
            <div className="mt-6 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary-subtle/30 to-card p-5 sm:p-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Niveau actuel de la marque
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-3">
                <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
                  {classification}
                </h2>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${LEVEL_COLOR[classification as BrandLevel]}`}>
                  {LEVEL_TAGLINE[classification as BrandLevel]}
                </span>
              </div>
              {brandLevel?.justification && (
                <p className="mt-3 text-sm leading-relaxed text-foreground">
                  {brandLevel.justification}
                </p>
              )}

              {/* Ladder progress */}
              <div className="mt-5">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-foreground-muted">
                  <span>Echelle</span>
                  <span>Cible : ICONE</span>
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
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                    Prochaine etape : {brandLevel.nextMilestone.targetLevel}
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

          {/* Completion score — relegated to a small caption */}
          <p className="mt-3 text-xs text-foreground-muted">
            Completude du dossier ADVE : {composite}/100 ({Math.round((composite / 100) * 100)}% des champs renseignes — informatif).
          </p>
        </header>

        {/* ════════════════════════════════════════════════════════════
            PDF-ONLY: Intro + Contexte business
        ════════════════════════════════════════════════════════════ */}
        <section className="hidden print:block print:mb-8">
          <h2 className="mb-3 text-2xl font-bold text-foreground">1. Introduction</h2>
          <p className="text-base leading-relaxed text-foreground">{introText}</p>
        </section>

        {bizContext.length > 0 && (
          <section className="hidden print:block print:mb-8 print:break-after-page">
            <h2 className="mb-3 text-2xl font-bold text-foreground">2. Contexte business</h2>
            <p className="mb-4 text-sm text-foreground-muted">
              Donnees declarees lors de l'intake — contexte qui calibre l'analyse ci-dessous.
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
            <h2 className="mb-3 text-2xl font-bold text-foreground">3. Niveau actuel & trajectoire</h2>
            <div className="mb-6 rounded-lg border-2 border-foreground p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                Niveau actuel
              </p>
              <p className="mt-1 text-3xl font-bold text-foreground">{classification}</p>
              <p className="mt-1 text-sm italic text-foreground-secondary">
                {classification !== "NON_CLASSIFIE" && LEVEL_TAGLINE[classification as BrandLevel]}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-foreground">{brandLevel.justification}</p>
            </div>

            {brandLevel.pillarSignals.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-2 text-base font-bold text-foreground">Lecture par pilier ADVE</h3>
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
              Trajectoire vers ICONE ({brandLevel.pathToIcone.length} palier{brandLevel.pathToIcone.length > 1 ? "s" : ""})
            </h3>
            <ol className="mb-6 space-y-3">
              {brandLevel.pathToIcone.map((step, i) => (
                <li key={i} className="border-l-4 border-foreground pl-4">
                  <p className="text-sm font-bold uppercase tracking-wider text-foreground">
                    {i + 1}. {step.level} {step.level === classification ? "(actuel)" : ""}
                  </p>
                  <p className="mt-1 text-sm text-foreground">{step.description}</p>
                  {step.keyMilestone && (
                    <p className="mt-1 text-xs italic text-foreground-secondary">
                      Verrou : {step.keyMilestone}
                    </p>
                  )}
                </li>
              ))}
            </ol>

            {brandLevel.iconeVision && (
              <div className="rounded border-2 border-primary p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  Vision ICONE pour {intake.companyName}
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
              <span className="print:hidden">Synthese executive</span>
              <span className="hidden print:inline">4. Synthese executive</span>
            </h2>
            <p className="text-base leading-relaxed text-foreground">
              {report?.executiveSummary ?? fallbackSummary}
            </p>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════
            PATH TO ICONE — visible on page (the promise)
        ════════════════════════════════════════════════════════════ */}
        {brandLevel?.pathToIcone && brandLevel.pathToIcone.length > 0 && (
          <section className="mb-10 print:hidden">
            <header className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-foreground">Trajectoire vers ICONE</h2>
              <span className="rounded-full border border-border-subtle bg-card px-2 py-0.5 text-xs text-foreground-muted">
                {brandLevel.pathToIcone.length} palier(s) a franchir
              </span>
            </header>
            <p className="mb-4 text-sm text-foreground-muted">
              Chaque palier correspond a un saut qualitatif specifique pour <span className="font-medium text-foreground">{intake.companyName}</span>.
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
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                            Vous etes ici
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">{step.description}</p>
                    {step.keyMilestone && (
                      <p className="mt-2 border-l-2 border-primary/40 pl-3 text-xs text-foreground-secondary">
                        <span className="font-semibold text-primary">Verrou : </span>
                        {step.keyMilestone}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>

            {brandLevel.iconeVision && (
              <div className="mt-6 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-card p-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Vision ICONE pour {intake.companyName}
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
            <h2 className="text-lg font-bold text-foreground">Ce que le systeme a compris</h2>
            <span className="rounded-full border border-border-subtle bg-card px-2 py-0.5 text-xs text-foreground-muted">
              Apercu — version complete dans le PDF
            </span>
          </header>
          <p className="mb-6 text-sm text-foreground-muted">
            Pour chaque pilier ADVE : un extrait des valeurs extraites, suivi du commentaire strategique condense.
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
                      <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
                        {meta.key.toUpperCase()} · {meta.tagline}
                      </p>
                      <h3 className="mt-0.5 text-lg font-semibold text-foreground">{meta.name}</h3>
                    </div>
                    <div className="flex shrink-0 items-baseline gap-1 rounded-md bg-background px-2.5 py-1">
                      <span className="text-base font-semibold tabular-nums text-foreground">{score.toFixed(1)}</span>
                      <span className="text-xs text-foreground-muted">/25</span>
                    </div>
                  </header>

                  <div className="mb-4">
                    <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                      <Database className="h-3.5 w-3.5" />
                      Valeurs extraites ({allExtracted.length})
                    </h4>
                    {allExtracted.length === 0 ? (
                      <p className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm text-foreground-muted">
                        Aucune valeur n'a pu etre extraite de vos reponses pour ce pilier.
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
                            +{moreCount} champ(s) supplementaire(s) dans le PDF complet
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {reportPillar && (
                    <div className="border-t border-border-subtle pt-4">
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                        Lecture strategique
                      </h4>
                      <p className="text-sm leading-relaxed text-foreground">{reportPillar.preview}</p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-foreground-muted">
                        <Lock className="h-3 w-3" />
                        Analyse approfondie dans le PDF complet
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
          <h2 className="mb-3 text-2xl font-bold text-foreground">5. Diagnostic ADVE</h2>
          <div className="space-y-6">
            {ADVE_PILLARS.map((meta) => {
              const allExtracted = extractedByKey[meta.key] ?? [];
              const reportPillar = report?.adve?.find((p) => p.key === meta.key);
              const score = cap(vector[meta.key] ?? 0);
              return (
                <div key={meta.key} className="border-b border-border-subtle pb-6 last:border-0">
                  <header className="mb-2 flex items-baseline justify-between gap-3">
                    <h3 className="text-xl font-bold text-foreground">
                      {meta.key.toUpperCase()} · {meta.name}
                    </h3>
                    <span className="text-sm tabular-nums text-foreground-muted">{score.toFixed(1)} / 25</span>
                  </header>
                  <p className="mb-3 text-sm italic text-foreground-muted">{meta.tagline}</p>

                  {allExtracted.length > 0 && (
                    <>
                      <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground-muted">
                        Valeurs extraites
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
                        Lecture strategique
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
              <h2 className="text-lg font-bold text-foreground">Proposition strategique RTIS</h2>
              <span className="rounded-full border border-border-subtle bg-card px-2 py-0.5 text-xs text-foreground-muted">
                Apercu — analyse complete dans le PDF
              </span>
            </header>
            <p className="mb-6 text-sm text-foreground-muted">{report.rtis.framing}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {report.rtis.pillars.map((p) => (
                <article key={p.key} className="flex flex-col rounded-xl border border-border bg-card p-5">
                  <header className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-foreground-muted">
                        {p.key.toUpperCase()} · {RTIS_PILLARS_META.find((m) => m.key === p.key)?.tagline ?? ""}
                      </p>
                      <h3 className="mt-0.5 text-base font-semibold text-foreground">{p.name}</h3>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${PRIORITY_COLOR[p.priority]}`}
                    >
                      {p.priority}
                    </span>
                  </header>
                  {p.keyMove && (
                    <p className="mb-3 rounded-md bg-primary-subtle/30 px-3 py-2 text-xs font-medium leading-snug text-primary">
                      {p.keyMove}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed text-foreground">{p.preview}</p>
                  <p className="mt-3 flex items-center gap-1.5 border-t border-border-subtle pt-3 text-xs text-foreground-muted">
                    <Lock className="h-3 w-3" />
                    Mecanique d'execution dans le PDF
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
            <h2 className="mb-3 text-2xl font-bold text-foreground">6. Proposition strategique RTIS</h2>
            <p className="mb-4 text-sm italic text-foreground-secondary">{report.rtis.framing}</p>
            <div className="space-y-6">
              {report.rtis.pillars.map((p) => (
                <div key={p.key} className="border-b border-border-subtle pb-6 last:border-0">
                  <header className="mb-2 flex items-baseline justify-between gap-3">
                    <h3 className="text-xl font-bold text-foreground">
                      {p.key.toUpperCase()} · {p.name}
                    </h3>
                    <span className="rounded border border-foreground-muted px-2 py-0.5 text-xs">
                      {p.priority} · {PRIORITY_LABEL[p.priority]}
                    </span>
                  </header>
                  {p.keyMove && (
                    <p className="mb-3 border-l-4 border-primary bg-primary-subtle/30 px-3 py-2 text-sm font-semibold text-foreground">
                      Le coup a jouer : {p.keyMove}
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
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400 print:text-foreground-muted">
                  Recommandation stratégique — Mestor
                </p>
                <h2 className="mt-1 text-xl font-bold text-foreground sm:text-2xl print:text-2xl">
                  {report.recommendation.strategicMove}
                </h2>
              </div>
              <span className="hidden rounded-full border border-amber-700/50 bg-amber-950/30 px-2 py-0.5 text-[10px] font-medium text-amber-300 print:hidden sm:inline-flex">
                Opus · ancré sur la tension centrale
              </span>
            </header>

            {report.recommendation.why && (
              <p className="mb-6 text-sm leading-relaxed text-foreground sm:text-base">
                {report.recommendation.why}
              </p>
            )}

            {/* Prioritized actions */}
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Actions priorisées
            </h3>
            <ol className="mb-6 space-y-3">
              {report.recommendation.prioritizedActions.map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border-subtle bg-card/50 p-4 print:border-foreground-muted print:bg-transparent"
                >
                  <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-[10px] font-bold text-foreground-muted">
                      #{i + 1}
                    </span>
                    <span className="font-semibold text-foreground">{a.title}</span>
                    <span className="rounded-full border border-border bg-background-overlay px-2 py-0.5 text-[10px] uppercase tracking-wider text-foreground-secondary">
                      {a.when}
                    </span>
                    <span className="rounded-full border border-border bg-background-overlay px-2 py-0.5 text-[10px] uppercase tracking-wider text-foreground-secondary">
                      {a.owner}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-secondary">{a.rationale}</p>
                  {Array.isArray(a.examples) && a.examples.length > 0 && (
                    <div className="mt-3 rounded-md border border-border-subtle bg-background-overlay/40 p-3 print:border-foreground-muted print:bg-transparent">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                        Comment l&apos;exécuter — 2 exemples
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
                    <span className="font-semibold">Succès :</span> {a.successKpi}
                  </p>
                </li>
              ))}
            </ol>

            {/* 90-day roadmap */}
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground-muted">
              Feuille de route 90 jours
            </h3>
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              {[
                { label: "0-30j", text: report.recommendation.roadmap90d.phase1_0_30j },
                { label: "30-60j", text: report.recommendation.roadmap90d.phase2_30_60j },
                { label: "60-90j", text: report.recommendation.roadmap90d.phase3_60_90j },
              ].map((phase) => (
                <div
                  key={phase.label}
                  className="rounded-lg border border-border-subtle bg-card/50 p-3 print:border-foreground-muted print:bg-transparent"
                >
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-400 print:text-foreground-muted">
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
                  Risques à surveiller
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
              <span className="font-semibold">Fondé sur :</span>{" "}
              {report.recommendation.foundedOnTension}
            </p>
          </section>
        )}

        {/* ════════════════════════════════════════════════════════════
            PDF-ONLY: Conclusion + CTA retainer
        ════════════════════════════════════════════════════════════ */}
        <section className="hidden print:block print:mb-8 print:break-after-page">
          <h2 className="mb-3 text-2xl font-bold text-foreground">7. Conclusion & prochaine etape</h2>
          <p className="text-base leading-relaxed text-foreground">{retainerPitch}</p>
          <div className="mt-6 rounded-lg border-2 border-primary p-5">
            <h3 className="mb-2 text-base font-bold text-foreground">Activons votre plan</h3>
            <p className="mb-4 text-sm leading-relaxed text-foreground-secondary">
              Le diagnostic ADVE livre la photographie. La cascade RTIS et l'execution sont la valeur ajoutee de l'accompagnement La Fusee. Premier echange offert pour cadrer le besoin.
            </p>
            <dl className="space-y-1 text-sm">
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <dt className="font-semibold text-foreground-muted">Email</dt>
                <dd className="text-foreground">{CONTACT_EMAIL}</dd>
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <dt className="font-semibold text-foreground-muted">WhatsApp</dt>
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
            <h2 className="mb-3 text-2xl font-bold text-foreground">Annexe — Vos reponses verbatim</h2>
            <p className="mb-4 text-xs italic text-foreground-muted">
              Reproduction fidele des reponses fournies, pour verifier la fidelite de l'extraction.
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
          <h2 className="mb-1 text-lg font-bold text-foreground">Echanger avec La Fusee</h2>
          <p className="mb-5 text-sm text-foreground-muted">
            Une question sur votre rapport ? Un projet a discuter ? Reponse sous 24h.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Rapport ADVE — ${intake.companyName}`)}`}
              className="flex items-center gap-3 rounded-lg border border-border-subtle bg-background p-4 transition hover:border-primary/40 hover:bg-primary-subtle/10"
            >
              <div className="rounded-full bg-primary/10 p-2"><Mail className="h-4 w-4 text-primary" /></div>
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
              <div className="rounded-full bg-primary/10 p-2"><MessageCircle className="h-4 w-4 text-primary" /></div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">WhatsApp</p>
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
                  ? "Gratuit"
                  : pricing?.localized?.display ?? (pricing?.recommended === "CINETPAY"
                    ? `${pricing?.prices.fcfa ?? 0} FCFA`
                    : `${pricing?.prices.eur ?? 0} EUR`)
              }
              onUnlock={handleUnlockClick}
              unlockDisabled={paywallLoading}
            />
            {initPaymentMutation.error && (
              <p className="mt-3 px-2 text-xs text-destructive">{initPaymentMutation.error.message}</p>
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
                <h2 className="text-lg font-bold text-foreground">Télécharger le rapport (PDF)</h2>
                <p className="mt-1 text-sm text-foreground-muted">Votre version intégrale est prête.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handlePdfDownload}
              disabled={pdfGenerating}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfGenerating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Ouverture de l&apos;impression…</>
              ) : (
                <><Download className="h-4 w-4" /> Télécharger le PDF</>
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
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-400">
                      Et après ? Voici votre trajectoire
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-zinc-50 sm:text-2xl">
                      Débloquez le rapport complet — 5 paliers, du PDF au Retainer.
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Comparez les options sans surcharger cette page : ouvrez la grille tarifaire dans une vue dédiée.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setPricingModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-black transition hover:bg-amber-500"
                    >
                      Voir les options
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    {recommendedPrice && (
                      <p className="mt-2 text-right text-[11px] text-zinc-500">
                        Recommandé : Oracle complet · <span className="text-zinc-300">{recommendedPrice}</span>
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
                <><Loader2 className="h-4 w-4 animate-spin" /> Creation en cours...</>
              ) : (
                <>Activer mon cockpit <ArrowRight className="h-4 w-4" /></>
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
                <h2 className="text-lg font-bold text-foreground">Cockpit cree pour {activated.clientName}</h2>
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

      {/* Pricing modal — focus-trapped, scroll-contained.
          The grid is rendered inside a Modal (size=2xl) so it can spread on
          desktop without overflowing, and stack vertically on mobile. */}
      {tierGrid && tierGrid.length > 0 && (
        <Modal
          open={pricingModalOpen}
          onClose={() => setPricingModalOpen(false)}
          title="Trajectoire complète — 5 paliers"
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
                <p className="truncate text-[11px] uppercase tracking-wider text-zinc-500">
                  Débloquer la suite
                </p>
                <p className="truncate text-sm text-zinc-200">
                  À partir de{" "}
                  <span className="font-semibold text-amber-400">
                    {cheapest?.price.display ?? "—"}
                  </span>
                  {recommended && (
                    <span className="hidden sm:inline text-zinc-500">
                      {" · Recommandé : "}
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
                Voir les options
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })()}
    </main>
  );
}

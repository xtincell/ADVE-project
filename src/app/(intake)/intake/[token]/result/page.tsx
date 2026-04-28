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
interface NarrativeReport {
  executiveSummary: string;
  adve: AdvePillarReport[];
  rtis: { framing: string; pillars: RtisPillarReport[] };
}

interface Diagnostic {
  classification?: string;
  summary?: string;
  narrativeReport?: NarrativeReport;
}

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

  useEffect(() => {
    if (paymentData?.paid === true) setUnlockedByPayment(true);
  }, [paymentData]);

  const isPaid = isAdmin || unlockedByPayment || paymentData?.paid === true;
  const isFree = (pricing?.prices.fcfa ?? 0) === 0 && (pricing?.prices.eur ?? 0) === 0;

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

  const handlePdfDownload = useCallback(() => {
    if (typeof window === "undefined") return;
    setPdfError(null);
    setPdfGenerating(true);
    try {
      window.print();
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Echec de l'impression");
    } finally {
      setTimeout(() => setPdfGenerating(false), 800);
    }
  }, []);

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

  const vector = intake.advertis_vector as Record<string, number>;
  const cap = (v: number) => Math.round(Math.min(v, 25) * 10) / 10;
  const composite = Math.round(
    (cap(vector.a ?? 0) + cap(vector.d ?? 0) + cap(vector.v ?? 0) + cap(vector.e ?? 0)) * 10,
  ) / 10;

  const diagnostic = (intake.diagnostic as Diagnostic | null) ?? null;
  const report = diagnostic?.narrativeReport ?? null;
  const classification = diagnostic?.classification ?? "NON_CLASSIFIE";
  const fallbackSummary = diagnostic?.summary ?? null;

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
            HEADER (page + print)
        ════════════════════════════════════════════════════════════ */}
        <header className="mb-10 flex flex-col gap-3 border-b border-border-subtle pb-6 sm:flex-row sm:items-end sm:justify-between print:hidden">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-foreground-muted">
              Rapport ADVE — Diagnostic de marque
            </p>
            <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
              {intake.companyName}
            </h1>
            <p className="mt-1 text-sm text-foreground-muted">
              Classification : <span className="font-medium text-foreground">{classification}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-baseline gap-2 rounded-lg border border-border bg-card px-4 py-2">
            <span className="text-2xl font-bold tabular-nums text-foreground">{composite}</span>
            <span className="text-sm text-foreground-muted">/100</span>
          </div>
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
            EXECUTIVE SUMMARY (page + print)
        ════════════════════════════════════════════════════════════ */}
        {(report?.executiveSummary || fallbackSummary) && (
          <section className="mb-8 rounded-2xl border border-primary/20 bg-primary-subtle/20 p-6 print:rounded-none print:border-0 print:bg-transparent print:p-0 print:mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-primary print:text-2xl print:text-foreground print:normal-case print:tracking-normal">
              <Sparkles className="h-4 w-4 print:hidden" />
              <span className="print:hidden">Synthese executive</span>
              <span className="hidden print:inline">3. Synthese executive</span>
            </h2>
            <p className="text-base leading-relaxed text-foreground">
              {report?.executiveSummary ?? fallbackSummary}
            </p>
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
          <h2 className="mb-3 text-2xl font-bold text-foreground">4. Diagnostic ADVE</h2>
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
            <h2 className="mb-3 text-2xl font-bold text-foreground">5. Proposition strategique RTIS</h2>
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
            PDF-ONLY: Conclusion + CTA retainer
        ════════════════════════════════════════════════════════════ */}
        <section className="hidden print:block print:mb-8 print:break-after-page">
          <h2 className="mb-3 text-2xl font-bold text-foreground">6. Conclusion & prochaine etape</h2>
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

        <section className="mt-10 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary-subtle/40 to-card p-6 sm:p-8 print:hidden">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              {isPaid ? <Check className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-primary" />}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">Telecharger le rapport complet (PDF)</h2>
              <p className="mt-1 text-sm text-foreground-muted">
                Version PDF integrale : intro, contexte business, ADVE complet, RTIS complet (R/T/I/S), conclusion et reponses verbatim.
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
                <><Loader2 className="h-4 w-4 animate-spin" /> Ouverture de l'impression...</>
              ) : (
                <><Download className="h-4 w-4" /> Telecharger le PDF</>
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
                <><Loader2 className="h-4 w-4 animate-spin" /> Deblocage...</>
              ) : (
                <>Debloquer le telechargement <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          )}
          {pdfError && <p className="mt-3 text-xs text-destructive">{pdfError}</p>}
          {initPaymentMutation.error && (
            <p className="mt-3 text-xs text-destructive">{initPaymentMutation.error.message}</p>
          )}
        </section>

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
    </main>
  );
}

// ============================================================================
// MODULE M35 — Quick Intake Portal: Landing Page
// Score: 95/100 | Priority: P0 | Status: FUNCTIONAL
// Spec: §5.2 | Division: L'Oracle
// ============================================================================
//
// CdC REQUIREMENTS (V1):
// [x] REQ-1  Landing: "Mesurez la force de votre marque en 15 minutes" + CTA
// [x] REQ-2  Collect contact info (name, email, company — required)
// [x] REQ-3  Collect optional context (sector, country, business model, positioning)
// [x] REQ-4  Start mutation creates QuickIntake → redirects to /intake/[token]
// [x] REQ-5  Trust badges (gratuit, confidentiel, 15 min, actionnable)
// [x] REQ-6  Mobile-first responsive design
// [x] REQ-7  UTM tracking (source parameter captured from URL query params)
// [x] REQ-8  Social proof (# of diagnostics completed)
// [x] REQ-9  Method selection: LONG, SHORT, INGEST, INGEST_PLUS
//
// ROUTE: /intake
// ============================================================================

"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { BUSINESS_MODELS, POSITIONING_ARCHETYPES } from "@/lib/types/business-context";
import { INTAKE_SECTORS, INTAKE_COUNTRIES } from "@/lib/constants/intake-options";
import {
  Shield, Clock, BarChart3, Users,
  ClipboardList, FileText, Upload, Globe,
  ArrowLeft, HelpCircle, ChevronRight,
} from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";
import { useT } from "@/lib/i18n/use-t";

type Step = "contact" | "method";
type IntakeMethod = "GUIDED" | "IMPORT";

const METHOD_OPTIONS: Array<{
  id: IntakeMethod;
  titleKey: string;
  subtitleKey: string;
  durationKey: string;
  descriptionKey: string;
  icon: typeof ClipboardList;
  recommended?: boolean;
}> = [
  {
    id: "GUIDED",
    titleKey: "intake.method.guided.title",
    subtitleKey: "intake.method.guided.subtitle",
    durationKey: "intake.method.guided.duration",
    descriptionKey: "intake.method.guided.description",
    icon: ClipboardList,
    recommended: true,
  },
  {
    id: "IMPORT",
    titleKey: "intake.method.import.title",
    subtitleKey: "intake.method.import.subtitle",
    durationKey: "intake.method.import.duration",
    descriptionKey: "intake.method.import.description",
    icon: FileText,
  },
];

export default function IntakeLanding() {
  return (
    <Suspense fallback={<div />}>
      <IntakeLandingContent />
    </Suspense>
  );
}

function IntakeLandingContent() {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("contact");
  const [selectedMethod, setSelectedMethod] = useState<IntakeMethod>("GUIDED");
  const [form, setForm] = useState({
    contactName: "",
    contactEmail: "",
    companyName: "",
    sector: "",
    country: "",
    businessModel: "",
    positioning: "",
    websiteUrl: "",
    socialLinksRaw: "",
    referralCode: "",
  });
  const [error, setError] = useState("");

  // Attribution funnel (vague E) : UTM structurés + referrer + click ids —
  // d'où vient CHAQUE prospect. `source` reste la synthèse lisible (compat).
  const [utmSource, setUtmSource] = useState<string | undefined>();
  const [attribution, setAttribution] = useState<Record<string, string> | undefined>();
  useEffect(() => {
    const source = searchParams.get("utm_source")
      ?? searchParams.get("source")
      ?? searchParams.get("ref")
      ?? undefined;
    const campaign = searchParams.get("utm_campaign") ?? undefined;
    if (source) {
      setUtmSource(campaign ? `${source}::${campaign}` : source);
    }
    const attr: Record<string, string> = {};
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref", "gclid", "fbclid"]) {
      const v = searchParams.get(key);
      if (v) attr[key] = v.slice(0, 200);
    }
    if (typeof document !== "undefined" && document.referrer) attr.referrer = document.referrer.slice(0, 300);
    if (typeof window !== "undefined") attr.landingPath = window.location.pathname.slice(0, 200);
    if (Object.keys(attr).length > 0) setAttribution(attr);

    // Préremplissage funnel (hero / mini-modale / /scorer) — capture sans re-saisie.
    // `method` (GUIDED/IMPORT) choisi dans la modale landing : il était passé
    // mais jamais consommé — le choix « Import IA » était silencieusement
    // ignoré (audit 2026-07-16).
    const method = searchParams.get("method");
    if (method === "GUIDED" || method === "IMPORT") setSelectedMethod(method);
    const company = searchParams.get("company") ?? searchParams.get("brand");
    const email = searchParams.get("email");
    const website = searchParams.get("website") ?? searchParams.get("websiteUrl");
    const social = searchParams.get("social") ?? searchParams.get("socialLinksRaw");
    const contactName = searchParams.get("name");
    // ADR-0157 — code de parrainage préremplissable (?parrain=LF-XXXXXX).
    const referral = searchParams.get("parrain") ?? searchParams.get("referral");
    if (company || email || website || social || contactName || referral) {
      setForm((f) => ({
        ...f,
        companyName: company?.slice(0, 200) ?? f.companyName,
        contactEmail: email?.slice(0, 200) ?? f.contactEmail,
        contactName: contactName?.slice(0, 200) ?? f.contactName,
        websiteUrl: website?.slice(0, 300) ?? f.websiteUrl,
        socialLinksRaw: social?.slice(0, 1000) ?? f.socialLinksRaw,
        referralCode: referral?.slice(0, 24) ?? f.referralCode,
      }));
      // P1-1 (audit UX 2026-07-19) — la modale landing collecte déjà
      // nom/email/marque : re-présenter le step contact entier était une
      // double-saisie. Querystring complet → on saute directement au choix
      // de méthode (les champs restent modifiables via « Retour »).
      if (contactName && email && company) {
        setStep("method");
      }
    }
  }, [searchParams]);

  // Social proof
  const { data: completedCount } = trpc.quickIntake.getCompletedCount.useQuery(undefined, {
    staleTime: 60_000,
  });

  const startMutation = trpc.quickIntake.start.useMutation({
    onSuccess: (data) => {
      // Route depends on method
      if (selectedMethod === "GUIDED") {
        router.push(`/intake/${data.token}`);
      } else {
        // IMPORT method — ingest page handles text + files + URL
        router.push(`/intake/${data.token}/ingest`);
      }
    },
    onError: (err) => {
      // Translate common Zod/tRPC errors to localized copy
      const msg = err.message;
      if (msg.includes("email") || msg.includes("pattern")) {
        setError(t("intake.contact.error.invalidEmail"));
        setStep("contact");
      } else if (msg.includes("String must contain")) {
        setError(t("intake.contact.error.requiredFields"));
        setStep("contact");
      } else {
        setError(msg);
      }
    },
  });

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep("method");
  };

  const handleStart = () => {
    setError("");

    // Client-side validation before hitting the server
    if (!form.contactName.trim()) {
      setError(t("intake.contact.error.nameRequired"));
      setStep("contact");
      return;
    }
    if (!form.contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      setError(t("intake.contact.error.emailInvalid"));
      setStep("contact");
      return;
    }
    if (!form.companyName.trim()) {
      setError(t("intake.contact.error.companyRequired"));
      setStep("contact");
      return;
    }

    startMutation.mutate({
      contactName: form.contactName.trim(),
      contactEmail: form.contactEmail.trim(),
      companyName: form.companyName.trim(),
      sector: form.sector || undefined,
      country: form.country || undefined,
      businessModel: form.businessModel || undefined,
      positioning: form.positioning || undefined,
      websiteUrl: form.websiteUrl.trim() || undefined,
      socialLinksRaw: form.socialLinksRaw.trim() || undefined,
      source: utmSource,
      attribution,
      method: selectedMethod,
      referralCode: form.referralCode.trim() || undefined,
    });
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary";
  const selectClass =
    "w-full appearance-none rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-8">
        {/* Logo — official La Fusée mark */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logos/lafusee-logo.png" alt={t("intake.brand.alt")} className="mb-8 h-12 w-auto" />

        {/* Headline */}
        <h1 className="max-w-lg text-center text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          {t("intake.hero.title.before")}{" "}
          <span className="text-gradient-star">{t("intake.hero.title.highlight")}</span>
        </h1>

        <p className="mt-4 max-w-md text-center text-base leading-relaxed text-foreground-secondary sm:text-lg">
          {t("intake.hero.subtitle")}
        </p>

        {/* Trust badges */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-foreground-muted">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-success" />
            {t("intake.badge.free")}
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-success" />
            {t("intake.badge.confidential")}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-info" />
            {t("intake.badge.duration")}
          </span>
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            {t("intake.badge.actionable")}
          </span>
          {completedCount && completedCount > 5 && (
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-accent" />
              {t("intake.badge.diagnostics").replace("{count}", String(completedCount))}
            </span>
          )}
        </div>

        {/* Step indicator */}
        <div className="mt-8 flex items-center gap-2 text-xs text-foreground-muted">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === "contact" ? "bg-primary text-primary-foreground" : "bg-primary-subtle text-primary"}`}>
            1
          </span>
          <span className={step === "contact" ? "font-medium text-foreground" : "text-foreground-muted"}>{t("intake.steps.contact")}</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === "method" ? "bg-primary text-primary-foreground" : "bg-background-overlay text-foreground-muted"}`}>
            2
          </span>
          <span className={step === "method" ? "font-medium text-foreground" : "text-foreground-muted"}>{t("intake.steps.method")}</span>
        </div>

        {/* ──────────── STEP 1: Contact info ──────────── */}
        {step === "contact" && (
          <form
            className="mt-8 w-full max-w-md space-y-4"
            onSubmit={handleContactSubmit}
          >
            <div>
              <label htmlFor="contactName" className="mb-1.5 block text-sm font-medium text-foreground">
                {t("intake.contact.name.label")} *
              </label>
              <input
                id="contactName"
                type="text"
                required
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className={inputClass}
                placeholder={t("intake.contact.name.placeholder")}
              />
            </div>

            <div>
              <label htmlFor="contactEmail" className="mb-1.5 block text-sm font-medium text-foreground">
                {t("intake.contact.email.label")} *
              </label>
              <input
                id="contactEmail"
                type="email"
                required
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className={inputClass}
                placeholder={t("intake.contact.email.placeholder")}
              />
            </div>

            <div>
              <label htmlFor="companyName" className="mb-1.5 block text-sm font-medium text-foreground">
                {t("intake.contact.company.label")} *
              </label>
              <input
                id="companyName"
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className={inputClass}
                placeholder={t("intake.contact.company.placeholder")}
              />
            </div>

            {/* ADR-0157 — parrainage : optionnel, le filleul obtient -20 % sur
                son premier cycle et le parrain 1 mois offert (appliqués à la
                validation — rien d'automatique). */}
            <div>
              <label htmlFor="referralCode" className="mb-1.5 block text-sm font-medium text-foreground">
                {t("intake.contact.referral.label")}
              </label>
              <input
                id="referralCode"
                type="text"
                value={form.referralCode}
                onChange={(e) => setForm({ ...form, referralCode: e.target.value.toUpperCase() })}
                className={inputClass}
                placeholder={t("intake.contact.referral.placeholder")}
              />
              <p className="mt-1 text-xs text-foreground-muted">
                {t("intake.contact.referral.hint")}
              </p>
            </div>

            <div>
              <label htmlFor="websiteUrl" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                {t("intake.contact.website.label")} <span className="text-foreground-muted">{t("intake.contact.website.hint")}</span>
              </label>
              <input
                id="websiteUrl"
                type="url"
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                className={inputClass}
                placeholder={t("intake.contact.website.placeholder")}
              />
            </div>

            <div>
              <label htmlFor="socialLinksRaw" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                {t("intake.contact.social.label")} <span className="text-foreground-muted">{t("intake.contact.social.hint")}</span>
              </label>
              <textarea
                id="socialLinksRaw"
                rows={3}
                value={form.socialLinksRaw}
                onChange={(e) => setForm({ ...form, socialLinksRaw: e.target.value })}
                className={inputClass}
                placeholder={t("intake.contact.social.placeholder")}
              />
              <p className="mt-1 text-xs text-foreground-muted">
                {t("intake.contact.social.note")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sector" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                  {t("intake.contact.sector.label")}
                </label>
                <select
                  id="sector"
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  className={selectClass}
                >
                  <option value="">{t("intake.contact.optional")}</option>
                  {INTAKE_SECTORS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                  {t("intake.contact.country.label")}
                </label>
                <select
                  id="country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className={selectClass}
                >
                  <option value="">{t("intake.contact.optional")}</option>
                  {INTAKE_COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="businessModel" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                {t("intake.contact.businessModel.label")}
              </label>
              <select
                id="businessModel"
                value={form.businessModel}
                onChange={(e) => setForm({ ...form, businessModel: e.target.value })}
                className={selectClass}
              >
                <option value="">{t("intake.contact.optional")}</option>
                {Object.entries(BUSINESS_MODELS).map(([key, model]) => (
                  <option key={key} value={key}>{model.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="positioning" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                {t("intake.contact.positioning.label")}
              </label>
              <select
                id="positioning"
                value={form.positioning}
                onChange={(e) => setForm({ ...form, positioning: e.target.value })}
                className={selectClass}
              >
                <option value="">{t("intake.contact.optional")}</option>
                {Object.entries(POSITIONING_ARCHETYPES).map(([key, arch]) => (
                  <option key={key} value={key}>{arch.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <div className="rounded-lg bg-destructive-subtle/30 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="sticky bottom-4 pt-2 sm:static sm:bottom-auto">
              <button
                type="submit"
                className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary-hover sm:py-3 sm:shadow-none"
              >
                {t("intake.contact.continue")}
              </button>
            </div>
          </form>
        )}

        {/* ──────────── STEP 2: Method selection ──────────── */}
        {step === "method" && (
          <div className="mt-8 w-full max-w-lg space-y-4">
            <button
              onClick={() => setStep("contact")}
              className="mb-2 flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("intake.method.back")}
            </button>

            <h2 className="text-lg font-bold text-foreground">
              {t("intake.method.title.before")} <span className="text-primary">{form.companyName}</span>{t("intake.method.title.after")}
            </h2>

            <div className="space-y-3">
              {METHOD_OPTIONS.map((method) => {
                const Icon = method.icon;
                const isSelected = selectedMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method.id)}
                    className={`relative w-full rounded-xl border-2 px-5 py-4 text-left transition-[border-color,background-color,box-shadow] ${
                      isSelected
                        ? "border-primary bg-primary-subtle/30 shadow-sm"
                        : "border-border bg-background-raised hover:border-foreground-muted/30"
                    }`}
                  >
                    {method.recommended && (
                      <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider text-primary-foreground">
                        {t("intake.method.recommended")}
                      </span>
                    )}
                    <div className="flex items-start gap-4">
                      <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-background-overlay text-foreground-muted"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="flex items-center gap-1.5 font-semibold text-foreground">
                            {t(method.titleKey)}
                            <AiBadge />
                          </p>
                          <span className="ml-2 text-xs text-foreground-muted">{t(method.durationKey)}</span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-primary">{t(method.subtitleKey)}</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-foreground-secondary">
                          {t(method.descriptionKey)}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="rounded-lg bg-destructive-subtle/30 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="sticky bottom-4 pt-2 sm:static sm:bottom-auto">
              <button
                type="button"
                onClick={handleStart}
                disabled={startMutation.isPending}
                className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary-hover disabled:opacity-50 sm:py-3 sm:shadow-none"
              >
                {startMutation.isPending ? t("intake.method.starting") : t("intake.method.start")}
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 max-w-xs text-center text-2xs leading-relaxed text-foreground-muted">
          {t("intake.footer.privacy")}
        </p>
      </div>
    </main>
  );
}

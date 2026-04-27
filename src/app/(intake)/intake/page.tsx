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
import {
  Rocket, Shield, Clock, BarChart3, Users,
  ClipboardList, FileText, Upload, Globe,
  ArrowLeft, HelpCircle, ChevronRight,
} from "lucide-react";
import { AiBadge } from "@/components/shared/ai-badge";

type Step = "contact" | "method";
type IntakeMethod = "GUIDED" | "IMPORT";

const METHOD_OPTIONS: Array<{
  id: IntakeMethod;
  title: string;
  subtitle: string;
  duration: string;
  description: string;
  icon: typeof ClipboardList;
  recommended?: boolean;
}> = [
  {
    id: "GUIDED",
    title: "Questionnaire",
    subtitle: "Methode guidee",
    duration: "~10 min",
    description: "Repondez a des questions sur les 4 piliers ADVE (Authenticite, Distinction, Valeur, Engagement). Activez l'IA pour des questions personnalisees.",
    icon: ClipboardList,
    recommended: true,
  },
  {
    id: "IMPORT",
    title: "Import intelligent",
    subtitle: "Methode rapide",
    duration: "~3-5 min",
    description: "Fournissez un texte, des documents (PDF, Word) et/ou l'URL de votre site. L'IA analyse vos sources et extrait les donnees ADVE.",
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
  });
  const [error, setError] = useState("");

  // UTM tracking
  const [utmSource, setUtmSource] = useState<string | undefined>();
  useEffect(() => {
    const source = searchParams.get("utm_source")
      ?? searchParams.get("source")
      ?? searchParams.get("ref")
      ?? undefined;
    const campaign = searchParams.get("utm_campaign") ?? undefined;
    if (source) {
      setUtmSource(campaign ? `${source}::${campaign}` : source);
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
      // Translate common Zod/tRPC errors to French
      const msg = err.message;
      if (msg.includes("email") || msg.includes("pattern")) {
        setError("Adresse email invalide. Verifiez et reessayez.");
        setStep("contact");
      } else if (msg.includes("String must contain")) {
        setError("Veuillez remplir tous les champs obligatoires.");
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
      setError("Le nom est requis.");
      setStep("contact");
      return;
    }
    if (!form.contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      setError("Veuillez entrer une adresse email valide.");
      setStep("contact");
      return;
    }
    if (!form.companyName.trim()) {
      setError("Le nom de la marque est requis.");
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
      source: utmSource,
      method: selectedMethod,
    });
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary";
  const selectClass =
    "w-full appearance-none rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 sm:px-8">
        {/* Logo */}
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle">
          <Rocket className="h-7 w-7 text-primary" />
        </div>

        {/* Headline */}
        <h1 className="max-w-lg text-center text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          Mesurez la force de votre marque en{" "}
          <span className="text-gradient-star">15 minutes</span>
        </h1>

        <p className="mt-4 max-w-md text-center text-base leading-relaxed text-foreground-secondary sm:text-lg">
          Le protocole ADVE analyse 4 dimensions fondamentales et vous donne un score sur 100.
        </p>

        {/* Trust badges */}
        <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-foreground-muted">
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-success" />
            Gratuit
          </span>
          <span className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-success" />
            Confidentiel
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-info" />
            15 min
          </span>
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            Actionnable
          </span>
          {completedCount && completedCount > 5 && (
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-accent" />
              {completedCount}+ diagnostics
            </span>
          )}
        </div>

        {/* Step indicator */}
        <div className="mt-8 flex items-center gap-2 text-xs text-foreground-muted">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === "contact" ? "bg-primary text-primary-foreground" : "bg-primary-subtle text-primary"}`}>
            1
          </span>
          <span className={step === "contact" ? "font-medium text-foreground" : "text-foreground-muted"}>Vos infos</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${step === "method" ? "bg-primary text-primary-foreground" : "bg-background-overlay text-foreground-muted"}`}>
            2
          </span>
          <span className={step === "method" ? "font-medium text-foreground" : "text-foreground-muted"}>Methode</span>
        </div>

        {/* ──────────── STEP 1: Contact info ──────────── */}
        {step === "contact" && (
          <form
            className="mt-8 w-full max-w-md space-y-4"
            onSubmit={handleContactSubmit}
          >
            <div>
              <label htmlFor="contactName" className="mb-1.5 block text-sm font-medium text-foreground">
                Votre nom *
              </label>
              <input
                id="contactName"
                type="text"
                required
                value={form.contactName}
                onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                className={inputClass}
                placeholder="Ex: Marie Ndongo"
              />
            </div>

            <div>
              <label htmlFor="contactEmail" className="mb-1.5 block text-sm font-medium text-foreground">
                Email *
              </label>
              <input
                id="contactEmail"
                type="email"
                required
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className={inputClass}
                placeholder="marie@monentreprise.com"
              />
            </div>

            <div>
              <label htmlFor="companyName" className="mb-1.5 block text-sm font-medium text-foreground">
                Nom de la marque / entreprise *
              </label>
              <input
                id="companyName"
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className={inputClass}
                placeholder="Ex: MonEntreprise SARL"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sector" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                  Secteur
                </label>
                <select
                  id="sector"
                  value={form.sector}
                  onChange={(e) => setForm({ ...form, sector: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Optionnel</option>
                  <option value="FMCG">FMCG</option>
                  <option value="BANQUE">Banque & Finance</option>
                  <option value="TECH">Tech & Startup</option>
                  <option value="TELECOM">Telecom</option>
                  <option value="IMMOBILIER">Immobilier</option>
                  <option value="SANTE">Sante</option>
                  <option value="EDUCATION">Education</option>
                  <option value="MODE">Mode & Beaute</option>
                  <option value="FOOD">Alimentation</option>
                  <option value="SERVICES">Services professionnels</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>

              <div>
                <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                  Pays
                </label>
                <select
                  id="country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Optionnel</option>
                  <option value="CM">Cameroun</option>
                  <option value="CI">Cote d'Ivoire</option>
                  <option value="SN">Senegal</option>
                  <option value="GA">Gabon</option>
                  <option value="CG">Congo</option>
                  <option value="CD">RD Congo</option>
                  <option value="BF">Burkina Faso</option>
                  <option value="ML">Mali</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="businessModel" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                Modele d'affaires
              </label>
              <select
                id="businessModel"
                value={form.businessModel}
                onChange={(e) => setForm({ ...form, businessModel: e.target.value })}
                className={selectClass}
              >
                <option value="">Optionnel</option>
                {Object.entries(BUSINESS_MODELS).map(([key, model]) => (
                  <option key={key} value={key}>{model.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="positioning" className="mb-1.5 block text-sm font-medium text-foreground-secondary">
                Positionnement prix
              </label>
              <select
                id="positioning"
                value={form.positioning}
                onChange={(e) => setForm({ ...form, positioning: e.target.value })}
                className={selectClass}
              >
                <option value="">Optionnel</option>
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
                className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-hover sm:py-3 sm:shadow-none"
              >
                Continuer — choisir la methode
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
              Retour aux informations
            </button>

            <h2 className="text-lg font-bold text-foreground">
              Comment souhaitez-vous diagnostiquer <span className="text-primary">{form.companyName}</span> ?
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
                    className={`relative w-full rounded-xl border-2 px-5 py-4 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary-subtle/30 shadow-sm"
                        : "border-border bg-background-raised hover:border-foreground-muted/30"
                    }`}
                  >
                    {method.recommended && (
                      <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                        Recommande
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
                            {method.title}
                            <AiBadge />
                          </p>
                          <span className="ml-2 text-xs text-foreground-muted">{method.duration}</span>
                        </div>
                        <p className="mt-0.5 text-xs font-medium text-primary">{method.subtitle}</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-foreground-secondary">
                          {method.description}
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
                className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-hover disabled:opacity-50 sm:py-3 sm:shadow-none"
              >
                {startMutation.isPending ? "Demarrage..." : "Commencer le diagnostic"}
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 max-w-xs text-center text-[11px] leading-relaxed text-foreground-muted">
          Vos donnees sont confidentielles et ne seront jamais partagees sans votre accord explicite.
        </p>
      </div>
    </main>
  );
}

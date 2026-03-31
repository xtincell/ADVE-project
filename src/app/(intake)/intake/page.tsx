"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { BUSINESS_MODELS, POSITIONING_ARCHETYPES } from "@/lib/types/business-context";
import { Rocket, Shield, Clock, BarChart3 } from "lucide-react";

export default function IntakeLanding() {
  const router = useRouter();
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

  const startMutation = trpc.quickIntake.start.useMutation({
    onSuccess: (data) => router.push(`/intake/${data.token}`),
    onError: (err) => setError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    startMutation.mutate({
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      companyName: form.companyName,
      sector: form.sector || undefined,
      country: form.country || undefined,
      businessModel: form.businessModel || undefined,
      positioning: form.positioning || undefined,
    });
  };

  const inputClass =
    "w-full rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground-muted focus:border-primary focus:ring-1 focus:ring-primary";
  const selectClass =
    "w-full appearance-none rounded-xl border border-border bg-background-raised px-4 py-3 text-base text-foreground outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <main className="flex min-h-screen flex-col bg-background">
      {/* Hero section */}
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
          Le protocole ADVE-RTIS analyse 8 dimensions et vous donne un score sur 200.
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
        </div>

        {/* Form */}
        <form
          className="mt-10 w-full max-w-md space-y-4"
          onSubmit={handleSubmit}
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
              Email professionnel *
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

          {/* Mobile: stack selects vertically */}
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

          {/* Sticky CTA on mobile */}
          <div className="sticky bottom-4 pt-2 sm:static sm:bottom-auto">
            <button
              type="submit"
              disabled={startMutation.isPending}
              className="w-full rounded-xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary-hover disabled:opacity-50 sm:py-3 sm:shadow-none"
            >
              {startMutation.isPending ? "Demarrage..." : "Commencer le diagnostic"}
            </button>
          </div>
        </form>

        <p className="mt-6 max-w-xs text-center text-[11px] leading-relaxed text-foreground-muted">
          Vos donnees sont confidentielles et ne seront jamais partagees sans votre accord explicite.
        </p>
      </div>
    </main>
  );
}

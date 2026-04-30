"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import {
  Rocket, Building2, Globe, DollarSign, Users, ArrowRight,
  ArrowLeft, Check, Sparkles, ShoppingBag, Radio, Zap,
} from "lucide-react";

// ============================================================================
// BUSINESS CONTEXT OPTIONS
// ============================================================================

const BUSINESS_MODELS = [
  { key: "PRODUCTION", label: "Production", desc: "Fabrique et vend des produits physiques", icon: Building2 },
  { key: "DISTRIBUTION", label: "Distribution", desc: "Distribue des produits d'autres marques", icon: ShoppingBag },
  { key: "SERVICES", label: "Services", desc: "Vend du conseil, du temps, de l'expertise", icon: Users },
  { key: "ABONNEMENT", label: "Abonnement", desc: "Revenus recurrents (SaaS, media, box)", icon: Zap },
  { key: "PLATEFORME", label: "Plateforme", desc: "Connecte acheteurs et vendeurs", icon: Globe },
  { key: "HYBRIDE", label: "Hybride", desc: "Mix de plusieurs modeles", icon: Radio },
];

const POSITIONING = [
  { key: "ULTRA_LUXE", label: "Ultra Luxe", desc: "Le plus cher du marche, exclusif" },
  { key: "LUXE", label: "Luxe", desc: "Premium, prestigieux" },
  { key: "PREMIUM", label: "Premium", desc: "Qualite superieure, prix justifie" },
  { key: "MASSTIGE", label: "Masstige", desc: "Premium accessible, masse + prestige" },
  { key: "MAINSTREAM", label: "Mainstream", desc: "Rapport qualite-prix equilibre" },
  { key: "VALUE", label: "Value", desc: "Bon rapport qualite-prix" },
  { key: "LOW_COST", label: "Low Cost", desc: "Le moins cher possible" },
];

const SALES_CHANNELS = [
  { key: "DIRECT", label: "Vente directe (D2C)", desc: "Vous vendez directement au client final" },
  { key: "INTERMEDIATED", label: "Via distributeurs", desc: "Vous passez par des intermediaires" },
  { key: "HYBRID", label: "Hybride", desc: "Les deux — direct et via distributeurs" },
];

const SECTORS = [
  "FMCG", "BTP", "BANQUE", "TELECOM", "TECH", "RETAIL", "HOSPITALITY",
  "EDUCATION", "SANTE", "MEDIA", "AGRICULTURE", "MODE", "BEAUTE",
  "TRANSPORT", "ENERGIE", "IMMOBILIER", "AUTRE",
];

const COUNTRIES = [
  { code: "CM", name: "Cameroun" }, { code: "CI", name: "Cote d'Ivoire" },
  { code: "SN", name: "Senegal" }, { code: "GA", name: "Gabon" },
  { code: "CG", name: "Congo" }, { code: "TD", name: "Tchad" },
  { code: "RCA", name: "Centrafrique" }, { code: "CD", name: "RD Congo" },
  { code: "BJ", name: "Benin" }, { code: "TG", name: "Togo" },
  { code: "OTHER", name: "Autre" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function NewBrandPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  // Form state
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [sector, setSector] = useState("");
  const [country, setCountry] = useState("CM");
  const [businessModel, setBusinessModel] = useState("");
  const [positioning, setPositioning] = useState("");
  const [salesChannel, setSalesChannel] = useState("");
  const [freeElement, setFreeElement] = useState("");
  const [freeDetail, setFreeDetail] = useState("");

  const createStrategy = trpc.strategy.create.useMutation();
  const startBoot = trpc.bootSequence.start.useMutation();

  const STEPS = [
    { title: "La marque", icon: Sparkles },
    { title: "Le marche", icon: Globe },
    { title: "Le modele", icon: DollarSign },
    { title: "Confirmation", icon: Check },
  ];

  const canNext = () => {
    switch (step) {
      case 0: return brandName.trim().length >= 2;
      case 1: return sector && country;
      case 2: return businessModel && positioning && salesChannel;
      case 3: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createStrategy.mutateAsync({
        name: brandName.trim(),
        description: description.trim() || undefined,
        sector,
        country,
        businessContext: {
          businessModel,
          positioningArchetype: positioning,
          salesChannel,
          economicModels: [businessModel === "ABONNEMENT" ? "ABONNEMENT" : "VENTE_DIRECTE"],
          positionalGoodFlag: ["ULTRA_LUXE", "LUXE"].includes(positioning),
          premiumScope: ["PREMIUM", "MASSTIGE"].includes(positioning) ? "PARTIAL" : "NONE",
          ...(freeElement ? {
            freeLayer: { whatIsFree: freeElement, whatIsPaid: freeDetail || "Non precise", conversionLever: "content_upsell" },
          } : {}),
        },
      });

      // Auto-launch Boot Sequence
      try {
        const boot = await startBoot.mutateAsync({ strategyId: result.id });
        router.push(`/cockpit/brand/identity?boot=${(boot as unknown as Record<string, unknown>).sessionId ?? "started"}`);
      } catch (bootErr) {
        // Boot failed — show error with option to continue
        setBootError(
          bootErr instanceof Error
            ? bootErr.message
            : "Le Boot Sequence n'a pas pu demarrer. Vous pouvez continuer vers le dashboard.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la creation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Nouvelle marque"
        description="Creez une nouvelle fiche de marque ADVE-RTIS"
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Nouvelle marque" },
        ]}
      />

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all w-full ${
                i === step
                  ? "bg-accent text-white font-medium"
                  : i < step
                    ? "bg-emerald-500/15 text-emerald-400 cursor-pointer hover:bg-emerald-500/25"
                    : "bg-background text-foreground-muted"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              <span className="hidden sm:inline">{s.title}</span>
              <span className="sm:hidden">{i + 1}</span>
            </button>
            {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-foreground-muted shrink-0" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-background/80 p-6">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Comment s'appelle votre marque ?</h3>
              <p className="text-sm text-foreground-secondary">Le nom tel qu'il apparait publiquement.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Nom de la marque *</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ex: CIMENCAM, Orange, Nescafe..."
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-white placeholder-zinc-500 outline-none focus:border-accent focus:ring-1 focus:ring-violet-500 text-lg"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Description (optionnel)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="En une phrase, que fait cette marque ?"
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Ou opere cette marque ?</h3>
              <p className="text-sm text-foreground-secondary">Secteur d'activite et marche principal.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Secteur *</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {SECTORS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSector(s)}
                    className={`rounded-lg border px-3 py-2 text-xs transition-all ${
                      sector === s
                        ? "border-accent bg-accent/15 text-accent font-medium"
                        : "border-border bg-background text-foreground-secondary hover:border-border"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Pays principal *</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setCountry(c.code)}
                    className={`rounded-lg border px-3 py-2 text-xs transition-all ${
                      country === c.code
                        ? "border-accent bg-accent/15 text-accent font-medium"
                        : "border-border bg-background text-foreground-secondary hover:border-border"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Quel est le modele d'affaires ?</h3>
              <p className="text-sm text-foreground-secondary">Comment la marque gagne de l'argent et se positionne.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-secondary block mb-2">Modele economique *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BUSINESS_MODELS.map((bm) => (
                  <button
                    key={bm.key}
                    onClick={() => setBusinessModel(bm.key)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      businessModel === bm.key
                        ? "border-accent bg-accent/15"
                        : "border-border bg-background hover:border-border"
                    }`}
                  >
                    <bm.icon className={`h-4 w-4 mb-1 ${businessModel === bm.key ? "text-accent" : "text-foreground-muted"}`} />
                    <p className={`text-xs font-medium ${businessModel === bm.key ? "text-accent" : "text-foreground-secondary"}`}>{bm.label}</p>
                    <p className="text-[10px] text-foreground-muted mt-0.5">{bm.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-secondary block mb-2">Positionnement prix *</label>
              <div className="flex flex-wrap gap-2">
                {POSITIONING.map((pos) => (
                  <button
                    key={pos.key}
                    onClick={() => setPositioning(pos.key)}
                    className={`rounded-lg border px-3 py-2 text-xs transition-all ${
                      positioning === pos.key
                        ? "border-accent bg-accent/15 text-accent font-medium"
                        : "border-border bg-background text-foreground-secondary hover:border-border"
                    }`}
                    title={pos.desc}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-secondary block mb-2">Canal de vente *</label>
              <div className="space-y-2">
                {SALES_CHANNELS.map((sc) => (
                  <button
                    key={sc.key}
                    onClick={() => setSalesChannel(sc.key)}
                    className={`w-full rounded-lg border p-3 text-left transition-all ${
                      salesChannel === sc.key
                        ? "border-accent bg-accent/15"
                        : "border-border bg-background hover:border-border"
                    }`}
                  >
                    <p className={`text-xs font-medium ${salesChannel === sc.key ? "text-accent" : "text-foreground-secondary"}`}>{sc.label}</p>
                    <p className="text-[10px] text-foreground-muted">{sc.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Element gratuit (optionnel)</label>
              <input
                type="text"
                value={freeElement}
                onChange={(e) => setFreeElement(e.target.value)}
                placeholder="Ex: Formation, contenu educatif, echantillons, essai gratuit..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-accent"
              />
              {freeElement && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={freeDetail}
                    onChange={(e) => setFreeDetail(e.target.value)}
                    placeholder="Qu'est-ce qui est payant en contrepartie ?"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-accent"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Recapitulatif</h3>
              <p className="text-sm text-foreground-secondary">Verifiez les informations avant de creer la marque.</p>
            </div>
            <div className="rounded-lg border border-border bg-background divide-y divide-zinc-800">
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-foreground-muted">Marque</span>
                <span className="text-sm font-semibold text-white">{brandName}</span>
              </div>
              {description && (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs text-foreground-muted">Description</span>
                  <span className="text-sm text-foreground-secondary max-w-xs text-right">{description}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-foreground-muted">Secteur</span>
                <span className="text-sm text-foreground-secondary">{sector}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-foreground-muted">Pays</span>
                <span className="text-sm text-foreground-secondary">{COUNTRIES.find((c) => c.code === country)?.name ?? country}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-foreground-muted">Modele</span>
                <span className="text-sm text-foreground-secondary">{BUSINESS_MODELS.find((b) => b.key === businessModel)?.label ?? businessModel}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-foreground-muted">Positionnement</span>
                <span className="text-sm text-foreground-secondary">{POSITIONING.find((p) => p.key === positioning)?.label ?? positioning}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-foreground-muted">Canal</span>
                <span className="text-sm text-foreground-secondary">{SALES_CHANNELS.find((s) => s.key === salesChannel)?.label ?? salesChannel}</span>
              </div>
              {freeElement && (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs text-foreground-muted">Gratuite</span>
                  <span className="text-sm text-foreground-secondary">{freeElement}</span>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-accent/30 bg-accent/10 p-4">
              <p className="text-sm text-accent">
                <Rocket className="inline h-4 w-4 mr-1" />
                Apres la creation, vous serez guide a travers le <strong>Boot Sequence</strong> pour remplir les 8 piliers ADVE-RTIS de votre marque.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-800/30 bg-error/20 p-3">
                <p className="text-xs text-error">{error}</p>
              </div>
            )}

            {bootError && (
              <div className="rounded-lg border border-amber-800/30 bg-amber-950/20 p-4">
                <p className="text-sm font-medium text-amber-300">Le Boot Sequence n'a pas demarre</p>
                <p className="mt-1 text-xs text-amber-400/80">{bootError}</p>
                <button
                  onClick={() => router.push("/cockpit")}
                  className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  Continuer vers le dashboard
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => step > 0 ? setStep(step - 1) : router.push("/cockpit")}
          className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground-secondary hover:bg-surface-raised"
        >
          <ArrowLeft className="h-4 w-4" />
          {step === 0 ? "Annuler" : "Retour"}
        </button>

        {step < 3 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex items-center gap-2 rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Suivant
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creation en cours...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Creer la marque
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

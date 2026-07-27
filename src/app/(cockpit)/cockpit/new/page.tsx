"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { INTAKE_SECTORS, INTAKE_COUNTRIES } from "@/lib/constants/intake-options";
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
  { key: "HYBRIDE", label: "Hybride", desc: "Mix de plusieurs modèles", icon: Radio },
];

const POSITIONING = [
  { key: "ULTRA_LUXE", label: "Ultra Luxe", desc: "Le plus cher du marché, exclusif" },
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

/**
 * Secteurs et pays — LA MÊME LISTE que l'intake public (`INTAKE_SECTORS` /
 * `INTAKE_COUNTRIES`), pas une copie.
 *
 * Ce fichier portait ses propres listes, plus courtes et divergentes : 17
 * secteurs contre 24, 11 pays contre 23. Ce n'était pas qu'un décalage
 * d'affichage — le préremplissage depuis l'intake fait
 * `SECTORS.includes(s) ? s : "AUTRE"`. Un dirigeant qui déclarait **Culture,
 * Tourisme, Logistique, Agro, Alimentation, Conseil, Services, B2B, ONG,
 * Public ou Assurance** dans l'intake public voyait donc son secteur RÉÉCRIT
 * en « AUTRE » à la création de sa marque, sans un mot. Idem hors des 11 pays
 * retenus. Et comme le secteur est la clé de ligue du scoreur (ADR-0149), la
 * marque atterrissait dans la ligue des inclassables.
 *
 * Quatre valeurs n'existaient que dans cette liste — `HOSPITALITY`,
 * `AGRICULTURE`, `BEAUTE`, `TRANSPORT` — là où le canon dit `TOURISME`,
 * `AGRO`, `MODE` (« Mode & beauté ») et `LOGISTIQUE`. Et `RCA` n'est pas un
 * code ISO-2 (la Centrafrique, c'est `CF`) : il ne pouvait correspondre à rien
 * en aval.
 *
 * Une seule liste, donc. Les libellés accentués du canon remplacent au passage
 * les codes bruts (« SANTE », « ENERGIE ») affichés jusqu'ici.
 */
const SECTORS = INTAKE_SECTORS;
const COUNTRIES = INTAKE_COUNTRIES;

// ============================================================================
// COMPONENT
// ============================================================================

export default function NewBrandPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  /** Marque créée — retenue pour que chaque sortie ouvre CELLE-CI. */
  const [createdId, setCreatedId] = useState<string | null>(null);

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

  // ── Reprise d'un diagnostic intake (?intake=<token>) ─────────────────────
  // Le result page redirige ici avec `?tier=&intake=` — ces params étaient
  // JETÉS (audit 2026-07-16) : l'abonné re-saisissait tout à la main et sa
  // marque naissait VIDE alors que ses 4 piliers extraits + diagnostic +
  // empreinte existaient déjà. Désormais : si l'email de session correspond,
  // on propose l'activation complète (activateBrand — piliers inclus) ;
  // sinon on préremplit le formulaire.
  const [intakeToken, setIntakeToken] = useState<string | null>(null);
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("intake");
    if (t) setIntakeToken(t);
  }, []);
  const { data: session } = useSession();
  const sessionEmail = session?.user?.email ?? null;
  const { data: intakeData } = trpc.quickIntake.getByToken.useQuery(
    { token: intakeToken ?? "" },
    { enabled: !!intakeToken },
  );
  const activateBrand = trpc.quickIntake.activateBrand.useMutation({
    onSuccess: () => router.push("/cockpit"),
    onError: (e) => setError(e.message || "Activation impossible — créez la marque manuellement ci-dessous."),
  });
  const intakeMatchesSession =
    !!intakeData?.contactEmail && !!sessionEmail &&
    intakeData.contactEmail.toLowerCase() === sessionEmail.toLowerCase();

  // Préremplissage depuis l'intake (une fois, sans écraser une saisie).
  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!intakeData || prefilled) return;
    setPrefilled(true);
    if (intakeData.companyName && !brandName) setBrandName(intakeData.companyName);
    if (intakeData.sector) {
      const s = intakeData.sector.toUpperCase();
      setSector(SECTORS.some((x) => x.value === s) ? s : "AUTRE");
    }
    if (intakeData.country) {
      const c = intakeData.country.toUpperCase();
      // Repli sur `AUTRE`, l'échappatoire du canon — surtout pas sur « CM »,
      // qui déclarerait le Cameroun à la place du dirigeant.
      setCountry(COUNTRIES.some((x) => x.value === c) ? c : "AUTRE");
    }
    if (intakeData.businessModel && BUSINESS_MODELS.some((m) => m.key === intakeData.businessModel)) {
      setBusinessModel(intakeData.businessModel);
    }
    if (intakeData.positioning && POSITIONING.some((p) => p.key === intakeData.positioning)) {
      setPositioning(intakeData.positioning);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeData, prefilled]);

  const STEPS = [
    { title: "La marque", icon: Sparkles },
    { title: "Le marché", icon: Globe },
    { title: "Le modèle", icon: DollarSign },
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

      setCreatedId(result.id);

      // Auto-launch Boot Sequence
      try {
        await startBoot.mutateAsync({ strategyId: result.id });
      } catch (bootErr) {
        // L'initialisation a échoué — mais LA MARQUE EXISTE. On le dit, et on
        // laisse quand même entrer : la redirection était à l'intérieur de ce
        // `try`, donc un échec d'initialisation laissait le dirigeant BLOQUÉ
        // sur le formulaire avec une marque déjà créée, sans aucun moyen de
        // l'ouvrir.
        setBootError(
          bootErr instanceof Error
            ? bootErr.message
            : "L'initialisation n'a pas pu démarrer — votre marque est créée, vous pouvez l'ouvrir.",
        );
        return;
      }
      // `?strategy=` : le sélecteur de marque retient la DERNIÈRE marque active
      // (`lf-active-strategy`) et ne connaît pas encore celle qu'on vient de
      // créer. Sans ce paramètre — que le provider lit et persiste — on
      // atterrissait sur la marque précédente, d'où « je ne pouvais pas
      // l'ouvrir ». On vise le hub Fondation, qui présente les 4 piliers A/D/V/E
      // et leur avancement, plutôt qu'un pilier isolé.
      router.push(`/cockpit/brand/fondation?strategy=${result.id}`);
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
        description="Créez une nouvelle fiche de marque"
        breadcrumbs={[
          { label: "Cockpit", href: "/cockpit" },
          { label: "Nouvelle marque" },
        ]}
      />

      {/* Diagnostic intake détecté : activation complète en un clic (piliers
          extraits + diagnostic + empreinte inclus) au lieu de repartir de zéro. */}
      {intakeData && intakeMatchesSession ? (
        <div className="mb-6 rounded-2xl border-2 border-success/40 bg-success/10 p-5">
          <p className="text-2xs font-bold uppercase tracking-widest text-success">
            Votre diagnostic est prêt à être activé
          </p>
          <p className="mt-2 text-sm text-foreground">
            <strong>{intakeData.companyName}</strong> a déjà été diagnostiquée — activez-la
            telle quelle : vos réponses, votre analyse et votre empreinte publique suivent.
            Rien à re-saisir.
          </p>
          <button
            type="button"
            disabled={activateBrand.isPending}
            onClick={() => intakeToken && activateBrand.mutate({ token: intakeToken })}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-50"
          >
            {activateBrand.isPending ? "Activation…" : "Activer ma marque diagnostiquée"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ) : intakeData ? (
        <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm text-foreground-secondary">
          Formulaire prérempli depuis votre diagnostic <strong>{intakeData.companyName}</strong> — vérifiez et complétez.
        </div>
      ) : null}

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
                    ? "bg-success/15 text-success cursor-pointer hover:bg-success/25"
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
              <h3 className="text-lg font-semibold text-foreground mb-1">Comment s'appelle votre marque ?</h3>
              <p className="text-sm text-foreground-secondary">Le nom tel qu'il apparait publiquement.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Nom de la marque *</label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="Ex: CIMENCAM, Orange, Nescafe..."
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder-foreground-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent text-lg"
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
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Où opère cette marque ?</h3>
              <p className="text-sm text-foreground-secondary">Secteur d'activité et marché principal.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Secteur *</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {SECTORS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSector(s.value)}
                    className={`rounded-lg border px-3 py-2 text-xs transition-all ${
                      sector === s.value
                        ? "border-accent bg-accent/15 text-accent font-medium"
                        : "border-border bg-background text-foreground-secondary hover:border-border"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground-secondary block mb-1.5">Pays principal *</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCountry(c.value)}
                    className={`rounded-lg border px-3 py-2 text-xs transition-all ${
                      country === c.value
                        ? "border-accent bg-accent/15 text-accent font-medium"
                        : "border-border bg-background text-foreground-secondary hover:border-border"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Quel est le modèle d'affaires ?</h3>
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
                    <p className="text-2xs text-foreground-muted mt-0.5">{bm.desc}</p>
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
                    <p className="text-2xs text-foreground-muted">{sc.desc}</p>
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
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-accent"
              />
              {freeElement && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={freeDetail}
                    onChange={(e) => setFreeDetail(e.target.value)}
                    placeholder="Qu'est-ce qui est payant en contrepartie ?"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-foreground-muted outline-none focus:border-accent"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Recapitulatif</h3>
              <p className="text-sm text-foreground-secondary">Verifiez les informations avant de creer la marque.</p>
            </div>
            <div className="rounded-lg border border-border bg-background divide-y divide-border">
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-foreground-muted">Marque</span>
                <span className="text-sm font-semibold text-foreground">{brandName}</span>
              </div>
              {description && (
                <div className="flex justify-between px-4 py-3">
                  <span className="text-xs text-foreground-muted">Description</span>
                  <span className="text-sm text-foreground-secondary max-w-xs text-right">{description}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-foreground-muted">Secteur</span>
                <span className="text-sm text-foreground-secondary">{SECTORS.find((x) => x.value === sector)?.label ?? sector}</span>
              </div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-xs text-foreground-muted">Pays</span>
                <span className="text-sm text-foreground-secondary">{COUNTRIES.find((c) => c.value === country)?.label ?? country}</span>
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
                Après la création, vous arrivez sur la fiche de votre marque. Votre équipe UPgraders vous accompagne ensuite pour compléter en profondeur les piliers de votre stratégie.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-error/30 bg-error/20 p-3">
                <p className="text-xs text-error">{error}</p>
              </div>
            )}

            {bootError && (
              <div className="rounded-lg border border-warning/30 bg-warning/20 p-4">
                <p className="text-sm font-medium text-warning">L&apos;initialisation n&apos;a pas pu démarrer</p>
                <p className="mt-1 text-xs text-warning/80">{bootError}</p>
                <button
                  onClick={() =>
                    router.push(
                      createdId ? `/cockpit/brand/fondation?strategy=${createdId}` : "/cockpit",
                    )
                  }
                  className="mt-3 rounded-lg bg-warning px-4 py-2 text-sm font-medium text-white hover:bg-warning"
                >
                  Ouvrir ma marque
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
            className="flex items-center gap-2 rounded-lg bg-success px-6 py-2.5 text-sm font-medium text-white hover:bg-success disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creation en cours...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Créer la marque
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

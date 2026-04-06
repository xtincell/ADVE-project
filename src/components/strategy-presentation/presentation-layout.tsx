"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";
import type { StrategyPresentationDocument } from "@/server/services/strategy-presentation/types";
import type { PresentationPersona } from "@/server/services/strategy-presentation/types";

import { PersonaSelector } from "./persona-selector";
import { CollapsibleNav } from "./collapsible-nav";
import { SectionWrapper } from "./section-wrapper";

// Section components — Phase 1 (ADVE)
import { ExecutiveSummary } from "./sections/01-executive-summary";
import { ContexteDefi } from "./sections/02-contexte-defi";
import { PlateformeStrategique } from "./sections/04-plateforme-strat";
import { PropositionValeur } from "./sections/04-proposition-valeur";
import { TerritoireCreatif } from "./sections/05-territoire-creatif";
import { ExperienceEngagement } from "./sections/06-experience-engagement";
// Phase 2 (R+T)
import { SwotInterne } from "./sections/07-swot-interne";
import { SwotExterne } from "./sections/08-swot-externe";
import { SignauxOpportunites } from "./sections/09-signaux-opportunites";
// Phase 3 (I+S)
import { CatalogueActions } from "./sections/10-catalogue-actions";
import { PlanActivation } from "./sections/06-plan-activation";
import { FenetreOverton } from "./sections/12-fenetre-overton";
import { MediasDistribution } from "./sections/08-medias";
import { ProductionLivrables } from "./sections/07-production";
// Mesure & Superfan
import { ProfilSuperfan } from "./sections/15-profil-superfan";
import { KpisMesure } from "./sections/09-kpis";
import { CroissanceEvolution } from "./sections/17-croissance-evolution";
// Operationnel
import { BudgetDisplay } from "./sections/10-budget";
import { TimelineGouvernance } from "./sections/11-timeline";
import { EquipeDisplay } from "./sections/12-equipe";
import { ConditionsEtapes } from "./sections/13-conditions";
// Legacy
import { AuditDiagnostic } from "./sections/03-audit-diagnostic";

interface PresentationLayoutProps {
  document: StrategyPresentationDocument;
  defaultPersona: PresentationPersona;
}

const SECTION_COMPONENTS: Record<string, React.ComponentType<{ data: never }>> = {
  // Phase 1: ADVE
  "executive-summary": ExecutiveSummary as never,
  "contexte-defi": ContexteDefi as never,
  "plateforme-strategique": PlateformeStrategique as never,
  "proposition-valeur": PropositionValeur as never,
  "territoire-creatif": TerritoireCreatif as never,
  "experience-engagement": ExperienceEngagement as never,
  // Phase 2: R+T
  "swot-interne": SwotInterne as never,
  "swot-externe": SwotExterne as never,
  "signaux-opportunites": SignauxOpportunites as never,
  // Phase 3: I+S
  "catalogue-actions": CatalogueActions as never,
  "plan-activation": PlanActivation as never,
  "fenetre-overton": FenetreOverton as never,
  "medias-distribution": MediasDistribution as never,
  "production-livrables": ProductionLivrables as never,
  // Mesure & Superfan
  "profil-superfan": ProfilSuperfan as never,
  "kpis-mesure": KpisMesure as never,
  "croissance-evolution": CroissanceEvolution as never,
  // Operationnel
  "budget": BudgetDisplay as never,
  "timeline-gouvernance": TimelineGouvernance as never,
  "equipe": EquipeDisplay as never,
  "conditions-etapes": ConditionsEtapes as never,
  // Legacy
  "audit-diagnostic": AuditDiagnostic as never,
};

const SECTION_DATA_MAP: Record<string, string> = {
  "executive-summary": "executiveSummary",
  "contexte-defi": "contexteDefi",
  "plateforme-strategique": "plateformeStrategique",
  "proposition-valeur": "propositionValeur",
  "territoire-creatif": "territoireCreatif",
  "experience-engagement": "experienceEngagement",
  "swot-interne": "swotInterne",
  "swot-externe": "swotExterne",
  "signaux-opportunites": "signaux",
  "catalogue-actions": "catalogueActions",
  "plan-activation": "planActivation",
  "fenetre-overton": "fenetreOverton",
  "medias-distribution": "mediasDistribution",
  "production-livrables": "productionLivrables",
  "profil-superfan": "profilSuperfan",
  "kpis-mesure": "kpisMesure",
  "croissance-evolution": "croissanceEvolution",
  "budget": "budget",
  "timeline-gouvernance": "timelineGouvernance",
  "equipe": "equipe",
  "conditions-etapes": "conditionsEtapes",
  "audit-diagnostic": "auditDiagnostic",
};

export function PresentationLayout({ document: doc, defaultPersona }: PresentationLayoutProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [persona, setPersona] = useState<PresentationPersona>(defaultPersona);
  const [activeSection, setActiveSection] = useState(SECTION_REGISTRY[0]!.id);

  // Sync persona from URL
  useEffect(() => {
    const urlPersona = searchParams.get("persona");
    if (urlPersona === "client" || urlPersona === "creative" || urlPersona === "consultant") {
      setPersona(urlPersona);
    }
  }, [searchParams]);

  function handlePersonaChange(p: PresentationPersona) {
    setPersona(p);
    const params = new URLSearchParams(searchParams.toString());
    params.set("persona", p);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    for (const section of SECTION_REGISTRY) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [persona]);

  const visibleSections = SECTION_REGISTRY.filter((s) => s.personas.includes(persona));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-widest text-zinc-600">L'Oracle — Proposition Strategique</p>
        <h1 className="mt-2 text-3xl font-black text-zinc-100 sm:text-4xl">
          {doc.meta.brandName}
        </h1>
        {doc.meta.operatorName && (
          <p className="mt-1 text-sm text-zinc-500">par {doc.meta.operatorName}</p>
        )}
        <p className="mt-1 text-xs text-zinc-700">
          Score {doc.meta.vector.composite}/200 — {doc.meta.classification} — Genere le{" "}
          {new Date(doc.meta.generatedAt).toLocaleDateString("fr")}
        </p>
      </div>

      {/* Persona selector */}
      <div className="no-print mb-8 flex justify-center">
        <PersonaSelector current={persona} onChange={handlePersonaChange} />
      </div>

      {/* Layout: sidebar + content */}
      <div className="flex gap-8">
        {/* Sticky sidebar nav */}
        <aside className="no-print hidden w-56 shrink-0 lg:block">
          <div className="sticky top-20">
            <CollapsibleNav persona={persona} activeSection={activeSection} />
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="divide-y divide-zinc-800/50">
            {visibleSections.map((section) => {
              const Component = SECTION_COMPONENTS[section.id];
              const dataKey = SECTION_DATA_MAP[section.id];
              if (!Component || !dataKey) return null;
              const sectionData = doc.sections[dataKey as keyof typeof doc.sections];

              return (
                <SectionWrapper
                  key={section.id}
                  id={section.id}
                  number={section.number}
                  title={section.title}
                >
                  <Component data={sectionData as never} />
                </SectionWrapper>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-16 border-t border-zinc-800 pt-8 text-center">
            <p className="text-xs text-zinc-700">
              Document confidentiel — usage interne client uniquement
            </p>
            <p className="mt-1 text-xs text-zinc-800">
              Genere par LaFusee Industry OS — Methode ADVE-RTIS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

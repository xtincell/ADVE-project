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
// Phase 13 (B5) — 14 sections étendues : 7 Big4 + 5 Distinctifs + 2 Neteru actifs
// (Imhotep Phase 14 / Anubis Phase 15 — promus CORE par ADR-0045, ex-DORMANT)
import {
  Mckinsey7s,
  BcgPortfolio,
  BainNps,
  DeloitteGreenhouse,
  Mckinsey3Horizons,
  BcgStrategyPalette,
  DeloitteBudget,
  CultIndex,
  ManipulationMatrix,
  DevotionLadder,
  OvertonDistinctive,
  TarsisWeakSignals,
  ImhotepCrewProgram,
  AnubisPlanComms,
} from "./sections/phase13-sections";

interface PresentationLayoutProps {
  document: StrategyPresentationDocument;
  defaultPersona: PresentationPersona;
}

// Dynamic dispatch table : section ID → React component. Chaque section a sa
// propre forme de `data` (ExecutiveSummaryData, ContexteDefiData, ...) ; le
// dict efface cette information de type pour permettre un rendu dispatché par
// clé. Chaque composant valide sa data en interne (Zod ou fallback render).
//
// `widenSection<T>` est le seul site de cast — explicite et nommé. Il remplace
// 38 type assertions mensongères (audit:residus / writePillar fix-by-class).
type SectionRenderer = React.ComponentType<{ data: unknown; strategyId?: string }>;

function widenSection<T>(
  C: React.ComponentType<{ data: T; strategyId?: string }>,
): SectionRenderer {
  return C as unknown as SectionRenderer;
}

const SECTION_COMPONENTS: Record<string, SectionRenderer> = {
  // Phase 1: ADVE
  "executive-summary": widenSection(ExecutiveSummary),
  "contexte-defi": widenSection(ContexteDefi),
  "plateforme-strategique": widenSection(PlateformeStrategique),
  "proposition-valeur": widenSection(PropositionValeur),
  "territoire-creatif": widenSection(TerritoireCreatif),
  "experience-engagement": widenSection(ExperienceEngagement),
  // Phase 2: R+T
  "swot-interne": widenSection(SwotInterne),
  "swot-externe": widenSection(SwotExterne),
  "signaux-opportunites": widenSection(SignauxOpportunites),
  // Phase 3: I+S
  "catalogue-actions": widenSection(CatalogueActions),
  "plan-activation": widenSection(PlanActivation),
  "fenetre-overton": widenSection(FenetreOverton),
  "medias-distribution": widenSection(MediasDistribution),
  "production-livrables": widenSection(ProductionLivrables),
  // Mesure & Superfan
  "profil-superfan": widenSection(ProfilSuperfan),
  "kpis-mesure": widenSection(KpisMesure),
  "croissance-evolution": widenSection(CroissanceEvolution),
  // Operationnel
  "budget": widenSection(BudgetDisplay),
  "timeline-gouvernance": widenSection(TimelineGouvernance),
  "equipe": widenSection(EquipeDisplay),
  "conditions-etapes": widenSection(ConditionsEtapes),
  // Legacy
  "audit-diagnostic": widenSection(AuditDiagnostic),
  // Phase 13 (B5) — 14 sections étendues
  "mckinsey-7s": widenSection(Mckinsey7s),
  "bcg-portfolio": widenSection(BcgPortfolio),
  "bain-nps": widenSection(BainNps),
  "deloitte-greenhouse": widenSection(DeloitteGreenhouse),
  "mckinsey-3-horizons": widenSection(Mckinsey3Horizons),
  "bcg-strategy-palette": widenSection(BcgStrategyPalette),
  "deloitte-budget": widenSection(DeloitteBudget),
  "cult-index": widenSection(CultIndex),
  "manipulation-matrix": widenSection(ManipulationMatrix),
  "devotion-ladder": widenSection(DevotionLadder),
  "overton-distinctive": widenSection(OvertonDistinctive),
  "tarsis-weak-signals": widenSection(TarsisWeakSignals),
  "imhotep-crew-program": widenSection(ImhotepCrewProgram),
  "anubis-plan-comms": widenSection(AnubisPlanComms),
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
  // Phase 13 (B5) — pour les 14 sections étendues, le data field dans
  // StrategyPresentationDocument est exposé sous le sectionId direct (pas de
  // remap camelCase) — le composant lit data via Phase13SectionData (Record).
  // Wrapper presentation-layout passe l'objet entier en relax type.
  "mckinsey-7s": "mckinsey-7s",
  "bcg-portfolio": "bcg-portfolio",
  "bain-nps": "bain-nps",
  "deloitte-greenhouse": "deloitte-greenhouse",
  "mckinsey-3-horizons": "mckinsey-3-horizons",
  "bcg-strategy-palette": "bcg-strategy-palette",
  "deloitte-budget": "deloitte-budget",
  "cult-index": "cult-index",
  "manipulation-matrix": "manipulation-matrix",
  "devotion-ladder": "devotion-ladder",
  "overton-distinctive": "overton-distinctive",
  "tarsis-weak-signals": "tarsis-weak-signals",
  "imhotep-crew-program": "imhotep-crew-program",
  "anubis-plan-comms": "anubis-plan-comms",
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
        <p className="text-xs uppercase tracking-widest text-foreground-muted">L'Oracle — Proposition Strategique</p>
        <h1 className="mt-2 text-3xl font-black text-foreground sm:text-4xl">
          {doc.meta.brandName}
        </h1>
        {doc.meta.operatorName && (
          <p className="mt-1 text-sm text-foreground-muted">par {doc.meta.operatorName}</p>
        )}
        <p className="mt-1 text-xs text-foreground-muted">
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
                  <Component data={sectionData ?? {}} strategyId={doc.meta.strategyId} />
                </SectionWrapper>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-16 border-t border-border pt-8 text-center">
            <p className="text-xs text-foreground-muted">
              Document confidentiel — usage interne client uniquement
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              Genere par LaFusee Industry OS — Methode ADVE-RTIS
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SECTION_REGISTRY } from "@/server/services/strategy-presentation/types";
import type { StrategyPresentationDocument } from "@/server/services/strategy-presentation/types";
import type { PresentationPersona } from "@/server/services/strategy-presentation/types";

// Reskin (handoff design) — chrome ck-ogen ; PersonaSelector/CollapsibleNav/
// SectionWrapper remplacés par la bande lentille + TOC groupée + en-têtes inline.
import {
  ChevronRight, Sun, Moon, Briefcase, Users, Palette,
  Rocket, LayoutGrid, Sparkles, FileText, Share2, Copy, Check, BookOpen, Brain,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  /** Token public — quand le layout est rendu via /shared/strategy/[token],
      l'export PDF passe par la route token-scopée (le destinataire du lien
      n'a pas de session — audit 2026-07-16, `shared-oracle-pdf-401`). */
  shareToken?: string;
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

// ── Persona lens meta (reader) ──
const PERSONA_META: Record<PresentationPersona, { label: string; icon: LucideIcon; desc: string; eyebrow: string }> = {
  consultant: { label: "Consultant", icon: Briefcase, desc: "Analyse complète — diagnostic ADVERTIS, frameworks Big 4 et distinctives.", eyebrow: "Proposition stratégique · analyse" },
  client: { label: "Client", icon: Users, desc: "L'essentiel pour décider — synthèse, valeur, plan et budget.", eyebrow: "Proposition stratégique · pour décision" },
  creative: { label: "Creative", icon: Palette, desc: "Territoire & exécution — plateforme, création et production.", eyebrow: "Proposition stratégique · brief créatif" },
};
const PERSONA_ORDER: PresentationPersona[] = ["consultant", "client", "creative"];

// ── Tier (chapter) meta ──
const TIER_ORDER = ["CORE", "BIG4_BASELINE", "DISTINCTIVE"] as const;
const TIER_META: Record<string, { rn: string; chip: string; nav: string; icon: LucideIcon; title: string; desc: string }> = {
  CORE: { rn: "I", chip: "Core", nav: "Fondation & exécution", icon: Rocket, title: "Fondation & exécution", desc: "Le cœur ADVERTIS — identité, diagnostic, plan et mesure." },
  BIG4_BASELINE: { rn: "II", chip: "Big 4", nav: "Baseline Big 4", icon: LayoutGrid, title: "Baseline consulting", desc: "Les cadres de référence Big 4 appliqués à la marque." },
  DISTINCTIVE: { rn: "III", chip: "Distinct", nav: "Distinctives", icon: Sparkles, title: "Distinctives La Fusée", desc: "Ce que les Big 4 ne mesurent pas : la masse culturelle." },
};

export function PresentationLayout({ document: doc, defaultPersona, shareToken }: PresentationLayoutProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [persona, setPersona] = useState<PresentationPersona>(defaultPersona);
  const [activeSection, setActiveSection] = useState(SECTION_REGISTRY[0]!.id);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(TIER_ORDER));
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Theme persistence
  useEffect(() => {
    try { const t = window.localStorage.getItem("oracle-theme"); if (t === "light" || t === "dark") setTheme(t); } catch { /* private mode */ }
  }, []);
  useEffect(() => { try { window.localStorage.setItem("oracle-theme", theme); } catch { /* private mode */ } }, [theme]);

  // Sync persona from URL
  useEffect(() => {
    const urlPersona = searchParams.get("persona");
    if (urlPersona === "client" || urlPersona === "creative" || urlPersona === "consultant") setPersona(urlPersona);
  }, [searchParams]);

  function handlePersonaChange(p: PresentationPersona) {
    setPersona(p);
    const params = new URLSearchParams(searchParams.toString());
    params.set("persona", p);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function toggleGroup(t: string) {
    setOpenGroups((prev) => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n; });
  }
  function jump(id: string) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function copyShareLink() {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { /* clipboard indispo */ }
  }

  // Scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { for (const entry of entries) if (entry.isIntersecting) setActiveSection(entry.target.id); },
      { rootMargin: "-20% 0px -60% 0px" }
    );
    for (const section of SECTION_REGISTRY) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [persona]);

  const visibleSections = SECTION_REGISTRY.filter((s) => s.personas.includes(persona));
  const byTier: Record<string, typeof visibleSections> = { CORE: [], BIG4_BASELINE: [], DISTINCTIVE: [] };
  for (const s of visibleSections) (byTier[s.tier ?? "CORE"] ??= []).push(s);
  const tiersShown = TIER_ORDER.filter((t) => (byTier[t]?.length ?? 0) > 0);
  const readMin = Math.max(3, Math.round(visibleSections.length * 1.1));
  const pmeta = PERSONA_META[persona];

  const coverLead = persona === "consultant"
    ? `Score ${doc.meta.vector.composite}/200 · ${doc.meta.classification} · diagnostic ${visibleSections.length} sections`
    : persona === "client"
      ? "La promesse, la valeur et le plan — l'essentiel pour décider, en clair."
      : "Le territoire de marque — plateforme, création et exécution.";

  const pdfHref = shareToken
    ? `/api/export/oracle/shared/${shareToken}/pdf`
    : `/api/export/oracle/${doc.meta.strategyId}/pdf`;

  return (
    <div className="ck-ogen" data-theme={theme} role="main" aria-label="L'Oracle — page générée">
      {/* ── Navbar slim ── */}
      <div className="ck-ogen__bar">
        <div className="ck-ogen__bar-l">
          <span className="ck-ogen__badge"><Brain /></span>
          <div className="ck-ogen__id">
            <span className="ck-ogen__id-k">L&apos;Oracle · proposition stratégique</span>
            <b className="ck-ogen__id-t">{doc.meta.brandName}</b>
          </div>
        </div>
        <div className="ck-ogen__bar-r">
          <button className="ck-ogen__icon" onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} title={theme === "dark" ? "Mode clair" : "Mode sombre"} aria-label="Basculer le thème">
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
          <a className="ck-ogen__act" href={pdfHref} target="_blank" rel="noopener"><FileText /><span>Export PDF</span></a>
          <div className="ck-ogen__sharewrap">
            <button className="ck-ogen__act primary" onClick={() => setShareOpen((o) => !o)}><Share2 /><span>Partager</span></button>
            {shareOpen && (
              <div className="ck-ogen__sharepop" onMouseLeave={() => setShareOpen(false)}>
                <p className="ck-ogen__sharepop-h">Lien public · vue {pmeta.label.toLowerCase()}</p>
                <div className="ck-ogen__sharelink">{typeof window !== "undefined" ? window.location.href : ""}</div>
                <div className="ck-ogen__shareacts">
                  <button onClick={copyShareLink}>{copied ? <><Check />Copié</> : <><Copy />Copier le lien</>}</button>
                  <a href={pdfHref} target="_blank" rel="noopener"><FileText />PDF</a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bande lentille (persona) ── */}
      <div className="ck-ogen__lens">
        <div className="ck-ogen__seg" role="tablist" aria-label="Lentille de lecture">
          {PERSONA_ORDER.map((p) => {
            const Icon = PERSONA_META[p].icon;
            return (
              <button key={p} role="tab" aria-selected={persona === p} data-on={persona === p ? 1 : 0} onClick={() => handlePersonaChange(p)}>
                <Icon /><span>{PERSONA_META[p].label}</span>
              </button>
            );
          })}
        </div>
        <div className="ck-ogen__lensinfo">
          <span className="desc">{pmeta.desc}</span>
          <span className="meta"><BookOpen />{visibleSections.length} sections · ~{readMin} min</span>
        </div>
      </div>

      <div className="ck-ogen__body">
        {/* ── TOC groupée par tier ── */}
        <nav className="ck-ogen__toc">
          {tiersShown.map((t) => {
            const open = openGroups.has(t); const tm = TIER_META[t]!;
            return (
              <div className="ck-ogen__toc-grp" key={t} data-open={open ? 1 : 0}>
                <button className="ck-ogen__toc-h" onClick={() => toggleGroup(t)}>
                  <ChevronRight className="chev" />
                  <span className="lbl" data-t={t}>{tm.chip}</span>
                  <span className="ttl">{tm.nav}</span>
                  <span className="cnt">{byTier[t]!.length}</span>
                </button>
                {open && byTier[t]!.map((s) => (
                  <button key={s.id} className="ck-ogen__toc-i" data-on={activeSection === s.id ? 1 : 0} onClick={() => jump(s.id)}>
                    <span className="n">{s.number}</span><span className="t">{s.title}</span>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* ── Contenu ── */}
        <div className="ck-ogen__scroll">
          <div className="ck-ogen__inner">
            <header className="ck-ogen__cover">
              <p className="ck-ogen__cover-eyebrow">{pmeta.eyebrow}</p>
              <h1 className="ck-ogen__cover-h">{doc.meta.brandName}</h1>
              <p className="ck-ogen__cover-lead">{coverLead}</p>
              <p className="ck-ogen__cover-meta">
                {doc.meta.operatorName ? `par ${doc.meta.operatorName} · ` : ""}généré le {new Date(doc.meta.generatedAt).toLocaleDateString("fr-FR")}
              </p>
            </header>

            <div className="ck-ogen__sections">
              {tiersShown.map((t) => {
                const tm = TIER_META[t]!; const ChIcon = tm.icon;
                return (
                  <div key={t} style={{ display: "contents" }}>
                    <div className="ck-ogen__chap">
                      <span className="ck-ogen__chap-rn">{tm.rn}</span>
                      <span className="ck-ogen__chap-medal"><ChIcon /></span>
                      <div className="ck-ogen__chap-tt">
                        <span className="ck-ogen__chap-k" data-t={t}>{tm.chip} · {byTier[t]!.length} sections</span>
                        <h2 className="ck-ogen__chap-h">{tm.title}</h2>
                        <p className="ck-ogen__chap-d">{tm.desc}</p>
                      </div>
                    </div>
                    {byTier[t]!.map((section) => {
                      const Component = SECTION_COMPONENTS[section.id];
                      const dataKey = SECTION_DATA_MAP[section.id];
                      if (!Component || !dataKey) return null;
                      const sectionData = doc.sections[dataKey as keyof typeof doc.sections];
                      return (
                        <section className="ck-ogen__sec" id={section.id} key={section.id}>
                          <div className="ck-ogen__sec-head">
                            <span className="ck-ogen__sec-n">{section.number}</span>
                            <div className="ck-ogen__sec-tt">
                              <h2 className="ck-ogen__sec-t">{section.title}</h2>
                              <div className="ck-ogen__sec-rule" />
                            </div>
                          </div>
                          <div className="ck-ogen__sec-body">
                            <Component data={sectionData ?? {}} strategyId={doc.meta.strategyId} />
                          </div>
                        </section>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <footer className="ck-ogen__foot">
              <p>Document confidentiel — usage interne client uniquement.</p>
              <p>Généré par La Fusée — Industry OS · méthode ADVE-RTIS.</p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

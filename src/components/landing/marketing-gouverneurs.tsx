"use client";

import { useState } from "react";

/**
 * Substitution INFRASTRUCTURE → Ptah (cohérent BRAINS const, ADR-0013).
 * **7 Neteru actifs** depuis Phase 14/15 (cap APOGEE atteint) :
 * Mestor / Artemis / Seshat / Thot / Ptah / Imhotep (ADR-0019) / Anubis (ADR-0020).
 */
const GOVS = {
  mestor: {
    sigil: "MESTOR",
    role: "Cerveau de la décision",
    law: { k: "LOI 01", t: "Chaque mutation traverse Mestor — sans exception." },
    desc: "Point d'entrée unique pour toute mutation métier. Mestor analyse, tranche, recommande. Chaque diagnostic, chaque arbitrage, chaque plan d'action passe par lui — et reste hash-chaîné à vie.",
    caps: ["emitIntent — point d'écriture", "Recommandations Notoria", "RTIS cascade", "Arbitrage de priorités", "Plan d'orchestration", "Insights cross-pilier"],
  },
  artemis: {
    sigil: "ARTEMIS",
    role: "Cerveau de l'exécution",
    law: { k: "LOI 02", t: "Artemis ne décide pas. Elle exécute." },
    desc: "Orchestratrice de la production. 56 outils GLORY, 57 séquences, 24 frameworks diagnostiques. Elle transforme la stratégie en livrables — et orchestre l'Oracle (35 sections, 4 tiers — ADR-0014).",
    caps: ["56 outils GLORY", "57 séquences créatives", "24 frameworks", "Oracle 35 sections", "Campaign manager", "Pipeline orchestrator"],
  },
  seshat: {
    sigil: "SESHAT",
    role: "Cerveau de l'observation",
    law: { k: "LOI 03", t: "Seshat n'écrit jamais. Elle observe — et nourrit la décision." },
    desc: "La connaissance. Surveille le marché, interprète les signaux faibles, anticipe les tendances. Sa source : le curateur Tarsis. Son organe de presse : Jehuty.",
    caps: ["Tarsis weak signals", "Cult-index engine", "Devotion engine", "Knowledge graph", "Cross-brand ranker", "Jehuty intelligence feed"],
  },
  thot: {
    sigil: "THOT",
    role: "Cerveau financier",
    law: { k: "LOI 04", t: "Pas de combustion sans propellant." },
    desc: "Le verrou financier. Veto, downgrade, record cost. Aucune mission ne décolle si Thot ne valide pas le budget. 40+ règles de validation, benchmarks sectoriels intégrés.",
    caps: ["Cost-gate (Pillar 6)", "40+ règles validation", "Benchmarks secteur", "Commission engine", "Mobile money", "Reconciliation"],
  },
  ptah: {
    sigil: "PTAH",
    role: "Cerveau de la matérialisation",
    law: { k: "LOI 05", t: "Aucun brief n'existe tant qu'il n'est pas matérialisé." },
    desc: "Le forgeron multimodal. Transforme les briefs Artemis en assets concrets via providers externes (Magnific, Adobe Firefly, Figma, Canva). Cascade Glory→Brief→Forge — Ptah ferme la boucle.",
    caps: ["Magnific upscaler", "Adobe Firefly gen", "Figma export", "Canva templates", "AssetVersion lineage", "Hash-chain provenance"],
  },
  imhotep: {
    sigil: "IMHOTEP",
    role: "Cerveau de l'équipage",
    law: { k: "LOI 06", t: "Pas de mission sans crew apparié au talent juste." },
    desc: "Le sage architecte. Apparie talents et missions, compose les équipes, évalue les tiers, recommande la formation Académie, route les reviews QC. Orchestrateur unifié sur matching-engine, talent-engine, team-allocator, tier-evaluator, qc-router. Activation Phase 14 (ADR-0019).",
    caps: ["Matching talent ↔ mission", "Crew composition", "Tier evaluator (PROMOTE/HOLD/DEMOTE)", "Formation Académie", "TalentCertification", "QC routing"],
  },
  anubis: {
    sigil: "ANUBIS",
    role: "Cerveau de la diffusion",
    law: { k: "LOI 07", t: "Aucun message n'atteint l'audience sans audit du carburant et du segment." },
    desc: "Le psychopompe — guide les messages entre les ponts (Console / Cockpit / Agency / Creator) et vers le monde extérieur (ad networks, email/SMS). Orchestre broadcast multi-canal, achat d'inventaire ads (Meta/Google/X/TikTok), email/SMS (Mailgun/Twilio), notification center, Credentials Vault back-office. Provider façades feature-flagged : code ship-able sans clés API. Activation Phase 15 (ADR-0020 + Credentials Vault ADR-0021).",
    caps: ["Broadcast multi-canal", "Meta/Google/X/TikTok ads", "Mailgun + Twilio", "Notification Center", "Credentials Vault back-office", "cost_per_superfan_recruited"],
  },
} as const;

type GovKey = keyof typeof GOVS;

export function MarketingGouverneurs() {
  const [tab, setTab] = useState<GovKey>("mestor");
  const g = GOVS[tab];
  const order: GovKey[] = ["mestor", "artemis", "seshat", "thot", "ptah", "imhotep", "anubis"];

  return (
    <section id="gouverneurs" className="py-24 md:py-32">
      <div className="mx-auto max-w-[var(--maxw-content)] px-[var(--pad-page)]">
        <div className="flex items-baseline gap-3.5 mb-8 font-mono text-[11px] uppercase tracking-widest text-foreground-muted">
          <span className="w-8 h-px bg-accent" />
          05 · Gouverneurs
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-12 mb-16 items-end">
          <h2 className="font-display font-semibold tracking-tight" style={{ fontSize: "var(--text-display)", lineHeight: 0.96 }}>
            Sept cerveaux. <span className="font-serif italic font-medium">Un seul</span> opérateur.
          </h2>
          <p className="text-foreground-secondary text-pretty text-base md:text-lg max-w-[60ch]">
            L&rsquo;OS est gouverné par sept autorités spécialisées (cap APOGEE atteint, 7/7). Mestor décide, Artemis brieffe, Ptah forge, Seshat observe, Thot facture, Imhotep équipe, Anubis diffuse. L&rsquo;humain supervise, ne produit plus.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] border border-border">
          <nav className="flex md:flex-col border-b md:border-b-0 md:border-r border-border" role="tablist">
            {order.map((key, i) => {
              const isActive = key === tab;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(key)}
                  className={`grid grid-cols-[36px_1fr] items-center gap-3 px-5 py-4 text-left border-b border-border transition-colors ${
                    isActive ? "bg-accent/8" : "hover:bg-surface-elevated"
                  }`}
                >
                  <span className={`font-mono text-sm ${isActive ? "text-accent" : "text-foreground-muted"}`}>0{i + 1}</span>
                  <div className="min-w-0">
                    <div className={`text-sm font-semibold tracking-wide ${isActive ? "text-accent" : "text-foreground"}`}>{GOVS[key].sigil}</div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-foreground-muted">{GOVS[key].role.split(" ").slice(-2).join(" ")}</div>
                  </div>
                </button>
              );
            })}
          </nav>
          <div role="tabpanel" className="p-8 md:p-12 flex flex-col gap-6 min-h-[460px]">
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="font-display font-semibold tracking-tight text-5xl md:text-6xl">{g.sigil}<span className="text-accent">.</span></span>
              <span className="font-mono text-xs uppercase tracking-widest text-foreground-muted">{g.role}</span>
            </div>
            <div className="p-4 border-l-2 border-accent bg-accent-subtle font-serif italic text-base md:text-lg leading-relaxed">
              <span className="block font-mono not-italic text-[10px] uppercase tracking-widest text-accent mb-1">{g.law.k}</span>
              {g.law.t}
            </div>
            <p className="text-foreground-secondary leading-relaxed max-w-[60ch]">{g.desc}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-3 border-t border-dashed border-border">
              {g.caps.map((c) => (
                <div key={c} className="px-3 py-2.5 border border-border font-mono text-[11px] text-foreground-secondary flex items-center gap-2">
                  <span aria-hidden="true" className="w-1 h-1 bg-accent shrink-0" />
                  <span className="truncate">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

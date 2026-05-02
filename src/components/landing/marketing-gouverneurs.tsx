"use client";

import { useState } from "react";

/**
 * Sept gouverneurs · un seul opérateur.
 *
 * Doctrine wording (NEFER signature) :
 * - **Fonction d'abord, nom ensuite** — la fonction (ex: "Décision") est l'entrée
 *   visuelle dominante ; le nom du Neter (ex: "Mestor") est un accent typographique
 *   discret. La copy doit rester accessible : on parle de ce que ça fait, pas de
 *   la mythologie.
 * - **Religion cosmétique** — les références mythologiques (psychopompe, démiurge,
 *   sage architecte, guide entre mondes) sont retirées du body copy. Elles
 *   restent uniquement dans l'aesthetic des noms (Mestor / Artemis / Seshat /
 *   Thot / Ptah / Imhotep / Anubis) qui font la signature visuelle de l'OS.
 *
 * Cap APOGEE atteint 7/7 depuis Phase 14/15 (ADRs 0019/0020).
 */
const GOVS = {
  mestor: {
    func: "Décision",
    tag: "Mestor",
    role: "Coeur stratégique de l'OS",
    rule: { k: "RÈGLE 01", t: "Chaque mutation traverse un point unique — aucune exception." },
    desc: "Le décideur. Point d'entrée pour toute action métier. Analyse le contexte, tranche les arbitrages, recommande la priorité. Chaque diagnostic, chaque plan, chaque décision passe par lui — et reste auditable à vie.",
    caps: ["Point d'écriture unique", "Recommandations Notoria", "Cascade ADVERTIS", "Arbitrage de priorités", "Plan d'orchestration", "Insights cross-pilier"],
  },
  artemis: {
    func: "Production",
    tag: "Artemis",
    role: "Exécution créative",
    rule: { k: "RÈGLE 02", t: "Le producteur ne décide pas. Il exécute." },
    desc: "Le producteur créatif. 56 outils, 57 séquences, 24 frameworks diagnostiques. Transforme la stratégie en livrables — et pilote l'Oracle, ton document conseil dynamique de 35 sections qui se met à jour seul quand le marché bouge.",
    caps: ["56 outils créatifs", "57 séquences orchestrées", "24 frameworks", "Oracle dynamique 35 sections", "Campaign manager", "Pipeline orchestrator"],
  },
  seshat: {
    func: "Observation",
    tag: "Seshat",
    role: "Capteur de marché",
    rule: { k: "RÈGLE 03", t: "L'observateur n'écrit jamais. Il observe — et nourrit la décision." },
    desc: "Le capteur. Surveille le marché en continu, interprète les signaux faibles avant qu'ils ne deviennent évidents, anticipe les tendances sectorielles. Ses sources internes : Tarsis (curation données) et Jehuty (intelligence feed).",
    caps: ["Tarsis · weak signals", "Cult-index (mesure de fan)", "Devotion engine", "Knowledge graph sectoriel", "Cross-brand benchmark", "Jehuty · intelligence feed"],
  },
  thot: {
    func: "Finances",
    tag: "Thot",
    role: "Verrou budgétaire",
    rule: { k: "RÈGLE 04", t: "Pas de combustion sans propellant." },
    desc: "Le verrou financier. Veto, downgrade, validation budget. Aucune mission ne décolle sans son OK. 40+ règles de validation, benchmarks sectoriels intégrés, mobile money pour les paiements ouest-africains.",
    caps: ["Cost-gate (Pillar 6)", "40+ règles validation", "Benchmarks secteur", "Commission engine", "Mobile money", "Reconciliation automatique"],
  },
  ptah: {
    func: "Forge",
    tag: "Ptah",
    role: "Matérialisation des assets",
    rule: { k: "RÈGLE 05", t: "Aucun brief n'existe tant qu'il n'est pas matérialisé." },
    desc: "Le forgeron multimodal. Transforme les briefs en assets concrets via providers externes : images (Magnific), vidéos (Adobe Firefly), design layered (Figma), templates (Canva). Cascade Glory→Brief→Forge — Ptah ferme la boucle production.",
    caps: ["Magnific · upscaler", "Adobe Firefly", "Figma export", "Canva templates", "AssetVersion lineage", "Provenance auditable"],
  },
  imhotep: {
    func: "Équipage",
    tag: "Imhotep",
    role: "Matching talent + formation",
    rule: { k: "RÈGLE 06", t: "Pas de mission sans crew apparié au talent juste." },
    desc: "Le matcheur d'équipage. Apparie talents et missions sans prospection humaine, compose les équipes selon le brief, évalue les progressions de tier sur les livraisons réelles, recommande la formation Académie pour combler les gaps avant qu'ils ne coûtent.",
    caps: ["Matching talent ↔ mission", "Composition d'équipe", "Évaluation tier objective", "Formation Académie", "Certifications portables", "QC routing intelligent"],
  },
  anubis: {
    func: "Diffusion",
    tag: "Anubis",
    role: "Hub de diffusion",
    rule: { k: "RÈGLE 07", t: "Aucun message n'atteint l'audience sans audit budget et segment." },
    desc: "Le hub broadcast. Orchestre la diffusion multi-canal, l'achat d'inventaire ads (Meta / Google / X / TikTok), l'email transactionnel (Mailgun), le SMS (Twilio), et un notification center persistant. Les API keys de tous tes clients vivent dans un Credentials Vault sécurisé back-office.",
    caps: ["Broadcast multi-canal", "Ad networks (4 régies)", "Mailgun + Twilio", "Notification Center", "Credentials Vault", "cost_per_superfan tracking"],
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
            L&rsquo;OS est gouverné par sept fonctions spécialisées : décision, production, observation, finances, forge, équipage, diffusion. L&rsquo;humain supervise. Il ne produit plus.
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
                    <div className={`text-sm font-semibold tracking-wide ${isActive ? "text-accent" : "text-foreground"}`}>{GOVS[key].func}</div>
                    <div className="text-[11px] font-mono uppercase tracking-wider text-foreground-muted">{GOVS[key].tag}</div>
                  </div>
                </button>
              );
            })}
          </nav>
          <div role="tabpanel" className="p-8 md:p-12 flex flex-col gap-6 min-h-[460px]">
            <div className="flex items-baseline gap-4 flex-wrap">
              <span className="font-display font-semibold tracking-tight text-5xl md:text-6xl">{g.func}<span className="text-accent">.</span></span>
              <span className="font-mono text-xs uppercase tracking-widest text-foreground-muted">{g.tag} · {g.role}</span>
            </div>
            <div className="p-4 border-l-2 border-accent bg-accent-subtle font-serif italic text-base md:text-lg leading-relaxed">
              <span className="block font-mono not-italic text-[10px] uppercase tracking-widest text-accent mb-1">{g.rule.k}</span>
              {g.rule.t}
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

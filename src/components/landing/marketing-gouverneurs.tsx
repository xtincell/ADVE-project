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
    rule: { k: "RÈGLE 01", t: "Une proposition attend votre décision avant de changer la marque." },
    desc: "Le point de décision. Rassemble le contexte, les diagnostics et les propositions pour vous aider à choisir la suite. Vous pouvez travailler à la main ou demander une aide IA ; les décisions conservées restent consultables dans le dossier.",
    caps: ["Contexte de marque", "Propositions à examiner", "Fondations et stratégie", "Arbitrage de priorités", "Plan de travail", "Historique des décisions"],
  },
  artemis: {
    func: "Production",
    tag: "Artemis",
    role: "Exécution créative",
    rule: { k: "RÈGLE 02", t: "Le producteur ne décide pas. Il exécute." },
    desc: "Le producteur créatif. Relie la stratégie aux outils et aux parcours de création. Vous préparez vos livrables, conservez les versions et examinez le résultat. Les analyses et générations assistées se demandent selon les services disponibles ; le document conseil peut être révisé au fil des décisions.",
    caps: ["Outils créatifs", "Parcours de production", "Cadres de diagnostic", "Document conseil", "Campagnes", "Versions des livrables"],
  },
  seshat: {
    func: "Observation",
    tag: "Seshat",
    role: "Capteur de marché",
    rule: { k: "RÈGLE 03", t: "Une observation éclaire la décision ; elle ne la remplace pas." },
    desc: "Le capteur de marché. Rassemble les observations disponibles et présente les variations constatées. Vous choisissez les sources et les collectes à activer. Une observation peut conduire à une proposition, que vous examinez avant de l'appliquer.",
    caps: ["Observations de marché", "Sources consultables", "Variations constatées", "Contexte sectoriel", "Comparaisons de marques", "Fil de veille"],
  },
  thot: {
    func: "Finances",
    tag: "Thot",
    role: "Verrou budgétaire",
    rule: { k: "RÈGLE 04", t: "Un coût prévu doit rester distinct d'une dépense constatée." },
    desc: "Le repère financier. Aide à préparer un budget et à examiner les coûts d'une opération. Les estimations servent à arbitrer ; les dépenses et paiements nécessitent leurs propres pièces et les services configurés pour votre entreprise.",
    caps: ["Budget d'opération", "Estimations de coût", "Dépenses constatées", "Arbitrages budgétaires", "Pièces de paiement", "Suivi économique"],
  },
  ptah: {
    func: "Forge",
    tag: "Ptah",
    role: "Matérialisation des assets",
    rule: { k: "RÈGLE 05", t: "Un résultat produit attend encore votre revue." },
    desc: "L'atelier de fabrication. Relie le brief à un résultat visuel, sonore ou vidéo et conserve sa provenance. Vous pouvez apporter vos fichiers ou demander une génération à un service configuré, puis examiner les versions avant de retenir un actif.",
    caps: ["Brief de fabrication", "Fichiers apportés", "Génération sur demande", "Versions des actifs", "Revue du résultat", "Provenance consultable"],
  },
  imhotep: {
    func: "Équipage",
    tag: "Imhotep",
    role: "Matching talent + formation",
    rule: { k: "RÈGLE 06", t: "Une mission a besoin d'un responsable et d'attentes claires." },
    desc: "Le repère d'équipe. Rapproche les besoins d'une mission et les profils disponibles pour préparer une affectation. Vous gardez la main sur l'équipe, les attentes de qualité et les besoins de formation ; une proposition d'affectation reste à confirmer.",
    caps: ["Profils et compétences", "Besoins de mission", "Affectations", "Composition d'équipe", "Formation", "Attentes de qualité"],
  },
  anubis: {
    func: "Diffusion",
    tag: "Anubis",
    role: "Hub de diffusion",
    rule: { k: "RÈGLE 07", t: "Préparer une diffusion ne signifie pas l'avoir publiée." },
    desc: "Le point de diffusion. Prépare les canaux, audiences et contenus d'une opération. L'envoi dépend des connexions et autorisations propres à votre entreprise ; son résultat doit être reçu avant de compter la diffusion comme réalisée.",
    caps: ["Plan de diffusion", "Canaux configurés", "Audiences", "Contenus à publier", "Notifications", "Résultats de diffusion"],
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
        <div className="flex items-baseline gap-3.5 mb-8 font-mono text-2xs uppercase tracking-widest text-foreground-muted">
          <span className="w-8 h-px bg-accent" />
          05 · Gouverneurs
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-12 mb-16 items-end">
          <h2 className="font-display font-semibold tracking-tight" style={{ fontSize: "var(--text-display)", lineHeight: 0.96 }}>
            Sept cerveaux. <span className="font-serif italic font-medium">Un seul</span> opérateur.
          </h2>
          <p className="text-foreground-secondary text-pretty text-base md:text-lg max-w-[60ch]">
            Sept fonctions spécialisées relient décision, production, observation, finances, forge, équipage et diffusion. Vous gardez la main sur le travail ; l&rsquo;aide IA reste un choix.
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
                    <div className="text-2xs font-mono uppercase tracking-wider text-foreground-muted">{GOVS[key].tag}</div>
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
              <span className="block font-mono not-italic text-2xs uppercase tracking-widest text-accent mb-1">{g.rule.k}</span>
              {g.rule.t}
            </div>
            <p className="text-foreground-secondary leading-relaxed max-w-[60ch]">{g.desc}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-3 border-t border-dashed border-border">
              {g.caps.map((c) => (
                <div key={c} className="px-3 py-2.5 border border-border font-mono text-2xs text-foreground-secondary flex items-center gap-2">
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

"use client";

import { useState } from "react";
import { SectionWrapper } from "./shared/section-wrapper";
import { GlowButton } from "./shared/glow-button";
import {
  BarChart3, Briefcase, Palette, Settings,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PERSONAS = [
  {
    id: "marque",
    label: "Je suis une Marque",
    icon: BarChart3,
    portal: "Cockpit",
    color: "text-violet-400",
    border: "border-violet-500/30",
    bg: "bg-violet-500/10",
    href: "/cockpit",
    benefits: [
      "Score ADVE /200 avec radar 8 piliers en temps reel",
      "Dashboard marque : forces, vulnerabilites, historique",
      "Livrables strategiques generes par AI (brandbook, plan media, KV...)",
      "Visibilite totale sur votre budget et les missions en cours",
    ],
  },
  {
    id: "agence",
    label: "Je suis une Agence",
    icon: Briefcase,
    portal: "Agency",
    color: "text-amber-400",
    border: "border-amber-500/30",
    bg: "bg-amber-500/10",
    href: "/agency",
    benefits: [
      "Gerez tous vos clients depuis un seul dashboard",
      "Campagnes structurees avec state machine et gates de qualite",
      "Commissions et revenus traces automatiquement",
      "Acces aux outils GLORY pour augmenter votre production",
    ],
  },
  {
    id: "creator",
    label: "Je suis un Createur",
    icon: Palette,
    portal: "Creator",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/10",
    href: "/creator",
    benefits: [
      "Missions disponibles matchees avec votre profil et vos skills",
      "Progression APPRENTI → COMPAGNON → MAITRE → ASSOCIE",
      "QC integre et paiement automatique a la livraison",
      "Portfolio et reputation construits dans le systeme",
    ],
  },
  {
    id: "admin",
    label: "Je suis Operateur",
    icon: Settings,
    portal: "Console",
    color: "text-sky-400",
    border: "border-sky-500/30",
    bg: "bg-sky-500/10",
    href: "/console",
    benefits: [
      "Vue ecosysteme complete : clients, talents, campagnes, revenus",
      "Pilotez le trio NETERU et supervisez chaque recommandation AI",
      "9 divisions operationnelles, 60+ pages de pilotage",
      "Audit trail immutable sur chaque decision et chaque franc depense",
    ],
  },
];

export function PortalsSection() {
  const [active, setActive] = useState(0);
  const selected = PERSONAS[active];

  return (
    <SectionWrapper className="border-t border-border-subtle">
      <div className="text-center">
        <p
          data-reveal="fade-in"
          className="mb-4 text-sm font-medium uppercase tracking-widest text-foreground-muted"
        >
          Votre espace
        </p>
        <h2
          data-reveal="slide-up"
          data-reveal-delay="100"
          className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
        >
          Un portail adapte a{" "}
          <span className="text-gradient-star">votre role</span>
        </h2>
        <p
          data-reveal="slide-up"
          data-reveal-delay="200"
          className="mx-auto mb-16 max-w-2xl text-lg text-foreground-secondary"
        >
          Chaque acteur de l&apos;ecosysteme accede a son espace dedie.
          Trouvez le votre.
        </p>
      </div>

      {/* Persona tabs */}
      <div
        data-reveal="scale-in"
        data-reveal-delay="300"
        className="mx-auto mb-12 grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {PERSONAS.map((persona, i) => (
          <button
            key={persona.id}
            onClick={() => setActive(i)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl px-4 py-4 text-xs font-medium transition-all duration-300",
              active === i
                ? `${persona.bg} ${persona.border} border ${persona.color}`
                : "border border-transparent text-foreground-muted hover:text-foreground hover:bg-white/[0.03]",
            )}
          >
            <persona.icon className="h-5 w-5" />
            <span className="text-center leading-tight">{persona.label}</span>
          </button>
        ))}
      </div>

      {/* Selected portal detail */}
      <div
        data-reveal="fade-in"
        data-reveal-delay="400"
        className={cn(
          "mx-auto max-w-2xl rounded-2xl border p-8 sm:p-10 transition-all duration-500",
          selected.border,
          selected.bg,
        )}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className={cn(
            "inline-flex rounded-lg px-3 py-1.5 text-sm font-bold",
            selected.bg,
            selected.color,
          )}>
            {selected.portal}
          </div>
          <span className="text-sm text-foreground-secondary">{selected.label}</span>
        </div>

        <ul className="mb-8 space-y-3">
          {selected.benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-3">
              <Check className={cn("mt-0.5 h-4 w-4 shrink-0", selected.color)} />
              <span className="text-sm text-foreground-secondary">{benefit}</span>
            </li>
          ))}
        </ul>

        <GlowButton href={selected.href} variant="ghost" size="sm">
          Acceder au {selected.portal}
        </GlowButton>
      </div>
    </SectionWrapper>
  );
}

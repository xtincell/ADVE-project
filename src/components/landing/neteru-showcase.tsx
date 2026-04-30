"use client";

import { useState } from "react";
import { SectionWrapper } from "./shared/section-wrapper";
import { Brain, Sparkles, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const NETERU = [
  {
    id: "mestor",
    name: "MESTOR",
    role: "Le Decideur",
    subtitle: "Neter de la Decision",
    description:
      "Le cerveau strategique de La Fusee. Il analyse, tranche et recommande. Chaque diagnostic, chaque arbitrage, chaque plan d'action passe par lui.",
    capabilities: ["Recommandations strategiques", "Arbitrage de priorites", "Plan d'orchestration"],
    icon: Brain,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    glow: "shadow-[0_0_30px_oklch(0.55_0.25_265_/_0.15)]",
  },
  {
    id: "artemis",
    name: "ARTEMIS",
    role: "L'Executrice",
    subtitle: "Neter du Protocole",
    description:
      "L'orchestratrice de la production. 91 outils GLORY, 31 sequences, 24 frameworks diagnostiques. Elle transforme la strategie en livrables concrets.",
    capabilities: ["91 outils GLORY", "31 sequences creatives", "24 frameworks diagnostiques"],
    icon: Sparkles,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    glow: "shadow-[0_0_30px_oklch(0.65_0.20_145_/_0.15)]",
  },
  {
    id: "seshat",
    name: "SESHAT",
    role: "L'Observatrice",
    subtitle: "Neter de l'Observation",
    description:
      "Le cerveau de la connaissance. Elle surveille le marche, interprete les signaux faibles et anticipe les tendances. Sa source : le curateur TARSIS.",
    capabilities: ["Intelligence marche", "Signaux faibles", "Benchmarks sectoriels"],
    icon: Eye,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    glow: "shadow-[0_0_30px_oklch(0.60_0.20_240_/_0.15)]",
  },
];

export function NeteruShowcase() {
  const [active, setActive] = useState(0);
  const selected = NETERU[active]!;

  return (
    <SectionWrapper id="neteru" className="border-t border-border-subtle">
      <div className="text-center">
        <p
          data-reveal="fade-in"
          className="mb-4 text-sm font-medium uppercase tracking-widest text-foreground-muted"
        >
          L&apos;intelligence
        </p>
        <h2
          data-reveal="slide-up"
          data-reveal-delay="100"
          className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
        >
          NETERU — <span className="text-gradient-star">Le Pantheon</span>
        </h2>
        <p
          data-reveal="slide-up"
          data-reveal-delay="200"
          className="mx-auto mb-16 max-w-2xl text-lg text-foreground-secondary"
        >
          Cinq intelligences specialisees + deux pre-reservees. Decideur, producteur de briefs,
          observatrice, gestionnaire de carburant, forgeron. Plafond 7. Elles travaillent en
          cascade pour transformer votre marque en icone culturelle.
        </p>
      </div>

      {/* Tab selector */}
      <div
        data-reveal="scale-in"
        data-reveal-delay="300"
        className="mx-auto mb-12 flex max-w-lg justify-center gap-2 rounded-2xl border border-white/5 bg-white/[0.02] p-2"
      >
        {NETERU.map((neter, i) => (
          <button
            key={neter.id}
            onClick={() => setActive(i)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300",
              active === i
                ? `${neter.bg} ${neter.border} border ${neter.color}`
                : "text-foreground-muted hover:text-foreground hover:bg-white/[0.03]",
            )}
          >
            <neter.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{neter.name}</span>
          </button>
        ))}
      </div>

      {/* Active NETER detail */}
      <div
        data-reveal="fade-in"
        data-reveal-delay="400"
        className={cn(
          "mx-auto max-w-3xl rounded-2xl border p-8 sm:p-12 transition-all duration-500",
          selected.border,
          selected.bg,
          selected.glow,
        )}
      >
        <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start sm:gap-8">
          {/* Icon */}
          <div className={cn(
            "mb-6 flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border sm:mb-0",
            selected.border,
            "bg-white/[0.03]",
          )}>
            <selected.icon className={cn("h-10 w-10", selected.color)} />
          </div>

          <div>
            {/* Header */}
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-foreground">{selected.name}</h3>
              <p className={cn("text-sm font-medium", selected.color)}>{selected.role} — {selected.subtitle}</p>
            </div>

            {/* Description */}
            <p className="mb-6 text-base leading-relaxed text-foreground-secondary">
              {selected.description}
            </p>

            {/* Capabilities */}
            <div className="flex flex-wrap gap-2">
              {selected.capabilities.map((cap) => (
                <span
                  key={cap}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium",
                    selected.border,
                    selected.color,
                    "bg-white/[0.02]",
                  )}
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}

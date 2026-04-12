"use client";

import { SectionWrapper } from "./shared/section-wrapper";
import { AlertTriangle, TrendingDown, Shuffle } from "lucide-react";

const PAIN_POINTS = [
  {
    icon: TrendingDown,
    title: "Des budgets dilapides sans mesure",
    description:
      "Vos campagnes partent sans KPI, sans scoring, sans retour. Vous depensez mais ne savez pas ce qui fonctionne.",
    color: "text-red-400",
    bg: "bg-red-400/5",
    border: "border-red-400/10",
  },
  {
    icon: Shuffle,
    title: "Une marque incoherente",
    description:
      "Chaque prestataire interprete votre identite a sa maniere. Aucun document de reference, aucune methode partagee.",
    color: "text-amber-400",
    bg: "bg-amber-400/5",
    border: "border-amber-400/10",
  },
  {
    icon: AlertTriangle,
    title: "Aucun systeme de pilotage",
    description:
      "Pas de score, pas de radar, pas de diagnostic. Vous pilotez votre marque a l'instinct — et l'instinct ne scale pas.",
    color: "text-violet-400",
    bg: "bg-violet-400/5",
    border: "border-violet-400/10",
  },
];

export function ProblemSection() {
  return (
    <SectionWrapper className="border-t border-border-subtle">
      <div className="text-center">
        <p
          data-reveal="fade-in"
          className="mb-4 text-sm font-medium uppercase tracking-widest text-foreground-muted"
        >
          Le constat
        </p>
        <h2
          data-reveal="slide-up"
          data-reveal-delay="100"
          className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
        >
          Votre marque merite mieux
          <br className="hidden sm:block" />
          <span className="text-foreground-secondary">qu&apos;une strategie improvisee</span>
        </h2>
        <p
          data-reveal="slide-up"
          data-reveal-delay="200"
          className="mx-auto mb-16 max-w-2xl text-lg text-foreground-secondary"
        >
          Le marche creatif africain deborde de talent. Ce qui manque,
          c&apos;est un systeme. Un cadre. Une methode.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {PAIN_POINTS.map((point, i) => (
          <div
            key={point.title}
            data-reveal="slide-up"
            data-reveal-delay={String(300 + i * 120)}
            className={`rounded-2xl border ${point.border} ${point.bg} p-8 transition-all duration-300 hover:border-white/10`}
          >
            <point.icon className={`mb-4 h-6 w-6 ${point.color}`} />
            <h3 className="mb-2 text-lg font-semibold text-foreground">{point.title}</h3>
            <p className="text-sm leading-relaxed text-foreground-secondary">{point.description}</p>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

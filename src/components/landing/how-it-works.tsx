"use client";

import { SectionWrapper } from "./shared/section-wrapper";
import { GlowButton } from "./shared/glow-button";
import { Upload, Brain, Rocket, ArrowRight } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Upload,
    title: "Uploadez votre brief",
    description:
      "Un PDF, un deck, ou un simple formulaire. Le systeme extrait tout : marque, objectifs, cibles, budget.",
    color: "text-violet-400",
    gradient: "from-violet-500/20 to-violet-500/0",
  },
  {
    number: "02",
    icon: Brain,
    title: "48h d'analyse AI",
    description:
      "Le trio NETERU diagnostique votre marque sur 8 piliers. Score /200, classification, forces et vulnerabilites.",
    color: "text-emerald-400",
    gradient: "from-emerald-500/20 to-emerald-500/0",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Strategie + Equipe",
    description:
      "Strategie ecrite, missions creees, talents matche. Votre marque passe de diagnostic a execution.",
    color: "text-amber-400",
    gradient: "from-amber-500/20 to-amber-500/0",
  },
];

export function HowItWorks() {
  return (
    <SectionWrapper id="methode" className="border-t border-border-subtle">
      <div className="text-center">
        <p
          data-reveal="fade-in"
          className="mb-4 text-sm font-medium uppercase tracking-widest text-foreground-muted"
        >
          Le protocole
        </p>
        <h2
          data-reveal="slide-up"
          data-reveal-delay="100"
          className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
        >
          Du brief a l&apos;execution.{" "}
          <span className="text-gradient-star">En 48h.</span>
        </h2>
        <p
          data-reveal="slide-up"
          data-reveal-delay="200"
          className="mx-auto mb-16 max-w-2xl text-lg text-foreground-secondary"
        >
          Un process industriel, pas un artisanat. Chaque etape est automatisee,
          tracee et supervisee par un operateur humain.
        </p>
      </div>

      {/* Steps */}
      <div className="relative grid gap-8 lg:grid-cols-3">
        {/* Connector lines (desktop only) */}
        <div className="absolute top-16 left-[33%] hidden h-px w-[34%] bg-gradient-to-r from-violet-500/30 via-emerald-500/30 to-amber-500/30 lg:block" aria-hidden />

        {STEPS.map((step, i) => (
          <div
            key={step.number}
            data-reveal="slide-up"
            data-reveal-delay={String(300 + i * 150)}
            className="relative flex flex-col items-center text-center"
          >
            {/* Step circle */}
            <div
              className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b ${step.gradient} border border-white/5`}
            >
              <step.icon className={`h-7 w-7 ${step.color}`} />
            </div>

            {/* Number */}
            <span className="mb-2 text-xs font-bold tracking-widest text-foreground-muted">
              ETAPE {step.number}
            </span>

            <h3 className="mb-3 text-xl font-semibold text-foreground">{step.title}</h3>
            <p className="max-w-xs text-sm leading-relaxed text-foreground-secondary">
              {step.description}
            </p>

            {/* Arrow between steps (mobile) */}
            {i < STEPS.length - 1 && (
              <ArrowRight className="mt-6 h-5 w-5 rotate-90 text-foreground-muted lg:hidden" />
            )}
          </div>
        ))}
      </div>

      {/* Mid-page CTA */}
      <div
        data-reveal="scale-in"
        data-reveal-delay="700"
        className="mt-16 flex justify-center"
      >
        <GlowButton href="/intake" variant="ghost" size="md">
          Commencer le diagnostic
        </GlowButton>
      </div>
    </SectionWrapper>
  );
}

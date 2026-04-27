"use client";

import { SectionWrapper } from "./shared/section-wrapper";
import { GlowButton } from "./shared/glow-button";
import { Check, Zap, Building2, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Diagnostic",
    price: "Gratuit",
    period: "",
    description: "Decourvez votre score ADVE et la classification de votre marque. Sans engagement.",
    icon: Zap,
    cta: "Lancer le diagnostic",
    href: "/intake",
    variant: "ghost" as const,
    highlighted: false,
    features: [
      "Score ADVE /200 sur 8 piliers",
      "Classification (Zombie → Icone)",
      "Radar de marque interactif",
      "Recommandations AI initiales",
      "Export PDF du diagnostic",
    ],
  },
  {
    name: "Pro",
    price: "Sur devis",
    period: "",
    description: "Strategie complete, outils GLORY, missions, equipe de createurs matchee.",
    icon: Rocket,
    cta: "Demander un devis",
    href: "/intake",
    variant: "primary" as const,
    highlighted: true,
    features: [
      "Tout le Diagnostic, plus :",
      "Strategie AI complete (91 outils GLORY)",
      "Campagnes 360 avec state machine",
      "Matching talent automatique",
      "Dashboard Cockpit en temps reel",
      "Operateur dedie",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Pour les groupes multi-marques et les agences avec un volume important.",
    icon: Building2,
    cta: "Nous contacter",
    href: "#",
    variant: "ghost" as const,
    highlighted: false,
    features: [
      "Tout le Pro, plus :",
      "Multi-marques illimite",
      "Console operateur complète",
      "API et integrations custom",
      "SLA garanti",
      "Formation equipe ADVERTIS",
    ],
  },
];

export function PricingSection() {
  return (
    <SectionWrapper id="tarifs" className="border-t border-border-subtle">
      <div className="text-center">
        <p
          data-reveal="fade-in"
          className="mb-4 text-sm font-medium uppercase tracking-widest text-foreground-muted"
        >
          Tarifs
        </p>
        <h2
          data-reveal="slide-up"
          data-reveal-delay="100"
          className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
        >
          Commencez gratuitement.{" "}
          <span className="text-foreground-secondary">Scalez quand vous etes pret.</span>
        </h2>
        <p
          data-reveal="slide-up"
          data-reveal-delay="200"
          className="mx-auto mb-16 max-w-2xl text-lg text-foreground-secondary"
        >
          Le diagnostic ADVE est gratuit et complet. Aucune carte, aucun engagement.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {PLANS.map((plan, i) => (
          <div
            key={plan.name}
            data-reveal="slide-up"
            data-reveal-delay={String(300 + i * 120)}
            className={cn(
              "relative flex flex-col rounded-2xl border p-8 transition-all",
              plan.highlighted
                ? "border-violet-500/30 bg-violet-500/5 shadow-[0_0_40px_oklch(0.55_0.25_265_/_0.08)]"
                : "border-white/5 bg-white/[0.02]",
            )}
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-1 text-xs font-bold text-white">
                Recommande
              </div>
            )}

            <plan.icon className={cn(
              "mb-4 h-6 w-6",
              plan.highlighted ? "text-violet-400" : "text-foreground-muted",
            )} />

            <h3 className="mb-1 text-xl font-bold text-foreground">{plan.name}</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-foreground">{plan.price}</span>
              {plan.period && <span className="text-sm text-foreground-muted">{plan.period}</span>}
            </div>
            <p className="mb-6 text-sm text-foreground-secondary">{plan.description}</p>

            <ul className="mb-8 flex-1 space-y-3">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    plan.highlighted ? "text-violet-400" : "text-foreground-muted",
                  )} />
                  <span className="text-sm text-foreground-secondary">{feature}</span>
                </li>
              ))}
            </ul>

            <GlowButton
              href={plan.href}
              variant={plan.variant}
              size="md"
              icon={false}
              className="w-full justify-center"
            >
              {plan.cta}
            </GlowButton>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

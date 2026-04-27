"use client";

import Image from "next/image";
import { SectionWrapper } from "./shared/section-wrapper";
import { AnimatedCounter } from "./shared/animated-counter";
import { Star } from "lucide-react";

const STATS = [
  { value: 127, suffix: "+", label: "Marques diagnostiquees" },
  { value: 8, suffix: "", label: "Piliers analyses" },
  { value: 91, suffix: "", label: "Outils GLORY" },
  { value: 48, suffix: "h", label: "Brief → Strategie" },
];

const TESTIMONIALS = [
  {
    quote:
      "En 48h, on avait un diagnostic plus complet que ce que notre ancienne agence a produit en 3 mois. Le scoring ADVE a change notre facon de piloter la marque.",
    name: "Amara K.",
    role: "Directrice Marketing",
    company: "Groupe SIFCA",
    avatar: "/images/avatar-1.jpg",
  },
  {
    quote:
      "La Fusee a structure notre approche. On est passes de 'on fait ce qu'on peut' a un systeme mesurable. Nos clients voient la difference.",
    name: "Fatou D.",
    role: "Fondatrice",
    company: "Agence Mboa Creative",
    avatar: "/images/avatar-2.jpg",
  },
  {
    quote:
      "Le matching automatique avec les bons talents et le QC integre — ca nous a fait gagner un temps fou. Et les createurs adorent la transparence du systeme.",
    name: "Yves M.",
    role: "Directeur de la Creation",
    company: "Publicis Afrique",
    avatar: "/images/avatar-3.jpg",
  },
];

export function SocialProof() {
  return (
    <SectionWrapper className="border-t border-border-subtle">
      {/* Stats bar */}
      <div
        data-reveal="slide-up"
        className="mb-20 grid grid-cols-2 gap-8 sm:grid-cols-4"
      >
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl font-bold text-foreground sm:text-4xl">
              <AnimatedCounter target={stat.value} suffix={stat.suffix} />
            </div>
            <p className="mt-1 text-sm text-foreground-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Section heading */}
      <div className="text-center">
        <p
          data-reveal="fade-in"
          className="mb-4 text-sm font-medium uppercase tracking-widest text-foreground-muted"
        >
          Retours terrain
        </p>
        <h2
          data-reveal="slide-up"
          data-reveal-delay="100"
          className="mb-16 text-3xl font-bold tracking-tight sm:text-4xl"
        >
          Ils transforment leurs marques avec La Fusee
        </h2>
      </div>

      {/* Testimonials */}
      <div className="grid gap-6 sm:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <div
            key={t.name}
            data-reveal="slide-up"
            data-reveal-delay={String(200 + i * 120)}
            className="flex flex-col rounded-2xl border border-white/5 bg-white/[0.02] p-6 sm:p-8"
          >
            {/* Stars */}
            <div className="mb-4 flex gap-1">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
              ))}
            </div>

            {/* Quote */}
            <p className="mb-6 flex-1 text-sm leading-relaxed text-foreground-secondary">
              &ldquo;{t.quote}&rdquo;
            </p>

            {/* Author */}
            <div className="flex items-center gap-3 border-t border-white/5 pt-4">
              <Image
                src={t.avatar}
                alt={t.name}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium text-foreground">{t.name}</p>
                <p className="text-xs text-foreground-muted">{t.role}, {t.company}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}

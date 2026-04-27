"use client";

import { SectionWrapper } from "./shared/section-wrapper";
import { GlowButton } from "./shared/glow-button";
import { AdvertisRadar } from "@/components/shared/advertis-radar";

const SAMPLE_SCORES = { a: 18, d: 14, v: 20, e: 11, r: 16, t: 9, i: 12, s: 15 };

const PILLARS = [
  { key: "A", name: "Authenticite", question: "Qui etes-vous vraiment ?", color: "bg-[oklch(0.60_0.22_25)]" },
  { key: "D", name: "Distinction", question: "Pourquoi vous et pas un autre ?", color: "bg-[oklch(0.60_0.22_265)]" },
  { key: "V", name: "Valeur", question: "Que promettez-vous au monde ?", color: "bg-[oklch(0.65_0.20_145)]" },
  { key: "E", name: "Engagement", question: "Comment creer des superfans ?", color: "bg-[oklch(0.65_0.18_340)]" },
  { key: "R", name: "Risque", question: "Quelles sont vos vulnerabilites ?", color: "bg-[oklch(0.70_0.18_80)]" },
  { key: "T", name: "Track", question: "Que dit le marche ?", color: "bg-[oklch(0.60_0.20_240)]" },
  { key: "I", name: "Innovation", question: "Quel potentiel inexploite ?", color: "bg-[oklch(0.55_0.15_200)]" },
  { key: "S", name: "Strategie", question: "Comment aller de A a B ?", color: "bg-[oklch(0.55_0.25_290)]" },
];

const CLASSIFICATIONS = [
  { label: "Zombie", range: "0-50", bg: "bg-zinc-800/50", text: "text-zinc-500" },
  { label: "Fragile", range: "51-80", bg: "bg-zinc-700/40", text: "text-zinc-400" },
  { label: "Ordinaire", range: "81-120", bg: "bg-zinc-600/30", text: "text-zinc-300" },
  { label: "Forte", range: "121-160", bg: "bg-blue-900/30", text: "text-blue-400" },
  { label: "Culte", range: "161-180", bg: "bg-violet-900/30", text: "text-violet-400" },
  { label: "Icone", range: "181-200", bg: "bg-amber-900/30", text: "text-amber-400 font-bold" },
];

export function ScoreShowcase() {
  const totalScore = Object.values(SAMPLE_SCORES).reduce((a, b) => a + b, 0);

  return (
    <SectionWrapper id="score" className="border-t border-border-subtle">
      <div className="text-center">
        <p
          data-reveal="fade-in"
          className="mb-4 text-sm font-medium uppercase tracking-widest text-foreground-muted"
        >
          La methode ADVERTIS
        </p>
        <h2
          data-reveal="slide-up"
          data-reveal-delay="100"
          className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
        >
          8 piliers. Score{" "}
          <span className="text-gradient-star">/200</span>
        </h2>
        <p
          data-reveal="slide-up"
          data-reveal-delay="200"
          className="mx-auto mb-16 max-w-2xl text-lg text-foreground-secondary"
        >
          Chaque marque est radiographiee sur 8 dimensions. Un score deterministe,
          transparent, actionnable. De Zombie a Icone.
        </p>
      </div>

      {/* Radar + Classifications grid */}
      <div className="grid items-center gap-12 lg:grid-cols-2">
        {/* Left: Radar */}
        <div
          data-reveal="scale-in"
          data-reveal-delay="300"
          className="flex justify-center"
        >
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-8">
            <AdvertisRadar
              scores={SAMPLE_SCORES}
              maxScore={25}
              size="lg"
              variant="full"
              interactive={false}
              animated
            />
            <div className="mt-4 text-center">
              <span className="text-3xl font-bold text-foreground">{totalScore}</span>
              <span className="text-lg text-foreground-muted">/200</span>
              <span className="ml-3 rounded-full bg-blue-900/30 px-3 py-1 text-xs font-medium text-blue-400">
                FORTE
              </span>
            </div>
          </div>
        </div>

        {/* Right: Pillars + Classifications */}
        <div>
          {/* Pillar list */}
          <div className="mb-8 space-y-3">
            {PILLARS.map((pillar, i) => (
              <div
                key={pillar.key}
                data-reveal="slide-in-left"
                data-reveal-delay={String(400 + i * 60)}
                className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-3 transition-all hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className={`h-3 w-3 rounded-full ${pillar.color}`} />
                <span className="w-5 text-xs font-bold text-foreground-muted">{pillar.key}</span>
                <span className="text-sm font-medium text-foreground">{pillar.name}</span>
                <span className="ml-auto text-xs text-foreground-muted hidden sm:block">{pillar.question}</span>
              </div>
            ))}
          </div>

          {/* Classification scale */}
          <div
            data-reveal="slide-up"
            data-reveal-delay="900"
            className="flex flex-wrap gap-2"
          >
            {CLASSIFICATIONS.map((c) => (
              <div
                key={c.label}
                className={`rounded-full px-4 py-1.5 text-xs font-medium ${c.bg} ${c.text}`}
              >
                {c.label} <span className="opacity-60">({c.range})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div
        data-reveal="scale-in"
        data-reveal-delay="1000"
        className="mt-16 flex justify-center"
      >
        <GlowButton href="/intake" size="md">
          Quel est votre score ?
        </GlowButton>
      </div>
    </SectionWrapper>
  );
}

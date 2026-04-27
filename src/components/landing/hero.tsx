"use client";

import Image from "next/image";
import { Rocket, Sparkles } from "lucide-react";
import { GlowButton } from "./shared/glow-button";
import { AnimatedCounter } from "./shared/animated-counter";

export function Hero() {
  return (
    <section className="relative flex min-h-[100vh] flex-col items-center justify-center overflow-hidden px-6 pt-20 text-center">
      {/* Background image with overlay */}
      <Image
        src="/images/hero-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      {/* Dark overlay + gradient */}
      <div className="absolute inset-0 bg-black/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background" />
      {/* Radial accent glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0.55_0.25_265_/_0.12)_0%,_transparent_60%)]" />

      {/* Floating particles (CSS-only) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-violet-400/20"
            style={{
              width: `${4 + i * 2}px`,
              height: `${4 + i * 2}px`,
              left: `${15 + i * 14}%`,
              bottom: `${20 + i * 8}%`,
              animation: `particle-rise ${3 + i * 0.5}s ease-out infinite`,
              animationDelay: `${i * 0.7}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex max-w-4xl flex-col items-center">
        {/* Version badge */}
        <div
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground-secondary backdrop-blur-sm"
          style={{ animation: "slide-down 500ms var(--ease-out) 200ms forwards", opacity: 0 }}
        >
          <Sparkles className="h-4 w-4 text-violet-400" />
          Propulse par le Trio Divin NETERU
          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-300">
            v5.0
          </span>
        </div>

        {/* Main headline */}
        <h1
          className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
          style={{ animation: "slide-up-lg 700ms var(--ease-out) 350ms forwards", opacity: 0 }}
        >
          De la Poussiere{" "}
          <span className="text-gradient-star">a l&apos;Etoile</span>
        </h1>

        {/* Subheadline */}
        <p
          className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-foreground-secondary sm:text-xl"
          style={{ animation: "slide-up-lg 700ms var(--ease-out) 500ms forwards", opacity: 0 }}
        >
          La premiere plateforme AI qui analyse votre marque sur 8 dimensions,
          propose une strategie complete et lance l&apos;execution — en 48h.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-wrap items-center justify-center gap-4"
          style={{ animation: "scale-in 500ms var(--ease-spring) 650ms forwards", opacity: 0 }}
        >
          <GlowButton
            href="/intake"
            variant="primary"
            size="lg"
            className="animate-[glow-pulse-cta_3s_ease-in-out_infinite]"
          >
            Diagnostiquez votre marque
          </GlowButton>
          <GlowButton href="#methode" variant="ghost" size="lg" icon={false}>
            Decouvrir le protocole
          </GlowButton>
        </div>

        {/* Social proof micro-bar */}
        <div
          className="mt-12 flex items-center gap-4 rounded-full border border-white/5 bg-white/5 px-6 py-3 backdrop-blur-sm"
          style={{ animation: "fade-in 600ms var(--ease-out) 900ms forwards", opacity: 0 }}
        >
          {/* Avatar stack */}
          <div className="flex -space-x-2">
            {["/images/avatar-1.jpg", "/images/avatar-2.jpg", "/images/avatar-3.jpg"].map((src, i) => (
              <Image
                key={src}
                src={src}
                alt=""
                width={28}
                height={28}
                className="rounded-full border-2 border-background object-cover"
              />
            ))}
          </div>
          <div className="text-sm text-foreground-secondary">
            <AnimatedCounter target={127} suffix="+" className="font-semibold text-foreground" />{" "}
            marques diagnostiquees
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        style={{ animation: "fade-in 600ms var(--ease-out) 1200ms forwards, float 3s ease-in-out infinite 1800ms", opacity: 0 }}
      >
        <div className="flex h-8 w-5 items-start justify-center rounded-full border border-white/20 p-1">
          <div className="h-1.5 w-1 rounded-full bg-white/40 animate-[slide-up_1.5s_ease-in-out_infinite]" />
        </div>
      </div>
    </section>
  );
}

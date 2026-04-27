"use client";

import Image from "next/image";
import { Rocket } from "lucide-react";
import { GlowButton } from "./shared/glow-button";
import { AnimatedCounter } from "./shared/animated-counter";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:py-40">
      {/* Background image */}
      <Image
        src="/images/cta-skyline.jpg"
        alt=""
        fill
        className="object-cover object-center"
        sizes="100vw"
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/75" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/50" />
      {/* Glow accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_oklch(0.55_0.25_265_/_0.10)_0%,_transparent_60%)]" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-emerald-600">
          <Rocket className="h-7 w-7 text-white" />
        </div>

        <h2 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Votre marque est-elle prete
          <br className="hidden sm:block" />
          <span className="text-gradient-star"> pour son diagnostic ?</span>
        </h2>

        <p className="mb-10 max-w-xl text-lg text-foreground-secondary">
          15 minutes de votre temps. Un score sur 200. Une vision claire de vos forces,
          vos vulnerabilites et votre potentiel. Gratuit, sans engagement.
        </p>

        <GlowButton
          href="/intake"
          variant="gradient"
          size="lg"
          className="animate-[glow-pulse-cta_3s_ease-in-out_infinite]"
        >
          Lancez votre diagnostic gratuit
        </GlowButton>

        <p className="mt-8 text-sm text-foreground-muted">
          Rejoignez les{" "}
          <AnimatedCounter target={127} suffix="+" className="font-semibold text-foreground" />{" "}
          marques deja diagnostiquees
        </p>
      </div>
    </section>
  );
}

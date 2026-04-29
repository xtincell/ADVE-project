/**
 * MissionManifesto — landing section #5 of the rewrite (Tier 3.4).
 *
 * Anchors the user on La Fusée's two non-negotiable mechanisms:
 *  - Superfans (mass that tips)
 *  - Overton window (axis the brand shifts)
 *
 * No CTAs here — pure brand conviction. Framed as a manifesto, not a
 * features list. Read [docs/governance/MISSION.md](docs/governance/MISSION.md).
 */

import { Sparkles, MoveHorizontal } from "lucide-react";

export function MissionManifesto() {
  return (
    <section
      id="manifesto"
      className="relative border-y border-zinc-900/80 bg-gradient-to-b from-zinc-950 via-black to-zinc-950 py-24"
    >
      <div className="mx-auto max-w-4xl px-6">
        <p className="mb-3 text-center text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">
          Manifesto
        </p>
        <h2 className="mb-6 text-center text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl md:text-5xl">
          Une marque ne meurt pas oubliée.<br />
          Elle meurt de n'avoir <span className="text-amber-300">jamais bougé l'axe</span>.
        </h2>
        <p className="mx-auto mb-16 max-w-2xl text-center text-base text-zinc-400">
          La Fusée ne court pas après les vues. Nous industrialisons deux mécaniques —
          et seulement deux — qui font qu'un secteur se redéfinit autour d'une marque.
        </p>

        <div className="grid gap-8 md:grid-cols-2">
          <article className="rounded-2xl border border-emerald-900/50 bg-emerald-950/10 p-8">
            <Sparkles className="mb-4 h-6 w-6 text-emerald-400" />
            <h3 className="mb-3 text-xl font-semibold text-zinc-100">
              Superfans — la masse qui fait basculer
            </h3>
            <p className="mb-3 text-sm text-zinc-400">
              Pas des followers, pas une communauté tiède. Des évangélistes qui produisent
              du travail organique pour la marque sans qu'on leur demande.
            </p>
            <p className="text-sm text-zinc-400">
              Quand cette masse passe le seuil critique pour ton secteur, le marché
              entend la marque <em>même quand elle se tait</em>.
            </p>
          </article>

          <article className="rounded-2xl border border-amber-900/50 bg-amber-950/10 p-8">
            <MoveHorizontal className="mb-4 h-6 w-6 text-amber-400" />
            <h3 className="mb-3 text-xl font-semibold text-zinc-100">
              Overton — l'axe culturel sectoriel
            </h3>
            <p className="mb-3 text-sm text-zinc-400">
              Chaque secteur a une fenêtre d'opinions et de codes acceptables.
              Une marque ICONE ne joue pas dans la fenêtre — elle la <strong>déplace</strong>.
            </p>
            <p className="text-sm text-zinc-400">
              Et quand l'axe bouge, les concurrents s'orientent autour de ta direction.
              C'est ça, le verrouillage culturel.
            </p>
          </article>
        </div>

        <p className="mt-16 text-center text-xs text-zinc-600">
          Tout l'OS sert ces deux mécaniques. Tout le reste est subordonné.
        </p>
      </div>
    </section>
  );
}

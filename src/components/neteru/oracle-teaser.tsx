"use client";

/**
 * <OracleTeaser /> — preview redacted Oracle sections to drive conversion.
 *
 * Mission contribution: GROUND_INFRASTRUCTURE — funnel conversion lever.
 * Shows enough to whet the appetite, not enough to substitute the paid
 * Oracle. The "ifUpgraded" gaps from deduce-adve power the per-card
 * value statements.
 */

import { Lock, Sparkles } from "lucide-react";

interface OracleTeaserSection {
  number: string; // "12"
  key: string;    // "fenetre-overton"
  title: string;
  hookSentence: string;
  redactedExtract?: string;
}

interface OracleTeaserProps {
  sections: readonly OracleTeaserSection[];
  /** Called when user clicks unlock CTA. */
  onUnlock?: () => void;
  /** Pre-computed price display. Falls back to "Déverrouiller" if absent. */
  unlockPriceLabel?: string;
}

const DEFAULT_TEASER_SECTIONS: readonly OracleTeaserSection[] = [
  {
    number: "12",
    key: "fenetre-overton",
    title: "Fenêtre d'Overton",
    hookSentence:
      "L'axe culturel de votre secteur est en train de pivoter. Voici comment votre marque peut le plier.",
    redactedExtract:
      "Notre lecture sectorielle indique que ████████████████ est en mutation. Les concurrents historiques ████████████ et ce shift ████████████████ — un angle que ████████████████.",
  },
  {
    number: "15",
    key: "profil-superfan",
    title: "Profil du superfan idéal",
    hookSentence:
      "Identité, rituels, vocabulaire, ennemi commun — la masse stratégique à recruter.",
    redactedExtract:
      "Votre superfan archétypal est ████████████ qui partage ████████████████. Il consomme ████████████ et rejette ████████████. Le rituel d'engagement initial est ████████████████.",
  },
  {
    number: "11",
    key: "plan-activation",
    title: "Plan d'activation 90 jours",
    hookSentence:
      "Sprint exécutable, tactiques par canal, KPIs suivis. Pas une todo — un plan de combat.",
    redactedExtract:
      "Sprint 1 (J1-J30) : ████████████████ avec ████████████ comme premier asset. Sprint 2 (J31-J60) : ████████████████. Sprint 3 (J61-J90) : ████████████████ pour atteindre ████████████.",
  },
];

export function OracleTeaser({
  sections = DEFAULT_TEASER_SECTIONS,
  onUnlock,
  unlockPriceLabel,
}: OracleTeaserProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-zinc-900/60 p-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/80">
            Aperçu — Oracle complet
          </span>
        </div>
        <h2 className="text-lg font-semibold text-zinc-100">
          Voici 3 des 21 sections que l'Oracle débloque
        </h2>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        {sections.map((s) => (
          <article
            key={s.key}
            className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-4"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500">§{s.number}</span>
              <Lock className="h-3.5 w-3.5 text-zinc-600" />
            </div>
            <h3 className="mb-1.5 text-sm font-semibold text-zinc-100">{s.title}</h3>
            <p className="mb-3 text-xs leading-relaxed text-zinc-400">{s.hookSentence}</p>
            {s.redactedExtract && (
              <p className="text-[11px] italic leading-relaxed text-zinc-600 line-clamp-4">
                {s.redactedExtract}
              </p>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          </article>
        ))}
      </div>

      {onUnlock && (
        <button
          type="button"
          onClick={onUnlock}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-700/60 bg-amber-700/30 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-700/50"
        >
          <Sparkles className="h-4 w-4" />
          <span>{unlockPriceLabel ? `Déverrouiller l'Oracle complet — ${unlockPriceLabel}` : "Déverrouiller l'Oracle complet"}</span>
        </button>
      )}
    </section>
  );
}

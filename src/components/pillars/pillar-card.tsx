import Link from "next/link";
import { cva } from "class-variance-authority";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/ui/badge";
import { ScoreBar } from "./score-bar";

/**
 * Carte pilier de la grille bento « Ma marque ». Les piliers RTIS (dérivés)
 * sont visuellement distincts : bord pointillé + badge « Dérivé » — on voit
 * d'un coup d'œil ce qui est socle déclaré et ce qui en découle.
 */
const pillarCardVariants = cva(
  "group flex flex-col gap-4 rounded-lg border p-5 transition-colors duration-200",
  {
    variants: {
      derived: {
        false: "border-line bg-ink-2 hover:border-coral/50 hover:bg-ink-3",
        true: "border-dashed border-line bg-ink-0/70 hover:border-gold/40 hover:bg-ink-2",
      },
    },
  },
);

export type PillarCardProps = {
  pillarKey: string;
  label: string;
  href: string;
  derived: boolean;
  /** Score lisible /100 du pilier. */
  score: number;
  filled: number;
  total: number;
  declared: number;
  inferred: number;
};

export function PillarCard({
  pillarKey,
  label,
  href,
  derived,
  score,
  filled,
  total,
  declared,
  inferred,
}: PillarCardProps) {
  return (
    <Link href={href} className={cn(pillarCardVariants({ derived }))}>
      <div className="flex items-start justify-between gap-2">
        <span
          className="flex size-9 items-center justify-center rounded-sm bg-white/6 font-mono text-sm font-bold text-sand-2"
          aria-hidden
        >
          {pillarKey}
        </span>
        {derived ? (
          <Badge variant="inverse" title="Pilier dérivé du socle ADVE — jamais édité à la main">
            Dérivé
          </Badge>
        ) : (
          <Badge variant="coral">Socle</Badge>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-lg font-semibold leading-tight text-bone">
          {label}
        </h3>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xl font-bold text-bone">{score}</span>
          <span className="text-xs text-smoke-2">/100</span>
        </div>
        <ScoreBar value={score} max={100} size="sm" label={`Score du pilier ${label}`} />
      </div>

      <div className="mt-auto space-y-1.5 text-xs text-sand">
        <p>
          {filled}/{total} champs remplis
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {declared > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <span className="size-1.5 rounded-full bg-success" aria-hidden />
              {declared} déclaré{declared > 1 ? "s" : ""}
            </span>
          ) : null}
          {inferred > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-coral">
              <span className="size-1.5 rounded-full bg-coral" aria-hidden />
              {inferred} à valider
            </span>
          ) : null}
          {declared === 0 && inferred === 0 ? (
            <span className="text-smoke-2">aucune donnée certifiée</span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}

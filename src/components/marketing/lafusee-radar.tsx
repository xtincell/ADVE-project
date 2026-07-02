"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PILLARS } from "@/domain/pillars";
import {
  classifyLevel,
  COMPOSITE_MAX_SCORE,
  LEVEL_DEFINITIONS,
  PILLAR_MAX_SCORE,
} from "@/domain/scoring";
import { PILLAR_LABELS } from "@/domain/pillar-fields";
import { buttonVariants } from "@/components/ui/button";
import { PILLAR_QUESTIONS } from "@/components/marketing/site-data";

/**
 * Radar 8 piliers interactif — composition DS honnête de la page produit
 * /lafusee (port du simulateur legacy marketing-advertis). C'est un BAC À
 * SABLE explicitement annoncé : les valeurs sont ajustables au clic, le
 * score composite et le palier sont recalculés par le VRAI moteur du
 * produit (`classifyLevel`, src/domain/scoring) — mêmes constantes, même
 * classification que le diagnostic réel. Aucune donnée client affichée.
 * Questions d'accroche : PILLAR_QUESTIONS (site-data, copy legacy).
 */

/** Valeurs de départ du bac à sable (mêmes que la démo legacy). */
const DEMO_VALUES = [18, 14, 20, 11, 16, 9, 12, 15];

const R = 160;

/** Arrondi 4 décimales — évite les mismatches d'hydratation SSR/client. */
function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export function LafuseeRadar() {
  const [vals, setVals] = useState<number[]>(DEMO_VALUES);
  const total = vals.reduce((s, v) => s + v, 0);
  const level = classifyLevel(total);

  const points = vals.map((v, i) => {
    const angle = (i / PILLARS.length) * Math.PI * 2 - Math.PI / 2;
    const r = (v / PILLAR_MAX_SCORE) * R;
    return { x: round(Math.cos(angle) * r), y: round(Math.sin(angle) * r) };
  });

  function bump(index: number) {
    setVals((v) =>
      v.map((val, j) =>
        j === index ? (val + 5 > PILLAR_MAX_SCORE ? 5 : val + 5) : val,
      ),
    );
  }

  return (
    <div className="grid gap-bento lg:grid-cols-2">
      {/* ── Le radar ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-line bg-ink-2 p-6">
        <svg
          viewBox="-200 -200 400 400"
          className="aspect-square w-full"
          role="img"
          aria-label={`Score simulé ${total}/${COMPOSITE_MAX_SCORE}, palier ${LEVEL_DEFINITIONS[level].label}`}
        >
          <g fill="none" stroke="var(--color-line)" strokeWidth="0.5">
            {[40, 80, 120, 160].map((r) => (
              <circle key={r} r={r} />
            ))}
          </g>
          <g stroke="var(--color-line-soft)" strokeWidth="0.5">
            {PILLARS.map((_, i) => {
              const angle = (i / PILLARS.length) * Math.PI * 2 - Math.PI / 2;
              return (
                <line
                  key={i}
                  x1="0"
                  y1="0"
                  x2={round(Math.cos(angle) * R)}
                  y2={round(Math.sin(angle) * R)}
                />
              );
            })}
          </g>
          <polygon
            points={points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="color-mix(in oklab, var(--color-coral) 20%, transparent)"
            stroke="var(--color-coral)"
            strokeWidth="2"
          />
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="5" fill="var(--color-coral)" />
          ))}
          {PILLARS.map((key, i) => {
            const angle = (i / PILLARS.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <text
                key={key}
                x={round(Math.cos(angle) * (R + 26))}
                y={round(Math.sin(angle) * (R + 26))}
                textAnchor="middle"
                dominantBaseline="middle"
                fontFamily="var(--font-mono)"
                fontSize="14"
                fontWeight="600"
                fill="var(--color-sand-2)"
              >
                {key}
              </text>
            );
          })}
        </svg>
        <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-4">
          <div>
            <p className="font-display text-5xl font-semibold leading-none text-bone">
              {total}
              <span className="text-2xl text-smoke-2">/{COMPOSITE_MAX_SCORE}</span>
            </p>
            <p className="eyebrow mt-2 text-coral">
              {LEVEL_DEFINITIONS[level].label} — {LEVEL_DEFINITIONS[level].tagline}
            </p>
          </div>
          <p className="max-w-[16ch] text-right font-mono text-xs leading-relaxed text-smoke-2">
            ↳ touchez un pilier, le score se recalcule
          </p>
        </div>
      </div>

      {/* ── Les 8 piliers cliquables ─────────────────────────────────── */}
      <ol className="flex flex-col gap-2">
        {PILLARS.map((key, i) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => bump(i)}
              className="flex w-full items-center gap-4 rounded-md border border-line bg-ink-2 p-3.5 text-left transition-colors hover:bg-ink-3"
              aria-label={`Ajuster le pilier ${PILLAR_LABELS[key]} (valeur simulée ${vals[i]}/${PILLAR_MAX_SCORE})`}
            >
              <span className="font-display w-8 text-center text-2xl font-semibold text-coral">
                {key}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-bone">
                  {PILLAR_LABELS[key]}
                </span>
                <span className="block truncate text-xs text-smoke-2">
                  {PILLAR_QUESTIONS[key]}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="relative h-1 w-20 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-coral transition-all"
                    style={{ width: `${((vals[i] ?? 0) / PILLAR_MAX_SCORE) * 100}%` }}
                  />
                </span>
                <span className="w-12 text-right font-mono text-xs tabular-nums">
                  <span className="text-bone">{vals[i]}</span>
                  <span className="text-smoke-2">/{PILLAR_MAX_SCORE}</span>
                </span>
              </span>
            </button>
          </li>
        ))}
        <li className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-md border border-coral/40 bg-coral/8 p-5">
          <div>
            <p className="eyebrow text-coral">↳ Vous jouez avec le radar</p>
            <p className="mt-1 text-sm font-medium text-bone">
              Le vrai diagnostic prend 15 minutes et vous rend un rapport
              actionnable.
            </p>
          </div>
          <Link href="/intake" className={buttonVariants({ size: "sm" })}>
            Lancer le vrai <ArrowRight aria-hidden="true" />
          </Link>
        </li>
      </ol>
    </div>
  );
}

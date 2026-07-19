"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  FileText,
  ScanSearch,
  Sparkles,
  ShieldCheck,
  Diamond,
  Gem,
  HeartHandshake,
  Award,
  Loader2,
} from "lucide-react";
import { useT } from "@/lib/i18n/use-t";

type StageKey = "read" | "id" | "a" | "d" | "v" | "e" | "synth";

interface Stage {
  key: StageKey;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Seconds elapsed at which this stage becomes "active". Tuned on observed p50/p95. */
  startsAt: number;
}

// label / sub = i18n keys — resolved with t() at render time (fragment intake-result.ts).
const STAGES: Stage[] = [
  { key: "read",  label: "intakeProcessing.stage.read.label",  sub: "intakeProcessing.stage.read.sub",  icon: FileText,       startsAt: 0  },
  { key: "id",    label: "intakeProcessing.stage.id.label",    sub: "intakeProcessing.stage.id.sub",    icon: ScanSearch,     startsAt: 5  },
  { key: "a",     label: "intakeProcessing.stage.a.label",     sub: "intakeProcessing.stage.a.sub",     icon: ShieldCheck,    startsAt: 11 },
  { key: "d",     label: "intakeProcessing.stage.d.label",     sub: "intakeProcessing.stage.d.sub",     icon: Diamond,        startsAt: 19 },
  { key: "v",     label: "intakeProcessing.stage.v.label",     sub: "intakeProcessing.stage.v.sub",     icon: Gem,            startsAt: 28 },
  { key: "e",     label: "intakeProcessing.stage.e.label",     sub: "intakeProcessing.stage.e.sub",     icon: HeartHandshake, startsAt: 37 },
  { key: "synth", label: "intakeProcessing.stage.synth.label", sub: "intakeProcessing.stage.synth.sub", icon: Award,          startsAt: 46 },
];

type FactKind = "verite" | "methode" | "atelier" | "lafusee";

interface Fact {
  kind: FactKind;
  text: string;
}

// i18n keys — resolved with t() at render time.
const FACT_LABELS: Record<FactKind, string> = {
  verite: "intakeProcessing.factKind.verite",
  methode: "intakeProcessing.factKind.methode",
  atelier: "intakeProcessing.factKind.atelier",
  lafusee: "intakeProcessing.factKind.lafusee",
};

const FACTS: Fact[] = [
  // ── Verites ADVE (text = i18n keys) ─────────────────────────────
  { kind: "verite", text: "intakeProcessing.fact.verite1" },
  { kind: "verite", text: "intakeProcessing.fact.verite2" },
  { kind: "verite", text: "intakeProcessing.fact.verite3" },
  { kind: "verite", text: "intakeProcessing.fact.verite4" },
  { kind: "verite", text: "intakeProcessing.fact.verite5" },
  { kind: "verite", text: "intakeProcessing.fact.verite6" },
  { kind: "verite", text: "intakeProcessing.fact.verite7" },
  { kind: "verite", text: "intakeProcessing.fact.verite8" },

  // ── Methode (Xtincell-flavored) ────────────────────────────────
  { kind: "methode", text: "intakeProcessing.fact.methode1" },
  { kind: "methode", text: "intakeProcessing.fact.methode2" },
  { kind: "methode", text: "intakeProcessing.fact.methode3" },
  { kind: "methode", text: "intakeProcessing.fact.methode4" },
  { kind: "methode", text: "intakeProcessing.fact.methode5" },
  { kind: "methode", text: "intakeProcessing.fact.methode6" },
  { kind: "methode", text: "intakeProcessing.fact.methode7" },

  // ── Vu en atelier (terrain africain) ───────────────────────────
  { kind: "atelier", text: "intakeProcessing.fact.atelier1" },
  { kind: "atelier", text: "intakeProcessing.fact.atelier2" },
  { kind: "atelier", text: "intakeProcessing.fact.atelier3" },
  { kind: "atelier", text: "intakeProcessing.fact.atelier4" },

  // ── Easter eggs Neteru (cosmologie produit) ────────────────────
  { kind: "lafusee", text: "intakeProcessing.fact.lafusee1" },
  { kind: "lafusee", text: "intakeProcessing.fact.lafusee2" },
  { kind: "lafusee", text: "intakeProcessing.fact.lafusee3" },
  { kind: "lafusee", text: "intakeProcessing.fact.lafusee4" },
  { kind: "lafusee", text: "intakeProcessing.fact.lafusee5" },
  { kind: "lafusee", text: "intakeProcessing.fact.lafusee6" },
  { kind: "lafusee", text: "intakeProcessing.fact.lafusee7" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

interface Props {
  companyName: string;
  /** True while the underlying mutation is running. Goes false on success/error. */
  isPending: boolean;
  /** Optional error to surface inline (still keeps the screen up so the user has context). */
  errorMessage?: string;
}

export function IntakeProcessingScreen({ companyName, isPending, errorMessage }: Props) {
  const { t } = useT();
  const [elapsed, setElapsed] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const startRef = useRef<number>(Date.now());
  const factsRef = useRef<Fact[]>(shuffle(FACTS));

  useEffect(() => {
    const tick = window.setInterval(() => {
      setElapsed((Date.now() - startRef.current) / 1000);
    }, 200);
    const factTick = window.setInterval(() => {
      setFactIndex((i) => (i + 1) % factsRef.current.length);
    }, 4500);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(factTick);
    };
  }, []);

  // ── Progress curve ───────────────────────────────────────────────
  // Asymptotic toward 92 % over ~50 s so we never look "stuck at 100".
  // Snap to 100 % the moment the mutation resolves.
  const progress = useMemo(() => {
    if (!isPending) return 100;
    const target = 50;
    const eased = (1 - Math.exp(-elapsed / target)) * 92;
    return Math.max(2, Math.min(95, eased));
  }, [elapsed, isPending]);

  // Active stage = last stage whose startsAt <= elapsed (or the last one when done).
  const activeIdx = useMemo(() => {
    if (!isPending) return STAGES.length - 1;
    let idx = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (elapsed >= STAGES[i]!.startsAt) idx = i;
    }
    return idx;
  }, [elapsed, isPending]);

  return (
    <main className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 py-8 sm:px-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-subtle">
            <Sparkles className="h-8 w-8 animate-pulse text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {t("intakeProcessing.titleBefore")} <span className="text-primary">{companyName}</span> {t("intakeProcessing.titleAfter")}
          </h1>
          <p className="mt-2 text-sm text-foreground-secondary sm:text-base">
            {t("intakeProcessing.sub")}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-medium text-foreground-secondary">
              {!isPending ? t("intakeProcessing.done") : t(STAGES[activeIdx]?.label ?? "intakeProcessing.done")}
            </span>
            <span className="font-mono text-foreground-muted tabular-nums">
              {Math.round(progress)} %
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background-raised">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stage list */}
        <ul className="mt-8 space-y-3">
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const status: "done" | "active" | "pending" =
              i < activeIdx || !isPending
                ? "done"
                : i === activeIdx
                  ? "active"
                  : "pending";

            return (
              <li
                key={stage.key}
                className={`flex items-start gap-4 rounded-xl border px-4 py-3 transition-all ${
                  status === "active"
                    ? "border-primary/40 bg-primary-subtle/20"
                    : status === "done"
                      ? "border-border bg-background-raised opacity-70"
                      : "border-border/50 bg-transparent opacity-40"
                }`}
              >
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    status === "active"
                      ? "bg-primary text-primary-foreground"
                      : status === "done"
                        ? "bg-success/20 text-success"
                        : "bg-background-raised text-foreground-muted"
                  }`}
                >
                  {status === "done" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : status === "active" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      status === "pending" ? "text-foreground-muted" : "text-foreground"
                    }`}
                  >
                    {t(stage.label)}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-secondary sm:text-sm">{t(stage.sub)}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Rotating fact */}
        <div className="mt-auto pt-8">
          <div
            key={factIndex}
            className="rounded-xl border border-border bg-background-raised px-5 py-4 animate-rise-in"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              {t(FACT_LABELS[factsRef.current[factIndex]?.kind ?? "verite"])}
            </p>
            <p className="mt-1 text-sm text-foreground sm:text-base">
              {(() => { const key = factsRef.current[factIndex]?.text; return key ? t(key) : null; })()}
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-lg bg-destructive-subtle/30 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}
      </div>
    </main>
  );
}

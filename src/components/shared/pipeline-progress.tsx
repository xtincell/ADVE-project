"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Pipeline ADVE → RTIS — visual representation of the 3-phase brand transformation.
 * Phase 1 (ADVE): L'audit — ce que tu ES
 * Phase 2 (R+T): L'audit profond — recalibrer ADVE
 * Phase 3 (I+S): Les recommandations — catalogue + roadmap
 */

type PillarStatus = "empty" | "in_progress" | "completed" | "validated";

interface PipelineStep {
  key: string;
  label: string;
  phase: 1 | 2 | 3;
  status: PillarStatus;
  score: number;
  href: string;
}

const PHASE_LABELS: Record<number, { label: string; sublabel: string }> = {
  1: { label: "Identite", sublabel: "Ce que tu ES" },
  2: { label: "Diagnostic", sublabel: "R+T recalibrent ADVE" },
  3: { label: "Recommandations", sublabel: "Potentiel + Roadmap" },
};

const STATUS_STYLES: Record<PillarStatus, { ring: string; bg: string; text: string; dot: string }> = {
  empty:       { ring: "ring-border",     bg: "bg-background",       text: "text-foreground-muted", dot: "bg-surface-raised" },
  in_progress: { ring: "ring-warning", bg: "bg-warning/30",   text: "text-warning", dot: "bg-warning" },
  completed:   { ring: "ring-success", bg: "bg-success/30", text: "text-success", dot: "bg-success" },
  validated:   { ring: "ring-accent/50", bg: "bg-accent/30", text: "text-accent", dot: "bg-accent" },
};

interface PipelineProgressProps {
  steps: PipelineStep[];
  className?: string;
}

export function PipelineProgress({ steps, className }: PipelineProgressProps) {
  const phases = [1, 2, 3] as const;

  return (
    <div className={cn("space-y-4", className)}>
      {phases.map((phase) => {
        const phaseSteps = steps.filter((s) => s.phase === phase);
        if (phaseSteps.length === 0) return null;
        const meta = PHASE_LABELS[phase]!;
        const allCompleted = phaseSteps.every((s) => s.status === "completed" || s.status === "validated");
        const anyStarted = phaseSteps.some((s) => s.status !== "empty");

        return (
          <div key={phase}>
            <div className="mb-2 flex items-center gap-2">
              <span className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                allCompleted ? "bg-success/20 text-success" :
                anyStarted ? "bg-warning/20 text-warning" :
                "bg-background text-foreground-muted"
              )}>
                {phase}
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-foreground-muted">
                {meta.label}
              </span>
              <span className="text-[10px] text-foreground-muted/60">
                {meta.sublabel}
              </span>
            </div>
            <div className="flex gap-2">
              {phaseSteps.map((step, i) => {
                const styles = STATUS_STYLES[step.status];
                return (
                  <Link
                    key={step.key}
                    href={step.href}
                    className={cn(
                      "group relative flex flex-1 flex-col items-center rounded-xl p-3 ring-1 transition-all hover:ring-2",
                      styles.ring, styles.bg,
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
                      <span className={cn("text-sm font-bold", styles.text)}>
                        {step.key.toUpperCase()}
                      </span>
                    </div>
                    <span className="mt-0.5 text-[10px] text-foreground-muted group-hover:text-foreground-secondary">
                      {step.label}
                    </span>
                    {step.score > 0 && (
                      <span className={cn("mt-1 text-xs font-semibold tabular-nums", styles.text)}>
                        {step.score.toFixed(0)}/25
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Helper to build pipeline steps from pillar data.
 */
export function buildPipelineSteps(
  scores: Record<string, number>,
  pillarStatuses: Record<string, PillarStatus>,
  basePath = "/cockpit/brand",
): PipelineStep[] {
  const defs: Array<{ key: string; label: string; phase: 1 | 2 | 3; href: string }> = [
    { key: "a", label: "Authenticite", phase: 1, href: `${basePath}/identity` },
    { key: "d", label: "Distinction",  phase: 1, href: `${basePath}/identity` },
    { key: "v", label: "Valeur",       phase: 1, href: `${basePath}/identity` },
    { key: "e", label: "Engagement",   phase: 1, href: `${basePath}/identity` },
    { key: "r", label: "SWOT Interne", phase: 2, href: `${basePath}/rtis` },
    { key: "t", label: "SWOT Externe", phase: 2, href: `${basePath}/rtis` },
    { key: "i", label: "Potentiel",    phase: 3, href: `${basePath}/rtis` },
    { key: "s", label: "Roadmap",      phase: 3, href: `${basePath}/rtis` },
  ];

  return defs.map((d) => ({
    ...d,
    score: scores[d.key] ?? 0,
    status: pillarStatuses[d.key] ?? ((scores[d.key] ?? 0) > 0 ? "completed" : "empty"),
  }));
}

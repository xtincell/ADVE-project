"use client";

import { ArrowRight } from "lucide-react";
import { ScoreBadge } from "./score-badge";

interface ScoreDeltaProps {
  before: number;
  after: number;
  maxScore?: number;
  className?: string;
}

export function ScoreDelta({ before, after, maxScore = 200, className }: ScoreDeltaProps) {
  const delta = after - before;

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <ScoreBadge score={before} maxScore={maxScore} size="sm" showClassification={false} animated={false} />

      <div className="flex flex-col items-center">
        <ArrowRight className="h-4 w-4 text-foreground-muted" />
        <span
          className={`mt-0.5 text-xs font-bold ${
            delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-foreground-muted"
          }`}
        >
          {delta > 0 ? "+" : ""}{delta}
        </span>
      </div>

      <ScoreBadge score={after} maxScore={maxScore} size="sm" showClassification={false} animated={false} />
    </div>
  );
}

"use client";

import { useNeteruIntent } from "@/hooks/use-neteru";

interface Props {
  intentId: string | null;
  /** All 21 Oracle section keys. Order = render order. */
  sections: readonly string[];
  className?: string;
}

type Status = "queued" | "in-progress" | "done" | "failed";

/**
 * <OracleEnrichmentTracker> — 21-section grid showing per-section state
 * during ENRICH_ORACLE intents.
 */
export function OracleEnrichmentTracker({ intentId, sections, className = "" }: Props) {
  const { history, progress } = useNeteruIntent(intentId);

  const statuses: Record<string, Status> = Object.fromEntries(
    sections.map((s) => [s, "queued" as Status]),
  );
  for (const e of history) {
    const completed = e.partial?.sectionsCompleted ?? [];
    for (const c of completed) statuses[c] = "done";
    if (e.partial?.sectionKey && statuses[e.partial.sectionKey] !== "done") {
      statuses[e.partial.sectionKey] = "in-progress";
    }
    if (e.phase === "FAILED" && e.partial?.sectionKey) {
      statuses[e.partial.sectionKey] = "failed";
    }
  }
  if (progress?.partial?.sectionKey && statuses[progress.partial.sectionKey] === "queued") {
    statuses[progress.partial.sectionKey] = "in-progress";
  }

  return (
    <ul className={`oracle-enrichment-tracker grid grid-cols-3 gap-2 sm:grid-cols-7 ${className}`}>
      {sections.map((s) => (
        <li
          key={s}
          className={`rounded border px-2 py-1 text-xs ${
            statuses[s] === "done"
              ? "border-current/50 bg-current/10"
              : statuses[s] === "in-progress"
                ? "border-current animate-pulse"
                : statuses[s] === "failed"
                  ? "border-rose-500 text-rose-700"
                  : "opacity-50"
          }`}
        >
          {s}
        </li>
      ))}
    </ul>
  );
}

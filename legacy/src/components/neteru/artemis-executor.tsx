"use client";

import { useNeteruIntent } from "@/hooks/use-neteru";

interface Props {
  intentId: string | null;
  className?: string;
}

/**
 * <ArtemisExecutor> — vertical stepper of the EXECUTING sub-steps.
 * Streams partial tokens when the underlying tool supports them.
 */
export function ArtemisExecutor({ intentId, className = "" }: Props) {
  const { history, progress, isStreaming } = useNeteruIntent(intentId);
  const steps = history.filter((e) => e.phase === "EXECUTING" && e.step);
  const tokens = progress?.partial?.tokens ?? "";
  return (
    <div className={`artemis-executor ${className}`}>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i} className="flex items-baseline gap-2">
            <span className="text-xs font-mono opacity-50">
              {s.step!.index + 1}/{s.step!.total}
            </span>
            <span className="text-sm">{s.step!.name}</span>
          </li>
        ))}
      </ol>
      {tokens && (
        <pre className="mt-3 max-h-40 overflow-auto rounded bg-black/5 p-2 text-xs leading-relaxed">
          {tokens}
        </pre>
      )}
      {isStreaming && (
        <div className="mt-2 text-xs opacity-60">Artemis exécute…</div>
      )}
    </div>
  );
}

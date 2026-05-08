/**
 * OracleLiveConsole — Phase 21 F-F (ADR-0073)
 *
 * Console temps-réel qui affiche les events de génération (start/complete/
 * fail) au fur et à mesure qu'ils arrivent via le stream SSE. Auto-scroll
 * sur le dernier event.
 *
 * Le shape de chaque entry est : { at: ms, level: "info"|"ok"|"fail", text }
 * (cf. useOracleStream).
 */

"use client";

import { useEffect, useRef } from "react";

interface LogEntry {
  at: number;
  level: "info" | "ok" | "fail";
  text: string;
}

export interface OracleLiveConsoleProps {
  log: ReadonlyArray<LogEntry>;
  isStreaming: boolean;
  emptyHint?: string;
  className?: string;
}

const LEVEL_CLASS: Record<LogEntry["level"], string> = {
  info: "text-foreground-muted",
  ok: "text-emerald-300",
  fail: "text-rose-400",
};

export function OracleLiveConsole(props: OracleLiveConsoleProps): React.ReactElement {
  const {
    log,
    isStreaming,
    emptyHint = "En attente de la première génération…",
    className = "",
  } = props;
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log.length]);

  return (
    <div
      className={`max-h-48 overflow-y-auto rounded-lg border border-border bg-background p-3 font-mono text-xs ${className}`}
      aria-live="polite"
      aria-atomic="false"
    >
      {log.length === 0 ? (
        <p className="text-foreground-muted">
          {isStreaming ? `[…] ${emptyHint}` : `[off] ${emptyHint}`}
        </p>
      ) : (
        <>
          {log.map((entry, idx) => (
            <div key={`${entry.at}-${idx}`} className="py-0.5 leading-snug">
              <span className="select-none text-foreground-muted">
                [{formatTime(entry.at)}]{" "}
              </span>
              <span className={LEVEL_CLASS[entry.level]}>{entry.text}</span>
            </div>
          ))}
          <div ref={endRef} />
        </>
      )}
    </div>
  );
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

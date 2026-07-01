"use client";

import { useState } from "react";

interface Props {
  intentId: string;
  className?: string;
  onReplay?: () => void;
}

/**
 * <IntentReplayButton> — admin-facing button that re-streams a finished
 * intent's IntentEmissionEvent rows back through NSP. Used in
 * /console/governance/intents detail view.
 */
export function IntentReplayButton({ intentId, className = "", onReplay }: Props) {
  const [running, setRunning] = useState(false);
  return (
    <button
      type="button"
      disabled={running}
      onClick={async () => {
        setRunning(true);
        try {
          await fetch(`/api/nsp/replay?intentId=${encodeURIComponent(intentId)}`, {
            method: "POST",
          });
          onReplay?.();
        } finally {
          setRunning(false);
        }
      }}
      className={`intent-replay-button text-xs underline-offset-2 hover:underline ${className}`}
    >
      {running ? "Replay…" : "Replay"}
    </button>
  );
}

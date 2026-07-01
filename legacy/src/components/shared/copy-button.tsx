"use client";

/**
 * CopyButton — tiny shared clipboard action. Operational surfaces (deliverables
 * hub, launch kit) let the founder copy a handle / bio / hashtag set in one tap.
 * DS-compliant (semantic tokens only). Degrades silently if the Clipboard API is
 * unavailable (insecure context) instead of throwing.
 */

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label = "Copier", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable (insecure context) — no-op */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={
        className ??
        "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-foreground-muted hover:bg-surface-raised hover:text-foreground-secondary transition-colors"
      }
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-accent" /> Copié
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> {label}
        </>
      )}
    </button>
  );
}

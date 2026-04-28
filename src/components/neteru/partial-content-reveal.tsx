"use client";

import { useNeteruIntent } from "@/hooks/use-neteru";

interface Props {
  intentId: string | null;
  /** Filter on the section being streamed (matches partial.sectionKey). */
  sectionKey: string;
  className?: string;
}

/**
 * <PartialContentReveal> — streams tokens of a single Oracle section as
 * they arrive. Re-renders each time the partial.tokens slice changes.
 */
export function PartialContentReveal({ intentId, sectionKey, className = "" }: Props) {
  const { history } = useNeteruIntent(intentId);
  const tokens = history
    .filter((e) => e.partial?.sectionKey === sectionKey)
    .map((e) => e.partial?.tokens ?? "")
    .join("");
  return (
    <pre
      className={`partial-content-reveal whitespace-pre-wrap text-sm ${className}`}
      data-section={sectionKey}
    >
      {tokens}
    </pre>
  );
}

"use client";

/**
 * Small golden "AI" premium badge to indicate LLM-powered features.
 * Usage: <AiBadge /> next to any feature title/button that depends on an LLM.
 */
export function AiBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-950/60 to-yellow-950/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide text-amber-400 ${className}`}
      title="Fonctionnalite propulsee par IA"
    >
      <svg className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1l1.545 4.752h4.999l-4.044 2.94 1.545 4.752L8 10.504l-4.045 2.94 1.545-4.752L1.456 5.752h4.999z" />
      </svg>
      AI
    </span>
  );
}

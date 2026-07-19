/**
 * CVA presets — variants réutilisables (size, tone, density, state).
 * Évite la réinvention dans chaque primitive.
 *
 * Cf. DESIGN-LEXICON.md §2 (Variants CVA canoniques).
 */

export const SIZE_VARIANTS = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg",
} as const;

export const TONE_TO_BG = {
  neutral: "bg-[var(--badge-bg-neutral)] text-[var(--badge-fg-neutral)]",
  accent: "bg-[var(--badge-bg-accent)] text-[var(--badge-fg-accent)]",
  success: "bg-[var(--badge-bg-success)] text-[var(--badge-fg-success)]",
  warning: "bg-[var(--badge-bg-warning)] text-[var(--badge-fg-warning)]",
  error: "bg-[var(--badge-bg-error)] text-[var(--badge-fg-error)]",
  info: "bg-[var(--badge-bg-info)] text-[var(--badge-fg-info)]",
} as const;

export const FOCUS_RING = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]";
export const TRANSITION_BASE = "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]";
export const DISABLED_STATE = "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

// Micro-interactions tactiles (audit DS 2026-07-19) — le canon motion
// prescrivait un feedback press/lift (--ease-spring), aucun preset ne
// l'offrait : les CTA ne réagissaient qu'en couleur.
export const PRESS = "active:scale-[0.97] transition-transform duration-[var(--motion-fast)] ease-[var(--ease-spring)] motion-reduce:transition-none motion-reduce:active:scale-100";
export const HOVER_LIFT = "hover:-translate-y-0.5 transition-transform duration-[var(--motion-fast)] ease-[var(--ease-out)] motion-reduce:transition-none motion-reduce:hover:translate-y-0";

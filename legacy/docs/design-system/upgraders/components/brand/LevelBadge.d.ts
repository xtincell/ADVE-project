import React from "react";

export interface LevelBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Current level number. */
  level?: number;
  /** Rank label, e.g. "Expert". */
  rank?: string;
  /** Hex colour: brand gold (default) or rouge. */
  tone?: "gold" | "red";
  /** Show the "Niveau actuel / Level N" text block beside the hex. */
  showMeta?: boolean;
  /** Hex size in px. */
  size?: number;
  /** Override the star glyph. */
  icon?: React.ReactNode;
}

/**
 * Gamified level hexagon (star inside a gold hex) — the "Level 7 · Expert"
 * motif from the gamified dashboards. Core to the APOGEE / level-up system.
 */
export function LevelBadge(props: LevelBadgeProps): JSX.Element;

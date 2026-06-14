import React from "react";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Completion 0–100. */
  value?: number;
  /** Fill colour. `level` & `accent` use the gold→ember / red→ember gradient. */
  tone?: "accent" | "success" | "warning" | "level";
  /** Track thickness. */
  size?: "sm" | "md" | "lg";
  /** Optional caption above the bar. */
  label?: string;
  /** Show the % readout (mono) at the right. */
  showValue?: boolean;
}

/**
 * Progress / objective bar — "Progression générale 70%", level XP, campaign goals.
 */
export function Progress(props: ProgressProps): JSX.Element;

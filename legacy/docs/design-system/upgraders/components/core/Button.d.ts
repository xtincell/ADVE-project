import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. primary = rouge fusée CTA (the easy-to-spot action). */
  variant?: "primary" | "secondary" | "outline" | "ghost";
  /** Control height. */
  size?: "sm" | "md" | "lg";
  /** Fully rounded (pill) — used for hero CTAs and FABs. */
  pill?: boolean;
  /** Stretch to container width. */
  block?: boolean;
  /** Leading icon node (an SVG, e.g. a Lucide icon). */
  icon?: React.ReactNode;
  /** Trailing icon node (e.g. an arrow on "Découvrir nos services →"). */
  iconRight?: React.ReactNode;
  /** Square icon-only button. */
  iconOnly?: boolean;
}

/**
 * The UPgraders button. Primary is the signature rouge-fusée call to action;
 * every screen should have exactly one obvious primary action.
 *
 * @startingPoint section="Core" subtitle="Rouge-fusée CTA + variants" viewport="700x220"
 */
export function Button(props: ButtonProps): JSX.Element;

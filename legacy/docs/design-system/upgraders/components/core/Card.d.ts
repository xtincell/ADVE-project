import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Surface treatment:
   * - default  dark card
   * - raised   elevated dark card (shadow)
   * - glass    translucent blurred panel (layered overlays)
   * - accent   full rouge-fusée fill (the "Prêt à passer au niveau ?" CTA card)
   * - light    white card sitting on a dark page (editorial blocks)
   * - inkmax   deepest black well
   */
  variant?: "default" | "raised" | "glass" | "accent" | "light" | "inkmax";
  /** Internal padding step (token space scale). */
  padding?: "0" | "4" | "5" | "6" | "8";
  /** Corner radius. */
  radius?: "lg" | "xl" | "2xl";
  /** Hover-lift + pointer affordance. */
  interactive?: boolean;
}

/**
 * The bento building block. Compose dashboards by tiling Cards in a CSS grid.
 *
 * @startingPoint section="Core" subtitle="Bento surface — 6 variants" viewport="700x260"
 */
export function Card(props: CardProps): JSX.Element;

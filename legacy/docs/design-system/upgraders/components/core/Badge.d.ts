import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Semantic colour. */
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "level";
  /** Show a leading status dot (En cours / Terminé / En attente). */
  dot?: boolean;
  /** Solid red fill instead of tinted (use for "Priorité haute" emphasis). */
  solid?: boolean;
  /** Optional leading icon. */
  icon?: React.ReactNode;
}

/**
 * Small status pill. Tinted by tone; add `dot` for live statuses, `solid`
 * for the loud rouge variant. Pairs with task lists, cards and campaign rows.
 */
export function Badge(props: BadgeProps): JSX.Element;

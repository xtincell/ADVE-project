import React from "react";

export interface PortalCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Portal icon. */
  icon?: React.ReactNode;
  /** Portal name, e.g. "Portail Client". */
  title: string;
  /** One-line description. */
  subtitle?: string;
  /** Accent colour (use a --up-portal-* token). Tints icon + selected state. */
  accent?: string;
  /** Selected row (shows a check + accent border). */
  selected?: boolean;
}

/**
 * Portal selector row — "Choisir votre portail / Sélectionnez votre espace".
 * Stack several in a Card/Dialog for the sélecteur de portail.
 *
 * @startingPoint section="Brand" subtitle="Portal selector row" viewport="700x240"
 */
export function PortalCard(props: PortalCardProps): JSX.Element;

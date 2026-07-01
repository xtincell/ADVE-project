import React from "react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Semantic tone — sets fill, icon and title colour. */
  tone?: "success" | "warning" | "danger" | "info";
  /** Bold coloured heading (Succès / Attention / Erreur). */
  title?: string;
  /** Override the default tone icon. */
  icon?: React.ReactNode;
  /** When set, shows a dismiss ✕. */
  onClose?: () => void;
}

/**
 * Inline alert / notification banner with tinted surface + status icon.
 * Body text goes in children.
 */
export function Alert(props: AlertProps): JSX.Element;

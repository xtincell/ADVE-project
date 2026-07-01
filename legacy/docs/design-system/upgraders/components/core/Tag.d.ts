import React from "react";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Selected/active filter chip (rouge fill). */
  active?: boolean;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** When provided, renders a removable ✕ affordance. */
  onRemove?: (e: React.MouseEvent) => void;
}

/**
 * Pill-shaped filter chip / category tag. Use for portal filters
 * (Marketing · Branding · Social Media) and content categories.
 */
export function Tag(props: TagProps): JSX.Element;

"use client";

import * as React from "react";

/* UPgraders portal selector card (Client / Collaborateur / Partenaire / Console).
   Source: docs/design-system/upgraders/components/brand/PortalCard.jsx. */

export interface PortalCardProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  accent?: string;
  selected?: boolean;
}

export function PortalCard({
  icon = null,
  title,
  subtitle,
  accent,
  selected = false,
  className = "",
  style,
  ...rest
}: PortalCardProps) {
  const cls = ["up-portal", selected && "up-portal--selected", className].filter(Boolean).join(" ");
  return (
    <button
      type="button"
      className={cls}
      style={{ ["--_accent" as string]: accent, ...style } as React.CSSProperties}
      {...rest}
    >
      {icon && <span className="up-portal__icon">{icon}</span>}
      <span className="up-portal__body">
        <span className="up-portal__title">{title}</span>
        {subtitle && <span className="up-portal__sub">{subtitle}</span>}
      </span>
      {selected ? (
        <span className="up-portal__check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m5 12 5 5 9-11" />
          </svg>
        </span>
      ) : (
        <span className="up-portal__chev">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </span>
      )}
    </button>
  );
}

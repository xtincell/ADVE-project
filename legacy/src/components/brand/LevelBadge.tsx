import * as React from "react";

/* UPgraders gamification level badge — hex medallion + meta.
   Source: docs/design-system/upgraders/components/brand/LevelBadge.jsx. */

const Star = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="m12 2 2.9 6.26 6.84.62-5.16 4.54 1.54 6.7L12 16.9 5.88 20.6l1.54-6.7L2.26 8.88l6.84-.62L12 2Z" />
  </svg>
);

export interface LevelBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  level?: number;
  rank?: string;
  tone?: "gold" | "red";
  showMeta?: boolean;
  size?: number;
  icon?: React.ReactNode;
}

export function LevelBadge({
  level = 1,
  rank,
  tone = "gold",
  showMeta = true,
  size = 52,
  icon,
  className = "",
  ...rest
}: LevelBadgeProps) {
  return (
    <span className={["up-level", className].filter(Boolean).join(" ")} {...rest}>
      <span
        className={["up-level__hex", tone === "red" && "up-level__hex--red"].filter(Boolean).join(" ")}
        style={{ width: size, height: size }}
      >
        {icon ?? <Star />}
      </span>
      {showMeta && (
        <span className="up-level__meta">
          <span className="up-level__k">Niveau actuel</span>
          <span className="up-level__v">
            Level {level}
            {rank && <span className="up-level__rank">{rank}</span>}
          </span>
        </span>
      )}
    </span>
  );
}

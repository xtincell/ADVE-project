import * as React from "react";

/* UPgraders die-cut culture sticker ("LEVEL UP!", "BOSS MODE", …).
   Source: docs/design-system/upgraders/components/brand/Sticker.jsx. */

export interface StickerProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "dark" | "red" | "gold" | "white" | "outline";
  rotate?: number;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export function Sticker({
  tone = "dark",
  rotate = -4,
  size = "md",
  icon = null,
  className = "",
  children,
  style,
  ...rest
}: StickerProps) {
  const fs = size === "sm" ? "var(--text-sm)" : size === "lg" ? "var(--text-2xl)" : "var(--text-lg)";
  const cls = ["up-sticker", `up-sticker--${tone}`, className].filter(Boolean).join(" ");
  return (
    <span className={cls} style={{ transform: `rotate(${rotate}deg)`, fontSize: fs, ...style }} {...rest}>
      {icon && <span className="up-sticker__i">{icon}</span>}
      {children}
    </span>
  );
}

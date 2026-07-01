import React from "react";

export interface StickerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Sticker colour. */
  tone?: "dark" | "red" | "gold" | "white" | "outline";
  /** Tilt in degrees (die-cut sticker feel). Default -4. */
  rotate?: number;
  /** Label scale. */
  size?: "sm" | "md" | "lg";
  /** Optional leading icon/emoji. */
  icon?: React.ReactNode;
}

/**
 * Die-cut entrepreneur sticker (white outline + tilt + drop shadow) — the
 * startup-culture motif: "LEVEL UP!", "BOSS MODE", "STAY HUMBLE". Wrap a word
 * in <span className="up-sticker__em"> to accent it. Straightens on hover.
 */
export function Sticker(props: StickerProps): JSX.Element;

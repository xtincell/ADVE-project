import React from "react";

export type LogoVariant =
  | "mark"
  | "wordmark"
  | "wordmark-plain"
  | "monogram"
  | "lockup-horizontal"
  | "lockup-vertical"
  | "lockup-horizontal-mono"
  | "lockup-vertical-mono"
  | "full"
  | "tagline";

export interface LogoProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Render real brand artwork (PNG) by variant. `mark` = UP + rocket (rouge),
   * `monogram` = UP + rocket (monochrome), `wordmark` = UPgraders + rocket,
   * `lockup-horizontal`/`lockup-vertical` = full colour lockups (+ `-mono`
   * monochrome variants), `full` = word + rocket + tagline,
   * `tagline` = strapline only. Omit `variant` to use the font wordmark.
   */
  variant?: LogoVariant;
  /** Height preset or pixel number (image height, or mark+wordmark height). */
  size?: "sm" | "md" | "lg" | "xl" | number;
  /** Override the artwork URL (otherwise built from `basePath` + variant). */
  src?: string;
  /** Folder holding the logo PNGs, relative to the host page. Default "assets/logos". */
  basePath?: string;
  /** alt text (default "UPgraders"). */
  alt?: string;
  /** Put the mark on a white circle (use with variant="mark" on dark or light). */
  circle?: boolean;

  /* ── legacy font-wordmark API (when `variant` is omitted) ── */
  /** URL of the UP rocket mark PNG to sit beside the font wordmark. */
  markSrc?: string;
  /** Render only the mark, no font wordmark. */
  markOnly?: boolean;
  /** Tagline under the font wordmark. */
  tagline?: string;
  /** Trailing wordmark text (default "graders"; "Up" is the red prefix). */
  wordmark?: string;
}

/**
 * UPgraders logo. Pass `variant` to render the real brand artwork (recommended),
 * or omit it for the theme-recolouring font wordmark (red "Up" + foreground).
 */
export function Logo(props: LogoProps): JSX.Element;

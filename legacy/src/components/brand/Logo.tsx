import * as React from "react";

/* UPgraders brand logo — renders the real artwork by variant, or a
   font-based wordmark fallback. Source: docs/design-system/upgraders/components/brand/Logo.jsx.
   Artwork lives in public/brand/logos/ (served at /brand/logos/*). */

const SIZES = { sm: 24, md: 34, lg: 48, xl: 64 } as const;

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

const FILES: Record<LogoVariant, string> = {
  mark: "upgraders-icon.png",
  wordmark: "upgraders-wordmark.png",
  "wordmark-plain": "upgraders-wordmark-compact.png",
  monogram: "upgraders-monogram.png",
  "lockup-horizontal": "upgraders-lockup-horizontal.png",
  "lockup-vertical": "upgraders-lockup-vertical.png",
  "lockup-horizontal-mono": "upgraders-lockup-horizontal-mono.png",
  "lockup-vertical-mono": "upgraders-lockup-vertical-mono.png",
  full: "upgraders-logo-full.png",
  tagline: "upgraders-tagline.png",
};

export interface LogoProps extends React.HTMLAttributes<HTMLElement> {
  variant?: LogoVariant;
  size?: keyof typeof SIZES | number;
  src?: string;
  basePath?: string;
  markSrc?: string;
  markOnly?: boolean;
  circle?: boolean;
  tagline?: string;
  wordmark?: string;
  alt?: string;
}

export function Logo({
  variant,
  size = "md",
  src,
  basePath = "/brand/logos",
  markSrc,
  markOnly = false,
  circle = false,
  tagline,
  wordmark = "graders",
  alt = "UPgraders",
  className = "",
  ...rest
}: LogoProps) {
  const px = typeof size === "number" ? size : SIZES[size] ?? 34;

  /* Image-first: render the real brand artwork by variant */
  if (variant) {
    const file = FILES[variant];
    const url = src ?? (file ? `${basePath}/${file}` : undefined);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={["up-logo__img", circle && variant === "mark" && "up-logo__mark--circle", className]
          .filter(Boolean)
          .join(" ")}
        src={url}
        alt={alt}
        style={{ height: px, width: "auto" }}
        {...(rest as React.ImgHTMLAttributes<HTMLImageElement>)}
      />
    );
  }

  /* Legacy: mark + font wordmark (theme-recolouring) */
  const word = px * 0.62;
  return (
    <span className={["up-logo", className].filter(Boolean).join(" ")} {...rest}>
      {markSrc && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={["up-logo__mark", circle && "up-logo__mark--circle"].filter(Boolean).join(" ")}
          src={markSrc}
          alt={alt}
          style={{ width: px, height: px }}
        />
      )}
      {!markOnly && (
        <span className="up-logo__stack">
          <span className="up-logo__word" style={{ fontSize: word }}>
            <span className="up-logo__up">Up</span>
            {wordmark}
          </span>
          {tagline && <span className="up-logo__tag">{tagline}</span>}
        </span>
      )}
    </span>
  );
}

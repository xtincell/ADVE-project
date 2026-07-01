import React from "react";

const CSS = `
.up-logo{ display:inline-flex; align-items:center; gap:10px; line-height:1; }
.up-logo__img{ display:block; flex:none; object-fit:contain; }
.up-logo__mark{ display:block; flex:none; object-fit:contain; }
.up-logo__mark--circle{ background:var(--up-white); border-radius:50%; padding:14%; }
.up-logo__word{ font-family:var(--font-display); font-weight:var(--fw-semibold);
  letter-spacing:-0.02em; color:var(--text-primary); white-space:nowrap; }
.up-logo__up{ color:var(--accent); }
.up-logo__tag{ font-family:var(--font-sans); font-weight:var(--fw-bold);
  font-size:0.34em; letter-spacing:0.24em; text-transform:uppercase;
  color:var(--text-muted); display:block; margin-top:0.35em; }
.up-logo__stack{ display:flex; flex-direction:column; }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-logo";
  s.textContent = CSS;
  document.head.appendChild(s);
}

const SIZES = { sm: 24, md: 34, lg: 48, xl: 64 };

/* Real brand artwork shipped in assets/logos/ */
const FILES = {
  mark:                     "upgraders-icon.png",             // UP + rocket (rouge)
  wordmark:                 "upgraders-wordmark.png",         // UPgraders + rocket
  "wordmark-plain":         "upgraders-wordmark-compact.png", // UPgraders, no rocket
  monogram:                 "upgraders-monogram.png",         // UP + rocket (mono)
  "lockup-horizontal":      "upgraders-lockup-horizontal.png",      // couleur
  "lockup-vertical":        "upgraders-lockup-vertical.png",        // couleur
  "lockup-horizontal-mono": "upgraders-lockup-horizontal-mono.png", // monochrome
  "lockup-vertical-mono":   "upgraders-lockup-vertical-mono.png",   // monochrome
  full:                     "upgraders-logo-full.png",        // word + rocket + tagline
  tagline:                  "upgraders-tagline.png",
};

export function Logo({
  variant,
  size = "md",
  src,
  basePath = "assets/logos",
  markSrc,
  markOnly = false,
  circle = false,
  tagline,
  wordmark = "graders",
  alt = "UPgraders",
  className = "",
  ...rest
}) {
  inject();
  const px = typeof size === "number" ? size : SIZES[size] || 34;

  /* ── Image-first: render the real brand artwork by variant ── */
  if (variant) {
    const file = FILES[variant];
    const url = src || (file ? `${basePath}/${file}` : src);
    return (
      <img
        className={[
          "up-logo__img",
          circle && variant === "mark" && "up-logo__mark--circle",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        src={url}
        alt={alt}
        style={{ height: px, width: "auto" }}
        {...rest}
      />
    );
  }

  /* ── Legacy: hexagon mark + font wordmark (theme-recolouring) ── */
  const word = typeof px === "number" ? px * 0.62 : 22;
  return (
    <span className={["up-logo", className].filter(Boolean).join(" ")} {...rest}>
      {markSrc && (
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

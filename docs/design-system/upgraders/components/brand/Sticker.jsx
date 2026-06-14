import React from "react";

const CSS = `
.up-sticker{ display:inline-flex; align-items:center; gap:7px;
  font-family:var(--font-display); font-weight:var(--fw-bold);
  text-transform:uppercase; letter-spacing:0.02em; line-height:0.95;
  padding:10px 16px; border-radius:14px; position:relative;
  color:var(--up-white); background:var(--up-ink-1);
  box-shadow:0 0 0 4px var(--up-white), 0 10px 22px rgba(0,0,0,0.35);
  transition:transform var(--dur-base) var(--ease-spring);
}
.up-sticker:hover{ transform:rotate(0deg) scale(1.05) !important; }
.up-sticker--red{ background:var(--accent); }
.up-sticker--gold{ background:var(--up-gold); color:#3a2a06; }
.up-sticker--white{ background:var(--up-white); color:var(--up-ink-1);
  box-shadow:0 0 0 4px var(--up-ink-1), 0 10px 22px rgba(0,0,0,0.35); }
.up-sticker--outline{ background:transparent; color:var(--up-white);
  box-shadow:0 0 0 3px var(--up-white); }
.up-sticker__em{ color:var(--up-gold); }
.up-sticker--gold .up-sticker__em, .up-sticker--white .up-sticker__em{ color:var(--accent); }
.up-sticker__i svg{ width:1.05em; height:1.05em; display:block; }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-sticker";
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Sticker({
  tone = "dark",
  rotate = -4,
  size = "md",
  icon = null,
  className = "",
  children,
  ...rest
}) {
  inject();
  const fs = size === "sm" ? "var(--text-sm)" : size === "lg" ? "var(--text-2xl)" : "var(--text-lg)";
  const cls = ["up-sticker", `up-sticker--${tone}`, className].filter(Boolean).join(" ");
  return (
    <span className={cls} style={{ transform: `rotate(${rotate}deg)`, fontSize: fs }} {...rest}>
      {icon && <span className="up-sticker__i">{icon}</span>}
      {children}
    </span>
  );
}

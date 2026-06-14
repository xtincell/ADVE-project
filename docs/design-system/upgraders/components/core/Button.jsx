import React from "react";

const CSS = `
.up-btn{
  --_bg:var(--accent); --_fg:var(--text-on-accent); --_bd:transparent; --_sh:none;
  display:inline-flex; align-items:center; justify-content:center; gap:var(--space-2);
  font-family:var(--font-sans); font-weight:var(--fw-bold); white-space:nowrap;
  border:1.5px solid var(--_bd); background:var(--_bg); color:var(--_fg);
  box-shadow:var(--_sh); cursor:pointer; text-decoration:none;
  transition:transform var(--dur-fast) var(--ease-out),
             background var(--dur-base) var(--ease-out),
             box-shadow var(--dur-base) var(--ease-out), filter var(--dur-base);
}
.up-btn:hover{ filter:brightness(1.04); }
.up-btn:active{ transform:translateY(1px) scale(0.985); }
.up-btn:disabled{ opacity:0.45; cursor:not-allowed; filter:none; transform:none; }
.up-btn--primary{ --_bg:var(--accent); --_fg:var(--text-on-accent); --_sh:var(--glow-red-sm); }
.up-btn--primary:hover{ --_bg:var(--accent-hover); box-shadow:var(--glow-red); }
.up-btn--secondary{ --_bg:var(--surface-overlay); --_fg:var(--text-primary); }
.up-btn--secondary:hover{ --_bg:var(--surface-raised); }
.up-btn--outline{ --_bg:transparent; --_fg:var(--text-primary); --_bd:var(--border-strong); }
.up-btn--outline:hover{ --_bd:var(--accent); --_fg:var(--accent); filter:none; }
.up-btn--ghost{ --_bg:transparent; --_fg:var(--text-secondary); --_bd:transparent; }
.up-btn--ghost:hover{ --_bg:var(--glass-fill); --_fg:var(--text-primary); filter:none; }
.up-btn--sm{ height:36px; padding:0 16px; font-size:var(--text-sm); border-radius:var(--radius-md); }
.up-btn--md{ height:46px; padding:0 22px; font-size:var(--text-base); border-radius:var(--radius-md); }
.up-btn--lg{ height:56px; padding:0 30px; font-size:var(--text-lg); border-radius:var(--radius-lg); }
.up-btn--pill{ border-radius:var(--radius-pill); }
.up-btn--block{ width:100%; }
.up-btn--icon{ padding:0; aspect-ratio:1; }
.up-btn--icon.up-btn--sm{ width:36px; }
.up-btn--icon.up-btn--md{ width:46px; }
.up-btn--icon.up-btn--lg{ width:56px; }
.up-btn__i{ display:inline-flex; align-items:center; justify-content:center; }
.up-btn__i svg{ width:1.15em; height:1.15em; display:block; }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-button";
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Button({
  variant = "primary",
  size = "md",
  pill = false,
  block = false,
  icon = null,
  iconRight = null,
  iconOnly = false,
  className = "",
  children,
  ...rest
}) {
  inject();
  const cls = [
    "up-btn",
    `up-btn--${variant}`,
    `up-btn--${size}`,
    pill && "up-btn--pill",
    block && "up-btn--block",
    iconOnly && "up-btn--icon",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button className={cls} {...rest}>
      {icon && <span className="up-btn__i">{icon}</span>}
      {!iconOnly && children}
      {iconOnly && children}
      {iconRight && <span className="up-btn__i">{iconRight}</span>}
    </button>
  );
}

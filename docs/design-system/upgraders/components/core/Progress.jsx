import React from "react";

const CSS = `
.up-prog{ width:100%; }
.up-prog__head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
.up-prog__label{ font-size:var(--text-sm); font-weight:var(--fw-medium); color:var(--text-secondary); }
.up-prog__val{ font-size:var(--text-sm); font-weight:var(--fw-bold); color:var(--text-primary); font-family:var(--font-mono); }
.up-prog__track{ position:relative; width:100%; border-radius:var(--radius-pill);
  background:var(--up-ink-4); overflow:hidden; }
.up-prog--sm .up-prog__track{ height:6px; }
.up-prog--md .up-prog__track{ height:10px; }
.up-prog--lg .up-prog__track{ height:14px; }
.up-prog__fill{ height:100%; border-radius:var(--radius-pill);
  background:var(--accent); transition:width var(--dur-slow) var(--ease-out); }
.up-prog__fill--success{ background:var(--success); }
.up-prog__fill--warning{ background:var(--warning); }
.up-prog__fill--level{ background:linear-gradient(90deg,var(--up-gold),var(--up-red-ember)); }
.up-prog__fill--accent{ background:linear-gradient(90deg,var(--accent),var(--up-red-ember)); }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-progress";
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Progress({
  value = 0,
  tone = "accent",
  size = "md",
  label,
  showValue = false,
  className = "",
  ...rest
}) {
  inject();
  const pct = Math.max(0, Math.min(100, value));
  const cls = ["up-prog", `up-prog--${size}`, className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      {(label || showValue) && (
        <div className="up-prog__head">
          {label && <span className="up-prog__label">{label}</span>}
          {showValue && <span className="up-prog__val">{pct}%</span>}
        </div>
      )}
      <div className="up-prog__track" role="progressbar" aria-valnow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={`up-prog__fill up-prog__fill--${tone}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

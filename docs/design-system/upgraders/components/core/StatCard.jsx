import React from "react";

const CSS = `
.up-stat{ position:relative; border-radius:var(--radius-lg); padding:var(--space-5);
  background:var(--surface-card); border:1px solid var(--border); overflow:hidden; }
.up-stat--accent{ background:var(--accent); border-color:transparent; color:var(--text-on-accent); box-shadow:var(--glow-red); }
.up-stat__top{ display:flex; align-items:center; justify-content:space-between; gap:var(--space-3); }
.up-stat__label{ font-size:var(--text-sm); font-weight:var(--fw-medium); color:var(--text-muted); }
.up-stat--accent .up-stat__label{ color:rgba(255,255,255,0.82); }
.up-stat__icon{ display:inline-flex; align-items:center; justify-content:center;
  width:34px; height:34px; border-radius:var(--radius-sm); background:var(--accent-fill); color:var(--accent); }
.up-stat--accent .up-stat__icon{ background:rgba(255,255,255,0.18); color:#fff; }
.up-stat__icon svg{ width:18px; height:18px; }
.up-stat__value{ font-family:var(--font-display); font-weight:var(--fw-semibold);
  font-size:var(--text-3xl); line-height:1.05; letter-spacing:var(--tracking-tight);
  margin-top:var(--space-3); display:flex; align-items:baseline; gap:6px; }
.up-stat__suffix{ font-size:var(--text-base); font-weight:var(--fw-bold); opacity:0.7; }
.up-stat__delta{ display:inline-flex; align-items:center; gap:4px; margin-top:var(--space-2);
  font-size:var(--text-sm); font-weight:var(--fw-bold); }
.up-stat__delta--up{ color:var(--success); }
.up-stat__delta--down{ color:var(--danger); }
.up-stat--accent .up-stat__delta{ color:#fff; }
.up-stat__delta svg{ width:14px; height:14px; }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-stat";
  s.textContent = CSS;
  document.head.appendChild(s);
}

const Arrow = ({ up }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    {up ? <path d="M7 17 17 7M9 7h8v8" /> : <path d="M7 7l10 10M9 17h8V9" />}
  </svg>
);

export function StatCard({
  label,
  value,
  suffix,
  delta,
  trend = "up",
  variant = "default",
  icon = null,
  className = "",
  ...rest
}) {
  inject();
  const cls = ["up-stat", variant === "accent" && "up-stat--accent", className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...rest}>
      <div className="up-stat__top">
        <span className="up-stat__label">{label}</span>
        {icon && <span className="up-stat__icon">{icon}</span>}
      </div>
      <div className="up-stat__value">
        {value}
        {suffix && <span className="up-stat__suffix">{suffix}</span>}
      </div>
      {delta != null && (
        <span className={`up-stat__delta up-stat__delta--${trend}`}>
          <Arrow up={trend === "up"} />
          {delta}
        </span>
      )}
    </div>
  );
}

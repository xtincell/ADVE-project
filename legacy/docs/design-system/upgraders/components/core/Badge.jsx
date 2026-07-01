import React from "react";

const CSS = `
.up-badge{
  display:inline-flex; align-items:center; gap:6px;
  font-family:var(--font-sans); font-weight:var(--fw-bold);
  font-size:var(--text-xs); line-height:1; letter-spacing:0.01em;
  padding:5px 10px; border-radius:var(--radius-pill);
  border:1px solid transparent; white-space:nowrap;
}
.up-badge--solid{ background:var(--accent); color:var(--text-on-accent); }
.up-badge__dot{ width:7px; height:7px; border-radius:50%; background:currentColor; flex:none; }
.up-badge--neutral{ background:var(--glass-fill); color:var(--text-secondary); border-color:var(--border); }
.up-badge--accent{ background:var(--accent-fill); color:var(--accent-text); }
.up-badge--success{ background:var(--success-fill); color:var(--success); }
.up-badge--warning{ background:var(--warning-fill); color:var(--warning); }
.up-badge--danger{ background:var(--danger-fill); color:var(--danger); }
.up-badge--info{ background:var(--info-fill); color:var(--info); }
.up-badge--level{ background:var(--level-fill); color:var(--level); }
.up-badge__i svg{ width:13px; height:13px; display:block; }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-badge";
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Badge({
  tone = "neutral",
  dot = false,
  solid = false,
  icon = null,
  className = "",
  children,
  ...rest
}) {
  inject();
  const cls = [
    "up-badge",
    solid ? "up-badge--solid" : `up-badge--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={cls} {...rest}>
      {dot && <span className="up-badge__dot" />}
      {icon && <span className="up-badge__i">{icon}</span>}
      {children}
    </span>
  );
}

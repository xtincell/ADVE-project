import React from "react";

const CSS = `
.up-tag{
  display:inline-flex; align-items:center; gap:7px;
  font-family:var(--font-sans); font-weight:var(--fw-medium);
  font-size:var(--text-sm); line-height:1;
  padding:8px 14px; border-radius:var(--radius-pill);
  background:var(--surface-card); color:var(--text-secondary);
  border:1px solid var(--border); cursor:pointer;
  transition:all var(--dur-base) var(--ease-out);
}
.up-tag:hover{ color:var(--text-primary); border-color:var(--border-strong); }
.up-tag--active{ background:var(--accent); color:var(--text-on-accent); border-color:transparent; }
.up-tag--active:hover{ color:var(--text-on-accent); }
.up-tag__lead svg{ width:14px; height:14px; display:block; }
.up-tag__x{
  display:inline-flex; margin-right:-4px; margin-left:2px; opacity:0.7;
  border-radius:50%; padding:2px;
}
.up-tag__x:hover{ opacity:1; background:rgba(255,255,255,0.15); }
.up-tag__x svg{ width:13px; height:13px; display:block; }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-tag";
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Tag({
  active = false,
  icon = null,
  onRemove,
  className = "",
  children,
  ...rest
}) {
  inject();
  const cls = ["up-tag", active && "up-tag--active", className].filter(Boolean).join(" ");
  return (
    <span className={cls} {...rest}>
      {icon && <span className="up-tag__lead">{icon}</span>}
      {children}
      {onRemove && (
        <span
          className="up-tag__x"
          role="button"
          aria-label="Retirer"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </span>
      )}
    </span>
  );
}

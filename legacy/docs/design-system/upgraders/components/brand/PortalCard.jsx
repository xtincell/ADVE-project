import React from "react";

const CSS = `
.up-portal{ display:flex; align-items:center; gap:14px; width:100%; text-align:left;
  padding:16px 18px; border-radius:var(--radius-lg); cursor:pointer;
  background:var(--surface-card); border:1.5px solid var(--border); color:var(--text-primary);
  transition:border-color var(--dur-base) var(--ease-out), background var(--dur-base), transform var(--dur-fast); }
.up-portal:hover{ border-color:var(--border-strong); background:var(--surface-raised); }
.up-portal:active{ transform:translateY(1px); }
.up-portal--selected{ border-color:var(--_accent,var(--accent));
  background:color-mix(in srgb,var(--_accent,var(--accent)) 10%,var(--surface-card)); }
.up-portal__icon{ flex:none; display:inline-flex; align-items:center; justify-content:center;
  width:44px; height:44px; border-radius:var(--radius-md);
  background:color-mix(in srgb,var(--_accent,var(--accent)) 16%,transparent);
  color:var(--_accent,var(--accent)); }
.up-portal__icon svg{ width:22px; height:22px; }
.up-portal__body{ flex:1; min-width:0; }
.up-portal__title{ font-family:var(--font-sans); font-weight:var(--fw-bold); font-size:var(--text-base);
  display:flex; align-items:center; gap:8px; }
.up-portal__sub{ font-size:var(--text-sm); color:var(--text-muted); margin-top:2px; }
.up-portal__chev{ flex:none; color:var(--text-muted); display:inline-flex; }
.up-portal__chev svg{ width:20px; height:20px; }
.up-portal__check{ flex:none; display:inline-flex; align-items:center; justify-content:center;
  width:22px; height:22px; border-radius:50%; background:var(--_accent,var(--accent)); color:#fff; }
.up-portal__check svg{ width:14px; height:14px; }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-portal";
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function PortalCard({
  icon = null,
  title,
  subtitle,
  accent,
  selected = false,
  className = "",
  style,
  ...rest
}) {
  inject();
  const cls = ["up-portal", selected && "up-portal--selected", className].filter(Boolean).join(" ");
  return (
    <button className={cls} style={{ "--_accent": accent, ...style }} {...rest}>
      {icon && <span className="up-portal__icon">{icon}</span>}
      <span className="up-portal__body">
        <span className="up-portal__title">{title}</span>
        {subtitle && <span className="up-portal__sub">{subtitle}</span>}
      </span>
      {selected ? (
        <span className="up-portal__check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5 9-11" />
          </svg>
        </span>
      ) : (
        <span className="up-portal__chev">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </span>
      )}
    </button>
  );
}

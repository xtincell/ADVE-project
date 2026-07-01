import React from "react";

const CSS = `
.up-alert{ display:flex; gap:var(--space-3); padding:var(--space-4);
  border-radius:var(--radius-md); border:1px solid var(--border);
  background:var(--surface-card); position:relative; }
.up-alert--success{ background:var(--success-fill); border-color:color-mix(in srgb,var(--success) 30%,transparent); }
.up-alert--warning{ background:var(--warning-fill); border-color:color-mix(in srgb,var(--warning) 30%,transparent); }
.up-alert--danger{ background:var(--danger-fill); border-color:color-mix(in srgb,var(--danger) 30%,transparent); }
.up-alert--info{ background:var(--info-fill); border-color:color-mix(in srgb,var(--info) 30%,transparent); }
.up-alert__icon{ flex:none; display:inline-flex; align-items:center; justify-content:center;
  width:32px; height:32px; border-radius:var(--radius-sm); }
.up-alert__icon svg{ width:18px; height:18px; }
.up-alert--success .up-alert__icon{ color:var(--success); background:color-mix(in srgb,var(--success) 16%,transparent); }
.up-alert--warning .up-alert__icon{ color:var(--warning); background:color-mix(in srgb,var(--warning) 16%,transparent); }
.up-alert--danger .up-alert__icon{ color:var(--danger); background:color-mix(in srgb,var(--danger) 16%,transparent); }
.up-alert--info .up-alert__icon{ color:var(--info); background:color-mix(in srgb,var(--info) 16%,transparent); }
.up-alert__body{ flex:1; min-width:0; }
.up-alert__title{ font-family:var(--font-sans); font-weight:var(--fw-bold);
  font-size:var(--text-sm); margin:0 0 2px; }
.up-alert--success .up-alert__title{ color:var(--success); }
.up-alert--warning .up-alert__title{ color:var(--warning); }
.up-alert--danger .up-alert__title{ color:var(--danger); }
.up-alert--info .up-alert__title{ color:var(--info); }
.up-alert__desc{ font-size:var(--text-sm); color:var(--text-secondary); line-height:var(--leading-snug); }
.up-alert__x{ flex:none; cursor:pointer; color:var(--text-muted); background:none; border:none; padding:2px; line-height:0; }
.up-alert__x:hover{ color:var(--text-primary); }
.up-alert__x svg{ width:16px; height:16px; }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-alert";
  s.textContent = CSS;
  document.head.appendChild(s);
}

const ICONS = {
  success: <path d="m9 12 2 2 4-4M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />,
  warning: <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />,
  danger: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3 6-6 6m0-6 6 6" />,
  info: <path d="M12 16v-4m0-4h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />,
};

export function Alert({ tone = "info", title, icon, onClose, className = "", children, ...rest }) {
  inject();
  const cls = ["up-alert", `up-alert--${tone}`, className].filter(Boolean).join(" ");
  return (
    <div className={cls} role="status" {...rest}>
      <span className="up-alert__icon">
        {icon || (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {ICONS[tone]}
          </svg>
        )}
      </span>
      <div className="up-alert__body">
        {title && <p className="up-alert__title">{title}</p>}
        {children && <div className="up-alert__desc">{children}</div>}
      </div>
      {onClose && (
        <button className="up-alert__x" aria-label="Fermer" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

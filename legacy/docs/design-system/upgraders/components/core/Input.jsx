import React from "react";

const CSS = `
.up-field{ display:flex; flex-direction:column; gap:7px; width:100%; }
.up-field__label{ font-size:var(--text-sm); font-weight:var(--fw-medium); color:var(--text-secondary); }
.up-input{ position:relative; display:flex; align-items:center; gap:10px;
  height:48px; padding:0 16px; border-radius:var(--radius-md);
  background:var(--surface-card); border:1.5px solid var(--border);
  transition:border-color var(--dur-base) var(--ease-out), box-shadow var(--dur-base); }
.up-input:focus-within{ border-color:var(--accent); box-shadow:0 0 0 4px var(--accent-fill); }
.up-input--error{ border-color:var(--danger); }
.up-input__lead, .up-input__trail{ display:inline-flex; color:var(--text-muted); flex:none; }
.up-input__lead svg, .up-input__trail svg{ width:18px; height:18px; }
.up-input input, .up-input select{ flex:1; min-width:0; border:none; outline:none; background:none;
  font-family:var(--font-sans); font-size:var(--text-base); color:var(--text-primary); }
.up-input input::placeholder{ color:var(--text-muted); }
.up-input select{ appearance:none; cursor:pointer; color:var(--text-primary); }
.up-input select option{ background:var(--surface-overlay); color:var(--text-primary); }
.up-field__hint{ font-size:var(--text-xs); color:var(--text-muted); }
.up-field__hint--error{ color:var(--danger); }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-input";
  s.textContent = CSS;
  document.head.appendChild(s);
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function Input({
  label,
  icon = null,
  trailing = null,
  hint,
  error = false,
  className = "",
  id,
  ...rest
}) {
  inject();
  return (
    <label className="up-field" htmlFor={id}>
      {label && <span className="up-field__label">{label}</span>}
      <span className={["up-input", error && "up-input--error", className].filter(Boolean).join(" ")}>
        {icon && <span className="up-input__lead">{icon}</span>}
        <input id={id} {...rest} />
        {trailing && <span className="up-input__trail">{trailing}</span>}
      </span>
      {hint && <span className={`up-field__hint ${error ? "up-field__hint--error" : ""}`}>{hint}</span>}
    </label>
  );
}

export function Select({ label, icon = null, hint, error = false, className = "", id, children, ...rest }) {
  inject();
  return (
    <label className="up-field" htmlFor={id}>
      {label && <span className="up-field__label">{label}</span>}
      <span className={["up-input", error && "up-input--error", className].filter(Boolean).join(" ")}>
        {icon && <span className="up-input__lead">{icon}</span>}
        <select id={id} {...rest}>
          {children}
        </select>
        <span className="up-input__trail">
          <Chevron />
        </span>
      </span>
      {hint && <span className={`up-field__hint ${error ? "up-field__hint--error" : ""}`}>{hint}</span>}
    </label>
  );
}

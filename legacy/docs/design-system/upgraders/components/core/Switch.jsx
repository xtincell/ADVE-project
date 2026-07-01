import React from "react";

const CSS = `
.up-switch{ display:inline-flex; align-items:center; gap:10px; cursor:pointer; user-select:none; }
.up-switch input{ position:absolute; opacity:0; width:0; height:0; }
.up-switch__track{ position:relative; width:46px; height:26px; border-radius:var(--radius-pill);
  background:var(--up-ink-4); transition:background var(--dur-base) var(--ease-out); flex:none; }
.up-switch__thumb{ position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:50%;
  background:var(--up-white); box-shadow:var(--shadow-sm);
  transition:transform var(--dur-base) var(--ease-spring); }
.up-switch input:checked + .up-switch__track{ background:var(--accent); }
.up-switch input:checked + .up-switch__track .up-switch__thumb{ transform:translateX(20px); }
.up-switch input:focus-visible + .up-switch__track{ box-shadow:0 0 0 4px var(--accent-fill); }
.up-switch input:disabled + .up-switch__track{ opacity:0.45; }
.up-switch__label{ font-size:var(--text-sm); font-weight:var(--fw-medium); color:var(--text-primary); }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-switch";
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Switch({ checked, defaultChecked, onChange, label, disabled = false, className = "", ...rest }) {
  inject();
  return (
    <label className={["up-switch", className].filter(Boolean).join(" ")}>
      <input
        type="checkbox"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <span className="up-switch__track">
        <span className="up-switch__thumb" />
      </span>
      {label && <span className="up-switch__label">{label}</span>}
    </label>
  );
}

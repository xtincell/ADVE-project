import React from "react";

const CSS = `
.up-av{ position:relative; display:inline-flex; align-items:center; justify-content:center;
  border-radius:50%; overflow:visible; flex:none; font-family:var(--font-sans);
  font-weight:var(--fw-bold); color:var(--text-on-accent); background:var(--up-ink-4); }
.up-av__img{ width:100%; height:100%; border-radius:50%; object-fit:cover; display:block; }
.up-av__initials{ display:flex; align-items:center; justify-content:center; width:100%; height:100%;
  border-radius:50%; background:linear-gradient(135deg,var(--accent),var(--up-red-ember)); }
.up-av--ring{ box-shadow:0 0 0 2px var(--surface-page), 0 0 0 4px var(--accent); }
.up-av__status{ position:absolute; right:0; bottom:0; width:28%; height:28%; min-width:8px; min-height:8px;
  border-radius:50%; border:2px solid var(--surface-card); }
.up-av__status--online{ background:var(--success); }
.up-av__status--busy{ background:var(--warning); }
.up-av__status--offline{ background:var(--up-slate-500); }
.up-avg{ display:inline-flex; align-items:center; }
.up-avg > *{ margin-left:-10px; box-shadow:0 0 0 2px var(--surface-card); border-radius:50%; }
.up-avg > *:first-child{ margin-left:0; }
.up-avg__more{ display:inline-flex; align-items:center; justify-content:center; border-radius:50%;
  background:var(--surface-overlay); color:var(--text-secondary); font-family:var(--font-sans);
  font-weight:var(--fw-bold); flex:none; }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-avatar";
  s.textContent = CSS;
  document.head.appendChild(s);
}

const SIZES = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 };

function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export function Avatar({ src, name = "", size = "md", status, ring = false, className = "", style, ...rest }) {
  inject();
  const px = SIZES[size] || size;
  const fs = Math.round(px * 0.4);
  const cls = ["up-av", ring && "up-av--ring", className].filter(Boolean).join(" ");
  return (
    <span className={cls} style={{ width: px, height: px, fontSize: fs, ...style }} {...rest}>
      {src ? (
        <img className="up-av__img" src={src} alt={name} />
      ) : (
        <span className="up-av__initials">{initials(name)}</span>
      )}
      {status && <span className={`up-av__status up-av__status--${status}`} />}
    </span>
  );
}

export function AvatarGroup({ avatars = [], max = 4, size = "md", className = "", ...rest }) {
  inject();
  const px = SIZES[size] || size;
  const shown = avatars.slice(0, max);
  const extra = avatars.length - shown.length;
  return (
    <span className={["up-avg", className].filter(Boolean).join(" ")} {...rest}>
      {shown.map((a, i) => (
        <Avatar key={i} size={size} {...a} />
      ))}
      {extra > 0 && (
        <span className="up-avg__more" style={{ width: px, height: px, fontSize: Math.round(px * 0.36) }}>
          +{extra}
        </span>
      )}
    </span>
  );
}

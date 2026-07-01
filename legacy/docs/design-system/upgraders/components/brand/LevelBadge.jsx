import React from "react";

const CSS = `
.up-level{ display:inline-flex; align-items:center; gap:12px; }
.up-level__hex{ position:relative; display:inline-flex; align-items:center; justify-content:center;
  flex:none; color:#3a2a06;
  background:linear-gradient(145deg,var(--up-gold),var(--up-gold-deep));
  clip-path:polygon(50% 0,93% 25%,93% 75%,50% 100%,7% 75%,7% 25%);
  box-shadow:var(--glow-gold); }
.up-level__hex--red{ color:#fff; background:linear-gradient(145deg,var(--up-red-hover),var(--up-red-active)); box-shadow:var(--glow-red); }
.up-level__hex svg{ width:46%; height:46%; }
.up-level__meta{ display:flex; flex-direction:column; line-height:1.15; }
.up-level__k{ font-family:var(--font-sans); font-weight:var(--fw-bold); font-size:var(--text-2xs);
  letter-spacing:var(--tracking-wider); text-transform:uppercase; color:var(--text-muted); }
.up-level__v{ font-family:var(--font-display); font-weight:var(--fw-semibold);
  font-size:var(--text-lg); color:var(--text-primary); display:flex; align-items:baseline; gap:7px; }
.up-level__rank{ font-family:var(--font-sans); font-size:var(--text-xs); font-weight:var(--fw-bold);
  color:var(--up-gold); }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-level";
  s.textContent = CSS;
  document.head.appendChild(s);
}

const Star = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="m12 2 2.9 6.26 6.84.62-5.16 4.54 1.54 6.7L12 16.9 5.88 20.6l1.54-6.7L2.26 8.88l6.84-.62L12 2Z" />
  </svg>
);

export function LevelBadge({
  level = 1,
  rank,
  tone = "gold",
  showMeta = true,
  size = 52,
  icon,
  className = "",
  ...rest
}) {
  inject();
  return (
    <span className={["up-level", className].filter(Boolean).join(" ")} {...rest}>
      <span
        className={["up-level__hex", tone === "red" && "up-level__hex--red"].filter(Boolean).join(" ")}
        style={{ width: size, height: size }}
      >
        {icon || <Star />}
      </span>
      {showMeta && (
        <span className="up-level__meta">
          <span className="up-level__k">Niveau actuel</span>
          <span className="up-level__v">
            Level {level}
            {rank && <span className="up-level__rank">{rank}</span>}
          </span>
        </span>
      )}
    </span>
  );
}

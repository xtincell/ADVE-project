import React from "react";

const CSS = `
.up-card{
  position:relative; border-radius:var(--radius-lg);
  background:var(--surface-card); border:1px solid var(--border);
  color:var(--text-primary); overflow:hidden;
  transition:transform var(--dur-base) var(--ease-out),
             box-shadow var(--dur-base) var(--ease-out),
             border-color var(--dur-base) var(--ease-out);
}
.up-card--raised{ background:var(--surface-raised); box-shadow:var(--shadow-md); }
.up-card--glass{ background:var(--glass-fill); border-color:var(--glass-stroke);
  backdrop-filter:blur(var(--blur-md)); -webkit-backdrop-filter:blur(var(--blur-md)); }
.up-card--accent{ background:var(--accent); border-color:transparent; color:var(--text-on-accent); box-shadow:var(--glow-red); }
.up-card--light{ background:var(--surface-inverse); border-color:transparent; color:var(--text-inverse); box-shadow:var(--shadow-lg); }
.up-card--inkmax{ background:var(--up-ink-0); border-color:var(--border-subtle); }
.up-card--p0{ padding:0; }
.up-card--p4{ padding:var(--space-4); }
.up-card--p5{ padding:var(--space-5); }
.up-card--p6{ padding:var(--space-6); }
.up-card--p8{ padding:var(--space-8); }
.up-card--interactive{ cursor:pointer; }
.up-card--interactive:hover{ transform:translateY(-3px); box-shadow:var(--shadow-lg); border-color:var(--border-strong); }
.up-card--radius-xl{ border-radius:var(--radius-xl); }
.up-card--radius-2xl{ border-radius:var(--radius-2xl); }
`;

let injected = false;
function inject() {
  if (injected || typeof document === "undefined") return;
  injected = true;
  const s = document.createElement("style");
  s.id = "up-ds-card";
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function Card({
  variant = "default",
  padding = "6",
  radius = "lg",
  interactive = false,
  className = "",
  children,
  ...rest
}) {
  inject();
  const variantCls = variant === "default" ? "" : `up-card--${variant}`;
  const cls = [
    "up-card",
    variantCls,
    `up-card--p${padding}`,
    radius !== "lg" && `up-card--radius-${radius}`,
    interactive && "up-card--interactive",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
